/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Product Service & Catalog Interface
 * Bridges the Artifact & Specimen architecture with the storefront Product presentation models.
 */

import { Product, ProductVariant, Category } from "../types";
import { 
  fetchArtifacts, 
  fetchSpecimens, 
  getCachedArtifacts, 
  getCachedSpecimens, 
  convertArtifactsAndSpecimensToProducts,
  deleteArtifact,
  deleteSpecimen,
  saveArtifact,
  saveSpecimen,
  CANONICAL_SPECIMEN_MEDIUMS
} from "./artifactService";
import { 
  isFirestoreQuotaExceeded, 
  markFirestoreQuotaExceeded, 
  isQuotaError 
} from "./firestoreCircuitBreaker";

export const STUDIO_FALLBACK_IMAGE = "/Logo_NoName.jpg";

export const CANONICAL_CATEGORIES: Category[] = [
  { id: "wear", name: "Wear", label: "WEAR", order: 1, description: "Dense 400+ GSM Boxy drop-shoulder armor & heavyweight pullovers." },
  { id: "headwear", name: "Headwear", label: "HEADWEAR", order: 2, description: "Structured 6-panel brushed twill crowns with brass clasps." },
  { id: "vessels", name: "Vessels", label: "VESSELS", order: 3, description: "Dense 1,280°C high-fired artisan stoneware ceramics." },
  { id: "statements", name: "Statements", label: "STATEMENTS", order: 4, description: "Ideological witness textiles and archival statement objects." },
  { id: "objects", name: "Objects", label: "OBJECTS", order: 5, description: "Archival symbolic possessions, field carries & physical specimens." }
];

export const CANONICAL_COLLECTIONS: { id: string; label: string }[] = [
  { id: "be-palestine", label: "BE PALESTINE" },
  { id: "be-symbolic", label: "BE SYMBOLIC" },
  { id: "series-01", label: "SERIES 01" }
];

export const PRODUCTS_CACHE_KEY = "sym_products_cache_v1";

/**
 * Normalizes product category taxonomy
 */
export function normalizeProductCategory(product: Partial<Product> | null | undefined): string {
  if (!product) return "OBJECTS";
  if (product.category) return product.category;
  if (product.medium) return product.medium;
  if (product.categoryId) {
    const found = CANONICAL_CATEGORIES.find(c => c.id.toLowerCase() === product.categoryId?.toLowerCase());
    if (found) return found.name || found.label;
    return product.categoryId;
  }
  return "OBJECTS";
}

/**
 * Normalizes collection name
 */
export function normalizeProductCollection(product: Partial<Product> | null | undefined): string {
  if (!product) return "SYMBOLIC";
  if (product.collectionName) return product.collectionName;
  return "SYMBOLIC";
}

/**
 * Resolves all product image assets with fallback safety
 */
export function resolveProductImages(product: Partial<Product> | null | undefined): string[] {
  if (!product) return [STUDIO_FALLBACK_IMAGE];
  const list: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    list.push(...product.images.filter(Boolean));
  }
  if (product.thumbnailImage && !list.includes(product.thumbnailImage)) {
    list.unshift(product.thumbnailImage);
  }
  if (product.graphic && !list.includes(product.graphic)) {
    list.push(product.graphic);
  }
  return list.length > 0 ? list : [STUDIO_FALLBACK_IMAGE];
}

/**
 * Checks if product is publicly available
 */
export function isProductLive(product: Partial<Product> | null | undefined): boolean {
  if (!product) return false;
  if (product.availability === false) return false;
  if (product.status === "draft" || product.status === "archived") return false;
  return true;
}

/**
 * Checks if product is hidden/draft
 */
export function isProductDraftOrHidden(product: Partial<Product> | null | undefined): boolean {
  return !isProductLive(product);
}

/**
 * Retrieves cached products synchronously from localStorage and artifact models
 */
