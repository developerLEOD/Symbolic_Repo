import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, ProductVariant, Artifact, Specimen } from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";
import { sanitizeProductForFirestore } from "./imageOptimization";
import { 
  fetchArtifacts, 
  fetchSpecimens, 
  convertArtifactsAndSpecimensToProducts, 
  getCachedArtifacts, 
  getCachedSpecimens 
} from "./artifactService";

import BlankComingSoonImg from "../assets/images/completely_blank_coming_soon_1789235306808.jpg";

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

// Global fast in-memory & persistent cache keys
const PRODUCTS_CACHE_KEY = "sym_products_cache_v2";
let memoryProductsCache: Product[] | null = null;
let memoryCategoriesCache: Category[] | null = null;

export function getCachedProducts(): Product[] {
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    return memoryProductsCache;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryProductsCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      // Storage parse error ignored
    }
  }

  // Fallback to cached artifacts & specimens converted to products
  const cachedArtifacts = getCachedArtifacts();
  const cachedSpecimens = getCachedSpecimens();
  if (cachedArtifacts.length > 0) {
    const converted = convertArtifactsAndSpecimensToProducts(cachedArtifacts, cachedSpecimens);
    if (converted.length > 0) {
      memoryProductsCache = converted;
      return converted;
    }
  }

  return [];
}

export function invalidateProductsCache(newProducts?: Product[]): void {
  if (newProducts && newProducts.length > 0) {
    memoryProductsCache = newProducts;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(newProducts));
      } catch (e) {}
    }
  } else {
    memoryProductsCache = null;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(PRODUCTS_CACHE_KEY);
      } catch (e) {}
    }
  }
}

/**
 * Executes a Firestore collection query with multi-stage verification if the result is zero.
 * If the collection appears empty (0 documents), it checks twice or thrice (with progressive delays
 * and direct server verification) before authoritatively confirming the collection is genuinely empty.
 */
export async function queryCollectionWithZeroVerification(
  path: string,
  queryRefOrBuilder: any,
  maxChecks: number = 3
): Promise<any> {
  let attempt = 0;
  let lastSnapshot: any = null;

  while (attempt < maxChecks) {
    attempt++;
    try {
      lastSnapshot = await getDocs(queryRefOrBuilder);

      if (lastSnapshot && !lastSnapshot.empty && lastSnapshot.docs && lastSnapshot.docs.length > 0) {
        if (attempt > 1) {
          console.info(`[Collection Verification] Documents recovered on check ${attempt} of ${maxChecks} for "${path}". Count: ${lastSnapshot.docs.length}`);
        }
        return lastSnapshot;
      }

      console.info(`[Collection Verification] Zero documents returned on check ${attempt}/${maxChecks} for collection "${path}".`);

      if (attempt < maxChecks) {
        // Progressive pause before next check: 350ms before check 2 (twice), 650ms before check 3 (thrice)
        const delay = attempt === 1 ? 350 : 650;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      console.warn(`[Collection Verification] Error on check ${attempt} for "${path}":`, err);
      if (attempt < maxChecks) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }

  console.info(`[Collection Verification] Authoritatively confirmed: collection "${path}" is empty after ${maxChecks} consecutive checks.`);
  return lastSnapshot;
}

/**
 * Authoritatively verifies whether a Firestore collection is empty.
 * Checks twice or thrice if the result is zero before confirming emptiness.
 */
export async function isCollectionEmpty(
  collectionPath: string = "products",
  maxChecks: number = 3
): Promise<{ isEmpty: boolean; count: number; checksPerformed: number }> {
  try {
    const colRef = collection(db, collectionPath);
    const snap = await queryCollectionWithZeroVerification(collectionPath, colRef, maxChecks);
    const count = snap && !snap.empty && snap.docs ? snap.docs.length : 0;
    return {
      isEmpty: count === 0,
      count,
      checksPerformed: maxChecks
    };
  } catch {
    return { isEmpty: true, count: 0, checksPerformed: maxChecks };
  }
}

export async function fetchCategories(): Promise<Category[]> {
  if (memoryCategoriesCache && memoryCategoriesCache.length > 0) {
    return memoryCategoriesCache;
  }

  const path = "categories";
  
  // Return canonical instantly if offline/slow by setting a safe 5s timeout
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 5000);
  });

  try {
    const fetchPromise = (async () => {
      const q = query(collection(db, path), orderBy("order", "asc"));
      // Check twice or thrice if the result is zero in categories collection
      const snapshot = await queryCollectionWithZeroVerification(path, q, 3);
      if (snapshot && !snapshot.empty && snapshot.docs && snapshot.docs.length > 0) {
        const cats = snapshot.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as Category))
          .filter((c: Category) => {
            const id = (c.id || "").toLowerCase();
            const name = (c.name || "").toLowerCase();
            return id !== "garments" && name !== "garments" && id !== "palestine" && id !== "be-symbolic";
          });
        if (cats.length > 0) return cats;
      }
      return CANONICAL_CATEGORIES;
    })();

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    const finalCategories = result || CANONICAL_CATEGORIES;
    memoryCategoriesCache = finalCategories;
    return finalCategories;
  } catch (error) {
    memoryCategoriesCache = CANONICAL_CATEGORIES;
    return CANONICAL_CATEGORIES;
  }
}

