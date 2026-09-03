import React, { useState, useRef, useEffect } from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Layers, X } from "lucide-react";
import { mobileTooltipManager } from "../lib/mobileTooltipManager";

interface ProductCardProps {
  product: Product;
  categoryLabel: string;
  onClick: () => void;
  key?: string;
}

// Deterministic pseudo-random angles and offsets for brutalist scatter preview layout
const SCATTER_STYLES = [
  { rotate: "-4.5deg", x: "-6px", y: "2px", zIndex: 10 },
  { rotate: "4deg", x: "8px", y: "-4px", zIndex: 12 },
  { rotate: "-3deg", x: "-2px", y: "6px", zIndex: 11 },
  { rotate: "5.5deg", x: "10px", y: "-2px", zIndex: 13 },
  { rotate: "-5deg", x: "-8px", y: "4px", zIndex: 10 },
  { rotate: "3deg", x: "4px", y: "-5px", zIndex: 14 }
];

type TooltipPlacement = 'right' | 'left' | 'above';

export default function ProductCard({ product, categoryLabel, onClick }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoRevealed, setIsAutoRevealed] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement>('above');
  const [sideVerticalAlign, setSideVerticalAlign] = useState<'top' | 'bottom'>('top');
  const [showAngleArrows, setShowAngleArrows] = useState(false);
  const [hoveredThumbIndex, setHoveredThumbIndex] = useState<number | null>(null);
  const hoverTriggerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayId = product.productId || product.sku;
  const editionLabel = product.edition || "050 SPECIMENS";
  const categoryTag = (product.categoryId || categoryLabel || "OBJECT").toUpperCase();
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.thumbnailImage || "/placeholder.png"];

  const isRevealed = isHovered || isAutoRevealed;
  const areArrowsVisible = isRevealed || showAngleArrows;
  const isAutoRevealedRef = useRef(false);
  isAutoRevealedRef.current = isAutoRevealed;
  const isDwellingInViewRef = useRef(false);

  // Helper to detect PC (devices with mouse and fine pointer) vs touch mobile devices
  const isPC = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  };

  // Determine optimal placement: on the sides for desktop, strictly above the product for mobile
  const updatePlacement = () => {
    if (typeof window === 'undefined' || !cardRef.current) return;

    // Mobile / touch screen: always show strictly on the above side of the product so the view is never blocked
    const isMobile = window.innerWidth < 768 || !isPC();
    if (isMobile) {
      setPlacement('above');
      return;
    }

    // On desktop: evaluate horizontal clearance on sides
    const rect = cardRef.current.getBoundingClientRect();
    const tooltipWidth = 310;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;

    if (spaceRight >= tooltipWidth + 24) {
      setPlacement('right');
    } else if (spaceLeft >= tooltipWidth + 24) {
      setPlacement('left');
    } else {
      setPlacement('above');
    }

    // Check vertical bounds when docked to side
    const spaceBottom = window.innerHeight - rect.top;
    if (spaceBottom < 260 && rect.bottom > 260) {
      setSideVerticalAlign('bottom');
    } else {
      setSideVerticalAlign('top');
    }
  };

  useEffect(() => {
    if (isRevealed) {
      updatePlacement();
    }
  }, [isRevealed]);

  // 2-second dwell timer when specimen is on-screen (STRICTLY for mobile / touch-only devices)
  useEffect(() => {
    // Disable entirely for PCs / devices with hover and fine pointer
    if (isPC()) return;

    const node = cardRef.current;
    if (!node || images.length <= 1) return;

    const checkAndStartDwell = () => {
      // If this product's tooltip is currently suppressed (e.g. 60s cooldown after close/select), do not auto-reveal
      if (mobileTooltipManager.isSuppressed(product.id)) {
        return;
      }

      if (!dwellTimerRef.current && !isAutoRevealedRef.current) {
        dwellTimerRef.current = setTimeout(() => {
          dwellTimerRef.current = null;

          // Re-verify suppression before showing
          if (mobileTooltipManager.isSuppressed(product.id)) {
            return;
          }

          // If another product was dwelling and revealed, clear suppression on prior products
          mobileTooltipManager.onProductRevealed(product.id);

          updatePlacement();
          setIsAutoRevealed(true);
        }, 2000);
      }
    };

    const cancelDwell = () => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            isDwellingInViewRef.current = true;
            checkAndStartDwell();
          } else if (entry.intersectionRatio < 0.25) {
            isDwellingInViewRef.current = false;
            cancelDwell();
            if (isAutoRevealedRef.current) {
              setIsAutoRevealed(false);
            }
          }
        });
      },
      {
        threshold: [0.1, 0.25, 0.45, 0.75]
      }
    );

    observer.observe(node);

    // When 60s suppression expires or another product reveals,
    // if this card is currently dwelling in view, start the 2-second delay
    const unsubscribe = mobileTooltipManager.subscribe(() => {
      if (isDwellingInViewRef.current && !isAutoRevealedRef.current && !mobileTooltipManager.isSuppressed(product.id)) {
        checkAndStartDwell();
      }
    });

    return () => {
      observer.disconnect();
      unsubscribe();
      cancelDwell();
    };
  }, [images.length, product.id]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTriggerTimerRef.current) clearTimeout(hoverTriggerTimerRef.current);
      if (hoverDismissTimerRef.current) clearTimeout(hoverDismissTimerRef.current);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAngleArrows(true);
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAngleArrows(true);
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleCloseTooltip = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsAutoRevealed(false);
    setIsHovered(false);
    setHoveredThumbIndex(null);

    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (hoverTriggerTimerRef.current) {
      clearTimeout(hoverTriggerTimerRef.current);
      hoverTriggerTimerRef.current = null;
    }

    // On mobile / touch, suppress for 60 seconds
    if (!isPC()) {
      mobileTooltipManager.suppress(product.id, 60000);
    }
  };

  const handleSelectAngleThumbnail = (e: React.SyntheticEvent, idx: number) => {
    e.stopPropagation();

    // 1. Immediately switch to the selected angle image
    setActiveImageIndex(idx);
    setHoveredThumbIndex(null);

    // 2. Keep the angle navigation arrows visible so the user can easily cycle through angles
    setShowAngleArrows(true);

    // 3. Immediately close the tooltip without waiting for the cross button
    setIsAutoRevealed(false);
    setIsHovered(false);

    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (hoverTriggerTimerRef.current) {
      clearTimeout(hoverTriggerTimerRef.current);
      hoverTriggerTimerRef.current = null;
    }
    if (hoverDismissTimerRef.current) {
      clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = null;
    }

    // 3. For mobile devices, suppress for 60 seconds
    if (!isPC()) {
      mobileTooltipManager.suppress(product.id, 60000);
    }
  };

  const handleMouseEnter = () => {
    // Only on PC with mouse cursor
    if (!isPC()) return;

    // Clear any pending dismiss
    if (hoverDismissTimerRef.current) {
      clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = null;
    }
    // Clear existing trigger
    if (hoverTriggerTimerRef.current) {
      clearTimeout(hoverTriggerTimerRef.current);
      hoverTriggerTimerRef.current = null;
    }

    // Immediately reveal angle preview tooltip on PC without 1 second delay
    if (images.length > 1) {
      mobileTooltipManager.onProductRevealed(product.id);
      updatePlacement();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPC()) return;

    if (hoverTriggerTimerRef.current) {
      clearTimeout(hoverTriggerTimerRef.current);
      hoverTriggerTimerRef.current = null;
    }

    // Dismiss with a brief buffer so smooth cursor motion between card and side tooltip doesn't flicker
    hoverDismissTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      setHoveredThumbIndex(null);
    }, 220);
  };

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.35 }}
      className={`group cursor-pointer rounded-none border-2 border-brand-text p-5 transition-colors duration-150 flex flex-col justify-between relative ${
        isRevealed 
          ? 'bg-brand-bg shadow-[8px_8px_0px_#050505] z-30' 
          : 'bg-brand-surface hover:bg-brand-bg shadow-[4px_4px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] z-10'
      }`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div>
        {/* Top Archival Header */}
        <div className="flex justify-between items-center text-[9px] font-mono tracking-widest uppercase mb-3 border-b border-brand-text/20 pb-2 font-bold">
          <span className="text-brand-text">{displayId}</span>
          <span className="text-brand-accent">STOCK: {product.inventory}</span>
        </div>

        {/* Product Visual Frame */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-none bg-brand-surface mb-4 border-2 border-brand-text">
          <AnimatePresence mode="wait">
            <motion.img 
              key={activeImageIndex}
              src={images[activeImageIndex] || product.thumbnailImage || images[0]} 
              alt={product.name}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: isRevealed ? 1.05 : 1 }}
              exit={{ opacity: 0.6, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Category Tag */}
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[9px] font-mono tracking-widest font-black bg-brand-accent text-white px-2.5 py-1 uppercase rounded-none border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
              {categoryTag}
            </span>
          </div>

          {/* Perspective Navigation Arrows on Main Card */}
          {images.length > 1 && (
            <>
              {/* Image Counter Tag */}
              <div className="absolute bottom-3 left-3 z-10">
                <span className="text-[8.5px] font-mono font-black uppercase tracking-widest bg-brand-bg/95 text-brand-text px-2 py-0.5 border border-brand-text shadow-[2px_2px_0px_#050505]">
                  [ 0{activeImageIndex + 1} / 0{images.length} ]
                </span>
              </div>

              {/* Prev / Next Arrows with spring tactile motion */}
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  onClick={handlePrevImage}
                  aria-label="Previous preview"
                  className={`pointer-events-auto transition-opacity duration-200 p-2 sm:p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                    areArrowsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <ChevronLeft size={16} />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  onClick={handleNextImage}
                  aria-label="Next preview"
                  className={`pointer-events-auto transition-opacity duration-200 p-2 sm:p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                    areArrowsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <ChevronRight size={16} />
                </motion.button>
              </div>

              {/* Mini Segment Progress on Card */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-brand-text/10 flex">
                {images.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-full flex-1 transition-colors duration-200 ${i === activeImageIndex ? 'bg-brand-accent' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Quick View Corner Glyph */}
          <motion.div 
            initial={false}
            animate={{ scale: isRevealed ? 1 : 0.8, opacity: isRevealed ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`absolute top-3 right-3 bg-brand-bg border-2 border-brand-text p-1.5 rounded-none text-brand-text shadow-[2px_2px_0px_#050505] z-10 ${
              isRevealed ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <ArrowUpRight size={14} />
          </motion.div>
        </div>
        
        {/* Statement & Inscription */}
        <div className="space-y-1 px-1">
          <div className="flex justify-between items-center text-[9px] font-mono uppercase text-brand-text/60 font-bold">
            <span>RUN: {editionLabel}</span>
            {product.weight && <span>{product.weight}</span>}
          </div>
          <h3 className="text-base sm:text-lg font-mono font-black uppercase text-brand-text tracking-tight leading-tight">
            {product.name}
          </h3>
          {product.inscription && (
            <p className="text-[9px] font-mono text-brand-accent uppercase font-bold tracking-wider pt-0.5">
              SYMBOL // {product.inscription}
            </p>
          )}
        </div>
      </div>

      {/* Footer / Price & Link */}
      <div className="flex justify-between items-center border-t-2 border-brand-text pt-3.5 mt-4 px-1">
        <span className="text-sm font-mono font-black text-brand-text tracking-tight">
          Rs. {product.price.toLocaleString()}
        </span>
        <span className={`text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 transition-colors ${
          isRevealed ? 'text-brand-accent' : 'text-brand-text group-hover:text-brand-accent'
        }`}>
          VIEW OBJECT →
        </span>
      </div>

      {/* Brutalist Angle Preview Tooltip (Rendered on sides for desktop, strictly above the product for mobile) */}
      <AnimatePresence>
        {isRevealed && images.length > 1 && (
          <motion.div
            initial={
              placement === 'right' 
                ? { opacity: 0, x: -14, scale: 0.96 }
                : placement === 'left'
                ? { opacity: 0, x: 14, scale: 0.96 }
                : { opacity: 0, y: 14, scale: 0.96 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              placement === 'right'
                ? { opacity: 0, x: -8, scale: 0.97 }
                : placement === 'left'
                ? { opacity: 0, x: 8, scale: 0.97 }
                : { opacity: 0, y: 8, scale: 0.97 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (hoverDismissTimerRef.current) {
                clearTimeout(hoverDismissTimerRef.current);
                hoverDismissTimerRef.current = null;
              }
              setIsHovered(true);
            }}
            onMouseLeave={handleMouseLeave}
            className={`absolute z-50 w-[min(310px,calc(100vw-32px))] bg-brand-bg border-2 border-brand-text p-3 shadow-[8px_8px_0px_#050505] pointer-events-auto ${
              placement === 'right'
                ? `left-[calc(100%+14px)] ${sideVerticalAlign === 'bottom' ? 'bottom-0' : 'top-0'}`
                : placement === 'left'
                ? `right-[calc(100%+14px)] left-auto ${sideVerticalAlign === 'bottom' ? 'bottom-0' : 'top-0'}`
                : 'bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2'
            }`}
          >
            {/* Invisible hover bridge to eliminate gap when moving cursor between card and side tooltip */}
            {placement === 'right' && (
              <div className="absolute -left-4 top-0 bottom-0 w-4 pointer-events-auto" />
            )}
            {placement === 'left' && (
              <div className="absolute -right-4 top-0 bottom-0 w-4 pointer-events-auto" />
            )}
            {placement === 'above' && (
              <div className="absolute -bottom-4 left-0 right-0 h-4 pointer-events-auto" />
            )}

            {/* Brutalist Directional Pointer Anchor */}
            {placement === 'above' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-brand-bg border-r-2 border-b-2 border-brand-text rotate-45 pointer-events-none" />
            )}
            {placement === 'right' && (
              <div className={`absolute -left-2 ${sideVerticalAlign === 'bottom' ? 'bottom-8' : 'top-8'} w-3.5 h-3.5 bg-brand-bg border-l-2 border-b-2 border-brand-text rotate-45 pointer-events-none`} />
            )}
            {placement === 'left' && (
              <div className={`absolute -right-2 ${sideVerticalAlign === 'bottom' ? 'bottom-8' : 'top-8'} w-3.5 h-3.5 bg-brand-bg border-r-2 border-t-2 border-brand-text rotate-45 pointer-events-none`} />
            )}

            {/* Tooltip Header Bar with Navigation Arrows & Close Button */}
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-2 mb-3 bg-brand-surface -mx-3 -mt-3 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-brand-accent inline-block"></span>
                <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-text">
                  ANGLES // {displayId}
                </span>
              </div>
              
              {/* Arrow Controls on Tooltip */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous angle"
                  className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white text-brand-text shadow-[1px_1px_0px_#050505] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="font-mono text-[8px] font-bold px-1 text-brand-text">
                  {activeImageIndex + 1}/{images.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next angle"
                  className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white text-brand-text shadow-[1px_1px_0px_#050505] transition-colors cursor-pointer"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseTooltip}
                  className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-accent hover:text-white text-brand-text shadow-[1px_1px_0px_#050505] transition-colors cursor-pointer ml-1"
                  aria-label="Close angles preview"
                  title="Close preview"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Brutalist Random Placement / Scatter Gallery Deck */}
            <div className="relative py-2 px-1 flex flex-wrap justify-center items-center gap-2 min-h-[110px]">
              {images.map((img, idx) => {
                const scatter = SCATTER_STYLES[idx % SCATTER_STYLES.length];
                const isActive = activeImageIndex === idx;
                const isItemHovered = hoveredThumbIndex === idx;

                return (
                  <motion.div
                    key={idx}
                    animate={{
                      rotate: isItemHovered || isActive ? "0deg" : scatter.rotate,
                      scale: isItemHovered ? 1.15 : isActive ? 1.08 : 0.95,
                      x: isItemHovered || isActive ? "0px" : scatter.x,
                      y: isItemHovered || isActive ? "-3px" : scatter.y,
                      zIndex: isItemHovered ? 40 : isActive ? 30 : scatter.zIndex
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    onMouseEnter={() => {
                      if (isPC()) {
                        setHoveredThumbIndex(idx);
                        setActiveImageIndex(idx);
                      }
                    }}
                    onClick={(e) => handleSelectAngleThumbnail(e, idx)}
                    className={`relative w-20 aspect-square p-1 bg-brand-surface border-2 transition-colors cursor-pointer ${
                      isActive 
                        ? 'border-brand-accent shadow-[4px_4px_0px_#050505]' 
                        : 'border-brand-text shadow-[3px_3px_0px_#050505] hover:border-brand-text'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Angle ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Angle Tag Badge */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className={`font-mono text-[7px] font-black uppercase px-1 py-0.2 border border-brand-text ${
                        isActive ? 'bg-brand-accent text-white' : 'bg-brand-text text-brand-bg'
                      }`}>
                        V.0{idx + 1}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tooltip Footer Instruction */}
            <div className="mt-3 pt-1.5 border-t border-brand-text/20 flex justify-between items-center text-[8px] font-mono tracking-wider text-brand-text/70 uppercase">
              <span className="flex items-center gap-1 text-brand-accent font-bold">
                <Layers size={10} /> {images.length} ARCHIVAL VIEWS
              </span>
              <span className="font-bold text-brand-text">TAP ANGLE TO FLIP</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



