/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Artifact & Specimen Architecture Service
 * 
 * CORE SYSTEM ARCHITECTURE:
 * - Artifact: The design, intellectual work, and symbolic concept (e.g. SUMUD).
 * - Specimen: The physical manifestation in a medium (e.g. SUMUD T-Shirt, SUMUD P-Cap).
 * - Artifact Set: The complete bundled collection of specimens for an artifact.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  Artifact, 
  Specimen, 
  ArtifactWithSpecimens, 
  SpecimenMediumConfig, 
  Product,
  ArtifactStatus,
  SpecimenStatus
} from "../types";
import { sanitizeArtifactForFirestore, sanitizeSpecimenForFirestore } from "./imageOptimization";
import { PRESET_SYMBOL_KNOWLEDGE } from "./symbolKnowledge";
import { 
  isFirestoreQuotaExceeded, 
  markFirestoreQuotaExceeded, 
  isQuotaError 
} from "./firestoreCircuitBreaker";
// Fallback assets
const heroImage = "/Logo_NoName.jpg";

export const ARTIFACTS_CACHE_KEY = "symbolic_artifacts_v1";
export const SPECIMENS_CACHE_KEY = "symbolic_specimens_v1";

let lastArtifactsFetchTime = 0;
let lastSpecimensFetchTime = 0;
const ARTIFACTS_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL in-memory cache

// Configurable & extensible specimen mediums
export const CANONICAL_SPECIMEN_MEDIUMS: SpecimenMediumConfig[] = [
  {
    id: "t-shirt",
    name: "T-Shirt",
    category: "wear",
    description: "Heavyweight Boxy Drop-Shoulder combed jersey armor.",
    defaultGarmentTypes: ["Drop Shoulder", "Oversized Fit", "Regular Boxy Cut"],
    defaultSizes: ["S", "M", "L", "XL", "2XL"],
    defaultPrice: 4200
  },
  {
    id: "hoodie",
    name: "Hoodie",
    category: "wear",
    description: "Dense 450 GSM double-faced French Terry pullover with crossover hood.",
    defaultGarmentTypes: ["Heavyweight 450 GSM", "Double-Faced Fleece"],
    defaultSizes: ["S", "M", "L", "XL"],
    defaultPrice: 7500
  },
  {
    id: "full-sleeve",
    name: "Full Sleeve",
    category: "wear",
    description: "320 GSM interlock thermal long-sleeve with rib-knit cuffs.",
    defaultGarmentTypes: ["Boxy Ribbed Cuff", "Relaxed Crewneck"],
    defaultSizes: ["S", "M", "L", "XL"],
    defaultPrice: 5000
  },
  {
    id: "p-cap",
    name: "P-Cap",
    category: "headwear",
    description: "Structured 6-panel brushed cotton twill with tonal embroidery & brass clasp.",
    defaultGarmentTypes: ["Structured 6-Panel", "Unstructured Low-Profile"],
    defaultSizes: ["One Size // Adjustable Brass Clasp"],
    defaultPrice: 2500
  },
  {
    id: "mug",
    name: "Mug",
    category: "vessels",
    description: "380ml dense high-fired artisan stoneware with debossed insignia.",
    defaultGarmentTypes: ["Dense Artisan Stoneware", "Matte Ceramic Studio Cup"],
    defaultSizes: ["380ml / 13oz"],
    defaultPrice: 1800
  },
  {
    id: "tote-bag",
    name: "Tote Bag",
    category: "carry",
    description: "18 oz heavy industrial cotton canvas utility field carrier.",
    defaultGarmentTypes: ["18oz Heavy Cotton Canvas", "Structured Field Carrier"],
    defaultSizes: ["Standard Utility // 42cm x 38cm"],
    defaultPrice: 3200
  }
];

export function getMediumConfig(mediumName: string): SpecimenMediumConfig {
  const normalized = (mediumName || "").toLowerCase().trim().replace(/\s+/g, "-");
  const found = CANONICAL_SPECIMEN_MEDIUMS.find(m => 
    m.id === normalized || 
    m.name.toLowerCase() === (mediumName || "").toLowerCase() ||
    (mediumName || "").toLowerCase().includes(m.name.toLowerCase())
  );
  if (found) return found;

  return {
    id: normalized || "custom-medium",
    name: mediumName || "Custom Medium",
    category: "wear",
    defaultSizes: ["One Size"],
    defaultPrice: 2000
  };
}

export interface ArchitectureSpecItem {
  label: string;
  value: string;
}

/**
 * Returns authentic, medium-specific physical architecture specifications
 * for any given specimen (wear, headwear, vessels, carry, etc.).
 */
