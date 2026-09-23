import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, MoveRight, Layers, Box, Check, Sparkles, Camera, Eye } from "lucide-react";
import { Artifact, Specimen, Product, Category } from "../types";
import { resolveProductImages, normalizeProductCategory, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { buildSpecimenAngleSequence, SpecimenAngleSequenceItem } from "../lib/specimenAngles";
import { soundManager } from "../lib/soundEffects";
import ArtifactWatermark from "./ArtifactWatermark";

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

// Brutalist coordinate offsets for orbiting specimen plates (Clean spacing with subtle overlap)
const SPECIMEN_SCATTER_OFFSETS = [
  { x: "-195px", y: "-4px", rotate: -3.5 },
  { x: "103%", y: "24px", rotate: 3.2 },
  { x: "-190px", y: "196px", rotate: 2.2 },
  { x: "103%", y: "224px", rotate: -2.6 },
  { x: "-185px", y: "396px", rotate: -1.8 },
  { x: "103%", y: "424px", rotate: 2.4 },
  { x: "-195px", y: "596px", rotate: -2.2 },
  { x: "103%", y: "624px", rotate: 2.0 },
  { x: "-190px", y: "796px", rotate: -1.8 },
  { x: "103%", y: "824px", rotate: 1.8 },
  { x: "-185px", y: "996px", rotate: -1.5 },
  { x: "103%", y: "1024px", rotate: 1.5 },
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
  const [desktopHoverCycleIndex, setDesktopHoverCycleIndex] = useState(0);

  // Desktop state
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [scatterVisibleIdx, setScatterVisibleIdx] = useState<number | null>(null);
  const isInteractingWithSatellitesRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Interval-driven clean cycling through specimen angles for the centered active artifact
  useEffect(() => {
    if (activeIdx === null) {
      setDesktopHoverCycleIndex(0);
      return;
    }

    const currentItem = displayItems[activeIdx];
    if (!currentItem || currentItem.specimens.length === 0) {
      setDesktopHoverCycleIndex(0);
      return;
    }

    const angleSeq = buildSpecimenAngleSequence(currentItem.specimens, currentItem.graphic);
    if (angleSeq.length === 0) return;

    setDesktopHoverCycleIndex(0);
    const interval = setInterval(() => {
      setDesktopHoverCycleIndex((prev) => (prev + 1) % angleSeq.length);
    }, 1600);

    return () => {
      clearInterval(interval);
    };
  }, [activeIdx, displayItems]);

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

  // Desktop target scroll & animation references for smooth LERP centering
  const targetScrollRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);
  const lastUserMouseMoveTimeRef = useRef<number>(0);
  const lastMousePosRef = useRef({ x: -100, y: -100 });

  // Track intentional user mouse movement vs stationary cursor
  useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y);
      if (dx > 3 || dy > 3) {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        lastUserMouseMoveTimeRef.current = Date.now();
      }
    };
    window.addEventListener("mousemove", onGlobalMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onGlobalMouseMove);
  }, []);

  const cancelWheelAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    targetScrollRef.current = null;
    isTransitioningRef.current = false;
  }, []);

  // Monitor desktop scroll bounds
  const updateScrollBounds = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  // Smooth LERP (Linear Interpolation) scrolling engine to center artifacts
  const lerpScrollTo = useCallback((targetScrollLeft: number, onFrame?: () => void, onComplete?: () => void) => {
    const desktopContainer = containerRef.current;
    if (!desktopContainer) return;

    cancelWheelAnimation();

    const maxScroll = desktopContainer.scrollWidth - desktopContainer.clientWidth;
    const clampedTarget = Math.max(0, Math.min(maxScroll, targetScrollLeft));
    let current = desktopContainer.scrollLeft;

    if (Math.abs(current - clampedTarget) < 0.8) {
      desktopContainer.scrollLeft = clampedTarget;
      updateScrollBounds();
      isTransitioningRef.current = false;
      onFrame?.();
      onComplete?.();
      return;
    }

    targetScrollRef.current = clampedTarget;
    isTransitioningRef.current = true;
    const lerpSpeed = 0.12; // buttery, fluid LERP rate
    let lastTime = performance.now();

    const step = (now: number) => {
      if (!containerRef.current) return;
      const deltaMs = Math.min(32, now - lastTime);
      lastTime = now;

      // Frame-rate independent lerp calculation
      const dynamicFactor = 1 - Math.pow(1 - lerpSpeed, deltaMs / 16.666);
      const diff = clampedTarget - current;
      current += diff * dynamicFactor;

      containerRef.current.scrollLeft = current;
      updateScrollBounds();
      onFrame?.();

      if (Math.abs(clampedTarget - current) > 0.5) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        containerRef.current.scrollLeft = clampedTarget;
        rafIdRef.current = null;
        targetScrollRef.current = null;
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 80);
        updateScrollBounds();
        onFrame?.();
        onComplete?.();
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, [cancelWheelAnimation, updateScrollBounds]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      cancelWheelAnimation();
    };
  }, [cancelWheelAnimation]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollBounds, { passive: true });
    updateScrollBounds();
    return () => el.removeEventListener("scroll", updateScrollBounds);
  }, [displayItems, updateScrollBounds]);

  // Step smoothly to a specific artifact by index, LERPing it directly into center
  const shiftToArtifact = useCallback((targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= displayItems.length) return;
    const desktopContainer = containerRef.current;
    if (desktopContainer) {
      const targetEl = itemRefs.current[targetIdx];
      if (targetEl) {
        // Mark transition as active to suppress accidental mouseenter from cards scrolling underneath cursor
        isTransitioningRef.current = true;
        lastScrollTimeRef.current = Date.now();

        // Use immutable offsetLeft / offsetWidth for rock-solid centering
        const cardCenter = targetEl.offsetLeft + targetEl.offsetWidth / 2;
        const targetScroll = cardCenter - desktopContainer.clientWidth / 2;

        setActiveIdx(targetIdx);
        setScatterVisibleIdx(targetIdx);

        lerpScrollTo(targetScroll);
      }
    }
  }, [displayItems.length, lerpScrollTo]);

  // Idle timer to revert back to default centered state if no hovering occurs for a few moments
  const idleRevertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleRevertTimeoutRef.current) {
      clearTimeout(idleRevertTimeoutRef.current);
      idleRevertTimeoutRef.current = null;
    }
  }, []);

  const scheduleIdleRevert = useCallback((delayMs = 3200) => {
    resetIdleTimer();
    idleRevertTimeoutRef.current = setTimeout(() => {
      setActiveIdx(null);
      setScatterVisibleIdx(null);
      // Smoothly LERP container back to centering default stacked layout
      const desktopContainer = containerRef.current;
      const centerIdx = Math.floor(displayItems.length / 2);
      const centerEl = itemRefs.current[centerIdx] || itemRefs.current[0];
      if (desktopContainer && centerEl) {
        const cardCenter = centerEl.offsetLeft + centerEl.offsetWidth / 2;
        const targetScroll = cardCenter - desktopContainer.clientWidth / 2;
        lerpScrollTo(targetScroll);
      }
    }, delayMs);
  }, [displayItems.length, lerpScrollTo, resetIdleTimer]);

  // Initial mount & resize centering for default state
  useEffect(() => {
    if (displayItems.length > 0 && containerRef.current) {
      const centerDefaultState = () => {
        const desktopContainer = containerRef.current;
        const centerIdx = Math.floor(displayItems.length / 2);
        const centerEl = itemRefs.current[centerIdx] || itemRefs.current[0];
        if (desktopContainer && centerEl) {
          const cardCenter = centerEl.offsetLeft + centerEl.offsetWidth / 2;
          desktopContainer.scrollLeft = cardCenter - desktopContainer.clientWidth / 2;
        }
      };
      centerDefaultState();
      const timer = setTimeout(centerDefaultState, 100);
      return () => clearTimeout(timer);
    }
  }, [displayItems.length]);

  // Revert timer whenever activeIdx changes to a non-null index
  useEffect(() => {
    if (activeIdx !== null) {
      scheduleIdleRevert(3200);
    }
    return () => {
      resetIdleTimer();
    };
  }, [activeIdx, scheduleIdleRevert, resetIdleTimer]);

  // Keep a reference to current activeIdx
  const activeIdxRef = useRef<number | null>(activeIdx);

  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);

  // Section-wide wheel scroll listener: shifts exactly 1 entire artifact per scroll in the section
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const sectionEl = sectionRef.current;
      const desktopContainer = containerRef.current;
      const mobileContainer = mobileContainerRef.current;

      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;

      const isInsideDesktop = sectionEl && sectionEl.contains(targetEl);
      const isInsideMobile = mobileContainer && mobileContainer.contains(targetEl);

      if (!isInsideDesktop && !isInsideMobile) {
        return;
      }

      const rawDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(rawDelta) < 6) return;

      const currentIdx = activeIdxRef.current;
      let nextIdx: number;
      if (currentIdx === null) {
        nextIdx = rawDelta > 0 ? 0 : 0;
      } else {
        const direction = rawDelta > 0 ? 1 : -1;
        nextIdx = currentIdx + direction;
      }

      // Boundary check: If user reached edge in the direction of scroll, allow native page scroll
      if (nextIdx < 0 || nextIdx >= displayItems.length) {
        return;
      }

      // Intercept wheel scroll to step exactly 1 artifact in the direction of scroll
      e.preventDefault();

      const now = Date.now();
      if (now - lastScrollTimeRef.current < 300) {
        return;
      }
      lastScrollTimeRef.current = now;

      soundManager.playToggle(0.04);

      if (isInsideDesktop && desktopContainer) {
        shiftToArtifact(nextIdx);
      } else if (isInsideMobile && mobileContainer) {
        const targetCard = mobileCardRefs.current[nextIdx];
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          setActiveMobileIdx(nextIdx);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [displayItems.length, shiftToArtifact]);

  // Smooth desktop manual pan
  const handlePan = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    cancelWheelAnimation();
    soundManager.playToggle(0.06);
    const current = activeIdxRef.current ?? 0;
    const next = direction === "right"
      ? Math.min(displayItems.length - 1, current + 1)
      : Math.max(0, current - 1);
    shiftToArtifact(next);
  };

  // Desktop Mouse Drag-to-pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    cancelWheelAnimation();
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
    if (isDragging && hasMovedDuringDrag && containerRef.current) {
      const container = containerRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let closestIdx = 0;
      let minDistance = Infinity;

      itemRefs.current.forEach((el, idx) => {
        if (!el) return;
        const cardCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(containerCenter - cardCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      shiftToArtifact(closestIdx);
    }
    setIsDragging(false);
  };

  // Specimen switching handlers on the centered artifact
  const handleSelectSpecimen = (artifactId: string, specimenId: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundManager.playToggle(0.08);
    setSelectedSpecimenMap((prev) => ({
      ...prev,
      [artifactId]: prev[artifactId] === specimenId ? null : specimenId,
    }));
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
                data-artifact-card="true"
                data-product-card="true"
                data-preview-element="true"
                data-artifact-index={idx}
                className={`product-card artifact-card shrink-0 w-[78vw] max-w-[320px] snap-center aspect-[4/5] bg-brand-surface border-3 border-brand-text transition-all duration-300 relative cursor-pointer ${
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

                  {/* Archival Watermark on Central Graphic / Artwork */}
                  {(!itemActiveSpec || cardImg === item.graphic) && (
                    <ArtifactWatermark
                      artifactName={item.name}
                      artifactId={item.artifactId}
                      collectionName={item.collectionName}
                      variant="subtle"
                    />
                  )}

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
          <div className="mx-4 p-4 bg-brand-surface/90 backdrop-blur-md border-2 border-brand-text shadow-[6px_6px_0px_#050505] space-y-3 font-mono">
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
              <span className="text-[9px] font-black text-brand-accent uppercase tracking-wider">
                {activeMobileSpecimen ? activeMobileSpecimen.medium : `${mobileChildSpecs.length} SPECIMENS`}
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

              {/* Scattered Brutalist Specimen Preview Plates */}
              <div className={`grid gap-2.5 sm:gap-3.5 py-2 px-1 ${
                mobileChildSpecs.length === 1
                  ? "grid-cols-1 max-w-[180px] mx-auto"
                  : mobileChildSpecs.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
              }`}>
                {mobileChildSpecs.map((spec, specIdx) => {
                  const isSelected = mobileSelectedSpecId === spec.id;
                  const specImg = spec.images?.[0] || spec.thumbnailImage || activeMobileItem.graphic;

                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={(e) => handleSelectSpecimen(activeMobileItem.id, spec.id, e)}
                      onMouseEnter={() => soundManager.playHover(0.02)}
                      className={`relative p-1.5 text-left border-2 font-mono transition-colors cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-brand-surface border-brand-accent ring-2 ring-brand-accent shadow-[4px_4px_0px_#ff4500] z-10"
                          : "bg-brand-surface border-brand-text shadow-[3px_3px_0px_#050505] hover:border-brand-accent hover:shadow-[4px_4px_0px_#050505]"
                      }`}
                      title={`Preview ${spec.medium}`}
                    >
                      {/* Specimen Visual Thumbnail */}
                      <div className="w-full h-20 sm:h-24 bg-brand-bg border border-brand-text/30 overflow-hidden flex items-center justify-center relative">
                        <img
                          src={specImg}
                          alt={spec.medium}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1 select-none pointer-events-none"
                          loading="lazy"
                        />
                        {isSelected ? (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-brand-accent text-white text-[7px] font-black uppercase tracking-wider leading-none shadow-[1px_1px_0px_#050505]">
                            ACTIVE
                          </div>
                        ) : (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-brand-surface/90 text-brand-text text-[6.5px] font-black uppercase tracking-wider leading-none border border-brand-text/40">
                            0{specIdx + 1}
                          </div>
                        )}
                      </div>

                      {/* Specimen Metadata Info */}
                      <div className="pt-1.5 space-y-0.5">
                        <div className="text-[9px] sm:text-[9.5px] font-black uppercase truncate flex items-center justify-between text-brand-text">
                          <span className="truncate">{spec.medium}</span>
                          {isSelected && <Check size={10} className="text-brand-accent shrink-0 ml-1" />}
                        </div>
                        <div className={`text-[7.5px] font-bold uppercase truncate ${isSelected ? "text-brand-accent" : "text-brand-text/60"}`}>
                          {spec.material || "CANONICAL"}
                        </div>
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
    <div
      ref={sectionRef}
      onMouseLeave={() => scheduleIdleRevert(800)}
      className="relative w-full overflow-hidden select-none py-4"
    >
      {/* Desktop Exhibition Controls */}
      <div className="flex items-center justify-between px-6 sm:px-12 mb-2 font-mono text-[9px] font-black uppercase tracking-wider text-brand-text/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-accent inline-block" />
          <span>CURATED ARTIFACT EXHIBITION // {displayItems.length} MASTER ARTIFACTS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[8.5px] font-mono font-bold text-brand-text/65 uppercase tracking-widest border border-brand-text/20 bg-brand-surface/80 px-2 py-0.5 shadow-[1px_1px_0px_#050505]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
            <span>SCROLL ANYWHERE TO MOVE ARTIFACTS</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePan("left")}
              disabled={!canScrollLeft}
              data-cursor-snap="true"
              className="relative p-1.5 border border-brand-text bg-brand-surface disabled:opacity-30 hover:bg-brand-text hover:text-brand-bg transition-colors shadow-[1px_1px_0px_#050505] cursor-pointer group"
              title="Previous Artifact"
            >
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handlePan("right")}
              disabled={!canScrollRight}
              data-cursor-snap="true"
              className="relative p-1.5 border border-brand-text bg-brand-surface disabled:opacity-30 hover:bg-brand-text hover:text-brand-bg transition-colors shadow-[1px_1px_0px_#050505] cursor-pointer group"
              title="Next Artifact"
            >
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-brand-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Overlapping Staging Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`w-full overflow-x-auto hide-scrollbar pt-20 sm:pt-24 pb-24 px-0 cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? "select-none" : ""
        }`}
      >
        <div
          ref={trackRef}
          className="flex items-center min-w-max w-max"
          style={{
            minHeight: "620px",
            paddingLeft: "calc(50vw - 190px)",
            paddingRight: "calc(50vw - 190px)",
          }}
        >
          {displayItems.map((item, idx) => {
            const isCentered = activeIdx === idx;
            const baseOffset = SPECIMEN_OFFSETS[idx % SPECIMEN_OFFSETS.length];
            const artifactNum = String(idx + 1).padStart(2, "0");

            const selectedSpecId = selectedSpecimenMap[item.id];
            const childSpecimens = item.specimens;
            
            // Multi-angle cycling on centered artifact
            const itemAngleSeq = buildSpecimenAngleSequence(childSpecimens, item.graphic);
            const isAutoCycling = isCentered && itemAngleSeq.length > 0 && !selectedSpecId;
            const currentAngleItem = isAutoCycling
              ? itemAngleSeq[desktopHoverCycleIndex % itemAngleSeq.length]
              : null;

            const activeSpecimen = selectedSpecId 
              ? item.specimens.find((s) => s.id === selectedSpecId) || null 
              : currentAngleItem
                ? item.specimens.find((s) => s.id === currentAngleItem.specimenId) || null
                : null;

            const currentImg = currentAngleItem
              ? currentAngleItem.image
              : activeSpecimen?.images?.[0] || activeSpecimen?.thumbnailImage || item.graphic;

            const setCalculation = calculateArtifactSetPrice(item.rawEntity as any, childSpecimens);

            // Centered artifact is prominently featured; neighboring artifacts part cleanly
            let displacementX = 0;
            let targetScale = activeIdx === null ? 1 : 0.96;
            let targetZ = 10 + idx;
            let targetY = baseOffset.y;
            let targetRotate = baseOffset.rotate;

            if (isCentered) {
              displacementX = 0;
              targetScale = 1.05;
              targetZ = 50;
              targetY = -18;
              targetRotate = 0;
            } else if (activeIdx !== null && idx < activeIdx) {
              const distanceFactor = Math.max(0, activeIdx - idx - 1);
              displacementX = -(260 + distanceFactor * 35);
              targetScale = 0.96;
              targetZ = 10 + idx;
              targetY = baseOffset.y + 4;
            } else if (activeIdx !== null && idx > activeIdx) {
              const distanceFactor = Math.max(0, idx - activeIdx - 1);
              displacementX = +(260 + distanceFactor * 35);
              targetScale = 0.96;
              targetZ = 10 + idx;
              targetY = baseOffset.y + 4;
            }

            return (
              <motion.div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onMouseEnter={() => {
                  // Ignore hover events triggered by cards sliding under a stationary cursor during or right after scrolling
                  if (isTransitioningRef.current || Date.now() - lastScrollTimeRef.current < 450) {
                    return;
                  }
                  if (lastUserMouseMoveTimeRef.current < lastScrollTimeRef.current) {
                    return;
                  }
                  scheduleIdleRevert(3200);
                  if (activeIdx !== idx) {
                    setActiveIdx(idx);
                    setScatterVisibleIdx(idx);
                    soundManager.playHover(0.02);
                  }
                }}
                onClick={() => {
                  if (isCentered) {
                    handleDesktopItemClick(item, idx);
                  } else {
                    shiftToArtifact(idx);
                  }
                }}
                animate={{
                  x: displacementX,
                  y: targetY,
                  rotate: targetRotate,
                  scale: targetScale,
                  zIndex: targetZ,
                }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 28,
                  mass: 0.5,
                }}
                style={{
                  marginLeft: idx === 0 ? "0px" : "-115px",
                  zIndex: targetZ,
                }}
                data-artifact-card={isCentered ? "true" : undefined}
                data-active-artifact={isCentered ? "true" : undefined}
                data-artifact-index={idx}
                className={`product-card artifact-card relative shrink-0 w-[280px] sm:w-[330px] md:w-[370px] lg:w-[410px] aspect-[3/4] cursor-pointer ${
                  idx !== 0 ? "sm:-ml-[140px] md:-ml-[165px] lg:-ml-[190px]" : ""
                }`}
              >
                {/* PHYSICAL 3:4 ARTIFACT FRAME */}
                <div
                  data-preview-canvas={isCentered ? "true" : undefined}
                  className={`w-full h-full relative overflow-hidden flex items-center justify-center bg-brand-bg border-2 border-brand-text transition-all duration-300 ${
                    isCentered
                      ? "shadow-[10px_10px_0px_#050505,0_0_0_1.5px_#ff4500] opacity-100"
                      : "shadow-[5px_5px_0px_#050505] opacity-100"
                  }`}
                >
                  {/* Central Graphic Canvas */}
                  <div className="w-full h-full relative flex items-center justify-center bg-brand-bg">
                    <motion.img
                      key={currentImg}
                      src={currentImg}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      initial={{ scale: 0.92, y: 5 }}
                      animate={{ 
                        scale: 1, 
                        y: 0,
                        transition: {
                          type: "spring",
                          stiffness: 650,
                          damping: 26,
                          mass: 0.4
                        }
                      }}
                      className="w-full h-full object-contain object-center select-none pointer-events-none p-0 sm:p-1"
                      loading="lazy"
                    />

                    {/* Archival Watermark on Central Graphic / Artwork */}
                    {(!activeSpecimen && !currentAngleItem || currentImg === item.graphic) && (
                      <ArtifactWatermark
                        artifactName={item.name}
                        artifactId={item.artifactId}
                        collectionName={item.collectionName}
                        variant="subtle"
                      />
                    )}

                    {/* Top Accession & Collection Badge */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 font-mono">
                      <span className="text-[8px] font-black uppercase bg-brand-surface text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                        {item.artifactId}
                      </span>
                      <span className="text-[7.5px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
                        {item.collectionName?.toUpperCase() || "CANONICAL"}
                      </span>
                      {activeSpecimen && (
                        <span className="text-[7.5px] font-mono font-black uppercase bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] flex items-center gap-1">
                          {activeSpecimen.medium}
                        </span>
                      )}
                    </div>

                    {/* Top Right Specimen & Angle Tag */}
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 font-mono">
                      {currentAngleItem ? (
                        <span className="text-[7.5px] font-mono font-black uppercase bg-brand-surface/95 text-brand-text px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] flex items-center gap-1">
                          <Camera size={9} className="text-brand-accent" />
                          <span>
                            {currentAngleItem.medium} (ANG 0{currentAngleItem.angleIndex + 1}/0{currentAngleItem.totalAnglesForSpecimen})
                          </span>
                        </span>
                      ) : (
                        <span className={`text-[7.5px] font-mono font-black uppercase px-2 py-0.5 border shadow-[1px_1px_0px_#050505] transition-colors ${
                          activeSpecimen
                            ? "bg-brand-accent text-white border-brand-text"
                            : "bg-brand-surface/95 text-brand-text/80 border-brand-text"
                        }`}>
                          {activeSpecimen ? "SPECIMEN PINNED" : "ARTWORK"}
                        </span>
                      )}
                    </div>

                    {/* Clean segment dots on auto-cycling */}
                    {isAutoCycling && itemAngleSeq.length > 1 && (
                      <div className="absolute bottom-3 inset-x-4 z-20 flex items-center justify-center gap-1">
                        <div className="bg-brand-surface/90 border border-brand-text px-2 py-0.5 flex items-center gap-1.5 shadow-[1px_1px_0px_#050505]">
                          {itemAngleSeq.map((it, aIdx) => {
                            const isActive = aIdx === (desktopHoverCycleIndex % itemAngleSeq.length);
                            return (
                              <div 
                                key={it.id}
                                className={`h-1.5 rounded-none transition-all duration-200 ${
                                  isActive 
                                    ? "w-3 bg-brand-accent" 
                                    : "w-1.5 bg-brand-text/30"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Arabic Inscription Plaque */}
                    {!isAutoCycling && item.inscription && (
                      <div className="absolute bottom-2.5 left-2.5 z-20">
                        <div className="bg-brand-bg/95 border-2 border-brand-text px-2.5 py-1 shadow-[2px_2px_0px_#050505] flex items-center">
                          <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                            {item.inscription.startsWith("#") ? item.inscription : `# ${item.inscription}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Uncentered Bottom Specimen Count */}
                    {!isCentered && (
                      <div className="absolute bottom-2.5 right-2.5 z-20 font-mono text-[8.5px] font-black uppercase bg-brand-surface text-brand-text px-2 py-0.5 border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
                        {childSpecimens.length} SPECIMENS
                      </div>
                    )}
                  </div>

                  {/* CURATORIAL ARTIFACT DOSSIER (Always shown on centered artifact) */}
                  <AnimatePresence>
                    {isCentered && (
                      <motion.div
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute inset-x-0 bottom-0 z-30 p-3.5 bg-brand-surface/90 backdrop-blur-md text-brand-text border-t-3 border-brand-text shadow-[0_-6px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between gap-2.5 font-mono"
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
                          <span className="font-mono text-[9px] font-black text-brand-accent uppercase tracking-wider whitespace-nowrap">
                            {activeSpecimen ? activeSpecimen.medium : `${childSpecimens.length} SPECIMENS`}
                          </span>
                        </div>

                        <p className="text-[9.5px] font-bold text-brand-text/80 uppercase tracking-wide line-clamp-2 leading-tight border-l-2 border-brand-accent pl-2">
                          {item.concept || item.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
                        </p>
                      </div>

                      {/* Complete Set Acquisition Bar */}
                      {setCalculation.hasDiscount && setCalculation.setPrice > 0 && (
                        <div className="bg-brand-accent/10 border border-brand-accent/40 p-1.5 flex items-center justify-between font-mono text-[8px]">
                          <div className="flex items-center gap-1 font-black text-brand-text uppercase">
                            <Box size={10} className="text-brand-accent" />
                            <span>FULL SET ({setCalculation.specimenCount} SPECIMENS):</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-black text-brand-accent uppercase tracking-wider">BUNDLE AVAILABLE</span>
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
                            <span>Inspect And Aquire</span>
                            <MoveRight size={12} />
                          </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>

                {/* ORBITING SPECIMEN SATELLITES AROUND CENTERED ARTIFACT */}
                <AnimatePresence>
                  {isCentered && childSpecimens.length > 0 && (
                    <>
                      {/* Architectural Header floating above card */}
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -top-10 inset-x-0 flex items-center justify-between pointer-events-none z-40 px-2 font-mono"
                      >
                        <div className="flex items-center gap-1.5 bg-brand-bg/95 border border-brand-text/50 px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505]">
                          <span className="w-1.5 h-1.5 bg-brand-accent inline-block animate-pulse" />
                          <span className="text-[8px] font-black uppercase text-brand-text tracking-widest">
                            SPECIMEN SATELLITES ({childSpecimens.length})
                          </span>
                        </div>
                        {selectedSpecId && (
                          <button
                            type="button"
                            onClick={(e) => handleSelectSpecimen(item.id, null, e)}
                            className="pointer-events-auto bg-brand-accent text-white border border-brand-text px-1.5 py-0.5 text-[7.5px] font-mono font-black uppercase tracking-wider hover:bg-brand-text transition-colors shadow-[1px_1px_0px_#050505] cursor-pointer"
                          >
                            RESET PIN ✕
                          </button>
                        )}
                      </motion.div>

                      {/* Orbiting Satellite Cards */}
                      {childSpecimens.map((spec, specIdx) => {
                        const scatter = SPECIMEN_SCATTER_OFFSETS[specIdx % SPECIMEN_SCATTER_OFFSETS.length];
                        const isSelected = selectedSpecId === spec.id;
                        const specImg = spec.images?.[0] || spec.thumbnailImage || item.graphic;

                        return (
                          <motion.button
                            key={`satellite-${spec.id}`}
                            type="button"
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1, rotate: scatter.rotate }}
                            exit={{ opacity: 0, scale: 0.88 }}
                            transition={{ duration: 0.18, delay: specIdx * 0.02 }}
                            whileHover={{ scale: 1.04, zIndex: 60, transition: { duration: 0.12 } }}
                            whileTap={{ scale: 0.98 }}
                            onMouseEnter={() => {
                              if (isTransitioningRef.current || Date.now() - lastScrollTimeRef.current < 450) {
                                return;
                              }
                              if (lastUserMouseMoveTimeRef.current < lastScrollTimeRef.current) {
                                return;
                              }
                              scheduleIdleRevert(3200);
                              handleSelectSpecimen(item.id, spec.id);
                            }}
                            onClick={(e) => {
                              scheduleIdleRevert(3200);
                              handleSelectSpecimen(item.id, spec.id, e);
                            }}
                            style={{
                              position: "absolute",
                              left: scatter.x.includes("%") ? scatter.x : undefined,
                              right: !scatter.x.includes("%") && !scatter.x.startsWith("-") ? scatter.x : undefined,
                              top: scatter.y,
                              marginLeft: !scatter.x.includes("%") && scatter.x.startsWith("-") ? scatter.x : undefined,
                              pointerEvents: isTransitioningRef.current ? "none" : "auto",
                            }}
                            data-product-card="true"
                            className={`product-card specimen-card w-38 sm:w-44 h-52 sm:h-56 z-40 bg-brand-surface border-2 transition-colors p-2 flex flex-col justify-between shadow-[4px_4px_0px_#050505] cursor-pointer text-left ${
                              isSelected
                                ? "border-brand-accent ring-2 ring-brand-accent bg-brand-surface shadow-[6px_6px_0px_#ff4500]"
                                : "border-brand-text hover:border-brand-accent hover:shadow-[6px_6px_0px_#050505]"
                            }`}
                            title={`Hover or click to preview ${spec.medium}`}
                          >
                            {/* Product Mockup Image Container */}
                            <div className="w-full h-30 sm:h-34 bg-brand-bg overflow-hidden flex items-center justify-center border border-brand-text/30 relative">
                              <img
                                src={specImg}
                                alt={spec.medium}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-2 select-none"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-brand-accent text-white text-[7.5px] font-mono font-black uppercase tracking-wider">
                                  ACTIVE
                                </div>
                              )}
                            </div>

                            {/* Specimen Metadata Info */}
                            <div className="space-y-0.5 pt-1.5 border-t border-brand-text/15">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[9.5px] sm:text-[10px] font-black uppercase tracking-tight text-brand-text truncate">
                                  {spec.medium}
                                </span>
                                <span className="font-mono text-[8px] font-black text-brand-accent uppercase tracking-wider shrink-0">
                                  PREVIEW →
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[8px] font-mono text-brand-text/65 uppercase tracking-wide">
                                <span className="truncate">{spec.material || "CANONICAL STRUCTURE"}</span>
                                <span className="font-bold underline text-brand-text hover:text-brand-accent">
                                  SELECT
                                </span>
                              </div>
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
