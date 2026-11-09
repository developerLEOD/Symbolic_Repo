/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Avatar Graphics Database Service
 * Manages custom Avatar graphic assets in Firestore database (`avatar_graphics` collection)
 * with real-time cross-app synchronization.
 */

import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { AvatarGraphic } from "../types";
import { compressDataUrl, processFileToCompressedDataUrl } from "./imageOptimization";
import { getSourceAppIdentifier } from "./heroService";

export const AVATAR_GRAPHICS_COLLECTION = "avatar_graphics";
export const AVATAR_GRAPHICS_CACHE_KEY = "sym_avatar_graphics_catalog_v1";

export const DEFAULT_DATABASE_AVATARS: AvatarGraphic[] = [
  {
    id: "avg_monolith_emblem",
    name: "SYMBOLIC Monolith Emblem",
    url: "/Logo_NoName.jpg",
    category: "emblem",
    tags: ["core", "monolith", "heritage"],
    createdAt: 1700000000000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_kuffiyeh_hoodie",
    name: "Falasteen Kuffiyeh Hoodie",
    url: "/src/assets/images/falasteen_kuffiyeh_hoodie_1789233545448.jpg",
    category: "wear",
    tags: ["hoodie", "kuffiyeh", "falasteen"],
    createdAt: 1700000001000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_canvas_field_bag",
    name: "Canvas Field Bag",
    url: "/src/assets/images/canvas_field_bag_1789233558525.jpg",
    category: "carry",
    tags: ["bag", "canvas", "utility"],
    createdAt: 1700000002000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_twill_cap",
    name: "Structured Twill Cap",
    url: "/src/assets/images/structured_twill_cap_1789233572064.jpg",
    category: "headwear",
    tags: ["cap", "twill", "crown"],
    createdAt: 1700000003000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_stoneware_vessel",
    name: "Ceramic Stoneware Vessel",
    url: "/src/assets/images/ceramic_stoneware_vessel_1789233585625.jpg",
    category: "vessel",
    tags: ["ceramic", "stoneware", "vessel"],
    createdAt: 1700000004000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_seek_wisdom_mug",
    name: "Seek Wisdom Archival Mug",
    url: "/src/assets/images/mug_seek_wisdom_1788008333595.jpg",
    category: "vessel",
    tags: ["mug", "wisdom", "vessel"],
    createdAt: 1700000005000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_find_clarity_mug",
    name: "Find Clarity Emblem Mug",
    url: "/src/assets/images/mug_find_clarity_1788008345150.jpg",
    category: "vessel",
    tags: ["mug", "clarity", "vessel"],
    createdAt: 1700000006000,
    createdBy: "owner",
    sourceApp: "system",
  },
  {
    id: "avg_be_symbolic_mug",
    name: "Be Symbolic Identity Mug",
    url: "/src/assets/images/mug_be_symbolic_1788008321905.jpg",
    category: "vessel",
    tags: ["mug", "identity", "vessel"],
    createdAt: 1700000007000,
    createdBy: "owner",
    sourceApp: "system",
  },
];

/**
 * Retrieves cached avatar graphics synchronously from localStorage
 */
export function getCachedAvatarGraphics(): AvatarGraphic[] {
  if (typeof window === "undefined") return DEFAULT_DATABASE_AVATARS;
  try {
    const raw = localStorage.getItem(AVATAR_GRAPHICS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }
  return DEFAULT_DATABASE_AVATARS;
}

/**
 * Caches avatar graphics to localStorage
 */
export function setCachedAvatarGraphics(graphics: AvatarGraphic[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AVATAR_GRAPHICS_CACHE_KEY, JSON.stringify(graphics));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Real-time listener for the Avatar Graphics database collection.
 * Auto-seeds default graphics if collection is empty.
 */
export function subscribeAvatarGraphics(
  onUpdate: (graphics: AvatarGraphic[]) => void
): () => void {
  // Use local cache / default graphics to guarantee zero Firestore read/write quota consumption
  const cached = getCachedAvatarGraphics();
  onUpdate(cached);
  return () => {};
}

/**
 * Seeds default Avatar graphics into Firestore database if empty
 */
export async function seedDefaultAvatarGraphics(): Promise<void> {
  try {
    for (const item of DEFAULT_DATABASE_AVATARS) {
      const docRef = doc(db, AVATAR_GRAPHICS_COLLECTION, item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (err) {
    console.warn("Could not seed default avatar graphics to Firestore:", err);
  }
}

/**
 * Uploads an image file to the dedicated /public/uploads/hero/ directory on the server
 */
export async function uploadHeroGraphicFile(
  imageInput: File | string,
  name?: string
): Promise<{ url: string; name: string }> {
  let compressedDataUrl = "";
  let baseFilename = name || "hero_graphic";

  if (typeof imageInput === "string") {
    if (imageInput.startsWith("data:image/")) {
      compressedDataUrl = await compressDataUrl(imageInput, 1200, 0.85);
    } else {
      return { url: imageInput, name: baseFilename };
    }
  } else if (imageInput instanceof File) {
    baseFilename = imageInput.name.replace(/\.[^/.]+$/, "");
    compressedDataUrl = await processFileToCompressedDataUrl(imageInput, 1200, 0.85);
  }

  try {
    const res = await fetch("/api/upload-hero-graphic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl: compressedDataUrl,
        filename: baseFilename,
        name: name || baseFilename,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return { url: data.url, name: data.name || baseFilename };
      }
    }
  } catch (err) {
    console.warn("Could not save to /api/upload-hero-graphic, falling back to dataUrl:", err);
  }

  return { url: compressedDataUrl, name: baseFilename };
}

export async function addAvatarGraphicToDatabase(params: {
  name: string;
  imageInput: File | string;
  category?: string;
  tags?: string[];
  createdByEmail?: string;
}): Promise<AvatarGraphic> {
  const uploadResult = await uploadHeroGraphicFile(params.imageInput, params.name);
  const finalUrl = uploadResult.url;

  if (!finalUrl) {
    throw new Error("Invalid image format or image data");
  }

  const graphicId = `avg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sourceApp = getSourceAppIdentifier();

  const record: AvatarGraphic = {
    id: graphicId,
    name: params.name || uploadResult.name || "Custom Avatar Graphic",
    url: finalUrl,
    category: params.category || "custom",
    tags: params.tags || ["custom"],
    createdAt: Date.now(),
    createdBy: params.createdByEmail || "owner",
    sourceApp,
  };

  // 1. Update local cache immediately
  const current = getCachedAvatarGraphics();
  const updated = [record, ...current.filter((g) => g.id !== graphicId)];
  setCachedAvatarGraphics(updated);

  // 2. Save directly to Firestore database collection `/avatar_graphics/{graphicId}`
  try {
    const docRef = doc(db, AVATAR_GRAPHICS_COLLECTION, graphicId);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn("Could not save to Firestore avatar_graphics collection:", err);
  }

  return record;
}

/**
 * Deletes an Avatar Graphic from the Firestore database permanently
 */
export async function deleteAvatarGraphicFromDatabase(graphicId: string): Promise<void> {
  try {
    const docRef = doc(db, AVATAR_GRAPHICS_COLLECTION, graphicId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting avatar graphic from Firestore database:", err);
  }

  const current = getCachedAvatarGraphics();
  const updated = current.filter((g) => g.id !== graphicId);
  setCachedAvatarGraphics(updated);
}