export function getSpecimenArchitectureSpecs(spec?: Specimen | null): ArchitectureSpecItem[] {
  if (!spec) {
    return [
      { label: "MATERIAL:", value: "400 GSM Combed Organic Cotton" },
      { label: "WEIGHT / GAUGE:", value: "400 GSM" },
      { label: "EDITION / BATCH:", value: "050 SPECIMENS" },
      { label: "FINISH & COLOR:", value: "Charcoal Black" }
    ];
  }

  const mediumLower = (spec.medium || "").toLowerCase();
  const catLower = (spec.mediumCategory || "").toLowerCase();

  // 1. Vessels / Ceramic Stoneware Mugs
  if (catLower === "vessels" || mediumLower.includes("mug") || mediumLower.includes("vessel") || mediumLower.includes("ceramic") || mediumLower.includes("cup")) {
    const materialVal = spec.material || "1,280°C High-Fired Dense Stoneware Clay";
    const capacityVal = spec.capacity 
      ? `${spec.capacity}${spec.weight ? ` // ${spec.weight}` : " (420g Heavy Base)"}`
      : (spec.weight ? `${spec.weight} // 380ml (13oz)` : "380ml / 13oz (420g)");
    const editionVal = spec.edition || "050 SPECIMENS";
    const finishVal = spec.finish || (spec.color ? `${spec.color} Mineral Glaze` : "Matte Basalt Mineral Glaze");

    return [
      { label: "MATERIAL:", value: materialVal },
      { label: "CAPACITY / WEIGHT:", value: capacityVal },
      { label: "EDITION / BATCH:", value: editionVal },
      { label: "GLAZE & FINISH:", value: finishVal }
    ];
  }

  // 2. Headwear / P-Caps / Structured Caps
  if (catLower === "headwear" || mediumLower.includes("cap") || mediumLower.includes("hat") || mediumLower.includes("beanie")) {
    const materialVal = spec.material || "100% Heavy Brushed Cotton Twill";
    const weightVal = spec.weight || "280 GSM Structured 6-Panel Crown";
    const editionVal = spec.edition || "050 SPECIMENS";
    const finishVal = spec.color 
      ? `${spec.color} // Brass Tension Clasp` 
      : "Washed Twill // Matte Brass Clasp";

    return [
      { label: "MATERIAL:", value: materialVal },
      { label: "WEIGHT & STRUCTURE:", value: weightVal },
      { label: "EDITION / BATCH:", value: editionVal },
      { label: "FINISH & CLOSURE:", value: finishVal }
    ];
  }

  // 3. Hoodie / Heavyweight Pullover
  if (mediumLower.includes("hoodie") || mediumLower.includes("sweater") || mediumLower.includes("pullover") || mediumLower.includes("jacket") || mediumLower.includes("fleece")) {
    const materialVal = spec.material || "450 GSM Double-Faced French Terry";
    const weightVal = spec.weight || "450 GSM Heavyweight Fleece";
    const editionVal = spec.edition || "050 SPECIMENS";
    const colorVal = spec.color || "Washed Carbon Black";

    return [
      { label: "MATERIAL:", value: materialVal },
      { label: "WEIGHT / GAUGE:", value: weightVal },
      { label: "EDITION / BATCH:", value: editionVal },
      { label: "FINISH & COLOR:", value: colorVal }
    ];
  }

  // 4. Full Sleeve / Interlock Long Sleeve
  if (mediumLower.includes("sleeve") || mediumLower.includes("thermal") || mediumLower.includes("long sleeve") || mediumLower.includes("full-sleeve")) {
    const materialVal = spec.material || "320 GSM Combed Interlock Cotton";
    const weightVal = spec.weight || "320 GSM Interlock Thermal";
    const editionVal = spec.edition || "050 SPECIMENS";
    const colorVal = spec.color || "Raw Natural Ecru";

    return [
      { label: "MATERIAL:", value: materialVal },
      { label: "WEIGHT / GAUGE:", value: weightVal },
      { label: "EDITION / BATCH:", value: editionVal },
      { label: "FINISH & COLOR:", value: colorVal }
    ];
  }

  // 5. Carry / Tote Bags / Field Carrier
  if (catLower === "carry" || mediumLower.includes("bag") || mediumLower.includes("tote") || mediumLower.includes("carrier")) {
    const materialVal = spec.material || "18oz Heavy Industrial Cotton Canvas";
    const weightVal = spec.weight || "18oz (510 GSM) Reinforced Weave";
    const editionVal = spec.edition || "050 SPECIMENS";
    const finishVal = spec.dimensions 
      ? `${spec.color || "Natural Canvas"} // ${spec.dimensions}` 
      : (spec.color || "Natural Canvas / Raw Black Handles");

    return [
      { label: "MATERIAL:", value: materialVal },
      { label: "DENSITY / WEAVE:", value: weightVal },
      { label: "EDITION / BATCH:", value: editionVal },
      { label: "FINISH & FORMAT:", value: finishVal }
    ];
  }

  // 6. Default / T-Shirt (Drop Shoulder / Heavyweight Wear)
  const materialVal = spec.material || "400 GSM 100% Combed Heavyweight Cotton";
  const weightVal = spec.weight || "400 GSM Archival Jersey";
  const editionVal = spec.edition || "050 SPECIMENS";
  const colorVal = spec.color || "Charcoal Black";

  return [
    { label: "MATERIAL:", value: materialVal },
    { label: "WEIGHT / GAUGE:", value: weightVal },
    { label: "EDITION / BATCH:", value: editionVal },
    { label: "FINISH & COLOR:", value: colorVal }
  ];
}

//// Canonical Pre-curated Flagship Artifacts and Specimens
export const SEED_SPECIMENS: Specimen[] = [];

