import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Check, 
  Minus, 
  Plus, 
  Box, 
  Layers, 
  ShieldCheck, 
  Truck, 
  Ruler, 
  X, 
  ArrowRight, 
  Share2, 
  ShoppingBag,
  Sparkles,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import { Artifact, Specimen, CartItem, Product, ProductVariant } from "../types";
import { calculateArtifactSetPrice, getSpecimenArchitectureSpecs } from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";
import { buildWhatsAppProductInquiry, getWhatsAppUrl, STUDIO_WHATSAPP_LOCAL_DISPLAY } from "../lib/whatsappService";
import ArtifactWatermark from "./ArtifactWatermark";

interface ArtifactAcquisitionPageProps {
  artifact?: Artifact | null;
  specimens?: Specimen[];
  product?: Product | null;
  initialSpecimenId?: string;
  onBackToSpec: () => void;
  onAddToCart: (item: CartItem) => void;
  onOpenLedger?: () => void;
}

export default function ArtifactAcquisitionPage({
  artifact,
  specimens = [],
  product,
  initialSpecimenId,
  onBackToSpec,
  onAddToCart,
  onOpenLedger
}: ArtifactAcquisitionPageProps) {
  const [searchParams] = useSearchParams();
  const queryMode = searchParams.get("mode");
  const querySpecimen = searchParams.get("specimen") || searchParams.get("specimenId") || initialSpecimenId;

  // Child specimens for the active artifact
  const childSpecimens = artifact 
    ? specimens.filter(s => 
        s.parentArtifactId === artifact.id || 
        s.parentArtifactId === artifact.artifactId ||
        artifact.specimenIds?.includes(s.id)
      )
    : [];

  // Acquisition mode: "individual" or "set"
  const [acquisitionMode, setAcquisitionMode] = useState<"individual" | "set">(() => 
    queryMode === "set" ? "set" : "individual"
  );

  // Selected specimen for individual configuration
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string>(() => {
    if (querySpecimen && childSpecimens.some(s => s.id === querySpecimen)) {
      return querySpecimen;
    }
    return childSpecimens[0]?.id || "";
  });

  useEffect(() => {
    if (queryMode === "set") {
      setAcquisitionMode("set");
    }
  }, [queryMode]);

  const activeSpecimen = childSpecimens.find(s => s.id === selectedSpecimenId) || childSpecimens[0];

  // Options for active specimen
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Set acquisition options
  const [setWearableSize, setSetWearableSize] = useState<string>("L");

  // State feedback
  const [addedIndividual, setAddedIndividual] = useState(false);
  const [addedSet, setAddedSet] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync size & color whenever selected specimen changes
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
  }, [selectedSpecimenId, activeSpecimen]);

  // Fallback support for legacy Product
  const [legacySelectedOptions, setLegacySelectedOptions] = useState<{ [key: string]: string }>({});
  const [legacyQuantity, setLegacyQuantity] = useState(1);
  const [legacyAdded, setLegacyAdded] = useState(false);

  useEffect(() => {
    if (product && !artifact) {
      const initialOpts: { [key: string]: string } = {};
      if (product.availableSizes && product.availableSizes.length > 0) {
        initialOpts["Size"] = product.availableSizes[0];
      }
      if (product.availableColors && product.availableColors.length > 0) {
        initialOpts["Color"] = product.availableColors[0].name;
      }
      setLegacySelectedOptions(initialOpts);
    }
  }, [product, artifact]);

  // Calculation for complete set bundle
  const setCalculation = artifact 
    ? calculateArtifactSetPrice(artifact, childSpecimens)
    : { availableSpecimens: [], individualTotal: 0, setPrice: 0, savings: 0, discountPercent: 0, specimenCount: 0, hasDiscount: false };

  // Specimen images
  const displayImages = activeSpecimen?.images?.length
    ? activeSpecimen.images
    : (artifact?.images?.length ? artifact.images : [artifact?.graphic || product?.graphic || "/Logo_NoName.jpg"]);

  const isSpecimenSoldOut = !activeSpecimen || !activeSpecimen.availability || activeSpecimen.status === "sold_out" || activeSpecimen.inventory <= 0;

  // Handle acquiring individual specimen
  const handleAcquireSpecimen = () => {
    if (!activeSpecimen || isSpecimenSoldOut || !artifact) return;
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
    setTimeout(() => setAddedIndividual(false), 2400);
  };

  // Handle acquiring complete artifact set
  const handleAcquireSet = () => {
    if (!artifact || setCalculation.availableSpecimens.length === 0) return;
    soundManager.playClick();

    const includedSpecimens = setCalculation.availableSpecimens.map(spec => ({
      specimenId: spec.id,
      medium: spec.medium,
      price: spec.price,
      size: (spec.mediumCategory === "wear" || spec.availableSizes?.includes(setWearableSize)) 
        ? setWearableSize 
        : (spec.availableSizes?.[0] || "Standard"),
      color: spec.color || spec.availableColors?.[0]?.name || "Standard"
    }));

    const cartItem: CartItem = {
      id: `set_${artifact.id}_${setWearableSize}_${Date.now()}`,
      productId: `set_${artifact.id}`,
      artifactId: artifact.id,
      name: `${artifact.name} — COMPLETE ARTIFACT SET (${setCalculation.specimenCount} SPECIMENS)`,
      price: setCalculation.setPrice,
      quantity: 1,
      image: artifact.graphic || displayImages[0],
      categoryLabel: "COMPLETE SET",
      isSetBundle: true,
      includedSpecimens,
      options: {
        "Edition": "Complete Physical Series",
        "Wearable Size": setWearableSize,
        "Total Specimens": `${setCalculation.specimenCount} Pieces`
      }
    };

    onAddToCart(cartItem);
    setAddedSet(true);
    setTimeout(() => setAddedSet(false), 2400);
  };

  // Handle legacy product add to cart
  const handleLegacyAcquire = () => {
    if (!product) return;
    soundManager.playClick();

    const cartItem: CartItem = {
      id: `${product.id}_${JSON.stringify(legacySelectedOptions)}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: legacyQuantity,
      image: product.graphic || product.images?.[0] || "/Logo_NoName.jpg",
      categoryLabel: product.medium?.toUpperCase() || product.categoryId?.toUpperCase() || "ARTIFACT",
      options: legacySelectedOptions
    };

    onAddToCart(cartItem);
    setLegacyAdded(true);
    setTimeout(() => setLegacyAdded(false), 2400);
  };

  const handleShare = () => {
    soundManager.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // If rendering legacy product
  if (!artifact && product) {
    return (
      <div className="min-h-screen bg-transparent text-brand-text font-mono selection:bg-brand-text selection:text-white pb-24">
        {/* Top Header Navigation */}
        <div className="sticky top-14 sm:top-16 z-40 bg-brand-surface/95 backdrop-blur-md border-b-2 border-brand-text px-4 py-3 flex items-center justify-between shadow-[0_2px_0px_#050505]">
          <button
            type="button"
            onClick={onBackToSpec}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text text-xs font-black uppercase shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO SPECIFICATIONS</span>
          </button>
          <span className="text-xs font-black uppercase text-brand-accent">
            ACQUISITION PROTOCOL // {product.name}
          </span>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
          <div className="border-2 border-brand-text bg-brand-surface p-6 shadow-[6px_6px_0px_#050505]">
            <h1 className="text-2xl sm:text-4xl font-black uppercase text-brand-text">{product.name}</h1>
            <p className="text-xs uppercase text-brand-text/70 mt-1">{product.description}</p>
            
            {/* Price display ONLY on this page */}
            <div className="mt-6 pt-4 border-t-2 border-brand-text flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase text-brand-text/60">ACQUISITION VALUATION:</span>
              <span className="text-3xl font-black text-brand-text">Rs. {product.price.toLocaleString()} PKR</span>
            </div>

            <div className="mt-6 space-y-4">
              {product.availableSizes && product.availableSizes.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase block mb-1">SPECIFICATION // SIZE</span>
                  <div className="flex gap-2">
                    {product.availableSizes.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setLegacySelectedOptions(prev => ({ ...prev, Size: sz }))}
                        className={`px-4 py-2 text-xs font-black border uppercase ${
                          legacySelectedOptions["Size"] === sz ? "bg-brand-text text-brand-bg border-brand-text" : "bg-brand-bg text-brand-text border-brand-text/50"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-black uppercase block mb-1">QUANTITY</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-brand-text bg-brand-bg">
                    <button
                      type="button"
                      onClick={() => setLegacyQuantity(q => Math.max(1, q - 1))}
                      className="p-2 hover:bg-brand-text hover:text-white"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-4 font-black">{legacyQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setLegacyQuantity(q => q + 1)}
                      className="p-2 hover:bg-brand-text hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLegacyAcquire}
                className="w-full py-4 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white text-base font-black uppercase border-2 border-brand-text shadow-[4px_4px_0px_#050505] cursor-pointer mt-4"
              >
                {legacyAdded ? "SPECIMEN SECURED TO LEDGER" : `ACQUIRE SPECIMEN • Rs. ${(product.price * legacyQuantity).toLocaleString()} PKR`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return null;
  }

  const activeTotal = (activeSpecimen?.price || 0) * quantity;

  return (
    <div className="min-h-screen bg-transparent text-brand-text font-mono selection:bg-brand-text selection:text-white pb-24">
      {/* Background Architectural Grid Pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#050505_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Header Navigation Bar */}
      <div className="sticky top-14 sm:top-16 z-40 bg-brand-surface/95 backdrop-blur-md border-b-2 border-brand-text px-4 py-3 flex items-center justify-between shadow-[0_2px_0px_#050505]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onBackToSpec();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors text-xs font-black uppercase shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO SPECIFICATIONS</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-brand-text/60">
            <span>ARCHIVE</span>
            <span>//</span>
            <span className="text-brand-text font-bold uppercase">{artifact.collectionName}</span>
            <span>//</span>
            <span className="text-brand-accent font-black uppercase">{artifact.name}</span>
            <span>//</span>
            <span className="bg-brand-accent text-white px-1.5 py-0.2 font-black uppercase text-[9px]">
              ACQUISITION SUITE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLedger && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onOpenLedger();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors text-xs font-black uppercase shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">VIEW LEDGER</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text transition-colors shadow-[1.5px_1.5px_0px_#050505] cursor-pointer"
            title="Copy acquisition link"
          >
            {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* ─── 1. ARTIFACT IDENTIFICATION & ACQUISITION SUITE HERO ─── */}
        <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-7 shadow-[6px_6px_0px_#050505] mb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-brand-text pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[9.5px] font-black uppercase tracking-wider bg-brand-accent text-white px-2 py-0.5">
                  ACQUISITION PROTOCOL
                </span>
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-brand-text/60 border border-brand-text/30 px-2 py-0.5">
                  CODE: {artifact.artifactId || "SYM-ART"}
                </span>
                <span className="font-mono text-[9.5px] font-black uppercase text-brand-text bg-brand-bg border border-brand-text/40 px-2 py-0.5">
                  {childSpecimens.length} SPECIMENS CATALOGUED
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-mono font-black uppercase tracking-tight text-brand-text leading-none">
                ACQUIRE {artifact.name}
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
            Select what specimens you wish to acquire, configure specific physical parameters (sizing, fit, quantity), and review verified atelier valuation.
          </p>

          {/* Mode Switcher: Individual Specimen vs Complete Set */}
          {setCalculation.specimenCount > 1 && (
            <div className="mt-6 pt-5 border-t border-brand-text/20 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setAcquisitionMode("individual");
                }}
                className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex items-center gap-2 ${
                  acquisitionMode === "individual"
                    ? "bg-brand-text text-brand-bg border-brand-text shadow-[3px_3px_0px_#050505]"
                    : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                }`}
              >
                <Layers size={14} className={acquisitionMode === "individual" ? "text-brand-accent" : ""} />
                <span>CHOOSE INDIVIDUAL SPECIMEN ({childSpecimens.length} AVAILABLE)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setAcquisitionMode("set");
                }}
                className={`px-5 py-3 font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                  acquisitionMode === "set"
                    ? "bg-brand-accent text-white border-brand-text shadow-[4px_4px_0px_#050505]"
                    : "bg-brand-accent text-white border-brand-text hover:bg-brand-text shadow-[4px_4px_0px_#050505]"
                }`}
              >
                <Box size={16} />
                <span>ACQUIRE FULL SET (SAVE {setCalculation.discountPercent}%)</span>
              </button>
            </div>
          )}
        </div>

        {/* ─── 2. ACQUISITION CONFIGURATOR VIEW ─── */}
        {acquisitionMode === "individual" ? (
          <div>
            {/* Step 1: Choose What Specimens to Buy */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3 border-b-2 border-brand-text pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-brand-accent" />
                  <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-tight text-brand-text">
                    STEP 01 // CHOOSE SPECIMEN TO ACQUIRE
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-brand-text/60">
                  Tap a specimen plate to view valuation and configure specifications
                </span>
              </div>

              {/* Specimen Plates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {childSpecimens.map((spec, idx) => {
                  const isSelected = spec.id === selectedSpecimenId;
                  const isSold = !spec.availability || spec.status === "sold_out" || spec.inventory <= 0;
                  const specImg = spec.images?.[0] || spec.thumbnailImage || artifact.graphic;

                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedSpecimenId(spec.id);
                      }}
                      className={`p-3 text-left border-2 font-mono transition-all flex flex-col justify-between cursor-pointer relative ${
                        isSelected
                          ? "bg-brand-surface border-brand-accent ring-2 ring-brand-accent shadow-[4px_4px_0px_#ff4500] z-10"
                          : "bg-brand-surface border-brand-text shadow-[3px_3px_0px_#050505] hover:border-brand-accent hover:shadow-[4px_4px_0px_#050505]"
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="w-full h-28 bg-brand-bg border border-brand-text/30 overflow-hidden flex items-center justify-center relative mb-2">
                        <img
                          src={specImg}
                          alt={spec.medium}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1.5 select-none pointer-events-none"
                        />
                        <div className="absolute top-1 right-1 px-1 py-0.5 bg-brand-surface text-brand-text text-[7px] font-black uppercase tracking-wider border border-brand-text/40">
                          0{idx + 1}
                        </div>
                        {isSold && (
                          <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white bg-red-600 px-1.5 py-0.5 uppercase">
                              ALLOTTED
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info & Price ONLY on this page */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-black uppercase text-brand-text truncate">
                            {spec.medium}
                          </span>
                          {isSelected && <Check size={12} className="text-brand-accent shrink-0 ml-1" />}
                        </div>
                        <p className="text-[8px] font-bold text-brand-text/60 uppercase truncate">
                          {spec.material || "Canonical"}
                        </p>
                        
                        {/* Specimen Valuation - PROUDLY DISPLAYED ON ACQUISITION PAGE */}
                        <div className="pt-1.5 border-t border-brand-text/20 flex items-baseline justify-between">
                          <span className="text-[7.5px] font-bold uppercase text-brand-text/50">VALUATION</span>
                          <span className="text-[11px] font-black text-brand-accent">
                            PKR {spec.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Configure Specifications & Sizing for Selected Specimen */}
            {activeSpecimen && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                
                {/* Left Preview Column (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="relative aspect-square bg-brand-surface border-2 border-brand-text shadow-[6px_6px_0px_#050505] flex items-center justify-center overflow-hidden">
                    <img 
                      src={displayImages[activeImageIndex] || activeSpecimen.thumbnailImage || artifact.graphic} 
                      alt={`${artifact.name} ${activeSpecimen.medium}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-6"
                    />

                    {/* Archival Watermark on Central Graphic */}
                    {(displayImages[activeImageIndex] === artifact.graphic || (!displayImages[activeImageIndex] && !activeSpecimen.thumbnailImage)) && (
                      <ArtifactWatermark
                        artifactName={artifact.name}
                        artifactId={artifact.artifactId}
                        collectionName={artifact.collectionName}
                        variant="subtle"
                      />
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                      <span className="text-[9px] font-mono font-black uppercase bg-brand-text text-brand-bg px-2 py-0.5">
                        CONFIGURING: {activeSpecimen.medium}
                      </span>
                      <span className="text-[8px] font-mono font-black uppercase bg-brand-bg text-brand-text px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                        SKU: {activeSpecimen.sku}
                      </span>
                    </div>

                    {/* Allotment status badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 border shadow-[1px_1px_0px_#050505] ${
                        isSpecimenSoldOut ? "bg-red-600 text-white border-red-700" : "bg-emerald-600 text-white border-emerald-700"
                      }`}>
                        {isSpecimenSoldOut ? "ALLOTTED // WAITLIST ONLY" : "IN STOCK & READY TO DISPATCH"}
                      </span>
                    </div>
                  </div>

                  {/* Multi-angle preview thumbnails */}
                  {displayImages.length > 1 && (
                    <div 
                      className="flex gap-2 overflow-x-auto pb-1"
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      {displayImages.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            soundManager.playClick(0.04);
                            setActiveImageIndex(i);
                          }}
                          className={`w-16 h-16 shrink-0 border-2 bg-brand-surface p-1 transition-all cursor-pointer ${
                            activeImageIndex === i 
                              ? "border-brand-accent shadow-[2px_2px_0px_#050505] ring-1 ring-brand-accent" 
                              : "border-brand-text/40 hover:border-brand-text"
                          }`}
                        >
                          <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Material & Physical DNA Card */}
                  <div className="border border-brand-text/30 bg-brand-surface p-4 shadow-[3px_3px_0px_#050505] text-[9.5px] uppercase space-y-1.5">
                    <span className="text-[8px] font-black text-brand-text/60 block">PHYSICAL MANIFESTATION ATTRIBUTES // {activeSpecimen.medium}:</span>
                    {getSpecimenArchitectureSpecs(activeSpecimen).map((specItem, idx) => (
                      <div key={idx} className="flex justify-between border-b border-brand-text/10 pb-1">
                        <span className="text-brand-text/60">{specItem.label}</span>
                        <span className="font-black text-brand-text">{specItem.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Configuration & Acquisition Column (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[6px_6px_0px_#050505]">
                    
                    {/* Header with Title and PRICING (ONLY ON THIS PAGE) */}
                    <div className="border-b-2 border-brand-text pb-5 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-text/60 block">
                            SPECIMEN VALUATION // DIRECT ATELIER
                          </span>
                          <h2 className="text-2xl sm:text-3xl font-black uppercase text-brand-text leading-tight mt-0.5">
                            {activeSpecimen.medium}
                          </h2>
                          <p className="text-xs uppercase text-brand-text/70 mt-0.5">
                            {activeSpecimen.type || "Official Artifact Manifestation"}
                          </p>
                        </div>

                        {/* PROMINENT PRICE DISPLAY */}
                        <div className="text-left sm:text-right bg-brand-bg sm:bg-transparent p-3 sm:p-0 border sm:border-0 border-brand-text/30">
                          <span className="text-[8.5px] font-bold text-brand-text/60 uppercase block">
                            ACQUISITION PRICE
                          </span>
                          <div className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                            PKR {activeSpecimen.price.toLocaleString()}
                          </div>
                          <span className="text-[8px] font-bold text-brand-text/50 uppercase">
                            [INCLUSIVE OF TAXES • DISPATCH PRIVILEGE]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 Controls: Specifications (Size, Color, Quantity) */}
                    <div className="space-y-6">
                      
                      {/* Sizing Specification */}
                      {activeSpecimen.availableSizes && activeSpecimen.availableSizes.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-brand-text">
                              SELECT SPECIFICATION // SIZE:
                            </span>
                            {activeSpecimen.mediumCategory === "wear" && (
                              <button
                                type="button"
                                onClick={() => setShowSizeGuide(true)}
                                className="text-[9px] font-mono font-bold uppercase text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Ruler size={12} />
                                <span>SIZE GUIDE & MEASUREMENTS</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {activeSpecimen.availableSizes.map(sz => {
                              const isSelected = selectedSize === sz;
                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick(0.04);
                                    setSelectedSize(sz);
                                  }}
                                  className={`py-3 px-2 text-center font-mono text-sm font-black uppercase border-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-brand-text text-brand-bg border-brand-text shadow-[3px_3px_0px_#050505] -translate-y-0.5"
                                      : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text shadow-[1.5px_1.5px_0px_#050505]"
                                  }`}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Color Specification (if multiple colors available) */}
                      {activeSpecimen.availableColors && activeSpecimen.availableColors.length > 1 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-text block">
                            SELECT SPECIFICATION // COLOR:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {activeSpecimen.availableColors.map(c => {
                              const isSelected = selectedColor === c.name;
                              return (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick(0.04);
                                    setSelectedColor(c.name);
                                  }}
                                  className={`px-3.5 py-2 font-mono text-xs font-black uppercase border-2 transition-all cursor-pointer flex items-center gap-2 ${
                                    isSelected
                                      ? "bg-brand-text text-brand-bg border-brand-text shadow-[3px_3px_0px_#050505]"
                                      : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                                  }`}
                                >
                                  <span className="w-3 h-3 border border-brand-text shrink-0" style={{ backgroundColor: c.hex }} />
                                  <span>{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quantity Stepper */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-text block">
                          SPECIMEN QUANTITY:
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border-2 border-brand-text bg-brand-bg shadow-[3px_3px_0px_#050505]">
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick(0.04);
                                setQuantity(q => Math.max(1, q - 1));
                              }}
                              disabled={quantity <= 1}
                              className="p-2.5 hover:bg-brand-text hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="px-5 font-mono font-black text-base">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick(0.04);
                                setQuantity(q => Math.min(activeSpecimen.inventory || 10, q + 1));
                              }}
                              disabled={quantity >= (activeSpecimen.inventory || 10)}
                              className="p-2.5 hover:bg-brand-text hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <span className="text-[10px] font-bold uppercase text-brand-text/60">
                            {isSpecimenSoldOut ? "CURRENTLY ALLOTTED" : `${activeSpecimen.inventory} AVAILABLE IN ARCHIVE`}
                          </span>
                        </div>
                      </div>

                      {/* Order Line Item Summary with Live Calculated Total */}
                      <div className="bg-brand-bg border-2 border-brand-text p-4 shadow-[3px_3px_0px_#050505] space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase text-brand-text/60 border-b border-brand-text/20 pb-1.5">
                          <span>ITEM SPECIFICATION SUMMARY</span>
                          <span>TOTAL SETTLEMENT</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-black uppercase text-brand-text block">
                              {artifact.name} — {activeSpecimen.medium}
                            </span>
                            <span className="text-[10px] font-bold text-brand-accent uppercase block">
                              {selectedSize ? `Size: ${selectedSize}` : ""} {selectedColor ? `• Color: ${selectedColor}` : ""} • Qty: {quantity}
                            </span>
                          </div>
                          <span className="text-2xl font-black text-brand-text">
                            PKR {activeTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Primary Acquisition CTA Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleAcquireSpecimen}
                          disabled={isSpecimenSoldOut}
                          className={`w-full py-4 sm:py-5 px-6 font-mono text-base sm:text-lg font-black uppercase tracking-wider border-2 border-brand-text transition-all flex items-center justify-center gap-3 cursor-pointer ${
                            isSpecimenSoldOut 
                              ? "bg-stone-300 text-stone-600 border-stone-400 cursor-not-allowed" 
                              : addedIndividual
                                ? "bg-emerald-700 text-white border-brand-text shadow-[4px_4px_0px_#050505]"
                                : "bg-brand-accent text-white hover:bg-brand-text shadow-[6px_6px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px]"
                          }`}
                        >
                          {addedIndividual ? (
                            <>
                              <Check size={20} />
                              <span>SPECIMEN SECURED TO LEDGER</span>
                            </>
                          ) : isSpecimenSoldOut ? (
                            <span>SPECIMEN ALLOTTED (SOLD OUT)</span>
                          ) : (
                            <>
                              <ShoppingBag size={20} />
                              <span>SECURE {activeSpecimen.medium.toUpperCase()} SPECIMEN • PKR {activeTotal.toLocaleString()}</span>
                            </>
                          )}
                        </button>

                        <a
                          href={getWhatsAppUrl(buildWhatsAppProductInquiry({
                            name: artifact.name,
                            sku: activeSpecimen.sku,
                            productId: artifact.artifactId,
                            price: activeTotal,
                            medium: activeSpecimen.medium,
                            selectedSize: selectedSize || undefined,
                            selectedColor: selectedColor || undefined
                          }))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-2 py-3 px-4 font-mono text-xs font-black uppercase tracking-wider bg-[#25D366]/10 text-brand-text hover:bg-[#25D366] hover:text-white border-2 border-[#25D366] shadow-[2px_2px_0px_#050505] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                        >
                          <MessageCircle size={15} className="text-[#128C7E]" />
                          <span>INQUIRE VIA WHATSAPP CONCIERGE ({STUDIO_WHATSAPP_LOCAL_DISPLAY})</span>
                        </a>
                      </div>

                      {/* Studio Guarantee Badges */}
                      <div className="pt-2 grid grid-cols-2 gap-3 text-[9px] uppercase text-brand-text/75">
                        <div className="flex items-center gap-2 border border-brand-text/30 p-2 bg-brand-surface">
                          <ShieldCheck size={14} className="text-brand-accent shrink-0" />
                          <span>Guaranteed Heavyweight Physical Specimen</span>
                        </div>
                        <div className="flex items-center gap-2 border border-brand-text/30 p-2 bg-brand-surface">
                          <Truck size={14} className="text-brand-accent shrink-0" />
                          <span>Tracked Atelier Delivery Across Pakistan</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── COMPLETE ARTIFACT SET ACQUISITION VIEW ─── */
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-10 shadow-[8px_8px_0px_#050505]">
              <div className="flex items-center gap-3 border-b-2 border-brand-text pb-4 mb-6">
                <Box size={28} className="text-brand-accent" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase text-brand-text">
                    COMPLETE {artifact.name} ARTIFACT SET
                  </h2>
                  <p className="text-xs uppercase text-brand-text/70 mt-0.5">
                    Acquire all {setCalculation.specimenCount} catalogued physical specimens belonging to this symbol
                  </p>
                </div>
              </div>

              {/* Included Specimens Detailed Manifest */}
              <div className="space-y-2 mb-6">
                <span className="text-[10px] font-black uppercase text-brand-text block">
                  ALL MANIFESTED SPECIMENS INCLUDED IN THIS ARCHIVAL SET:
                </span>
                <div className="bg-brand-bg border-2 border-brand-text p-4 space-y-2">
                  {setCalculation.availableSpecimens.map((spec, idx) => (
                    <div key={spec.id} className="flex items-center justify-between border-b border-brand-text/15 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-700" />
                        <span className="font-black text-brand-text">0{idx + 1} // {spec.medium}</span>
                        <span className="text-brand-text/60 text-[10px]">({spec.material || "Canonical"})</span>
                      </div>
                      <span className="font-black text-brand-text">PKR {spec.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wearable Size Selection */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-brand-text">
                    SELECT SIZE FOR WEARABLE SPECIMENS (T-SHIRTS, HOODIES, SLEEVES):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="text-[9px] font-bold uppercase text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Ruler size={11} />
                    <span>SIZING MATRIX</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["S", "M", "L", "XL"].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.04);
                        setSetWearableSize(sz);
                      }}
                      className={`py-3 text-center font-mono text-sm font-black uppercase border-2 transition-all cursor-pointer ${
                        setWearableSize === sz
                          ? "bg-brand-text text-brand-bg border-brand-text shadow-[3px_3px_0px_#050505]"
                          : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRICE BREAKDOWN AND COMPLETE SET VALUATION (ONLY ON THIS PAGE) */}
              <div className="bg-brand-accent/10 border-2 border-brand-accent p-5 mb-6 space-y-3">
                <div className="flex items-baseline justify-between text-xs text-brand-text/70">
                  <span className="font-bold uppercase">INDIVIDUAL VALUATION SUM:</span>
                  <span className="line-through font-mono text-sm">
                    PKR {setCalculation.individualTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-brand-accent/30 pt-3">
                  <div>
                    <span className="text-xs font-black uppercase text-brand-accent block">
                      COMPLETE SET PRIVILEGE VALUATION
                    </span>
                    {setCalculation.savings > 0 && (
                      <span className="text-[10px] font-black text-emerald-700 block">
                        SAVE PKR {setCalculation.savings.toLocaleString()} ({setCalculation.discountPercent}% SET PRIVILEGE DISCOUNT)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-black text-brand-text">
                      PKR {setCalculation.setPrice.toLocaleString()}
                    </span>
                    <span className="text-[8px] font-bold text-brand-text/60 uppercase block">
                      ALL {setCalculation.specimenCount} SPECIMENS INCLUDED
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Set Acquisition CTA */}
              <button
                type="button"
                onClick={handleAcquireSet}
                className={`w-full py-5 px-6 font-mono text-base sm:text-lg font-black uppercase tracking-wider border-2 border-brand-text transition-all flex items-center justify-center gap-3 cursor-pointer ${
                  addedSet
                    ? "bg-emerald-700 text-white border-brand-text shadow-[4px_4px_0px_#050505]"
                    : "bg-brand-accent text-white hover:bg-brand-text shadow-[6px_6px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px]"
                }`}
              >
                {addedSet ? (
                  <>
                    <Check size={20} />
                    <span>COMPLETE ARTIFACT SET SECURED TO LEDGER</span>
                  </>
                ) : (
                  <>
                    <Box size={20} />
                    <span>ACQUIRE COMPLETE SET • PKR {setCalculation.setPrice.toLocaleString()}</span>
                  </>
                )}
              </button>

              <a
                href={getWhatsAppUrl(buildWhatsAppProductInquiry({
                  name: `Complete ${artifact.name} Set`,
                  sku: `${(artifact.artifactId || "ART").toUpperCase()}-SET`,
                  productId: artifact.artifactId,
                  price: setCalculation.setPrice,
                  medium: `Complete Set (${setCalculation.specimenCount} Specimens)`
                }))}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-3 py-3.5 px-4 font-mono text-xs font-black uppercase tracking-wider bg-[#25D366]/10 text-brand-text hover:bg-[#25D366] hover:text-white border-2 border-[#25D366] shadow-[3px_3px_0px_#050505] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <MessageCircle size={15} className="text-[#128C7E]" />
                <span>INQUIRE ABOUT THIS COMPLETE SET ON WHATSAPP ({STUDIO_WHATSAPP_LOCAL_DISPLAY})</span>
              </a>
            </div>
          </div>
        )}

      </div>

      {/* Sizing Specifications Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowSizeGuide(false)}
        >
          <div 
            className="bg-brand-surface border-2 border-brand-text p-6 max-w-lg w-full shadow-[8px_8px_0px_#050505]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-3 mb-4">
              <h3 className="text-base font-mono font-black uppercase text-brand-text">
                HEAVYWEIGHT ARCHIVAL SIZING MATRIX
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
        </div>
      )}
    </div>
  );
}
