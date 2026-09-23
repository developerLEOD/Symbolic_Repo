import React, { useState, useRef, useEffect } from "react";
import { Product } from "../types";
import { ArrowUpRight, ChevronLeft, ChevronRight, Compass, Camera } from "lucide-react";
import { normalizeProductCategory, normalizeProductCollection, resolveProductImages, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";
import { motion, AnimatePresence } from "motion/react";

interface ProductCardProps {
  product: Product;
  categoryLabel: string;
  onClick: () => void;
  index?: number;
  layoutVariant?: 'standard' | 'large' | 'compact' | 'horizontal';
  key?: string;
}

export default function ProductCard({ 
  product, 
  categoryLabel, 
  onClick,
  index 
}: ProductCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showAngles, setShowAngles] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const displayId = product.productId || product.sku || `SYM-0${(index ?? 0) + 1}`;
  const editionLabel = product.edition?.replace(/ARTIFACTS/gi, "SPECIMENS") || "050 SPECIMENS";
  const medium = (categoryLabel || normalizeProductCategory(product)).toUpperCase();
  const collectionName = normalizeProductCollection(product);
  const collectionTag = collectionName.toUpperCase();
  const images = resolveProductImages(product);

  // Interval-driven clean cycling on hover through available specimen photos/angles
  useEffect(() => {
    if (!isHovered || images.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [isHovered, images.length]);

  const isComingSoon = Boolean(product.isComingSoon || product.comingSoon || product.status === "coming-soon");
  const isSoldOut = !isComingSoon && product.inventory !== undefined && product.inventory <= 0;
  const artifactNum = typeof index === 'number' ? String(index + 1).padStart(3, '0') : null;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.12);
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.12);
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleCardClick = () => {
    soundManager.playClick();
    onClick();
  };

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
    }

    enterTimerRef.current = setTimeout(() => {
      soundManager.playHover();
      setIsHovered(true);
      setShowAngles(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setIsHovered(false);
    setActiveImageIndex(0);

    // Snappy, clean exit buffer
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowAngles(false);
    }, 120);
  };

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 24, 
        delay: typeof index === 'number' ? Math.min(index * 0.04, 0.25) : 0 
      }}
      whileHover={{ 
        y: -6, 
        scale: 1.012, 
        transition: { type: "spring", stiffness: 420, damping: 18 } 
      }}
      whileTap={{ 
        scale: 0.985,
        transition: { type: "spring", stiffness: 500, damping: 20 }
      }}
      className={`group product-card cursor-pointer rounded-none border-2 transition-all duration-200 flex flex-col justify-between relative p-3.5 sm:p-4 transform-gpu will-change-transform ${
        isHovered
          ? "border-brand-accent outline outline-2 outline-offset-3 outline-brand-accent bg-brand-bg shadow-[10px_10px_0px_#050505]"
          : "border-brand-text bg-brand-surface hover:border-brand-accent hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent/70 hover:bg-brand-bg shadow-[4px_4px_0px_#050505] hover:shadow-[10px_10px_0px_#050505]"
      } active:shadow-[2px_2px_0px_#050505]`}
      data-product-card="true"
      data-preview-element="true"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Architectural Corner Registration Crosshairs */}
      <span 
        className="absolute -top-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors"
      >
        +
      </span>
      <span 
        className="absolute -top-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors"
      >
        +
      </span>
      <span 
        className="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors"
      >
        +
      </span>
      <span 
        className="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors"
      >
        +
      </span>

      {/* ─── 1. TOP ARTIFACT IDENTIFICATION HEADER ─── */}
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] font-black uppercase tracking-wider text-brand-text bg-brand-text/10 px-1.5 py-0.5 border border-brand-text/40">
            {artifactNum ? `SPECIMEN ${artifactNum}` : displayId}
          </span>
          <span className="font-mono text-[8.5px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
            {medium}
          </span>
        </div>

        <div className="font-mono text-[9px] sm:text-[9.5px] font-black uppercase text-brand-accent tracking-wider bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30">
          {editionLabel}
        </div>
      </div>

      {/* ─── 2. CENTRAL VISUAL ARTIFACT CANVAS (Clean 4:5 Aspect Ratio) ─── */}
      <div data-preview-canvas="true" className="relative aspect-[4/5] flex items-center justify-center overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3.5">
        <motion.img 
          key={activeImageIndex}
          src={images[activeImageIndex] || product.thumbnailImage || images[0] || STUDIO_FALLBACK_IMAGE} 
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== STUDIO_FALLBACK_IMAGE) {
              target.src = STUDIO_FALLBACK_IMAGE;
            }
          }}
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
          whileHover={{
            scale: 1.05,
            y: -3,
            transition: {
              type: "spring",
              stiffness: 450,
              damping: 16
            }
          }}
          className="w-full h-full object-contain object-center p-3 select-none pointer-events-none"
        />

        {/* Collection Badge & Coming Soon Pill */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          <span className="text-[8px] font-mono tracking-widest font-black bg-brand-surface/95 text-brand-text px-1.5 py-0.5 uppercase border border-brand-text shadow-[1px_1px_0px_#050505]">
            {collectionTag}
          </span>
          {isComingSoon && (
            <span className="text-[8px] font-mono tracking-wider font-black bg-brand-accent text-white px-2 py-0.5 uppercase border border-brand-text shadow-[1.5px_1.5px_0px_#050505] animate-pulse">
              COMING SOON
            </span>
          )}
        </div>

        {/* Top Right Angle Tag */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 z-10 font-mono">
            <span className="text-[7.5px] font-mono font-black uppercase bg-brand-surface/95 text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] flex items-center gap-1">
              <Camera size={9} className="text-brand-accent" />
              <span>ANG 0{activeImageIndex + 1}/0{images.length}</span>
            </span>
          </div>
        )}

        {/* Clean subtle dot indicators when cycling */}
        {isHovered && images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-3 z-20 flex items-center justify-center gap-1">
            <div className="bg-brand-surface/90 border border-brand-text px-2 py-0.5 flex items-center gap-1.5 shadow-[1px_1px_0px_#050505]">
              {images.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-none transition-all duration-200 ${
                    i === activeImageIndex ? "w-3 bg-brand-accent" : "w-1.5 bg-brand-text/30"
                  }`} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Arabic Inscription Plaque (if present and not cycling) */}
        {product.inscription && !isHovered && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505] flex items-center">
              <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                {product.inscription.startsWith('#') ? product.inscription : `# ${product.inscription}`}
              </span>
            </div>
          </div>
        )}

        {/* Multi-angle Navigation Chevrons */}
        {images.length > 1 && !isHovered && (
          <>
            <div className="absolute bottom-2 right-2 z-10">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider bg-brand-bg/95 text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                0{activeImageIndex + 1}/0{images.length}
              </span>
            </div>

            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Previous angle"
                className="pointer-events-auto p-1 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[1.5px_1.5px_0px_#050505] cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Next angle"
                className="pointer-events-auto p-1 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[1.5px_1.5px_0px_#050505] cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* PC BRUTALIST SCATTERED angles SATELLITES (Rendered outside the central image canvas on hover with dwell & exit grace) */}
      {showAngles && images.length > 1 && (
        <div 
          className="hidden sm:block pointer-events-none"
          onMouseEnter={() => {
            if (leaveTimerRef.current) {
              clearTimeout(leaveTimerRef.current);
              leaveTimerRef.current = null;
            }
            setShowAngles(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {images.map((img, i) => {
            const offsets = [
              { top: "-22px", right: "-42px", rotate: 4.5 },
              { top: "72px", right: "-48px", rotate: -3.8 },
              { top: "168px", right: "-40px", rotate: 3.2 },
              { top: "264px", right: "-46px", rotate: -4.0 },
            ];
            const off = offsets[i % offsets.length];
            const isSelected = activeImageIndex === i;

            return (
              <button
                key={i}
                type="button"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  if (leaveTimerRef.current) {
                    clearTimeout(leaveTimerRef.current);
                    leaveTimerRef.current = null;
                  }
                  setShowAngles(true);
                  soundManager.playHover(0.02);
                  setActiveImageIndex(i);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick(0.08);
                  setActiveImageIndex(i);
                }}
                style={{
                  top: off.top,
                  right: off.right,
                }}
                className={`absolute z-40 w-16 h-16 sm:w-18 sm:h-18 p-1 bg-brand-surface border-2 font-mono pointer-events-auto cursor-pointer transition-colors ${
                  isSelected
                    ? "border-[#ff4500] shadow-[4px_4px_0px_#050505] bg-brand-bg ring-2 ring-[#ff4500]"
                    : "border-brand-text shadow-[3px_3px_0px_#050505] opacity-90 hover:opacity-100 hover:border-brand-accent"
                }`}
                title={`Angle 0${i + 1}`}
              >
                <div className="relative w-full h-full overflow-hidden border border-brand-text/30 bg-brand-bg">
                  <img src={img || STUDIO_FALLBACK_IMAGE} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <span className={`absolute bottom-0 inset-x-0 text-[7.5px] font-black text-center uppercase py-0.5 tracking-wider ${isSelected ? "bg-[#ff4500] text-white" : "bg-brand-text text-brand-bg"}`}>
                    VIEW 0{i + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 3. ARTIFACT INFORMATION & CONVICTION ─── */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-mono font-black uppercase text-brand-text tracking-tight leading-snug group-hover:text-brand-accent transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-[10px] font-mono font-bold uppercase text-brand-text/75 leading-relaxed line-clamp-2">
            {product.symbolicTagline || product.statement || "STEADFAST CONVICTION, MATERIALIZED."}
          </p>
        </div>

        {/* Technical Ledger Strip */}
        <div className="grid grid-cols-2 gap-2 border-t border-brand-text/20 pt-2 font-mono text-[8.5px] uppercase">
          <div>
            <span className="text-brand-text/50 block text-[7px] font-bold">MATERIAL:</span>
            <span className="font-black text-brand-text truncate block">{product.material || "280 GSM COTTON"}</span>
          </div>
          <div className="text-right">
            <span className="text-brand-text/50 block text-[7px] font-bold">AVAILABILITY:</span>
            <span className={`font-black ${isComingSoon ? "text-brand-accent" : isSoldOut ? "text-red-600" : "text-brand-text"}`}>
              {isComingSoon ? "COMING SOON" : isSoldOut ? "ALLOTTED" : "REGISTERED"}
            </span>
          </div>
        </div>

        {/* ─── 4. ACTION BAR ─── */}
        <div className="border-t-2 border-brand-text pt-2.5">
          <div 
            role="button"
            data-action="true"
            className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
          >
            <span>{isComingSoon ? "PREVIEW DOSSIER" : "EXPLORE SPECIMEN"}</span>
            <div>
              <ArrowUpRight size={12} className="group-hover:text-brand-accent transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
