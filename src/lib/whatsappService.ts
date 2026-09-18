/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CartItem, Product, Specimen } from "../types";
import { FinancialValuationResult } from "./financialValuation";

export const STUDIO_WHATSAPP_NUMBER = "923342764183";
export const STUDIO_WHATSAPP_DISPLAY = "+92 334 2764183";
export const STUDIO_WHATSAPP_LOCAL_DISPLAY = "0334 2764183";

export interface OrderCustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  houseNo?: string;
  street: string;
  suburb: string;
  city: string;
  zip?: string;
  country: string;
}

export interface OrderSnapshotData {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  totalSavings: number;
  isComplimentaryShipping: boolean;
  referralCode?: string | null;
  referralDiscountPercentage?: number;
  customerInfo: OrderCustomerInfo;
}

/**
 * Cleanly format an address string without dangling commas or duplicated "House #" prefixes.
 */
export function formatShippingAddress(info: OrderCustomerInfo): string {
  const parts: string[] = [];

  if (info.houseNo && info.houseNo.trim()) {
    const rawHouse = info.houseNo.trim();
    if (/^(house|apt|apartment|flat|suite|unit)/i.test(rawHouse)) {
      parts.push(rawHouse);
    } else {
      parts.push(`House/Apt: ${rawHouse}`);
    }
  }

  if (info.street && info.street.trim()) parts.push(info.street.trim());
  if (info.suburb && info.suburb.trim()) parts.push(info.suburb.trim());
  if (info.city && info.city.trim()) parts.push(info.city.trim());
  if (info.zip && info.zip.trim()) parts.push(`Postal Code: ${info.zip.trim()}`);
  if (info.country && info.country.trim()) parts.push(info.country.trim());

  return parts.join(", ");
}

/**
 * Formats a clean list of cart items for WhatsApp transmission.
 */
export function formatCartItemsForWhatsApp(items: CartItem[]): string {
  if (!items || items.length === 0) {
    return "• [No items specified in registry]";
  }

  return items.map((item, idx) => {
    const mediumBadge = item.medium ? ` [${item.medium.toUpperCase()}]` : "";
    const isSet = item.isCompleteArtifactSet ? " [COMPLETE ARTIFACT SET // 4 PIECES]" : "";
    
    // Clean formatted options
    const optionStrings: string[] = [];
    if (item.options) {
      Object.entries(item.options).forEach(([k, v]) => {
        if (v && v !== "undefined" && v !== "null") {
          optionStrings.push(`${k}: ${v}`);
        }
      });
    }

    const optionsText = optionStrings.length > 0 ? ` (${optionStrings.join(", ")})` : "";
    const itemTotal = (item.price * item.quantity).toLocaleString();

    let text = `${idx + 1}. *${item.name}*${mediumBadge}${isSet}${optionsText}\n   Qty: ${item.quantity} | Valuation: Rs. ${itemTotal} PKR`;

    // If complete set bundle, optionally detail included pieces
    if (item.isCompleteArtifactSet && item.includedSpecimens && item.includedSpecimens.length > 0) {
      const pieces = item.includedSpecimens.map(s => s.medium).join(", ");
      text += `\n   Includes: ${pieces}`;
    }

    return text;
  }).join("\n\n");
}

/**
 * Builds the official WhatsApp Artifact Acquisition Directive & Inquiry message.
 */
