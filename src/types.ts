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

export type ArtifactStatus = "draft" | "published" | "active" | "archived";
export type SpecimenStatus = "draft" | "available" | "active" | "sold_out" | "discontinued";

export interface SpecimenMediumConfig {
  id: string; // e.g. "t-shirt", "hoodie", "full-sleeve", "p-cap", "mug", "tote-bag"
  name: string; // e.g. "T-Shirt", "Hoodie", "Full Sleeve", "P-Cap", "Mug", "Tote Bag"
  category: "wear" | "headwear" | "vessels" | "carry";
  description?: string;
  defaultGarmentTypes?: string[];
  defaultType?: string;
  defaultMaterial?: string;
  defaultSizes?: string[];
  defaultPrice?: number;
}

export interface Specimen {
  id: string; // Unique specimen ID e.g. "spec_sumud_tshirt"
  parentArtifactId: string; // Links to parent Artifact
  medium: string; // "T-Shirt" | "Hoodie" | "Full Sleeve" | "P-Cap" | "Mug" | etc.
  mediumCategory?: "wear" | "headwear" | "vessels" | "carry";
  type?: string; // e.g. "Drop Shoulder", "Oversized", "Structured 6-Panel"
  garmentType?: string;
  sku: string;
  price: number;
  inventory: number;
  availability: boolean;
  status: SpecimenStatus;
  images: string[];
  thumbnailImage?: string;
  
  // Physical & tactile parameters
  color?: string;
  colorHex?: string;
  availableColors?: ProductColorConfig[];
  availableSizes?: string[];
  material?: string;
  weight?: string;
  fit?: string;
  printMethod?: string;
  edition?: string;
  careInstructions?: string;
  finish?: string;
  dimensions?: string;
  capacity?: string;

  // Inherited/cached identity from parent Artifact
  artifactName?: string;
  artifactGraphic?: string;
  artifactInscription?: string;
  
  createdAt?: number;
  updatedAt?: number;
}

export interface Artifact {
  id: string; // Unique artifact ID
  artifactId: string; // Internal identifier / code (e.g. "SYM-01", "ART-SUMUD")
  name: string; // The design name (e.g. "SUMUD", "STATUS: RESISTING", "ALIF")
  shortDescription: string;
  description: string;
  concept?: string; // Meaning / ideological thesis
  graphic: string; // Central artwork / design graphic
  images: string[]; // Primary artifact visual assets
  thumbnailImage?: string;
  
  // 4 Pillars of Symbolic Representation & Inscription
  inscription?: string; // Primary symbol / inscription e.g. "صُمُود", "أَلِف"
  pillar1Represents?: string; // Pillar 01: What the symbol represents
  pillar2WhyChosen?: string; // Pillar 02: Why it was chosen
  pillar3Communicates?: string; // Pillar 03: What the artifact communicates
  pillar4WearerCarries?: string; // Pillar 04: What idea the wearer carries
  symbolicTagline?: string;
  
  collectionName: string; // e.g. "Be Palestine", "Be Symbolic"
  tags: string[]; // e.g. ["Series 01", "Steadfast", "Drop Shoulder"]
  releaseInfo?: string; // e.g. "Series 01 // Steadfast Foundation"
  internalNotes?: string;
  status: ArtifactStatus;
  
  specimenIds: string[]; // List of attached specimen IDs
  
  // Complete Artifact Set Pricing
  setPriceOverride?: number | null; // Optional custom complete artifact set price
  setDiscountPercentage?: number; // Optional discount percentage for acquiring complete set (e.g. 10%)
  completeSetDiscountPercent?: number; // Alias for setDiscountPercentage
  
  order?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ArtifactWithSpecimens extends Artifact {
  specimens: Specimen[];
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
  
  // Artifact & Specimen Hierarchy Links
  parentArtifactId?: string;
  specimenIds?: string[];
  graphic?: string;
  isArtifactMaster?: boolean;
  specimens?: Specimen[];
  
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
  colorHex?: string;
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
  medium?: string; // Primary medium e.g. "T-Shirt", "P-Cap", "Mug", "Hoodie"
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
  id: string; // composite id: productId + variantId or artifactId_set
  productId: string;
  variantId?: string;
  specimenId?: string;
  artifactId?: string;
  isCompleteArtifactSet?: boolean;
  isSetBundle?: boolean;
  includedSpecimens?: Array<{
    specimenId: string;
    medium: string;
    price: number;
    size?: string;
    color?: string;
  }>;
  name: string;
  price: number;
  quantity: number;
  image: string;
  categoryLabel: string;
  medium?: string;
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

