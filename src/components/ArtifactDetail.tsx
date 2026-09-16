import React, { useState, useEffect } from "react";
import { 
  X, 
  Edit3, 
  Plus, 
  ArrowLeft, 
  ArrowRight,
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Layers,
  Box,
  Share2,
  Maximize2,
  Ruler,
  Clock,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Artifact, Specimen, CartItem } from "../types";
import { calculateArtifactSetPrice } from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";
import { useAuth } from "../lib/AuthContext";

interface ArtifactDetailProps {
  artifact: Artifact;
  specimens: Specimen[];
  initialSpecimenId?: string;
  onClose: () => void;
  onAddToCart?: (item: CartItem) => void;
  onOpenLedger?: () => void;
  onEditArtifact?: (artifactId: string) => void;
  onAddSpecimen?: (artifactId: string) => void;
  onDeleteArtifact?: (artifactId: string, artifactName: string) => Promise<void> | void;
  onAcquireClick?: (specimenId?: string) => void;
}

export default function ArtifactDetail({
  artifact,
  specimens,
  initialSpecimenId,
  onClose,
  onAddToCart,
  onOpenLedger,
  onEditArtifact,
  onAddSpecimen,
  onDeleteArtifact,
  onAcquireClick
}: ArtifactDetailProps) {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  
  // Available child specimens
  const childSpecimens = specimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    s.parentArtifactId === artifact.artifactId ||
    artifact.specimenIds?.includes(s.id)
  );

  // Complete Artifact Set Calculation
  const setCalculation = calculateArtifactSetPrice(artifact, childSpecimens);

  // Active specimen selected
  const [activeSpecimenId, setActiveSpecimenId] = useState<string>(() => {
    if (initialSpecimenId && childSpecimens.some(s => s.id === initialSpecimenId)) {
      return initialSpecimenId;
    }
    return childSpecimens[0]?.id || "";
  });

  // Selected specimen object
  const activeSpecimen = childSpecimens.find(s => s.id === activeSpecimenId) || childSpecimens[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reset active image index whenever active specimen changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [activeSpecimenId]);

  // Image list for active specimen (falls back to artifact images)
  const displayImages = activeSpecimen?.images?.length 
    ? activeSpecimen.images 
    : (artifact.images?.length ? artifact.images : [artifact.graphic]);

  // Is active specimen sold out?
  const isSpecimenSoldOut = !activeSpecimen || !activeSpecimen.availability || activeSpecimen.status === "sold_out" || activeSpecimen.inventory <= 0;

  // Navigate to dedicated acquisition page
  const handleProceedToAcquire = (specimenId?: string) => {
    soundManager.playClick();
    if (onAcquireClick) {
      onAcquireClick(specimenId);
    } else {
      const targetSpecimenId = specimenId || activeSpecimen?.id;
      const searchParam = targetSpecimenId ? `?specimen=${targetSpecimenId}` : "";
      navigate(`/artifact/${artifact.artifactId || artifact.id}/acquire${searchParam}`);
    }
  };

  const handleProceedToSetAcquire = () => {
    soundManager.playClick();
    if (onAcquireClick) {
      onAcquireClick();
    } else {
      navigate(`/artifact/${artifact.artifactId || artifact.id}/acquire?mode=set`);
    }
  };

  // Handle share link
  const handleShare = () => {
    soundManager.playClick();
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-bg text-brand-text font-mono selection:bg-brand-text selection:text-white">
      {/* Background Architectural Grid Pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#050505_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Header Navigation Bar */}
      <div className="sticky top-0 z-40 bg-brand-surface border-b-2 border-brand-text px-4 py-3 flex items-center justify-between shadow-[0_2px_0px_#050505]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors text-xs font-black uppercase shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO ARCHIVE</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-brand-text/60">
            <span>ARCHIVE</span>
            <span>//</span>
            <span className="text-brand-text font-bold uppercase">{artifact.collectionName}</span>
            <span>//</span>
            <span className="text-brand-accent font-black uppercase">{artifact.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Owner Quick Action */}
          {isOwner && (
            <div className="flex items-center gap-1.5">
              {onEditArtifact && (
                <button
                  type="button"
                  onClick={() => onEditArtifact(artifact.id)}
                  className="px-2.5 py-1.5 bg-brand-surface hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text text-[10px] font-black uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span className="hidden md:inline">EDIT ARTIFACT</span>
                </button>
              )}
              {onAddSpecimen && (
                <button
                  type="button"
                  onClick={() => onAddSpecimen(artifact.id)}
                  className="px-2.5 py-1.5 bg-brand-accent hover:bg-brand-text text-white border border-brand-text text-[10px] font-black uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>+ SPECIMEN</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
            title="Copy transmission link"
          >
            {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white transition-colors border border-brand-text shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
            aria-label="Close dossier"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* ─── 1. ARTIFACT IDENTITY BANNER ─── */}
        <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-7 shadow-[6px_6px_0px_#050505] mb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-brand-text pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[9.5px] font-black uppercase tracking-wider bg-brand-text text-brand-bg px-2 py-0.5">
                  CANONICAL ARTIFACT
                </span>
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-brand-text/60 border border-brand-text/30 px-2 py-0.5">
                  CODE: {artifact.artifactId || "SYM-ART"}
                </span>
                <span className="font-mono text-[9.5px] font-black uppercase text-brand-accent bg-brand-accent/10 border border-brand-accent/30 px-2 py-0.5">
                  {childSpecimens.length} SPECIMENS
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight text-brand-text leading-none">
                {artifact.name}
              </h1>
            </div>

            {/* Arabic Inscription Plaque */}
            {artifact.inscription && (
              <div className="bg-brand-bg border-2 border-brand-text px-4 py-2 shadow-[3px_3px_0px_#050505] flex items-center justify-center shrink-0">
                <span className="font-serif text-2xl sm:text-3xl font-black text-brand-accent leading-none" dir="rtl">
                  {artifact.inscription.startsWith('#') ? artifact.inscription : `# ${artifact.inscription}`}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs sm:text-sm font-mono font-bold uppercase text-brand-text/80 leading-relaxed max-w-4xl">
            {artifact.shortDescription || artifact.concept || artifact.description}
          </p>
        </div>

        {/* ─── 2. SPECIMEN SELECTION TABS & MEDIUM MATRIX (SCATTERED STYLE PREVIEWS) ─── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-brand-accent" />
              <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-tight text-brand-text">
                MANIFESTED SPECIMENS ({childSpecimens.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-brand-text/60">
              Select a physical manifestation to view archival specifications
            </span>
          </div>

          {/* Scattered Specimen Preview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 pt-1 pb-2">
            {childSpecimens.map((spec, idx) => {
              const isSelected = spec.id === activeSpecimenId;
              const isSold = !spec.availability || spec.status === "sold_out" || spec.inventory <= 0;
              const specImg = spec.images?.[0] || spec.thumbnailImage || artifact.graphic || artifact.images?.[0];
              const scatterAngles = [-2.4, 2.2, -1.8, 2.5, -2.1, 1.7];
              const rot = scatterAngles[idx % scatterAngles.length];

              return (
                <motion.button
                  key={spec.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveSpecimenId(spec.id);
                  }}
                  onMouseEnter={() => soundManager.playHover(0.02)}
                  initial={false}
                  animate={{
                    rotate: isSelected ? 0 : rot,
                    scale: isSelected ? 1.03 : 1,
                    y: isSelected ? -3 : 0,
                  }}
                  whileHover={{
                    rotate: 0,
                    scale: 1.05,
                    y: -4,
                    transition: { duration: 0.12 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-2.5 text-left border-2 font-mono transition-all flex flex-col justify-between relative cursor-pointer group ${
                    isSelected 
                      ? "border-brand-accent bg-brand-surface ring-2 ring-brand-accent shadow-[5px_5px_0px_#ff4500] z-10" 
                      : "border-brand-text bg-brand-surface hover:border-brand-accent shadow-[3px_3px_0px_#050505] hover:shadow-[5px_5px_0px_#050505]"
                  }`}
                  title={`Select ${spec.medium}`}
                >
                  {/* Specimen Identification Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-brand-text/70">
                      0{idx + 1} //
                    </span>
                    <span className={`text-[7.5px] font-black uppercase px-1 py-0.2 border ${
                      isSold 
                        ? "bg-red-50 text-red-600 border-red-300" 
                        : isSelected
                          ? "bg-brand-accent text-white border-brand-accent"
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                    }`}>
                      {isSold ? "ALLOTTED" : isSelected ? "ACTIVE" : "AVAILABLE"}
                    </span>
                  </div>

                  {/* Specimen Visual Thumbnail Canvas */}
                  <div className="w-full h-24 sm:h-28 bg-brand-bg border border-brand-text/30 overflow-hidden flex items-center justify-center relative my-1">
                    <img
                      src={specImg}
                      alt={spec.medium}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-1.5 select-none pointer-events-none group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-brand-bg/90 backdrop-blur-[1px] border-t border-brand-text/20 px-1 py-0.5 flex items-center justify-between">
                      <span className="text-[7px] font-black uppercase text-brand-text/75 truncate">
                        {spec.type || spec.medium || "SPECIMEN"}
                      </span>
                      {isSelected && (
                        <Check size={9} className="text-brand-accent shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Specimen Descriptor */}
                  <div className="pt-1">
                    <h3 className="text-xs sm:text-sm font-black uppercase text-brand-text leading-tight group-hover:text-brand-accent transition-colors truncate">
                      {spec.medium}
                    </h3>
                    <p className="text-[8px] font-bold uppercase text-brand-text/60 line-clamp-1">
                      {spec.type || spec.garmentType || "Standard Edition"}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-brand-text/20 flex items-baseline justify-between text-[8px]">
                    <span className="font-bold text-brand-text/50">MATERIAL</span>
                    <span className="font-black text-brand-text truncate ml-1">
                      {spec.material || "CANONICAL"}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ─── 3. ACTIVE SPECIMEN DOSSIER & ACQUISITION SUITE ─── */}
        {activeSpecimen ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-12">
            
            {/* Left Column: Visual Gallery Canvas (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[4/5] bg-brand-surface border-2 border-brand-text shadow-[6px_6px_0px_#050505] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={`${activeSpecimen.id}_${activeImageIndex}`}
                    src={displayImages[activeImageIndex] || activeSpecimen.thumbnailImage} 
                    alt={`${artifact.name} ${activeSpecimen.medium}`}
                    referrerPolicy="no-referrer"
                    initial={{ opacity: 0.7, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.6, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain p-4"
                  />
                </AnimatePresence>

                {/* Specimen Tag Overlay */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                  <span className="text-[9px] font-mono font-black uppercase bg-brand-text text-brand-bg px-2 py-0.5">
                    SPECIMEN: {activeSpecimen.medium}
                  </span>
                  <span className="text-[8.5px] font-mono font-black uppercase bg-brand-bg text-brand-text px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                    SKU: {activeSpecimen.sku}
                  </span>
                </div>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setShowFullscreenImage(true)}
                  className="absolute top-3 right-3 z-10 p-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
                  title="View High Resolution"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Multi-angle Arrows */}
                {displayImages.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.08);
                        setActiveImageIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1));
                      }}
                      className="pointer-events-auto p-2 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.08);
                        setActiveImageIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1));
                      }}
                      className="pointer-events-auto p-2 bg-brand-surface hover:bg-brand-text hover:text-white text-brand-text border border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-angle Thumbnails */}
              {displayImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {displayImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.06);
                        setActiveImageIndex(i);
                      }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 border-2 overflow-hidden bg-brand-surface p-1 transition-all cursor-pointer ${
                        activeImageIndex === i 
                          ? "border-brand-accent shadow-[2px_2px_0px_#050505] ring-1 ring-brand-accent" 
                          : "border-brand-text/40 hover:border-brand-text"
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Angle 0${i+1}`} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain" 
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Specimen Configurator & Dual Acquisition (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Specimen Header & Identification */}
              <div className="border-2 border-brand-text bg-brand-surface p-5 shadow-[4px_4px_0px_#050505]">
                <div className="flex items-baseline justify-between gap-2 border-b-2 border-brand-text pb-3 mb-3">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-text/60">
                      SPECIMEN MANIFESTATION
                    </span>
                    <h2 className="text-xl sm:text-2xl font-mono font-black uppercase text-brand-text leading-tight">
                      {activeSpecimen.medium}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold text-brand-text/60 block">SPECIMEN ID</span>
                    <span className="text-sm font-mono font-black text-brand-accent">
                      {activeSpecimen.sku || "SYM-SPEC"}
                    </span>
                  </div>
                </div>

                {/* Physical & Material Specifications Ledger */}
                <div className="space-y-4">
                  {/* Sizing Information Link */}
                  {activeSpecimen.availableSizes && activeSpecimen.availableSizes.length > 0 && activeSpecimen.mediumCategory === "wear" && (
                    <div className="flex items-center justify-between p-2.5 bg-brand-bg border border-brand-text/30">
                      <div className="flex items-center gap-2">
                        <Ruler size={13} className="text-brand-accent" />
                        <span className="text-[10px] font-mono font-bold uppercase text-brand-text">
                          SIZING MATRIX: {activeSpecimen.availableSizes.join(" / ")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSizeGuide(true)}
                        className="text-[9px] font-mono font-black uppercase text-brand-accent hover:underline cursor-pointer"
                      >
                        [ VIEW DIMENSIONS ]
                      </button>
                    </div>
                  )}

                  {/* Tactile Material Specifications Ledger */}
                  <div className="border border-brand-text/30 bg-brand-bg p-3.5 space-y-2.5 text-[9.5px] font-mono uppercase">
                    <span className="text-[8px] font-black text-brand-accent block border-b border-brand-text/20 pb-1">
                      PHYSICAL ARCHITECTURE SPECIFICATIONS //
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-brand-text/50 block text-[7.5px] font-bold">MATERIAL:</span>
                        <span className="font-black text-brand-text block">{activeSpecimen.material || "Heavy Cotton Jersey"}</span>
                      </div>
                      <div>
                        <span className="text-brand-text/50 block text-[7.5px] font-bold">WEIGHT / GAUGE:</span>
                        <span className="font-black text-brand-text block">{activeSpecimen.weight || "400 GSM"}</span>
                      </div>
                      <div>
                        <span className="text-brand-text/50 block text-[7.5px] font-bold">EDITION / BATCH:</span>
                        <span className="font-black text-brand-text block">{activeSpecimen.edition || "050 SPECIMENS"}</span>
                      </div>
                      <div>
                        <span className="text-brand-text/50 block text-[7.5px] font-bold">FINISH & COLOR:</span>
                        <span className="font-black text-brand-text block">{activeSpecimen.color || "Standard"}</span>
                      </div>
                    </div>
                  </div>

                  {/* ONLY THE ACQUIRE! BUTTON ON THE SPECIFICATION PAGE */}
                  <div className="pt-3 border-t-2 border-brand-text space-y-3">
                    <button
                      type="button"
                      onClick={() => handleProceedToAcquire(activeSpecimen?.id)}
                      className="w-full py-5 sm:py-6 px-6 font-mono text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider bg-brand-accent text-white hover:bg-brand-text border-2 border-brand-text shadow-[6px_6px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-widest">
                          PHYSICAL ALLOTMENT PROTOCOL //
                        </span>
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                          ACQUIRE!
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-brand-text/30 px-4 py-3 border border-white/20 shrink-0 group-hover:bg-brand-accent transition-colors">
                        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">PROCEED</span>
                        <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform text-white" />
                      </div>
                    </button>

                    <p className="text-[9.5px] font-mono font-bold uppercase text-brand-text/60 text-center tracking-wider pt-1">
                      [ CHOOSE INDIVIDUAL SPECIMENS OR COMPLETE SET BUNDLE IN THE ACQUISITION SUITE ]
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-brand-text bg-brand-surface p-8 text-center shadow-[4px_4px_0px_#050505] mb-12">
            <p className="text-sm font-mono font-black uppercase text-brand-text/70">
              NO PHYSICAL SPECIMENS CURRENTLY REGISTERED UNDER THIS ARTIFACT.
            </p>
            {isOwner && onAddSpecimen && (
              <button
                type="button"
                onClick={() => onAddSpecimen(artifact.id)}
                className="mt-4 px-4 py-2 bg-brand-text text-brand-bg font-mono text-xs font-black uppercase border border-brand-text cursor-pointer"
              >
                + ADD FIRST SPECIMEN
              </button>
            )}
          </div>
        )}

        {/* ─── 5. THE FOUR PILLARS OF SYMBOLIC REPRESENTATION ─── */}
        <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[6px_6px_0px_#050505] mb-12">
          <div className="border-b-2 border-brand-text pb-3 mb-6">
            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30">
              CONCEPTUAL ARCHITECTURE //
            </span>
            <h3 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight text-brand-text mt-1">
              THE 4 PILLARS OF {artifact.name}
            </h3>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-text/70 mt-0.5">
              The intellectual, spiritual, and moral thesis carried by every specimen of this artifact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Pillar 01 */}
            <div className="border border-brand-text/40 bg-brand-bg p-4 shadow-[2px_2px_0px_#050505]">
              <span className="text-[8.5px] font-black text-brand-accent uppercase block mb-1">
                PILLAR 01 // WHAT THE SYMBOL REPRESENTS
              </span>
              <p className="font-bold text-brand-text uppercase leading-relaxed text-[11px]">
                {artifact.pillar1Represents || artifact.concept || "Enduring rootedness and unbending moral conviction."}
              </p>
            </div>

            {/* Pillar 02 */}
            <div className="border border-brand-text/40 bg-brand-bg p-4 shadow-[2px_2px_0px_#050505]">
              <span className="text-[8.5px] font-black text-brand-accent uppercase block mb-1">
                PILLAR 02 // WHY IT WAS DELIBERATELY CHOSEN
              </span>
              <p className="font-bold text-brand-text uppercase leading-relaxed text-[11px]">
                {artifact.pillar2WhyChosen || "Solidarity is not a fleeting trend; it is an enduring covenant translated into tactile armor."}
              </p>
            </div>

            {/* Pillar 03 */}
            <div className="border border-brand-text/40 bg-brand-bg p-4 shadow-[2px_2px_0px_#050505]">
              <span className="text-[8.5px] font-black text-brand-accent uppercase block mb-1">
                PILLAR 03 // WHAT THE ARTIFACT COMMUNICATES
              </span>
              <p className="font-bold text-brand-text uppercase leading-relaxed text-[11px]">
                {artifact.pillar3Communicates || "Active, deliberate alignment with truth and refusal to assimilate into consumer compliance."}
              </p>
            </div>

            {/* Pillar 04 */}
            <div className="border border-brand-text/40 bg-brand-bg p-4 shadow-[2px_2px_0px_#050505]">
              <span className="text-[8.5px] font-black text-brand-accent uppercase block mb-1">
                PILLAR 04 // WHAT IDEA THE WEARER CARRIES
              </span>
              <p className="font-bold text-brand-text uppercase leading-relaxed text-[11px]">
                {artifact.pillar4WearerCarries || "The internal oath to preserve moral clarity in speech, personal conduct, and spiritual devotion."}
              </p>
            </div>
          </div>
        </div>

        {/* Fullscreen Image Lightbox Modal */}
        <AnimatePresence>
          {showFullscreenImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4"
              onClick={() => setShowFullscreenImage(false)}
            >
              <button
                type="button"
                onClick={() => setShowFullscreenImage(false)}
                className="absolute top-4 right-4 p-2 text-white hover:text-brand-accent transition-colors"
                aria-label="Close fullscreen"
              >
                <X size={24} />
              </button>
              <img 
                src={displayImages[activeImageIndex] || artifact.graphic} 
                alt={artifact.name}
                referrerPolicy="no-referrer"
                className="max-h-[85vh] max-w-[90vw] object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Size Guide Modal */}
        <AnimatePresence>
          {showSizeGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
              onClick={() => setShowSizeGuide(false)}
            >
              <div 
                className="bg-brand-surface border-2 border-brand-text p-6 max-w-lg w-full shadow-[8px_8px_0px_#050505]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b-2 border-brand-text pb-3 mb-4">
                  <h3 className="text-base font-mono font-black uppercase text-brand-text">
                    HEAVYWEIGHT BOXY CUT // SIZING SPECIFICATION
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowSizeGuide(false)}
                    className="p-1 hover:bg-brand-text hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <table className="w-full text-left font-mono text-xs uppercase border-collapse mb-4">
                  <thead>
                    <tr className="border-b-2 border-brand-text bg-brand-bg">
                      <th className="p-2">SIZE</th>
                      <th className="p-2">CHEST (IN)</th>
                      <th className="p-2">LENGTH (IN)</th>
                      <th className="p-2">SHOULDER (IN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-brand-text/30">
                      <td className="p-2 font-black">S</td>
                      <td className="p-2">21.5"</td>
                      <td className="p-2">28.0"</td>
                      <td className="p-2">20.5"</td>
                    </tr>
                    <tr className="border-b border-brand-text/30">
                      <td className="p-2 font-black">M</td>
                      <td className="p-2">22.5"</td>
                      <td className="p-2">29.0"</td>
                      <td className="p-2">21.5"</td>
                    </tr>
                    <tr className="border-b border-brand-text/30">
                      <td className="p-2 font-black">L</td>
                      <td className="p-2">23.5"</td>
                      <td className="p-2">30.0"</td>
                      <td className="p-2">22.5"</td>
                    </tr>
                    <tr className="border-b border-brand-text/30">
                      <td className="p-2 font-black">XL</td>
                      <td className="p-2">24.5"</td>
                      <td className="p-2">31.0"</td>
                      <td className="p-2">23.5"</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[10px] font-mono uppercase text-brand-text/60">
                  Engineered with an authentic boxy drop-shoulder cut. If you prefer a tailored profile, size down one step.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