export const STUDIO_FALLBACK_IMAGE = BlankComingSoonImg;

/**
 * Resolves a list of clean, valid image URLs for a product with graceful fallbacks.
 */
export function resolveProductImages(product?: Product | null): string[] {
  if (!product) return [STUDIO_FALLBACK_IMAGE];
  const list = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.thumbnailImage || STUDIO_FALLBACK_IMAGE];

  const valid = list
    .filter(img => img && typeof img === 'string' && img.trim() !== "" && img !== "/placeholder.png" && img !== "undefined")
    .map(img => {
      const trimmed = img.trim();
      if (trimmed.startsWith("/src/assets/images/")) {
        return trimmed.replace("/src/assets/images/", "/images/");
      }
      if (trimmed.startsWith("src/assets/images/")) {
        return trimmed.replace("src/assets/images/", "/images/");
      }
      if (trimmed.startsWith("images/")) {
        return `/${trimmed}`;
      }
      return trimmed;
    });

  return valid.length > 0 ? valid : [STUDIO_FALLBACK_IMAGE];
}

export function resolveSingleImage(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === "" || url === "/placeholder.png" || url === "undefined") {
    return STUDIO_FALLBACK_IMAGE;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("/src/assets/images/")) {
    return trimmed.replace("/src/assets/images/", "/images/");
  }
  if (trimmed.startsWith("src/assets/images/")) {
    return trimmed.replace("src/assets/images/", "/images/");
  }
  if (trimmed.startsWith("images/")) {
    return `/${trimmed}`;
  }
  return trimmed;
}

/**
 * Checks whether a product is in an archived, unavailable, draft or hidden state.
 * Products in this state MUST NOT appear in the public catalog or be displayed as sold out.
 */
