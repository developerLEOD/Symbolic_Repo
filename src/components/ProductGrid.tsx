import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Product, Category, Artifact, Specimen } from "../types";
import ArtifactOverlappingCollection from "./ArtifactOverlappingCollection";
import ArtifactCard from "./ArtifactCard";
import { LayoutGrid, Grid, List, ArrowUpRight, Compass, ShieldCheck, ChevronDown, ChevronRight, Layers, Box } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  normalizeProductCategory, 
  normalizeProductCollection, 
  isProductLive, 
  fetchProducts,
  fetchCategories,
  getCachedProducts,
  CANONICAL_CATEGORIES
} from "../lib/productService";
import { 
  fetchArtifacts, 
  fetchSpecimens, 
  getCachedArtifacts, 
  getCachedSpecimens 
} from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";

interface ProductGridProps {
  activeCategoryId: string | null;
  onCategoryChange?: (id: string | null) => void;
  onProductClick: (productOrArtifact: any, specimenId?: string) => void;
  refreshKey?: number;
  onCategoriesLoaded?: (categories: Category[]) => void;
}

export default function ProductGrid({ 
  activeCategoryId, 
  onCategoryChange, 
  onProductClick, 
  refreshKey = 0, 
  onCategoriesLoaded 
}: ProductGridProps) {
  // Master Archival state
  const [artifacts, setArtifacts] = useState<Artifact[]>(() => getCachedArtifacts());
  const [specimens, setSpecimens] = useState<Specimen[]>(() => getCachedSpecimens());
  const [products, setProducts] = useState<Product[]>(() => getCachedProducts());
  const [categories, setCategories] = useState<Category[]>(CANONICAL_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<"all" | "be-symbolic" | "be-palestine">("all");
  const [viewMode, setViewMode] = useState<"exhibition" | "grid" | "ledger">("exhibition");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [expandedLedgerArtifactIds, setExpandedLedgerArtifactIds] = useState<Record<string, boolean>>({});

  // Sync collection if activeCategoryId points to a collection from header
  useEffect(() => {
    if (activeCategoryId === "be-palestine" || activeCategoryId === "palestine") {
      setSelectedCollection("be-palestine");
    } else if (activeCategoryId === "be-symbolic") {
      setSelectedCollection("be-symbolic");
    } else {
      setSelectedCollection("all");
    }
  }, [activeCategoryId]);

  const syncArchiveData = useCallback(async () => {
    try {
      setReverifying(true);
      const [loadedCats, prods, arts, specs] = await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchArtifacts(),
        fetchSpecimens()
      ]);

      if (loadedCats && loadedCats.length > 0) {
        setCategories(loadedCats);
        if (onCategoriesLoaded) onCategoriesLoaded(loadedCats);
      }

      if (prods && prods.length > 0) {
        setProducts(prods);
      }

      if (arts && arts.length > 0) {
        setArtifacts(arts);
      }

      if (specs && specs.length > 0) {
        setSpecimens(specs);
      }
    } catch (err) {
      console.error("Archive background sync error:", err);
    } finally {
      setLoading(false);
      setReverifying(false);
    }
  }, [onCategoriesLoaded]);

  useEffect(() => {
    syncArchiveData();
  }, [refreshKey, syncArchiveData]);

  // Derive active medium (Wear, Carry, Headwear, Vessels)
  const activeMedium = (activeCategoryId === "be-palestine" || activeCategoryId === "palestine" || activeCategoryId === "be-symbolic")
    ? null
    : activeCategoryId;

  // Filter Artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((art) => {
      // 1. Collection filter
      if (selectedCollection === "be-palestine") {
        const cName = (art.collectionName || "").toLowerCase();
        if (!cName.includes("palestine") && !cName.includes("falasteen")) return false;
      } else if (selectedCollection === "be-symbolic") {
        const cName = (art.collectionName || "").toLowerCase();
        if (!cName.includes("symbolic")) return false;
      }

      // Child specimens
      const childSpecs = specimens.filter(
        (s) => s.parentArtifactId === art.id || art.specimenIds?.includes(s.id)
      );

      // 2. Medium filter
      if (activeMedium) {
        const targetMed = activeMedium.toLowerCase();
        const hasMedium = childSpecs.some((s) => {
          const med = (s.medium || "").toLowerCase();
          if (targetMed === "wear") return med.includes("t-shirt") || med.includes("tee") || med.includes("hoodie") || med.includes("sleeve") || med.includes("wear");
          if (targetMed === "carry") return med.includes("tote") || med.includes("bag") || med.includes("carry");
          if (targetMed === "headwear") return med.includes("cap") || med.includes("hat") || med.includes("head");
          if (targetMed === "vessels") return med.includes("mug") || med.includes("cup") || med.includes("vessel") || med.includes("ceramic");
          return med.includes(targetMed);
        });
        if (!hasMedium) return false;
      }

      // 3. In stock only
      if (inStockOnly) {
        const hasStock = childSpecs.some((s) => s.availability && s.status !== "sold_out");
        if (!hasStock) return false;
      }

      return true;
    });
  }, [artifacts, specimens, selectedCollection, activeMedium, inStockOnly]);

  // Mediums (Categories)
  const mediums: { id: string | null; label: string }[] = [
    { id: null, label: "ALL MEDIUMS" },
    { id: "wear", label: "WEAR" },
    { id: "carry", label: "CARRY" },
    { id: "headwear", label: "HEADWEAR" },
    { id: "vessels", label: "VESSELS" },
  ];

  // Ethos Collections
  const ethosCollections = [
    { id: "all" as const, label: "ALL COLLECTIONS" },
    { id: "be-symbolic" as const, label: "BE SYMBOLIC" },
    { id: "be-palestine" as const, label: "BE PALESTINE" },
  ];

  const currentCategoryName = activeMedium ? activeMedium.toUpperCase() : (selectedCollection !== "all" ? selectedCollection.toUpperCase() : "");

  // Total counts
  const totalArtifactsCount = filteredArtifacts.length;
  const totalSpecimensCount = useMemo(() => {
    let count = 0;
    filteredArtifacts.forEach((art) => {
      const childSpecs = specimens.filter(
        (s) => s.parentArtifactId === art.id || art.specimenIds?.includes(s.id)
      );
      count += childSpecs.length;
    });
    return count;
  }, [filteredArtifacts, specimens]);

  const toggleLedgerExpand = (artId: string) => {
    soundManager.playToggle(0.06);
    setExpandedLedgerArtifactIds((prev) => ({
      ...prev,
      [artId]: !prev[artId],
    }));
  };

  // Only render skeleton state if there are zero artifacts loaded
  if (loading && artifacts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24 space-y-12 bg-brand-bg">
        <div className="flex justify-between items-center border-b-2 border-brand-text pb-6">
          <div className="w-64 h-10 bg-brand-surface animate-pulse" />
          <div className="w-32 h-8 bg-brand-surface animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="aspect-[4/5] bg-brand-surface animate-pulse border-2 border-brand-text" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section id="catalog-section" aria-label="The Collection" className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-12 space-y-8 bg-brand-bg">
      {/* 1. CLEAN ARCHITECTURAL HEADER */}
      <div className="border-b-2 border-brand-text pb-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-brand-accent"></span>
              <span className="font-mono text-[9.5px] font-black uppercase tracking-widest text-brand-accent">
                {selectedCollection === "be-palestine" ? "COLLECTION FALASTEEN" : selectedCollection === "be-symbolic" ? "COLLECTION BE SYMBOLIC" : "PERMANENT ARCHIVE"}
              </span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black uppercase tracking-tight text-brand-text leading-none">
                THE COLLECTION
              </h2>
              <span className="font-mono text-xs font-bold text-brand-text/60 uppercase tracking-widest">
                [{totalArtifactsCount < 10 ? `0${totalArtifactsCount}` : totalArtifactsCount} ARTIFACTS // {totalSpecimensCount} SPECIMENS]
              </span>
            </div>
          </div>

          {/* Perspective View Switcher */}
          <div className="inline-flex border-2 border-brand-text bg-brand-surface shadow-[3px_3px_0px_#050505] overflow-hidden divide-x-2 divide-brand-text shrink-0">
            <button
              id="view-mode-exhibition-btn"
              type="button"
              onClick={() => {
                soundManager.playToggle(0.06);
                setViewMode("exhibition");
              }}
              className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                viewMode === "exhibition"
                  ? "bg-brand-text text-brand-bg shadow-inner"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
              title="Exhibition View: Curated interactive overlapping artifacts showcase"
              aria-label="Switch to Exhibition View"
            >
              <LayoutGrid size={13} className="shrink-0" />
              <span>EXHIBITION</span>
            </button>
            <button
              id="view-mode-cards-btn"
              type="button"
              onClick={() => {
                soundManager.playToggle(0.06);
                setViewMode("grid");
              }}
              className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                viewMode === "grid"
                  ? "bg-brand-text text-brand-bg shadow-inner"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
              title="Cards View: Clean structured catalogue grid"
              aria-label="Switch to Cards Grid View"
            >
              <Grid size={13} className="shrink-0" />
              <span>CARDS</span>
            </button>
            <button
              id="view-mode-ledger-btn"
              type="button"
              onClick={() => {
                soundManager.playToggle(0.06);
                setViewMode("ledger");
              }}
              className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                viewMode === "ledger"
                  ? "bg-brand-text text-brand-bg shadow-inner"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
              title="Ledger View: Technical inventory specification table"
              aria-label="Switch to Registry Ledger View"
            >
              <List size={13} className="shrink-0" />
              <span>LEDGER</span>
            </button>
          </div>
        </div>

        <p className="font-space-grotesk text-sm text-brand-text/80 normal-case leading-relaxed max-w-2xl font-normal">
          Master artworks featuring their central graphic inscription, materialized across separate physical specimens.
        </p>
      </div>

      {/* 2. MEDIUMS & COLLECTION FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-brand-text/20">
        {/* Primary Medium Tabs (Wear, Carry, Headwear, Vessels) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-text/60 mr-1">
            MEDIUMS //
          </span>
          <div className="inline-flex flex-wrap border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505] divide-x-2 divide-brand-text overflow-hidden">
            {mediums.map((item) => {
              const isSelected = activeMedium === item.id;
              return (
                <button
                  key={item.id ?? "all"}
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.08);
                    if (onCategoryChange) onCategoryChange(item.id);
                  }}
                  className={`px-3 sm:px-4 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-brand-text text-brand-bg"
                      : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ethos Collections & Availability */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Collection switcher */}
          <div className="inline-flex border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505] divide-x-2 divide-brand-text overflow-hidden">
            {ethosCollections.map((col) => {
              const isSelected = selectedCollection === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.08);
                    setSelectedCollection(col.id);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-brand-text text-brand-bg"
                      : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>

          {/* In-Stock Filter */}
          <button
            id="filter-available-only-btn"
            type="button"
            onClick={() => {
              soundManager.playToggle(0.06);
              setInStockOnly(!inStockOnly);
            }}
            className={`px-3 py-1.5 border-2 border-brand-text font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] select-none ${
              inStockOnly 
                ? "bg-brand-accent text-white shadow-inner" 
                : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
            }`}
            title="Filter by availability: toggle between showing all items or only artifacts currently in stock"
            aria-pressed={inStockOnly}
            aria-label="Filter artifacts in stock only"
          >
            <span className={`w-2 h-2 rounded-full border border-black/30 transition-colors ${inStockOnly ? "bg-white animate-pulse" : "bg-brand-accent"}`} />
            <span>AVAILABLE ONLY</span>
            {inStockOnly && (
              <span className="text-[8.5px] opacity-80 border-l border-white/40 pl-1.5 font-bold">
                [ACTIVE]
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. ARTIFACTS DISPLAY: EXHIBITION, CARDS, OR ARCHIVAL LEDGER */}
      {filteredArtifacts.length === 0 ? (
        /* Empty / In Fabrication State */
        <div className="py-20 px-6 text-center space-y-6 border-2 border-dashed border-brand-text/40 bg-brand-surface/50 p-8 sm:p-14 shadow-[4px_4px_0px_#050505] max-w-2xl mx-auto my-8 font-mono">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest border border-brand-text shadow-[2px_2px_0px_#050505]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>[ STATUS: IN FABRICATION // ATELIER PROTOCOL ACTIVE ]</span>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-brand-text">
              ALLOTMENTS IN FABRICATION
            </h3>
            <p className="text-xs uppercase text-brand-text/80 leading-relaxed max-w-md mx-auto">
              Artifacts for [{currentCategoryName ? ` ${currentCategoryName} ` : " THIS SELECTION "}] are currently being tailored under strict material mandates.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button 
              type="button"
              onClick={() => { 
                setSelectedCollection("all");
                setInStockOnly(false);
                if (onCategoryChange) onCategoryChange(null); 
              }} 
              className="px-6 py-3 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
            >
              EXPLORE ALL REGISTERED ARTIFACTS
            </button>
            <button 
              type="button"
              disabled={reverifying}
              onClick={() => syncArchiveData()} 
              className="px-6 py-3 bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg disabled:opacity-50 text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
            >
              {reverifying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                  <span>VERIFYING ARCHIVE...</span>
                </>
              ) : (
                <span>RE-VERIFY COLLECTION STATUS</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "ledger" ? (
            /* ARCHIVAL REGISTRY LEDGER VIEW (Organized by Artifact with separate Specimens) */
            <motion.div
              key="ledger-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="border-2 border-brand-text bg-brand-surface shadow-[6px_6px_0px_#050505] overflow-x-auto"
            >
              <table className="w-full text-left font-mono border-collapse">
            <thead>
              <tr className="border-b-2 border-brand-text bg-brand-text text-brand-bg text-[9.5px] uppercase tracking-widest font-black">
                <th className="p-3.5">MASTER ARTIFACT // CENTRAL GRAPHIC</th>
                <th className="p-3.5">INSCRIPTION</th>
                <th className="p-3.5">COLLECTION</th>
                <th className="p-3.5">SEPARATE SPECIMENS</th>
                <th className="p-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brand-text text-xs">
              {filteredArtifacts.map((art, idx) => {
                const artifactNum = String(idx + 1).padStart(2, "0");
                const childSpecs = specimens.filter(
                  (s) => s.parentArtifactId === art.id || art.specimenIds?.includes(s.id)
                );
                const isExpanded = expandedLedgerArtifactIds[art.id] ?? true;

                return (
                  <React.Fragment key={art.id}>
                    {/* Master Artifact Primary Row */}
                    <tr 
                      className="bg-brand-surface hover:bg-brand-bg/80 transition-colors cursor-pointer group"
                      onClick={() => toggleLedgerExpand(art.id)}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-brand-accent p-0.5 hover:bg-brand-text/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLedgerExpand(art.id);
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <div className="w-10 h-10 bg-brand-bg border border-brand-text p-1 flex items-center justify-center shrink-0">
                            <img
                              src={art.graphic || "/Logo_NoName.jpg"}
                              alt={art.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="font-black uppercase tracking-tight text-brand-text group-hover:text-brand-accent transition-colors flex items-center gap-2">
                              <span>{art.name}</span>
                              <span className="text-[8.5px] font-bold text-brand-text/60">
                                [{art.artifactId || `ART-${artifactNum}`}]
                              </span>
                            </div>
                            <div className="text-[9px] text-brand-text/70 uppercase line-clamp-1 max-w-xs">
                              {art.concept || art.symbolicTagline || "Canonical Artifact"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        {art.inscription ? (
                          <span className="font-serif text-base font-black text-brand-accent" dir="rtl">
                            {art.inscription.startsWith("#") ? art.inscription : `# ${art.inscription}`}
                          </span>
                        ) : (
                          <span className="text-brand-text/40">—</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 border border-brand-text text-[9px] font-black uppercase bg-brand-bg">
                          {art.collectionName || "CANONICAL"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-bold">
                          <Layers size={11} className="text-brand-accent" />
                          <span>{childSpecs.length} SPECIMENS</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playClick(0.12);
                            onProductClick(art);
                          }}
                          className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text transition-all shadow-[1px_1px_0px_#050505]"
                        >
                          <span>EXPLORE</span>
                          <ArrowUpRight size={10} />
                        </button>
                      </td>
                    </tr>

                    {/* Nested Separate Specimens Records */}
                    {isExpanded && childSpecs.map((spec) => (
                      <tr
                        key={spec.id}
                        onClick={() => {
                          soundManager.playClick(0.12);
                          onProductClick(art, spec.id);
                        }}
                        className="bg-brand-text/[0.02] hover:bg-brand-accent/5 border-t border-brand-text/10 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pl-12 pr-3.5" colSpan={2}>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-brand-surface border border-brand-text/40 p-0.5 flex items-center justify-center shrink-0">
                              <img
                                src={spec.images?.[0] || spec.thumbnailImage || art.graphic || "/Logo_NoName.jpg"}
                                alt={spec.medium}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <div className="font-black uppercase text-[10px] text-brand-text flex items-center gap-2">
                                <span className="text-brand-accent">↳</span>
                                <span>{spec.medium}</span>
                                <span className="text-[8px] font-normal text-brand-text/60">
                                  [SKU: {spec.sku}]
                                </span>
                              </div>
                              <div className="text-[8.5px] text-brand-text/70 uppercase">
                                {spec.material} {spec.fabricGsm ? `// ${spec.fabricGsm}` : ""} {spec.fit ? `// ${spec.fit}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="text-[9px] font-bold text-brand-text/70 uppercase">
                            {spec.editionDetails || "ARCHIVAL SPECIMEN"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`text-[9px] font-black uppercase ${spec.availability && spec.status !== "sold_out" ? "text-emerald-700" : "text-red-600"}`}>
                            {spec.availability && spec.status !== "sold_out" ? "IN STOCK" : "ALLOTTED"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <span className="text-[8.5px] font-black uppercase text-brand-text underline hover:text-brand-accent">
                            VIEW SPECIMEN
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      ) : viewMode === "grid" ? (
        /* ARTIFACT CARDS GRID VIEW */
        <motion.div
          key="grid-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
        >
          {filteredArtifacts.map((art, idx) => (
            <ArtifactCard
              key={art.id}
              artifact={art}
              specimens={specimens}
              onClick={(specimenId) => onProductClick(art, specimenId)}
              index={idx}
            />
          ))}
        </motion.div>
      ) : (
        /* 4. CURATED HORIZONTAL OVERLAPPING ARTIFACT EXHIBITION */
        <motion.div
          key="exhibition-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArtifactOverlappingCollection 
            artifacts={filteredArtifacts}
            specimens={specimens}
            categories={categories} 
            onProductClick={(entity, specimenId) => onProductClick(entity, specimenId)} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  )}
</section>
  );
}
