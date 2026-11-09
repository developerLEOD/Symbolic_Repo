import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Sliders, 
  Layers, 
  Move, 
  Eye, 
  Play, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Maximize2, 
  Minimize2, 
  Type, 
  ShieldCheck, 
  Image as ImageIcon,
  Compass,
  Grid,
  Zap,
  RefreshCw,
  ExternalLink,
  Info,
  Monitor,
  Smartphone,
  Database,
  Plus,
  Download,
  Copy
} from "lucide-react";
import { 
  CustomHeroConfig, 
  HeroLayerConfig,
  HeroLayerId,
  HeroTransitionDirection, 
  HeroTransitionSpeed, 
  HeroHoverEffect,
  TextObject,
  GraphicObject,
  BackdropConfig,
  HeroButtonsConfig,
  DeviceTarget,
  AvatarGraphic
} from "../types";
import { 
  DEFAULT_HERO_CONFIG, 
  DEFAULT_BG_LAYER,
  DEFAULT_MID_LAYER,
  DEFAULT_FG_LAYER,
  DEFAULT_BACKDROP,
  DEFAULT_HERO_BUTTONS,
  normalizeHeroConfig,
  getHeroConfig,
  getCachedHeroConfig, 
  saveHeroConfig, 
  resetHeroConfig,
  downloadHeroConfigJson,
  summonRepoGraphics
} from "../lib/heroService";
import { processFileToCompressedDataUrl } from "../lib/imageOptimization";
import { soundManager } from "../lib/soundEffects";
import { 
  subscribeAvatarGraphics, 
  addAvatarGraphicToDatabase, 
  deleteAvatarGraphicFromDatabase 
} from "../lib/avatarGraphicsService";
import LiquidCarveButton from "./LiquidCarveButton";
import HeroSidePanel from "./HeroSidePanel";

interface OwnerHeroManagerProps {
  onViewStorefront?: () => void;
  userEmail?: string;
  onTabChange?: (tab: string) => void;
  onClose?: () => void;
}


