import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { Product, Category } from "../types";
import ArtifactOverlappingCollection from "./ArtifactOverlappingCollection";
import ProductCard from "./ProductCard";
import { LayoutGrid, Grid, List, ArrowUpRight, Compass, ShieldCheck } from "lucide-react";
import { 
  normalizeProductCategory, 
  normalizeProductCollection, 
  isProductLive, 
  fetchProducts,
  CANONICAL_SEED_OBJECTS 
} from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

interface ProductGridProps {
  activeCategoryId: string | null;
  onCategoryChange?: (id: string | null) => void;
  onProductClick: (product: Product) => void;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<"all" | "be-symbolic" | "be-palestine">("all");
  const [viewMode, setViewMode] = useState<"exhibition" | "grid" | "ledger">("exhibition");
  const [inStockOnly, setInStockOnly] = useState(false);

  // Sync collection if activeCategoryId points to a collection from header
  useEffect(() => {
    if (activeCategoryId === "be-palestine" || activeCategoryId === "palestine") {
      setSelectedCollection("be-palestine");
    } else if (activeCategoryId === "be-symbolic") {
      setSelectedCollection("be-symbolic");
    }
  }, [activeCategoryId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch categories
        const catsSnapshot = await getDocs(query(collection(db, "categories"), orderBy("order")));
        const cats = catsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Category))
          .filter(c => {
            const id = (c.id || "").toLowerCase();
            const name = (c.name || "").toLowerCase();
            const label = (c.label || "").toLowerCase();
            return id !== "garments" && name !== "garments" && label !== "garments" && id !== "palestine" && id !== "be-symbolic";
          });
        setCategories(cats);
        if (onCategoriesLoaded) onCategoriesLoaded(cats);

