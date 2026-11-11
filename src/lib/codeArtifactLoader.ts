/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Code-Based Artifact & Specimen Engine
 * Loads and compiles all Artifacts, Specimens, and Preview Images directly
 * from the `/src/Artifacts/` code repository structure without relying on Firestore.
 */

import { Artifact, Specimen, ArtifactWithSpecimens, SpecimenStatus } from "../types";
import { getMediumConfig } from "./artifactService";

// Vite eager import of all JSON files in Artifacts/
const jsonModules = import.meta.glob('../Artifacts/**/*.json', { eager: true }) as Record<string, any>;

// Vite eager import of all image assets in Artifacts/
const imageModules = import.meta.glob('../Artifacts/**/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}', { 
  eager: true, 
  import: 'default' 
}) as Record<string, string>;

const FALLBACK_IMAGE = "/Logo_NoName.jpg";

interface ParsedArtifactRecord {
  folder: string;
  artifact: Artifact;
}

interface ParsedSpecimenRecord {
  artifactFolder: string;
  specimenFolder: string;
  specimen: Specimen;
}

/**
 * Normalizes relative path for matching
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Finds an image module in a given directory
 */
function findImageInDir(dirPath: string, preferredFilename?: string): string | null {
  const normDir = normalizePath(dirPath).replace(/\/$/, '');
  
  if (preferredFilename) {
    const specificPath = `${normDir}/${preferredFilename}`;
    for (const [key, url] of Object.entries(imageModules)) {
      if (normalizePath(key).toLowerCase() === specificPath.toLowerCase()) {
        return url;
      }
    }
  }

  // Look for any image in the directory
  for (const [key, url] of Object.entries(imageModules)) {
    const normKey = normalizePath(key);
    const parentDir = normKey.substring(0, normKey.lastIndexOf('/'));
    if (parentDir.toLowerCase() === normDir.toLowerCase()) {
      return url;
    }
  }

  return null;
}

/**
 * Finds all images in a given directory
 */
function findAllImagesInDir(dirPath: string): string[] {
  const normDir = normalizePath(dirPath).replace(/\/$/, '');
  const matches: string[] = [];

  for (const [key, url] of Object.entries(imageModules)) {
    const normKey = normalizePath(key);
    const parentDir = normKey.substring(0, normKey.lastIndexOf('/'));
    if (parentDir.toLowerCase() === normDir.toLowerCase() && url) {
      matches.push(url);
    }
  }

  return matches;
}

/**
 * Parses all artifacts and specimens from the `/src/Artifacts` directory
 */