export function isProductDraftOrHidden(product: Product | null | undefined): boolean {
  if (!product) return true;
  const p = product as unknown as Record<string, unknown>;

  // Explicit availability / active flags (e.g. from Studio Manager)
  if (p.availability === false || p.isAvailable === false || p.active === false || p.isPublished === false) {
    return true;
  }

  // Explicit draft / archived flags
  if (p.isDraft === true || p.draft === true || p.hidden === true || p.isArchived === true || p.archived === true) {
    return true;
  }

  // Status string checks
  if (typeof p.status === "string") {
    const s = p.status.toLowerCase().trim();
    if (["draft", "hidden", "archived", "inactive", "disabled", "unpublished", "deleted"].includes(s)) {
      return true;
    }
  }

  // Visibility string checks
  if (typeof p.visibility === "string") {
    const v = p.visibility.toLowerCase().trim();
    if (["draft", "hidden", "archived", "private", "inactive"].includes(v)) {
      return true;
    }
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
  const cat = (p.categoryId || "").toLowerCase().trim();
  
  // 1. Explicit matches take precedence
  if (cat === "wear" || cat === "carry" || cat === "headwear" || cat === "vessels") {
    return cat;
  }

  // 2. Fuzzy matches if explicit category is missing or unknown
  const name = (p.name || "").toLowerCase();
  const sku = (p.sku || p.productId || "").toLowerCase();

  if (cat === "t-shirts" || cat === "apparel" || cat === "hoodies" || sku.includes("tsh") || sku.includes("hood") || name.includes("tee") || name.includes("shirt") || name.includes("hoodie")) {
    return "wear";
  }
  if (cat === "bags" || cat === "totes" || sku.includes("bag") || sku.includes("tot") || name.includes("bag") || name.includes("tote") || name.includes("pack")) {
    return "carry";
  }
  if (cat === "caps" || cat === "hats" || sku.includes("cap") || sku.includes("hat") || name.includes("cap") || name.includes("hat")) {
    return "headwear";
  }
  if (cat === "mugs" || cat === "ceramics" || sku.includes("mug") || sku.includes("ves") || name.includes("mug") || name.includes("vessel") || name.includes("ceramic")) {
    return "vessels";
  }
  return "wear";
}

export function normalizeProductCollection(p: Product): "Be Symbolic" | "Be Palestine" {
  const col = (p.collectionName || "").toLowerCase().trim();
  
  // 1. Explicit match
  if (col === "be palestine" || col === "be-palestine") {
    return "Be Palestine";
  }
  if (col === "be symbolic" || col === "be-symbolic") {
    return "Be Symbolic";
  }

  // 2. Fuzzy match
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

  // Medium (Category) normalization
  const normCat = normalizeProductCategory(p);
  if (p.categoryId !== normCat) {
    newCategoryId = normCat;
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
  
  // Safe timeout allows sufficient window for verification
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 8000);
  });

  try {
    const fetchPromise = (async () => {
      // 1. Fetch live artifacts and specimens in parallel with direct products
      const [artifactList, specimenList, rawProductSnapshot] = await Promise.all([
        fetchArtifacts().catch(() => [] as Artifact[]),
        fetchSpecimens().catch(() => [] as Specimen[]),
        queryCollectionWithZeroVerification(path, collection(db, path), 2).catch(() => null)
      ]);

      // 2. Convert artifacts and specimens to canonical products
      const artifactProducts = convertArtifactsAndSpecimensToProducts(artifactList, specimenList);

      // 3. Process direct products from products collection (if any)
      const directProducts: Product[] = [];
      if (rawProductSnapshot && !rawProductSnapshot.empty && rawProductSnapshot.docs && rawProductSnapshot.docs.length > 0) {
        const raw = rawProductSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));
        for (const p of raw) {
          const { product, changed } = sanitizeProduct(p);
          if (changed) {
            const cleaned = cleanUndefined(product);
            setDoc(doc(db, path, product.id), cleaned, { merge: true }).catch(() => {});
          }
          directProducts.push(product);
        }
      }

      // 4. Combine products: unify by unique id
      const combinedMap = new Map<string, Product>();
      
      // Add direct products
      for (const p of directProducts) {
        if (p && p.id) combinedMap.set(p.id, p);
      }
      
      // Overlay/incorporate artifact products (these represent the live Studio register)
      for (const p of artifactProducts) {
        if (p && p.id) combinedMap.set(p.id, p);
      }

      const combined = Array.from(combinedMap.values());
      return combined;
    })();

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (result && Array.isArray(result)) {
      invalidateProductsCache(result);
      return result;
    }

    return getCachedProducts();
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return getCachedProducts();
  }
}

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const path = `products/${productId}/variants`;
  try {
    const colRef = collection(db, "products", productId, "variants");
    // Check twice or thrice if result is zero to ensure variants aren't missed during sync
    const snapshot = await queryCollectionWithZeroVerification(path, colRef, 3);
    if (!snapshot || snapshot.empty || !snapshot.docs) return [];
    return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as ProductVariant));
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
    const sanitizedProduct = await sanitizeProductForFirestore(product);
    const cleanedProduct = cleanUndefined(sanitizedProduct);
    // 1. Save main product document
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, cleanedProduct, { merge: true });

    // 2. Fetch existing variants to remove deleted ones
    const variantsSnapshot = await getDocs(collection(db, "products", product.id, "variants"));
    const newVariantIds = new Set(variants.map(v => v.id));
    const batch = writeBatch(db);

    variantsSnapshot.forEach(docSnap => {
      if (!newVariantIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // 3. Save new/updated variants
    for (const variant of variants) {
      const cleanedVariant = cleanUndefined({
        ...variant,
        productId: product.id
      });
      const variantRef = doc(db, "products", product.id, "variants", variant.id);
      batch.set(variantRef, cleanedVariant, { merge: true });
    }
    await batch.commit();

    // Invalidate products cache so fresh data is loaded
    invalidateProductsCache();
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

    // Invalidate products cache so fresh data is loaded
    invalidateProductsCache();
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

/**
 * Creates a URL-safe slug from product name, inscription, or identifier.
 */
export function getProductSlug(product: Product): string {
  if (product.productId) {
    return product.productId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  const raw = product.name || product.sku || product.id;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Looks up a product by ID, SKU, product code (e.g. SYM-01), or slug.
 */
export async function fetchProductBySlugOrId(identifier: string): Promise<Product | null> {
  const clean = decodeURIComponent(identifier).trim().toLowerCase();
  const all = await fetchProducts();
  const live = all.filter(isProductLive);

  // Exact ID / ProductId / SKU match
  const found = live.find(p => 
    p.id.toLowerCase() === clean ||
    (p.productId && p.productId.toLowerCase() === clean) ||
    (p.sku && p.sku.toLowerCase() === clean) ||
    getProductSlug(p) === clean
  );

  return found || null;
}
