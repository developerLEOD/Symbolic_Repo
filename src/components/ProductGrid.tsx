import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { motion } from "motion/react";
import { db } from "../lib/firebase";
import { Product, Category } from "../types";
import ProductCard from "./ProductCard";
import { Search } from "lucide-react";
import { normalizeProductCategory, normalizeProductCollection, isProductLive } from "../lib/productService";

interface ProductGridProps {
  activeCategoryId: string | null;
  onCategoryChange?: (id: string | null) => void;
  onProductClick: (product: Product) => void;
  refreshKey?: number;
  onCategoriesLoaded?: (categories: Category[]) => void;
}

export default function ProductGrid({ activeCategoryId, onCategoryChange, onProductClick, refreshKey = 0, onCategoriesLoaded }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [selectedCollection, setSelectedCollection] = useState<"all" | "be-symbolic" | "be-palestine">("all");

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

        const prodsSnapshot = await getDocs(collection(db, "products"));
        const prods = prodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      } catch (err) {
        console.error("Data fetching failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Only show active/available products in customer storefront (exclude drafted or hidden products)
  const activeProducts = products.filter(isProductLive);

  // Derive active specimen type (Wear, Carry, Headwear, Vessels)
  const activeSpecimenType = (activeCategoryId === "be-palestine" || activeCategoryId === "palestine" || activeCategoryId === "be-symbolic")
    ? null
    : activeCategoryId;

  // Filter products by Ethos Collection and Specimen Type independently
  const filteredProducts = activeProducts.filter(p => {
    // 1. Ethos Collection filter
    if (selectedCollection === "be-palestine") {
      if (normalizeProductCollection(p) !== "Be Palestine") return false;
    } else if (selectedCollection === "be-symbolic") {
      if (normalizeProductCollection(p) !== "Be Symbolic") return false;
    }

    // 2. Specimen Type category filter
    if (activeSpecimenType) {
      if (normalizeProductCategory(p) !== activeSpecimenType.toLowerCase()) return false;
    }

    return true;
  });

  const searchedProducts = filteredProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.productId && p.productId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.material && p.material.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.inscription && p.inscription.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedProducts = [...searchedProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    return 0; // featured
  });

  // Canonical Specimen Types
  const specimenTypes: { id: string | null; label: string }[] = [
    { id: null, label: "ALL SPECIMENS" },
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

  const getCatalogTitle = () => {
    const colPrefix = selectedCollection === "be-palestine"
      ? "BE PALESTINE"
      : selectedCollection === "be-symbolic"
      ? "BE SYMBOLIC"
      : null;

    if (activeSpecimenType) {
      return colPrefix 
        ? `${colPrefix} // ${activeSpecimenType.toUpperCase()} SPECIMENS` 
        : `${activeSpecimenType.toUpperCase()} SPECIMENS`;
    }
    
    return colPrefix 
      ? `${colPrefix} // THE STEADFAST CORPUS` 
      : "SERIES 01 // THE TRANSMISSION CORPUS";
  };

  const isCurrentCategoryEmpty = Boolean(filteredProducts.length === 0);
  const currentCategoryName = activeSpecimenType ? activeSpecimenType.toUpperCase() : (selectedCollection !== "all" ? selectedCollection.toUpperCase() : "");

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24 space-y-12 bg-brand-bg">
        <div className="flex justify-between items-center border-b-2 border-brand-text pb-6">
          <div className="w-48 h-8 bg-brand-surface animate-pulse" />
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
    <div id="catalog-section" className="max-w-7xl mx-auto px-6 sm:px-10 py-20 space-y-12 bg-brand-bg">
      {/* Brutalist Catalogue Header & Controls */}
      <div className="space-y-6 border-b-2 border-brand-text pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 01 // ARTIFACT REGISTRY ]</span>
            <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1 text-brand-text">
              {getCatalogTitle()}
            </h2>
          </div>
          <div className="font-mono text-xs font-bold uppercase text-brand-text/70">
            {isCurrentCategoryEmpty
              ? "STATUS // ALLOTMENT IN FABRICATION"
              : `SHOWING ${sortedProducts.length} OF ${activeProducts.length} RECORDED SPECIMENS`
            }
          </div>
        </div>

        {/* Dual Taxonomy System: Specimen Types & Ethos Line Filters */}
        <div className="space-y-4 pt-4 border-t border-brand-text/20">
          {/* Level 1: Specimen Type Index (Wear, Carry, Headwear, Vessels) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent whitespace-nowrap">
                [ SPECIMEN TYPE ]
              </span>
            </div>

            {onCategoryChange && (
              <div className="w-full xl:w-auto">
                <div className="grid grid-cols-2 sm:grid-cols-5 xl:inline-flex border-2 border-brand-text bg-brand-surface shadow-[3px_3px_0px_#050505] overflow-hidden select-none divide-x-2 divide-y-2 sm:divide-y-0 divide-brand-text">
                  {specimenTypes.map((item) => {
                    const isSelected = activeSpecimenType === item.id;
                    const count = activeProducts.filter(p => {
                      if (selectedCollection === "be-palestine" && normalizeProductCollection(p) !== "Be Palestine") return false;
                      if (selectedCollection === "be-symbolic" && normalizeProductCollection(p) !== "Be Symbolic") return false;
                      if (item.id === null) return true;
                      return normalizeProductCategory(p) === item.id;
                    }).length;

                    return (
                      <motion.button
                        key={item.id ?? "all"}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => onCategoryChange(item.id)}
                        className={`group relative py-2.5 px-3 md:py-2 md:px-4 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-center ${
                          isSelected
                            ? "bg-brand-text text-brand-bg"
                            : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                        }`}
                        title={item.label}
                      >
                        <span className="truncate">{item.label}</span>
                        {count > 0 ? (
                          <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 py-0.2 shrink-0 ${
                            isSelected ? "text-brand-bg/75" : "text-brand-text/50 group-hover:text-brand-text/80"
                          }`}>
                            [{count < 10 ? `0${count}` : count}]
                          </span>
                        ) : (
                          <span className={`text-[7px] sm:text-[8px] font-mono font-bold tracking-tight px-1 py-0.2 border shrink-0 uppercase ${
                            isSelected
                              ? "border-brand-bg/40 text-brand-bg bg-brand-bg/20"
                              : "border-brand-accent/60 text-brand-accent bg-brand-accent/10"
                          }`}>
                            PENDING
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Level 2: Ethos Collection Line + Search & Sort Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-brand-text/10">
            {/* Ethos Collection Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-text/60 mr-1">
                ETHOS LINE //
              </span>
              <div className="inline-flex border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505] divide-x-2 divide-brand-text overflow-hidden">
                {ethosCollections.map(col => {
                  const isSelected = selectedCollection === col.id;
                  const count = activeProducts.filter(p => {
                    if (activeSpecimenType && normalizeProductCategory(p) !== activeSpecimenType.toLowerCase()) return false;
                    if (col.id === "all") return true;
                    if (col.id === "be-palestine") return normalizeProductCollection(p) === "Be Palestine";
                    if (col.id === "be-symbolic") return normalizeProductCollection(p) === "Be Symbolic";
                    return true;
                  }).length;

                  return (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollection(col.id)}
                      className={`px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-brand-text text-brand-bg"
                          : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                      }`}
                    >
                      <span>{col.label}</span>
                      <span className={`text-[8px] font-mono ${isSelected ? "text-brand-bg/70" : "text-brand-text/50"}`}>
                        [{count}]
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text/50" />
              <input 
                type="text"
                placeholder="SCAN REGISTRY // QUERY SPECIMEN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-brand-surface border-2 border-brand-text text-brand-text text-xs pl-10 pr-3 py-2 rounded-none focus:outline-none focus:bg-brand-bg w-full font-mono uppercase font-bold placeholder:text-brand-text/40 shadow-[2px_2px_0px_#050505]"
              />
            </div>

            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-[10px] font-bold uppercase opacity-60 hidden sm:inline">SORT:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-brand-surface border-2 border-brand-text text-brand-text text-xs px-3 py-2 rounded-none focus:outline-none font-mono font-bold cursor-pointer uppercase shadow-[2px_2px_0px_#050505]"
              >
                <option value="featured">CORPUS SEQUENCE</option>
                <option value="price-asc">VALUATION: ASCENDING ↑</option>
                <option value="price-desc">VALUATION: DESCENDING ↓</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Product Cards Grid */}
      {sortedProducts.length === 0 ? (
        isCurrentCategoryEmpty ? (
          <div className="py-20 px-6 text-center space-y-6 border-2 border-dashed border-brand-text/40 bg-brand-surface/50 p-8 sm:p-14 shadow-[4px_4px_0px_#050505] max-w-2xl mx-auto my-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-accent text-white font-mono text-[10px] font-black uppercase tracking-widest border border-brand-text shadow-[2px_2px_0px_#050505]">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>[ STATUS: FORGING // MATERIAL CRITERIA IN PROGRESS ]</span>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-brand-text">
                ALLOTMENT IN FABRICATION
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/80 leading-relaxed max-w-md mx-auto">
                Specimens for [{currentCategoryName ? ` ${currentCategoryName.toUpperCase()} ` : " THIS TAXONOMY "}] are currently being forged under strict monolithic material mandates. Ingested artifacts will be cataloged here shortly.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={() => { setSearchQuery(""); if (onCategoryChange) onCategoryChange(null); }} 
                className="px-6 py-3.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                ← INSPECT FULL SPECIMEN CORPUS
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 border-2 border-dashed border-brand-text/30 p-8 bg-brand-surface/20 max-w-xl mx-auto">
            <p className="font-mono font-bold uppercase text-base text-brand-text opacity-70">
              [ REGISTRY QUERY RETURNED NULL // ZERO MATCHING SPECIMENS ]
            </p>
            <button 
              onClick={() => { setSearchQuery(""); if (onCategoryChange) onCategoryChange(null); }} 
              className="text-xs font-mono font-black uppercase tracking-widest text-brand-accent underline cursor-pointer"
            >
              PURGE SEARCH &amp; RESET REGISTRY
            </button>
          </div>
        )
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {sortedProducts.map((product: Product) => {
            const cat = categories.find(c => c.id === product.categoryId);
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                categoryLabel={cat?.label || "OBJECT"} 
                onClick={() => onProductClick(product)}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}


