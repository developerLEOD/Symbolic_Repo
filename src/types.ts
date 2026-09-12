/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryTaxonomy = "HEADWEAR" | "VESSELS" | "STATEMENTS" | "OBJECTS" | "WEAR";

export interface Category {
  id: string;
  name: string;
  label: CategoryTaxonomy | string;
  description?: string;
  order: number;
}

export interface GarmentTypeConfig {
  id: string;
  name: string; // e.g. "Regular Fit", "Oversized", "Drop Shoulder", "Heavyweight", "Boxy Fit"
  basePrice: number; // e.g. 4200
  skuPrefix?: string;
  description?: string;
}

export interface ArtifactTypeItem {
  id: string;
  name: string; // e.g. "T-Shirts", "Hoodies", "Full Sleeves", "Bags", "Caps", "Mugs"
  description?: string;
  order: number;
}

export interface Medium {
  id: string;
  name: string; // e.g. "WEAR", "CARRY", "HEADWEAR", "VESSELS"
  description?: string;
  order: number;
  types: ArtifactTypeItem[];
}

// Alias for backward compatibility
export type ArtifactClassification = Medium;

export interface CustomArtifactTag {
  id: string;
  name: string; // e.g. "Heavyweight", "Drop Shoulder", "Oversized", "Series 01"
  description?: string;
  color?: string; // Optional accent badge color
  createdAt?: number;
}

export interface TaxonomyCatalog {
  classifications: Medium[];
  mediums?: Medium[];
  tags: CustomArtifactTag[];
  updatedAt?: number;
  updatedBy?: string;
}

export interface ProductColorConfig {
  id: string;
  name: string; // e.g. "Charcoal Black", "Washed Raw Ecru", "Olive Sand"
  hex: string;  // e.g. "#1C1C1C", "#F4F1EA", "#555A4C"
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  inventoryQuantity: number;
  inStock?: boolean;
  priceOverride?: number | null;
  garmentType?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  option3Name?: string;
  option3Value?: string;
}

export interface Product {
  id: string;
  productId?: string; // e.g. "SYM-01"
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sku: string;
  images: string[];
  thumbnailImage?: string;
  
  // Multi-axis Variant Architecture Configuration
  garmentTypes?: GarmentTypeConfig[];
  availableColors?: ProductColorConfig[];
  availableSizes?: string[];
  
  // Material & Construction specifications
  material?: string;
  weight?: string; // e.g. "400 GSM"
  fit?: string; // e.g. "BOXY RELAXED CUT", "STRUCTURED 6-PANEL"
  printMethod?: string; // e.g. "DIRECT SCREEN MATRIX", "TONAL EMBROIDERY"
  edition?: string;
  color?: string;
  capacity?: string;
  dimensions?: string;
  careInstructions?: string;
  finish?: string;
  
  // Meaning & 4 Pillars of Symbolic Representation
  inscription?: string; // Primary symbol / inscription e.g. "أَلِف", "صُمُود"
  pillar1Represents?: string; // Pillar 01: Doctrine / Scriptural Roots - What the symbol represents
  pillar2WhyChosen?: string; // Pillar 02: Intent / Deliberate Selection - Why it was chosen
  pillar3Communicates?: string; // Pillar 03: Transmission / Public Witness - What the artifact communicates
  pillar4WearerCarries?: string; // Pillar 04: Covenant / Inward Burden - What idea the wearer is carrying
  
  // Legacy aliases for full backward compatibility
  statement?: string; // What idea the wearer carries
  representation?: string; // Why the wearer chooses this
  wearingCommunicates?: string; // What wearing this communicates
  statementMeaning?: string; // What the symbol represents
  brandPlacement?: string; // e.g. "Subtle interior neck label; primary surface belongs to wearer"
  provenance?: string;
  
  // Owner-only Medium & Tagging System
  medium?: string; // Primary medium e.g. "WEAR", "CARRY", "HEADWEAR", "VESSELS"
  artifactClassification?: string; // Legacy alias for medium e.g. "WEAR", "CARRY", "HEADWEAR", "VESSELS"
  artifactType?: string; // Primary specific artifact type e.g. "T-Shirts", "Hoodies", "Caps", "Mugs"
  artifactTags?: string[]; // Multiple owner-defined tags e.g. ["Heavyweight", "Drop Shoulder", "Series 01"]
  
  // Real inventory and availability
  inventory: number;
  availability: boolean;
  isComingSoon?: boolean;
  comingSoon?: boolean;
  status?: string;
  
  collectionName?: string;
  symbolicTagline?: string;
}

export interface CartItem {
  id: string; // composite id: productId + variantId
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  categoryLabel: string;
  options?: { [key: string]: string };
}

export interface Order {
  id: string;
  userId?: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: number;
  referralCode?: string;
  referrerUid?: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    zip: string;
    country: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  role?: 'customer' | 'admin';
  referralCode?: string;
  referralsCount?: number;
  referralVisitsCount?: number;
  referredBy?: string;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface ReferralSettings {
  id?: string;
  isEnabled: boolean;
  discountPercentage: number;
  minimumReferrals: number;
  minimumVisits: number;
  referrerRewardPercentage: number;
  minimumOrderAmount: number;
  maxDiscountCap: number;
  referralCodePrefix: string;
  headline?: string;
  description?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface ReferralRecord {
  id: string;
  referrerUid?: string;
  referrerCode: string;
  refereeEmail: string;
  orderId: string;
  orderTotal: number;
  discountApplied: number;
  createdAt: number;
}

export interface ReferralVisitRecord {
  id?: string;
  referrerUid?: string;
  referrerCode: string;
  visitorSessionId: string;
  createdAt: number;
}

