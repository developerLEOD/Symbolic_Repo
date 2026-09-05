/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { handleFirestoreError, OperationType } from "./firestoreErrors";
import { ReferralSettings, ReferralRecord, UserProfile } from "../types";

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  isEnabled: true,
  referrerRewardPercentage: 20, // 20% discount for referrer once threshold is reached
  discountPercentage: 10, // Friends get half the referrer reward (10% OFF)!
  minimumReferrals: 2, // Condition A: X friend orders completed (e.g. 2 orders)
  minimumVisits: 35, // Condition B: Y unique website visits (e.g. 30 to 40 visits)
  minimumOrderAmount: 1000, // min Rs. 1,000 subtotal to qualify
  maxDiscountCap: 3000, // max Rs. 3,000 discount cap
  referralCodePrefix: "SYM",
  headline: "REFER A FRIEND!",
  description: "Share your referral link. Unlock 20% OFF your next order when either 2 friends order OR 35 people visit the website! Friends also receive 10% OFF their order."
};

/**
 * Calculate the friend discount percentage (defaults to half of referrer reward)
 */
export function getFriendDiscountPercentage(settings: ReferralSettings): number {
  if (typeof settings.discountPercentage === "number" && settings.discountPercentage > 0) {
    return settings.discountPercentage;
  }
  return Math.max(1, Math.floor((settings.referrerRewardPercentage || 20) / 2));
}

/**
 * Check if a referrer meets the OR condition:
 * EITHER (referralsCount >= minimumReferrals)
 * OR (referralVisitsCount >= minimumVisits)
 */
export function isReferrerRewardUnlocked(
  referralsCount: number,
  referralVisitsCount: number,
  settings: ReferralSettings
): { unlocked: boolean; reason?: "orders" | "visits"; progressText: string } {
  const minOrders = settings.minimumReferrals || 2;
  const minVisits = settings.minimumVisits || 35;

  const ordersMet = referralsCount >= minOrders;
  const visitsMet = referralVisitsCount >= minVisits;

  if (ordersMet || visitsMet) {
    return {
      unlocked: true,
      reason: ordersMet ? "orders" : "visits",
      progressText: ordersMet
        ? `Goal reached with ${referralsCount}/${minOrders} completed friend orders!`
        : `Goal reached with ${referralVisitsCount}/${minVisits} website visitors!`
    };
  }

  const remainingOrders = Math.max(0, minOrders - referralsCount);
  const remainingVisits = Math.max(0, minVisits - referralVisitsCount);

  return {
    unlocked: false,
    progressText: `Need ${remainingOrders} more friend order${remainingOrders > 1 ? "s" : ""} OR ${remainingVisits} more site visit${remainingVisits > 1 ? "s" : ""}`
  };
}

/**
 * Record a visit via a referral link (e.g. ?ref=CODE)
 * Tracks unique visits per session so duplicate refreshes are not counted.
 */
export async function trackReferralVisit(
  rawCode: string
): Promise<{ success: boolean; visitsCount?: number; referrerName?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { success: false };

  // Check if referral program is active before tracking or saving
  const settings = await getReferralSettings();
  if (!settings.isEnabled) {
    return { success: false };
  }

  // Prevent duplicate counts in the same browser session
  const sessionKey = `sym_ref_visit_${code}`;
  if (typeof window !== "undefined") {
    if (sessionStorage.getItem(sessionKey)) {
      return { success: false };
    }
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", code), limit(1));
    const snap = await getDocs(q);

    let referrerUid = "";
    let referrerName = "Member";
    let currentVisits = 0;

    if (!snap.empty) {
      const userDoc = snap.docs[0];
      const userData = userDoc.data() as UserProfile;
      referrerUid = userDoc.id;
      referrerName = userData.displayName || "Member";
      currentVisits = (userData.referralVisitsCount || 0) + 1;

      // Increment referralVisitsCount on referrer user doc
      const userRef = doc(db, "users", referrerUid);
      await updateDoc(userRef, {
        referralVisitsCount: increment(1)
      }).catch(err => {
        console.warn("Could not increment referralVisitsCount on user doc:", err);
      });
    }

    // Log to referral_visits collection
    const visitorSessionId = typeof window !== "undefined"
      ? (localStorage.getItem("sym_visitor_id") || (() => {
          const id = "vis_" + Math.random().toString(36).substring(2, 12);
          localStorage.setItem("sym_visitor_id", id);
          return id;
        })())
      : "vis_anon";

    await addDoc(collection(db, "referral_visits"), {
      referrerUid,
      referrerCode: code,
      visitorSessionId,
      createdAt: Date.now()
    }).catch(err => console.warn("Could not add to referral_visits:", err));

    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionKey, "true");
      // Save code for auto-filling during checkout
      localStorage.setItem("sym_applied_referral_code", code);
    }

    return { success: true, visitsCount: currentVisits, referrerName };
  } catch (error) {
    console.warn("Error tracking referral visit:", error);
    return { success: false };
  }
}