export const SEED_ARTIFACTS: Artifact[] = [];

// Memory Caches
let memoryArtifacts: Artifact[] | null = null;
let memorySpecimens: Specimen[] | null = null;

export function getCachedArtifacts(): Artifact[] {
  if (memoryArtifacts !== null) return memoryArtifacts;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(ARTIFACTS_CACHE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memoryArtifacts = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return SEED_ARTIFACTS;
}

export function getCachedSpecimens(): Specimen[] {
  if (memorySpecimens !== null) return memorySpecimens;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(SPECIMENS_CACHE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memorySpecimens = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return SEED_SPECIMENS;
}

export function saveArtifactsToCache(artifacts: Artifact[]) {
  memoryArtifacts = Array.isArray(artifacts) ? artifacts : [];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(ARTIFACTS_CACHE_KEY, JSON.stringify(memoryArtifacts));
      localStorage.removeItem("sym_products_cache_v2");
    } catch {}
  }
}

export function saveSpecimensToCache(specimens: Specimen[]) {
  memorySpecimens = Array.isArray(specimens) ? specimens : [];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(SPECIMENS_CACHE_KEY, JSON.stringify(memorySpecimens));
      localStorage.removeItem("sym_products_cache_v2");
    } catch {}
  }
}

/**
 * Clean undefined values before writing to Firestore
 */
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce((acc: any, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Normalizes an Artifact record
 */
export function normalizeArtifact(rawArt: any): Artifact {
  const art = rawArt && typeof rawArt === "object" ? rawArt : {};
  return {
    id: art.id || `art_${Date.now()}`,
    artifactId: art.artifactId || art.id || "SYM-ART",
    name: art.name || "UNTITLED ARTIFACT",
    shortDescription: art.shortDescription || art.description?.slice(0, 120) || "",
    description: art.description || "",
    concept: art.concept || art.thesis || art.statement || "",
    graphic: art.graphic || art.images?.[0] || heroImage,
    images: Array.isArray(art.images) && art.images.length > 0 ? art.images : [art.graphic || heroImage],
    thumbnailImage: art.thumbnailImage || art.graphic || art.images?.[0] || heroImage,
    inscription: art.inscription || art.symbol || "",
    pillar1Represents: art.pillar1Represents || art.statementMeaning || "",
    pillar2WhyChosen: art.pillar2WhyChosen || art.representation || "",
    pillar3Communicates: art.pillar3Communicates || art.wearingCommunicates || "",
    pillar4WearerCarries: art.pillar4WearerCarries || art.statement || "",
    symbolicTagline: art.symbolicTagline || "",
    collectionName: art.collectionName || "Be Symbolic",
    tags: Array.isArray(art.tags) ? art.tags : [],
    releaseInfo: art.releaseInfo || "",
    internalNotes: art.internalNotes || "",
    status: (art.status as ArtifactStatus) || "published",
    specimenIds: Array.isArray(art.specimenIds) ? art.specimenIds : [],
    setPriceOverride: typeof art.setPriceOverride === "number" ? art.setPriceOverride : null,
    setDiscountPercentage: typeof art.setDiscountPercentage === "number" ? art.setDiscountPercentage : 10,
    completeSetDiscountPercent: typeof art.completeSetDiscountPercent === "number" ? art.completeSetDiscountPercent : (typeof art.setDiscountPercentage === "number" ? art.setDiscountPercentage : 10),
    order: typeof art.order === "number" ? art.order : 999,
    createdAt: art.createdAt || Date.now(),
    updatedAt: art.updatedAt || Date.now()
  };
}

/**
 * Normalizes a Specimen record
 */
export function normalizeSpecimen(rawSpec: any): Specimen {
  const spec = rawSpec && typeof rawSpec === "object" ? rawSpec : {};
  const medConfig = getMediumConfig(spec.medium || "T-Shirt");
  return {
    id: spec.id || `spec_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    parentArtifactId: spec.parentArtifactId || "",
    artifactName: spec.artifactName || "",
    artifactGraphic: spec.artifactGraphic || "",
    artifactInscription: spec.artifactInscription || "",
    medium: spec.medium || medConfig.name,
    mediumCategory: spec.mediumCategory || medConfig.category,
    type: spec.type || spec.garmentType || medConfig.defaultGarmentTypes?.[0] || "Standard",
    garmentType: spec.garmentType || spec.type || medConfig.defaultGarmentTypes?.[0] || "Standard",
    sku: spec.sku || `SYM-${Date.now()}`,
    price: typeof spec.price === "number" ? spec.price : (medConfig.defaultPrice || 2500),
    inventory: typeof spec.inventory === "number" ? spec.inventory : 50,
    availability: spec.availability !== false,
    status: (spec.status as SpecimenStatus) || (spec.inventory <= 0 ? "sold_out" : "available"),
    images: Array.isArray(spec.images) && spec.images.length > 0 ? spec.images : [heroImage],
    thumbnailImage: spec.thumbnailImage || spec.images?.[0] || heroImage,
    color: spec.color || "Standard Finish",
    colorHex: spec.colorHex || "#1C1C1C",
    availableColors: spec.availableColors || [],
    availableSizes: spec.availableSizes || medConfig.defaultSizes || ["S", "M", "L", "XL"],
    material: spec.material || "",
    weight: spec.weight || "",
    fit: spec.fit || "",
    printMethod: spec.printMethod || "",
    edition: spec.edition || "050 SPECIMENS",
    careInstructions: spec.careInstructions || "",
    finish: spec.finish || "",
    dimensions: spec.dimensions || "",
    capacity: spec.capacity || "",
    createdAt: spec.createdAt || Date.now(),
    updatedAt: spec.updatedAt || Date.now()
  };
}

/**
 * Fetch all Artifacts from Firestore, falling back to cache & seeds
 * Employs an in-memory TTL cache (5 min) to prevent redundant Firestore read bursts.
 */
export async function fetchArtifacts(): Promise<Artifact[]> {
  const cached = getCachedArtifacts();
  const now = Date.now();

  // If in-memory cache is valid within TTL, return immediately without network call
  if (cached.length > 0 && now - lastArtifactsFetchTime < ARTIFACTS_TTL_MS) {
    return cached;
  }

  // If circuit breaker tripped, return cached data without attempting Firestore read
  if (isFirestoreQuotaExceeded()) {
    return cached;
  }

  try {
    const snap = await getDocs(collection(db, "artifacts"));
    lastArtifactsFetchTime = now;
    if (!snap.empty && snap.docs.length > 0) {
      const live = snap.docs.map(d => normalizeArtifact({ id: d.id, ...d.data() }));
      live.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      saveArtifactsToCache(live);
      return live;
    } else if (snap.empty) {
      // If collection is empty, retain seed cache
      return cached.length > 0 ? cached : SEED_ARTIFACTS;
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
    }
    console.warn("Could not fetch artifacts from Firestore (using local cache):", err);
  }

  // Fallback to cache or seeds if offline / network error
  return cached;
}

/**
 * Fetch all Specimens from Firestore, falling back to cache & seeds
 * Employs an in-memory TTL cache (5 min) to prevent redundant Firestore read bursts.
 */
export async function fetchSpecimens(parentArtifactId?: string): Promise<Specimen[]> {
  const allCached = getCachedSpecimens();
  const now = Date.now();

  if (allCached.length > 0 && !parentArtifactId && now - lastSpecimensFetchTime < ARTIFACTS_TTL_MS) {
    return allCached;
  }

  if (isFirestoreQuotaExceeded()) {
    if (parentArtifactId) {
      return allCached.filter(s => s.parentArtifactId === parentArtifactId);
    }
    return allCached;
  }

  try {
    let snap;
    if (parentArtifactId) {
      const q = query(collection(db, "specimens"), where("parentArtifactId", "==", parentArtifactId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, "specimens"));
      lastSpecimensFetchTime = now;
    }

    if (!snap.empty && snap.docs.length > 0) {
      const live = snap.docs.map(d => normalizeSpecimen({ id: d.id, ...d.data() }));
      if (!parentArtifactId) {
        saveSpecimensToCache(live);
      }
      return live;
    } else if (snap.empty) {
      return allCached.length > 0 ? (parentArtifactId ? allCached.filter(s => s.parentArtifactId === parentArtifactId) : allCached) : (parentArtifactId ? SEED_SPECIMENS.filter(s => s.parentArtifactId === parentArtifactId) : SEED_SPECIMENS);
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
    }
    console.warn("Could not fetch specimens from Firestore (using local cache):", err);
  }

  if (parentArtifactId) {
    return allCached.filter(s => s.parentArtifactId === parentArtifactId);
  }
  return allCached;
}

/**
 * Fetch a single Artifact together with all its child Specimens
 */
export async function fetchArtifactWithSpecimens(artifactId: string): Promise<ArtifactWithSpecimens | null> {
  const artifacts = await fetchArtifacts();
  const allSpecimens = await fetchSpecimens();

  const artifact = artifacts.find(a => a.id === artifactId || a.artifactId === artifactId);
  if (!artifact) return null;

  const childSpecimens = allSpecimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    s.parentArtifactId === artifact.artifactId ||
    artifact.specimenIds?.includes(s.id)
  );

  return {
    ...artifact,
    specimens: childSpecimens
  };
}

/**
 * Save an Artifact to Firestore and update cache
 */
export async function saveArtifact(artifact: Artifact): Promise<Artifact> {
  const normalized = normalizeArtifact({ ...artifact, updatedAt: Date.now() });
  
  // Update in-memory and local storage immediately for responsive UI
  const current = getCachedArtifacts();
  const index = current.findIndex(a => a.id === normalized.id);
  const updated = index >= 0 
    ? [...current.slice(0, index), normalized, ...current.slice(index + 1)]
    : [...current, normalized];
  saveArtifactsToCache(updated);

  // If quota is exceeded, update local cache and skip remote Firestore write
  if (isFirestoreQuotaExceeded()) {
    console.warn("Firestore daily write quota reached. Artifact saved in local browser storage.");
    return normalized;
  }

  try {
    // Sanitize and compress any large Base64 images to prevent Firestore 1MB document limit overflow
    const sanitized = await sanitizeArtifactForFirestore(normalized);
    const cleaned = cleanUndefined(sanitized);
    await setDoc(doc(db, "artifacts", normalized.id), cleaned, { merge: true });
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded();
      console.warn("Firestore daily write quota reached during artifact save. Saved locally.");
    } else {
      console.error("Error saving artifact to Firestore:", err);
    }
  }

  return normalized;
}

/**
 * Delete an Artifact and optionally cascade delete its child Specimens
 */
export async function deleteArtifact(artifactId: string, cascadeDeleteSpecimens = true): Promise<void> {
  try {
    await deleteDoc(doc(db, "artifacts", artifactId));
    if (cascadeDeleteSpecimens) {
      const childSpecimens = await fetchSpecimens(artifactId);
      for (const spec of childSpecimens) {
        await deleteDoc(doc(db, "specimens", spec.id)).catch(() => {});
        await deleteDoc(doc(db, "artifacts", artifactId, "specimens", spec.id)).catch(() => {});
      }
      
      const allSpecs = getCachedSpecimens();
      const matchedSpecs = allSpecs.filter(s => s.parentArtifactId === artifactId);
      for (const spec of matchedSpecs) {
        await deleteDoc(doc(db, "specimens", spec.id)).catch(() => {});
        await deleteDoc(doc(db, "artifacts", artifactId, "specimens", spec.id)).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error deleting artifact from Firestore:", err);
  }

  const currentArts = getCachedArtifacts();
  const updatedArtifacts = currentArts.filter(a => a.id !== artifactId && a.artifactId !== artifactId);
  saveArtifactsToCache(updatedArtifacts);

  if (cascadeDeleteSpecimens) {
    const currentSpecs = getCachedSpecimens();
    const updatedSpecimens = currentSpecs.filter(s => s.parentArtifactId !== artifactId);
    saveSpecimensToCache(updatedSpecimens);
  }
}

/**
 * Save a Specimen to Firestore and link it to its parent Artifact
 */
export async function saveSpecimen(specimen: Specimen): Promise<Specimen> {
  const normalized = normalizeSpecimen({ ...specimen, updatedAt: Date.now() });

  // Update specimen cache immediately for responsive UI
  const currentSpecimens = getCachedSpecimens();
  const specIndex = currentSpecimens.findIndex(s => s.id === normalized.id);
  const updatedSpecimens = specIndex >= 0
    ? [...currentSpecimens.slice(0, specIndex), normalized, ...currentSpecimens.slice(specIndex + 1)]
    : [...currentSpecimens, normalized];
  saveSpecimensToCache(updatedSpecimens);

  if (isFirestoreQuotaExceeded()) {
    console.warn("Firestore daily write quota reached. Specimen saved in local browser storage.");
  } else {
    try {
      const sanitized = await sanitizeSpecimenForFirestore(normalized);
      const cleaned = cleanUndefined(sanitized);

      await setDoc(doc(db, "specimens", normalized.id), cleaned, { merge: true });
      
      // Also save under nested subcollection /artifacts/{artifactId}/specimens/{specimenId}
      if (normalized.parentArtifactId) {
        await setDoc(
          doc(db, "artifacts", normalized.parentArtifactId, "specimens", normalized.id),
          cleaned,
          { merge: true }
        ).catch(() => {});
      }
    } catch (err) {
      if (isQuotaError(err)) {
        markFirestoreQuotaExceeded();
        console.warn("Firestore daily write quota reached during specimen save. Saved locally.");
      } else {
        console.error("Error saving specimen to Firestore:", err);
      }
    }
  }

  // Update parent Artifact's specimenIds list if not present
  if (normalized.parentArtifactId) {
    const currentArtifacts = getCachedArtifacts();
    const parent = currentArtifacts.find(a => a.id === normalized.parentArtifactId);
    if (parent && !parent.specimenIds.includes(normalized.id)) {
      const updatedParent: Artifact = {
        ...parent,
        specimenIds: [...parent.specimenIds, normalized.id],
        updatedAt: Date.now()
      };
      await saveArtifact(updatedParent);
    }
  }

  return normalized;
}

/**
 * Delete a Specimen from Firestore
 */
export async function deleteSpecimen(specimenId: string): Promise<void> {
  const spec = getCachedSpecimens().find(s => s.id === specimenId);
  try {
    await deleteDoc(doc(db, "specimens", specimenId));
    if (spec?.parentArtifactId) {
      await deleteDoc(doc(db, "artifacts", spec.parentArtifactId, "specimens", specimenId)).catch(() => {});
    }
  } catch (err) {
    console.error("Error deleting specimen from Firestore:", err);
  }

  const updatedSpecimens = getCachedSpecimens().filter(s => s.id !== specimenId);
  saveSpecimensToCache(updatedSpecimens);

  // Remove from parent artifact's specimenIds
  if (spec?.parentArtifactId) {
    const currentArtifacts = getCachedArtifacts();
    const parent = currentArtifacts.find(a => a.id === spec.parentArtifactId);
    if (parent && parent.specimenIds.includes(specimenId)) {
      const updatedParent: Artifact = {
        ...parent,
        specimenIds: parent.specimenIds.filter(id => id !== specimenId),
        updatedAt: Date.now()
      };
      await saveArtifact(updatedParent);
    }
  }
}

/**
 * Toggle Specimen availability (e.g. quick in-stock / sold out toggle)
 */
export async function toggleSpecimenAvailability(specimenId: string, availability: boolean): Promise<void> {
  const spec = getCachedSpecimens().find(s => s.id === specimenId);
  if (!spec) return;

  const updated: Specimen = {
    ...spec,
    availability,
    status: availability ? "available" : "sold_out",
    updatedAt: Date.now()
  };
  await saveSpecimen(updated);
}

/**
 * Calculates complete Artifact Set acquisition pricing:
 * 1. Sums the individual prices of available specimens
 * 2. Applies artifact.setPriceOverride if defined
 * 3. Or applies artifact.setDiscountPercentage (e.g. 10%)
 */
export function calculateArtifactSetPrice(artifact?: Artifact | null, specimens: Specimen[] = []) {
  if (!artifact) {
    return {
      individualTotal: 0,
      setPrice: 0,
      savings: 0,
      hasDiscount: false,
      discountPercent: 0,
      specimenCount: 0,
      availableSpecimens: []
    };
  }

  const safeSpecimens = Array.isArray(specimens) ? specimens : [];
  const availableSpecimens = safeSpecimens.filter(s => s && s.availability !== false && s.status !== "sold_out");
  const individualTotal = availableSpecimens.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  let setPrice = individualTotal;
  let savings = 0;
  let hasDiscount = false;
  let discountPercent = 0;

  const setPriceOverride = artifact.setPriceOverride;
  const setDiscountPercentage = artifact.setDiscountPercentage ?? artifact.completeSetDiscountPercent;

  if (typeof setPriceOverride === "number" && setPriceOverride > 0) {
    setPrice = setPriceOverride;
    savings = Math.max(0, individualTotal - setPrice);
    hasDiscount = savings > 0;
    discountPercent = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  } else if (typeof setDiscountPercentage === "number" && setDiscountPercentage > 0) {
    discountPercent = setDiscountPercentage;
    savings = Math.round((individualTotal * discountPercent) / 100);
    setPrice = Math.max(0, individualTotal - savings);
    hasDiscount = savings > 0;
  }

  return {
    individualTotal,
    setPrice,
    savings,
    hasDiscount,
    discountPercent,
    specimenCount: availableSpecimens.length,
    availableSpecimens
  };
}

/**
 * Projects a Specimen + its parent Artifact into a backward-compatible Product model
 * so existing legacy views, routes, and checkout continue working without breaking.
 */
export function projectSpecimenToProduct(specimen: Specimen, parentArtifact?: Artifact | null): Product {
  const medConfig = getMediumConfig(specimen.medium);
  return {
    id: specimen.id,
    productId: specimen.sku,
    name: parentArtifact ? `${parentArtifact.name} — ${specimen.medium}` : (specimen.artifactName ? `${specimen.artifactName} — ${specimen.medium}` : specimen.medium),
    description: parentArtifact?.description || "",
    price: specimen.price,
    categoryId: specimen.mediumCategory || medConfig.category,
    sku: specimen.sku,
    images: specimen.images?.length > 0 ? specimen.images : (parentArtifact?.images || [heroImage]),
    thumbnailImage: specimen.thumbnailImage || specimen.images?.[0] || parentArtifact?.thumbnailImage || heroImage,
    parentArtifactId: specimen.parentArtifactId,
    medium: specimen.medium,
    artifactType: specimen.medium,
    artifactClassification: specimen.mediumCategory || medConfig.category,
    artifactTags: parentArtifact?.tags || [],
    inventory: specimen.inventory,
    availability: specimen.availability,
    status: specimen.status,
    collectionName: parentArtifact?.collectionName || "Be Symbolic",
    symbolicTagline: parentArtifact?.symbolicTagline || "",
    inscription: parentArtifact?.inscription || specimen.artifactInscription || "",
    pillar1Represents: parentArtifact?.pillar1Represents || "",
    pillar2WhyChosen: parentArtifact?.pillar2WhyChosen || "",
    pillar3Communicates: parentArtifact?.pillar3Communicates || "",
    pillar4WearerCarries: parentArtifact?.pillar4WearerCarries || "",
    color: specimen.color,
    availableColors: specimen.availableColors,
    availableSizes: specimen.availableSizes,
    material: specimen.material,
    weight: specimen.weight,
    fit: specimen.fit,
    printMethod: specimen.printMethod,
    edition: specimen.edition || "050 SPECIMENS",
    careInstructions: specimen.careInstructions,
    finish: specimen.finish,
    dimensions: specimen.dimensions,
    capacity: specimen.capacity
  };
}

/**
 * Projects an Artifact (with all its child specimens) into a flagship Product model
 */
export function projectArtifactToProduct(artifact: Artifact, specimens: Specimen[]): Product {
  const minPrice = specimens.length > 0 
    ? Math.min(...specimens.map(s => s.price))
    : 4200;

  return {
    id: artifact.id,
    productId: artifact.artifactId,
    name: artifact.name,
    description: artifact.description,
    price: minPrice,
    categoryId: "wear",
    sku: artifact.artifactId,
    images: artifact.images.length > 0 ? artifact.images : [heroImage],
    thumbnailImage: artifact.thumbnailImage || artifact.images[0] || heroImage,
    isArtifactMaster: true,
    specimenIds: artifact.specimenIds,
    specimens: specimens,
    graphic: artifact.graphic,
    collectionName: artifact.collectionName,
    symbolicTagline: artifact.symbolicTagline,
    inscription: artifact.inscription,
    pillar1Represents: artifact.pillar1Represents,
    pillar2WhyChosen: artifact.pillar2WhyChosen,
    pillar3Communicates: artifact.pillar3Communicates,
    pillar4WearerCarries: artifact.pillar4WearerCarries,
    inventory: specimens.reduce((sum, s) => sum + s.inventory, 0),
    availability: specimens.some(s => s.availability),
    status: artifact.status === "published" ? "available" : artifact.status,
    artifactTags: artifact.tags
  };
}

/**
 * Automatic Migration & Initialization:
 * 1. Checks if Firestore has artifacts.
 * 2. If empty, seeds the canonical artifacts & specimens (including SUMUD, STATUS: RESISTING, etc.).
 * 3. Scans any legacy products and converts them into artifacts & specimens.
 */
export async function initializeAndMigrateArtifacts(): Promise<{
  artifacts: Artifact[];
  specimens: Specimen[];
}> {
  const cachedArts = getCachedArtifacts();
  const cachedSpecs = getCachedSpecimens();

  try {
    const existingArtifactsSnap = await getDocs(collection(db, "artifacts"));
    
    if (existingArtifactsSnap.empty || existingArtifactsSnap.docs.length === 0) {
      saveArtifactsToCache(SEED_ARTIFACTS);
      saveSpecimensToCache(SEED_SPECIMENS);
      // Do NOT trigger runaway background setDoc write loops to Firestore!
      return { artifacts: SEED_ARTIFACTS, specimens: SEED_SPECIMENS };
    }

    // Load from Firestore
    const artifacts = existingArtifactsSnap.docs.map(d => normalizeArtifact({ id: d.id, ...d.data() }));
    let specimens: Specimen[] = [];

    try {
      const specimensSnap = await getDocs(collection(db, "specimens"));
      if (!specimensSnap.empty) {
        specimens = specimensSnap.docs.map(d => normalizeSpecimen({ id: d.id, ...d.data() }));
      } else {
        specimens = SEED_SPECIMENS;
      }
    } catch {
      specimens = cachedSpecs.length > 0 ? cachedSpecs : SEED_SPECIMENS;
    }

    saveArtifactsToCache(artifacts);
    saveSpecimensToCache(specimens);
    return { artifacts, specimens };
  } catch (err: any) {
    console.warn("Using local cached/seed artifacts and specimens:", err?.message || err);
    return {
      artifacts: cachedArts.length > 0 ? cachedArts : SEED_ARTIFACTS,
      specimens: cachedSpecs.length > 0 ? cachedSpecs : SEED_SPECIMENS
    };
  }
}

/**
 * Fetch a single Artifact by ID
 */
export async function fetchArtifactById(artifactId: string): Promise<Artifact | null> {
  const all = await fetchArtifacts();
  return all.find(a => a.id === artifactId || a.artifactId === artifactId) || null;
}

/**
 * Fetch specimens belonging to a parent artifact
 */
export async function fetchSpecimensByArtifactId(artifactId: string): Promise<Specimen[]> {
  const all = await fetchSpecimens();
  return all.filter(s => 
    s.parentArtifactId === artifactId
  );
}

/**
 * Fetch all artifacts paired with their specimens
 */
export async function fetchArtifactsWithSpecimens(): Promise<ArtifactWithSpecimens[]> {
  const artifacts = await fetchArtifacts();
  const specimens = await fetchSpecimens();
  
  return artifacts.map(art => ({
    ...art,
    specimens: specimens.filter(s => 
      s.parentArtifactId === art.id || 
      s.parentArtifactId === art.artifactId ||
      art.specimenIds?.includes(s.id)
    )
  }));
}

/**
 * Delete artifact and cascade delete its specimens
 */
export async function deleteArtifactCascade(artifactId: string): Promise<void> {
  return deleteArtifact(artifactId, true);
}

/**
 * Delete specimen and clean up references
 */
export async function deleteSpecimenCascade(specimenId: string, parentArtifactId?: string): Promise<void> {
  return deleteSpecimen(specimenId);
}

/**
 * Converts a Specimen + its parent Artifact into a canonical Product representation for storefront rendering
 */
export function specimenToProduct(specimen: Specimen, parentArtifact?: Artifact): Product {
  const medConfig = getMediumConfig(specimen.medium);
  const categoryId = specimen.mediumCategory || medConfig.category || "wear";
  
  const artifactName = parentArtifact?.name || specimen.artifactName || "ARCHIVAL SPECIMEN";
  const name = `${artifactName} — ${specimen.medium}`;
  
  const images = (Array.isArray(specimen.images) && specimen.images.length > 0)
    ? specimen.images
    : [specimen.thumbnailImage || parentArtifact?.graphic || "/Logo_NoName.jpg"];

  const thumbnailImage = specimen.thumbnailImage || images[0] || parentArtifact?.graphic || "/Logo_NoName.jpg";

  return {
    id: specimen.id,
    productId: parentArtifact?.artifactId || specimen.sku || `SPEC-${specimen.id.slice(-4)}`,
    name,
    description: parentArtifact?.description || parentArtifact?.shortDescription || `${specimen.medium} formulated for ${artifactName}.`,
    price: typeof specimen.price === "number" ? specimen.price : 2500,
    categoryId,
    sku: specimen.sku,
    images,
    thumbnailImage,
    parentArtifactId: specimen.parentArtifactId || parentArtifact?.id,
    graphic: parentArtifact?.graphic || specimen.artifactGraphic || "/Logo_NoName.jpg",
    
    material: specimen.material || medConfig.defaultMaterial || "ARCHIVAL COTTON",
    weight: specimen.weight || "",
    fit: specimen.fit || specimen.type || "STANDARD ATELIER FIT",
    printMethod: specimen.printMethod || "DIRECT HIGH-DENSITY PRINT",
    edition: specimen.edition || "050 SPECIMENS",
    color: specimen.color || "Standard Finish",
    colorHex: specimen.colorHex || "#1C1C1C",
    availableColors: specimen.availableColors || [],
    availableSizes: specimen.availableSizes || medConfig.defaultSizes || ["S", "M", "L", "XL"],
    capacity: specimen.capacity,
    dimensions: specimen.dimensions,
    careInstructions: specimen.careInstructions,
    finish: specimen.finish,
    
    inscription: parentArtifact?.inscription || specimen.artifactInscription,
    pillar1Represents: parentArtifact?.pillar1Represents,
    pillar2WhyChosen: parentArtifact?.pillar2WhyChosen,
    pillar3Communicates: parentArtifact?.pillar3Communicates,
    pillar4WearerCarries: parentArtifact?.pillar4WearerCarries,
    
    statement: parentArtifact?.pillar4WearerCarries,
    representation: parentArtifact?.pillar2WhyChosen,
    wearingCommunicates: parentArtifact?.pillar3Communicates,
    statementMeaning: parentArtifact?.pillar1Represents,
    
    medium: specimen.medium,
    artifactType: specimen.type || specimen.garmentType || "Standard",
    artifactTags: parentArtifact?.tags || [],
    
    inventory: typeof specimen.inventory === "number" ? specimen.inventory : 50,
    availability: specimen.availability !== false && specimen.status !== "sold_out" && parentArtifact?.status !== "draft",
    isComingSoon: specimen.status === "draft" || parentArtifact?.status === "draft",
    status: specimen.status,
    
    collectionName: parentArtifact?.collectionName || "Be Symbolic",
    symbolicTagline: parentArtifact?.symbolicTagline || parentArtifact?.pillar3Communicates || parentArtifact?.shortDescription
  };
}

/**
 * Converts standalone Artifacts without specimens into Product representations for preview
 */
export function artifactToProduct(artifact: Artifact): Product {
  const images = (Array.isArray(artifact.images) && artifact.images.length > 0)
    ? artifact.images
    : [artifact.graphic || "/Logo_NoName.jpg"];

  return {
    id: artifact.id,
    productId: artifact.artifactId,
    name: artifact.name,
    description: artifact.description || artifact.shortDescription,
    price: artifact.setPriceOverride || 0,
    categoryId: "wear",
    sku: artifact.artifactId,
    images,
    thumbnailImage: artifact.thumbnailImage || artifact.graphic || images[0],
    parentArtifactId: artifact.id,
    graphic: artifact.graphic,
    
    material: "COMPLETE ARCHIVE SET",
    edition: "SERIES 01",
    color: "Multi-Medium Archive",
    
    inscription: artifact.inscription,
    pillar1Represents: artifact.pillar1Represents,
    pillar2WhyChosen: artifact.pillar2WhyChosen,
    pillar3Communicates: artifact.pillar3Communicates,
    pillar4WearerCarries: artifact.pillar4WearerCarries,
    
    statement: artifact.pillar4WearerCarries,
    representation: artifact.pillar2WhyChosen,
    wearingCommunicates: artifact.pillar3Communicates,
    statementMeaning: artifact.pillar1Represents,
    
    artifactTags: artifact.tags || [],
    inventory: 10,
    availability: artifact.status !== "draft",
    isComingSoon: artifact.status === "draft",
    status: artifact.status === "draft" ? "draft" : "published",
    
    collectionName: artifact.collectionName || "Be Symbolic",
    symbolicTagline: artifact.symbolicTagline || artifact.pillar3Communicates || artifact.shortDescription
  };
}

/**
 * Convert all artifacts with their specimens to Product list
 */
export function convertArtifactsAndSpecimensToProducts(artifacts: Artifact[], specimens: Specimen[]): Product[] {
  const products: Product[] = [];
  
  for (const artifact of artifacts) {
    const childSpecimens = specimens.filter(s => s.parentArtifactId === artifact.id || artifact.specimenIds?.includes(s.id));
    if (childSpecimens.length > 0) {
      for (const spec of childSpecimens) {
        products.push(specimenToProduct(spec, artifact));
      }
    } else {
      products.push(artifactToProduct(artifact));
    }
  }
  
  return products;
}

