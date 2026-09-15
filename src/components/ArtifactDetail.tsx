import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Minus, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
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
import { Artifact, Specimen, CartItem } from "../types";
import { 
  calculateArtifactSetPrice, 
  getMediumConfig, 
  saveArtifact, 
  saveSpecimen 
} from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";
import LiquidCarveButton from "./LiquidCarveButton";
import { useAuth } from "../lib/AuthContext";

interface ArtifactDetailProps {
  artifact: Artifact;
  specimens: Specimen[];
  initialSpecimenId?: string;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onOpenLedger?: () => void;
  onEditArtifact?: (artifactId: string) => void;
  onAddSpecimen?: (artifactId: string) => void;
  onDeleteArtifact?: (artifactId: string, artifactName: string) => Promise<void> | void;
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
  onDeleteArtifact
}: ArtifactDetailProps) {
  const { isOwner } = useAuth();
  
  // Available child specimens
  const childSpecimens = specimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    artifact.specimenIds?.includes(s.id)
  );

  // Active specimen selected
  const [activeSpecimenId, setActiveSpecimenId] = useState<string>(() => {
    if (initialSpecimenId && childSpecimens.some(s => s.id === initialSpecimenId)) {
      return initialSpecimenId;
    }
    return childSpecimens[0]?.id || "";
  });

  // Selected specimen object
  const activeSpecimen = childSpecimens.find(s => s.id === activeSpecimenId) || childSpecimens[0];

  // Selected options for active specimen
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedIndividual, setAddedIndividual] = useState(false);
  const [addedSet, setAddedSet] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Set acquisition preferred wearable size
  const [setWearableSize, setSetWearableSize] = useState<string>("L");

  // Sync size & color whenever active specimen changes
  useEffect(() => {
    if (activeSpecimen) {
      if (activeSpecimen.availableSizes && activeSpecimen.availableSizes.length > 0) {
        setSelectedSize(activeSpecimen.availableSizes[0]);
      } else {
        setSelectedSize("Standard");
      }

      if (activeSpecimen.availableColors && activeSpecimen.availableColors.length > 0) {
        setSelectedColor(activeSpecimen.availableColors[0].name);
      } else {
        setSelectedColor(activeSpecimen.color || "Standard");
      }

      setActiveImageIndex(0);
      setQuantity(1);
    }
  }, [activeSpecimenId, activeSpecimen]);

  // Image list for active specimen (falls back to artifact images)
  const displayImages = activeSpecimen?.images?.length 
    ? activeSpecimen.images 
    : (artifact.images?.length ? artifact.images : [artifact.graphic]);

  // Set pricing calculation
  const setCalculation = calculateArtifactSetPrice(artifact, childSpecimens);

  // Is active specimen sold out?
  const isSpecimenSoldOut = !activeSpecimen || !activeSpecimen.availability || activeSpecimen.status === "sold_out" || activeSpecimen.inventory <= 0;

  // Handle acquiring individual specimen
  const handleAcquireSpecimen = () => {
    if (!activeSpecimen || isSpecimenSoldOut) return;
    soundManager.playClick();

    const options: { [key: string]: string } = {};
    if (selectedSize) options["Size"] = selectedSize;
    if (selectedColor) options["Color"] = selectedColor;
    if (activeSpecimen.type) options["Type"] = activeSpecimen.type;

    const cartItem: CartItem = {
      id: `${activeSpecimen.id}_${selectedSize}_${selectedColor}`.replace(/\s+/g, "_"),
      productId: activeSpecimen.id,
      specimenId: activeSpecimen.id,
      artifactId: artifact.id,
      name: `${artifact.name} — ${activeSpecimen.medium}`,
      price: activeSpecimen.price,
      quantity,
      image: displayImages[0] || artifact.graphic,
      categoryLabel: activeSpecimen.mediumCategory?.toUpperCase() || "SPECIMEN",
      medium: activeSpecimen.medium,
      options
    };

    onAddToCart(cartItem);
    setAddedIndividual(true);
    setTimeout(() => setAddedIndividual(false), 2200);
  };

  // Handle acquiring complete artifact set
  const handleAcquireSet = () => {
    if (setCalculation.availableSpecimens.length === 0) return;
    soundManager.playClick();

    const includedSpecimens = setCalculation.availableSpecimens.map(spec => ({
      specimenId: spec.id,
      medium: spec.medium,
      price: spec.price,
      size: (spec.mediumCategory === "wear" || spec.availableSizes?.includes(setWearableSize)) 
        ? setWearableSize 
        : (spec.availableSizes?.[0] || "Standard"),
      color: spec.color || "Standard"
    }));

    const cartItem: CartItem = {
      id: `artifact_set_${artifact.id}_${Date.now()}`,
      productId: artifact.id,
      artifactId: artifact.id,
      isCompleteArtifactSet: true,
      includedSpecimens,
      name: `${artifact.name} — COMPLETE ARTIFACT SET (${setCalculation.specimenCount} Specimens)`,
      price: setCalculation.setPrice,
      quantity: 1,
      image: artifact.graphic,
      categoryLabel: "COMPLETE ARTIFACT SET",
      options: {
        "Bundle": `Complete ${artifact.name} Collection (${setCalculation.specimenCount} Specimens)`,
        "Wearable Size": setWearableSize
      }
    };

    onAddToCart(cartItem);
    setAddedSet(true);
    setTimeout(() => setAddedSet(false), 2200);
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

        {/* ─── 2. SPECIMEN SELECTION TABS & MEDIUM MATRIX ─── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-brand-accent" />
              <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-tight text-brand-text">
                MANIFESTED SPECIMENS ({childSpecimens.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-brand-text/60">
              Select a physical manifestation to configure acquisition
            </span>
          </div>

          {/* Specimens Tabs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
            {childSpecimens.map((spec, idx) => {
              const isSelected = spec.id === activeSpecimenId;
              const isSold = !spec.availability || spec.status === "sold_out" || spec.inventory <= 0;

              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveSpecimenId(spec.id);
                  }}
                  className={`p-3 text-left border-2 transition-all flex flex-col justify-between relative cursor-pointer ${
                    isSelected 
                      ? "border-brand-text bg-brand-bg shadow-[4px_4px_0px_#050505] ring-2 ring-brand-accent" 
                      : "border-brand-text/40 bg-brand-surface hover:border-brand-text hover:bg-brand-bg shadow-[2px_2px_0px_#050505]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-text/60">
                      0{idx + 1} //
                    </span>
                    <span className={`text-[8px] font-mono font-black uppercase px-1 py-0.5 border ${
                      isSold 
                        ? "bg-red-50 text-red-600 border-red-300" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-300"
                    }`}>
                      {isSold ? "ALLOTTED" : "AVAILABLE"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-mono font-black uppercase text-brand-text leading-tight mb-0.5">
                      {spec.medium}
                    </h3>
                    <p className="text-[9px] font-mono font-bold uppercase text-brand-text/65 line-clamp-1">
                      {spec.type || spec.garmentType || "Standard Edition"}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-brand-text/20 flex items-baseline justify-between">
                    <span className="text-[8px] font-mono font-bold uppercase text-brand-text/50">PRICE</span>
                    <span className="text-xs font-mono font-black text-brand-text">
                      PKR {spec.price.toLocaleString()}
                    </span>
                  </div>
                </button>
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
              
              {/* Specimen Header & Price */}
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
                    <span className="text-xs font-mono font-bold text-brand-text/60 block">PKR</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-brand-text">
                      {activeSpecimen.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sizing & Material Specifications */}
                <div className="space-y-4">
                  {/* Size Selector */}
                  {activeSpecimen.availableSizes && activeSpecimen.availableSizes.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-text">
                          SPECIMEN SIZE //
                        </span>
                        {activeSpecimen.mediumCategory === "wear" && (
                          <button
                            type="button"
                            onClick={() => setShowSizeGuide(true)}
                            className="text-[9px] font-mono font-bold uppercase text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Ruler size={11} />
                            <span>SIZE SPECIFICATIONS</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {activeSpecimen.availableSizes.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.05);
                              setSelectedSize(sz);
                            }}
                            className={`py-2 px-1 text-center font-mono text-xs font-black uppercase border transition-all cursor-pointer ${
                              selectedSize === sz
                                ? "bg-brand-text text-brand-bg border-brand-text shadow-[2px_2px_0px_#050505]"
                                : "bg-brand-bg text-brand-text border-brand-text/50 hover:border-brand-text"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Stepper */}
                  <div>
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-text block mb-1.5">
                      ALLOTMENT QUANTITY //
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick(0.05);
                            setQuantity(q => Math.max(1, q - 1));
                          }}
                          disabled={quantity <= 1}
                          className="p-2 hover:bg-brand-text hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-4 font-mono font-black text-sm">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick(0.05);
                            setQuantity(q => Math.min(activeSpecimen.inventory || 10, q + 1));
                          }}
                          disabled={quantity >= (activeSpecimen.inventory || 10)}
                          className="p-2 hover:bg-brand-text hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <span className="text-[10px] font-mono font-bold uppercase text-brand-text/60">
                        {isSpecimenSoldOut 
                          ? "CURRENTLY ALLOTTED" 
                          : `${activeSpecimen.inventory} AVAILABLE IN ARCHIVE`}
                      </span>
                    </div>
                  </div>

                  {/* Primary Individual Specimen Acquisition Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAcquireSpecimen}
                      disabled={isSpecimenSoldOut}
                      className={`w-full py-3.5 px-4 font-mono text-sm font-black uppercase tracking-wider border-2 border-brand-text transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isSpecimenSoldOut 
                          ? "bg-stone-300 text-stone-600 border-stone-400 cursor-not-allowed" 
                          : addedIndividual
                            ? "bg-emerald-700 text-white border-brand-text shadow-[4px_4px_0px_#050505]"
                            : "bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white shadow-[4px_4px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px]"
                      }`}
                    >
                      {addedIndividual ? (
                        <>
                          <Check size={16} />
                          <span>SPECIMEN SECURED TO LEDGER</span>
                        </>
                      ) : isSpecimenSoldOut ? (
                        <span>SPECIMEN ALLOTTED (SOLD OUT)</span>
                      ) : (
                        <>
                          <span>ACQUIRE {activeSpecimen.medium.toUpperCase()} • PKR {(activeSpecimen.price * quantity).toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tactile Material Specifications Ledger */}
                <div className="mt-5 pt-4 border-t border-brand-text/20 grid grid-cols-2 gap-3 text-[9px] font-mono uppercase">
                  <div>
                    <span className="text-brand-text/50 block text-[7.5px] font-bold">MATERIAL:</span>
                    <span className="font-black text-brand-text block">{activeSpecimen.material || "Heavy Cotton Jersey"}</span>
                  </div>
                  <div>
                    <span className="text-brand-text/50 block text-[7.5px] font-bold">WEIGHT / GAUGE:</span>
                    <span className="font-black text-brand-text block">{activeSpecimen.weight || "400 GSM"}</span>
                  </div>
                  <div>
                    <span className="text-brand-text/50 block text-[7.5px] font-bold">EDITION:</span>
                    <span className="font-black text-brand-text block">{activeSpecimen.edition || "050 SPECIMENS"}</span>
                  </div>
                  <div>
                    <span className="text-brand-text/50 block text-[7.5px] font-bold">COLOR:</span>
                    <span className="font-black text-brand-text block">{activeSpecimen.color || "Standard"}</span>
                  </div>
                </div>
              </div>

              {/* ─── 4. COMPLETE ARTIFACT SET ACQUISITION MODULE ─── */}
              {setCalculation.specimenCount > 1 && (
                <div className="border-2 border-brand-text bg-brand-surface p-5 shadow-[4px_4px_0px_#050505] relative overflow-hidden">
                  <div className="flex items-center gap-2 border-b-2 border-brand-text pb-2.5 mb-3">
                    <Box size={18} className="text-brand-accent" />
                    <div>
                      <h3 className="text-base font-mono font-black uppercase tracking-tight text-brand-text">
                        ACQUIRE COMPLETE ARTIFACT SET
                      </h3>
                      <p className="text-[8.5px] font-mono font-bold uppercase text-brand-text/70">
                        Acquire the complete set of {setCalculation.specimenCount} specimens belonging to {artifact.name}
                      </p>
                    </div>
                  </div>

                  {/* Included Specimens List */}
                  <div className="space-y-1.5 mb-4 text-[9px] font-mono uppercase bg-brand-bg p-3 border border-brand-text/40">
                    <span className="text-[8px] font-black text-brand-text/60 block mb-1">
                      INCLUDED IN THIS ARTIFACT SET:
                    </span>
                    {setCalculation.availableSpecimens.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between border-b border-brand-text/10 pb-1">
                        <span className="font-black text-brand-text flex items-center gap-1.5">
                          <Check size={10} className="text-emerald-700" />
                          0{idx + 1} // {s.medium} ({s.type || "Standard"})
                        </span>
                        <span className="text-brand-text/70">PKR {s.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Wearable Size Selection for Set */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8.5px] font-mono font-black uppercase text-brand-text">
                        WEARABLE SPECIMENS SIZE //
                      </span>
                      <span className="text-[8px] font-mono text-brand-text/60">Applied to T-Shirts, Hoodies & Sleeves</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["S", "M", "L", "XL"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            soundManager.playClick(0.04);
                            setSetWearableSize(sz);
                          }}
                          className={`py-1.5 text-center font-mono text-xs font-black uppercase border transition-all cursor-pointer ${
                            setWearableSize === sz
                              ? "bg-brand-text text-brand-bg border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
                              : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Comparison & Set Acquisition CTA */}
                  <div className="bg-brand-accent/10 border-2 border-brand-accent p-3 mb-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[9px] font-mono font-bold uppercase text-brand-text/70">INDIVIDUAL SUM:</span>
                      <span className="font-mono text-xs line-through text-brand-text/60">
                        PKR {setCalculation.individualTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-black uppercase text-brand-accent block">
                          SET PRIVILEGE PRICE
                        </span>
                        {setCalculation.savings > 0 && (
                          <span className="text-[8.5px] font-mono font-black text-emerald-700 block">
                            SAVE PKR {setCalculation.savings.toLocaleString()} ({setCalculation.discountPercent}% SET BUNDLE)
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xl sm:text-2xl font-black text-brand-text">
                        PKR {setCalculation.setPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAcquireSet}
                    className={`w-full py-3 px-4 font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-brand-text transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      addedSet
                        ? "bg-emerald-700 text-white border-brand-text shadow-[4px_4px_0px_#050505]"
                        : "bg-brand-accent text-white hover:bg-brand-text shadow-[4px_4px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px]"
                    }`}
                  >
                    {addedSet ? (
                      <>
                        <Check size={16} />
                        <span>COMPLETE SET SECURED TO LEDGER</span>
                      </>
                    ) : (
                      <>
                        <Box size={16} />
                        <span>ACQUIRE COMPLETE ARTIFACT SET • PKR {setCalculation.setPrice.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
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