export function buildWhatsAppOrderDirective(snapshot: OrderSnapshotData): string {
  const currentOrderNo = snapshot.orderNumber || "SYM-" + Math.floor(100000 + Math.random() * 900000);
  const itemsText = formatCartItemsForWhatsApp(snapshot.items);
  const fullAddress = formatShippingAddress(snapshot.customerInfo);
  const possessorName = `${snapshot.customerInfo.firstName || ""} ${snapshot.customerInfo.lastName || ""}`.trim() || "Valued Custodian";

  const discountText = snapshot.discount > 0 
    ? `• Referral Privilege (${snapshot.referralCode || "STUDIO-CODE"}): -Rs. ${snapshot.discount.toLocaleString()} PKR${snapshot.referralDiscountPercentage ? ` (${snapshot.referralDiscountPercentage}% OFF)` : ""}\n` 
    : "";

  const dispatchText = snapshot.isComplimentaryShipping || snapshot.shipping === 0
    ? `• Archival Courier Dispatch: COMPLIMENTARY (0 PKR - Unlocked at Rs. 15,000 threshold)\n`
    : `• Archival Courier Dispatch: Rs. ${snapshot.shipping.toLocaleString()} PKR (Insured Courier)\n`;

  const savingsText = snapshot.totalSavings > 0
    ? `• Total Privilege Savings: Rs. ${snapshot.totalSavings.toLocaleString()} PKR\n`
    : "";

  const message = 
    `*SYMBOLIC // ARTIFACT ACQUISITION & ORDER INQUIRY DIRECTIVE*\n` +
    `----------------------------------------\n` +
    `*ORDER REGISTRY:* #${currentOrderNo}\n` +
    `*STATUS:* Pending WhatsApp Settlement Confirmation\n` +
    `----------------------------------------\n\n` +
    `*POSSESSOR CREDENTIALS:*\n` +
    `• Name: ${possessorName}\n` +
    `• Contact / WhatsApp: ${snapshot.customerInfo.phone || "Not provided"}\n` +
    `• Email: ${snapshot.customerInfo.email || "Not provided"}\n` +
    `• Dispatch Address: ${fullAddress || "To be confirmed on WhatsApp"}\n\n` +
    `*RESERVED ARTIFACTS:*\n` +
    `${itemsText}\n\n` +
    `*FINANCIAL VALUATION MATRIX:*\n` +
    `• Artifact Subtotal: Rs. ${snapshot.subtotal.toLocaleString()} PKR\n` +
    `${discountText}` +
    `${dispatchText}` +
    `*• TOTAL SETTLEMENT: Rs. ${snapshot.total.toLocaleString()} PKR*\n` +
    `${savingsText}\n` +
    `*SETTLEMENT PROTOCOL:*\n` +
    `Direct WhatsApp Interaction (Bank payments on standby / Direct IBFT or Raast clearance requested).\n\n` +
    `_Hello SYMBOLIC Atelier, I have initiated this acquisition registry. Please verify physical specimen allocation and transmit direct settlement details (IBFT / Raast)._`;

  return message;
}

/**
 * Builds a direct Artifact Specimen Inquiry message for a specific product.
 */
export function buildWhatsAppProductInquiry(product: {
  name: string;
  sku?: string;
  productId?: string;
  price: number;
  medium?: string;
  selectedSize?: string;
  selectedColor?: string;
}): string {
  const code = product.productId || product.sku || "SPECIMEN";
  const sizeText = product.selectedSize ? `\n• Preferred Size: ${product.selectedSize}` : "";
  const colorText = product.selectedColor ? `\n• Preferred Color/Finish: ${product.selectedColor}` : "";
  const mediumText = product.medium ? `\n• Classification: ${product.medium}` : "";

  return (
    `*SYMBOLIC // ARTIFACT SPECIMEN INQUIRY*\n` +
    `----------------------------------------\n` +
    `*ARTIFACT:* ${product.name}\n` +
    `*REGISTRY CODE:* #${code}\n` +
    `*VALUATION:* Rs. ${product.price.toLocaleString()} PKR${mediumText}${sizeText}${colorText}\n` +
    `----------------------------------------\n\n` +
    `Hello SYMBOLIC Concierge, I would like to inquire about this physical artifact specimen. Please confirm availability, sizing guidance, and delivery schedule.`
  );
}

/**
 * Builds a WhatsApp inquiry message for the user's active cart.
 */
export function buildWhatsAppCartInquiry(items: CartItem[], valuation: FinancialValuationResult): string {
  const itemsText = formatCartItemsForWhatsApp(items);
  const shippingText = valuation.isComplimentaryShipping 
    ? "Complimentary (0 PKR - Met Rs. 15,000 threshold)"
    : `Rs. ${valuation.shippingFee.toLocaleString()} PKR`;

  return (
    `*SYMBOLIC // ATELIER LEDGER INQUIRY*\n` +
    `----------------------------------------\n` +
    `*PROPOSED SPECIMENS:*\n` +
    `${itemsText}\n\n` +
    `*VALUATION SUMMARY:*\n` +
    `• Subtotal: Rs. ${valuation.subtotal.toLocaleString()} PKR\n` +
    (valuation.discountAmount > 0 ? `• Referral Discount: -Rs. ${valuation.discountAmount.toLocaleString()} PKR\n` : "") +
    `• Archival Dispatch: ${shippingText}\n` +
    `*• ESTIMATED TOTAL: Rs. ${valuation.total.toLocaleString()} PKR*\n` +
    `----------------------------------------\n\n` +
    `Hello SYMBOLIC Atelier, I am preparing to acquire these specimens from my ledger. Please confirm stock readiness and payment guidance.`
  );
}

/**
 * Generates an accessible, reliable WhatsApp Web and Mobile deep-link URL.
 */
export function getWhatsAppUrl(message: string, phone: string = STUDIO_WHATSAPP_NUMBER): string {
  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
}

/**
 * Opens WhatsApp in a new tab/window, with graceful fallback.
 */
export function openWhatsAppChat(message: string, phone: string = STUDIO_WHATSAPP_NUMBER): Window | null {
  const url = getWhatsAppUrl(message, phone);
  try {
    return window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.warn("Failed to open WhatsApp window automatically:", err);
    return null;
  }
}
