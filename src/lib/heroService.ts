/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Adaptive Custom Hero Configuration Service
 * Manages custom avatar graphics, free-form placement, and entrance transitions
 * with real-time Firestore synchronization and local fallback caching.
 */

import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { CustomHeroConfig, HeroLayerConfig, BackdropConfig, HeroButtonsConfig } from "../types";
import { 
  isFirestoreQuotaExceeded, 
  markFirestoreQuotaExceeded, 
  isQuotaError 
} from "./firestoreCircuitBreaker";
import { sanitizeHeroConfigForFirestore } from "./imageOptimization";

export const HERO_SETTINGS_DOC_PATH = "settings";
export const HERO_SETTINGS_DOC_ID = "hero";
export const HERO_STORAGE_KEY = "sym_hero_config";

export const DEFAULT_BG_LAYER: HeroLayerConfig = {
  id: "bg",
  name: "BACKGROUND LAYER",
  isEnabled: true,
  avatarUrl: "/Logo_NoName.jpg",
  avatarAlt: "SYMBOLIC Background Watermark",
  posX: 50,
  posY: 50,
  size: 380,
  rotation: 0,
  opacity: 0.12,
  transitionDirection: "fade",
  transitionSpeed: "smooth",
  transitionDelay: 0,
  hoverEffect: "none",
  shadow: false,
  border: false,
};

export const DEFAULT_MID_LAYER: HeroLayerConfig = {
  id: "mid",
  name: "AVATAR LAYER",
  isEnabled: true,
  avatarUrl: "/Logo_NoName.jpg",
  avatarAlt: "SYMBOLIC Monolithic Avatar Emblem",
  posX: 50,
  posY: 100,
  size: 380,
  rotation: 0,
  opacity: 1.0,
  transitionDirection: "bottom",
  transitionSpeed: "spring",
  transitionDelay: 0.15,
  hoverEffect: "none",
  shadow: false,
  border: false,
  captionTitle: "SYMBOLIC // AVATAR",
  captionSubtitle: "POSSESSION & IDENTITY",
  slideshowEnabled: true,
  slideshowInterval: 4,
  slideshowTransition: "fade",
  stickToBottom: true,
};

export const DEFAULT_FG_LAYER: HeroLayerConfig = {
  id: "fg",
  name: "FOREGROUND LAYER",
  isEnabled: false,
  avatarUrl: "/Logo_NoName.jpg",
  avatarAlt: "SYMBOLIC Foreground Accent",
  posX: 50,
  posY: 68,
  size: 110,
  rotation: 0,
  opacity: 1.0,
  transitionDirection: "top",
  transitionSpeed: "snappy",
  transitionDelay: 0.3,
  hoverEffect: "float",
  shadow: false,
  border: false,
};

export const DEFAULT_BACKDROP: BackdropConfig = {
  isEnabled: false,
  imageUrl: "",
  opacity: 1.0,
};

export const DEFAULT_HERO_BUTTONS: HeroButtonsConfig = {
  showButtons: true,
  button1Label: "ABOUT THE MARK",
  button1Link: "/about",
  button2Label: "MANIFESTO",
  button2Link: "/manifesto",
  posX: 50,
  posY: 85,
};

export const DEFAULT_HERO_CONFIG: CustomHeroConfig = {
  isEnabled: true,
  activeEditingLayer: "mid",
  // Legacy single-layer fields fallback
  avatarUrl: "/Logo_NoName.jpg",
  avatarAlt: "SYMBOLIC Monolithic Emblem",
  posX: 50,
  posY: 50,
  size: 180,
  rotation: 0,
  transitionDirection: "bottom",
  transitionSpeed: "spring",
  transitionDelay: 0.15,
  hoverEffect: "none",
  shadow: false,
  border: false,
  captionTitle: "SYMBOLIC // MONOLITH",
  captionSubtitle: "POSSESSION & IDENTITY",

  // 3-Layer System
  bgLayer: DEFAULT_BG_LAYER,
  midLayer: DEFAULT_MID_LAYER,
  fgLayer: DEFAULT_FG_LAYER,

  showCoordinates: false,
  canvasHeight: 700,
  showCanvasBoundingBox: true,
  canvasOverflowVisible: true,
  backdrop: DEFAULT_BACKDROP,
  heroButtons: DEFAULT_HERO_BUTTONS,
};

/**
 * Normalizes hero configuration to ensure all 3 layers (BG, MID, FG) exist
 */
