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
    
    // Asynchronously delete any legacy non-medium category docs in Firestore
    for (const d of snapshot.docs) {
      const docId = d.id.toLowerCase();
      const isCanonicalMedium = CANONICAL_CATEGORIES.some(c => c.id === docId);
      if (!isCanonicalMedium) {
        deleteDoc(doc(db, path, d.id)).catch(() => {});
      }
    }

    // Unconditionally ensure canonical medium categories exist in Firestore
    for (const cat of CANONICAL_CATEGORIES) {
      setDoc(doc(db, path, cat.id), cat).catch(() => {});
    }

    return CANONICAL_CATEGORIES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return CANONICAL_CATEGORIES;
  }
}

export const STUDIO_FALLBACK_IMAGE = "/images/store_hero_editorial_1788008309317.jpg";

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

  // Medium (Category) normalization
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

export const CANONICAL_SEED_OBJECTS: Product[] = [
  {
    id: "sym-obj-01",
    productId: "SYM-01",
    sku: "SYM-TSH-001",
    name: "THE ALIF HEAVYWEIGHT TEE",
    inscription: "أَلِف",
    symbolicTagline: "STEADFAST MORAL INTEGRITY.",
    statement: "WE DO NOT TURN OUR WEARERS INTO UNPAID BILLBOARDS.",
    wearingCommunicates: "STANDING UPRIGHT UPON UNCOMPROMISED PRINCIPLES.",
    statementMeaning: "THE UPRIGHT STROKE OF ALIF REPRESENTS DIVINE ONENESS AND UNFLINCHING MORAL HONESTY IN THE PUBLIC ARENA.",
    description: "Cut from heavyweight 280 GSM combed organic cotton with a relaxed boxy drape. All maker marks are placed inside the collar—the exterior remains clean and sovereign.",
    categoryId: "wear",
    collectionName: "Be Symbolic",
    price: 2950,
    inventory: 42,
    availability: true,
    edition: "050 ARTEFACTS // FIRST EDITION",
    material: "100% COMBED ORGANIC RING-SPUN COTTON (280 GSM)",
    fit: "BOXY RELAXED ARCHITECTURAL CUT",
    color: "Washed Raw Ecru",
    images: [
      "/images/store_hero_editorial_1788008309317.jpg",
      "/images/store_hero_editorial_1788008309317.jpg"
    ]
  },
  {
    id: "sym-obj-02",
    productId: "SYM-02",
    sku: "SYM-HOD-002",
    name: "SUMUD FIELD HOODIE",
    inscription: "صُمُود",
    symbolicTagline: "STEADFASTNESS, MATERIALIZED.",
    statement: "UNYIELDING SOLIDARITY WITH FALASTEEN.",
    wearingCommunicates: "ENDURING RESILIENCE AND AN ANCHORED SPIRIT.",
    statementMeaning: "SUMUD: THE DISCIPLINE OF REMAINING FIRM ON ONE'S ANCESTRAL SOIL AND ROOTED CONVICTION REGARDLESS OF OPPRESSION.",
    description: "A 450 GSM French Terry thermal armor piece. Engineered with double-layered hood construction, concealed thumb-cuffs, and tonal embroidery of the olive root.",
    categoryId: "wear",
    collectionName: "Be Palestine",
    price: 5800,
    inventory: 36,
    availability: true,
    edition: "050 ARTEFACTS // FALASTEEN COLLECTION",
    material: "450 GSM ARCHIVAL FRENCH TERRY",
    fit: "SUBSTANTIAL BOXY THERMAL DRAPE",
    color: "Midnight Carbon / Olive Stitch",
    images: [
      "/images/store_hero_editorial_1788008309317.jpg",
      "/images/store_hero_editorial_1788008309317.jpg"
    ]
  },
  {
    id: "sym-obj-03",
    productId: "SYM-03",
    sku: "SYM-MUG-001",
    name: "THE STUDENT OF ADAB VESSEL",
    inscription: "أَدَب",
    symbolicTagline: "REVERENCE IN THE PURSUIT OF TRUTH.",
    statement: "A TACTILE RITUAL FOR THE SCHOLAR & SEEKER.",
    wearingCommunicates: "CONSCIENTIOUS MANNERS PRECEDING ACCUMULATED KNOWLEDGE.",
    statementMeaning: "ADAB: THE SPIRITUAL ETIQUETTE AND REFINED RESTRAINT THAT ELEVATES MERE INTELLECT INTO TRANSMITTED WISDOM.",
    description: "High-fired artisan stoneware with a textured mineral rim and debossed tactile thumb-rest. Engineered for deliberate, unhurried contemplation.",
    categoryId: "vessels",
    collectionName: "Be Symbolic",
    price: 1850,
    inventory: 58,
    availability: true,
    edition: "100 ARTEFACTS // ARTISAN STONEWARE",
    material: "HIGH-FIRED ARTISAN CERAMIC // SATIN MATTE",
    capacity: "350ML // WEIGHT: 380G",
    color: "Matte Desert Sand",
    images: [
      "/images/mug_seek_wisdom_1788008333595.jpg",
      "/images/mug_be_symbolic_1788008321905.jpg",
      "/images/mug_find_clarity_1788008345150.jpg"
    ]
  },
  {
    id: "sym-obj-04",
    productId: "SYM-04",
    sku: "SYM-CAP-001",
    name: "BE PALESTINE OLIVE & STONE CAP",
    inscription: "صُمُود",
    symbolicTagline: "ROOTED FOCUS. GAZE-RESTRAINED DIGNITY.",
    statement: "A LOW-PROFILE CROWN OF DISCIPLINES.",
    wearingCommunicates: "STEADFAST ALLIANCE WITH ENDURING ROOTS.",
    statementMeaning: "AN UNASSUMING SILHOUETTE DESIGNED TO SHIELD THE GAZE AND DIRECT THOUGHT TOWARD ESSENTIAL PURPOSES.",
    description: "Constructed from washed cotton chino twill with a weathered patina and antique solid brass hardware. Minimal tonal olive crest debossed beneath brim.",
    categoryId: "headwear",
    collectionName: "Be Palestine",
    price: 2200,
    inventory: 30,
    availability: true,
    edition: "050 ARTEFACTS // RUN 01",
    material: "100% WASHED COTTON TWILL // BRASS FASTENER",
    fit: "UNSTRUCTURED 6-PANEL LOW PROFILE",
    color: "Olive & Earth",
    images: [
      "/images/store_hero_editorial_1788008309317.jpg",
      "/images/store_hero_editorial_1788008309317.jpg"
    ]
  },
  {
    id: "sym-obj-05",
    productId: "SYM-05",
    sku: "SYM-MUG-002",
    name: "FIND CLARITY STONEWARE VESSEL",
    inscription: "بَصِيرَة",
    symbolicTagline: "DISTINGUISHING ESSENCE FROM NOISE.",
    statement: "GROUNDED DAWN CONTEMPLATION.",
    wearingCommunicates: "INNER PERCEPTION OVER SUPERFICIAL APPEARANCE.",
    statementMeaning: "BASIRAH: THE INNER LIGHT OF INTELLECT THAT PIERCES ILLUSION TO APPREHEND REALITY AS IT TRULY IS.",
    description: "Durable stoneware with a deep reactive glaze and sand-blasted base. Retains thermal equilibrium for extended early-morning study sessions.",
    categoryId: "vessels",
    collectionName: "Be Symbolic",
    price: 1850,
    inventory: 45,
    availability: true,
    edition: "075 ARTEFACTS // SERIES 02",
    material: "DENSE GLAZED EARTHENWARE",
    capacity: "340ML // WEIGHT: 390G",
    color: "Smoked Basalt & Bone",
    images: [
      "/images/mug_find_clarity_1788008345150.jpg",
      "/images/mug_seek_wisdom_1788008333595.jpg",
      "/images/mug_be_symbolic_1788008321905.jpg"
    ]
  },
  {
    id: "sym-obj-06",
    productId: "SYM-06",
    sku: "SYM-BAG-001",
    name: "THE STEWARD UTILITY FIELD TOTE",
    inscription: "أَمَانَة",
    symbolicTagline: "FAITHFUL CUSTODY OF WHAT WE BEAR.",
    statement: "BUILT FOR SCRIPTURE, FIELD NOTES & APPARATUS.",
    wearingCommunicates: "ACTIVE RESPONSIBILITY AND MEASURED INTENT.",
    statementMeaning: "AMANAH: THE SACRED TRUST ENTRUSTED TO HUMAN BEINGS TO ACT AS STEWARDS RATHER THAN EXPLOITERS OF CREATION.",
    description: "Crafted from indestructible 18 oz unbleached cotton duck canvas with reinforced box-x bar tacking, copper rivets, and a designated interior folio sleeve.",
    categoryId: "carry",
    collectionName: "Be Symbolic",
    price: 3400,
    inventory: 28,
    availability: true,
    edition: "040 ARTEFACTS // FIRST EDITION",
    material: "18 OZ WATER-REPELLENT DUCK CANVAS",
    dimensions: "42CM X 38CM X 14CM",
    color: "Natural Unbleached Bone / Carbon",
    images: [
      "/images/store_hero_editorial_1788008309317.jpg",
      "/images/store_hero_editorial_1788008309317.jpg"
    ]
  }
];

export async function fetchProducts(): Promise<Product[]> {
  const path = "products";
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) {
      // Seed canonical products into Firestore asynchronously and return them
      for (const obj of CANONICAL_SEED_OBJECTS) {
        setDoc(doc(db, path, obj.id), cleanUndefined(obj)).catch(() => {});
      }
      return CANONICAL_SEED_OBJECTS;
    }

    const rawProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    
    return rawProducts.map(p => {
      const { product, changed } = sanitizeProduct(p);
      if (changed) {
        const cleaned = cleanUndefined(product);
        setDoc(doc(db, path, product.id), cleaned, { merge: true }).catch(() => {});
      }
      return product;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return CANONICAL_SEED_OBJECTS;
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
