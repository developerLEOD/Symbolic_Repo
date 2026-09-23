import React, { useState, useRef, useEffect } from "react";
import { Specimen, Artifact } from "../types";
import { ArrowUpRight, ChevronLeft, ChevronRight, ShieldCheck, Camera } from "lucide-react";
import { soundManager } from "../lib/soundEffects";
import { motion, AnimatePresence } from "motion/react";
import { centerElementInViewport } from "../lib/scrollUtils";

interface SpecimenCardProps {
  specimen: Specimen;
  parentArtifact?: Artifact;
  onClick: () => void;
  index?: number;
}

export default function SpecimenCard({ 
  specimen, 
  parentArtifact, 
  onClick,
  index = 0 
}: SpecimenCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const images = specimen.images && specimen.images.length > 0 
    ? specimen.images 
    : (parentArtifact?.images || [specimen.thumbnailImage || ""]);

  // Clean interval cycling on hover through available specimen images/angles
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

  const isSoldOut = !specimen.availability || specimen.status === "sold_out" || specimen.inventory <= 0;
  const artifactName = parentArtifact?.name || specimen.artifactName || "CANONICAL";

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.1);
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.1);
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 340, 
        damping: 24, 
        delay: Math.min(index * 0.035, 0.22) 
      }}
      whileHover={{ 
        y: -6, 
        scale: 1.012, 
        transition: { type: "spring", stiffness: 460, damping: 18 } 
      }}
      whileTap={{ 
        scale: 0.985,
        y: -1,
        transition: { type: "spring", stiffness: 600, damping: 18 }
      }}
      ref={cardRef}
      className={`group specimen-card cursor-pointer rounded-none border-2 transition-all duration-200 flex flex-col justify-between relative p-3.5 sm:p-4 transform-gpu will-change-transform ${
        isHovered
          ? "border-brand-accent outline outline-2 outline-offset-3 outline-brand-accent bg-brand-bg shadow-[10px_10px_0px_#050505]"
          : "border-brand-text bg-brand-surface hover:border-brand-accent hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent/70 hover:bg-brand-bg shadow-[4px_4px_0px_#050505] hover:shadow-[10px_10px_0px_#050505]"
      } active:shadow-[2px_2px_0px_#050505]`}
      data-product-card="true"
      onClick={() => {
        soundManager.playClick();
        onClick();
      }}
      onMouseEnter={() => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
        hoverTimerRef.current = setTimeout(() => {
          soundManager.playHover(0.03);
          setIsHovered(true);
          centerElementInViewport(cardRef.current);
        }, 200);
      }}
      onMouseLeave={() => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        setIsHovered(false);
        setActiveImageIndex(0);
      }}
    >
      {/* Corner crosshairs */}
      <span className="absolute -top-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -top-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>

      {/* Identification Header */}
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
            {specimen.medium}
          </span>
          <span className="font-mono text-[9px] font-black uppercase text-brand-text/70 bg-brand-text/10 px-1.5 py-0.5 border border-brand-text/30">
            {specimen.sku}
          </span>
        </div>

        <div className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 border ${
          isSoldOut 
            ? "bg-red-50 text-red-600 border-red-300" 
            : "bg-emerald-50 text-emerald-700 border-emerald-300"
        }`}>
          {isSoldOut ? "ALLOTTED" : "AVAILABLE"}
        </div>
      </div>

      {/* Central Visual Specimen Canvas */}
      <div className="relative aspect-[4/5] flex items-center justify-center overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3.5">
        <motion.img 
          key={activeImageIndex}
          src={images[activeImageIndex] || specimen.thumbnailImage} 
          alt={`${artifactName} ${specimen.medium}`}
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

        {/* Parent Artifact Ribbon */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          <span className="text-[8.5px] font-mono tracking-widest font-black bg-brand-surface text-brand-text px-2 py-0.5 uppercase border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
            ARTIFACT: {artifactName}
          </span>
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

        {/* Clean segment dots on hover */}
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

        {/* Navigation Chevrons */}
        {images.length > 1 && !isHovered && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="Previous angle"
              className="pointer-events-auto p-1 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Next angle"
              className="pointer-events-auto p-1 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Information Strip */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="text-sm sm:text-base font-mono font-black uppercase text-brand-text tracking-tight group-hover:text-brand-accent transition-colors line-clamp-1">
              {artifactName} — {specimen.medium}
            </h3>
            <span className="font-mono text-[9px] font-black text-brand-accent uppercase tracking-wider whitespace-nowrap">
              SPECIMEN
            </span>
          </div>

          <p className="text-[9.5px] font-mono font-bold uppercase text-brand-text/75 leading-relaxed line-clamp-1 mt-0.5">
            {specimen.type || specimen.garmentType || specimen.color || "Standard Edition"}
          </p>
        </div>

        {/* Technical Ledger Strip */}
        <div className="grid grid-cols-2 gap-2 border-t border-brand-text/20 pt-2 font-mono text-[8px] uppercase">
          <div>
            <span className="text-brand-text/50 block text-[7px] font-bold">MATERIAL / CUT:</span>
            <span className="font-black text-brand-text truncate block">{specimen.material || specimen.type || "HEAVY COTTON"}</span>
          </div>
          <div className="text-right">
            <span className="text-brand-text/50 block text-[7px] font-bold">SIZES:</span>
            <span className="font-black text-brand-text truncate block">
              {specimen.availableSizes?.join(", ") || "S, M, L, XL"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="border-t-2 border-brand-text pt-2.5">
          <div className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505]">
            <span>ACQUIRE SPECIMEN</span>
            <div>
              <ArrowUpRight size={12} className="group-hover:text-brand-accent transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