export function normalizeHeroConfig(input?: Partial<CustomHeroConfig>): CustomHeroConfig {
  if (!input) return DEFAULT_HERO_CONFIG;

  const baseMid: HeroLayerConfig = {
    ...DEFAULT_MID_LAYER,
    ...(input.midLayer || {}),
    textObjects: input.midLayer?.textObjects || [],
    graphicObjects: input.midLayer?.graphicObjects || [],
    avatarUrl: input.midLayer?.avatarUrl || input.avatarUrl || DEFAULT_MID_LAYER.avatarUrl,
    posX: input.midLayer?.posX ?? input.posX ?? DEFAULT_MID_LAYER.posX,
    posY: input.midLayer?.posY ?? input.posY ?? DEFAULT_MID_LAYER.posY,
    size: input.midLayer?.size ?? input.size ?? DEFAULT_MID_LAYER.size,
    rotation: input.midLayer?.rotation ?? input.rotation ?? DEFAULT_MID_LAYER.rotation,
    transitionDirection: input.midLayer?.transitionDirection || input.transitionDirection || DEFAULT_MID_LAYER.transitionDirection,
    transitionSpeed: input.midLayer?.transitionSpeed || input.transitionSpeed || DEFAULT_MID_LAYER.transitionSpeed,
    hoverEffect: input.midLayer?.hoverEffect || input.hoverEffect || DEFAULT_MID_LAYER.hoverEffect,
    shadow: input.midLayer?.shadow ?? input.shadow ?? DEFAULT_MID_LAYER.shadow,
    border: input.midLayer?.border ?? input.border ?? DEFAULT_MID_LAYER.border,
    name: input.midLayer?.name || "AVATAR LAYER",
    captionTitle: input.midLayer?.captionTitle ?? input.captionTitle ?? DEFAULT_MID_LAYER.captionTitle,
    captionSubtitle: input.midLayer?.captionSubtitle ?? input.captionSubtitle ?? DEFAULT_MID_LAYER.captionSubtitle,
    slideshowEnabled: input.midLayer?.slideshowEnabled ?? true,
    slideshowInterval: input.midLayer?.slideshowInterval ?? 4,
    slideshowTransition: input.midLayer?.slideshowTransition || "fade",
    stickToBottom: input.midLayer?.stickToBottom ?? true,
    deviceTarget: input.midLayer?.deviceTarget || "both",
    mobileEnabled: input.midLayer?.mobileEnabled ?? false,
    mobilePosX: input.midLayer?.mobilePosX,
    mobilePosY: input.midLayer?.mobilePosY,
    mobileSize: input.midLayer?.mobileSize,
    mobileRotation: input.midLayer?.mobileRotation,
    mobileStickToBottom: input.midLayer?.mobileStickToBottom,
  };

  const baseBg: HeroLayerConfig = {
    ...DEFAULT_BG_LAYER,
    ...(input.bgLayer || {}),
    textObjects: input.bgLayer?.textObjects || [],
    graphicObjects: input.bgLayer?.graphicObjects || [],
    slideshowEnabled: input.bgLayer?.slideshowEnabled ?? false,
    slideshowInterval: input.bgLayer?.slideshowInterval ?? 4,
    slideshowTransition: input.bgLayer?.slideshowTransition || "fade",
    deviceTarget: input.bgLayer?.deviceTarget || "both",
    mobileEnabled: input.bgLayer?.mobileEnabled ?? false,
    mobilePosX: input.bgLayer?.mobilePosX,
    mobilePosY: input.bgLayer?.mobilePosY,
    mobileSize: input.bgLayer?.mobileSize,
    mobileRotation: input.bgLayer?.mobileRotation,
    mobileStickToBottom: input.bgLayer?.mobileStickToBottom,
  };

  const baseFg: HeroLayerConfig = {
    ...DEFAULT_FG_LAYER,
    ...(input.fgLayer || {}),
    textObjects: input.fgLayer?.textObjects || [],
    graphicObjects: input.fgLayer?.graphicObjects || [],
    slideshowEnabled: input.fgLayer?.slideshowEnabled ?? false,
    slideshowInterval: input.fgLayer?.slideshowInterval ?? 4,
    slideshowTransition: input.fgLayer?.slideshowTransition || "fade",
    deviceTarget: input.fgLayer?.deviceTarget || "both",
    mobileEnabled: input.fgLayer?.mobileEnabled ?? false,
    mobilePosX: input.fgLayer?.mobilePosX,
    mobilePosY: input.fgLayer?.mobilePosY,
    mobileSize: input.fgLayer?.mobileSize,
    mobileRotation: input.fgLayer?.mobileRotation,
    mobileStickToBottom: input.fgLayer?.mobileStickToBottom,
  };

  const baseBackdrop: BackdropConfig = {
    ...DEFAULT_BACKDROP,
    ...(input.backdrop || {}),
  };

  const baseButtons: HeroButtonsConfig = {
    ...DEFAULT_HERO_BUTTONS,
    ...(input.heroButtons || {}),
    deviceTarget: input.heroButtons?.deviceTarget || "both",
    mobileEnabled: input.heroButtons?.mobileEnabled ?? false,
    mobilePosX: input.heroButtons?.mobilePosX,
    mobilePosY: input.heroButtons?.mobilePosY,
  };

  return {
    ...DEFAULT_HERO_CONFIG,
    ...input,
    activeEditingLayer: input.activeEditingLayer || "mid",
    bgLayer: baseBg,
    midLayer: baseMid,
    fgLayer: baseFg,
    backdrop: baseBackdrop,
    heroButtons: baseButtons,
  };
}

