import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, MoveRight, Layers, X } from "lucide-react";
import { Product, Category } from "../types";
import { resolveProductImages, normalizeProductCategory, normalizeProductCollection, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

interface ArtifactOverlappingCollectionProps {
  products: Product[];
  categories: Category[];
  onProductClick: (product: Product) => void;
}

// Curated architectural vertical & angular offsets to simulate raw physical placement
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

// Deterministic brutalist angles and offsets for scatter deck preview layout
const SCATTER_STYLES = [
  { rotate: "-4.5deg", x: "-6px", y: "2px", zIndex: 10 },
  { rotate: "4deg", x: "8px", y: "-4px", zIndex: 12 },
  { rotate: "-3deg", x: "-2px", y: "6px", zIndex: 11 },
  { rotate: "5.5deg", x: "10px", y: "-2px", zIndex: 13 },
  { rotate: "-5deg", x: "-8px", y: "4px", zIndex: 10 },
  { rotate: "3deg", x: "4px", y: "-5px", zIndex: 14 }
];

export default function ArtifactOverlappingCollection({
  products,
  categories,
  onProductClick,
}: ArtifactOverlappingCollectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeAngles, setActiveAngles] = useState<Record<string, number>>({});
  const [closedTooltips, setClosedTooltips] = useState<Record<string, boolean>>({});
  const [hoveredThumbMap, setHoveredThumbMap] = useState<Record<string, number | null>>({});
  const [placementMap, setPlacementMap] = useState<Record<number, 'right' | 'left' | 'above'>>({});
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Monitor scroll bounds
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

  // Smooth manual pan controls
  const handlePan = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    soundManager.playToggle(0.06);
    const scrollAmount = Math.min(window.innerWidth * 0.5, 420);
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse Drag-to-pan implementation
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
    const walk = (x - startX) * 1.35; // scroll speed multiplier
    if (Math.abs(x - startX) > 6) {
      setHasMovedDuringDrag(true);
    }
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Switch image angle for a given product
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

  const handleCloseTooltip = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playToggle(0.05);
    setClosedTooltips((prev) => ({ ...prev, [productId]: true }));
  };

  // Handle artifact card interaction
  const handleItemHover = (index: number, productId: string) => {
    if (isDragging || hasMovedDuringDrag) return;
    if (activeIdx !== index) {
      soundManager.playHover(0.04);
      setActiveIdx(index);
      setClosedTooltips((prev) => ({ ...prev, [productId]: false }));
    }

    // Determine placement on side (desktop) or above (mobile)
    const el = itemRefs.current[index];
    if (el && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPlacementMap((prev) => ({ ...prev, [index]: "above" }));
      } else {
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 315;
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        if (spaceRight >= tooltipWidth + 24) {
          setPlacementMap((prev) => ({ ...prev, [index]: "right" }));
        } else if (spaceLeft >= tooltipWidth + 24) {
          setPlacementMap((prev) => ({ ...prev, [index]: "left" }));
        } else {
          setPlacementMap((prev) => ({ ...prev, [index]: "above" }));
        }
      }
    }
  };

  const handleItemLeave = (index: number) => {
    if (isTooltipHovered) return;
    if (activeIdx === index) {
      const product = products[index];
      if (product) {
        setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }));
      }
      setActiveIdx(null);
    }
  };

  const handleItemClick = (product: Product, index: number) => {
    if (hasMovedDuringDrag) return;

    // On touch/mobile: first tap selects to inspect, second tap navigates
    const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
    if (isTouch && activeIdx !== index) {
      soundManager.playClick(0.08);
      setActiveIdx(index);
      return;
    }

    soundManager.playClick(0.14);
    onProductClick(product);
  };

  return (
    <div className="relative w-full overflow-hidden select-none py-4">
      {/* 1. ARCHITECTURAL STAGE HEADER & TELEMETRY */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 pb-4 border-b-2 border-brand-text font-mono text-[10px] uppercase tracking-widest text-brand-text/70">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-[#ff4500] animate-pulse" />
          <span className="font-black text-brand-text">HORIZONTAL ARTEFACT ARRAY</span>
          <span className="text-brand-text/30">//</span>
          <span className="hidden sm:inline">OVERLAPPING CURATION [3:4 FORMAT]</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[#ff4500] font-black">
              {activeIdx !== null ? `ARTEFACT 0${activeIdx + 1} ENGAGED` : "RESTING STATE"}
            </span>
            <span className="text-brand-text/40">•</span>
            <span>HOVER TO DISPLACE & EXAMINE</span>
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
        className={`w-full overflow-x-auto hide-scrollbar pt-14 pb-20 px-6 sm:px-12 cursor-grab active:cursor-grabbing transition-all ${
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
            // Render temporary preview if user is hovering thumbnail, reverting to permanent angle when mouse leaves
            const activeAngleIdx = (typeof tempHoveredAngle === "number" && tempHoveredAngle !== null)
              ? tempHoveredAngle
              : permanentAngleIdx;
            const currentImg = images[activeAngleIdx] || images[0];

            const isHovered = activeIdx === idx;
            const isAnyHovered = activeIdx !== null;

            const baseOffset = SPECIMEN_OFFSETS[idx % SPECIMEN_OFFSETS.length];
            const artifactNum = String(idx + 1).padStart(2, "0");

            // Compute Physical Spatial Separation Displacement
            let displacementX = 0;
            let targetScale = 1;
            let targetZ = 10 + idx;
            let targetY = baseOffset.y;
            let targetRotate = baseOffset.rotate;
            let targetOpacity = 1;

            if (isAnyHovered) {
              if (isHovered) {
                // The selected artifact comes forward
                displacementX = 0;
                targetScale = 1.05;
                targetZ = 50;
                targetY = -18;
                targetRotate = 0; // straightens cleanly in architectural focus
                targetOpacity = 1;
              } else if (idx < activeIdx) {
                // Artifacts to the left shift to the left
                const distanceFactor = Math.max(0, activeIdx - idx - 1);
                displacementX = -(175 + distanceFactor * 25);
                targetScale = 0.96;
                targetZ = 10 + idx;
                targetY = baseOffset.y + 4;
                targetOpacity = 0.82;
              } else if (idx > activeIdx) {
                // Artifacts to the right shift to the right
                const distanceFactor = Math.max(0, idx - activeIdx - 1);
                displacementX = +(175 + distanceFactor * 25);
                targetScale = 0.96;
                targetZ = 10 + idx;
                targetY = baseOffset.y + 4;
                targetOpacity = 0.82;
              }
            }

            const specimenCategory = categories.find((c) => c.id === product.categoryId);
            const categoryLabel = product.artifactClassification || specimenCategory?.label || normalizeProductCategory(product).toUpperCase();
            const artifactTypeLabel = product.artifactType || normalizeProductCategory(product).toUpperCase();
            const symbolicTagline = product.symbolicTagline || product.inscription || product.wearingCommunicates || "CONVICTION, MATERIALIZED.";
            const isComingSoon = Boolean(product.isComingSoon || product.comingSoon || product.status === "coming-soon");
            const isSoldOut = !isComingSoon && product.inventory !== undefined && product.inventory <= 0;

            const placement = placementMap[idx] || "right";

            return (
              <motion.div
                key={product.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onMouseEnter={() => handleItemHover(idx, product.id)}
                onMouseLeave={() => handleItemLeave(idx)}
                onClick={() => handleItemClick(product, idx)}
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
                  // Overlapping layout: all items after the first overlap the previous by negative margin
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
                  {/* High Resolution Artifact Image with Robust Error Fallback */}
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

                  {/* SUBTLE UNHOVERED DISCREET SPECIMEN TICK & COMING SOON PILL */}
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

                  {/* Multi-Angle Elevation Indicator Chip */}
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playToggle(0.06);
                        setClosedTooltips((prev) => ({ ...prev, [product.id]: false }));
                      }}
                      className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-brand-surface/90 text-brand-text border border-brand-text text-[8px] font-mono font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505] hover:bg-brand-accent hover:text-white transition-colors cursor-pointer"
                    >
                      <Layers size={10} />
                      <span>ELEVATION 0{activeAngleIdx + 1}/0{images.length}</span>
                      {tempHoveredAngle !== null && tempHoveredAngle !== undefined && tempHoveredAngle !== permanentAngleIdx && (
                        <span className="text-brand-accent font-black ml-0.5">[PREVIEW]</span>
                      )}
                    </button>
                  )}

                  {/* 4. TEMPORARY ARTIFACT INFORMATION DOSSIER (Revealed only when hovered/active) */}
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

                        {/* Middle Curatorial Specifications (NO PRICING - Curatorial Exhibition Context) */}
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

                        {/* Bottom Curatorial Status & Dossier Trigger */}
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

                {/* Brutalist Angle Preview Tooltip (Pops out on side of product preview on desktop, above on mobile) */}
                <AnimatePresence>
                  {isHovered && images.length > 1 && !closedTooltips[product.id] && (
                    <motion.div
                      initial={
                        placement === "right"
                          ? { opacity: 0, x: -14, scale: 0.96 }
                          : placement === "left"
                          ? { opacity: 0, x: 14, scale: 0.96 }
                          : { opacity: 0, y: 14, scale: 0.96 }
                      }
                      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      exit={
                        placement === "right"
                          ? { opacity: 0, x: -8, scale: 0.97 }
                          : placement === "left"
                          ? { opacity: 0, x: 8, scale: 0.97 }
                          : { opacity: 0, y: 8, scale: 0.97 }
                      }
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={() => setIsTooltipHovered(true)}
                      onMouseLeave={() => {
                        setIsTooltipHovered(false);
                        setActiveIdx(null);
                      }}
                      className={`absolute z-[100] w-[min(315px,calc(100vw-32px))] bg-brand-bg border-2 border-brand-text p-3 shadow-[8px_8px_0px_#050505] pointer-events-auto cursor-default ${
                        placement === "right"
                          ? "left-[calc(100%+14px)] top-0"
                          : placement === "left"
                          ? "right-[calc(100%+14px)] left-auto top-0"
                          : "bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2"
                      }`}
                    >
                      {/* Invisible hover bridge to eliminate gap when moving cursor between card and side tooltip */}
                      {placement === "right" && (
                        <div className="absolute -left-4 top-0 bottom-0 w-4 pointer-events-auto" />
                      )}
                      {placement === "left" && (
                        <div className="absolute -right-4 top-0 bottom-0 w-4 pointer-events-auto" />
                      )}
                      {placement === "above" && (
                        <div className="absolute -bottom-4 left-0 right-0 h-4 pointer-events-auto" />
                      )}

                      {/* Brutalist Directional Pointer Anchor */}
                      {placement === "above" && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-brand-bg border-r-2 border-b-2 border-brand-text rotate-45 pointer-events-none" />
                      )}
                      {placement === "right" && (
                        <div className="absolute -left-2 top-8 w-3.5 h-3.5 bg-brand-bg border-l-2 border-b-2 border-brand-text rotate-45 pointer-events-none" />
                      )}
                      {placement === "left" && (
                        <div className="absolute -right-2 top-8 w-3.5 h-3.5 bg-brand-bg border-r-2 border-t-2 border-brand-text rotate-45 pointer-events-none" />
                      )}

                      {/* Tooltip Header Bar with Navigation Arrows & Close Button */}
                      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2 mb-3 bg-brand-surface -mx-3 -mt-3 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-brand-accent inline-block border border-brand-text" />
                          <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-text">
                            [ ELEVATION // {product.productId || `ARTEFACT ${artifactNum}`} ]
                          </span>
                        </div>

                        {/* Arrow Controls on Tooltip */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handlePrevAngle(product.id, images.length, e)}
                            aria-label="Previous angle"
                            className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white text-brand-text shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <span className="font-mono text-[8px] font-black px-1 text-brand-text">
                            0{activeAngleIdx + 1}/0{images.length}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleNextAngle(product.id, images.length, e)}
                            aria-label="Next angle"
                            className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white text-brand-text shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                          >
                            <ChevronRight size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCloseTooltip(product.id, e)}
                            className="p-1 border border-brand-text bg-brand-bg hover:bg-brand-accent hover:text-white text-brand-text shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer ml-1"
                            aria-label="Close angles preview"
                            title="Close preview"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Brutalist Random Placement / Scatter Gallery Deck */}
                      <div 
                        className="relative py-2 px-1 flex flex-wrap justify-center items-center gap-2 min-h-[110px]"
                        onMouseLeave={() => setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }))}
                      >
                        {images.map((img, imgIdx) => {
                          const scatter = SCATTER_STYLES[imgIdx % SCATTER_STYLES.length];
                          const isCommittedActive = permanentAngleIdx === imgIdx;
                          const isThumbHovered = hoveredThumbMap[product.id] === imgIdx;

                          return (
                            <motion.div
                              key={imgIdx}
                              animate={{
                                rotate: isThumbHovered || isCommittedActive ? "0deg" : scatter.rotate,
                                scale: isThumbHovered ? 1.15 : isCommittedActive ? 1.06 : 0.95,
                                x: isThumbHovered || isCommittedActive ? "0px" : scatter.x,
                                y: isThumbHovered || isCommittedActive ? "-3px" : scatter.y,
                                zIndex: isThumbHovered ? 40 : isCommittedActive ? 30 : scatter.zIndex,
                              }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              onMouseEnter={() => {
                                soundManager.playHover(0.035);
                                // Temporarily preview angle without permanently committing it
                                setHoveredThumbMap((prev) => ({ ...prev, [product.id]: imgIdx }));
                              }}
                              onMouseLeave={() => {
                                setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Permanently commit the selected angle on click
                                handleAngleSwitch(product.id, imgIdx, e);
                                setHoveredThumbMap((prev) => ({ ...prev, [product.id]: null }));
                              }}
                              className={`relative w-20 aspect-square p-1 bg-brand-surface border-2 transition-colors cursor-pointer ${
                                isCommittedActive
                                  ? "border-brand-accent shadow-[4px_4px_0px_#050505] ring-2 ring-brand-accent/40"
                                  : isThumbHovered
                                  ? "border-brand-text shadow-[4px_4px_0px_#050505] ring-1 ring-brand-text"
                                  : "border-brand-text shadow-[3px_3px_0px_#050505] hover:border-brand-text"
                              }`}
                            >
                              <img
                                src={img || STUDIO_FALLBACK_IMAGE}
                                alt={`Angle ${imgIdx + 1}`}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (target.src !== STUDIO_FALLBACK_IMAGE) {
                                    target.src = STUDIO_FALLBACK_IMAGE;
                                  }
                                }}
                                className="w-full h-full object-cover select-none"
                              />

                              {/* Angle Tag Badge */}
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span
                                  className={`font-mono text-[7px] font-black uppercase px-1 py-0.2 border border-brand-text ${
                                    isCommittedActive 
                                      ? "bg-brand-accent text-white" 
                                      : isThumbHovered
                                      ? "bg-brand-text text-brand-bg font-black"
                                      : "bg-brand-text text-brand-bg"
                                  }`}
                                >
                                  {isCommittedActive 
                                    ? `V.0${imgIdx + 1} [LOCKED]` 
                                    : isThumbHovered 
                                    ? `V.0${imgIdx + 1} [PREVIEW]` 
                                    : `V.0${imgIdx + 1}`}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Tooltip Footer Instruction */}
                      <div className="mt-3 pt-1.5 border-t border-brand-text/20 flex justify-between items-center text-[8px] font-mono tracking-wider text-brand-text/70 uppercase">
                        <span className="flex items-center gap-1 text-brand-accent font-bold">
                          <Layers size={10} /> {images.length} ARCHIVAL ELEVATIONS
                        </span>
                        <span className="font-bold text-brand-text">CLICK TO LOCK • HOVER TO PREVIEW</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 5. ARCHITECTURAL FOOTER REGISTER WITH SCROLL INSTRUCTION & TICKER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 pt-3 border-t border-brand-text/20 font-mono text-[9.5px] uppercase tracking-widest text-brand-text/60">
        <div className="flex items-center gap-2">
          <span>ARRAY REGISTER // {products.length} {products.length === 1 ? "ARTEFACT" : "ARTEFACTS"}</span>
          <span className="text-brand-text/30">•</span>
          <span className="hidden sm:inline">DRAG HORIZONTALLY OR USE TRACKPAD TO PAN</span>
        </div>

        <div className="flex items-center gap-3 font-bold text-brand-text">
          <span className="text-[#ff4500]">[ 3:4 PERSISTENT ARTEFACT PREVIEW ]</span>
        </div>
      </div>
    </div>
  );
}
