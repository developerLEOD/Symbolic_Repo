import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, ProductVariant } from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned as T;
}

export const CANONICAL_CATEGORIES: Category[] = [
  {
    id: "wear",
    name: "Wear",
    label: "WEAR",
    description: "Daily armor of modesty and dignified public posture (Heavyweight Fleece, Boxy Tees, Hoodies)",
    order: 1
  },
  {
    id: "carry",
    name: "Carry",
    label: "CARRY",
    description: "Instruments of transit and stewardship (18 oz Canvas Bags, Utility Totes, Field Organizers)",
    order: 2
  },
  {
    id: "headwear",
    name: "Headwear",
    label: "HEADWEAR",
    description: "Crown of focus and gaze-restraint (Structured 6-Panel Twill Caps, Low-Profile Headwear)",
    order: 3
  },
  {
    id: "vessels",
    name: "Vessels",
    label: "VESSELS",
    description: "Rituals of sustenance and contemplation (Dense Artisan Stoneware, Ceramic Mugs, Vessels)",
    order: 4
  }
];

export const CANONICAL_COLLECTIONS = [
  {
    id: "all",
    name: "All Collections",
    label: "ALL COLLECTIONS",
    description: "Complete studio corpus spanning all thematic series and ethos lines"
  },
  {
    id: "be-symbolic",
    name: "Be Symbolic",
    label: "BE SYMBOLIC",
    description: "Core identity silhouettes & physical manifestations of conviction"
  },
  {
    id: "be-palestine",
    name: "Be Palestine",
    label: "BE PALESTINE",
    description: "The Steadfast Collection — unyielding heritage, resilience, and solidarity for Falasteen"
  }
];

