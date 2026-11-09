/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Referral Logic & Acquisition Service
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  limit 
} from "firebase/firestore";
import { db } from "./firebase";
import { ReferralSettings, ReferralRecord } from "../types";
import { 
  isFirestoreQuotaExceeded, 
  markFirestoreQuotaExceeded, 
  isQuotaError 
} from "./firestoreCircuitBreaker";

export const REFERRAL_SETTINGS_DOC_PATH = "settings/referral";
export const REFERRAL_CACHE_KEY = "sym_referral_settings_cache_v1";
export const REFERRAL_RECORDS_CACHE_KEY = "sym_referral_records_cache_v1";

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  isEnabled: true,
  discountPercentage: 10,
  minimumReferrals: 3,
  minimumVisits: 10,
  referrerRewardPercentage: 20,
  minimumOrderAmount: 2000,
  maxDiscountCap: 5000,
  referralCodePrefix: "SYM",
  headline: "SHARE THE SYMBOL // RECIPROCAL CITIZENSHIP",
  description: "Give a fellow seeker 10% acquisition concession; unlock 20% patron reward once 3 seekers join."
};

/**
 * Get cached referral settings synchronously
 */
export function getCachedReferralSettings(): ReferralSettings {
  if (typeof window === "undefined") return DEFAULT_REFERRAL_SETTINGS;
  try {
    const raw = localStorage.getItem(REFERRAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_REFERRAL_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_REFERRAL_SETTINGS;
}

/**
 * Cache referral settings locally
 */
export function setCachedReferralSettings(settings: ReferralSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REFERRAL_CACHE_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Fetch referral settings with offline fallback
 */
export async function getReferralSettings(): Promise<ReferralSettings> {
  const cached = getCachedReferralSettings();
  if (isFirestoreQuotaExceeded()) {
    return cached;
  }

  try {
    const docRef = doc(db, "settings", "referral");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...DEFAULT_REFERRAL_SETTINGS, ...snap.data() } as ReferralSettings;
      setCachedReferralSettings(data);
      return data;
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
    }
    console.warn("Could not fetch referral settings from Firestore, using cached defaults:", err);
  }
  return cached;
}

/**
 * Update referral settings (Owner action)
 */
export async function updateReferralSettings(
  settings: Partial<ReferralSettings>, 
  updatedBy?: string
): Promise<ReferralSettings> {
  const current = getCachedReferralSettings();
  const updated: ReferralSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now(),
    updatedBy: updatedBy || current.updatedBy || "owner"
  };

  setCachedReferralSettings(updated);

  if (!isFirestoreQuotaExceeded()) {
    try {
      const docRef = doc(db, "settings", "referral");
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
      console.warn("Could not save referral settings to Firestore, saved to local cache:", err);
    }
  }

  return updated;
}

/**
 * Subscribe to referral settings (Local-cache safe, no runaway reads)
 */
export function subscribeReferralSettings(
  callback: (settings: ReferralSettings) => void
): () => void {
  // Always emit cached settings immediately
  callback(getCachedReferralSettings());

  // Optionally fetch once in background if quota is healthy
  if (!isFirestoreQuotaExceeded()) {
    getReferralSettings().then(callback).catch(() => {});
  }

  return () => {};
}

/**
 * Calculates current friend discount percentage
 */
export function getFriendDiscountPercentage(settings?: ReferralSettings | null): number {
  return settings?.discountPercentage ?? DEFAULT_REFERRAL_SETTINGS.discountPercentage;
}

/**
 * Evaluates whether referrer reward tier is unlocked
 */
export function isReferrerRewardUnlocked(
  ordersCount: number,
  visitsCount: number,
  settings: ReferralSettings
): { unlocked: boolean; progressText: string; reason?: string } {
  const targetOrders = settings.minimumReferrals || DEFAULT_REFERRAL_SETTINGS.minimumReferrals;
  const targetVisits = settings.minimumVisits || DEFAULT_REFERRAL_SETTINGS.minimumVisits;

  const ordersMet = ordersCount >= targetOrders;
  const visitsMet = visitsCount >= targetVisits;
  const unlocked = ordersMet && visitsMet;

  let progressText = "";
  let reason = "";
  if (!unlocked) {
    const ordersLeft = Math.max(0, targetOrders - ordersCount);
    const visitsLeft = Math.max(0, targetVisits - visitsCount);
    progressText = `${ordersLeft} more referral order${ordersLeft === 1 ? "" : "s"} & ${visitsLeft} visit${visitsLeft === 1 ? "" : "s"} needed`;
    reason = progressText;
  } else {
    progressText = "Patron Reward Unlocked (20% Concession)";
    reason = "Target reached";
  }

  return { unlocked, progressText, reason };
}

/**
 * Generates a memorable, deterministic user referral code
 */
