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
  Smartphone
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
  DeviceTarget
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
  saveHeroConfig, 
  resetHeroConfig 
} from "../lib/heroService";
import { processFileToCompressedDataUrl } from "../lib/imageOptimization";
import { soundManager } from "../lib/soundEffects";
import LiquidCarveButton from "./LiquidCarveButton";
import HeroSidePanel from "./HeroSidePanel";

interface OwnerHeroManagerProps {
  onViewStorefront?: () => void;
  userEmail?: string;
}


export default function OwnerHeroManager({ onViewStorefront, userEmail }: OwnerHeroManagerProps) {
  const [config, setConfig] = useState<CustomHeroConfig>(DEFAULT_HERO_CONFIG);
  const [activeLayerId, setActiveLayerId] = useState<HeroLayerId>("mid");
  const [activeObjectId, setActiveObjectId] = useState<string>("graphic");
  const [previewDeviceMode, setPreviewDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
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
      saveHeroConfig(nextConfig, userEmail).catch(() => {});
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
    setConfig((prev) => {
      const nextConfig = { ...prev, [key]: value };
      saveHeroConfig(nextConfig, userEmail).catch(() => {});
      return nextConfig;
    });
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

  // Handle image upload from computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    soundManager.playClick(0.1);
    try {
      const compressedDataUrl = await processFileToCompressedDataUrl(file, 1600, 0.9);
      updateLayerProps({
        avatarUrl: compressedDataUrl,
        avatarAlt: file.name.replace(/\.[^/.]+$/, ""),
        isEnabled: true,
      });
      handleReplayAnimation();
    } catch (err: any) {
      alert("Failed to read image file: " + (err?.message || "Invalid file format"));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };


  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      await saveHeroConfig(config, userEmail, true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save hero error:", err);
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
          const effectiveStickBottom = (isMobileMode && item.mobileEnabled && item.mobileStickToBottom !== undefined) ? item.mobileStickToBottom : defaultLayerStickBottom;

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

        {/* Minimal Brutalist Slide Counter / Dots Indicator in Studio Preview */}
        {isSlideshowActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-auto bg-brand-bg/80 border border-brand-text px-2 py-1 shadow-[2px_2px_0px_#050505]">
            <span className="font-mono text-[7.5px] font-black uppercase text-brand-text/70 mr-1">SLIDES:</span>
            {visibleGraphics.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStudioSlideIndices(prev => ({ ...prev, [layer.id]: idx }));
                  setActiveLayerId(layer.id);
                  setActiveObjectId(item.id);
                  soundManager.playClick(0.06);
                }}
                className={`transition-all cursor-pointer ${
                  safeSlideIdx === idx
                    ? "w-6 h-1.5 bg-brand-accent shadow-[1px_1px_0px_#050505]"
                    : "w-2 h-1.5 bg-brand-text/30 hover:bg-brand-text/60"
                }`}
                title={`Studio Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
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
    <div className="flex-1 overflow-y-auto font-mono text-brand-text bg-brand-bg pb-24">
      {/* Studio Header Bar (Minimized) */}
      <div className="bg-brand-surface border-b-2 border-brand-text px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30 shadow-[0_2px_0px_#050505]">
        <div className="flex items-center gap-2">
          <Compass size={15} className="text-brand-accent" />
          <h2 className="font-black text-xs sm:text-sm uppercase tracking-wider text-brand-text">
            CUSTOM HERO CANVAS // CONTROLLER
          </h2>
          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-brand-accent text-white border border-brand-text">
            LIVE STAGE
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick PC / Mobile Viewport Toggle */}
          <div className="flex items-center border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505]">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.06);
                setPreviewDeviceMode("desktop");
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                previewDeviceMode === "desktop"
                  ? "bg-brand-text text-brand-bg shadow-inner"
                  : "text-brand-text/70 hover:text-brand-text hover:bg-black/5"
              }`}
              title="Preview and edit desktop/PC layout"
            >
              <Monitor size={12} />
              <span className="hidden sm:inline">PC STAGE</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.06);
                setPreviewDeviceMode("mobile");
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-l-2 border-brand-text ${
                previewDeviceMode === "mobile"
                  ? "bg-brand-accent text-white shadow-inner"
                  : "text-brand-text/70 hover:text-brand-text hover:bg-black/5"
              }`}
              title="Preview and edit mobile phone layout"
            >
              <Smartphone size={12} />
              <span className="hidden sm:inline">MOBILE PHONE</span>
            </button>
          </div>

          {/* Quick Hover/Click Side Panel Toggle */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick(0.08);
              setIsSidePanelOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 border-2 border-brand-text text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
              isSidePanelOpen ? "bg-brand-text text-brand-bg border-brand-accent" : "bg-brand-surface hover:bg-brand-text hover:text-brand-bg"
            }`}
            title="Hover right edge tab or click to toggle Side Panel Controls"
          >
            <Sliders size={12} className="text-brand-accent" />
            <span>{isSidePanelOpen ? "CLOSE CONTROLS" : "HOVER / CONTROLS"}</span>
          </button>

          <button
            type="button"
            onClick={handleReplayAnimation}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Replay Entrance Transition"
          >
            <Play size={12} className="text-brand-accent fill-brand-accent" />
            <span>REPLAY MOTION</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-surface hover:bg-red-600 hover:text-white border-2 border-brand-text text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            title="Reset to Defaults"
          >
            <RotateCcw size={12} />
            <span>RESET</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-accent hover:bg-neutral-900 text-white border-2 border-brand-text text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={14} />
            ) : (
              <ShieldCheck size={14} />
            )}
            <span>{isSaving ? "DEPLOYING..." : saveSuccess ? "DEPLOYED!" : "SAVE & DEPLOY"}</span>
          </button>

          {onViewStorefront && (
            <button
              type="button"
              onClick={onViewStorefront}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border-2 border-brand-text text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505] transition-all cursor-pointer"
            >
              <span>VIEW STORE</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Studio Content */}
      <div className="flex flex-col">

        {/* Live Interactive Hero Stage */}
        <div className="space-y-3 pb-8">
          <div className="px-4 sm:px-8 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-brand-accent animate-pulse" />
                <h3 className="font-black text-xs uppercase tracking-wider text-brand-text">
                  LIVE INTERACTIVE HERO STAGE (DRAG TO POSITION)
                </h3>

                {/* Sub-toggle for PC / Mobile */}
                <div className="flex items-center border border-brand-text bg-brand-surface shadow-[1px_1px_0px_#050505] ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.06);
                      setPreviewDeviceMode("desktop");
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider cursor-pointer ${
                      previewDeviceMode === "desktop" ? "bg-brand-text text-brand-bg" : "text-brand-text/60 hover:text-brand-text"
                    }`}
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
                    className={`flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider cursor-pointer border-l border-brand-text ${
                      previewDeviceMode === "mobile" ? "bg-brand-accent text-white" : "text-brand-text/60 hover:text-brand-text"
                    }`}
                  >
                    <Smartphone size={10} />
                    <span>MOBILE</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-brand-text/60 font-bold uppercase">
                <span>
                  ACTIVE: <strong className="text-brand-accent">{activeLayerId.toUpperCase()}</strong> : <strong className="text-brand-accent">{isMainGraphic ? "MAIN GRAPHIC" : selectedSecondaryGraphic ? "SECONDARY GRAPHIC" : activeObjectId === "hero_buttons" ? "HERO BUTTONS" : "TEXT"}</strong>
                </span>
                <span>
                  {previewDeviceMode === "mobile" ? (
                    <span className="inline-flex items-center gap-1 text-brand-accent font-black">
                      [📱 MOBILE] POS: X: <strong>{getActiveObjectValue("mobilePosX", getActiveObjectValue("posX", 50))}%</strong>, Y: <strong>{getActiveObjectValue("mobilePosY", getActiveObjectValue("posY", 50))}%</strong>
                    </span>
                  ) : (
                    <span>
                      [💻 PC] POS: X: <strong className="text-brand-accent">{getActiveObjectValue("posX", 50)}%</strong>, Y: <strong className="text-brand-accent">{getActiveObjectValue("posY", 50)}%</strong>
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Canvas Box Simulator (Responsive PC / Smartphone frame) */}
          <div className={previewDeviceMode === "mobile" ? "max-w-[420px] mx-auto px-4" : "w-full"}>
            {/* Simulated Smartphone Header Notch */}
            {previewDeviceMode === "mobile" && (
              <div className="bg-brand-surface border-x-4 border-t-4 border-brand-text rounded-t-3xl pt-2.5 pb-1 px-4 flex items-center justify-between shadow-[6px_6px_0px_#050505]">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-brand-text/60">390 × 844</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-2 bg-brand-text rounded-full" />
                  <div className="w-2 h-2 rounded-full bg-brand-accent/80" />
                </div>
                <span className="text-[7.5px] font-black uppercase text-brand-accent font-mono">PHONE LIVE</span>
              </div>
            )}

            <div 
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`relative w-full transition-all duration-300 ${
                config.showCanvasBoundingBox !== false 
                  ? "bg-brand-surface/90 border-y-[3px] border-brand-text shadow-[0_6px_0px_#050505]" 
                  : "bg-transparent border-0 shadow-none"
              } ${previewDeviceMode === "mobile" ? "border-x-4 border-b-4 border-brand-text rounded-b-3xl shadow-[6px_6px_0px_#050505]" : ""} ${config.canvasOverflowVisible !== false ? "overflow-visible" : "overflow-hidden"} select-none cursor-crosshair group`}
              style={{
                minHeight: previewDeviceMode === "mobile" ? "560px" : `${Math.max(480, Math.min(800, config.canvasHeight || 700))}px`,
                height: previewDeviceMode === "mobile" ? "580px" : `${config.canvasHeight || 700}px`,
                ...(config.showCanvasBoundingBox !== false ? {
                  backgroundImage: "radial-gradient(#050505 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  backgroundPosition: "center center",
                } : {})
              }}
            >
              {/* Architectural Border */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Center Crosshair Marker */}
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
                          <div className="absolute -inset-3 rounded-sm border-2 border-dashed border-brand-accent pointer-events-none animate-pulse z-50">
                            <span className="absolute -top-3.5 left-1 bg-brand-accent text-white font-mono text-[7.5px] font-black uppercase px-1">
                              EDITING HERO BUTTONS [{isMobileMode ? "📱 MOBILE" : "💻 PC"} X:{buttonsPosX}%, Y:{buttonsPosY}%]
                            </span>
                          </div>
                        )}
                        <div className="px-4 py-2 bg-brand-accent text-white font-mono text-[10px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505]">
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
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brand-bg/95 border-2 border-brand-text px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_#050505] pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
                <Move size={10} className="text-brand-accent animate-pulse" />
                <span>DRAG TO RELOCATE ({previewDeviceMode === "mobile" ? "📱 MOBILE POSITION" : "💻 PC POSITION"})</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Docked Hover-to-Expand Side Panel */}
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
