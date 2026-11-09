import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, Sparkles, Move, Compass, ChevronDown, ArrowRight, BookOpen } from "lucide-react";
import HeroArchived, { HeroProps as ArchivedHeroProps, CountUpNumber } from "./HeroArchived";
import { CustomHeroConfig, HeroLayerConfig, HeroTransitionDirection, HeroTransitionSpeed, HeroHoverEffect } from "../types";
import { DEFAULT_HERO_CONFIG, getHeroConfig, getCachedHeroConfig, calculateAdaptiveStageHeight } from "../lib/heroService";
import { useAuth } from "../lib/AuthContext";
import { soundManager } from "../lib/soundEffects";

// Re-export all archived items and components for backend preservation
export { HeroArchived, CountUpNumber };

export interface HeroProps {
  onExplore?: () => void;
  onAbout?: () => void;
  onWhy?: () => void;
  onProductClick?: (p: any) => void;
  onOpenOwnerManager?: () => void;
}

/**
 * Calculates initial entrance position for the avatar graphic
 * based on the admin's chosen transition direction.
 */
function getEntranceInitial(dir: HeroTransitionDirection) {
  switch (dir) {
    case "bottom":
      return { y: "40vh", opacity: 0, scale: 0.96 };
    case "top":
      return { y: "-40vh", opacity: 0, scale: 0.96 };
    case "left":
      return { x: "-40vw", opacity: 0, scale: 0.96 };
    case "right":
      return { x: "40vw", opacity: 0, scale: 0.96 };
    case "scale":
      return { scale: 0.8, opacity: 0 };
    case "fade":
    default:
      return { opacity: 0, scale: 0.98 };
  }
}

function getExitInitial(dir: HeroTransitionDirection) {
  switch (dir) {
    case "bottom":
      return { y: "40vh", opacity: 0, scale: 0.96 };
    case "top":
      return { y: "-40vh", opacity: 0, scale: 0.96 };
    case "left":
      return { x: "40vw", opacity: 0, scale: 0.96 };
    case "right":
      return { x: "-40vw", opacity: 0, scale: 0.96 };
    case "scale":
      return { scale: 0.8, opacity: 0 };
    case "fade":
    default:
      return { opacity: 0, scale: 0.98 };
  }
}