export function getCachedProducts(): Product[] {
  const artifacts = getCachedArtifacts();
  const specimens = getCachedSpecimens();
  if (artifacts.length > 0 || specimens.length > 0) {
    return convertArtifactsAndSpecimensToProducts(artifacts, specimens);
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

/**
 * Fetch all products from Artifact & Specimen engine
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const [artifacts, specimens] = await Promise.all([
      fetchArtifacts(),
      fetchSpecimens()
    ]);
    const products = convertArtifactsAndSpecimensToProducts(artifacts, specimens);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
      } catch {}
    }
    return products;
  } catch (err) {
    console.warn("Could not fetch products live, using cached products:", err);
    return getCachedProducts();
  }
}

/**
 * Fetch taxonomy categories
 */
export async function fetchCategories(): Promise<Category[]> {
  return CANONICAL_CATEGORIES;
}

/**
 * Fetch single product by id, slug, or sku
 */
export async function fetchProductBySlugOrId(idOrSlug: string): Promise<Product | null> {
  const cached = getCachedProducts();
  const lower = idOrSlug.toLowerCase();
  const match = cached.find(p => 
    p.id.toLowerCase() === lower || 
    p.productId?.toLowerCase() === lower || 
    p.sku?.toLowerCase() === lower
  );
  if (match) return match;

  const refreshed = await fetchProducts();
  return refreshed.find(p => 
    p.id.toLowerCase() === lower || 
    p.productId?.toLowerCase() === lower || 
    p.sku?.toLowerCase() === lower
  ) || null;
}

/**
 * Fetch variants for a product
 */
export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const cached = getCachedProducts();
  const product = cached.find(p => p.id === productId);
  if (!product) return [];

  // Generate variants from available sizes & colors
  const variants: ProductVariant[] = [];
  const sizes = product.availableSizes && product.availableSizes.length > 0 ? product.availableSizes : ["One Size"];
  const colors = product.availableColors && product.availableColors.length > 0 ? product.availableColors : [{ id: "standard", name: product.color || "Standard", hex: product.colorHex || "#1C1C1C" }];

  for (const c of colors) {
    for (const s of sizes) {
      variants.push({
        id: `var_${productId}_${c.id}_${s.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        productId,
        sku: `${product.sku || product.id}-${c.name.slice(0, 3).toUpperCase()}-${s}`,
        price: product.price,
        inventoryQuantity: product.inventory ?? 20,
        inStock: (product.inventory ?? 20) > 0,
        color: c.name,
        colorHex: c.hex,
        size: s
      });
    }
  }

  return variants;
}

/**
 * Save product with variants (Owner action)
 */
export async function saveProductWithVariants(
  productData: Partial<Product>,
  variantsData?: Partial<ProductVariant>[]
): Promise<Product> {
  const isSpecimen = Boolean(productData.parentArtifactId);

  if (isSpecimen && productData.parentArtifactId) {
    const savedSpecimen = await saveSpecimen({
      id: productData.id || `spec_${Date.now()}`,
      parentArtifactId: productData.parentArtifactId,
      medium: productData.medium || "T-Shirt",
      mediumCategory: (productData.category?.toLowerCase() as any) || "wear",
      sku: productData.sku || `SPEC-${Date.now()}`,
      price: productData.price || 4200,
      inventory: productData.inventory || 20,
      availability: productData.availability !== false,
      status: productData.availability === false ? "sold_out" : "available",
      images: productData.images || [],
      thumbnailImage: productData.thumbnailImage,
      color: productData.color,
      colorHex: productData.colorHex,
      availableSizes: productData.availableSizes,
      availableColors: productData.availableColors,
      material: productData.material,
      weight: productData.weight,
      garmentType: productData.fit || productData.garmentTypes?.[0]?.name,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const refreshed = await fetchProducts();
    const result = refreshed.find(p => p.id === savedSpecimen.id);
    return result || (productData as Product);
  }

  const savedArtifact = await saveArtifact({
    id: productData.id || `art_${Date.now()}`,
    artifactId: productData.productId || `SYM-${Date.now()}`,
    name: productData.name || "UNNAMED ARTIFACT",
    shortDescription: productData.description || "",
    description: productData.description || "",
    graphic: productData.graphic || productData.images?.[0] || STUDIO_FALLBACK_IMAGE,
    images: productData.images || [],
    thumbnailImage: productData.thumbnailImage,
    inscription: productData.inscription,
    pillar1Represents: productData.pillar1Represents,
    pillar2WhyChosen: productData.pillar2WhyChosen,
    pillar3Communicates: productData.pillar3Communicates,
    pillar4WearerCarries: productData.pillar4WearerCarries,
    collectionName: productData.collectionName || "Be Symbolic",
    tags: productData.artifactTags || [],
    status: (productData.status as any) || "published",
    specimenIds: productData.specimenIds || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const refreshed = await fetchProducts();
  const result = refreshed.find(p => p.id === savedArtifact.id);
  return result || (productData as Product);
}

/**
 * Delete product and its variants
 */
export async function deleteProductAndVariants(productId: string): Promise<void> {
  const cached = getCachedProducts();
  const product = cached.find(p => p.id === productId);

  if (product?.parentArtifactId) {
    await deleteSpecimen(productId);
  } else {
    await deleteArtifact(productId);
  }
}

/**
 * Toggle product availability status
 */
export async function toggleProductAvailability(productId: string, availability: boolean): Promise<void> {
  const cached = getCachedProducts();
  const product = cached.find(p => p.id === productId);
  if (!product) return;

  if (product.parentArtifactId) {
    const allSpecs = getCachedSpecimens();
    const spec = allSpecs.find(s => s.id === productId);
    if (spec) {
      await saveSpecimen({ ...spec, availability, status: availability ? "available" : "sold_out" });
    }
  } else {
    const allArts = getCachedArtifacts();
    const art = allArts.find(a => a.id === productId);
    if (art) {
      await saveArtifact({ ...art, status: availability ? "published" : "draft" });
    }
  }
}
