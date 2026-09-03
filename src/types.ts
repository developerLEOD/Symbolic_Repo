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

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  inventoryQuantity: number;
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
  
  // Meaning & Symbol representation
  statement?: string; // What the object/symbol communicates
  representation?: string; // Why the wearer chooses this
  inscription?: string; // Primary symbol/inscription
  wearingCommunicates?: string; // What wearing this communicates
  statementMeaning?: string; // Core conviction or purpose
  brandPlacement?: string; // e.g. "Subtle interior neck label; primary surface belongs to wearer"
  provenance?: string;
  
  // Real inventory and availability
  inventory: number;
  availability: boolean;
  
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
  createdAt?: number;
  lastLoginAt?: number;
}

