/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Decoupled JSON Hero Configuration Service
 * 
 * ARCHITECTURAL MANDATE:
 * 1. ZERO FIRESTORE SYNC / ZERO CREDITS LEAKAGE:
 *    There is NO live real-time Firestore synchronization between the Studio Hero
 *    canvas and the Main Storefront Hero section.
 * 2. JSON FILE METADATA AS SOURCE OF TRUTH:
 *    The Studio Hero acts purely as an authoring canvas that calculates and stores
 *    elements' metadata (coordinates, rotations, sizes, animations, layers, texts,
 *    and buttons) into a JSON configuration file (`hero-config.json`).
 * 3. MAIN HERO CONSUMPTION:
 *    The Main Storefront Hero reads this JSON metadata and arranges every graphic
 *    and text object according to the JSON specifications without any Firestore reads.
 */

import { CustomHeroConfig, HeroLayerConfig, BackdropConfig, HeroButtonsConfig, GraphicObject } from "../types";
import bundledDefaultConfig from "../data/heroConfig.json";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const HERO_STORAGE_KEY = "sym_hero_json_metadata_v1";

export const DEFAULT_BG_LAYER: HeroLayerConfig = {
  id: "bg",
  name: "BACKGROUND LAYER",
  isEnabled: true,
  avatarUrl: "",
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
  graphicObjects: [],
  textObjects: [],
};

export const DEFAULT_MID_LAYER: HeroLayerConfig = {
  id: "mid",
  name: "AVATAR LAYER",
  isEnabled: true,
  avatarUrl: "",
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
  graphicObjects: [],
  textObjects: [],
};

export const DEFAULT_FG_LAYER: HeroLayerConfig = {
  id: "fg",
  name: "FOREGROUND LAYER",
  isEnabled: false,
  avatarUrl: "",
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
  graphicObjects: [],
  textObjects: [],
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
  avatarUrl: "",
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

  bgLayer: DEFAULT_BG_LAYER,
  midLayer: DEFAULT_MID_LAYER,
  fgLayer: DEFAULT_FG_LAYER,

  showCoordinates: false,
  canvasHeight: 700,
  showCanvasBoundingBox: true,
  canvasOverflowVisible: true,
  backdrop: DEFAULT_BACKDROP,
  heroButtons: DEFAULT_HERO_BUTTONS,
  gridOpacity: 0.12,
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
    avatarUrl: input.midLayer?.avatarUrl ?? input.avatarUrl ?? DEFAULT_MID_LAYER.avatarUrl,
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
  gridOpacity: input.gridOpacity ?? DEFAULT_HERO_CONFIG.gridOpacity,
};
}

/**
 * Calculates adaptive vertical stage height so the stage lower edge neatly frames the lowest graphic
 */
export function calculateAdaptiveStageHeight(config: CustomHeroConfig, isMobile: boolean = false): number {
  const baseCanvasHeight = config.canvasHeight || 700;
  
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
    const target = item.deviceTarget || "both";
    if (target === "desktop" && isMobile) continue;
    if (target === "mobile" && !isMobile) continue;

    const useMobile = isMobile && item.mobileEnabled;
    const itemPosY = useMobile ? (item.mobilePosY ?? item.posY ?? 50) : (item.posY ?? 50);
    const itemSize = useMobile ? (item.mobileSize ?? item.size ?? 220) : (item.size ?? 220);
    const itemRotation = useMobile ? (item.mobileRotation ?? item.rotation ?? 0) : (item.rotation ?? 0);

    const posYRatio = itemPosY / 100;
    const centerY = posYRatio * baseCanvasHeight;
    const halfSize = itemSize / 2;

    const rad = (Math.abs(itemRotation) * Math.PI) / 180;
    const rotationExtra = (itemSize * Math.sin(rad)) / 2;

    let captionHeight = 0;
    if (item.captionTitle || item.captionSubtitle) {
      captionHeight += 16;
      if (item.captionTitle) captionHeight += 26;
      if (item.captionSubtitle) captionHeight += 20;
    }

    let frameExtra = 0;
    if (item.shadow) frameExtra += 12;
    if (item.border) frameExtra += 8;

    const itemLowestPixelY = centerY + halfSize + rotationExtra + captionHeight + frameExtra;

    if (itemLowestPixelY > maxLowestPixelY) {
      maxLowestPixelY = itemLowestPixelY;
    }
  }

  const adaptedHeight = Math.ceil(maxLowestPixelY);
  return Math.max(isMobile ? 280 : 360, adaptedHeight);
}

