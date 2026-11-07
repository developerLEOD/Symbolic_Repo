/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReferralSettings, ReferralRecord } from "../types";

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  isEnabled: true,
  discountPercentage: 20,
  minimumReferrals: 0,
  minimumVisits: 0,
  referrerRewardPercentage: 10,
  minimumOrderAmount: 0,
  maxDiscountCap: 10000,
  referralCodePrefix: "SYM",
  headline: "SYMBOLIC AFFILIATE PROGRAM",
  description: "Share transmission codes with colleagues. They receive 20% privilege on acquisition."
};

export async function getReferralSettings(...args: any[]): Promise<ReferralSettings> {
  return DEFAULT_REFERRAL_SETTINGS;
}

export async function updateReferralSettings(...args: any[]): Promise<ReferralSettings> {
  return DEFAULT_REFERRAL_SETTINGS;
}

export async function getReferralRecords(...args: any[]): Promise<ReferralRecord[]> {
  return [];
}

export async function recordReferralUsage(...args: any[]): Promise<void> {
  // stub
}

export async function trackReferralVisit(...args: any[]): Promise<{ success: boolean; referrerName?: string }> {
  return { success: true, referrerName: "COLLEAGUE" };
}

export function subscribeReferralSettings(callback: (settings: ReferralSettings) => void): () => void {
  callback(DEFAULT_REFERRAL_SETTINGS);
  return () => {};
}

export function getFriendDiscountPercentage(...args: any[]): number {
  return 20;
}

export function isReferrerRewardUnlocked(...args: any[]): { unlocked: boolean; progressText: string; reason?: string } {
  return { unlocked: true, progressText: "Unlocked", reason: "" };
}

export async function validateReferralCode(...args: any[]): Promise<{
  valid: boolean;
  discountPercent: number;
  discountPercentage: number;
  discountAmount: number;
  message?: string;
  referrerCode?: string;
  referrerUid?: string;
  referrerEmail?: string;
  isReferrerReward?: boolean;
}> {
  return {
    valid: true,
    discountPercent: 20,
    discountPercentage: 20,
    discountAmount: 200,
    referrerCode: "SYM",
    message: "Valid affiliation code applied."
  };
}

export function generateUserReferralCode(...args: any[]): string {
  return "SYM-USER-01";
}