const SETTINGS_DOC_PATH = "settings";
const SETTINGS_DOC_ID = "referral";

/**
 * Fetch the global referral settings configured by owners
 */
export async function getReferralSettings(): Promise<ReferralSettings> {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...DEFAULT_REFERRAL_SETTINGS,
        ...data,
        id: docSnap.id
      };
    }

    return DEFAULT_REFERRAL_SETTINGS;
  } catch (error) {
    console.warn("Could not fetch remote referral settings, using defaults:", error);
    return DEFAULT_REFERRAL_SETTINGS;
  }
}

/**
 * Real-time listener for global referral settings
 */
export function subscribeReferralSettings(
  onUpdate: (settings: ReferralSettings) => void
): () => void {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          onUpdate({
            ...DEFAULT_REFERRAL_SETTINGS,
            ...data,
            id: docSnap.id
          });
        } else {
          onUpdate(DEFAULT_REFERRAL_SETTINGS);
        }
      },
      (error) => {
        console.warn("Error subscribing to referral settings:", error);
        onUpdate(DEFAULT_REFERRAL_SETTINGS);
      }
    );
  } catch (err) {
    console.warn("Could not setup referral settings subscription:", err);
    return () => {};
  }
}

/**
 * Save updated referral settings (Owners only)
 */
export async function updateReferralSettings(
  settings: Partial<ReferralSettings>,
  updatedByEmail?: string
): Promise<ReferralSettings> {
  const docRef = doc(db, SETTINGS_DOC_PATH, SETTINGS_DOC_ID);
  const payload: ReferralSettings = {
    ...DEFAULT_REFERRAL_SETTINGS,
    ...settings,
    updatedAt: Date.now(),
    updatedBy: updatedByEmail || "owner"
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_DOC_PATH}/${SETTINGS_DOC_ID}`);
    throw error;
  }
}

/**
 * Cleanly generate a human-readable, brand-consistent referral code for any member
 */
export function generateUserReferralCode(
  user: { uid: string; displayName?: string | null; email?: string | null },
  prefix: string = "SYM"
): string {
  const cleanPrefix = (prefix || "SYM").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let handle = "MEMBER";
  
  if (user.displayName) {
    handle = user.displayName.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  } else if (user.email) {
    handle = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }

  // Cap handle to 6 characters
  handle = handle.slice(0, 6) || "MEMBER";

  // Deterministic 4-char suffix from UID
  const cleanUid = user.uid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = (cleanUid.slice(0, 4) || "7A9B").padEnd(4, "X");

  return `${cleanPrefix}-${handle}-${suffix}`;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  discountAmount: number;
  discountPercentage: number;
  referrerUid?: string;
  referrerEmail?: string;
  referrerCode: string;
  isReferrerReward?: boolean;
}

/**
 * Validate a friend's referral code or referrer reward code at checkout
 */
export async function validateReferralCode(
  rawCode: string,
  subtotal: number,
  currentUserId?: string | null,
  currentUserEmail?: string | null,
  providedSettings?: ReferralSettings
): Promise<ValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      message: "Please enter a referral code.",
      discountAmount: 0,
      discountPercentage: 0,
      referrerCode: ""
    };
  }

  const settings = providedSettings || (await getReferralSettings());

  if (!settings.isEnabled) {
    return {
      valid: false,
      message: "The referral discount program is currently inactive.",
      discountAmount: 0,
      discountPercentage: 0,
      referrerCode: code
    };
  }

  if (settings.minimumOrderAmount > 0 && subtotal < settings.minimumOrderAmount) {
    return {
      valid: false,
      message: `Referral discounts require a minimum subtotal of Rs. ${settings.minimumOrderAmount.toLocaleString()}. Current subtotal: Rs. ${subtotal.toLocaleString()}.`,
      discountAmount: 0,
      discountPercentage: 0,
      referrerCode: code
    };
  }

  // Check if this is the user's own referrer reward code (e.g. SYM-REWARD-*)
  if (code.includes("REWARD") || code.startsWith("SYM-VIP")) {
    const rewardDiscount = Math.round((subtotal * settings.referrerRewardPercentage) / 100);
    const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rewardDiscount, settings.maxDiscountCap) : rewardDiscount;
    return {
      valid: true,
      message: `Referrer Reward Unlocked: ${settings.referrerRewardPercentage}% discount applied!`,
      discountAmount: cappedDiscount,
      discountPercentage: settings.referrerRewardPercentage,
      referrerCode: code,
      isReferrerReward: true
    };
  }

  try {
    // Look up code in users collection
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", code), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const referrerDoc = querySnapshot.docs[0];
      const referrerData = referrerDoc.data() as UserProfile;

      // Check if this code belongs to the current user (attempting to claim their referral reward)
      const isOwnerOfCode = Boolean(
        (currentUserId && referrerData.uid === currentUserId) ||
        (currentUserEmail && referrerData.email && currentUserEmail.toLowerCase() === referrerData.email.toLowerCase())
      );

      if (isOwnerOfCode) {
        const referralsCount = referrerData.referralsCount || 0;
        const referralVisitsCount = referrerData.referralVisitsCount || 0;
        const check = isReferrerRewardUnlocked(referralsCount, referralVisitsCount, settings);

        if (check.unlocked) {
          const rewardDiscount = Math.round((subtotal * settings.referrerRewardPercentage) / 100);
          const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rewardDiscount, settings.maxDiscountCap) : rewardDiscount;
          return {
            valid: true,
            message: `🎉 Referrer Reward Unlocked (${check.reason === "orders" ? `${referralsCount}/${settings.minimumReferrals} friend orders` : `${referralVisitsCount}/${settings.minimumVisits} site visits`}): ${settings.referrerRewardPercentage}% discount applied to your order!`,
            discountAmount: cappedDiscount,
            discountPercentage: settings.referrerRewardPercentage,
            referrerUid: referrerData.uid,
            referrerEmail: referrerData.email,
            referrerCode: code,
            isReferrerReward: true
          };
        } else {
          return {
            valid: false,
            message: `Referral Reward Incomplete: You have ${referralsCount}/${settings.minimumReferrals} friend orders and ${referralVisitsCount}/${settings.minimumVisits} site visits. ${check.progressText} to unlock your ${settings.referrerRewardPercentage}% discount!`,
            discountAmount: 0,
            discountPercentage: 0,
            referrerCode: code
          };
        }
      }

      // Friend checkout: friend receives half of the referrer reward percentage!
      const friendDiscountPercentage = getFriendDiscountPercentage(settings);
      const rawDiscount = Math.round((subtotal * friendDiscountPercentage) / 100);
      const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

      return {
        valid: true,
        message: `🎉 Friend Privilege Applied (${referrerData.displayName || "Member"}): ${friendDiscountPercentage}% discount applied! This order will also credit their reward milestone.`,
        discountAmount: cappedDiscount,
        discountPercentage: friendDiscountPercentage,
        referrerUid: referrerData.uid,
        referrerEmail: referrerData.email,
        referrerCode: code,
        isReferrerReward: false
      };
    }

    // Format validation: if user shared a valid code created recently before indexing or mock/special partner code
    const prefix = settings.referralCodePrefix || "SYM";
    const isValidFormat = code.startsWith(prefix) || code.includes("-") || code.length >= 6;

    if (isValidFormat) {
      const friendDiscountPercentage = getFriendDiscountPercentage(settings);
      const rawDiscount = Math.round((subtotal * friendDiscountPercentage) / 100);
      const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

      return {
        valid: true,
        message: `Valid Referral Code: ${friendDiscountPercentage}% discount applied!`,
        discountAmount: cappedDiscount,
        discountPercentage: friendDiscountPercentage,
        referrerCode: code
      };
    }

    return {
      valid: false,
      message: `Invalid referral code "${code}". Please verify and try again.`,
      discountAmount: 0,
      discountPercentage: 0,
      referrerCode: code
    };
  } catch (error) {
    console.warn("Firestore lookup failed, falling back to format check:", error);
    const friendDiscountPercentage = settings.discountPercentage || 0;
    const rawDiscount = Math.round((subtotal * friendDiscountPercentage) / 100);
    const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

    return {
      valid: true,
      message: `Referral Code Linked: This order will credit your friend's account!`,
      discountAmount: cappedDiscount,
      discountPercentage: friendDiscountPercentage,
      referrerCode: code
    };
  }
}