/**
 * Detects current app environment (Google AI Studio vs Vercel Webapp)
 */
export function getSourceAppIdentifier(): "google_ai_studio" | "vercel_webapp" | "web" {
  if (typeof window === "undefined") return "web";
  const host = window.location.hostname || "";
  if (host.includes("ais-dev") || host.includes("ais-pre") || host.includes("google") || host.includes("run.app")) {
    return "google_ai_studio";
  }
  if (host.includes("vercel") || host.includes("vercel.app")) {
    return "vercel_webapp";
  }
  return "web";
}

/**
 * Retrieves bundled default hero configuration synchronously
 */
export function getCachedHeroConfig(): CustomHeroConfig {
  return normalizeHeroConfig(bundledDefaultConfig as unknown as Partial<CustomHeroConfig>);
}

/**
 * No-op cache setter (localStorage removed per architectural mandate)
 */
export function setCachedHeroConfig(_config: CustomHeroConfig): void {
  // Local storage completely disabled for hero configuration
}

/**
 * Asynchronously loads hero configuration from the canonical JSON metadata file (/api/hero-config or /hero-config.json)
 * and falls back to persistent Firestore setting (/settings/hero) on cold start.
 * 
 * ZERO CONTINUOUS LISTENERS: Only reads once on initial boot; no streaming listeners.
 */
export async function getHeroConfig(): Promise<CustomHeroConfig> {
  if (typeof window === "undefined") {
    return getCachedHeroConfig();
  }

  // 1. Load strictly from canonical JSON file on disk (/api/hero-config or /hero-config.json)
  try {
    const response = await fetch("/api/hero-config", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      if (data && (data.midLayer || data.bgLayer || data.canvasHeight)) {
        const normalized = normalizeHeroConfig(data);
        return normalized;
      }
    }
  } catch {}

  // 2. Fallback to static public /hero-config.json
  try {
    const staticResp = await fetch("/hero-config.json", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      cache: "no-store",
    });
    if (staticResp.ok) {
      const data = await staticResp.json();
      if (data && (data.midLayer || data.bgLayer)) {
        const normalized = normalizeHeroConfig(data);
        return normalized;
      }
    }
  } catch {}

  return getCachedHeroConfig();
}

/**
 * Dedicated JSON File Saver:
 * Persists layout metadata strictly into the single JSON file on disk via /api/hero-config.
 * Zero database writes.
 */
export async function saveHeroConfig(
  updates: Partial<CustomHeroConfig>,
  updatedByEmail?: string,
  _immediate: boolean = true
): Promise<CustomHeroConfig> {
  const current = getCachedHeroConfig();
  const sourceApp = getSourceAppIdentifier();

  const payload: CustomHeroConfig = normalizeHeroConfig({
    ...current,
    ...updates,
    updatedAt: Date.now(),
    updatedBy: updatedByEmail || "owner",
    sourceApp,
  });

  if (typeof window !== "undefined") {
    // 1. Dispatch window event for instant in-memory update across Main Hero & Studio
    window.dispatchEvent(new CustomEvent("sym_hero_config_updated", { detail: payload }));

    // 2. Persist strictly into the single JSON file on disk via server API
    try {
      await fetch("/api/hero-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Could not save to /api/hero-config:", err);
    }
  }

  return payload;
}

/**
 * Resets hero configuration back to default clean values and writes to JSON
 */
export async function resetHeroConfig(updatedByEmail?: string): Promise<CustomHeroConfig> {
  return saveHeroConfig(DEFAULT_HERO_CONFIG, updatedByEmail, true);
}

/**
 * Backwards compatibility helper for Hero component:
 * Loads the JSON configuration once on mount. NO real-time Firestore listeners or credit leakage!
 */
