/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category, CategoryTaxonomy, ProductVariant } from "../types";
import { fetchArtifactsWithSpecimens } from "./artifactService";

export const CANONICAL_CATEGORIES = [
  { id: "wear", name: "Wear", label: "WEAR" as CategoryTaxonomy, description: "Daily armor of modesty and dignified public posture", order: 1 },
  { id: "carry", name: "Carry", label: "CARRY" as CategoryTaxonomy, description: "Instruments of transit and stewardship", order: 2 },
  { id: "headwear", name: "Headwear", label: "HEADWEAR" as CategoryTaxonomy, description: "Crown of focus and gaze-restraint", order: 3 },
  { id: "vessels", name: "Vessels", label: "VESSELS" as CategoryTaxonomy, description: "Rituals of sustenance and contemplation", order: 4 }
];

export const CANONICAL_COLLECTIONS = [
  { id: "be-symbolic", name: "Be Symbolic", label: "BE SYMBOLIC", order: 1 },
  { id: "be-palestine", name: "Be Palestine", label: "BE PALESTINE", order: 2 }
];

export const STUDIO_FALLBACK_IMAGE = "/Logo_NoName.jpg";

export async function fetchCategories(): Promise<Category[]> {
  return CANONICAL_CATEGORIES;
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const artifactsWithSpecs = await fetchArtifactsWithSpecimens();
    const products: Product[] = [];
    
    artifactsWithSpecs.forEach(art => {
      if (art.specimens && art.specimens.length > 0) {
        art.specimens.forEach(spec => {
          products.push({
            id: spec.id,
            productId: spec.sku,
            name: `${art.name} — ${spec.medium}`,
            description: art.description,
            price: spec.price,
            categoryId: spec.mediumCategory || "wear",
            category: spec.mediumCategory || "wear",
            sku: spec.sku,
            images: spec.images?.length > 0 ? spec.images : art.images,
            thumbnailImage: spec.thumbnailImage || art.thumbnailImage || art.graphic,
            parentArtifactId: art.artifactId,
            graphic: art.graphic,
            material: spec.material,
            weight: spec.weight,
            fit: spec.fit,
            printMethod: spec.printMethod,
            edition: spec.edition,
            color: spec.color,
            colorHex: spec.colorHex,
            capacity: spec.capacity,
            dimensions: spec.dimensions,
            careInstructions: spec.careInstructions,
            finish: spec.finish,
            inscription: art.inscription,
            pillar1Represents: art.pillar1Represents,
            pillar2WhyChosen: art.pillar2WhyChosen,
            pillar3Communicates: art.pillar3Communicates,
            pillar4WearerCarries: art.pillar4WearerCarries,
            statement: art.pillar4WearerCarries,
            representation: art.pillar2WhyChosen,
            wearingCommunicates: art.pillar3Communicates,
            statementMeaning: art.pillar1Represents,
            medium: spec.medium,
            artifactClassification: (spec.mediumCategory || "wear").toUpperCase(),
            artifactTags: art.tags,
            inventory: spec.inventory,
            availability: spec.availability,
            status: spec.status,
            collectionName: art.collectionName,
            symbolicTagline: art.symbolicTagline
          });
        });
      } else {
        products.push({
          id: art.id,
          productId: art.artifactId,
          name: art.name,
          description: art.description,
          price: art.setPriceOverride || 4200,
          categoryId: "wear",
          category: "wear",
          sku: art.artifactId,
          images: art.images,
          thumbnailImage: art.thumbnailImage || art.graphic,
          parentArtifactId: art.artifactId,
          graphic: art.graphic,
          inscription: art.inscription,
          pillar1Represents: art.pillar1Represents,
          pillar2WhyChosen: art.pillar2WhyChosen,
          pillar3Communicates: art.pillar3Communicates,
          pillar4WearerCarries: art.pillar4WearerCarries,
          statement: art.pillar4WearerCarries,
          representation: art.pillar2WhyChosen,
          wearingCommunicates: art.pillar3Communicates,
          statementMeaning: art.pillar1Represents,
          medium: "Artifact",
          artifactClassification: "WEAR",
          artifactTags: art.tags,
          inventory: 10,
          availability: true,
          status: art.status,
          collectionName: art.collectionName,
          symbolicTagline: art.symbolicTagline
        });
      }
    });

    return products;
  } catch (err) {
    console.warn("Failed to fetch products, returning cache:", err);
    return getCachedProducts();
  }
}

export function getCachedProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("sym_products_cache");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function normalizeProductCategory(catOrProd?: any): string {
  if (!catOrProd) return "wear";
  const cat = typeof catOrProd === "string" ? catOrProd : (catOrProd.category || catOrProd.categoryId || "wear");
  const lower = String(cat).toLowerCase();
  if (lower.includes("carry")) return "carry";
  if (lower.includes("head")) return "headwear";
  if (lower.includes("vessel")) return "vessels";
  return "wear";
}

export function normalizeProductCollection(colOrProd?: any): string {
  if (!colOrProd) return "be-symbolic";
  const col = typeof colOrProd === "string" ? colOrProd : (colOrProd.collectionName || colOrProd.category || "be-symbolic");
  const lower = String(col).toLowerCase();
  if (lower.includes("palestine") || lower.includes("falasteen")) return "be-palestine";
  return "be-symbolic";
}

export function isProductLive(prod: Product): boolean {
  if (prod.status === "archived") return false;
  return prod.availability !== false;
}

export function isProductDraftOrHidden(prod: Product | string): boolean {
  if (typeof prod === "string") return false;
  return prod.status === "draft" || prod.availability === false;
}

export async function fetchProductBySlugOrId(idOrSlug: string): Promise<Product | null> {
  const prods = await fetchProducts();
  return prods.find(p => p.id === idOrSlug || p.productId === idOrSlug || p.sku === idOrSlug) || null;
}

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  return [];
}

export async function saveProductWithVariants(product: Product, variants: ProductVariant[]): Promise<void> {
  // stub
}

export async function toggleProductAvailability(productId: string, availability: boolean): Promise<void> {
  // stub
}

export async function deleteProductAndVariants(productId: string): Promise<void> {
  // stub
}

export function resolveProductImages(prodOrImages?: any): string[] {
  if (!prodOrImages) return [STUDIO_FALLBACK_IMAGE];
  if (typeof prodOrImages === "string") return [prodOrImages];
  if (Array.isArray(prodOrImages)) return prodOrImages.length > 0 ? prodOrImages : [STUDIO_FALLBACK_IMAGE];
  if (prodOrImages.images && Array.isArray(prodOrImages.images) && prodOrImages.images.length > 0) return prodOrImages.images;
  if (prodOrImages.thumbnailImage) return [prodOrImages.thumbnailImage];
  if (prodOrImages.graphic) return [prodOrImages.graphic];
  return [STUDIO_FALLBACK_IMAGE];
}