        // 2. Fetch products through canonical service with seed fallback
        const prods = await fetchProducts();
        setProducts(prods && prods.length > 0 ? prods : CANONICAL_SEED_OBJECTS);
      } catch (err) {
        console.error("Data fetching failed, loading canonical objects:", err);
        setProducts(CANONICAL_SEED_OBJECTS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Only show active/available products in storefront
  const activeProducts = products.filter(isProductLive);

  // Derive active medium (Wear, Carry, Headwear, Vessels)
  const activeMedium = (activeCategoryId === "be-palestine" || activeCategoryId === "palestine" || activeCategoryId === "be-symbolic")
    ? null
    : activeCategoryId;

  // Filter products by Ethos Collection, Medium, and Stock availability
  const filteredProducts = activeProducts.filter(p => {
    // 1. Ethos Collection filter
    if (selectedCollection === "be-palestine") {
      if (normalizeProductCollection(p) !== "Be Palestine") return false;
    } else if (selectedCollection === "be-symbolic") {
      if (normalizeProductCollection(p) !== "Be Symbolic") return false;
    }

    // 2. Medium filter
    if (activeMedium) {
      if (normalizeProductCategory(p) !== activeMedium.toLowerCase()) return false;
    }

    // 3. Stock availability filter
    if (inStockOnly && p.inventory <= 0) {
      return false;
    }

    return true;
  });

  // Preserve canonical studio archival sequence
  const sortedProducts = [...filteredProducts];

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

  const getCatalogSubtitle = () => {
    if (selectedCollection === "be-palestine") {
      return "COLLECTION FALASTEEN // ARTIFACTS OF UNYIELDING SOLIDARITY & ANCESTRAL ROOTS";
    }
    if (selectedCollection === "be-symbolic") {
      return "COLLECTION BE SYMBOLIC // CORE CORPOREAL INSTRUMENTS & ARCHIVAL SILHOUETTES";
    }
    return "PERMANENT REGISTER // ATELIER ARCHIVE";
  };

  const isCurrentCategoryEmpty = Boolean(filteredProducts.length === 0);
  const currentCategoryName = activeMedium ? activeMedium.toUpperCase() : (selectedCollection !== "all" ? selectedCollection.toUpperCase() : "");

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24 space-y-12 bg-brand-bg">
        <div className="flex justify-between items-center border-b-2 border-brand-text pb-6">
          <div className="w-64 h-10 bg-brand-surface animate-pulse" />
          <div className="w-32 h-8 bg-brand-surface animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(n => (
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
              <span className="font-mono text-xs font-bold text-brand-text/50 uppercase tracking-widest">
                [{sortedProducts.length < 10 ? `0${sortedProducts.length}` : sortedProducts.length} {sortedProducts.length === 1 ? "ARTIFACT" : "ARTIFACTS"}]
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

        <p className="font-mono text-xs text-brand-text/75 uppercase leading-relaxed max-w-2xl">
          A curated registry of symbolic physical instruments. Exterior surfaces belong entirely to the individual; our mark remains strictly within.
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
              const count = activeProducts.filter(p => {
                if (selectedCollection === "be-palestine" && normalizeProductCollection(p) !== "Be Palestine") return false;
                if (selectedCollection === "be-symbolic" && normalizeProductCollection(p) !== "Be Symbolic") return false;
                if (item.id === null) return true;
                return normalizeProductCategory(p) === item.id;
              }).length;

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
                  <span className={`text-[8.5px] font-mono font-bold ${isSelected ? "text-brand-bg/75" : "text-brand-text/50"}`}>
                    [{count < 10 ? `0${count}` : count}]
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ethos Collections & Availability */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Collection switcher */}
          <div className="inline-flex border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505] divide-x-2 divide-brand-text overflow-hidden">
            {ethosCollections.map(col => {
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

      {/* 3. PRODUCT DISPLAY: CURATED COMPOSITION OR ARCHIVAL LEDGER */}
      {sortedProducts.length === 0 ? (
        /* Empty / In Fabrication State */
        <div className="py-20 px-6 text-center space-y-6 border-2 border-dashed border-brand-text/40 bg-brand-surface/50 p-8 sm:p-14 shadow-[4px_4px_0px_#050505] max-w-2xl mx-auto my-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-accent text-white font-mono text-[10px] font-black uppercase tracking-widest border border-brand-text shadow-[2px_2px_0px_#050505]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>[ STATUS: IN FABRICATION // ATELIER PROTOCOL ACTIVE ]</span>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-brand-text">
              ALLOTMENTS IN FABRICATION
            </h3>
            <p className="font-mono text-xs uppercase text-brand-text/80 leading-relaxed max-w-md mx-auto">
              Artifacts for [{currentCategoryName ? ` ${currentCategoryName} ` : " THIS SELECTION "}] are currently being tailored under strict material mandates. They will be documented here upon release.
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
              className="px-6 py-3 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
            >
              EXPLORE ALL REGISTERED ARTIFACTS
            </button>
          </div>
        </div>
      ) : viewMode === "ledger" ? (
        /* ARCHIVAL REGISTRY LEDGER VIEW (Dense, Architectural, Technical Spec) */
        <div className="border-2 border-brand-text bg-brand-surface shadow-[6px_6px_0px_#050505] overflow-x-auto">
          <table className="w-full text-left font-mono border-collapse">
            <thead>
              <tr className="border-b-2 border-brand-text bg-brand-text text-brand-bg text-[9.5px] uppercase tracking-widest font-black">
                <th className="p-3.5">ID // ARTIFACT</th>
                <th className="p-3.5">SYMBOL / INSCRIPTION</th>
                <th className="p-3.5">MEDIUM</th>
                <th className="p-3.5">MATERIAL & STRUCTURE</th>
                <th className="p-3.5">ALLOTMENT</th>
                <th className="p-3.5">EDITION RUN</th>
                <th className="p-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brand-text text-xs">
              {sortedProducts.map((p, idx) => {
                const artifactNum = String(idx + 1).padStart(3, '0');
                const cat = categories.find(c => c.id === p.categoryId);
                const isComingSoon = Boolean(p.isComingSoon || p.comingSoon || p.status === "coming-soon");
                return (
                  <tr 
                    key={p.id}
                    onClick={() => {
                      soundManager.playClick(0.12);
                      onProductClick(p);
                    }}
                    className="hover:bg-brand-text/5 cursor-pointer transition-colors group"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-brand-accent text-[10px]">[artifact {artifactNum}]</span>
                        <div>
                          <div className="font-black uppercase tracking-tight text-brand-text group-hover:text-brand-accent transition-colors flex items-center gap-2">
                            <span>{p.name}</span>
                            {isComingSoon && (
                              <span className="text-[8px] font-black uppercase tracking-wider bg-brand-accent text-white px-1.5 py-0.5 border border-brand-text">
                                COMING SOON
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-brand-text/60 uppercase">
                            SKU: {p.productId || p.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-black text-brand-accent text-sm">
                        {p.inscription || "CONVICTION"}
                      </div>
                      <div className="text-[9px] text-brand-text/70 uppercase truncate max-w-[180px]">
                        {p.symbolicTagline || p.wearingCommunicates}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 border border-brand-text text-[9px] font-black uppercase bg-brand-bg">
                        {cat?.label || normalizeProductCategory(p).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-[10px] text-brand-text/80 uppercase">
                      {p.material || "ARCHIVAL COTTON"}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold ${isComingSoon ? "text-brand-accent" : p.inventory > 0 ? "text-brand-text/90" : "text-red-600"}`}>
                        {isComingSoon ? "COMING SOON" : p.inventory > 0 ? "AVAILABLE" : "ALLOTTED"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold uppercase text-[10px] text-brand-accent">
                      {p.edition?.replace(/SPECIMENS/gi, "ARTIFACTS") || "050 ARTIFACTS"}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 bg-brand-text text-brand-bg group-hover:bg-brand-accent group-hover:text-white border border-brand-text transition-all">
                        <span>{isComingSoon ? "PREVIEW" : "EXPLORE"}</span>
                        <ArrowUpRight size={10} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === "grid" ? (
        /* ARTIFACT CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {sortedProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryLabel={categories.find(c => c.id === product.categoryId)?.label || normalizeProductCategory(product).toUpperCase()}
              onClick={() => onProductClick(product)}
              index={idx}
            />
          ))}
        </div>
      ) : (
        /* 4. CURATED HORIZONTAL OVERLAPPING ARTIFACT COLLECTION */
        <ArtifactOverlappingCollection 
          products={sortedProducts} 
          categories={categories} 
          onProductClick={onProductClick} 
        />
      )}
    </section>
  );
}