/**
 * Calculates the exact vertical pixel height required for the hero bounding box 
 * so that its lower edge adapts automatically to the lowest pixel of the MAIN (middle) layer graphic
 * (or any active layer that extends lowest), with responsive device awareness.
 */
export function calculateAdaptiveStageHeight(config: CustomHeroConfig, isMobile: boolean = false): number {
  const baseCanvasHeight = config.canvasHeight || 700;
  
  // Identify the MAIN (middle) layer graphic
  const mainLayer = config.midLayer || {
    posX: config.posX ?? 50,
    posY: config.posY ?? 50,
    size: config.size ?? 220,
    captionTitle: config.captionTitle,
    captionSubtitle: config.captionSubtitle,
    isEnabled: config.isEnabled,
    avatarUrl: config.avatarUrl,
    rotation: config.rotation ?? 0,
    shadow: config.shadow ?? false,
    border: config.border ?? false,
  };

  // Collect active items to evaluate lowest point
  interface SizableItem {
    posX?: number;
    posY?: number;
    size?: number;
    rotation?: number;
    shadow?: boolean;
    border?: boolean;
    captionTitle?: string;
    captionSubtitle?: string;
    deviceTarget?: "both" | "desktop" | "mobile";
    mobileEnabled?: boolean;
    mobilePosX?: number;
    mobilePosY?: number;
    mobileSize?: number;
    mobileRotation?: number;
  }
  const activeItems: SizableItem[] = [];

  const addLayerGraphics = (layer?: HeroLayerConfig) => {
    if (!layer || !layer.isEnabled) return;
    if (layer.avatarUrl) {
      activeItems.push(layer);
    }
    if (layer.graphicObjects && layer.graphicObjects.length > 0) {
      layer.graphicObjects.forEach(g => {
        if (g.avatarUrl) activeItems.push(g);
      });
    }
  };

  if (mainLayer.isEnabled) {
    addLayerGraphics(mainLayer as HeroLayerConfig);
  }
  addLayerGraphics(config.fgLayer);
  addLayerGraphics(config.bgLayer);

  if (activeItems.length === 0) {
    return baseCanvasHeight;
  }

  let maxLowestPixelY = 0;

  for (const item of activeItems) {
    // Check device target visibility
    const target = item.deviceTarget || "both";
    if (target === "desktop" && isMobile) continue;
    if (target === "mobile" && !isMobile) continue;

    // Use mobile overrides if active on mobile
    const useMobile = isMobile && item.mobileEnabled;
    const itemPosY = useMobile ? (item.mobilePosY ?? item.posY ?? 50) : (item.posY ?? 50);
    const itemSize = useMobile ? (item.mobileSize ?? item.size ?? 220) : (item.size ?? 220);
    const itemRotation = useMobile ? (item.mobileRotation ?? item.rotation ?? 0) : (item.rotation ?? 0);

    const posYRatio = itemPosY / 100;
    // Y-coordinate of graphic center from top of stage
    const centerY = posYRatio * baseCanvasHeight;
    
    // Graphic height / size
    const halfSize = itemSize / 2;

    // Height offset for rotation tilt
    const rad = (Math.abs(itemRotation) * Math.PI) / 180;
    const rotationExtra = (itemSize * Math.sin(rad)) / 2;

    // Height offset for caption tags
    let captionHeight = 0;
    if (item.captionTitle || item.captionSubtitle) {
      captionHeight += 16;
      if (item.captionTitle) captionHeight += 26;
      if (item.captionSubtitle) captionHeight += 20;
    }

    // Height offset for brutalist hard shadow or solid border frame
    let frameExtra = 0;
    if (item.shadow) frameExtra += 12;
    if (item.border) frameExtra += 8;

    // Lowest pixel from top of stage for this graphic
    const itemLowestPixelY = centerY + halfSize + rotationExtra + captionHeight + frameExtra;

    if (itemLowestPixelY > maxLowestPixelY) {
      maxLowestPixelY = itemLowestPixelY;
    }
  }

  // Add clean 0px bottom architectural padding so the lowest pixel is neatly framed
  const adaptedHeight = Math.ceil(maxLowestPixelY + 0);

  // Return adapted height (never squish below 320px)
  return Math.max(isMobile ? 280 : 360, adaptedHeight);
}

