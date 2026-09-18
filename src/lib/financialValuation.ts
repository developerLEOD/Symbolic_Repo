/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReferralSettings } from "../types";

export const COMPLIMENTARY_SHIPPING_THRESHOLD = 15000;
export const STANDARD_SHIPPING_FEE = 500;

export interface FinancialValuationItem {
  price: number | string;
  quantity: number | string;
}

export interface AppliedReferralState {
  code: string;
  discountPercentage: number;
  discountAmount?: number;
  message?: string;
  referrerUid?: string;
  referrerEmail?: string;
  isReferrerReward?: boolean;
}

export interface FinancialValuationParams {
  items: FinancialValuationItem[];
  appliedReferral?: AppliedReferralState | null;
  referralSettings?: ReferralSettings | null;
}

export interface FinancialValuationResult {
  // Subtotal / Specimens Valuation
  subtotal: number;
  totalQuantity: number;

  // Referral Calculations
  hasReferral: boolean;
  referralCode?: string;
  referralDiscountPercentage: number;
  isReferrerReward: boolean;
  isReferralEligible: boolean;
  referralIneligibleReason?: string;
  rawReferralDiscount: number;
  isDiscountCapped: boolean;
  discountCap: number;
  discountAmount: number;

  // Transit Dispatch Calculations
  isComplimentaryShipping: boolean;
  shippingThreshold: number;
  amountNeededForComplimentaryShipping: number;
  shippingFee: number;

  // Total Settlement
  total: number;

  // Total Customer Savings
  shippingSavings: number;
  totalSavings: number;
}

/**
 * Single source of truth for financial valuation across Cart, Checkout, and Analytics.
 */
export function calculateFinancialValuation({
  items,
  appliedReferral,
  referralSettings
}: FinancialValuationParams): FinancialValuationResult {
  // 1. Calculate safe subtotal & total quantity
  let subtotal = 0;
  let totalQuantity = 0;

  if (Array.isArray(items)) {
    for (const item of items) {
      const price = Math.max(0, Number(item?.price) || 0);
      const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1));
      subtotal += price * qty;
      totalQuantity += qty;
    }
  }

  // 2. Shipping & Archival Dispatch
  const isComplimentaryShipping = subtotal >= COMPLIMENTARY_SHIPPING_THRESHOLD;
  const amountNeededForComplimentaryShipping = Math.max(0, COMPLIMENTARY_SHIPPING_THRESHOLD - subtotal);
  const shippingFee = subtotal > 0 ? (isComplimentaryShipping ? 0 : STANDARD_SHIPPING_FEE) : 0;
  const shippingSavings = isComplimentaryShipping && subtotal > 0 ? STANDARD_SHIPPING_FEE : 0;

  // 3. Referral Program Calculations
  const hasReferral = Boolean(appliedReferral && appliedReferral.code);
  const isEnabled = referralSettings ? referralSettings.isEnabled !== false : true;
  const referralCode = appliedReferral?.code;
  const referralDiscountPercentage = Math.max(0, Number(appliedReferral?.discountPercentage) || 0);
  const isReferrerReward = Boolean(appliedReferral?.isReferrerReward);

  let isReferralEligible = false;
  let referralIneligibleReason: string | undefined;
  let rawReferralDiscount = 0;
  let isDiscountCapped = false;
  let discountCap = referralSettings ? Math.max(0, Number(referralSettings.maxDiscountCap) || 0) : 0;
  let discountAmount = 0;

  if (hasReferral) {
    if (!isEnabled) {
      isReferralEligible = false;
      referralIneligibleReason = "The referral program is currently deactivated.";
    } else {
      const minOrderAmount = referralSettings ? Math.max(0, Number(referralSettings.minimumOrderAmount) || 0) : 0;
      
      if (minOrderAmount > 0 && subtotal < minOrderAmount) {
        isReferralEligible = false;
        referralIneligibleReason = `Requires minimum order subtotal of Rs. ${minOrderAmount.toLocaleString()} PKR (Current: Rs. ${subtotal.toLocaleString()} PKR).`;
      } else if (subtotal > 0 && referralDiscountPercentage > 0) {
        isReferralEligible = true;
        rawReferralDiscount = Math.round((subtotal * referralDiscountPercentage) / 100);

        if (discountCap > 0 && rawReferralDiscount > discountCap) {
          isDiscountCapped = true;
          discountAmount = discountCap;
        } else {
          isDiscountCapped = false;
          discountAmount = rawReferralDiscount;
        }
      }
    }
  }

  // 4. Total Settlement
  const total = Math.max(0, subtotal - discountAmount + shippingFee);
  const totalSavings = discountAmount + shippingSavings;

  return {
    subtotal,
    totalQuantity,
    hasReferral,
    referralCode,
    referralDiscountPercentage,
    isReferrerReward,
    isReferralEligible,
    referralIneligibleReason,
    rawReferralDiscount,
    isDiscountCapped,
    discountCap,
    discountAmount,
    isComplimentaryShipping,
    shippingThreshold: COMPLIMENTARY_SHIPPING_THRESHOLD,
    amountNeededForComplimentaryShipping,
    shippingFee,
    total,
    shippingSavings,
    totalSavings
  };
}
