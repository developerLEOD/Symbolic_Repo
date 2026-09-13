import React, { useState, useRef, useEffect } from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeProductCategory, normalizeProductCollection, resolveProductImages, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

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
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const displayId = product.productId || product.sku || `SYM-0${(index ?? 0) + 1}`;
  const editionLabel = product.edition?.replace(/SPECIMENS/gi, "ARTIFACTS") || "050 ARTIFACTS";
  const medium = (categoryLabel || normalizeProductCategory(product)).toUpperCase();
  const collectionName = normalizeProductCollection(product);
  const collectionTag = collectionName.toUpperCase();
  const images = resolveProductImages(product);

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
    soundManager.playHover();
    setIsHovered(true);

    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
    }
    // Dwell delay of 320ms before revealing satellite angle plates
    enterTimerRef.current = setTimeout(() => {
      setShowAngles(true);
    }, 320);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setIsHovered(false);

    // Graceful exit buffer of 280ms
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowAngles(false);
    }, 280);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 450, damping: 26 } }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer rounded-none border-2 border-brand-text bg-brand-surface hover:bg-brand-bg transition-all duration-150 flex flex-col justify-between relative shadow-[4px_4px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#050505] p-3.5 sm:p-4"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Architectural Corner Registration Crosshairs */}
      <span className="absolute -top-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -top-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>

      {/* ─── 1. TOP ARTIFACT IDENTIFICATION HEADER ─── */}
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] font-black uppercase tracking-wider text-brand-text bg-brand-text/10 px-1.5 py-0.5 border border-brand-text/40">
            {artifactNum ? `ARTIFACT ${artifactNum}` : displayId}
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
      <div className="relative aspect-[4/5] overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3.5">
        <AnimatePresence mode="wait">
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
            initial={{ opacity: 0.75, scale: 0.99 }}
            animate={{ opacity: 1, scale: isHovered ? 1.03 : 1 }}
            exit={{ opacity: 0.7, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

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

        {/* Arabic Inscription Plaque (if present) */}
        {product.inscription && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505] flex items-center">
              <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                {product.inscription.startsWith('#') ? product.inscription : `# ${product.inscription}`}
              </span>
            </div>
          </div>
        )}

        {/* Multi-angle Navigation Chevrons */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-2 right-2 z-10">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider bg-brand-bg/95 text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                0{activeImageIndex + 1}/0{images.length}
              </span>
            </div>

            <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
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

      {/* PC BRUTALIST SCATTERED ELEVATION SATELLITES (Rendered outside the central image canvas on hover with dwell & exit grace) */}
      <AnimatePresence>
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
                { top: "-18px", right: "-28px", rotate: 4.5 },
                { top: "68px", right: "-32px", rotate: -3.8 },
                { top: "154px", right: "-26px", rotate: 3.2 },
                { top: "240px", right: "-30px", rotate: -4.0 },
              ];
              const off = offsets[i % offsets.length];
              const isSelected = activeImageIndex === i;

              return (
                <motion.button
                  key={i}
                  type="button"
                  initial={{ opacity: 0, scale: 0.5, rotate: off.rotate * 2 }}
                  animate={{
                    opacity: 1,
                    scale: isSelected ? 1.12 : 1,
                    rotate: off.rotate,
                    transition: {
                      delay: i * 0.04,
                      type: "spring",
                      stiffness: 400,
                      damping: 24,
                    },
                  }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.16 } }}
                  whileHover={{ scale: 1.2, rotate: 0, zIndex: 60 }}
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
                  className={`absolute z-40 w-13 h-13 p-0.5 bg-brand-surface border-2 font-mono pointer-events-auto cursor-pointer transition-colors ${
                    isSelected
                      ? "border-[#ff4500] shadow-[3px_3px_0px_#050505] bg-brand-bg ring-1 ring-[#ff4500]"
                      : "border-brand-text shadow-[2px_2px_0px_#050505] opacity-90 hover:opacity-100"
                  }`}
                  title={`Elevation 0${i + 1}`}
                >
                  <div className="relative w-full h-full overflow-hidden border border-brand-text/30 bg-brand-bg">
                    <img src={img || STUDIO_FALLBACK_IMAGE} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <span className={`absolute bottom-0 inset-x-0 text-[6px] font-black text-center uppercase py-px ${isSelected ? "bg-[#ff4500] text-white" : "bg-brand-text text-brand-bg"}`}>
                      0{i + 1}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

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
          <div className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505]">
            <span>{isComingSoon ? "PREVIEW DOSSIER" : "EXPLORE ARTIFACT"}</span>
            <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
