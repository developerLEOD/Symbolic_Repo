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
 * Fast & resilient public IP lookup with multiple fallbacks
 */
async function fetchPublicIp(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  const services = [
    "https://api64.ipify.org?format=json",
    "https://api.ipify.org?format=json",
    "https://ipapi.co/json/"
  ];

  for (const url of services) {
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || data.query || data.client_ip;
        if (ip && typeof ip === "string" && ip.length >= 7) {
          clearTimeout(timeoutId);
          return ip.trim();
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  clearTimeout(timeoutId);
  return "unknown_ip";
}

/**
 * Generate a persistent, deterministic hardware & browser fingerprint for the device
 */
function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server_device";

  // Persistent unique device token in localStorage
  let deviceToken = "";
  try {
    deviceToken = localStorage.getItem("sym_device_token") || "";
    if (!deviceToken) {
      deviceToken = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("sym_device_token", deviceToken);
    }
  } catch {
    deviceToken = "dev_cookie_fallback";
  }

  const screenData = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const lang = navigator.language || "en";
  const cores = navigator.hardwareConcurrency || 1;
  const platform = navigator.platform || "mobile_web";

  const rawString = `${deviceToken}|${screenData}|${tz}|${lang}|${cores}|${platform}`;
  
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}_${deviceToken.substring(0, 8)}`;
}

/**
 * Record a visit via a referral link (e.g. ?ref=CODE)
 * Uses multi-layered Public IP detection, device hardware fingerprinting,
 * self-referral blocking, and database deduplication so opening the link multiple
 * times on the same mobile phone / IP will NOT fraudulently increment counts.
 */
export async function trackReferralVisit(
  rawCode: string,
  currentUserId?: string | null,
  currentUserEmail?: string | null
): Promise<{ success: boolean; visitsCount?: number; referrerName?: string; isDuplicate?: boolean }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { success: false };

  // Check if referral program is active before tracking or saving
  const settings = await getReferralSettings();
  if (!settings.isEnabled) {
    return { success: false };
  }

  // Always store code for checkout auto-fill privilege
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sym_applied_referral_code", code);
    } catch {
      // ignore
    }
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", code), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false };
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data() as UserProfile;
    const referrerUid = userDoc.id;
    const referrerName = userData.displayName || "Member";
    const currentVisits = userData.referralVisitsCount || 0;

    // 1. SELF-REFERRAL BLOCK: If current user is the owner of the referral code, do not count self-visits
    const isSelfReferral = Boolean(
      (currentUserId && (currentUserId === referrerUid || currentUserId === userData.uid)) ||
      (currentUserEmail && userData.email && currentUserEmail.toLowerCase() === userData.email.toLowerCase()) ||
      (typeof window !== "undefined" && localStorage.getItem("sym_user_referral_code") === code)
    );

    if (isSelfReferral) {
      return { success: true, visitsCount: currentVisits, referrerName, isDuplicate: true };
    }

    // 2. CLIENT-SIDE LOCAL STORAGE CHECK (Fast deduplication for same browser/phone)
    let visitedMap: Record<string, number> = {};
    if (typeof window !== "undefined") {
      try {
        visitedMap = JSON.parse(localStorage.getItem("sym_visited_referrals") || "{}");
        if (visitedMap[code]) {
          // Device has already visited this specific referral code
          return { success: true, visitsCount: currentVisits, referrerName, isDuplicate: true };
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // 3. PUBLIC IP & DEVICE HARDWARE FINGERPRINT LOOKUP
    const [publicIp, deviceFingerprint] = await Promise.all([
      fetchPublicIp(),
      Promise.resolve(getDeviceFingerprint())
    ]);

    const cleanIp = publicIp.replace(/[^a-zA-Z0-9]/g, "_");
    const cleanFp = deviceFingerprint.replace(/[^a-zA-Z0-9]/g, "_");
    // Deterministic unique document ID for this specific referral code + IP + Device combination
    const visitDocId = `${code}_${cleanIp}_${cleanFp}`.slice(0, 100);

    // 4. FIRESTORE DATABASE UNIQUENESS VERIFICATION
    // Check if this exact IP + Device document already exists
    const existingDocRef = doc(db, "referral_visits", visitDocId);
    const existingDocSnap = await getDoc(existingDocRef);

    if (existingDocSnap.exists()) {
      // Already logged in database for this device/IP! Mark locally and skip increment
      if (typeof window !== "undefined") {
        try {
          visitedMap[code] = Date.now();
          localStorage.setItem("sym_visited_referrals", JSON.stringify(visitedMap));
        } catch {
          // ignore
        }
      }
      return { success: true, visitsCount: currentVisits, referrerName, isDuplicate: true };
    }

    // Also check if this IP has already logged a visit for this referral code
    if (publicIp !== "unknown_ip") {
      const ipQuery = query(
        collection(db, "referral_visits"),
        where("referrerCode", "==", code),
        where("visitorIp", "==", publicIp),
        limit(1)
      );
      const ipQuerySnap = await getDocs(ipQuery);
      if (!ipQuerySnap.empty) {
        // This IP address has already been credited for this referral code!
        if (typeof window !== "undefined") {
          try {
            visitedMap[code] = Date.now();
            localStorage.setItem("sym_visited_referrals", JSON.stringify(visitedMap));
          } catch {
            // ignore
          }
        }
        return { success: true, visitsCount: currentVisits, referrerName, isDuplicate: true };
      }
    }

    // 5. GENUINE FIRST-TIME UNIQUE VISIT: Record visit log and increment referrer's count
    await setDoc(existingDocRef, {
      referrerUid,
      referrerCode: code,
      visitorIp: publicIp,
      visitorDeviceHash: deviceFingerprint,
      visitorKey: `${cleanIp}_${cleanFp}`,
      createdAt: Date.now()
    }).catch(err => {
      console.warn("Could not write to referral_visits:", err);
    });

    // Increment referralVisitsCount on referrer user doc
    const userRef = doc(db, "users", referrerUid);
    await updateDoc(userRef, {
      referralVisitsCount: increment(1)
    }).catch(err => {
      console.warn("Could not increment referralVisitsCount on user doc:", err);
    });

    // Mark as visited locally on this phone
    if (typeof window !== "undefined") {
      try {
        visitedMap[code] = Date.now();
        localStorage.setItem("sym_visited_referrals", JSON.stringify(visitedMap));
        sessionStorage.setItem(`sym_ref_visit_${code}`, "true");
      } catch {
        // ignore
      }
    }

    return { success: true, visitsCount: currentVisits + 1, referrerName, isDuplicate: false };
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

  // Check if this is a VIP or special reward code prefix
  if (code.includes("REWARD") || code.startsWith("SYM-VIP")) {
    const rewardDiscountPercent = settings.referrerRewardPercentage || 20;
    const meetsMin = settings.minimumOrderAmount <= 0 || subtotal >= settings.minimumOrderAmount;
    const rawDiscount = meetsMin ? Math.round((subtotal * rewardDiscountPercent) / 100) : 0;
    const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

    return {
      valid: true,
      message: meetsMin 
        ? `Referrer Reward Unlocked: ${rewardDiscountPercent}% discount applied!`
        : `Reward Code Linked (${rewardDiscountPercent}% OFF). Requires minimum order of Rs. ${settings.minimumOrderAmount.toLocaleString()} PKR (Current: Rs. ${subtotal.toLocaleString()} PKR).`,
      discountAmount: cappedDiscount,
      discountPercentage: rewardDiscountPercent,
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
      const actualReferrerUid = referrerData.uid || referrerDoc.id;

      // Check if this code belongs to the current user (attempting to claim their referral reward or self-refer)
      const localUserCode = typeof window !== "undefined" ? localStorage.getItem("sym_user_referral_code") : null;
      const isOwnerOfCode = Boolean(
        (currentUserId && (actualReferrerUid === currentUserId || referrerDoc.id === currentUserId)) ||
        (currentUserEmail && referrerData.email && currentUserEmail.toLowerCase() === referrerData.email.toLowerCase()) ||
        (localUserCode && localUserCode.toUpperCase() === code)
      );

      if (isOwnerOfCode) {
        const referralsCount = referrerData.referralsCount || 0;
        const referralVisitsCount = referrerData.referralVisitsCount || 0;
        const check = isReferrerRewardUnlocked(referralsCount, referralVisitsCount, settings);

        if (check.unlocked) {
          const rewardPercent = settings.referrerRewardPercentage || 20;
          const meetsMin = settings.minimumOrderAmount <= 0 || subtotal >= settings.minimumOrderAmount;
          const rawDiscount = meetsMin ? Math.round((subtotal * rewardPercent) / 100) : 0;
          const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

          return {
            valid: true,
            message: meetsMin
              ? `🎉 Referrer Reward Unlocked (${check.reason === "orders" ? `${referralsCount}/${settings.minimumReferrals} friend orders` : `${referralVisitsCount}/${settings.minimumVisits} site visits`}): ${rewardPercent}% discount applied to your order!`
              : `🎉 Referrer Reward Linked (${rewardPercent}% OFF). Requires minimum order of Rs. ${settings.minimumOrderAmount.toLocaleString()} PKR (Current: Rs. ${subtotal.toLocaleString()} PKR).`,
            discountAmount: cappedDiscount,
            discountPercentage: rewardPercent,
            referrerUid: actualReferrerUid,
            referrerEmail: referrerData.email,
            referrerCode: code,
            isReferrerReward: true
          };
        } else {
          return {
            valid: false,
            message: `Referral Reward Locked: You have ${referralsCount}/${settings.minimumReferrals} friend orders and ${referralVisitsCount}/${settings.minimumVisits} site visits. ${check.progressText} to unlock your ${settings.referrerRewardPercentage}% discount!`,
            discountAmount: 0,
            discountPercentage: 0,
            referrerCode: code
          };
        }
      }

      // Friend checkout: friend receives the friend discount percentage (e.g. 10% OFF)!
      const friendDiscountPercentage = getFriendDiscountPercentage(settings);
      const meetsMin = settings.minimumOrderAmount <= 0 || subtotal >= settings.minimumOrderAmount;
      const rawDiscount = meetsMin ? Math.round((subtotal * friendDiscountPercentage) / 100) : 0;
      const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

      return {
        valid: true,
        message: meetsMin
          ? `🎉 Friend Privilege Applied (${referrerData.displayName || "Member"}): ${friendDiscountPercentage}% discount applied! This order will also credit their reward milestone.`
          : `🎉 Friend Privilege Linked (${referrerData.displayName || "Member"}: ${friendDiscountPercentage}% OFF). Requires minimum order of Rs. ${settings.minimumOrderAmount.toLocaleString()} PKR (Current: Rs. ${subtotal.toLocaleString()} PKR).`,
        discountAmount: cappedDiscount,
        discountPercentage: friendDiscountPercentage,
        referrerUid: actualReferrerUid,
        referrerEmail: referrerData.email,
        referrerCode: code,
        isReferrerReward: false
      };
    }

    // Format validation fallback (e.g. partner code or before Firestore propagation)
    const prefix = settings.referralCodePrefix || "SYM";
    const isValidFormat = code.startsWith(prefix) || code.includes("-") || code.length >= 6;

    if (isValidFormat) {
      // Prevent self-referral if localStorage has this code
      const localUserCode = typeof window !== "undefined" ? localStorage.getItem("sym_user_referral_code") : null;
      if (localUserCode && localUserCode.toUpperCase() === code) {
        return {
          valid: false,
          message: "This is your personal referral code. Share it with colleagues and friends to unlock your reward!",
          discountAmount: 0,
          discountPercentage: 0,
          referrerCode: code
        };
      }

      const friendDiscountPercentage = getFriendDiscountPercentage(settings);
      const meetsMin = settings.minimumOrderAmount <= 0 || subtotal >= settings.minimumOrderAmount;
      const rawDiscount = meetsMin ? Math.round((subtotal * friendDiscountPercentage) / 100) : 0;
      const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

      return {
        valid: true,
        message: meetsMin
          ? `Valid Referral Code: ${friendDiscountPercentage}% discount applied!`
          : `Referral Code Linked (${friendDiscountPercentage}% OFF). Requires minimum order of Rs. ${settings.minimumOrderAmount.toLocaleString()} PKR (Current: Rs. ${subtotal.toLocaleString()} PKR).`,
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
    const friendDiscountPercentage = getFriendDiscountPercentage(settings);
    const meetsMin = settings.minimumOrderAmount <= 0 || subtotal >= settings.minimumOrderAmount;
    const rawDiscount = meetsMin ? Math.round((subtotal * friendDiscountPercentage) / 100) : 0;
    const cappedDiscount = settings.maxDiscountCap > 0 ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

    return {
      valid: true,
      message: meetsMin
        ? `Referral Code Linked: ${friendDiscountPercentage}% discount applied!`
        : `Referral Code Linked (${friendDiscountPercentage}% OFF). Requires minimum order of Rs. ${settings.minimumOrderAmount.toLocaleString()} PKR.`,
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
  isReferrerReward?: boolean;
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

    // Only increment referrer's count when a FRIEND places an order (not when referrer claims their own reward)
    if (!params.isReferrerReward) {
      if (params.referrerUid) {
        const userRef = doc(db, "users", params.referrerUid);
        await updateDoc(userRef, {
          referralsCount: increment(1)
        }).catch(err => {
          console.warn("Could not increment referrer profile count directly:", err);
        });
      } else if (params.referrerCode) {
        // Fallback: look up by referralCode
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("referralCode", "==", params.referrerCode), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, {
              referralsCount: increment(1)
            });
          }
        } catch (err) {
          console.warn("Could not lookup and increment referrer by code:", err);
        }
      }
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