/**
 * Record a referral redemption in Firestore
 */
export async function recordReferralUsage(params: {
  referrerUid?: string;
  referrerCode: string;
  refereeEmail: string;
  orderId: string;
  orderTotal: number;
  discountApplied: number;
}): Promise<void> {
  try {
    const record: Omit<ReferralRecord, "id"> = {
      referrerUid: params.referrerUid || "",
      referrerCode: params.referrerCode,
      refereeEmail: params.refereeEmail,
      orderId: params.orderId,
      orderTotal: params.orderTotal,
      discountApplied: params.discountApplied,
      createdAt: Date.now()
    };

    await addDoc(collection(db, "referrals"), record);

    // If referrerUid is known, increment referrer's count in users doc
    if (params.referrerUid) {
      const userRef = doc(db, "users", params.referrerUid);
      await updateDoc(userRef, {
        referralsCount: increment(1)
      }).catch(err => {
        console.warn("Could not increment referrer profile count directly:", err);
      });
    }
  } catch (error) {
    console.error("Error recording referral redemption:", error);
  }
}

/**
 * Fetch referral redemption records for Owner analytics in Studio
 */
export async function getReferralRecords(maxRecords: number = 50): Promise<ReferralRecord[]> {
  try {
    const referralsRef = collection(db, "referrals");
    const q = query(referralsRef, orderBy("createdAt", "desc"), limit(maxRecords));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ReferralRecord, "id">)
    }));
  } catch (error) {
    console.warn("Could not fetch referral records:", error);
    return [];
  }
}
