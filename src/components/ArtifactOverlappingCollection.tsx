import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, MoveRight, Layers, X, Check } from "lucide-react";
import { Product, Category } from "../types";
import { resolveProductImages, normalizeProductCategory, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";
import { mobileTooltipManager } from "../lib/mobileTooltipManager";

interface ArtifactOverlappingCollectionProps {
  products: Product[];
  categories: Category[];
  onProductClick: (product: Product) => void;
}

// Curated architectural vertical & angular offsets to simulate physical placement on desktop
const SPECIMEN_OFFSETS = [
  { y: -12, rotate: -0.7 },
  { y: 16, rotate: 0.8 },
  { y: -8, rotate: -0.4 },
  { y: 14, rotate: 0.6 },
  { y: -16, rotate: -0.8 },
  { y: 10, rotate: 0.5 },
  { y: -6, rotate: -0.5 },
  { y: 18, rotate: 0.7 },
  { y: -10, rotate: -0.6 },
  { y: 12, rotate: 0.8 },
];

// Brutalist scattered coordinate matrices for outer angle elevations
const BRUTALIST_SCATTER_OFFSETS = [
  { x: "-82px", y: "-42px", rotate: -4.5, shadow: "4px_4px_0px_#050505", label: "ELEV // 01 [ORTHO-TOP]" },
  { x: "106%", y: "-36px", rotate: 3.5, shadow: "4px_4px_0px_#050505", label: "ELEV // 02 [ISO-EAST]" },
  { x: "-76px", y: "108px", rotate: 2.8, shadow: "4px_4px_0px_#050505", label: "ELEV // 03 [LATERAL]" },
  { x: "104%", y: "94px", rotate: -3.2, shadow: "4px_4px_0px_#050505", label: "ELEV // 04 [OBLIQUE]" },
  { x: "-70px", y: "248px", rotate: -2.5, shadow: "4px_4px_0px_#050505", label: "ELEV // 05 [SECTION]" },
  { x: "105%", y: "235px", rotate: 4.2, shadow: "4px_4px_0px_#050505", label: "ELEV // 06 [AXIAL]" },
];

export default function ArtifactOverlappingCollection({
  products,
  categories,
  onProductClick,
}: ArtifactOverlappingCollectionProps) {
  // Viewport detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Shared state
  const [activeAngles, setActiveAngles] = useState<Record<string, number>>({});
  
  // Desktop state
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [scatterVisibleIdx, setScatterVisibleIdx] = useState<number | null>(null);
  const scatterEnterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scatterLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [openElevationProductId, setOpenElevationProductId] = useState<string | null>(null);
  const [hoveredThumbMap, setHoveredThumbMap] = useState<Record<string, number | null>>({});
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mobile state
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeMobileIdx, setActiveMobileIdx] = useState<number>(0);

  // Keep activeMobileIdx within bounds
  useEffect(() => {
    if (activeMobileIdx >= products.length && products.length > 0) {
      setActiveMobileIdx(0);
    }
  }, [products.length, activeMobileIdx]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (scatterEnterTimerRef.current) clearTimeout(scatterEnterTimerRef.current);
      if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);
    };
  }, []);

  // Monitor desktop scroll bounds
  const updateScrollBounds = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollBounds, { passive: true });
    updateScrollBounds();
    return () => el.removeEventListener("scroll", updateScrollBounds);
  }, [products, updateScrollBounds]);

  // Smooth desktop manual pan
  const handlePan = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    soundManager.playToggle(0.06);
    const scrollAmount = Math.min(window.innerWidth * 0.5, 420);
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Desktop Mouse Drag-to-pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setHasMovedDuringDrag(false);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.35;
    if (Math.abs(x - startX) > 6) {
      setHasMovedDuringDrag(true);
    }
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Angle switching helpers
  const handleAngleSwitch = (productId: string, angleIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundManager.playToggle(0.08);
    setActiveAngles((prev) => ({
      ...prev,
      [productId]: angleIndex,
    }));
  };

  const handleNextAngle = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playToggle(0.06);
    setActiveAngles((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: (current + 1) % totalImages };
    });
  };

  const handlePrevAngle = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playToggle(0.06);
    setActiveAngles((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: (current - 1 + totalImages) % totalImages };
    });
  };

  // Desktop interaction
  const handleDesktopItemHover = (index: number) => {
    if (isDragging || hasMovedDuringDrag) return;
    
    // Clear any pending exit dismiss timer
    if (scatterLeaveTimerRef.current) {
      clearTimeout(scatterLeaveTimerRef.current);
      scatterLeaveTimerRef.current = null;
    }

    const product = products[index];
    if (product) {
      mobileTooltipManager.onProductRevealed(product.id);
    }
    
    if (activeIdx !== index) {
      soundManager.playHover(0.04);
      setActiveIdx(index);
    }

    // Dwell waiting time (320ms) before popping out the scattered elevation satellites
    if (scatterVisibleIdx !== index) {
      if (scatterEnterTimerRef.current) {
        clearTimeout(scatterEnterTimerRef.current);
      }
      scatterEnterTimerRef.current = setTimeout(() => {
        setScatterVisibleIdx(index);
      }, 320);
    }
  };

  const handleDesktopItemLeave = (index: number) => {
    // Clear pending enter timer if mouse quickly passed over
    if (scatterEnterTimerRef.current) {
      clearTimeout(scatterEnterTimerRef.current);
      scatterEnterTimerRef.current = null;
    }

    // Graceful exit buffer (280ms) so transitions aren't chaotic and user can smoothly move to satellites
    if (scatterLeaveTimerRef.current) {
      clearTimeout(scatterLeaveTimerRef.current);
    }
    
    scatterLeaveTimerRef.current = setTimeout(() => {
      setScatterVisibleIdx(null);
      setActiveIdx(null);
      setOpenElevationProductId(null);
      const product = products[index];
      if (product) {
        setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }));
      }
    }, 280);
  };

  const handleDesktopItemClick = (product: Product, index: number) => {
    if (hasMovedDuringDrag) return;

    if (activeIdx !== index) {
      soundManager.playClick(0.08);
      setActiveIdx(index);
      return;
    }

    soundManager.playClick(0.14);
    onProductClick(product);
  };

  // Mobile selection and navigation
  const selectMobileItem = (index: number) => {
    soundManager.playClick(0.08);
    setActiveMobileIdx(index);
    const targetCard = mobileCardRefs.current[index];
    if (targetCard && mobileContainerRef.current) {
      targetCard.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  const handleMobileCardClick = (product: Product, index: number) => {
    if (activeMobileIdx === index) {
      // Direct opening when already engaged
      soundManager.playClick(0.14);
      onProductClick(product);
    } else {
      // Focus and select first
      selectMobileItem(index);
    }
  };

  // Mobile scroll synchronization to detect current card
  const handleMobileScroll = () => {
    const container = mobileContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    mobileCardRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeMobileIdx) {
      setActiveMobileIdx(closestIdx);
    }
  };

  // Current product on mobile
  const activeMobileProduct = products[activeMobileIdx] || products[0];

  // If no products available, render empty state cleanly
  if (!products || products.length === 0) {
    return (
      <div className="w-full py-16 text-center font-mono border-2 border-dashed border-brand-text/30 p-8">
        <p className="text-xs uppercase font-bold text-brand-text/60">NO ARTIFACTS LOADED IN EXHIBITION</p>
      </div>
    );
  }

  // =========================================================================
  // MOBILE EXHIBITION LAYOUT (< 768px)
  // Dedicated touch-first architecture: no overlapping collision, clean pill index,
  // snap carousel, inline angle switcher, and docked curatorial dossier.
  // =========================================================================
  if (isMobile) {
    const mobileImages = resolveProductImages(activeMobileProduct);
    const activeMobileAngle = activeAngles[activeMobileProduct?.id] || 0;
    const currentMobileImg = mobileImages[activeMobileAngle] || mobileImages[0];

    const mobileSpecimenCategory = categories.find((c) => c.id === activeMobileProduct?.categoryId);
    const mobileCategoryLabel = activeMobileProduct?.artifactClassification || mobileSpecimenCategory?.label || (activeMobileProduct ? normalizeProductCategory(activeMobileProduct).toUpperCase() : "");
    const mobileTagline = activeMobileProduct?.symbolicTagline || activeMobileProduct?.inscription || activeMobileProduct?.wearingCommunicates || "CONVICTION, MATERIALIZED.";
    const isMobileComingSoon = Boolean(activeMobileProduct?.isComingSoon || activeMobileProduct?.comingSoon || activeMobileProduct?.status === "coming-soon");
    const isMobileSoldOut = !isMobileComingSoon && activeMobileProduct?.inventory !== undefined && activeMobileProduct?.inventory <= 0;

    return (
      <div className="relative w-full overflow-hidden select-none py-2 font-mono">
        {/* 1. MOBILE TELEMETRY HEADER */}
        <div className="flex items-center justify-between px-4 pb-3 border-b-2 border-brand-text text-[9px] uppercase tracking-widest text-brand-text">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ff4500] inline-block animate-pulse" />
            <span className="font-black text-brand-text">EXHIBITION ARRAY</span>
            <span className="text-brand-text/40">•</span>
            <span className="font-black text-[#ff4500]">0{activeMobileIdx + 1} / 0{products.length}</span>
          </div>
          <span className="text-[8.5px] font-bold text-brand-text/60">[ TAP TO ENGAGE ]</span>
        </div>

        {/* 2. SPECIMEN QUICK-SELECT INDEX BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar px-4 py-2.5 bg-brand-surface border-b border-brand-text/20">
          <span className="text-[8px] font-black uppercase tracking-wider text-brand-text/50 shrink-0 mr-1">
            SPECIMEN:
          </span>
          {products.map((p, idx) => {
            const isCurrent = activeMobileIdx === idx;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectMobileItem(idx)}
                className={`shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border transition-all ${
                  isCurrent
                    ? "bg-[#ff4500] text-white border-brand-text shadow-[2px_2px_0px_#050505]"
                    : "bg-brand-bg text-brand-text border-brand-text/30 active:border-brand-text"
                }`}
              >
                0{idx + 1}
              </button>
            );
          })}
        </div>

        {/* 3. MOBILE SNAP CAROUSEL VIEWPORT (No negative overlapping margins) */}
        <div
          ref={mobileContainerRef}
          onScroll={handleMobileScroll}
          className="w-full overflow-x-auto snap-x snap-mandatory flex gap-4 px-6 pt-5 pb-4 hide-scrollbar"
        >
          {products.map((product, idx) => {
            const isCurrent = activeMobileIdx === idx;
            const images = resolveProductImages(product);
            const currentAngle = activeAngles[product.id] || 0;
            const displayImg = images[currentAngle] || images[0];
            const isItemComingSoon = Boolean(product.isComingSoon || product.comingSoon || product.status === "coming-soon");

            return (
              <div
                key={product.id}
                ref={(el) => {
                  mobileCardRefs.current[idx] = el;
                }}
                onClick={() => handleMobileCardClick(product, idx)}
                className={`shrink-0 w-[78vw] max-w-[300px] aspect-[3/4] snap-center relative transition-all duration-300 ${
                  isCurrent
                    ? "scale-100 opacity-100"
                    : "scale-[0.94] opacity-75"
                }`}
              >
                <div
                  className={`w-full h-full relative overflow-hidden bg-brand-surface border-2 border-brand-text transition-all ${
                    isCurrent
                      ? "shadow-[8px_8px_0px_#050505,0_0_0_2px_#ff4500]"
                      : "shadow-[4px_4px_0px_#050505]"
                  }`}
                >
                  <img
                    src={displayImg || STUDIO_FALLBACK_IMAGE}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== STUDIO_FALLBACK_IMAGE) {
                        target.src = STUDIO_FALLBACK_IMAGE;
                      }
                    }}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />

                  {/* Corner crosshair registration markers on active card */}
                  {isCurrent && (
                    <>
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-black text-[#ff4500] leading-none pointer-events-none">+</span>
                      <span className="absolute top-1.5 right-1.5 text-[10px] font-black text-[#ff4500] leading-none pointer-events-none">+</span>
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black text-[#ff4500] leading-none pointer-events-none">+</span>
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black text-[#ff4500] leading-none pointer-events-none">+</span>
                    </>
                  )}

                  {/* Specimen Index Tag */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 pointer-events-none">
                    <span className="font-mono text-[8.5px] font-black text-brand-text bg-brand-surface/90 px-1.5 py-0.5 border border-brand-text">
                      0{idx + 1}
                    </span>
                    {isItemComingSoon && (
                      <span className="font-mono text-[8px] font-black text-white bg-[#ff4500] px-1.5 py-0.5 border border-brand-text">
                        UPCOMING
                      </span>
                    )}
                  </div>

                  {/* Direct tap badge */}
                  <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
                    <span className={`font-mono text-[8px] font-black px-2 py-0.5 border border-brand-text transition-colors ${
                      isCurrent
                        ? "bg-[#ff4500] text-white"
                        : "bg-brand-surface/90 text-brand-text"
                    }`}>
                      {isCurrent ? "ACTIVE" : "SELECT"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. DOCKED MOBILE CURATORIAL DOSSIER PANEL */}
        {activeMobileProduct && (
          <div className="mx-4 mt-1 p-4 bg-brand-text text-brand-bg border-2 border-brand-text shadow-[6px_6px_0px_#050505] space-y-3">
            {/* Header: Accession & Identity */}
            <div className="flex items-center justify-between text-[8.5px] text-[#ff4500] font-black uppercase tracking-widest border-b border-brand-bg/20 pb-1.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#ff4500] inline-block" />
                OBJECT / 0{activeMobileIdx + 1}
              </span>
              <span className="text-brand-bg/70">
                ACCESSION: TWL-{(activeMobileProduct.productId || activeMobileProduct.sku || activeMobileProduct.id).toUpperCase().slice(0, 8)}
              </span>
            </div>

            {/* Name & Arabic Inscription */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-black uppercase tracking-tight text-brand-bg">
                # {activeMobileProduct.name}
              </h3>
              {activeMobileProduct.inscription && (
                <span className="font-serif text-sm font-black text-[#ff4500]" dir="rtl">
                  {activeMobileProduct.inscription}
                </span>
              )}
            </div>

            <p className="text-[9.5px] font-bold text-brand-bg/85 uppercase tracking-wide border-l-2 border-[#ff4500] pl-2">
              {mobileTagline}
            </p>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-2 text-[8.5px] uppercase border-t border-brand-bg/15 pt-2">
              <div>
                <span className="text-brand-bg/50 block text-[7.5px] font-bold">MEDIUM:</span>
                <span className="font-black text-brand-bg/90 tracking-wide truncate block">{mobileCategoryLabel}</span>
              </div>
              <div>
                <span className="text-brand-bg/50 block text-[7.5px] font-bold">MATERIAL:</span>
                <span className="font-black text-brand-bg/90 tracking-wide truncate block">
                  {activeMobileProduct.material || "ARCHIVAL STRUCTURE"}
                </span>
              </div>
            </div>

            {/* Inline Angle/Elevation Switcher (No intrusive floating tooltips) */}
            {mobileImages.length > 1 && (
              <div className="pt-2 border-t border-brand-bg/15 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <span className="text-[8px] text-brand-bg/60 font-bold uppercase shrink-0">
                  ELEVATIONS:
                </span>
                {mobileImages.map((_, imgIdx) => (
                  <button
                    key={imgIdx}
                    type="button"
                    onClick={() => handleAngleSwitch(activeMobileProduct.id, imgIdx)}
                    className={`shrink-0 px-2 py-1 text-[8.5px] font-black uppercase border transition-all ${
                      activeMobileAngle === imgIdx
                        ? "bg-[#ff4500] text-white border-brand-bg shadow-[1px_1px_0px_#050505]"
                        : "bg-brand-bg text-brand-text border-brand-bg/40"
                    }`}
                  >
                    V.0{imgIdx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.14);
                onProductClick(activeMobileProduct);
              }}
              className="w-full py-3 bg-[#ff4500] hover:bg-[#ea3e00] text-white text-xs font-black uppercase tracking-widest border border-brand-bg shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{isMobileComingSoon ? "PREVIEW ARCHIVAL DOSSIER" : "OPEN ARCHIVAL DOSSIER"}</span>
              <MoveRight size={14} />
            </button>
          </div>
        )}

        {/* Mobile Footer Instruction */}
        <div className="px-4 pt-3 flex items-center justify-between text-[8px] uppercase tracking-widest text-brand-text/50">
          <span>SWIPE CAROUSEL TO BROWSE</span>
          <span className="text-brand-text/70 font-bold">TOTAL: {products.length} OBJECTS</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESKTOP EXHIBITION LAYOUT (>= 768px)
  // Preserves curated horizontal overlapping presentation with refined tactile
  // displacement, docked elevation control, and streamlined dossier activation.
  // =========================================================================
  return (
    <div className="relative w-full overflow-hidden select-none py-4">
      {/* 1. ARCHITECTURAL STAGE HEADER & TELEMETRY */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 pb-4 border-b-2 border-brand-text font-mono text-[10px] uppercase tracking-widest text-brand-text/70">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-[#ff4500] animate-pulse" />
          <span className="font-black text-brand-text">HORIZONTAL ARTIFACT ARRAY</span>
          <span className="text-brand-text/30">//</span>
          <span>CURATED 3:4 SPECIMEN SEQUENCE</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#ff4500] font-black">
              {activeIdx !== null ? `ARTIFACT 0${activeIdx + 1} ENGAGED` : "RESTING STATE"}
            </span>
            <span className="text-brand-text/40">•</span>
            <span>CLICK TO FOCUS & EXAMINE</span>
          </div>

          {/* Pan Navigation Assists */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => handlePan("left")}
              className={`p-1.5 border-2 border-brand-text transition-all ${
                canScrollLeft
                  ? "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  : "opacity-30 border-brand-text/30 cursor-not-allowed text-brand-text/40"
              }`}
              title="Traverse West"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => handlePan("right")}
              className={`p-1.5 border-2 border-brand-text transition-all ${
                canScrollRight
                  ? "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  : "opacity-30 border-brand-text/30 cursor-not-allowed text-brand-text/40"
              }`}
              title="Traverse East"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE HORIZONTAL OVERLAPPING STAGING AREA */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`w-full overflow-x-auto hide-scrollbar pt-20 sm:pt-24 pb-24 px-6 sm:px-12 cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? "select-none" : ""
        }`}
      >
        <div
          ref={trackRef}
          className="flex items-center min-w-max pl-4 pr-16 sm:pr-32"
          style={{ minHeight: "620px" }}
        >
          {products.map((product, idx) => {
            const images = resolveProductImages(product);
            const permanentAngleIdx = activeAngles[product.id] || 0;
            const tempHoveredAngle = hoveredThumbMap[product.id];
            const activeAngleIdx = (typeof tempHoveredAngle === "number" && tempHoveredAngle !== null)
              ? tempHoveredAngle
              : permanentAngleIdx;
            const currentImg = images[activeAngleIdx] || images[0];

            const isHovered = activeIdx === idx;
            const isAnyHovered = activeIdx !== null;
            const isElevationOpen = openElevationProductId === product.id;

            const baseOffset = SPECIMEN_OFFSETS[idx % SPECIMEN_OFFSETS.length];
            const artifactNum = String(idx + 1).padStart(2, "0");

            // Spatial Separation Displacement on focus
            let displacementX = 0;
            let targetScale = 1;
            let targetZ = 10 + idx;
            let targetY = baseOffset.y;
            let targetRotate = baseOffset.rotate;
            const targetOpacity = 1; // Strict high contrast: never dim non-hovered products

            if (isAnyHovered) {
              if (isHovered) {
                displacementX = 0;
                targetScale = 1.05;
                targetZ = 50;
                targetY = -18;
                targetRotate = 0;
              } else if (idx < activeIdx) {
                const distanceFactor = Math.max(0, activeIdx - idx - 1);
                displacementX = -(175 + distanceFactor * 25);
                targetScale = 0.96;
                targetZ = 10 + idx;
                targetY = baseOffset.y + 4;
              } else if (idx > activeIdx) {
                const distanceFactor = Math.max(0, idx - activeIdx - 1);
                displacementX = +(175 + distanceFactor * 25);
                targetScale = 0.96;
                targetZ = 10 + idx;
                targetY = baseOffset.y + 4;
              }
            }

            const specimenCategory = categories.find((c) => c.id === product.categoryId);
            const categoryLabel = product.artifactClassification || specimenCategory?.label || normalizeProductCategory(product).toUpperCase();
            const artifactTypeLabel = product.artifactType || normalizeProductCategory(product).toUpperCase();
            const symbolicTagline = product.symbolicTagline || product.inscription || product.wearingCommunicates || "CONVICTION, MATERIALIZED.";
            const isComingSoon = Boolean(product.isComingSoon || product.comingSoon || product.status === "coming-soon");
            const isSoldOut = !isComingSoon && product.inventory !== undefined && product.inventory <= 0;

            return (
              <motion.div
                key={product.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onMouseEnter={() => handleDesktopItemHover(idx)}
                onMouseLeave={() => handleDesktopItemLeave(idx)}
                onClick={() => handleDesktopItemClick(product, idx)}
                animate={{
                  x: displacementX,
                  y: targetY,
                  scale: targetScale,
                  rotate: targetRotate,
                  opacity: targetOpacity,
                  zIndex: targetZ,
                }}
                transition={{
                  type: "spring",
                  stiffness: 340,
                  damping: 26,
                  mass: 0.8,
                }}
                style={{
                  marginLeft: idx === 0 ? "0px" : "-140px",
                  zIndex: targetZ,
                }}
                className={`relative shrink-0 w-[270px] sm:w-[320px] md:w-[360px] lg:w-[400px] aspect-[3/4] group cursor-pointer transition-shadow ${
                  idx !== 0 ? "sm:-ml-[170px] md:-ml-[200px] lg:-ml-[230px]" : ""
                }`}
              >
                {/* PHYSICAL 3:4 SPECIMEN FRAME */}
                <div
                  className={`w-full h-full relative overflow-hidden bg-brand-surface border-3 sm:border-4 border-brand-text transition-all duration-300 ${
                    isHovered
                      ? "shadow-[14px_14px_0px_#050505,0_0_0_2px_#ff4500]"
                      : "shadow-[6px_6px_0px_#050505] hover:shadow-[10px_10px_0px_#050505]"
                  }`}
                >
                  <img
                    src={currentImg || STUDIO_FALLBACK_IMAGE}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== STUDIO_FALLBACK_IMAGE) {
                        target.src = STUDIO_FALLBACK_IMAGE;
                      }
                    }}
                    className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />

                  {/* UNHOVERED SPECIMEN TICK & COMING SOON BADGE */}
                  <div
                    className={`absolute bottom-2.5 right-2.5 pointer-events-none transition-opacity duration-200 flex items-center gap-1.5 ${
                      isHovered ? "opacity-0" : "opacity-90 group-hover:opacity-100"
                    }`}
                  >
                    {isComingSoon && (
                      <span className="font-mono text-[8.5px] font-black uppercase text-white bg-brand-accent px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                        COMING SOON
                      </span>
                    )}
                    <span className="font-mono text-[9px] font-black text-brand-text bg-brand-surface/90 px-1.5 py-0.5 border border-brand-text">
                      {artifactNum}
                    </span>
                  </div>

                  {/* UNHOVERED SPECIMEN ELEVATION COUNT BADGE (Resting State) */}
                  {!isHovered && images.length > 1 && (
                    <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-brand-surface/95 border border-brand-text shadow-[2px_2px_0px_#050505] px-2 py-0.5 pointer-events-none font-mono">
                      <span className="w-1.5 h-1.5 bg-[#ff4500] inline-block" />
                      <span className="text-[8px] font-black uppercase tracking-wider text-brand-text">
                        ELEV 0{activeAngleIdx + 1}/0{images.length}
                      </span>
                    </div>
                  )}

                  {/* CURATORIAL SPECIMEN DOSSIER (Revealed smoothly when card is hovered or focused) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-x-0 bottom-0 z-30 p-3 sm:p-3.5 bg-brand-text text-brand-bg border-t-3 border-brand-accent shadow-[0_-6px_20px_rgba(0,0,0,0.35)] flex flex-col justify-between gap-2.5 font-mono"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Upper Identification Section */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-[#ff4500] font-black uppercase tracking-widest border-b border-brand-bg/20 pb-1">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[#ff4500] inline-block" />
                              OBJECT / {artifactNum}
                            </span>
                            <span className="text-brand-bg/60 font-bold">
                              ACCESSION: TWL-{(product.productId || product.sku || product.id).toUpperCase().slice(0, 8)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-brand-bg line-clamp-1">
                              # {product.name}
                            </h3>
                            {product.inscription && (
                              <span className="font-serif text-sm font-black text-[#ff4500] shrink-0" dir="rtl">
                                {product.inscription}
                              </span>
                            )}
                          </div>

                          <p className="text-[9.5px] sm:text-[10px] font-bold text-brand-bg/85 uppercase tracking-wide line-clamp-2 leading-tight border-l-2 border-[#ff4500] pl-2">
                            {symbolicTagline}
                          </p>
                        </div>

                        {/* Specifications */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-bg/15 text-[8.5px] sm:text-[9px] uppercase">
                          <div>
                            <span className="text-brand-bg/50 block text-[7.5px] font-bold">MEDIUM:</span>
                            <span className="font-black text-brand-bg/90 tracking-wide truncate block">
                              {categoryLabel} // {artifactTypeLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-brand-bg/50 block text-[7.5px] font-bold">MATERIAL / STRUCTURE:</span>
                            <span className="font-black text-brand-bg/90 tracking-wide truncate block">
                              {product.material || "280 GSM COMBED COTTON"}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Status & Direct Open Button */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-brand-bg/20">
                          <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider">
                            <span className={`w-1.5 h-1.5 rounded-none inline-block ${isComingSoon ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                            <span className="text-brand-bg/85">
                              {isComingSoon ? "UPCOMING STUDIO RELEASE" : isSoldOut ? "ARCHIVAL COMMISSION" : "PERMANENT ATELIER HOLDING"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.14);
                              onProductClick(product);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4500] hover:bg-[#ea3e00] text-white text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                          >
                            <span>{isComingSoon ? "PREVIEW DOSSIER" : "OPEN DOSSIER"}</span>
                            <MoveRight size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PC BRUTALIST SCATTERED ELEVATION ANGLE SATELLITES (Render outside the preview frame on intentional hover) */}
                <AnimatePresence>
                  {scatterVisibleIdx === idx && images.length > 1 && (
                    <>
                      {/* Architectural Header Bar floating above card */}
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        onMouseEnter={() => {
                          if (scatterLeaveTimerRef.current) {
                            clearTimeout(scatterLeaveTimerRef.current);
                            scatterLeaveTimerRef.current = null;
                          }
                          setScatterVisibleIdx(idx);
                        }}
                        onMouseLeave={() => handleDesktopItemLeave(idx)}
                        className="absolute -top-10 inset-x-0 z-50 flex items-center justify-between px-2.5 py-1 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505] font-mono text-[8px] font-black uppercase tracking-widest text-brand-text pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#ff4500] inline-block animate-ping" />
                          <span>SCATTERED ELEVATION MATRIX</span>
                        </div>
                        <span className="text-[#ff4500]">0{activeAngleIdx + 1}/0{images.length} ACTIVE</span>
                      </motion.div>

                      {/* Scattered Brutalist Elevation Plates positioned around the exterior */}
                      {images.map((img, imgIdx) => {
                        const scatter = BRUTALIST_SCATTER_OFFSETS[imgIdx % BRUTALIST_SCATTER_OFFSETS.length];
                        const isSelected = activeAngleIdx === imgIdx;
                        const isCommitted = permanentAngleIdx === imgIdx;

                        return (
                          <motion.button
                            key={`scatter-${product.id}-${imgIdx}`}
                            type="button"
                            initial={{ opacity: 0, scale: 0.4, rotate: scatter.rotate * 2 }}
                            animate={{
                              opacity: 1,
                              scale: isSelected ? 1.08 : 1,
                              rotate: scatter.rotate,
                              transition: {
                                delay: imgIdx * 0.05,
                                type: "spring",
                                stiffness: 380,
                                damping: 24,
                              },
                            }}
                            exit={{ opacity: 0, scale: 0.6, rotate: 0, transition: { duration: 0.16 } }}
                            whileHover={{ scale: 1.15, rotate: 0, zIndex: 60 }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              if (scatterLeaveTimerRef.current) {
                                clearTimeout(scatterLeaveTimerRef.current);
                                scatterLeaveTimerRef.current = null;
                              }
                              setScatterVisibleIdx(idx);
                              soundManager.playHover(0.02);
                              setHoveredThumbMap((prev) => ({ ...prev, [product.id]: imgIdx }));
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }));
                              handleDesktopItemLeave(idx);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAngleSwitch(product.id, imgIdx, e);
                            }}
                            style={{
                              left: scatter.x,
                              top: scatter.y,
                            }}
                            className={`absolute z-50 w-16 sm:w-20 md:w-22 p-1 bg-brand-surface border-2 cursor-pointer pointer-events-auto font-mono text-left transition-colors ${
                              isSelected
                                ? "border-[#ff4500] shadow-[5px_5px_0px_#050505] bg-brand-bg ring-2 ring-[#ff4500]/40"
                                : isCommitted
                                ? "border-brand-text shadow-[4px_4px_0px_#050505] hover:border-brand-text"
                                : "border-brand-text/80 shadow-[3px_3px_0px_#050505] hover:border-brand-text opacity-90 hover:opacity-100"
                            }`}
                            title={`Elevation 0${imgIdx + 1} — Click to switch, hover to preview`}
                          >
                            {/* Raw Brutalist Elevation Identification Tag */}
                            <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-brand-text/30 text-[7px] sm:text-[7.5px] font-black uppercase text-brand-text">
                              <span className={isSelected ? "text-[#ff4500]" : ""}>V.0{imgIdx + 1}</span>
                              <span className="text-[6.5px] text-brand-text/50">[{imgIdx === 0 ? "PRIMARY" : `ANG-${imgIdx}`}]</span>
                            </div>

                            {/* Crisp Elevation Thumbnail */}
                            <div className="relative aspect-square w-full border border-brand-text/40 overflow-hidden bg-brand-bg">
                              <img
                                src={img || STUDIO_FALLBACK_IMAGE}
                                alt={`Elevation 0${imgIdx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                              {isSelected && (
                                <span className="absolute bottom-0 inset-x-0 bg-[#ff4500] text-white text-[6.5px] font-black text-center uppercase py-px">
                                  LIVE
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. ARCHITECTURAL FOOTER REGISTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 pt-3 border-t border-brand-text/20 font-mono text-[9.5px] uppercase tracking-widest text-brand-text/60">
        <div className="flex items-center gap-2">
          <span>ARRAY REGISTER // {products.length} {products.length === 1 ? "ARTIFACT" : "ARTIFACTS"}</span>
          <span className="text-brand-text/30">•</span>
          <span>DRAG HORIZONTALLY OR USE TRACKPAD TO PAN</span>
        </div>

        <div className="flex items-center gap-3 font-bold text-brand-text">
          <span className="text-[#ff4500]">[ 3:4 PERSISTENT ARTIFACT PREVIEW ]</span>
        </div>
      </div>
    </div>
  );
}