function getSlideshowTransitionSettings(mode?: "fade" | "slide-horizontal" | "slide-vertical" | "zoom") {
  switch (mode) {
    case "slide-horizontal":
      return {
        initial: { x: "25vw", opacity: 0, scale: 0.98 },
        exit: { x: "-25vw", opacity: 0, scale: 0.98 },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "slide-vertical":
      return {
        initial: { y: "25vh", opacity: 0, scale: 0.98 },
        exit: { y: "-25vh", opacity: 0, scale: 0.98 },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "zoom":
      return {
        initial: { scale: 0.88, opacity: 0 },
        exit: { scale: 1.08, opacity: 0 },
        transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0, scale: 0.98 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.65, ease: "easeInOut" as const },
      };
  }
}

/**
 * Calculates transition timing and easing based on the selected speed mode
 */
function getTransitionSettings(speed: HeroTransitionSpeed, delay: number = 0.15) {
  switch (speed) {
    case "snappy":
      return { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const, delay };
    case "smooth":
      return { duration: 0.95, ease: [0.25, 0.1, 0.25, 1] as const, delay };
    case "dramatic":
      return { duration: 1.45, ease: [0.16, 1, 0.3, 1] as const, delay };
    case "spring":
    default:
      return { type: "spring" as const, stiffness: 300, damping: 22, delay };
  }
}

/**
 * Renders the backdrop layer (full width behind everything)
 */
function renderBackdrop(backdrop?: CustomHeroConfig["backdrop"]) {
  if (!backdrop || !backdrop.isEnabled || !backdrop.imageUrl) return null;
  return (
    <div 
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ opacity: backdrop.opacity ?? 1 }}
    >
      <img 
        src={backdrop.imageUrl} 
        alt="Hero Backdrop" 
        className="w-full h-full object-cover select-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

/**
 * Layer Graphic Renderer with slideshow animation support and responsive mobile transforms
 */
interface LayerGraphicSlideProps {
  item: {
    id: string;
    avatarUrl: string;
    avatarAlt?: string;
    posX: number;
    posY: number;
    size: number;
    rotation?: number;
    opacity?: number;
    transitionDirection?: HeroTransitionDirection;
    transitionSpeed?: HeroTransitionSpeed;
    transitionDelay?: number;
    hoverEffect?: HeroHoverEffect;
    disableIdleAnimation?: boolean;
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
    mobileStickToBottom?: boolean;
  };
  zIndex: number;
  showCoordinates?: boolean;
  elementRef?: React.Ref<HTMLDivElement>;
  isSlideshow?: boolean;
  slideshowTransition?: "fade" | "slide-horizontal" | "slide-vertical" | "zoom";
  stickToBottom?: boolean;
  isMobile?: boolean;
}

function LayerGraphicItem({ 
  item, 
  zIndex, 
  showCoordinates, 
  elementRef, 
  isSlideshow, 
  slideshowTransition, 
  stickToBottom,
  isMobile 
}: LayerGraphicSlideProps) {
  // Check device target visibility
  const target = item.deviceTarget || "both";
  if (target === "desktop" && isMobile) return null;
  if (target === "mobile" && !isMobile) return null;

  // Resolve responsive coordinates & size
  const useMobile = Boolean(isMobile && item.mobileEnabled);
  const finalPosX = useMobile ? (item.mobilePosX ?? item.posX) : item.posX;
  const finalPosY = useMobile ? (item.mobilePosY ?? item.posY) : item.posY;
  const finalSize = useMobile ? (item.mobileSize ?? item.size) : item.size;
  const finalRotation = useMobile ? (item.mobileRotation ?? item.rotation ?? 0) : (item.rotation ?? 0);
  const finalStickToBottom = useMobile 
    ? Boolean(item.mobileStickToBottom ?? stickToBottom) 
    : Boolean(stickToBottom);

  const slideSettings = isSlideshow ? getSlideshowTransitionSettings(slideshowTransition) : null;
  
  const initialAnim = slideSettings 
    ? slideSettings.initial 
    : getEntranceInitial(item.transitionDirection || "bottom");

  const exitAnim = slideSettings 
    ? slideSettings.exit 
    : getExitInitial(item.transitionDirection || "bottom");

  const animTransition = slideSettings 
    ? slideSettings.transition 
    : getTransitionSettings(item.transitionSpeed || "spring", item.transitionDelay || 0.15);

  return (
    <motion.div
      ref={elementRef}
      key={item.id}
      initial={initialAnim}
      animate={{
        x: 0,
        y: 0,
        scale: 1,
        opacity: item.opacity ?? 1,
      }}
      exit={exitAnim}
      transition={animTransition}
      className="absolute flex flex-col items-center select-none"
      style={
        finalStickToBottom
          ? {
              left: `${finalPosX}%`,
              bottom: isMobile ? "5px" : "0",
              top: "auto",
              transform: `translateX(-50%) rotate(${finalRotation}deg)`,
              transformOrigin: "bottom center",
              zIndex: zIndex,
            }
          : {
              left: `${finalPosX}%`,
              top: `${finalPosY}%`,
              transform: `translate(-50%, -50%) rotate(${finalRotation}deg)`,
              transformOrigin: "center",
              zIndex: zIndex,
            }
      }
    >
      <motion.div
        animate={
          !item.disableIdleAnimation && item.hoverEffect === "float"
            ? { y: [0, -10, 0] }
            : !item.disableIdleAnimation && item.hoverEffect === "pulse"
            ? { scale: [1, 1.025, 1] }
            : {}
        }
        transition={{
          repeat: !item.disableIdleAnimation ? Infinity : 0,
          duration: item.hoverEffect === "float" ? 3.5 : 2.5,
          ease: "easeInOut",
        }}
        whileHover={
          item.hoverEffect === "tilt"
            ? { scale: 1.04, rotate: finalRotation + 5 }
            : { scale: 1.02 }
        }
        onMouseEnter={() => soundManager.playHover(0.04)}
        className="flex flex-col items-center"
      >
        <div
          className={`relative select-none transition-all duration-300 ${
            item.border ? "border-3 sm:border-4 border-brand-text bg-brand-surface" : "bg-transparent border-0"
          } ${
            item.shadow ? "shadow-[8px_8px_0px_#050505] hover:shadow-[12px_12px_0px_#050505]" : "shadow-none"
          }`}
          style={{
            width: item.border || item.shadow ? `clamp(30px, ${finalSize}px, 92vw)` : "auto",
            height: item.border || item.shadow ? `clamp(30px, ${finalSize}px, 92vw)` : "auto",
            overflow: "visible",
          }}
        >
          <img 
            src={item.avatarUrl} 
            alt={item.avatarAlt || "SYMBOLIC Hero Graphic"} 
            referrerPolicy="no-referrer"
            style={{
              width: `clamp(30px, ${finalSize}px, 92vw)`,
              height: "auto",
            }}
            className={`${item.border || item.shadow ? "w-full h-full object-cover" : "object-contain"} select-none pointer-events-none drop-shadow-lg`}
          />

          {showCoordinates && (
            <>
              <div className="absolute top-1 left-1.5 font-mono text-[7px] sm:text-[8px] font-black text-black/70 bg-white/75 px-1 pointer-events-none">
                +{finalPosX}X
              </div>
              <div className="absolute bottom-1 right-1.5 font-mono text-[7px] sm:text-[8px] font-black text-black/70 bg-white/75 px-1 pointer-events-none">
                +{finalPosY}Y
              </div>
            </>
          )}
        </div>

        {(item.captionTitle || item.captionSubtitle) && (
          <div className="mt-3 text-center pointer-events-none select-none max-w-xs space-y-1">
            {item.captionTitle && (
              <div className="inline-block px-3 py-1 bg-brand-text text-brand-bg font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-2 border-brand-text shadow-[2.5px_2.5px_0px_#ff4500]">
                {item.captionTitle}
              </div>
            )}
            {item.captionSubtitle && (
              <div className="font-mono text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest text-brand-text/75 bg-brand-surface/90 px-2.5 py-0.5 border border-brand-text/40 shadow-sm">
                {item.captionSubtitle}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * Renders an individual hero layer (Background, Middle, or Foreground)
 * Automatically supports Slideshow Cycling when layer.slideshowEnabled is true
 * and respects deviceTarget (PC/Mobile/Both) and separate mobile transforms.
 */
function SingleLayerRenderer({
  layer, 
  zIndex = 20, 
  showCoordinates,
  elementRef,
  isMobile
}: {
  layer?: HeroLayerConfig;
  zIndex?: number;
  showCoordinates?: boolean;
  elementRef?: React.Ref<HTMLDivElement>;
  isMobile?: boolean;
}) {
  const [slideIndex, setSlideIndex] = useState(0);

  // Gather all graphics available in this layer
  const allGraphics: Array<{
    id: string;
    avatarUrl: string;
    avatarAlt?: string;
    posX: number;
    posY: number;
    size: number;
    rotation?: number;
    opacity?: number;
    transitionDirection?: HeroTransitionDirection;
    transitionSpeed?: HeroTransitionSpeed;
    transitionDelay?: number;
    hoverEffect?: HeroHoverEffect;
    disableIdleAnimation?: boolean;
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
    mobileStickToBottom?: boolean;
  }> = [];

  if (layer?.avatarUrl) {
    allGraphics.push({
      id: `${layer.id}-main`,
      avatarUrl: layer.avatarUrl,
      avatarAlt: layer.avatarAlt,
      posX: layer.posX,
      posY: layer.posY,
      size: layer.size,
      rotation: layer.rotation,
      opacity: layer.opacity,
      transitionDirection: layer.transitionDirection,
      transitionSpeed: layer.transitionSpeed,
      transitionDelay: layer.transitionDelay,
      hoverEffect: layer.hoverEffect,
      disableIdleAnimation: layer.disableIdleAnimation,
      shadow: layer.shadow,
      border: layer.border,
      captionTitle: layer.captionTitle,
      captionSubtitle: layer.captionSubtitle,
      deviceTarget: layer.deviceTarget || "both",
      mobileEnabled: layer.mobileEnabled,
      mobilePosX: layer.mobilePosX,
      mobilePosY: layer.mobilePosY,
      mobileSize: layer.mobileSize,
      mobileRotation: layer.mobileRotation,
      mobileStickToBottom: layer.mobileStickToBottom,
    });
  }

  if (layer?.graphicObjects && layer.graphicObjects.length > 0) {
    layer.graphicObjects.forEach(g => {
      allGraphics.push({
        id: g.id,
        avatarUrl: g.avatarUrl,
        avatarAlt: g.avatarAlt,
        posX: g.posX,
        posY: g.posY,
        size: g.size,
        rotation: g.rotation,
        opacity: g.opacity,
        transitionDirection: g.transitionDirection,
        transitionSpeed: g.transitionSpeed,
        transitionDelay: g.transitionDelay,
        hoverEffect: g.hoverEffect,
        disableIdleAnimation: g.disableIdleAnimation,
        shadow: g.shadow,
        border: g.border,
        captionTitle: g.captionTitle,
        captionSubtitle: g.captionSubtitle,
        deviceTarget: g.deviceTarget || "both",
        mobileEnabled: g.mobileEnabled,
        mobilePosX: g.mobilePosX,
        mobilePosY: g.mobilePosY,
        mobileSize: g.mobileSize,
        mobileRotation: g.mobileRotation,
        mobileStickToBottom: g.mobileStickToBottom,
      });
    });
  }

  // Filter graphics by screen visibility (desktop vs mobile)
  const visibleGraphics = allGraphics.filter(g => {
    const target = g.deviceTarget || "both";
    if (target === "desktop" && isMobile) return false;
    if (target === "mobile" && !isMobile) return false;
    return true;
  });

  const isSlideshowActive = Boolean(layer?.slideshowEnabled !== false && visibleGraphics.length > 1);
  const intervalSeconds = Math.max(1, layer?.slideshowInterval || 4);

  const graphicsLenRef = useRef(visibleGraphics.length);
  graphicsLenRef.current = visibleGraphics.length;

  // Auto-cycle through visible graphics if slideshow is enabled
  useEffect(() => {
    if (!isSlideshowActive || graphicsLenRef.current <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % graphicsLenRef.current);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [isSlideshowActive, intervalSeconds]);

  // Keep slideIndex within bounds
  const safeSlideIndex = slideIndex % (visibleGraphics.length || 1);

  // Filter text objects by screen visibility
  const visibleTextObjects = (layer?.textObjects || []).filter(textObj => {
    const target = textObj.deviceTarget || "both";
    if (target === "desktop" && isMobile) return false;
    if (target === "mobile" && !isMobile) return false;
    return true;
  });

  const hasContent = visibleGraphics.length > 0 || visibleTextObjects.length > 0;
  if (!layer || !layer.isEnabled || !hasContent) return null;

  return (
    <React.Fragment key={layer.id}>
      {/* Graphic Elements: Either Slideshow Cycling or Static Array */}
      {isSlideshowActive ? (
        <>
          <AnimatePresence mode="wait">
            {visibleGraphics[safeSlideIndex] && (
              <LayerGraphicItem
                key={visibleGraphics[safeSlideIndex].id}
                item={visibleGraphics[safeSlideIndex]}
                zIndex={zIndex}
                showCoordinates={showCoordinates}
                elementRef={elementRef}
                isSlideshow={true}
                slideshowTransition={layer.slideshowTransition || "fade"}
                stickToBottom={layer.stickToBottom ?? (layer.id === "mid")}
                isMobile={isMobile}
              />
            )}
          </AnimatePresence>

          {/* Minimal Brutalist Slide Counter / Dots Indicator */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30 pointer-events-auto">
            {visibleGraphics.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSlideIndex(idx)}
                className={`transition-all cursor-pointer ${
                  safeSlideIndex === idx
                    ? "w-6 h-1.5 bg-brand-accent shadow-[1px_1px_0px_#050505]"
                    : "w-2 h-1.5 bg-brand-text/30 hover:bg-brand-text/60"
                }`}
                title={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {visibleGraphics.map((item, idx) => (
            <LayerGraphicItem
              key={item.id}
              item={item}
              zIndex={zIndex}
              showCoordinates={showCoordinates}
              elementRef={idx === 0 ? elementRef : undefined}
              isSlideshow={false}
              slideshowTransition={layer.slideshowTransition || "fade"}
              stickToBottom={idx === 0 ? (layer.stickToBottom ?? (layer.id === "mid")) : false}
              isMobile={isMobile}
            />
          ))}
        </>
      )}

      {/* Independent Text Objects with responsive mobile transforms */}
      {visibleTextObjects.map(textObj => {
        const useMobile = Boolean(isMobile && textObj.mobileEnabled);
        const finalPosX = useMobile ? (textObj.mobilePosX ?? textObj.posX) : textObj.posX;
        const finalPosY = useMobile ? (textObj.mobilePosY ?? textObj.posY) : textObj.posY;
        const finalFontSize = useMobile ? (textObj.mobileFontSize ?? textObj.fontSize) : textObj.fontSize;
        const finalRotation = useMobile ? (textObj.mobileRotation ?? textObj.rotation ?? 0) : (textObj.rotation ?? 0);
        const finalLineHeight = useMobile ? (textObj.mobileLineHeight ?? textObj.lineHeight ?? 1.1) : (textObj.lineHeight ?? 1.1);
        const finalLetterSpacing = useMobile ? (textObj.mobileLetterSpacing ?? textObj.letterSpacing ?? 0) : (textObj.letterSpacing ?? 0);

        return (
          <motion.div
            key={textObj.id}
            initial={getEntranceInitial(textObj.transitionDirection || "fade")}
            animate={{
              x: 0,
              y: 0,
              scale: 1,
              opacity: textObj.opacity ?? 1,
            }}
            transition={getTransitionSettings(textObj.transitionSpeed || "smooth", textObj.transitionDelay || 0.2)}
            className="absolute flex flex-col items-center select-none"
            style={{
              left: `${finalPosX}%`,
              top: `${finalPosY}%`,
              transform: `translate(-50%, -50%) rotate(${finalRotation}deg)`,
              transformOrigin: "center",
              zIndex: zIndex + 1,
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
                repeat: !textObj.disableIdleAnimation ? Infinity : 0,
                duration: textObj.hoverEffect === "float" ? 3.6 : 2.4,
                ease: "easeInOut",
              }}
              className="whitespace-pre-line font-mono pointer-events-auto cursor-default"
              style={{
                fontSize: `${finalFontSize || (isMobile ? 36 : 64)}px`,
                color: textObj.color || "#050505",
                textAlign: textObj.textAlign || "center",
                lineHeight: finalLineHeight,
                letterSpacing: `${finalLetterSpacing}px`,
                fontWeight: textObj.fontWeight || 900,
                textTransform: textObj.textTransform || "none",
                fontStyle: textObj.italic ? "italic" : "normal",
              }}
            >
              {textObj.text}
            </motion.div>
          </motion.div>
        );
      })}
    </React.Fragment>
  );
}

export default function Hero({ onExplore, onAbout, onWhy, onProductClick, onOpenOwnerManager }: HeroProps) {
  const navigate = useNavigate();
  const { isOwner, user } = useAuth();
  const [config, setConfig] = useState<CustomHeroConfig>(() => getCachedHeroConfig());
  
  // Real-time responsive device detector (mobile vs desktop)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const heroStageRef = useRef<HTMLDivElement>(null);
  const mainGraphicRef = useRef<HTMLDivElement>(null);
  const [measuredLowestHeight, setMeasuredLowestHeight] = useState<number | null>(null);

  // Load hero metadata once on mount from the canonical JSON configuration file
  // and listen for manual studio update events without polling or Firestore leakage
  useEffect(() => {
    let mounted = true;
    const fetchLatest = () => {
      getHeroConfig().then((loadedConfig) => {
        if (mounted) {
          setConfig(loadedConfig);
        }
      });
    };

    fetchLatest();

    const handleConfigEvent = (e: any) => {
      if (mounted && e?.detail) {
        setConfig(e.detail);
      } else {
        fetchLatest();
      }
    };

    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener("sym_hero_config_updated", handleConfigEvent);
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener("sym_hero_config_updated", handleConfigEvent);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Measure DOM lowest pixel of the MAIN graphic
  useEffect(() => {
    const measureLowestPixel = () => {
      if (!heroStageRef.current || !mainGraphicRef.current) return;
      const stageTop = heroStageRef.current.getBoundingClientRect().top;
      const graphicBottom = mainGraphicRef.current.getBoundingClientRect().bottom;
      const measuredHeight = graphicBottom - stageTop + 0; // 0px bottom architectural padding
      if (measuredHeight > 0) {
        setMeasuredLowestHeight(Math.ceil(measuredHeight));
      }
    };

    measureLowestPixel();
    const timer = setTimeout(measureLowestPixel, 300);

    window.addEventListener("resize", measureLowestPixel);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureLowestPixel);
    };
  }, [config, isMobile]);

  // Calculated adaptive stage height from formula (with mobile-awareness)
  const calculatedHeight = calculateAdaptiveStageHeight(config, isMobile);
  
  // Final stage height adapts automatically to the lowest pixel of the MAIN graphic
  const finalCanvasHeight = measuredLowestHeight || calculatedHeight;

  return (
    <section 
      id="hero-canvas" 
      aria-label="Symbolic Adaptive Hero Section"
      className={`relative pt-0 px-0 w-full max-w-none border-b-2 border-brand-text select-none ${
        config.canvasOverflowVisible !== false ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      {/* The Adaptive Hero Canvas Stage */}
      <div 
        ref={heroStageRef}
        className={`relative w-full transition-all duration-300 ${
          config.showCanvasBoundingBox !== false 
            ? "bg-brand-surface/75 border-b-2 border-brand-text shadow-[0_4px_0px_#050505]" 
            : "bg-transparent border-0 shadow-none"
        } ${config.canvasOverflowVisible !== false ? "overflow-visible" : "overflow-hidden"}`}
        style={{
          minHeight: isMobile ? "100svh" : "100dvh",
          height: isMobile ? "100svh" : "100dvh",
          ...(config.showCanvasBoundingBox !== false ? {
            backgroundImage: `radial-gradient(rgba(5, 5, 5, ${config.gridOpacity ?? 0.12}) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
            backgroundPosition: "center center",
          } : {})
        }}
      >
        {/* Subtle Architectural Grid Coordinates & Origin Tags */}
        {config.showCoordinates && (
          <div className="absolute inset-0 pointer-events-none select-none z-10">
            <span className="absolute top-2.5 left-3 font-mono text-[8.5px] sm:text-[9px] font-black tracking-widest text-brand-text/30">
              + CANVAS_ORIGIN [0, 0]
            </span>
            <span className="absolute top-2.5 right-3 font-mono text-[8.5px] sm:text-[9px] font-black tracking-widest text-brand-text/30">
              // STAGE: ACTIVE
            </span>
            <span className="absolute bottom-2.5 left-3 font-mono text-[8.5px] sm:text-[9px] font-black tracking-widest text-brand-text/30">
              + [X:{config.posX}%, Y:{config.posY}%]
            </span>
            <span className="absolute bottom-2.5 right-3 font-mono text-[8.5px] sm:text-[9px] font-black tracking-widest text-brand-text/30">
              SYMBOLIC // MONOLITH
            </span>

            {/* Center Reticle Guideline */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-15 flex items-center justify-center">
              <div className="w-full h-[1px] bg-brand-text" />
              <div className="h-full w-[1px] bg-brand-text absolute" />
            </div>
          </div>
        )}

        {/* The Backdrop Layer (Z-0) */}
        {renderBackdrop(config.backdrop)}

        {/* Admin Quick Controller Jump Button (Visible to Authenticated Owners) */}
        {isOwner && onOpenOwnerManager && (
          <div className="absolute bottom-3 right-3 z-30">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.1);
                onOpenOwnerManager();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text border-2 border-brand-text shadow-[2px_2px_0px_#ff4500] text-[9.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              title="Open Hero Studio Controller"
            >
              <Compass size={12} className="text-brand-accent animate-spin-slow" />
              <span>CUSTOMIZE HERO // STUDIO</span>
            </button>
          </div>
        )}

        {/* 3-Layer Hero System: Background, Middle, Foreground */}
        {config.isEnabled && (
          <>
            {/* Background Layer (Z-10) */}
            <SingleLayerRenderer 
              layer={config.bgLayer} 
              zIndex={10} 
              showCoordinates={config.showCoordinates} 
              isMobile={isMobile}
            />

            {/* Avatar Layer (Z-20, Avatar Graphic Slideshow) */}
            <SingleLayerRenderer 
              layer={config.midLayer} 
              zIndex={20} 
              showCoordinates={config.showCoordinates} 
              elementRef={mainGraphicRef} 
              isMobile={isMobile}
            />

            {/* Foreground Layer (Z-30) */}
            <SingleLayerRenderer 
              layer={config.fgLayer} 
              zIndex={30} 
              showCoordinates={config.showCoordinates} 
              isMobile={isMobile}
            />
          </>
        )}

        {/* Hero Navigation Action Buttons (with deviceTarget and mobile transforms) */}
        {(() => {
          if (config.heroButtons?.showButtons === false) return null;
          const btnTarget = config.heroButtons?.deviceTarget || "both";
          if (btnTarget === "desktop" && isMobile) return null;
          if (btnTarget === "mobile" && !isMobile) return null;

          const btnUseMobile = Boolean(isMobile && config.heroButtons?.mobileEnabled);
          const btnX = btnUseMobile ? (config.heroButtons?.mobilePosX ?? config.heroButtons?.posX ?? 50) : (config.heroButtons?.posX ?? 50);
          const btnY = btnUseMobile ? (config.heroButtons?.mobilePosY ?? config.heroButtons?.posY ?? 85) : (config.heroButtons?.posY ?? 85);

          return (
            <div 
              className="absolute z-40 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pointer-events-auto select-none"
              style={{
                left: `${btnX}%`,
                top: `${btnY}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                soundManager.playClick(0.14);
                if (onAbout) {
                  onAbout();
                } else {
                  navigate(config.heroButtons?.button1Link || "/about");
                }
              }}
              className="px-6 sm:px-8 py-3 bg-brand-accent hover:bg-brand-text text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2.5 cursor-pointer group whitespace-nowrap"
            >
              <span>{config.heroButtons?.button1Label || "ABOUT THE MARK"}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                soundManager.playClick(0.12);
                if (onWhy) {
                  onWhy();
                } else {
                  navigate(config.heroButtons?.button2Link || "/manifesto");
                }
              }}
              className="px-6 sm:px-8 py-3 bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2.5 cursor-pointer group whitespace-nowrap"
            >
              <BookOpen size={16} className="text-brand-accent group-hover:text-brand-bg transition-colors" />
              <span>{config.heroButtons?.button2Label || "MANIFESTO"}</span>
            </motion.button>
          </div>
        );
      })()}

        {/* Scroll Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-20 pointer-events-none opacity-60">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-brand-text/50"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