function parseArtifactsDirectory(): { artifacts: Artifact[]; specimens: Specimen[] } {
  const artifactRecords: Map<string, ParsedArtifactRecord> = new Map();
  const specimenRecords: ParsedSpecimenRecord[] = [];

  // 1. First pass: Locate all artifact.json files
  for (const [rawPath, mod] of Object.entries(jsonModules)) {
    const path = normalizePath(rawPath);
    // Path format: ../Artifacts/<artifactFolder>/artifact.json
    const match = path.match(/\.\.\/Artifacts\/([^/]+)\/artifact\.json$/i);
    if (!match) continue;

    const artifactFolder = match[1];
    if (artifactFolder.startsWith('_')) {
      // Ignore template folders like _template
      continue;
    }

    const data = (mod && mod.default) ? mod.default : mod;
    if (!data || typeof data !== 'object') continue;

    const folderImg = findImageInDir(`../Artifacts/${artifactFolder}`, data.previewGraphic || "preview.png") 
      || FALLBACK_IMAGE;

    const artifactId = data.id || `art_${artifactFolder.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const artifactName = data.name || artifactFolder.toUpperCase().replace(/[-_]/g, ' ');

    const artifact: Artifact = {
      id: artifactId,
      artifactId: data.artifactId || `SYM-${artifactFolder.toUpperCase()}`,
      name: artifactName,
      shortDescription: data.shortDescription || `${artifactName} symbolic artifact.`,
      description: data.description || data.shortDescription || "",
      concept: data.concept || "",
      graphic: folderImg,
      images: Array.isArray(data.images) && data.images.length > 0 
        ? data.images.map((img: string) => findImageInDir(`../Artifacts/${artifactFolder}`, img) || img)
        : [folderImg],
      thumbnailImage: folderImg,
      inscription: data.inscription || "",
      pillar1Represents: data.pillar1Represents || "",
      pillar2WhyChosen: data.pillar2WhyChosen || "",
      pillar3Communicates: data.pillar3Communicates || "",
      pillar4WearerCarries: data.pillar4WearerCarries || "",
      symbolicTagline: data.symbolicTagline || "",
      collectionName: data.collectionName || "Be Symbolic",
      tags: Array.isArray(data.tags) ? data.tags : ["Series 01"],
      releaseInfo: data.releaseInfo || "Series 01 // Archival Witness",
      internalNotes: data.internalNotes || "",
      status: data.status || "published",
      specimenIds: [],
      setDiscountPercentage: typeof data.setDiscountPercentage === 'number' ? data.setDiscountPercentage : 10,
      completeSetDiscountPercent: typeof data.setDiscountPercentage === 'number' ? data.setDiscountPercentage : 10,
      order: typeof data.order === 'number' ? data.order : 10,
      createdAt: data.createdAt || 1710000000000,
      updatedAt: data.updatedAt || Date.now()
    };

    artifactRecords.set(artifactFolder, { folder: artifactFolder, artifact });
  }

  // 2. Second pass: Locate all specimen JSON files
  for (const [rawPath, mod] of Object.entries(jsonModules)) {
    const path = normalizePath(rawPath);
    // Path format: ../Artifacts/<artifactFolder>/<specimenFolder>/specimen.json (or *.json)
    const match = path.match(/\.\.\/Artifacts\/([^/]+)\/([^/]+)\/([^/]+)\.json$/i);
    if (!match) continue;

    const [_, artifactFolder, specimenFolder, jsonFilename] = match;
    if (artifactFolder.startsWith('_') || specimenFolder.startsWith('_')) {
      continue;
    }

    // Skip root artifact.json (handled in pass 1)
    if (specimenFolder.toLowerCase() === 'artifact') continue;

    const data = (mod && mod.default) ? mod.default : mod;
    if (!data || typeof data !== 'object') continue;

    const parentRecord = artifactRecords.get(artifactFolder);
    const parentArtifactId = parentRecord ? parentRecord.artifact.id : `art_${artifactFolder}`;
    const parentArtifactName = parentRecord ? parentRecord.artifact.name : artifactFolder.toUpperCase();
    const parentGraphic = parentRecord ? parentRecord.artifact.graphic : FALLBACK_IMAGE;
    const parentInscription = parentRecord ? parentRecord.artifact.inscription : "";

    // Resolve specimen preview images
    const specDir = `../Artifacts/${artifactFolder}/${specimenFolder}`;
    const dirImages = findAllImagesInDir(specDir);
    const resolvedPreview = findImageInDir(specDir, data.previewImage || "preview.png")
      || (dirImages.length > 0 ? dirImages[0] : parentGraphic);

    // Normalize medium & mediumCategory
    const mediumName = data.medium || specimenFolder.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const mediumCfg = getMediumConfig(mediumName);
    const mediumCategory = data.mediumCategory || mediumCfg.category;

    const specimenId = data.id || `spec_${artifactFolder}_${specimenFolder.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    // Collect all resolved images (incorporating all images in the specimen directory)
    const images: string[] = [];
    if (dirImages.length > 0) {
      images.push(...dirImages);
    }
    if (Array.isArray(data.images) && data.images.length > 0) {
      data.images.forEach((img: string) => {
        const found = findImageInDir(specDir, img);
        if (found && !images.includes(found)) {
          images.push(found);
        } else if ((img.startsWith('http') || img.startsWith('/')) && !images.includes(img)) {
          images.push(img);
        }
      });
    }
    if (images.length === 0) {
      images.push(resolvedPreview);
    }
    const prevIdx = images.indexOf(resolvedPreview);
    if (prevIdx > 0) {
      images.splice(prevIdx, 1);
      images.unshift(resolvedPreview);
    } else if (prevIdx === -1 && resolvedPreview) {
      images.unshift(resolvedPreview);
    }

    const specimen: Specimen = {
      id: specimenId,
      parentArtifactId,
      artifactName: parentArtifactName,
      artifactGraphic: parentGraphic,
      artifactInscription: parentInscription,
      medium: mediumName,
      mediumCategory,
      type: data.type || data.garmentType || mediumCfg.defaultGarmentTypes?.[0] || "Standard Cut",
      garmentType: data.garmentType || data.type || mediumCfg.defaultGarmentTypes?.[0] || "Standard Cut",
      sku: data.sku || `SYM-${artifactFolder.slice(0, 3).toUpperCase()}-${specimenFolder.slice(0, 3).toUpperCase()}`,
      price: typeof data.price === 'number' ? data.price : (mediumCfg.defaultPrice || 3500),
      inventory: typeof data.inventory === 'number' ? data.inventory : 50,
      availability: typeof data.availability === 'boolean' ? data.availability : true,
      status: (data.status as SpecimenStatus) || "available",
      images,
      thumbnailImage: resolvedPreview,
      
      color: data.color || "Charcoal Black",
      colorHex: data.colorHex || "#1C1C1C",
      availableColors: Array.isArray(data.availableColors) ? data.availableColors : [
        { id: "default", name: data.color || "Charcoal Black", hex: data.colorHex || "#1C1C1C" }
      ],
      availableSizes: Array.isArray(data.availableSizes) ? data.availableSizes : (mediumCfg.defaultSizes || ["One Size"]),
      material: data.material || "Combed Heavyweight Material",
      weight: data.weight || "Heavyweight",
      fabricGsm: data.fabricGsm || "",
      fit: data.fit || "Standard Silhouette",
      printMethod: data.printMethod || "High-Density Screen Print",
      edition: data.edition || "050 SPECIMENS // SERIES 01",
      editionDetails: data.editionDetails || "Limited Studio Allocation",
      careInstructions: data.careInstructions || "Machine wash cold inside out // Air dry",
      finish: data.finish || "",
      dimensions: data.dimensions || "",
      capacity: data.capacity || "",
      
      createdAt: data.createdAt || 1710000000000,
      updatedAt: data.updatedAt || Date.now()
    };

    specimenRecords.push({ artifactFolder, specimenFolder, specimen });

    // Link specimen to parent artifact
    if (parentRecord) {
      if (!parentRecord.artifact.specimenIds.includes(specimen.id)) {
        parentRecord.artifact.specimenIds.push(specimen.id);
      }
    }
  }

  // Sort artifacts by order
  const artifacts = Array.from(artifactRecords.values())
    .map(r => r.artifact)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const specimens = specimenRecords.map(r => r.specimen);

  return { artifacts, specimens };
}

// Cached parsed state
let cachedCodeCatalog: { artifacts: Artifact[]; specimens: Specimen[] } | null = null;

/**
 * Loads all artifacts directly from the code repository
 */
export function getCodeArtifacts(): Artifact[] {
  if (!cachedCodeCatalog) {
    cachedCodeCatalog = parseArtifactsDirectory();
  }
  return cachedCodeCatalog.artifacts;
}

/**
 * Loads all specimens directly from the code repository
 */
export function getCodeSpecimens(parentArtifactId?: string): Specimen[] {
  if (!cachedCodeCatalog) {
    cachedCodeCatalog = parseArtifactsDirectory();
  }
  if (!parentArtifactId) {
    return cachedCodeCatalog.specimens;
  }
  return cachedCodeCatalog.specimens.filter(s => s.parentArtifactId === parentArtifactId);
}

/**
 * Loads all artifacts bundled with their child specimens
 */
export function getCodeArtifactsWithSpecimens(): ArtifactWithSpecimens[] {
  const artifacts = getCodeArtifacts();
  const allSpecimens = getCodeSpecimens();

  return artifacts.map(art => ({
    ...art,
    specimens: allSpecimens.filter(s => s.parentArtifactId === art.id)
  }));
}

/**
 * Re-reads and re-parses the code catalog (e.g. for development or hot-reload)
 */
export function refreshCodeCatalog(): { artifacts: Artifact[]; specimens: Specimen[] } {
  cachedCodeCatalog = parseArtifactsDirectory();
  console.log(`🏛️ [CODE ARTIFACTS ENGINE] Loaded ${cachedCodeCatalog.artifacts.length} artifacts and ${cachedCodeCatalog.specimens.length} specimens directly from /src/Artifacts/`);
  return cachedCodeCatalog;
}