/**
 * Retrieves the cached hero configuration from localStorage synchronously
 */
export function getCachedHeroConfig(): CustomHeroConfig {
  if (typeof window === "undefined") return DEFAULT_HERO_CONFIG;
  try {
    const raw = localStorage.getItem(HERO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeHeroConfig(parsed);
    }
  } catch {
    // Ignore parse error
  }
  return DEFAULT_HERO_CONFIG;
}

/**
 * Saves hero configuration to localStorage for instantaneous offline/first-render loading
 */
export function setCachedHeroConfig(config: CustomHeroConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Asynchronously loads the current hero config from Firestore with cached fallback
 */
export async function getHeroConfig(): Promise<CustomHeroConfig> {
  try {
    const docRef = doc(db, HERO_SETTINGS_DOC_PATH, HERO_SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const config: CustomHeroConfig = normalizeHeroConfig({
        ...data,
        id: snap.id,
      });
      setCachedHeroConfig(config);
      return config;
    }
  } catch (error) {
    console.warn("Could not fetch remote hero config from Firestore:", error);
  }
  return getCachedHeroConfig();
}

/**
 * Real-time listener for the hero configuration so storefront updates live
 * whenever an admin tweaks avatar position, image, or transitions in the studio.
 */
export function subscribeHeroConfig(
  onUpdate: (config: CustomHeroConfig) => void
): () => void {
  try {
    const docRef = doc(db, HERO_SETTINGS_DOC_PATH, HERO_SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const config: CustomHeroConfig = normalizeHeroConfig({
            ...data,
            id: docSnap.id,
          });
          setCachedHeroConfig(config);
          onUpdate(config);
        } else {
          onUpdate(getCachedHeroConfig());
        }
      },
      (error) => {
        console.warn("Error subscribing to hero config, using cached fallback:", error);
        onUpdate(getCachedHeroConfig());
      }
    );
  } catch (err) {
    console.warn("Could not establish hero subscription:", err);
    onUpdate(getCachedHeroConfig());
    return () => {};
  }
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
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

/**
 * Saves updated hero configuration to Firestore and local cache (Admin only).
 * Local cache is ALWAYS updated immediately for responsive real-time editing.
 * Remote Firestore write ONLY executes when 'immediate === true' (e.g. clicking 'SAVE & DEPLOY'),
 * completely preventing runaway write consumption during live dragging/slider adjustments.
 */
export async function saveHeroConfig(
  updates: Partial<CustomHeroConfig>,
  updatedByEmail?: string,
  immediate: boolean = false
): Promise<CustomHeroConfig> {
  const current = getCachedHeroConfig();
  const payload: CustomHeroConfig = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
    updatedBy: updatedByEmail || "owner",
  };

  // Immediate local cache update for snappy optimistic UI & instant preview
  setCachedHeroConfig(payload);

  if (isFirestoreQuotaExceeded()) {
    return payload;
  }

  const executeRemoteSave = async () => {
    try {
      const docRef = doc(db, HERO_SETTINGS_DOC_PATH, HERO_SETTINGS_DOC_ID);
      const cleanedPayload = cleanUndefined(payload);
      const sanitizedPayload = await sanitizeHeroConfigForFirestore(cleanedPayload);
      await setDoc(docRef, sanitizedPayload, { merge: true });
    } catch (error: any) {
      if (isQuotaError(error)) {
        markFirestoreQuotaExceeded();
        console.warn("Firestore daily write quota reached during save. Saved safely in local storage.");
      } else {
        console.error("Firestore hero config save error:", error?.message || error);
        if (immediate) {
          throw error;
        }
      }
    }
  };

  if (immediate) {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }
    await executeRemoteSave();
  } else {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
      saveDebounceTimer = null;
      executeRemoteSave();
    }, 1000);
  }

  return payload;
}

/**
 * Resets hero configuration back to default clean values
 */
export async function resetHeroConfig(updatedByEmail?: string): Promise<CustomHeroConfig> {
  return saveHeroConfig(DEFAULT_HERO_CONFIG, updatedByEmail, true);
}
