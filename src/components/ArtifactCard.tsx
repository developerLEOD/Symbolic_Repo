import React, { useState } from "react";
import { Artifact, Specimen } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Layers, Box, Check } from "lucide-react";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";

interface ArtifactCardProps {
  artifact: Artifact;
  specimens: Specimen[];
  onClick: () => void;
  index?: number;
}

export default function ArtifactCard({ 
  artifact, 
  specimens, 
  onClick,
  index = 0 
}: ArtifactCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = artifact.images && artifact.images.length > 0 
    ? artifact.images 
    : [artifact.graphic];

  const artifactNum = String(index + 1).padStart(2, '0');
  const childSpecimens = specimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    artifact.specimenIds?.includes(s.id)
  );

  const specimenCount = childSpecimens.length;
  const availableCount = childSpecimens.filter(s => s.availability && s.status !== "sold_out").length;

  const minPrice = childSpecimens.length > 0 
    ? Math.min(...childSpecimens.map(s => s.price))
    : 0;

  const setCalculation = calculateArtifactSetPrice(artifact, childSpecimens);

  const mediums = Array.from(new Set(childSpecimens.map(s => s.medium)));

  const handleCardClick = () => {
    soundManager.playClick();
    onClick();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 450, damping: 26 } }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer rounded-none border-2 border-brand-text bg-brand-surface hover:bg-brand-bg transition-all duration-150 flex flex-col justify-between relative shadow-[4px_4px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#050505] p-3.5 sm:p-4"
      onClick={handleCardClick}
      onMouseEnter={() => {
        soundManager.playHover(0.04);
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Corner Crosshairs */}
      <span className="absolute -top-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -top-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>
      <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text/60 select-none pointer-events-none group-hover:text-brand-accent transition-colors">+</span>

      {/* Top Identification Header */}
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] font-black uppercase tracking-wider text-brand-text bg-brand-text/10 px-1.5 py-0.5 border border-brand-text/40">
            ARTIFACT {artifactNum}
          </span>
          <span className="font-mono text-[8.5px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
            {artifact.collectionName?.toUpperCase() || "CANONICAL"}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[9px] font-black uppercase bg-brand-accent/10 text-brand-accent px-2 py-0.5 border border-brand-accent/30">
          <Layers size={10} />
          <span>{specimenCount} {specimenCount === 1 ? "SPECIMEN" : "SPECIMENS"}</span>
        </div>
      </div>

      {/* Central Visual Graphic / Artwork */}
      <div className="relative aspect-[4/5] flex items-center justify-center overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3.5">
        <AnimatePresence mode="wait">
          <motion.img 
            key={activeImageIndex}
            src={images[activeImageIndex] || artifact.graphic} 
            alt={artifact.name}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0.8, scale: 0.99 }}
            animate={{ opacity: 1, scale: isHovered ? 1.03 : 1 }}
            exit={{ opacity: 0.7, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full h-full object-contain object-center p-3"
          />
        </AnimatePresence>

        {/* Top Collection Ribbon */}
        <div className="absolute top-2 left-2 z-10">
          <span className="text-[8px] font-mono tracking-widest font-black bg-brand-surface/95 text-brand-text px-1.5 py-0.5 uppercase border border-brand-text shadow-[1px_1px_0px_#050505]">
            {artifact.artifactId || `ART-${artifactNum}`}
          </span>
        </div>

        {/* Inscription Plaque */}
        {artifact.inscription && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505] flex items-center">
              <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                {artifact.inscription.startsWith('#') ? artifact.inscription : `# ${artifact.inscription}`}
              </span>
            </div>
          </div>
        )}

        {/* Specimen Multi-Angle Quick Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 z-10 flex gap-1 bg-brand-bg/90 p-1 border border-brand-text shadow-[1px_1px_0px_#050505]">
            {images.slice(0, 4).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(i);
                }}
                className={`w-2 h-2 border border-brand-text transition-colors ${activeImageIndex === i ? "bg-brand-accent" : "bg-brand-surface"}`}
                aria-label={`View angle ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Artifact Title & Concept Statement */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-mono font-black uppercase text-brand-text tracking-tight group-hover:text-brand-accent transition-colors truncate">
              {artifact.name}
            </h3>
            {minPrice > 0 && (
              <span className="font-mono text-[11px] font-black text-brand-text whitespace-nowrap">
                FROM PKR {minPrice.toLocaleString()}
              </span>
            )}
          </div>
          
          <p className="text-[10px] font-mono font-bold uppercase text-brand-text/75 leading-relaxed line-clamp-2">
            {artifact.shortDescription || artifact.concept || artifact.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
          </p>
        </div>

        {/* Specimen Manifestations Strip */}
        <div className="border-t border-brand-text/20 pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[7.5px] font-mono font-black uppercase text-brand-text/60">
            <span>PHYSICAL SPECIMENS ({specimenCount}):</span>
            <span className={availableCount > 0 ? "text-emerald-700" : "text-red-600"}>
              {availableCount > 0 ? `${availableCount} AVAILABLE` : "SOLD OUT"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {mediums.map((med, i) => (
              <span 
                key={i}
                className="text-[8px] font-mono font-black uppercase bg-brand-bg text-brand-text border border-brand-text/50 px-1.5 py-0.5 shadow-[1px_1px_0px_#050505]"
              >
                {med}
              </span>
            ))}
          </div>
        </div>

        {/* Complete Set Acquisition Teaser */}
        {setCalculation.hasDiscount && setCalculation.setPrice > 0 && (
          <div className="bg-brand-accent/5 border border-brand-accent/30 p-1.5 flex items-center justify-between font-mono text-[8px]">
            <div className="flex items-center gap-1 font-black text-brand-text uppercase">
              <Box size={10} className="text-brand-accent" />
              <span>COMPLETE SET ({setCalculation.specimenCount}):</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="line-through text-brand-text/50">PKR {setCalculation.individualTotal.toLocaleString()}</span>
              <span className="font-black text-brand-accent">PKR {setCalculation.setPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="border-t-2 border-brand-text pt-2.5">
          <div className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505]">
            <span>EXPLORE ARTIFACT & SPECIMENS</span>
            <motion.div
              animate={{ 
                x: isHovered ? [0, 3, 0] : 0,
                y: isHovered ? [0, -3, 0] : 0
              }}
              transition={{ repeat: isHovered ? Infinity : 0, duration: 0.9, ease: "easeInOut" }}
            >
              <ArrowUpRight size={12} className="group-hover:text-brand-accent transition-colors" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
