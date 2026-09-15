import React, { useState } from "react";
import { Artifact, Specimen } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Layers, Box, Check, Sparkles } from "lucide-react";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";

interface ArtifactCardProps {
  key?: React.Key;
  artifact: Artifact;
  specimens: Specimen[];
  onClick: (specimenId?: string) => void;
  index?: number;
}

export default function ArtifactCard({ 
  artifact, 
  specimens, 
  onClick,
  index = 0 
}: ArtifactCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);

  const artifactNum = String(index + 1).padStart(2, '0');
  const childSpecimens = specimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    artifact.specimenIds?.includes(s.id)
  );

  const activeSpecimen = childSpecimens.find(s => s.id === selectedSpecimenId) || null;

  const specimenCount = childSpecimens.length;
  const availableCount = childSpecimens.filter(s => s.availability && s.status !== "sold_out").length;

  const minPrice = childSpecimens.length > 0 
    ? Math.min(...childSpecimens.map(s => s.price))
    : 0;

  const setCalculation = calculateArtifactSetPrice(artifact, childSpecimens);

  // Active image to display: either the selected specimen's image or the central graphic
  const displayImage = activeSpecimen?.images?.[0] || activeSpecimen?.thumbnailImage || artifact.graphic || "/Logo_NoName.jpg";

  const handleCardClick = () => {
    soundManager.playClick();
    onClick(selectedSpecimenId || undefined);
  };

  const handleSpecimenClick = (e: React.MouseEvent, specId: string) => {
    e.stopPropagation();
    soundManager.playToggle(0.08);
    setSelectedSpecimenId(selectedSpecimenId === specId ? null : specId);
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
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-text bg-brand-text/10 px-1.5 py-0.5 border border-brand-text/40">
            ARTIFACT {artifactNum}
          </span>
          <span className="font-mono text-[8px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
            {artifact.collectionName?.toUpperCase() || "CANONICAL"}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[8.5px] font-black uppercase bg-brand-accent/10 text-brand-accent px-2 py-0.5 border border-brand-accent/30">
          <Layers size={10} />
          <span>{specimenCount} {specimenCount === 1 ? "SPECIMEN" : "SPECIMENS"}</span>
        </div>
      </div>

      {/* Central Visual Graphic / Artwork */}
      <div className="relative aspect-[4/5] flex items-center justify-center overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3">
        <AnimatePresence mode="wait">
          <motion.img 
            key={displayImage}
            src={displayImage} 
            alt={activeSpecimen ? `${artifact.name} — ${activeSpecimen.medium}` : artifact.name}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 1, scale: isHovered ? 1.02 : 1 }}
            exit={{ opacity: 0.85 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="w-full h-full object-contain object-center p-3"
          />
        </AnimatePresence>

        {/* Top Artifact ID Ribbon */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <span className="text-[8px] font-mono tracking-widest font-black bg-brand-surface/95 text-brand-text px-1.5 py-0.5 uppercase border border-brand-text shadow-[1px_1px_0px_#050505]">
            {artifact.artifactId || `ART-${artifactNum}`}
          </span>
          {activeSpecimen && (
            <span className="text-[7.5px] font-mono font-black uppercase bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text animate-fadeIn">
              {activeSpecimen.medium}
            </span>
          )}
        </div>

        {/* Central Graphic / Specimen Tag Pill */}
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[7.5px] font-mono font-black uppercase bg-brand-surface/90 text-brand-text/80 px-1.5 py-0.5 border border-brand-text/60">
            {activeSpecimen ? "SPECIMEN MOCKUP" : "CENTRAL GRAPHIC"}
          </span>
        </div>

        {/* Arabic Inscription Plaque */}
        {artifact.inscription && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505] flex items-center">
              <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                {artifact.inscription.startsWith('#') ? artifact.inscription : `# ${artifact.inscription}`}
              </span>
            </div>
          </div>
        )}

        {/* Central Graphic Reset Button if a specimen is currently previewed */}
        {activeSpecimen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSpecimenId(null);
            }}
            className="absolute bottom-2 right-2 z-10 text-[7.5px] font-mono font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] hover:bg-brand-accent hover:text-white transition-colors"
          >
            VIEW GRAPHIC
          </button>
        )}
      </div>

      {/* Artifact Title & Concept Statement */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-mono font-black uppercase text-brand-text tracking-tight group-hover:text-brand-accent transition-colors truncate">
              {artifact.name}
            </h3>
            <span className="font-mono text-[11px] font-black text-brand-text whitespace-nowrap">
              {activeSpecimen 
                ? `PKR ${activeSpecimen.price.toLocaleString()}`
                : minPrice > 0 
                  ? `FROM PKR ${minPrice.toLocaleString()}`
                  : "CANONICAL"}
            </span>
          </div>
          
          <p className="text-[10px] font-mono font-bold uppercase text-brand-text/75 leading-relaxed line-clamp-2">
            {artifact.shortDescription || artifact.concept || artifact.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
          </p>
        </div>

        {/* SEPARATE SPECIMENS SELECTOR INSIDE THE ARTIFACT */}
        <div className="border-t-2 border-brand-text/30 pt-2 space-y-1.5 bg-brand-text/5 p-2 border border-brand-text/20">
          <div className="flex items-center justify-between text-[8px] font-mono font-black uppercase text-brand-text/80">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-brand-accent inline-block" />
              <span>SEPARATE SPECIMENS ({specimenCount}):</span>
            </span>
            <span className={availableCount > 0 ? "text-emerald-700" : "text-red-600"}>
              {availableCount > 0 ? `${availableCount} IN STOCK` : "ALLOTTED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {childSpecimens.map((spec) => {
              const isSelected = selectedSpecimenId === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={(e) => handleSpecimenClick(e, spec.id)}
                  className={`px-1.5 py-1 text-left font-mono text-[8px] border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-brand-text text-brand-bg border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
                      : "bg-brand-surface text-brand-text border-brand-text/40 hover:border-brand-text hover:bg-brand-bg"
                  }`}
                  title={`${spec.medium} — PKR ${spec.price.toLocaleString()}`}
                >
                  <div className="font-black uppercase truncate flex items-center justify-between gap-0.5">
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
        <div className="border-t-2 border-brand-text pt-2">
          <div className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505]">
            <span>
              {activeSpecimen ? `EXPLORE ${activeSpecimen.medium.toUpperCase()} & ARCHIVE` : "EXPLORE ARTIFACT & SPECIMENS"}
            </span>
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

