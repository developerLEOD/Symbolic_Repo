import React, { useState, useMemo, useRef, useEffect } from "react";
import { Artifact, Specimen } from "../types";
import { ArrowUpRight, Layers, Box, Check, Sparkles, Camera, Eye } from "lucide-react";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { buildSpecimenAngleSequence, SpecimenAngleSequenceItem } from "../lib/specimenAngles";
import { soundManager } from "../lib/soundEffects";
import { motion, AnimatePresence } from "motion/react";
import ArtifactWatermark from "./ArtifactWatermark";

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
  const [hoverCycleIndex, setHoverCycleIndex] = useState(0);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const artifactNum = String(index + 1).padStart(2, '0');
  const childSpecimens = useMemo(() => {
    return specimens.filter(s => 
      s.parentArtifactId === artifact.id || 
      artifact.specimenIds?.includes(s.id)
    );
  }, [specimens, artifact.id, artifact.specimenIds]);

  // Build full multi-angle sequential list across all specimens attached to artifact
  const angleSequence = useMemo(() => {
    return buildSpecimenAngleSequence(childSpecimens, artifact.graphic);
  }, [childSpecimens, artifact.graphic]);

  // Interval-driven clean cycling on hover through all specimen angles
  useEffect(() => {
    if (!isHovered || angleSequence.length === 0 || selectedSpecimenId !== null) {
      setHoverCycleIndex(0);
      return;
    }

    setHoverCycleIndex(0);

    // Continuous relaxed interval cycle through all specimen angles
    const interval = setInterval(() => {
      setHoverCycleIndex(prev => (prev + 1) % angleSequence.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isHovered, angleSequence.length, selectedSpecimenId]);

  // Determine active display item
  const isAutoCycling = isHovered && angleSequence.length > 0 && selectedSpecimenId === null;
  const currentAngleItem: SpecimenAngleSequenceItem | null = isAutoCycling
    ? angleSequence[hoverCycleIndex % angleSequence.length]
    : null;

  const activeSpecimen = selectedSpecimenId
    ? childSpecimens.find(s => s.id === selectedSpecimenId) || null
    : currentAngleItem
      ? childSpecimens.find(s => s.id === currentAngleItem.specimenId) || null
      : null;

  const specimenCount = childSpecimens.length;
  const availableCount = childSpecimens.filter(s => s.availability && s.status !== "sold_out").length;

  const setCalculation = calculateArtifactSetPrice(artifact, childSpecimens);

  // Active image to display: either cycling angle, manually pinned specimen, or central graphic
  const displayImage = currentAngleItem
    ? currentAngleItem.image
    : activeSpecimen
      ? activeSpecimen.images?.[0] || activeSpecimen.thumbnailImage || artifact.graphic || "/Logo_NoName.jpg"
      : artifact.graphic || "/Logo_NoName.jpg";

  const handleCardClick = () => {
    soundManager.playClick();
    onClick(selectedSpecimenId || activeSpecimen?.id || undefined);
  };

  const handleSpecimenClick = (e: React.MouseEvent, specId: string) => {
    e.stopPropagation();
    soundManager.playToggle(0.08);
    setSelectedSpecimenId(selectedSpecimenId === specId ? null : specId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 240, 
        damping: 24, 
        delay: Math.min(index * 0.035, 0.22) 
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.012, 
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } 
      }}
      whileTap={{ 
        scale: 0.985,
        y: -1,
        transition: { duration: 0.12, ease: "easeOut" }
      }}
      ref={cardRef}
      className={`group artifact-card cursor-pointer rounded-none border-2 bg-brand-surface/85 backdrop-blur-md transition-all duration-200 flex flex-col justify-between relative p-3.5 sm:p-4 transform-gpu will-change-transform ${
        isHovered
          ? "border-brand-accent outline outline-2 outline-offset-3 outline-brand-accent bg-brand-bg/95 shadow-[10px_10px_0px_#050505]"
          : "border-brand-text hover:border-brand-accent hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent/70 hover:bg-brand-bg/90 shadow-[4px_4px_0px_#050505] hover:shadow-[10px_10px_0px_#050505]"
      } active:shadow-[2px_2px_0px_#050505]`}
      data-product-card="true"
      data-preview-element="true"
      onClick={handleCardClick}
      onMouseEnter={() => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
        hoverTimerRef.current = setTimeout(() => {
          soundManager.playHover(0.04);
          setIsHovered(true);
        }, 200);
      }}
      onMouseLeave={() => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        setIsHovered(false);
      }}
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

      {/* Central Visual Graphic / Artwork — Bouncy Spring Canvas */}
      <div data-preview-canvas="true" className="relative aspect-[4/5] flex items-center justify-center overflow-hidden rounded-none bg-brand-bg border-2 border-brand-text group/canvas mb-3">
        <motion.img 
          key={displayImage}
          src={displayImage} 
          alt={activeSpecimen ? `${artifact.name} — ${activeSpecimen.medium}` : artifact.name}
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
          className="w-full h-full object-contain object-center p-1 sm:p-2 select-none pointer-events-none"
        />

        {/* Archival Watermark on Central Graphic / Artwork */}
        {(!activeSpecimen && !currentAngleItem || displayImage === artifact.graphic) && (
          <ArtifactWatermark
            artifactName={artifact.name}
            artifactId={artifact.artifactId}
            collectionName={artifact.collectionName}
            variant="subtle"
          />
        )}

        {/* Top Artifact ID Ribbon & Specimen Tag */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <span className="text-[8px] font-mono tracking-widest font-black bg-brand-surface/95 text-brand-text px-1.5 py-0.5 uppercase border border-brand-text shadow-[1px_1px_0px_#050505]">
            {artifact.artifactId || `ART-${artifactNum}`}
          </span>
          {activeSpecimen && (
            <span className="text-[7.5px] font-mono font-black uppercase bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] flex items-center gap-1">
              {activeSpecimen.medium}
            </span>
          )}
        </div>

        {/* Top Right Specimen & Angle Tag */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {currentAngleItem ? (
            <span className="text-[7.5px] font-mono font-black uppercase bg-brand-surface/95 text-brand-text px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] flex items-center gap-1">
              <Camera size={9} className="text-brand-accent" />
              <span>
                {currentAngleItem.medium} (ANG 0{currentAngleItem.angleIndex + 1}/0{currentAngleItem.totalAnglesForSpecimen})
              </span>
            </span>
          ) : (
            <span className={`text-[7.5px] font-mono font-black uppercase px-1.5 py-0.5 border shadow-[1px_1px_0px_#050505] ${
              activeSpecimen 
                ? "bg-brand-accent text-white border-brand-text" 
                : "bg-brand-surface/90 text-brand-text/80 border-brand-text/60"
            }`}>
              {activeSpecimen ? "SPECIMEN PINNED" : "ARTWORK"}
            </span>
          )}
        </div>

        {/* Clean segment dots on hover */}
        {isAutoCycling && angleSequence.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center justify-center gap-1">
            <div className="bg-brand-surface/90 border border-brand-text px-2 py-0.5 flex items-center gap-1.5 shadow-[1px_1px_0px_#050505]">
              {angleSequence.map((item, aIdx) => {
                const isActive = aIdx === (hoverCycleIndex % angleSequence.length);
                return (
                  <div 
                    key={item.id}
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

        {/* Arabic Inscription Plaque (when not cycling or on left corner) */}
        {!isAutoCycling && artifact.inscription && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="bg-brand-bg/95 border-2 border-brand-text px-2 py-0.5 shadow-[1.5px_1.5px_0px_#050505] flex items-center">
              <span className="font-serif text-base sm:text-lg font-black text-brand-accent leading-none" dir="rtl">
                {artifact.inscription.startsWith('#') ? artifact.inscription : `# ${artifact.inscription}`}
              </span>
            </div>
          </div>
        )}

        {/* Central Graphic Reset Button if a specimen is currently pinned manually */}
        {selectedSpecimenId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSpecimenId(null);
            }}
            className="absolute bottom-2 right-2 z-10 text-[7.5px] font-mono font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505] hover:bg-brand-accent hover:text-white transition-colors cursor-pointer"
          >
            VIEW ARTWORK
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
            <span className="font-mono text-[9px] font-black text-brand-accent uppercase tracking-wider whitespace-nowrap">
              {activeSpecimen ? activeSpecimen.medium : `${specimenCount} SPECIMENS`}
            </span>
          </div>
          
          <p className="text-[10px] font-mono font-bold uppercase text-brand-text/75 leading-relaxed line-clamp-2">
            {artifact.shortDescription || artifact.concept || artifact.symbolicTagline || "Steadfast conviction materialized across multiple physical media."}
          </p>
        </div>

        {/* Inside Specimen Selector: Shown IFF side-specimens-preview is null AND screen resolution is mobile phone size */}
        {isMobile && childSpecimens.length > 0 && (
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

            <div className={`grid gap-2 py-1.5 px-0.5 ${
              childSpecimens.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            }`}>
              {childSpecimens.map((spec, specIdx) => {
                const isSelected = selectedSpecimenId === spec.id;
                const specImg = spec.images?.[0] || spec.thumbnailImage || artifact.graphic || artifact.images?.[0];

                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={(e) => handleSpecimenClick(e, spec.id)}
                    onMouseEnter={() => soundManager.playHover(0.02)}
                    className={`relative p-1.5 text-left font-mono border-2 transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-brand-surface border-brand-accent ring-2 ring-brand-accent shadow-[3px_3px_0px_#ff4500] z-10"
                        : "bg-brand-surface border-brand-text shadow-[2px_2px_0px_#050505] hover:border-brand-accent hover:shadow-[3px_3px_0px_#050505]"
                    }`}
                    title={spec.medium}
                  >
                    {/* Specimen Thumbnail Container */}
                    <div className="w-full h-14 bg-brand-bg border border-brand-text/30 overflow-hidden flex items-center justify-center relative">
                      <img
                        src={specImg}
                        alt={spec.medium}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-0.5 select-none pointer-events-none"
                        loading="lazy"
                      />
                      {isSelected ? (
                        <div className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-brand-accent text-white text-[6.5px] font-black uppercase tracking-wider leading-none shadow-[1px_1px_0px_#050505]">
                          ACTIVE
                        </div>
                      ) : (
                        <div className="absolute top-0.5 right-0.5 px-0.5 py-0.2 bg-brand-surface/90 text-brand-text text-[6px] font-black leading-none">
                          0{specIdx + 1}
                        </div>
                      )}
                    </div>

                    {/* Specimen Metadata Info */}
                    <div className="pt-1 space-y-0.5">
                      <div className="text-[8.5px] font-black uppercase truncate flex items-center justify-between text-brand-text">
                        <span className="truncate">{spec.medium}</span>
                        {isSelected && <Check size={8} className="text-brand-accent shrink-0 ml-0.5" />}
                      </div>
                      <div className={`text-[7px] font-bold uppercase truncate ${isSelected ? "text-brand-accent" : "text-brand-text/60"}`}>
                        {spec.material || "CANONICAL"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete Set Acquisition Teaser (No price in previews) */}
        {setCalculation.hasDiscount && setCalculation.setPrice > 0 && (
          <div className="bg-brand-accent/5 border border-brand-accent/30 p-1.5 flex items-center justify-between font-mono text-[8px]">
            <div className="flex items-center gap-1 font-black text-brand-text uppercase">
              <Box size={10} className="text-brand-accent" />
              <span>COMPLETE SET ({setCalculation.specimenCount} SPECIMENS):</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-black text-brand-accent uppercase tracking-wider">BUNDLE AVAILABLE</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="border-t-2 border-brand-text pt-2">
          <div 
            role="button"
            data-action="true"
            className="w-full flex items-center justify-between py-1.5 px-2.5 bg-brand-surface group-hover:bg-brand-text text-brand-text group-hover:text-brand-bg border border-brand-text transition-colors font-mono text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
          >
            <span>
              {activeSpecimen ? `EXPLORE ${activeSpecimen.medium.toUpperCase()} & ARCHIVE` : "EXPLORE ARTIFACT & SPECIMENS"}
            </span>
            <div>
              <ArrowUpRight size={12} className="group-hover:text-brand-accent transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