export default function OwnerHeroManager({ onViewStorefront, userEmail, onTabChange, onClose }: OwnerHeroManagerProps) {
  const [config, setConfig] = useState<CustomHeroConfig>(() => getCachedHeroConfig());
  const [activeLayerId, setActiveLayerId] = useState<HeroLayerId>("mid");
  const [activeObjectId, setActiveObjectId] = useState<string>("graphic");
  const [previewDeviceMode, setPreviewDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  // Database Avatar Graphics catalog state & handlers
  const [dbAvatarGraphics, setDbAvatarGraphics] = useState<AvatarGraphic[]>([]);
  const [newGraphicName, setNewGraphicName] = useState("");
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to live Avatar Graphics database collection
  useEffect(() => {
    const unsub = subscribeAvatarGraphics((list) => {
      setDbAvatarGraphics(list);
    });
    return () => unsub();
  }, []);

  // Debounced auto-save: automatically writes to hero-config.json and local storage 400ms after last adjustment
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveHeroConfig(config, userEmail, false).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [config, userEmail]);
  
  // Animation replay trigger key for testing
  const [previewKey, setPreviewKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [nudgeStep, setNudgeStep] = useState<number>(1);
  const [studioSlideIndices, setStudioSlideIndices] = useState<Record<string, number>>({});

  // Auto-cycle studio slideshow preview when layer.slideshowEnabled is true
  useEffect(() => {
    const activeLayers: HeroLayerConfig[] = [config.midLayer, config.bgLayer, config.fgLayer].filter(Boolean) as HeroLayerConfig[];
    const hasSlideshow = activeLayers.some(l => l.isEnabled && l.slideshowEnabled);
    if (!hasSlideshow) return;

    const intervalMs = Math.max(1, (config.midLayer?.slideshowInterval || 4)) * 1000;
    const timer = setInterval(() => {
      setStudioSlideIndices(prev => {
        const next = { ...prev };
        activeLayers.forEach(l => {
          if (l.isEnabled && l.slideshowEnabled) {
            const total = (l.avatarUrl ? 1 : 0) + (l.graphicObjects?.length || 0);
            if (total > 1) {
              const cur = prev[l.id] || 0;
              next[l.id] = (cur + 1) % total;
            }
          }
        });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [config]);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Active layer getter
  const activeLayerKey = activeLayerId === "bg" ? "bgLayer" : activeLayerId === "fg" ? "fgLayer" : activeLayerId === "backdrop" ? "backdrop" : "midLayer";
  const currentLayer: any = activeLayerId === "backdrop" ? (config.backdrop || DEFAULT_BACKDROP) : (config[activeLayerKey as keyof CustomHeroConfig] || (activeLayerId === "bg" ? DEFAULT_BG_LAYER : activeLayerId === "fg" ? DEFAULT_FG_LAYER : DEFAULT_MID_LAYER));

  // Helper to update properties on the active layer
  const updateLayerProps = (updates: Partial<HeroLayerConfig>) => {
    setConfig((prev) => {
      const layerToUpdate = prev[activeLayerKey as keyof CustomHeroConfig] as any || (activeLayerId === "bg" ? DEFAULT_BG_LAYER : activeLayerId === "fg" ? DEFAULT_FG_LAYER : DEFAULT_MID_LAYER);
      const updatedLayer = { ...layerToUpdate, ...updates };
      const nextConfig = {
        ...prev,
        [activeLayerKey]: updatedLayer,
        // If middle layer is updated, sync top-level fields for backwards compatibility
        ...(activeLayerId === "mid" ? updates : {}),
      };
      return nextConfig;
    });
  };

  const updateLayerProp = <K extends keyof HeroLayerConfig>(key: K, value: HeroLayerConfig[K]) => {
    if (activeLayerId === "backdrop") {
      updateProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), [key]: value });
    } else {
      updateLayerProps({ [key]: value });
    }
  };

  // Helper to update top-level config property
  const updateProp = <K extends keyof CustomHeroConfig>(key: K, value: CustomHeroConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Selected object identifier logic
  const isMainGraphic = activeObjectId === "graphic";
  const selectedSecondaryGraphic = currentLayer.graphicObjects?.find((g: GraphicObject) => g.id === activeObjectId);
  const selectedSecondaryGraphicIndex = currentLayer.graphicObjects?.findIndex((g: GraphicObject) => g.id === activeObjectId) ?? -1;
  const isGraphicSelected = isMainGraphic || !!selectedSecondaryGraphic;

  const selectedTextObject = currentLayer.textObjects?.find((t: any) => t.id === activeObjectId);
  const selectedTextIndex = currentLayer.textObjects?.findIndex((t: any) => t.id === activeObjectId) ?? -1;

  // Unified updater that targets either the layer graphic, secondary graphic, hero buttons, or a specific text object
  const updateActiveObjectProps = (updates: any) => {
    if (activeObjectId === "hero_buttons") {
      updateProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), ...updates });
    } else if (activeLayerId === "backdrop") {
      updateProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), ...updates });
    } else if (isMainGraphic) {
      updateLayerProps(updates);
    } else if (selectedSecondaryGraphic) {
      setConfig((prev) => {
        const layer = prev[activeLayerKey as keyof CustomHeroConfig] as any || (activeLayerId === "bg" ? DEFAULT_BG_LAYER : activeLayerId === "fg" ? DEFAULT_FG_LAYER : DEFAULT_MID_LAYER);
        const newGraphics = [...(layer.graphicObjects || [])];
        if (selectedSecondaryGraphicIndex >= 0) {
          newGraphics[selectedSecondaryGraphicIndex] = { ...newGraphics[selectedSecondaryGraphicIndex], ...updates };
        }
        return {
          ...prev,
          [activeLayerKey]: { ...layer, graphicObjects: newGraphics }
        };
      });
    } else if (selectedTextObject) {
      setConfig((prev) => {
        const layer = prev[activeLayerKey as keyof CustomHeroConfig] as any || (activeLayerId === "bg" ? DEFAULT_BG_LAYER : activeLayerId === "fg" ? DEFAULT_FG_LAYER : DEFAULT_MID_LAYER);
        const newTextObjects = [...(layer.textObjects || [])];
        if (selectedTextIndex >= 0) {
          newTextObjects[selectedTextIndex] = { ...newTextObjects[selectedTextIndex], ...updates };
        }
        return {
          ...prev,
          [activeLayerKey]: { ...layer, textObjects: newTextObjects }
        };
      });
    }
  };

  const getActiveObjectValue = <K extends keyof HeroLayerConfig | keyof TextObject | keyof GraphicObject | keyof BackdropConfig | keyof HeroButtonsConfig>(key: K, fallback: any): any => {
    if (activeObjectId === "hero_buttons") return (config.heroButtons as any)?.[key] ?? (DEFAULT_HERO_BUTTONS as any)[key] ?? fallback;
    if (activeLayerId === "backdrop") return (config.backdrop as any)?.[key] ?? (DEFAULT_BACKDROP as any)[key] ?? fallback;
    if (isMainGraphic) return (currentLayer as any)[key] ?? fallback;
    if (selectedSecondaryGraphic) return (selectedSecondaryGraphic as any)[key] ?? fallback;
    if (selectedTextObject) return (selectedTextObject as any)[key] ?? fallback;
    return fallback;
  };

  const handleNudge = (dx: number, dy: number) => {
    soundManager.playClick(0.04);
    if (previewDeviceMode === "mobile") {
      const curX = getActiveObjectValue("mobilePosX", getActiveObjectValue("posX", 50));
      const curY = getActiveObjectValue("mobilePosY", getActiveObjectValue("posY", 50));
      const newX = Math.max(-80, Math.min(180, curX + dx * nudgeStep));
      const newY = Math.max(-80, Math.min(180, curY + dy * nudgeStep));
      updateActiveObjectProps({ mobileEnabled: true, mobilePosX: newX, mobilePosY: newY });
    } else {
      const curX = getActiveObjectValue("posX", 50);
      const curY = getActiveObjectValue("posY", 50);
      const newX = Math.max(-80, Math.min(180, curX + dx * nudgeStep));
      const newY = Math.max(-80, Math.min(180, curY + dy * nudgeStep));
      updateActiveObjectProps({ posX: newX, posY: newY });
    }
  };

  // Keyboard arrow listener when inside studio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNudge(0, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNudge(0, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNudge(-1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNudge(1, 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nudgeStep, activeLayerId, activeObjectId, currentLayer, previewDeviceMode]);

  // Canvas interaction: drag & drop
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;

      const newX = Math.round(Math.max(-80, Math.min(180, rawX)));
      const newY = Math.round(Math.max(-80, Math.min(180, rawY)));

      if (previewDeviceMode === "mobile") {
        updateActiveObjectProps({ mobileEnabled: true, mobilePosX: newX, mobilePosY: newY });
      } else {
        updateActiveObjectProps({ posX: newX, posY: newY });
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
      try {
        soundManager.playClick(0.08);
      } catch {}
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, activeLayerId, activeObjectId, previewDeviceMode]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    setIsDragging(true);
  };

  const handleCanvasMouseMove = () => {};
  const handleCanvasMouseUp = () => {};

  // Load configuration on mount
  useEffect(() => {
    let mounted = true;
    getHeroConfig().then((loaded) => {
      if (mounted) {
        setConfig(normalizeHeroConfig(loaded));
        if (loaded.activeEditingLayer) {
          setActiveLayerId(loaded.activeEditingLayer);
        }
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Replay animation preview
  const handleReplayAnimation = () => {
    soundManager.playToggle(0.12);
    setPreviewKey((k) => k + 1);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      await saveHeroConfig(config, userEmail, true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save hero error:", err);
      alert("Save Config Error: " + (err?.message || "Could not save hero metadata configuration."));
    } finally {
      setIsSaving(false);
    }
  };

  // Import saved JSON configuration file directly into database and apply
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeHeroConfig(parsed);
      
      const saved = await saveHeroConfig(normalized, userEmail, true);
      setConfig(saved);
      setPreviewKey((k) => k + 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert("Hero JSON successfully uploaded to database & applied to Main Hero!");
    } catch (err: any) {
      alert("Failed to import JSON file: " + (err?.message || "Invalid JSON format"));
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = "";
    }
  };

  // Summon all repo graphics from code/directory
  const handleSummonGraphics = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      const { config: updatedConfig, count } = await summonRepoGraphics(config);
      setConfig(updatedConfig);
      setPreviewKey((k) => k + 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`Summoned ${count} repo graphics! Set parameters for each graphic and click EXPORT to save JSON.`);
    } catch (err: any) {
      alert("Failed to summon repo graphics: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm("Reset hero canvas back to default settings?")) return;
    soundManager.playClick(0.12);
    setIsSaving(true);
    try {
      const reset = await resetHeroConfig(userEmail);
      setConfig(reset);
      setPreviewKey((k) => k + 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate motion initial variants for preview
  const getPreviewInitialVariants = (dir: HeroTransitionDirection) => {
    switch (dir) {
      case "bottom":
        return { y: 220, opacity: 0, scale: 0.95 };
      case "top":
        return { y: -220, opacity: 0, scale: 0.95 };
      case "left":
        return { x: -280, opacity: 0, scale: 0.95 };
      case "right":
        return { x: 280, opacity: 0, scale: 0.95 };
      case "scale":
        return { scale: 0.1, opacity: 0 };
      case "fade":
      default:
        return { opacity: 0 };
    }
  };

  const getTransitionSettings = (speed: HeroTransitionSpeed) => {
    switch (speed) {
      case "snappy":
        return { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };
      case "smooth":
        return { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] as const };
      case "dramatic":
        return { duration: 1.4, ease: [0.16, 1, 0.3, 1] as const };
      case "spring":
      default:
        return { type: "spring" as const, stiffness: 320, damping: 20 };
    }
  };

  const renderStudioBackdrop = (backdrop?: CustomHeroConfig["backdrop"]) => {
    if (!backdrop || !backdrop.isEnabled || !backdrop.imageUrl) return null;
    const isActive = activeLayerId === "backdrop";

    return (
      <div 
        key="studio-backdrop"
        className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all ${isActive ? "ring-4 ring-brand-accent ring-inset" : ""}`}
        style={{ opacity: backdrop.opacity ?? 1 }}
      >
        <img 
          src={backdrop.imageUrl} 
          alt="Studio Backdrop" 
          className={`w-full h-full object-cover select-none ${isActive ? "brightness-100" : "opacity-40 grayscale"}`}
          referrerPolicy="no-referrer"
        />
        {isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brand-accent text-white px-3 py-1 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#050505] z-50">
            EDITING BACKDROP LAYER
          </div>
        )}
      </div>
    );
  };

  const renderStudioPreviewLayer = (layer?: HeroLayerConfig, zIndex: number = 20) => {
    const hasContent = layer?.avatarUrl || (layer?.textObjects && layer.textObjects.length > 0) || (layer?.graphicObjects && layer.graphicObjects.length > 0);
    if (!layer || !layer.isEnabled || !hasContent) return null;

    const isActiveLayer = layer.id === activeLayerId;

    // Collect all graphics in this layer (Main + Secondary)
    const layerGraphics: Array<{
      id: string;
      isMain: boolean;
      avatarUrl: string;
      avatarAlt?: string;
      posX: number;
      posY: number;
      size: number;
      rotation?: number;
      opacity?: number;
      transitionDirection?: HeroTransitionDirection;
      transitionSpeed?: HeroTransitionSpeed;
      hoverEffect?: HeroHoverEffect;
      disableIdleAnimation?: boolean;
      shadow?: boolean;
      border?: boolean;
      captionTitle?: string;
      captionSubtitle?: string;
      deviceTarget?: DeviceTarget;
      mobileEnabled?: boolean;
      mobilePosX?: number;
      mobilePosY?: number;
      mobileSize?: number;
      mobileRotation?: number;
      mobileStickToBottom?: boolean;
      stickToBottom?: boolean;
    }> = [];

    if (layer.avatarUrl) {
      layerGraphics.push({
        id: "graphic",
        isMain: true,
        avatarUrl: layer.avatarUrl,
        avatarAlt: layer.avatarAlt,
        posX: layer.posX,
        posY: layer.posY,
        size: layer.size,
        rotation: layer.rotation,
        opacity: layer.opacity,
        transitionDirection: layer.transitionDirection,
        transitionSpeed: layer.transitionSpeed,
        hoverEffect: layer.hoverEffect,
        disableIdleAnimation: layer.disableIdleAnimation,
        shadow: layer.shadow,
        border: layer.border,
        captionTitle: layer.captionTitle,
        captionSubtitle: layer.captionSubtitle,
        deviceTarget: layer.deviceTarget,
        mobileEnabled: layer.mobileEnabled,
        mobilePosX: layer.mobilePosX,
        mobilePosY: layer.mobilePosY,
        mobileSize: layer.mobileSize,
        mobileRotation: layer.mobileRotation,
        mobileStickToBottom: layer.mobileStickToBottom,
        stickToBottom: layer.stickToBottom,
      });
    }

    if (layer.graphicObjects && layer.graphicObjects.length > 0) {
      layer.graphicObjects.forEach((g) => {
        layerGraphics.push({
          id: g.id,
          isMain: false,
          avatarUrl: g.avatarUrl,
          avatarAlt: g.avatarAlt,
          posX: g.posX,
          posY: g.posY,
          size: g.size,
          rotation: g.rotation,
          opacity: g.opacity,
          transitionDirection: g.transitionDirection,
          transitionSpeed: g.transitionSpeed,
          hoverEffect: g.hoverEffect,
          disableIdleAnimation: g.disableIdleAnimation,
          shadow: g.shadow,
          border: g.border,
          captionTitle: g.captionTitle,
          captionSubtitle: g.captionSubtitle,
          deviceTarget: g.deviceTarget,
          mobileEnabled: g.mobileEnabled,
          mobilePosX: g.mobilePosX,
          mobilePosY: g.mobilePosY,
          mobileSize: g.mobileSize,
          mobileRotation: g.mobileRotation,
          mobileStickToBottom: g.mobileStickToBottom,
          stickToBottom: g.stickToBottom,
        });
      });
    }

    const isMobileMode = previewDeviceMode === "mobile";

    // Filter graphics based on target device
    const isItemVisible = (target?: DeviceTarget) => {
      if (!target || target === "both") return true;
      return isMobileMode ? target === "mobile" : target === "desktop";
    };

    const visibleGraphics = layerGraphics.filter((g) => isItemVisible(g.deviceTarget));
    const isSlideshowActive = Boolean(layer.slideshowEnabled && visibleGraphics.length > 1);
    const currentSlideIdx = studioSlideIndices[layer.id] || 0;
    const safeSlideIdx = currentSlideIdx % (visibleGraphics.length || 1);
    const defaultLayerStickBottom = Boolean(layer.stickToBottom ?? (layer.id === "mid"));

    const graphicsToRender = isSlideshowActive ? [visibleGraphics[safeSlideIdx]] : visibleGraphics;

    return (
      <React.Fragment key={layer.id}>
        {/* Layer Graphics: Slideshow active vs static array */}
        {graphicsToRender.map((item) => {
          const actualIndex = layerGraphics.findIndex(g => g.id === item.id);
          const isSelected = isActiveLayer && activeObjectId === item.id;

          const effectivePosX = (isMobileMode && item.mobileEnabled && item.mobilePosX !== undefined) ? item.mobilePosX : item.posX;
          const effectivePosY = (isMobileMode && item.mobileEnabled && item.mobilePosY !== undefined) ? item.mobilePosY : item.posY;
          const effectiveSize = (isMobileMode && item.mobileEnabled && item.mobileSize !== undefined) ? item.mobileSize : (item.size || 180);
          const effectiveRotation = (isMobileMode && item.mobileEnabled && item.mobileRotation !== undefined) ? item.mobileRotation : (item.rotation || 0);
          const isMain = actualIndex === 0;
          const effectiveStickBottom = (isMobileMode && item.mobileEnabled && item.mobileStickToBottom !== undefined)
            ? Boolean(item.mobileStickToBottom && effectivePosY >= 90)
            : Boolean((item.stickToBottom ?? (isMain ? defaultLayerStickBottom : false)) && effectivePosY >= 90);

          return (
            <motion.div
              key={`${layer.id}-${item.id}-${previewKey}`}
              initial={getPreviewInitialVariants(item.transitionDirection || "fade")}
              animate={{
                x: 0,
                y: 0,
                scale: 1,
                opacity: item.opacity ?? 1,
              }}
              transition={getTransitionSettings(item.transitionSpeed || "smooth")}
              className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
              style={
                effectiveStickBottom
                  ? {
                      left: `${effectivePosX}%`,
                      bottom: 0,
                      top: "auto",
                      transform: `translateX(-50%) rotate(${effectiveRotation}deg)`,
                      transformOrigin: "bottom center",
                      zIndex: zIndex,
                    }
                  : {
                      left: `${effectivePosX}%`,
                      top: `${effectivePosY}%`,
                      transform: `translate(-50%, -50%) rotate(${effectiveRotation}deg)`,
                      transformOrigin: "center",
                      zIndex: zIndex,
                    }
              }
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick(0.06);
                setActiveLayerId(layer.id);
                updateProp("activeEditingLayer", layer.id);
                setActiveObjectId(item.id);
              }}
            >
              <motion.div
                animate={
                  !item.disableIdleAnimation && item.hoverEffect === "float"
                    ? { y: [0, -8, 0] }
                    : !item.disableIdleAnimation && item.hoverEffect === "pulse"
                    ? { scale: [1, 1.025, 1] }
                    : {}
                }
                transition={{
                  repeat: Infinity,
                  duration: item.hoverEffect === "float" ? 3.2 : 2.4,
                  ease: "easeInOut",
                }}
                className="flex flex-col items-center relative group"
              >
                {isSelected && (
                  <div className="absolute -inset-3 rounded-sm border-2 border-dashed border-brand-accent pointer-events-none animate-pulse z-40">
                    <span className="absolute -top-3.5 left-1 bg-brand-accent text-white font-mono text-[7.5px] font-black uppercase px-1">
                      {isSlideshowActive ? `SLIDE ${safeSlideIdx + 1}/${visibleGraphics.length} • ` : ""}EDITING {item.isMain ? "MAIN GRAPHIC" : `GRAPHIC ${actualIndex + 1}`} {isMobileMode ? "[📱 MOBILE]" : "[💻 PC]"}
                    </span>

                    {/* Floating COPY/PASTE Overlay UI inside the preview canvas */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playClick(0.08);
                          (window as any).sym_graphic_clipboard = { ...item };
                          alert("COPIED PARAMETERS: " + (item.isMain ? "Main Graphic" : "Secondary Graphic"));
                        }}
                        className="px-2 py-0.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text text-[7px] font-black uppercase shadow-[1.5px_1.5px_0px_#050505] flex items-center gap-1"
                        title="Copy parameters (size, position, animations)"
                      >
                        <Copy size={9} />
                        <span>COPY</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const clipboard = (window as any).sym_graphic_clipboard;
                          if (!clipboard) {
                            alert("Clipboard empty. COPY a graphic first.");
                            return;
                          }
                          soundManager.playClick(0.12);
                          if (!window.confirm("PASTE to ALL avatars in this layer? This will sync size, position, and animations across all graphics.")) return;
                          
                          const paramsToPaste = {
                            posX: clipboard.posX,
                            posY: clipboard.posY,
                            size: clipboard.size,
                            rotation: clipboard.rotation,
                            opacity: clipboard.opacity,
                            transitionDirection: clipboard.transitionDirection,
                            transitionSpeed: clipboard.transitionSpeed,
                            transitionDelay: clipboard.transitionDelay,
                            hoverEffect: clipboard.hoverEffect,
                            disableIdleAnimation: clipboard.disableIdleAnimation,
                            shadow: clipboard.shadow,
                            border: clipboard.border,
                            stickToBottom: clipboard.stickToBottom,
                            mobileEnabled: clipboard.mobileEnabled,
                            mobilePosX: clipboard.mobilePosX,
                            mobilePosY: clipboard.mobilePosY,
                            mobileSize: clipboard.mobileSize,
                            mobileRotation: clipboard.mobileRotation,
                            mobileStickToBottom: clipboard.mobileStickToBottom,
                          };

                          setConfig(prev => {
                            const layer = prev[activeLayerKey as keyof CustomHeroConfig] as any;
                            const nextLayer = { ...layer };
                            
                            // Apply to main
                            nextLayer.posX = paramsToPaste.posX;
                            nextLayer.posY = paramsToPaste.posY;
                            nextLayer.size = paramsToPaste.size;
                            nextLayer.rotation = paramsToPaste.rotation;
                            nextLayer.opacity = paramsToPaste.opacity;
                            nextLayer.transitionDirection = paramsToPaste.transitionDirection;
                            nextLayer.transitionSpeed = paramsToPaste.transitionSpeed;
                            nextLayer.transitionDelay = paramsToPaste.transitionDelay;
                            nextLayer.hoverEffect = paramsToPaste.hoverEffect;
                            nextLayer.disableIdleAnimation = paramsToPaste.disableIdleAnimation;
                            nextLayer.shadow = paramsToPaste.shadow;
                            nextLayer.border = paramsToPaste.border;
                            nextLayer.stickToBottom = paramsToPaste.stickToBottom;
                            nextLayer.mobileEnabled = paramsToPaste.mobileEnabled;
                            nextLayer.mobilePosX = paramsToPaste.mobilePosX;
                            nextLayer.mobilePosY = paramsToPaste.mobilePosY;
                            nextLayer.mobileSize = paramsToPaste.mobileSize;
                            nextLayer.mobileRotation = paramsToPaste.mobileRotation;
                            nextLayer.mobileStickToBottom = paramsToPaste.mobileStickToBottom;

                            // Apply to all secondaries
                            if (nextLayer.graphicObjects) {
                              nextLayer.graphicObjects = nextLayer.graphicObjects.map((g: any) => ({
                                ...g,
                                ...paramsToPaste
                              }));
                            }

                            return {
                              ...prev,
                              [activeLayerKey]: nextLayer,
                              ...(activeLayerId === "mid" ? paramsToPaste : {})
                            };
                          });
                        }}
                        className="px-2 py-0.5 bg-brand-accent text-white hover:bg-black border border-brand-text text-[7px] font-black uppercase shadow-[1.5px_1.5px_0px_#050505] flex items-center gap-1"
                        title="Paste parameters to ALL graphics in this layer"
                      >
                        <Zap size={9} />
                        <span>PASTE TO ALL</span>
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={`relative select-none transition-shadow ${
                    item.border ? "border-3 sm:border-4 border-brand-text bg-brand-surface" : "bg-transparent border-0"
                  } ${
                    item.shadow ? "shadow-[8px_8px_0px_#050505]" : "shadow-none"
                  }`}
                  style={{
                    width: item.border || item.shadow ? `${Math.round(effectiveSize)}px` : "auto",
                    height: item.border || item.shadow ? `${Math.round(effectiveSize)}px` : "auto",
                    overflow: "visible",
                  }}
                >
                  <img 
                    src={item.avatarUrl} 
                    alt={item.avatarAlt || "Layer Graphic"} 
                    referrerPolicy="no-referrer"
                    style={{
                      width: `${Math.round(effectiveSize)}px`,
                      height: "auto",
                    }}
                    className={`${item.border || item.shadow ? "w-full h-full object-cover" : "object-contain"} select-none pointer-events-none drop-shadow-md`}
                  />

                  {config.showCoordinates && (
                    <>
                      <div className="absolute top-1 left-1.5 font-mono text-[7px] font-black text-black/60 bg-white/70 px-1 pointer-events-none">
                        +{effectivePosX}X{isMobileMode && item.mobileEnabled ? " (M)" : ""}
                      </div>
                      <div className="absolute bottom-1 right-1.5 font-mono text-[7px] font-black text-black/60 bg-white/70 px-1 pointer-events-none">
                        +{effectivePosY}Y
                      </div>
                    </>
                  )}
                </div>

                {(item.captionTitle || item.captionSubtitle) && (
                  <div className="mt-2 text-center pointer-events-none select-none max-w-xs space-y-0.5">
                    {item.captionTitle && (
                      <div className="inline-block px-2.5 py-0.5 bg-brand-text text-brand-bg font-mono text-[9px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#ff4500]">
                        {item.captionTitle}
                      </div>
                    )}
                    {item.captionSubtitle && (
                      <div className="font-mono text-[8px] font-bold uppercase tracking-widest text-brand-text/75 bg-brand-surface/90 px-2 py-0.5 border border-brand-text">
                        {item.captionSubtitle}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}


        {/* Independent Text Objects */}
        {(layer.textObjects || [])
          .filter(t => isItemVisible(t.deviceTarget))
          .map(textObj => {
            const effectivePosX = (isMobileMode && textObj.mobileEnabled && textObj.mobilePosX !== undefined) ? textObj.mobilePosX : textObj.posX;
            const effectivePosY = (isMobileMode && textObj.mobileEnabled && textObj.mobilePosY !== undefined) ? textObj.mobilePosY : textObj.posY;
            const effectiveFontSize = (isMobileMode && textObj.mobileEnabled && textObj.mobileFontSize !== undefined) ? textObj.mobileFontSize : (textObj.fontSize || 64);
            const effectiveRotation = (isMobileMode && textObj.mobileEnabled && textObj.mobileRotation !== undefined) ? textObj.mobileRotation : (textObj.rotation || 0);
            const effectiveLineHeight = (isMobileMode && textObj.mobileEnabled && textObj.mobileLineHeight !== undefined) ? textObj.mobileLineHeight : (textObj.lineHeight || 1.1);
            const effectiveLetterSpacing = (isMobileMode && textObj.mobileEnabled && textObj.mobileLetterSpacing !== undefined) ? textObj.mobileLetterSpacing : (textObj.letterSpacing || 0);

            return (
              <motion.div
                key={`${layer.id}-text-${textObj.id}-${previewKey}`}
                initial={getPreviewInitialVariants(textObj.transitionDirection || "fade")}
                animate={{
                  x: 0,
                  y: 0,
                  scale: 1,
                  opacity: textObj.opacity ?? 1,
                }}
                transition={getTransitionSettings(textObj.transitionSpeed || "smooth")}
                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${effectivePosX}%`,
                  top: `${effectivePosY}%`,
                  transform: `translate(-50%, -50%) rotate(${effectiveRotation}deg)`,
                  transformOrigin: "center",
                  zIndex: zIndex + 1,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick(0.06);
                  setActiveLayerId(layer.id);
                  updateProp("activeEditingLayer", layer.id);
                  setActiveObjectId(textObj.id);
                }}
              >
                <motion.div
                  animate={
                    !textObj.disableIdleAnimation && textObj.hoverEffect === "float"
                      ? { y: [0, -8, 0] }
                      : !textObj.disableIdleAnimation && textObj.hoverEffect === "pulse"
                      ? { scale: [1, 1.05, 1] }
                      : {}
                  }
                  transition={{
                    repeat: Infinity,
                    duration: textObj.hoverEffect === "float" ? 3.6 : 2.4,
                    ease: "easeInOut",
                  }}
                  className="whitespace-pre-line font-mono pointer-events-auto relative"
                  style={{
                    fontSize: `${effectiveFontSize}px`,
                    color: textObj.color || "#050505",
                    textAlign: textObj.textAlign || "center",
                    lineHeight: effectiveLineHeight,
                    letterSpacing: `${effectiveLetterSpacing}px`,
                    fontWeight: textObj.fontWeight || 900,
                    textTransform: textObj.textTransform || "none",
                    fontStyle: textObj.italic ? "italic" : "normal",
                  }}
                >
                  {isActiveLayer && activeObjectId === textObj.id && (
                    <div className="absolute -inset-2 border-2 border-dashed border-brand-accent pointer-events-none animate-pulse">
                      <span className="absolute -top-3.5 left-0 bg-brand-accent text-white font-mono text-[7px] font-black uppercase px-1">
                        {isMobileMode ? "📱 MOBILE TEXT" : "💻 PC TEXT"}
                      </span>
                    </div>
                  )}
                  {textObj.text}
                </motion.div>
              </motion.div>
            );
          })}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center font-mono">
        <RefreshCw size={24} className="animate-spin text-brand-accent mx-auto mb-3" />
        <p className="text-xs font-black uppercase tracking-widest text-brand-text/60">
          INITIALIZING HERO STUDIO CONTROLS...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] h-screen w-full overflow-hidden bg-brand-bg font-mono text-brand-text select-none flex flex-col">
      {/* Floating Top-Left Architectural HUD Badge */}
      <div className="fixed top-20 left-2 right-4 sm:right-auto z-[120] flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 bg-brand-surface/95 backdrop-blur-md border-2 border-brand-text p-1.5 sm:px-3 sm:py-1.5 shadow-[3px_3px_0px_#050505] max-w-[calc(100vw-1rem)] font-mono">
        {/* Back / Close button */}
        {(onClose || onTabChange) && (
          <button
            type="button"
            onClick={async () => {
              soundManager.playClick(0.08);
              await saveHeroConfig(config, userEmail, true);
              if (onTabChange) onTabChange("artifacts");
              else if (onClose) onClose();
            }}
            className="p-1 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border border-brand-text transition-colors cursor-pointer shrink-0"
            title="Exit Studio / Back to Archive"
          >
            <ArrowLeft size={13} />
          </button>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5 border-r border-brand-text/20 pr-1.5 sm:pr-2.5 shrink-0">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#FF4500] animate-pulse rounded-none shrink-0" />
          <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider text-brand-text">
            <span className="hidden xs:inline">HERO </span>CANVAS
          </span>
          <span className="hidden sm:inline-block text-[7.5px] font-black uppercase px-1.5 py-0.2 bg-[#FF4500] text-white">
            LIVE STAGE
          </span>
        </div>

        {/* Quick PC / Mobile Viewport Toggle */}
        <div className="flex items-center border border-brand-text bg-brand-surface shadow-[1px_1px_0px_#050505] shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick(0.06);
              setPreviewDeviceMode("desktop");
            }}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider cursor-pointer ${
              previewDeviceMode === "desktop"
                ? "bg-brand-text text-brand-bg"
                : "text-brand-text/60 hover:text-brand-text"
            }`}
            title="Desktop PC mode"
          >
            <Monitor size={10} />
            <span>PC</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick(0.06);
              setPreviewDeviceMode("mobile");
            }}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider cursor-pointer border-l border-brand-text ${
              previewDeviceMode === "mobile"
                ? "bg-[#FF4500] text-white"
                : "text-brand-text/60 hover:text-brand-text"
            }`}
            title="Mobile Phone mode"
          >
            <Smartphone size={10} />
            <span>MOBILE</span>
          </button>
        </div>

        {/* Active Position Info HUD */}
        <div className="hidden md:flex items-center gap-2 text-[9px] font-mono text-brand-text/70 uppercase">
          <span className="w-1.5 h-1.5 bg-brand-text rounded-full" />
          <span>
            {previewDeviceMode === "mobile" ? (
              <span className="text-[#FF4500] font-black">
                [📱 MOBILE] POS: X:{getActiveObjectValue("mobilePosX", getActiveObjectValue("posX", 50))}%, Y:{getActiveObjectValue("mobilePosY", getActiveObjectValue("posY", 50))}%
              </span>
            ) : (
              <span>
                [💻 PC] POS: X:<strong className="text-[#FF4500]">{getActiveObjectValue("posX", 50)}%</strong>, Y:<strong className="text-[#FF4500]">{getActiveObjectValue("posY", 50)}%</strong>
              </span>
            )}
          </span>
        </div>

        {/* Quick Action Triggers */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReplayAnimation}
            className="p-1 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text text-[9px] font-black uppercase transition-colors cursor-pointer"
            title="Replay Motion Transition"
          >
            <Play size={11} className="text-[#FF4500] fill-[#FF4500]" />
          </button>
          <button
            type="button"
            onClick={handleSummonGraphics}
            disabled={isSaving}
            className="p-1 bg-amber-500 hover:bg-black text-black hover:text-white border border-brand-text text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1 px-2 shadow-[1px_1px_0px_#050505] disabled:opacity-50"
            title="Summon all repo graphics (code/directory assets) into Studio Hero"
          >
            <Sparkles size={11} className="text-black group-hover:text-white" />
            <span className="font-bold">SUMMON GRAPHICS</span>
          </button>
          <button
            type="button"
            onClick={() => downloadHeroConfigJson(config)}
            className="p-1 bg-brand-surface hover:bg-[#FF4500] hover:text-white border border-brand-text text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1 px-1.5"
            title="Export hero-config.json"
          >
            <Download size={11} />
            <span className="hidden sm:inline">EXPORT</span>
          </button>
          <button
            type="button"
            onClick={() => jsonFileInputRef.current?.click()}
            className="p-1 bg-brand-accent text-white hover:bg-black border border-brand-text text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1 px-1.5 shadow-[1px_1px_0px_#050505]"
            title="Upload saved JSON file directly into Database and apply to Main Hero"
          >
            <Upload size={11} />
            <span className="hidden sm:inline">UPLOAD JSON</span>
          </button>
          <input 
            ref={jsonFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJsonFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-0.5 bg-[#FF4500] hover:bg-black text-white border border-brand-text text-[8.5px] font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : saveSuccess ? "SAVED!" : "SAVE"}
          </button>
          {onViewStorefront && (
            <button
              type="button"
              onClick={async () => {
                await saveHeroConfig(config, userEmail, true);
                onViewStorefront();
              }}
              className="p-1 bg-brand-text text-brand-bg hover:bg-[#FF4500] hover:text-white border border-brand-text transition-colors cursor-pointer"
              title="View Live Storefront (Saves changes)"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Thin Orange Strip Docked on Right Edge (#FF4500) */}
      <div
        onClick={() => {
          soundManager.playClick(0.08);
          setIsSidePanelOpen((prev) => !prev);
        }}
        onMouseEnter={() => {
          if (!isSidePanelOpen) setIsSidePanelOpen(true);
        }}
        className="fixed right-0 top-0 bottom-0 z-[140] w-3.5 hover:w-10 bg-[#FF4500] transition-all duration-200 cursor-pointer flex flex-col items-center justify-between py-6 border-l-2 border-brand-text shadow-[-4px_0px_14px_rgba(255,69,0,0.5)] group select-none"
        title="Hover or click thin orange strip to expand Studio Controls"
      >
        <div className="w-2 h-2 bg-white border border-black animate-ping" />
        
        <div 
          className="font-mono text-[9px] font-black tracking-widest text-white uppercase opacity-90 group-hover:opacity-100 transition-opacity whitespace-nowrap"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
          }}
        >
          // STUDIO CONTROLS [CLICK TO EXPAND]
        </div>

        <Sliders size={13} className="text-white group-hover:scale-125 transition-transform" />
      </div>

      {/* Main Full-Height Edge-to-Edge Hero Canvas Stage */}
      <div className="relative w-full h-screen flex-1 overflow-hidden select-none cursor-crosshair group flex items-center justify-center top-0 bottom-0">
        {/* Canvas Box (Responsive PC / Smartphone frame stretching top to bottom) */}
        <div className={previewDeviceMode === "mobile" ? "h-full w-full max-w-[420px] mx-auto py-2 px-3 flex flex-col" : "h-full w-full relative"}>
          {/* Simulated Smartphone Header Notch */}
          {previewDeviceMode === "mobile" && (
            <div className="bg-brand-surface border-x-4 border-t-4 border-brand-text rounded-t-3xl pt-2 pb-1 px-4 flex items-center justify-between shadow-[4px_4px_0px_#050505] shrink-0">
              <span className="text-[7.5px] font-black uppercase tracking-widest text-brand-text/60">390 × 844</span>
              <div className="flex items-center gap-1.5">
                <div className="w-14 h-1.5 bg-brand-text rounded-full" />
                <div className="w-2 h-2 rounded-full bg-[#FF4500]" />
              </div>
              <span className="text-[7.5px] font-black uppercase text-[#FF4500] font-mono">PHONE STAGE</span>
            </div>
          )}

          <div 
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`relative w-full h-full flex-1 transition-all duration-300 ${
              config.showCanvasBoundingBox !== false 
                ? "bg-brand-surface/90 border-brand-text shadow-[0_6px_0px_#050505]" 
                : "bg-transparent border-0 shadow-none"
            } ${previewDeviceMode === "mobile" ? "border-x-4 border-b-4 border-brand-text rounded-b-3xl shadow-[6px_6px_0px_#050505]" : "border-0"} ${config.canvasOverflowVisible !== false ? "overflow-visible" : "overflow-hidden"} select-none cursor-crosshair group`}
            style={{
              ...(config.showCanvasBoundingBox !== false ? {
                backgroundImage: `radial-gradient(rgba(5, 5, 5, ${config.gridOpacity ?? 0.12}) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
                backgroundPosition: "center center",
              } : {})
            }}
          >
            {/* Architectural Grid Markers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-25 flex items-center justify-center">
                <div className="w-full h-[1px] bg-brand-text" />
                <div className="h-full w-[1px] bg-brand-text absolute" />
              </div>
            </div>

            {/* 3-Layer Animated Avatar Graphic Preview (BG, MID, FG) + Backdrop */}
            {config.isEnabled && (
              <>
                {/* Backdrop Layer (Z-0) */}
                {renderStudioBackdrop(config.backdrop)}

                {/* Background Layer (Z-10) */}
                {renderStudioPreviewLayer(config.bgLayer, 10)}

                {/* Avatar Layer (Z-20) */}
                {renderStudioPreviewLayer(config.midLayer, 20)}

                {/* Foreground Layer (Z-30) */}
                {renderStudioPreviewLayer(config.fgLayer, 30)}

                {/* Hero Action Buttons Layer (Z-40) */}
                {config.heroButtons?.showButtons !== false && (() => {
                  const isMobileMode = previewDeviceMode === "mobile";
                  const target = config.heroButtons?.deviceTarget || "both";
                  const isVisible = target === "both" || (isMobileMode ? target === "mobile" : target === "desktop");
                  if (!isVisible) return null;

                  const buttonsPosX = (isMobileMode && config.heroButtons?.mobileEnabled && config.heroButtons?.mobilePosX !== undefined)
                    ? config.heroButtons.mobilePosX
                    : (config.heroButtons?.posX ?? 50);
                  const buttonsPosY = (isMobileMode && config.heroButtons?.mobileEnabled && config.heroButtons?.mobilePosY !== undefined)
                    ? config.heroButtons.mobilePosY
                    : (config.heroButtons?.posY ?? 85);

                  return (
                    <div
                      key="studio-hero-buttons"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick(0.06);
                        setActiveObjectId("hero_buttons");
                      }}
                      className="absolute z-40 flex flex-col sm:flex-row items-center gap-2 cursor-grab active:cursor-grabbing pointer-events-auto select-none"
                      style={{
                        left: `${buttonsPosX}%`,
                        top: `${buttonsPosY}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                    >
                      {activeObjectId === "hero_buttons" && (
                        <div className="absolute -inset-3 rounded-sm border-2 border-dashed border-[#FF4500] pointer-events-none animate-pulse z-50">
                          <span className="absolute -top-3.5 left-1 bg-[#FF4500] text-white font-mono text-[7.5px] font-black uppercase px-1">
                            EDITING HERO BUTTONS [{isMobileMode ? "📱 MOBILE" : "💻 PC"} X:{buttonsPosX}%, Y:{buttonsPosY}%]
                          </span>
                        </div>
                      )}
                      <div className="px-4 py-2 bg-[#FF4500] text-white font-mono text-[10px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505]">
                        {config.heroButtons?.button1Label || "ABOUT THE MARK"}
                      </div>
                      <div className="px-4 py-2 bg-brand-surface text-brand-text font-mono text-[10px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505]">
                        {config.heroButtons?.button2Label || "MANIFESTO"}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Bottom Floating Canvas Helper Tooltip */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-brand-bg/95 border-2 border-brand-text px-3.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#050505] pointer-events-none flex items-center gap-1.5 whitespace-nowrap z-40">
              <Move size={10} className="text-[#FF4500] animate-pulse" />
              <span>DRAG TO RELOCATE GRAPHICS ({previewDeviceMode === "mobile" ? "📱 MOBILE POSITION" : "💻 PC POSITION"})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Docked Hover-to-Expand Side Panel Drawer */}
      <HeroSidePanel
        config={config}
        onUpdateConfig={setConfig}
        userEmail={userEmail}
        isOpenControlled={isSidePanelOpen}
        onToggleControlled={() => setIsSidePanelOpen((prev) => !prev)}
        activeObjectId={activeObjectId}
        onActiveObjectChange={setActiveObjectId}
        deviceEditMode={previewDeviceMode}
        onDeviceEditModeChange={setPreviewDeviceMode}
      />
    </div>
  );
}