export function subscribeHeroConfig(
  onUpdate: (config: CustomHeroConfig) => void
): () => void {
  // Load initial from cache/bundled JSON immediately
  onUpdate(getCachedHeroConfig());

  // Fetch updated JSON metadata from file asynchronously once
  getHeroConfig().then((loaded) => {
    onUpdate(loaded);
  }).catch(() => {});

  // Clean no-op unsubscriber (no Firestore listener running)
  return () => {};
}

/**
 * Downloads the current hero JSON configuration to the user's computer
 */
export function downloadHeroConfigJson(config?: CustomHeroConfig): void {
  if (typeof window === "undefined") return;
  const targetConfig = config || getCachedHeroConfig();
  const jsonString = JSON.stringify(targetConfig, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hero-config-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Scans all graphics/images in the repository code folders (/public/assets/hero/..., etc.)
 * and populates them into the hero layers (midLayer, bgLayer, fgLayer) with unique serial numbers
 * so they can be visually positioned in Studio Hero and exported to JSON.
 */
export async function summonRepoGraphics(
  currentConfig: CustomHeroConfig
): Promise<{ config: CustomHeroConfig; count: number }> {
  let scannedItems: any[] = [];
  try {
    const res = await fetch("/api/scan-hero-graphics");
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.graphics)) {
        scannedItems = data.graphics;
      }
    }
  } catch (err) {
    console.warn("Could not fetch /api/scan-hero-graphics, using fallback list:", err);
  }

  // No hardcoded fallback list — strictly use scanned repo graphics
  if (scannedItems.length === 0) {
    scannedItems = [];
  }

  const nextMidGraphics: GraphicObject[] = [...(currentConfig.midLayer?.graphicObjects || [])];
  const nextBgGraphics: GraphicObject[] = [...(currentConfig.bgLayer?.graphicObjects || [])];
  const nextFgGraphics: GraphicObject[] = [...(currentConfig.fgLayer?.graphicObjects || [])];
  let nextBackdrop: BackdropConfig = { ...(currentConfig.backdrop || DEFAULT_BACKDROP) };

  let addedCount = 0;

  scannedItems.forEach((item) => {
    const targetUrl = item.avatarUrl || item.assetPath;
    const targetLayer = item.layer || "mid";

    if (targetLayer === "backdrop") {
      nextBackdrop = {
        isEnabled: true,
        imageUrl: targetUrl,
        opacity: nextBackdrop.opacity ?? 1,
      };
      addedCount++;
    } else if (targetLayer === "bg") {
      const existsInBg = nextBgGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      if (!existsInBg) {
        const gridX = 25 + ((nextBgGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextBgGraphics.length / 4) * 18);
        const graphicObj: GraphicObject = {
          id: item.id || `gfx_bg_${Date.now()}_${nextBgGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-BG-${String(nextBgGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || item.avatarAlt || `Background Graphic ${nextBgGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 320,
          rotation: 0,
          opacity: 0.25,
          transitionDirection: "fade",
          transitionSpeed: "smooth",
          transitionDelay: 0.1 + (nextBgGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        };
        nextBgGraphics.push(graphicObj);
      }
      addedCount++;
    } else if (targetLayer === "fg") {
      const existsInFg = nextFgGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      if (!existsInFg) {
        const gridX = 25 + ((nextFgGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextFgGraphics.length / 4) * 18);
        const graphicObj: GraphicObject = {
          id: item.id || `gfx_fg_${Date.now()}_${nextFgGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-FG-${String(nextFgGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || item.avatarAlt || `Foreground Graphic ${nextFgGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 140,
          rotation: 0,
          opacity: 1,
          transitionDirection: "top",
          transitionSpeed: "snappy",
          transitionDelay: 0.1 + (nextFgGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        };
        nextFgGraphics.push(graphicObj);
      }
      addedCount++;
    } else {
      // mid / avatar layer
      const existsInMid = nextMidGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      const isMainAvatar = currentConfig.midLayer?.avatarUrl === targetUrl;
      if (!existsInMid && !isMainAvatar) {
        const gridX = 25 + ((nextMidGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextMidGraphics.length / 4) * 18);
        const graphicObj: GraphicObject = {
          id: item.id || `gfx_mid_${Date.now()}_${nextMidGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-AV-${String(nextMidGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || item.avatarAlt || `Avatar Graphic ${nextMidGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 260,
          rotation: 0,
          opacity: 1,
          transitionDirection: "bottom",
          transitionSpeed: "spring",
          transitionDelay: 0.1 + (nextMidGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        };
        nextMidGraphics.push(graphicObj);
      }
      addedCount++;
    }
  });

  const nextConfig: CustomHeroConfig = {
    ...currentConfig,
    backdrop: nextBackdrop,
    midLayer: {
      ...currentConfig.midLayer,
      isEnabled: true,
      graphicObjects: nextMidGraphics,
      slideshowEnabled: nextMidGraphics.length > 0 ? true : currentConfig.midLayer?.slideshowEnabled,
    },
    bgLayer: {
      ...currentConfig.bgLayer,
      isEnabled: nextBgGraphics.length > 0 ? true : (currentConfig.bgLayer?.isEnabled ?? false),
      graphicObjects: nextBgGraphics,
    },
    fgLayer: {
      ...currentConfig.fgLayer,
      isEnabled: nextFgGraphics.length > 0 ? true : (currentConfig.fgLayer?.isEnabled ?? false),
      graphicObjects: nextFgGraphics,
    },
  };

  await saveHeroConfig(nextConfig);
  return { config: nextConfig, count: addedCount };
}

/**
 * Summons graphics for a single specified layer step-by-step
 */
export async function summonSingleLayerGraphics(
  currentConfig: CustomHeroConfig,
  targetLayerId: "backdrop" | "bg" | "mid" | "fg"
): Promise<{ config: CustomHeroConfig; count: number; layerLabel: string }> {
  let scannedItems: any[] = [];
  try {
    const res = await fetch("/api/scan-hero-graphics");
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.graphics)) {
        scannedItems = data.graphics;
      }
    }
  } catch (err) {
    console.warn("Could not fetch /api/scan-hero-graphics:", err);
  }

  const layerItems = scannedItems.filter(item => (item.layer || "mid") === targetLayerId);
  const layerLabel = targetLayerId === "backdrop" ? "BACKDROP" : targetLayerId === "bg" ? "BACKGROUND" : targetLayerId === "fg" ? "FOREGROUND" : "AVATAR";

  let nextConfig = { ...currentConfig };
  let addedCount = layerItems.length;

  if (targetLayerId === "backdrop") {
    let nextBackdrop = { ...(currentConfig.backdrop || DEFAULT_BACKDROP) };
    layerItems.forEach((item) => {
      const targetUrl = item.avatarUrl || item.assetPath;
      if (!nextBackdrop.imageUrl || nextBackdrop.imageUrl !== targetUrl) {
        nextBackdrop = {
          isEnabled: true,
          imageUrl: targetUrl,
          opacity: nextBackdrop.opacity ?? 1,
        };
        addedCount++;
      }
    });
    nextConfig.backdrop = nextBackdrop;
  } else if (targetLayerId === "bg") {
    const nextBgGraphics = [...(currentConfig.bgLayer?.graphicObjects || [])];
    layerItems.forEach((item) => {
      const targetUrl = item.avatarUrl || item.assetPath;
      const exists = nextBgGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      if (!exists) {
        const gridX = 25 + ((nextBgGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextBgGraphics.length / 4) * 18);
        nextBgGraphics.push({
          id: item.id || `gfx_bg_${Date.now()}_${nextBgGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-BG-${String(nextBgGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || `Background Graphic ${nextBgGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 320,
          rotation: 0,
          opacity: 0.25,
          transitionDirection: "fade",
          transitionSpeed: "smooth",
          transitionDelay: 0.1 + (nextBgGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        });
        addedCount++;
      }
    });
    nextConfig.bgLayer = {
      ...currentConfig.bgLayer,
      isEnabled: nextBgGraphics.length > 0 ? true : (currentConfig.bgLayer?.isEnabled ?? false),
      graphicObjects: nextBgGraphics,
    };
  } else if (targetLayerId === "fg") {
    const nextFgGraphics = [...(currentConfig.fgLayer?.graphicObjects || [])];
    layerItems.forEach((item) => {
      const targetUrl = item.avatarUrl || item.assetPath;
      const exists = nextFgGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      if (!exists) {
        const gridX = 25 + ((nextFgGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextFgGraphics.length / 4) * 18);
        nextFgGraphics.push({
          id: item.id || `gfx_fg_${Date.now()}_${nextFgGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-FG-${String(nextFgGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || `Foreground Graphic ${nextFgGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 140,
          rotation: 0,
          opacity: 1,
          transitionDirection: "top",
          transitionSpeed: "snappy",
          transitionDelay: 0.1 + (nextFgGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        });
        addedCount++;
      }
    });
    nextConfig.fgLayer = {
      ...currentConfig.fgLayer,
      isEnabled: nextFgGraphics.length > 0 ? true : (currentConfig.fgLayer?.isEnabled ?? false),
      graphicObjects: nextFgGraphics,
    };
  } else {
    // mid / avatar
    const nextMidGraphics = [...(currentConfig.midLayer?.graphicObjects || [])];
    layerItems.forEach((item) => {
      const targetUrl = item.avatarUrl || item.assetPath;
      const exists = nextMidGraphics.some(g => g.avatarUrl === targetUrl || g.assetPath === targetUrl);
      const isMain = currentConfig.midLayer?.avatarUrl === targetUrl;
      if (!exists && !isMain) {
        const gridX = 25 + ((nextMidGraphics.length % 4) * 16);
        const gridY = 30 + (Math.floor(nextMidGraphics.length / 4) * 18);
        nextMidGraphics.push({
          id: item.id || `gfx_mid_${Date.now()}_${nextMidGraphics.length}`,
          serialNumber: item.serialNumber || `SYM-AV-${String(nextMidGraphics.length).padStart(2, "0")}`,
          assetPath: item.assetPath || targetUrl,
          avatarUrl: targetUrl,
          avatarAlt: item.name || `Avatar Graphic ${nextMidGraphics.length + 1}`,
          posX: Math.min(85, Math.max(15, gridX)),
          posY: Math.min(85, Math.max(20, gridY)),
          size: 260,
          rotation: 0,
          opacity: 1,
          transitionDirection: "bottom",
          transitionSpeed: "spring",
          transitionDelay: 0.1 + (nextMidGraphics.length * 0.05),
          hoverEffect: "none",
          disableIdleAnimation: false,
          shadow: false,
          border: false,
        });
        addedCount++;
      }
    });
    nextConfig.midLayer = {
      ...currentConfig.midLayer,
      isEnabled: true,
      graphicObjects: nextMidGraphics,
      slideshowEnabled: nextMidGraphics.length > 0 ? true : currentConfig.midLayer?.slideshowEnabled,
    };
  }

  await saveHeroConfig(nextConfig);
  return { config: nextConfig, count: addedCount, layerLabel };
}

/**
 * Summons all layers one-by-one step by step in order:
 * Step 1: Backdrop -> Step 2: Background -> Step 3: Avatar (Mid) -> Step 4: Foreground
 */
export async function summonRepoGraphicsStepByStep(
  currentConfig: CustomHeroConfig,
  onStepProgress?: (stepName: string, layerCount: number) => void
): Promise<{ config: CustomHeroConfig; totalCount: number; summary: Record<string, number> }> {
  const steps: ("backdrop" | "bg" | "mid" | "fg")[] = ["backdrop", "bg", "mid", "fg"];
  let workingConfig = { ...currentConfig };
  let totalCount = 0;
  const summary: Record<string, number> = {};

  for (const layerId of steps) {
    const res = await summonSingleLayerGraphics(workingConfig, layerId);
    workingConfig = res.config;
    totalCount += res.count;
    summary[res.layerLabel] = res.count;
    if (onStepProgress) {
      onStepProgress(res.layerLabel, res.count);
    }
  }

  return { config: workingConfig, totalCount, summary };
}
