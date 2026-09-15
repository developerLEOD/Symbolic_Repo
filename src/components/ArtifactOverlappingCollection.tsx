import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, MoveRight, Layers, Box, Check, Sparkles } from "lucide-react";
import { Artifact, Specimen, Product, Category } from "../types";
import { resolveProductImages, normalizeProductCategory, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";

interface ArtifactOverlappingCollectionProps {
  artifacts?: Artifact[];
  specimens?: Specimen[];
  products?: Product[];
  categories?: Category[];
  onProductClick: (entity: Artifact | Product, specimenId?: string) => void;
}

interface DisplayArtifact {
  id: string;
  artifactId: string;
  name: string;
  inscription?: string;
  concept?: string;
  symbolicTagline?: string;
  wearingCommunicates?: string;
  collectionName?: string;
  graphic: string;
  specimens: Specimen[];
  rawEntity: Artifact | Product;
}

// Curated architectural vertical & angular offsets to simulate physical exhibition
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

// Brutalist coordinate offsets for orbiting specimen plates
const SPECIMEN_SCATTER_OFFSETS = [
  { x: "-86px", y: "-40px", rotate: -4 },
  { x: "106%", y: "-34px", rotate: 3.5 },
  { x: "-80px", y: "110px", rotate: 2.5 },
  { x: "104%", y: "96px", rotate: -3 },
  { x: "-74px", y: "250px", rotate: -2 },
  { x: "105%", y: "238px", rotate: 4 },
];

export default function ArtifactOverlappingCollection({
  artifacts,
  specimens = [],
  products,
  categories = [],
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

  // Transform input into DisplayArtifact items
  const displayItems = useMemo<DisplayArtifact[]>(() => {
    if (artifacts && artifacts.length > 0) {
      return artifacts.map((art) => {
        const childSpecs = specimens.filter(
          (s) => s.parentArtifactId === art.id || art.specimenIds?.includes(s.id)
        );
        return {
          id: art.id,
          artifactId: art.artifactId || `ART-${art.id.slice(0, 4).toUpperCase()}`,
          name: art.name,
          inscription: art.inscription,
          concept: art.concept || art.shortDescription,
          symbolicTagline: art.symbolicTagline || art.concept,
          wearingCommunicates: (art as any).wearingCommunicates || art.pillar3Communicates,
          collectionName: art.collectionName || "CANONICAL",
          graphic: art.graphic || art.images?.[0] || STUDIO_FALLBACK_IMAGE,
          specimens: childSpecs,
          rawEntity: art,
        };
      });
    }

    // Fallback if only legacy products are passed: group by parentArtifactId or name
    if (products && products.length > 0) {
      const grouped = new Map<string, Product[]>();
      products.forEach((p) => {
        const groupKey = p.parentArtifactId || p.name.split(" - ")[0].split(" // ")[0];
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey)!.push(p);
      });

      return Array.from(grouped.entries()).map(([key, groupProds], idx) => {
        const first = groupProds[0];
        const synthSpecimens: Specimen[] = groupProds.map((p) => ({
          id: p.id,
          parentArtifactId: key,
          sku: p.sku || p.productId || `SP-${p.id}`,
          medium: (categories.find((c) => c.id === p.categoryId)?.label || normalizeProductCategory(p)).toUpperCase(),
          material: p.material || "PREMIUM STRUCTURE",
          fit: p.fit || "RELAXED ARCHIVAL FIT",
          price: p.price,
          availability: p.inventory > 0,
          inventory: p.inventory,
          status: (p.status === "coming-soon" ? "allotted" : p.inventory > 0 ? "available" : "sold_out") as any,
          images: resolveProductImages(p),
          thumbnailImage: p.thumbnailImage || resolveProductImages(p)[0],
          edition: p.edition || "ARCHIVAL EDITION",
        }));

        return {
          id: first.id,
          artifactId: first.productId || `ART-${String(idx + 1).padStart(2, "0")}`,
          name: key,
          inscription: first.inscription,
          concept: (first as any).story || first.description,
          symbolicTagline: first.symbolicTagline || first.wearingCommunicates,
          wearingCommunicates: first.wearingCommunicates,
          collectionName: first.collectionName || "CANONICAL",
          graphic: first.graphic || resolveProductImages(first)[0] || STUDIO_FALLBACK_IMAGE,
          specimens: synthSpecimens,
          rawEntity: first,
        };
      });
    }

    return [];
  }, [artifacts, specimens, products, categories]);

  // Track active specimen preview per artifact card
  const [selectedSpecimenMap, setSelectedSpecimenMap] = useState<Record<string, string | null>>({});

  // Desktop state
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [scatterVisibleIdx, setScatterVisibleIdx] = useState<number | null>(null);
  const scatterEnterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scatterLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingWithSatellitesRef = useRef(false);
  const satelliteExitTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    if (activeMobileIdx >= displayItems.length && displayItems.length > 0) {
      setActiveMobileIdx(0);
    }
  }, [displayItems.length, activeMobileIdx]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (scatterEnterTimerRef.current) clearTimeout(scatterEnterTimerRef.current);
      if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);
      if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);
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
  }, [displayItems, updateScrollBounds]);

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

  // Specimen switching handlers
  const handleSelectSpecimen = (artifactId: string, specimenId: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundManager.playToggle(0.08);
    setSelectedSpecimenMap((prev) => ({
      ...prev,
      [artifactId]: prev[artifactId] === specimenId ? null : specimenId,
    }));
  };

  // Desktop card hover interaction
  const handleDesktopItemHover = (index: number) => {
    if (isDragging || hasMovedDuringDrag) return;

    if (activeIdx === index) {
      if (scatterLeaveTimerRef.current) {
        clearTimeout(scatterLeaveTimerRef.current);
        scatterLeaveTimerRef.current = null;
      }
      if (satelliteExitTimerRef.current) {
        clearTimeout(satelliteExitTimerRef.current);
        satelliteExitTimerRef.current = null;
      }
      return;
    }

    if (scatterEnterTimerRef.current) clearTimeout(scatterEnterTimerRef.current);
    if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);
    if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);

    soundManager.playHover(0.03);
    setActiveIdx(index);
    setScatterVisibleIdx(index);
  };

  const handleDesktopItemLeave = (index: number) => {
    if (isInteractingWithSatellitesRef.current) return;

    if (scatterEnterTimerRef.current) clearTimeout(scatterEnterTimerRef.current);
    if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);

    scatterLeaveTimerRef.current = setTimeout(() => {
      if (!isInteractingWithSatellitesRef.current) {
        if (activeIdx === index) setActiveIdx(null);
        if (scatterVisibleIdx === index) setScatterVisibleIdx(null);
      }
    }, 120);
  };

  const handleDesktopItemClick = (item: DisplayArtifact, index: number) => {
    if (hasMovedDuringDrag) return;
    soundManager.playClick(0.14);
    const selectedSpecId = selectedSpecimenMap[item.id] || undefined;
    onProductClick(item.rawEntity, selectedSpecId);
  };

  // Mobile scroll tracking
  const handleMobileScroll = () => {
    if (!mobileContainerRef.current) return;
    const container = mobileContainerRef.current;
    const scrollCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    mobileCardRefs.current.forEach((el, idx) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(scrollCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeMobileIdx) {
      soundManager.playToggle(0.04);
      setActiveMobileIdx(closestIdx);
    }
  };

  const handleMobileSelectIdx = (idx: number) => {
    const el = mobileCardRefs.current[idx];
    if (el && mobileContainerRef.current) {
      soundManager.playClick(0.08);
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setActiveMobileIdx(idx);
    }
  };

  if (displayItems.length === 0) {
    return null;
  }

  // =========================================================================
  // MOBILE EXHIBITION LAYOUT (< 768px)
  // =========================================================================
  if (isMobile) {
    const activeMobileItem = displayItems[activeMobileIdx] || displayItems[0];
    const mobileChildSpecs = activeMobileItem?.specimens || [];
    const mobileSelectedSpecId = selectedSpecimenMap[activeMobileItem.id];
    const activeMobileSpecimen = mobileChildSpecs.find((s) => s.id === mobileSelectedSpecId) || null;
    const mobileDisplayImg = activeMobileSpecimen?.images?.[0] || activeMobileSpecimen?.thumbnailImage || activeMobileItem.graphic;
    const minMobilePrice = mobileChildSpecs.length > 0 ? Math.min(...mobileChildSpecs.map((s) => s.price)) : 0;

    return (
      <div className="w-full select-none py-2 space-y-4">
        {/* Mobile Header Bar */}
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-accent inline-block" />
            <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-text">
              ARTIFACT {String(activeMobileIdx + 1).padStart(2, "0")} / {String(displayItems.length).padStart(2, "0")}
            </span>
          </div>
          <span className="font-mono text-[8.5px] font-black uppercase bg-brand-text text-brand-bg px-2 py-0.5">
            {activeMobileItem.collectionName?.toUpperCase() || "CANONICAL"}
          </span>
        </div>

        {/* Mobile Horizontal Carousel */}
        <div
          ref={mobileContainerRef}
          onScroll={handleMobileScroll}
          className="w-full flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-6 py-2"
        >
          {displayItems.map((item, idx) => {
            const isCurrent = activeMobileIdx === idx;
            const itemSelectedSpecId = selectedSpecimenMap[item.id];
            const itemActiveSpec = item.specimens.find((s) => s.id === itemSelectedSpecId);
            const cardImg = itemActiveSpec?.images?.[0] || itemActiveSpec?.thumbnailImage || item.graphic;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  mobileCardRefs.current[idx] = el;
                }}
                onClick={() => handleMobileSelectIdx(idx)}
                className={`shrink-0 w-[78vw] max-w-[320px] snap-center aspect-[4/5] bg-brand-surface border-3 border-brand-text transition-all duration-300 relative cursor-pointer ${
                  isCurrent
                    ? "shadow-[8px_8px_0px_#050505] scale-100 ring-2 ring-brand-accent"
                    : "shadow-[3px_3px_0px_#050505] opacity-80 scale-95"
                }`}
              >
                {/* Central Artwork Graphic */}
                <div className="w-full h-full relative p-4 flex items-center justify-center bg-brand-bg">
                  <img
                    src={cardImg}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain object-center select-none"
                    loading="lazy"
                  />

                  {/* Top Accession Tag */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1">
                    <span className="font-mono text-[8px] font-black bg-brand-surface text-brand-text px-1.5 py-0.5 border border-brand-text">
                      {item.artifactId}
                    </span>
                    {itemActiveSpec && (
                      <span className="font-mono text-[7.5px] font-black uppercase bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text">
                        {itemActiveSpec.medium}
                      </span>
                    )}
                  </div>

                  {/* Top Mode Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="font-mono text-[7.5px] font-black uppercase bg-brand-surface/90 text-brand-text/75 px-1.5 py-0.5 border border-brand-text/50">
                      {itemActiveSpec ? "SPECIMEN" : "CENTRAL GRAPHIC"}
                    </span>
                  </div>

                  {/* Arabic Inscription */}
                  {item.inscription && (
                    <div className="absolute bottom-2.5 left-2.5 z-10 bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505]">
                      <span className="font-serif text-sm font-black text-brand-accent leading-none" dir="rtl">
                        {item.inscription.startsWith("#") ? item.inscription : `# ${item.inscription}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Curatorial Dossier & Specimen Selector */}
        {activeMobileItem && (
          <div className="mx-4 p-4 bg-brand-surface border-2 border-brand-text shadow-[6px_6px_0px_#050505] space-y-3 font-mono">
            {/* Header: Accession & Identity */}
            <div className="flex items-center justify-between text-[8.5px] text-brand-accent font-black uppercase tracking-widest border-b-2 border-brand-text pb-1.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand-accent inline-block" />
                ARTIFACT // {String(activeMobileIdx + 1).padStart(2, "0")}
              </span>
              <span className="text-brand-text/70">
                {activeMobileItem.artifactId}
              </span>
            </div>

            {/* Name & Inscription */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base font-black uppercase tracking-tight text-brand-text">
                # {activeMobileItem.name}
              </h3>
              <span className="text-xs font-black text-brand-text">
                {activeMobileSpecimen
                  ? `PKR ${activeMobileSpecimen.price.toLocaleString()}`
                  : minMobilePrice > 0
                    ? `FROM PKR ${minMobilePrice.toLocaleString()}`
                    : "CANONICAL"}
              </span>
            </div>

            <p className="text-[10px] font-bold text-brand-text/80 uppercase tracking-wide border-l-2 border-brand-accent pl-2">
              {activeMobileItem.concept || activeMobileItem.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
            </p>

            {/* SEPARATE SPECIMENS SELECTOR INSIDE ARTIFACT */}
            <div className="border-t border-brand-text/20 pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[8px] font-black uppercase text-brand-text/80">
                <span className="flex items-center gap-1">
                  <Layers size={10} className="text-brand-accent" />
                  <span>SEPARATE SPECIMENS ({mobileChildSpecs.length}):</span>
                </span>
                <span className="text-brand-accent">TAP TO PREVIEW</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {mobileChildSpecs.map((spec) => {
                  const isSelected = mobileSelectedSpecId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={(e) => handleSelectSpecimen(activeMobileItem.id, spec.id, e)}
                      className={`p-1.5 text-left border font-mono transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-brand-text text-brand-bg border-brand-text shadow-[2px_2px_0px_#050505]"
                          : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                      }`}
                    >
                      <div className="text-[8.5px] font-black uppercase truncate flex items-center justify-between">
                        <span className="truncate">{spec.medium}</span>
                        {isSelected && <Check size={8} className="text-brand-accent shrink-0" />}
                      </div>
                      <div className={`text-[8px] font-bold ${isSelected ? "text-brand-accent" : "text-brand-text/60"}`}>
                        PKR {spec.price.toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Open Artifact & Specimens Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.14);
                onProductClick(activeMobileItem.rawEntity, mobileSelectedSpecId || undefined);
              }}
              className="w-full py-3 bg-brand-text hover:bg-brand-accent text-brand-bg hover:text-white text-xs font-black uppercase tracking-widest border border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>
                {activeMobileSpecimen
                  ? `OPEN ${activeMobileSpecimen.medium.toUpperCase()} DOSSIER`
                  : "EXPLORE ARTIFACT & SPECIMENS"}
              </span>
              <MoveRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // DESKTOP EXHIBITION LAYOUT (>= 768px)
  // Curated horizontal overlapping presentation of ARTIFACTS featuring their
  // Central Graphics with interactive separate specimen satellites & dossier.
  // =========================================================================
  return (
    <div className="relative w-full overflow-hidden select-none py-4">
      {/* Desktop Exhibition Controls */}
      <div className="flex items-center justify-between px-6 sm:px-12 mb-2 font-mono text-[9px] font-black uppercase tracking-wider text-brand-text/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-accent inline-block" />
          <span>CURATED ARTIFACT EXHIBITION // {displayItems.length} MASTER ARTIFACTS</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePan("left")}
            disabled={!canScrollLeft}
            className="p-1 border border-brand-text bg-brand-surface disabled:opacity-30 hover:bg-brand-text hover:text-brand-bg transition-colors shadow-[1px_1px_0px_#050505]"
            title="Pan Left"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => handlePan("right")}
            disabled={!canScrollRight}
            className="p-1 border border-brand-text bg-brand-surface disabled:opacity-30 hover:bg-brand-text hover:text-brand-bg transition-colors shadow-[1px_1px_0px_#050505]"
            title="Pan Right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Horizontal Overlapping Staging Area */}
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
          className="flex items-center min-w-max mx-auto w-fit pl-4 pr-16 sm:pr-32"
          style={{ minHeight: "620px" }}
        >
          {displayItems.map((item, idx) => {
            const isHovered = activeIdx === idx;
            const isAnyHovered = activeIdx !== null;
            const baseOffset = SPECIMEN_OFFSETS[idx % SPECIMEN_OFFSETS.length];
            const artifactNum = String(idx + 1).padStart(2, "0");

            const selectedSpecId = selectedSpecimenMap[item.id];
            const activeSpecimen = item.specimens.find((s) => s.id === selectedSpecId) || null;
            const currentImg = activeSpecimen?.images?.[0] || activeSpecimen?.thumbnailImage || item.graphic;

            const childSpecimens = item.specimens;
            const minPrice = childSpecimens.length > 0 ? Math.min(...childSpecimens.map((s) => s.price)) : 0;
            const setCalculation = calculateArtifactSetPrice(item.rawEntity as any, childSpecimens);

            // Spatial Separation Displacement on hover
            let displacementX = 0;
            let targetScale = 1;
            let targetZ = 10 + idx;
            let targetY = baseOffset.y;
            let targetRotate = baseOffset.rotate;

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

            return (
              <motion.div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onMouseEnter={() => handleDesktopItemHover(idx)}
                onMouseLeave={() => handleDesktopItemLeave(idx)}
                onClick={() => handleDesktopItemClick(item, idx)}
                animate={{
                  x: displacementX,
                  y: targetY,
                  scale: targetScale,
                  rotate: targetRotate,
                  opacity: 1,
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
                className={`relative shrink-0 w-[280px] sm:w-[330px] md:w-[370px] lg:w-[410px] aspect-[3/4] group cursor-pointer transition-shadow ${
                  idx !== 0 ? "sm:-ml-[170px] md:-ml-[200px] lg:-ml-[230px]" : ""
                }`}
              >
                {/* PHYSICAL 3:4 ARTIFACT FRAME */}
                <div
                  className={`w-full h-full relative overflow-hidden flex items-center justify-center bg-brand-surface border-3 sm:border-4 border-brand-text transition-all duration-300 ${
                    isHovered
                      ? "shadow-[14px_14px_0px_#050505,0_0_0_2px_#ff4500]"
                      : "shadow-[6px_6px_0px_#050505] hover:shadow-[10px_10px_0px_#050505]"
                  }`}
                >
                  {/* Central Graphic Canvas */}
                  <div className="w-full h-full relative p-5 flex items-center justify-center bg-brand-bg">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentImg}
                        initial={{ opacity: 0.85 }}
                        animate={{ opacity: 1, scale: isHovered ? 1.02 : 1 }}
                        exit={{ opacity: 0.85 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        src={currentImg}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain object-center select-none pointer-events-none p-4"
                        loading="lazy"
                      />
                    </AnimatePresence>

                    {/* Top Accession & Collection Badge */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 font-mono">
                      <span className="text-[8px] font-black uppercase bg-brand-surface text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                        {item.artifactId}
                      </span>
                      <span className="text-[7.5px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
                        {item.collectionName?.toUpperCase() || "CANONICAL"}
                      </span>
                      {activeSpecimen && (
                        <span className="text-[7.5px] font-black uppercase bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text">
                          {activeSpecimen.medium}
                        </span>
                      )}
                    </div>

                    {/* Top Graphic Mode Badge */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <span className="font-mono text-[7.5px] font-black uppercase bg-brand-surface/95 text-brand-text/80 px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                        {activeSpecimen ? "SPECIMEN PREVIEW" : "CENTRAL GRAPHIC"}
                      </span>
                    </div>

                    {/* Arabic Inscription Plaque */}
                    {item.inscription && (
                      <div className="absolute bottom-2.5 left-2.5 z-20">
                        <div className="bg-brand-bg/95 border-2 border-brand-text px-2.5 py-1 shadow-[2px_2px_0px_#050505] flex items-center">
                          <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                            {item.inscription.startsWith("#") ? item.inscription : `# ${item.inscription}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Unhovered Bottom Specimen Count */}
                    {!isHovered && (
                      <div className="absolute bottom-2.5 right-2.5 z-20 font-mono text-[8.5px] font-black uppercase bg-brand-surface text-brand-text px-2 py-0.5 border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
                        {childSpecimens.length} SPECIMENS
                      </div>
                    )}
                  </div>

                  {/* CURATORIAL ARTIFACT DOSSIER (Revealed smoothly on hover/focus) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        style={{ willChange: "transform, opacity" }}
                        className="absolute inset-x-0 bottom-0 z-30 p-3.5 bg-brand-surface text-brand-text border-t-3 border-brand-text shadow-[0_-6px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between gap-2.5 font-mono"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Upper Identification Section */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8.5px] text-brand-accent font-black uppercase tracking-widest border-b border-brand-text/20 pb-1">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-brand-accent inline-block" />
                              ARTIFACT / {artifactNum}
                            </span>
                            <span className="text-brand-text/60 font-bold">
                              {item.artifactId}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-brand-text line-clamp-1">
                              # {item.name}
                            </h3>
                            <span className="font-mono text-xs font-black text-brand-text whitespace-nowrap">
                              {activeSpecimen
                                ? `PKR ${activeSpecimen.price.toLocaleString()}`
                                : minPrice > 0
                                  ? `FROM PKR ${minPrice.toLocaleString()}`
                                  : "CANONICAL"}
                            </span>
                          </div>

                          <p className="text-[9.5px] font-bold text-brand-text/80 uppercase tracking-wide line-clamp-2 leading-tight border-l-2 border-brand-accent pl-2">
                            {item.concept || item.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
                          </p>
                        </div>

                        {/* SEPARATE SPECIMENS SELECTOR INSIDE DOSSIER */}
                        <div className="border-t border-brand-text/20 pt-2 space-y-1 bg-brand-text/5 p-2 border border-brand-text/15">
                          <div className="flex items-center justify-between text-[8px] font-black uppercase text-brand-text/80">
                            <span className="flex items-center gap-1">
                              <Layers size={10} className="text-brand-accent" />
                              <span>SEPARATE SPECIMENS ({childSpecimens.length}):</span>
                            </span>
                            {activeSpecimen && (
                              <button
                                type="button"
                                onClick={(e) => handleSelectSpecimen(item.id, null, e)}
                                className="text-[7.5px] font-black text-brand-accent underline hover:text-brand-text uppercase"
                              >
                                VIEW GRAPHIC
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-1">
                            {childSpecimens.map((spec) => {
                              const isSelected = selectedSpecId === spec.id;
                              return (
                                <button
                                  key={spec.id}
                                  type="button"
                                  onClick={(e) => handleSelectSpecimen(item.id, spec.id, e)}
                                  className={`px-1.5 py-1 text-left border font-mono transition-all flex flex-col justify-between ${
                                    isSelected
                                      ? "bg-brand-text text-brand-bg border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
                                      : "bg-brand-surface text-brand-text border-brand-text/40 hover:border-brand-text hover:bg-brand-bg"
                                  }`}
                                >
                                  <div className="text-[8px] font-black uppercase truncate flex items-center justify-between">
                                    <span className="truncate">{spec.medium}</span>
                                    {isSelected && <Check size={8} className="text-brand-accent shrink-0" />}
                                  </div>
                                  <div className={`text-[7.5px] font-bold ${isSelected ? "text-brand-accent" : "text-brand-text/60"}`}>
                                    PKR {spec.price.toLocaleString()}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Complete Set Acquisition Bar */}
                        {setCalculation.hasDiscount && setCalculation.setPrice > 0 && (
                          <div className="bg-brand-accent/10 border border-brand-accent/40 p-1.5 flex items-center justify-between font-mono text-[8px]">
                            <div className="flex items-center gap-1 font-black text-brand-text uppercase">
                              <Box size={10} className="text-brand-accent" />
                              <span>FULL SET ({setCalculation.specimenCount}):</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="line-through text-brand-text/50">PKR {setCalculation.individualTotal.toLocaleString()}</span>
                              <span className="font-black text-brand-accent">PKR {setCalculation.setPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        {/* Primary Action Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.14);
                              onProductClick(item.rawEntity, selectedSpecId || undefined);
                            }}
                            className="w-full py-2 bg-brand-text hover:bg-brand-accent text-brand-bg hover:text-white text-[9.5px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>
                              {activeSpecimen
                                ? `EXPLORE ${activeSpecimen.medium.toUpperCase()} & ARCHIVE`
                                : "EXPLORE ARTIFACT & SPECIMENS"}
                            </span>
                            <MoveRight size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ORBITING SPECIMEN SATELLITES AROUND ARTIFACT CARD */}
                <AnimatePresence>
                  {scatterVisibleIdx === idx && childSpecimens.length > 0 && (
                    <>
                      {/* Architectural Header floating above card */}
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        style={{ willChange: "transform, opacity" }}
                        onMouseEnter={() => {
                          if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);
                          if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);
                          isInteractingWithSatellitesRef.current = true;
                          setScatterVisibleIdx(idx);
                          setActiveIdx(idx);
                        }}
                        onMouseLeave={() => {
                          if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);
                          satelliteExitTimerRef.current = setTimeout(() => {
                            isInteractingWithSatellitesRef.current = false;
                            handleDesktopItemLeave(idx);
                          }, 120);
                        }}
                        className="absolute -top-10 inset-x-0 z-50 flex items-center justify-between px-2.5 py-1 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505] font-mono text-[8px] font-black uppercase tracking-widest text-brand-text pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-brand-accent inline-block animate-ping" />
                          <span>SEPARATE PHYSICAL SPECIMENS</span>
                        </div>
                        <span className="text-brand-accent">{childSpecimens.length} MEDIA TYPES</span>
                      </motion.div>

                      {/* Scattered Brutalist Specimen Thumbnail Plates */}
                      {childSpecimens.map((spec, specIdx) => {
                        const scatter = SPECIMEN_SCATTER_OFFSETS[specIdx % SPECIMEN_SCATTER_OFFSETS.length];
                        const isSelected = selectedSpecId === spec.id;
                        const specImg = spec.images?.[0] || spec.thumbnailImage || item.graphic;

                        return (
                          <motion.button
                            key={`satellite-${spec.id}`}
                            type="button"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{
                              opacity: 1,
                              scale: isSelected ? 1.08 : 1,
                              rotate: scatter.rotate,
                              transition: {
                                duration: 0.12,
                                ease: [0.16, 1, 0.3, 1],
                              },
                            }}
                            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.08 } }}
                            whileHover={{ scale: 1.15, rotate: 0, zIndex: 60, transition: { duration: 0.08 } }}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              if (scatterLeaveTimerRef.current) clearTimeout(scatterLeaveTimerRef.current);
                              if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);
                              isInteractingWithSatellitesRef.current = true;
                              setScatterVisibleIdx(idx);
                              setActiveIdx(idx);
                              soundManager.playHover(0.02);
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              if (satelliteExitTimerRef.current) clearTimeout(satelliteExitTimerRef.current);
                              satelliteExitTimerRef.current = setTimeout(() => {
                                isInteractingWithSatellitesRef.current = false;
                                handleDesktopItemLeave(idx);
                              }, 120);
                            }}
                            onClick={(e) => handleSelectSpecimen(item.id, spec.id, e)}
                            style={{
                              position: "absolute",
                              left: scatter.x.includes("%") ? scatter.x : undefined,
                              right: !scatter.x.includes("%") && !scatter.x.startsWith("-") ? scatter.x : undefined,
                              top: scatter.y,
                              marginLeft: !scatter.x.includes("%") && scatter.x.startsWith("-") ? scatter.x : undefined,
                              willChange: "transform, opacity",
                            }}
                            className={`w-20 h-24 z-40 bg-brand-surface border-2 transition-all p-1 flex flex-col justify-between shadow-[3px_3px_0px_#050505] cursor-pointer ${
                              isSelected
                                ? "border-brand-accent ring-2 ring-brand-accent bg-brand-text text-brand-bg"
                                : "border-brand-text hover:border-brand-accent"
                            }`}
                            title={`Click to preview ${spec.medium} (PKR ${spec.price.toLocaleString()})`}
                          >
                            <div className="w-full h-14 bg-brand-bg overflow-hidden flex items-center justify-center border border-brand-text/30">
                              <img
                                src={specImg}
                                alt={spec.medium}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-1 select-none"
                              />
                            </div>
                            <div className="font-mono text-[7px] font-black uppercase truncate text-center leading-none mt-0.5">
                              {spec.medium}
                            </div>
                            <div className={`font-mono text-[7px] font-bold text-center leading-none ${isSelected ? "text-brand-accent" : "text-brand-text/60"}`}>
                              PKR {spec.price.toLocaleString()}
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
    </div>
  );
}