export async function fetchCategories(): Promise<Category[]> {
  const path = "categories";
  try {
    const q = query(collection(db, path), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    
    // Asynchronously delete any legacy non-specimen category docs in Firestore
    for (const d of snapshot.docs) {
      const docId = d.id.toLowerCase();
      const isCanonicalSpecimen = CANONICAL_CATEGORIES.some(c => c.id === docId);
      if (!isCanonicalSpecimen) {
        deleteDoc(doc(db, path, d.id)).catch(() => {});
      }
    }

    // Unconditionally ensure canonical specimen type categories exist in Firestore
    for (const cat of CANONICAL_CATEGORIES) {
      setDoc(doc(db, path, cat.id), cat).catch(() => {});
    }

    return CANONICAL_CATEGORIES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return CANONICAL_CATEGORIES;
  }
}

/**
 * Checks whether a product is in a draft, hidden, or archived state.
 * Drafted or hidden items must never appear as statement pieces or in the public storefront.
 */
export function isProductDraftOrHidden(product: Product | null | undefined): boolean {
  if (!product) return true;
  if (product.availability === false) return true;
  const p = product as unknown as Record<string, unknown>;
  if (p.isDraft === true || p.draft === true || p.hidden === true || p.isArchived === true) return true;
  if (typeof p.status === "string") {
    const s = p.status.toLowerCase();
    if (s === "draft" || s === "hidden" || s === "archived") return true;
  }
  if (typeof p.visibility === "string") {
    const v = p.visibility.toLowerCase();
    if (v === "draft" || v === "hidden" || v === "archived") return true;
  }
  return false;
}

/**
 * Checks whether a product is live and eligible for public storefront exhibition.
 */
export function isProductLive(product: Product | null | undefined): boolean {
  return !isProductDraftOrHidden(product);
}

export function normalizeProductCategory(p: Product): string {
  const cat = (p.categoryId || "").toLowerCase();
  const name = (p.name || "").toLowerCase();
  const sku = (p.sku || p.productId || "").toLowerCase();

  if (cat === "wear" || cat === "t-shirts" || cat === "apparel" || cat === "hoodies" || sku.includes("tsh") || sku.includes("hood") || name.includes("tee") || name.includes("shirt") || name.includes("hoodie")) {
    return "wear";
  }
  if (cat === "carry" || cat === "bags" || cat === "totes" || sku.includes("bag") || sku.includes("tot") || name.includes("bag") || name.includes("tote") || name.includes("pack")) {
    return "carry";
  }
  if (cat === "headwear" || cat === "caps" || cat === "hats" || sku.includes("cap") || sku.includes("hat") || name.includes("cap") || name.includes("hat")) {
    return "headwear";
  }
  if (cat === "vessels" || cat === "mugs" || cat === "ceramics" || sku.includes("mug") || sku.includes("ves") || name.includes("mug") || name.includes("vessel") || name.includes("ceramic")) {
    return "vessels";
  }
  return "wear";
}

export function normalizeProductCollection(p: Product): "Be Symbolic" | "Be Palestine" {
  const col = (p.collectionName || "").toLowerCase();
  const cat = (p.categoryId || "").toLowerCase();
  const name = (p.name || "").toLowerCase();

  if (col.includes("palestine") || col.includes("sumud") || cat === "palestine" || cat === "sumud" || name.includes("palestine") || name.includes("gaza") || name.includes("kuffiyeh")) {
    return "Be Palestine";
  }
  return "Be Symbolic";
}

function sanitizeProduct(p: Product): { product: Product; changed: boolean } {
  let changed = false;
  let newCollectionName = p.collectionName;
  let newCategoryId = p.categoryId;
  let newName = p.name;
  let newDesc = p.description;
  let newTagline = p.symbolicTagline;

  // Collection normalization
  const normCol = normalizeProductCollection(p);
  if (p.collectionName !== normCol) {
    newCollectionName = normCol;
    changed = true;
  }

  // Specimen Type (Category) normalization
  const normCat = normalizeProductCategory(p);
  if (p.categoryId !== normCat) {
    newCategoryId = normCat;
    changed = true;
  }

  if (newName && /sumud/i.test(newName)) {
    newName = newName.replace(/sumud/gi, "Be Palestine");
    changed = true;
  }

  if (newDesc && /sumud/i.test(newDesc)) {
    newDesc = newDesc.replace(/sumud/gi, "Be Palestine");
    changed = true;
  }

  if (newTagline && /sumud/i.test(newTagline)) {
    newTagline = newTagline.replace(/sumud/gi, "Be Palestine");
    changed = true;
  }

  const sanitized: Product = {
    ...p,
    name: newName,
    collectionName: newCollectionName,
    categoryId: newCategoryId,
    description: newDesc,
    symbolicTagline: newTagline
  };

  return { product: sanitized, changed };
}

export async function fetchProducts(): Promise<Product[]> {
  const path = "products";
  try {
    const snapshot = await getDocs(collection(db, path));
    const rawProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    
    return rawProducts.map(p => {
      const { product, changed } = sanitizeProduct(p);
      if (changed) {
        // Asynchronously update Firestore document to persist Be Palestine migration
        const cleaned = cleanUndefined(product);
        setDoc(doc(db, path, product.id), cleaned, { merge: true }).catch(() => {});
      }
      return product;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const path = `products/${productId}/variants`;
  try {
    const snapshot = await getDocs(collection(db, "products", productId, "variants"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductVariant));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveProductWithVariants(
  product: Product,
  variants: ProductVariant[] = []
): Promise<void> {
  const productPath = `products/${product.id}`;
  try {
    const cleanedProduct = cleanUndefined(product);
    // 1. Save main product document
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, cleanedProduct, { merge: true });

    // 2. Save variants if any
    if (variants.length > 0) {
      const batch = writeBatch(db);
      for (const variant of variants) {
        const cleanedVariant = cleanUndefined(variant);
        const variantRef = doc(db, "products", product.id, "variants", variant.id);
        batch.set(variantRef, cleanedVariant, { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, productPath);
  }
}

export async function deleteProductAndVariants(productId: string): Promise<void> {
  const productPath = `products/${productId}`;
  try {
    // Delete existing variants
    const variantsSnapshot = await getDocs(collection(db, "products", productId, "variants"));
    const batch = writeBatch(db);
    variantsSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, "products", productId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, productPath);
  }
}

export async function toggleProductAvailability(productId: string, availability: boolean): Promise<void> {
  const productPath = `products/${productId}`;
  try {
    const productRef = doc(db, "products", productId);
    await setDoc(productRef, { availability }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, productPath);
  }
}