export function generateUserReferralCode(params: {
  uid?: string;
  displayName?: string | null;
  email?: string | null;
}): string {
  const prefix = "SYM";
  let seed = "";

  if (params.displayName) {
    seed = params.displayName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  } else if (params.email) {
    seed = params.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  } else if (params.uid) {
    seed = params.uid.slice(0, 4).toUpperCase();
  } else {
    seed = "INIT";
  }

  const hash = Math.abs(
    (params.uid || params.email || "SALT").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % 1000;

  return `${prefix}-${seed}${String(hash).padStart(3, "0")}`;
}

/**
 * Validates a referral code against requirements and returns concession details
 */
export async function validateReferralCode(
  code: string,
  subtotal: number,
  customerEmail?: string,
  currentUserUid?: string,
  settingsParam?: ReferralSettings
): Promise<{
  valid: boolean;
  referrerCode: string;
  discountAmount: number;
  discountPercentage: number;
  message: string;
  referrerUid?: string;
  referrerEmail?: string;
  isReferrerReward?: boolean;
}> {
  const settings = settingsParam || getCachedReferralSettings();
  const normalizedCode = code.trim().toUpperCase();

  if (!settings.isEnabled) {
    return {
      valid: false,
      referrerCode: normalizedCode,
      discountAmount: 0,
      discountPercentage: 0,
      message: "The referral program is currently not active."
    };
  }

  if (subtotal < (settings.minimumOrderAmount || 0)) {
    return {
      valid: false,
      referrerCode: normalizedCode,
      discountAmount: 0,
      discountPercentage: 0,
      message: `Minimum order requirement is PKR ${settings.minimumOrderAmount.toLocaleString()} to apply this code.`
    };
  }

  // Prevent self-referral using local storage
  const ownCode = typeof window !== "undefined" ? localStorage.getItem("sym_user_referral_code") : null;
  if (ownCode && ownCode.toUpperCase() === normalizedCode) {
    return {
      valid: false,
      referrerCode: normalizedCode,
      discountAmount: 0,
      discountPercentage: 0,
      message: "You cannot apply your own referral code to your order."
    };
  }

  let referrerUid: string | undefined;
  let referrerEmail: string | undefined;

  // Check Firestore user lookup if online
  if (!isFirestoreQuotaExceeded()) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", normalizedCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        referrerUid = userDoc.id;
        const data = userDoc.data();
        referrerEmail = data.email;
        if (currentUserUid && userDoc.id === currentUserUid) {
          return {
            valid: false,
            referrerCode: normalizedCode,
            discountAmount: 0,
            discountPercentage: 0,
            message: "Self-referrals are not permitted."
          };
        }
        if (customerEmail && data.email && customerEmail.toLowerCase() === data.email.toLowerCase()) {
          return {
            valid: false,
            referrerCode: normalizedCode,
            discountAmount: 0,
            discountPercentage: 0,
            message: "You cannot redeem your own referral code."
          };
        }
      }
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
    }
  }

  const pct = settings.discountPercentage || DEFAULT_REFERRAL_SETTINGS.discountPercentage;
  const rawDiscount = Math.round((subtotal * pct) / 100);
  const discountAmount = settings.maxDiscountCap ? Math.min(rawDiscount, settings.maxDiscountCap) : rawDiscount;

  return {
    valid: true,
    referrerCode: normalizedCode,
    discountAmount,
    discountPercentage: pct,
    message: `${pct}% Concession Applied via Seeker Code ${normalizedCode}`,
    referrerUid,
    referrerEmail
  };
}

/**
 * Records referral redemption on order completion
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
  const record: ReferralRecord = {
    id: `ref_usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    referrerUid: params.referrerUid,
    referrerCode: params.referrerCode.toUpperCase(),
    refereeEmail: params.refereeEmail,
    orderId: params.orderId,
    orderTotal: params.orderTotal,
    discountApplied: params.discountApplied,
    createdAt: Date.now()
  };

  // Cache locally
  try {
    const raw = localStorage.getItem(REFERRAL_RECORDS_CACHE_KEY);
    const list: ReferralRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(REFERRAL_RECORDS_CACHE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}

  if (!isFirestoreQuotaExceeded()) {
    try {
      await addDoc(collection(db, "referrals"), record);
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
      console.warn("Could not save referral record to Firestore:", err);
    }
  }
}

/**
 * Tracks a referral link visit
 */
export async function trackReferralVisit(
  referralCode: string,
  visitorUid?: string,
  visitorEmail?: string
): Promise<{ success: boolean; referrerName?: string }> {
  const code = referralCode.trim().toUpperCase();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sym_applied_referral_code", code);
      localStorage.setItem("sym_applied_referral_time", String(Date.now()));
    } catch {}
  }

  return { success: true, referrerName: code };
}

/**
 * Fetches recent referral records (Owner view)
 */
export async function getReferralRecords(limitCount: number = 50): Promise<ReferralRecord[]> {
  let list: ReferralRecord[] = [];
  try {
    const raw = localStorage.getItem(REFERRAL_RECORDS_CACHE_KEY);
    if (raw) list = JSON.parse(raw);
  } catch {}

  if (!isFirestoreQuotaExceeded()) {
    try {
      const q = query(collection(db, "referrals"), limit(limitCount));
      const snap = await getDocs(q);
      if (!snap.empty) {
        list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      }
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
      }
    }
  }

  return list;
}
