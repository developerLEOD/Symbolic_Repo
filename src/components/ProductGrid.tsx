import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, Category } from "../types";
import ProductCard from "./ProductCard";
import { Search } from "lucide-react";

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
            return id !== "garments" && name !== "garments" && label !== "garments";
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

  // Only show active/available products in customer storefront
  const activeProducts = products.filter(p => p.availability !== false);

  // Category filtering with complete taxonomy backward-compatibility
  const filteredByCategory = activeCategoryId 
    ? activeProducts.filter(p => {
        if (activeCategoryId === 'corpus') return p.categoryId === 'corpus' || p.categoryId === 'wear' || p.categoryId === 't-shirts';
        if (activeCategoryId === 'apparatus') return p.categoryId === 'apparatus' || p.categoryId === 'carry' || p.categoryId === 'caps';
        if (activeCategoryId === 'vessels') return p.categoryId === 'vessels' || p.categoryId === 'gather' || p.categoryId === 'mugs';
        return p.categoryId === activeCategoryId;
      })
    : activeProducts;

  const searchedProducts = filteredByCategory.filter(p => 
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

  const currentCategory = categories.find(c => c.id === activeCategoryId);
  const currentCategoryName = currentCategory ? (currentCategory.name || currentCategory.label) : (activeCategoryId ? activeCategoryId.toUpperCase() : "");
  const isCurrentCategoryEmpty = Boolean(activeCategoryId && filteredByCategory.length === 0);

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
              {activeCategoryId ? `${currentCategoryName.toUpperCase()} SPECIMENS` : "SERIES 01 // THE TRANSMISSION CORPUS"}
            </h2>
          </div>
          <div className="font-mono text-xs font-bold uppercase text-brand-text/70">
            {isCurrentCategoryEmpty
              ? "STATUS // COMING SOON"
              : `SHOWING ${sortedProducts.length} OF ${activeProducts.length} RECORDED SPECIMENS`
            }
          </div>
        </div>

        {/* Category Filters + Search & Sort Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-brand-text/20">
          {/* Taxonomy Structural Index: Joined Monolithic Rectangle */}
          {onCategoryChange && (() => {
            const allItems = [
              { id: null, label: "ALL OBJECTS", count: activeProducts.length, isAll: true },
              ...categories.map(cat => {
                const count = activeProducts.filter(p => {
                  if (cat.id === 'corpus') return p.categoryId === 'corpus' || p.categoryId === 'wear' || p.categoryId === 't-shirts';
                  if (cat.id === 'apparatus') return p.categoryId === 'apparatus' || p.categoryId === 'carry' || p.categoryId === 'caps';
                  if (cat.id === 'vessels') return p.categoryId === 'vessels' || p.categoryId === 'gather' || p.categoryId === 'mugs';
                  return p.categoryId === cat.id;
                }).length;
                return {
                  id: cat.id,
                  label: cat.label || cat.name,
                  count,
                  isAll: false
                };
              })
            ];

            // Assign structural grid spans and borders so the buttons join seamlessly into 1 perfect rectangle
            const getItemLayoutClasses = (index: number, total: number) => {
              if (total === 5) {
                switch (index) {
                  case 0: return "col-span-7 border-b-2 border-r-2 border-brand-text";
                  case 1: return "col-span-5 border-b-2 border-brand-text";
                  case 2: return "col-span-4 border-r-2 border-brand-text";
                  case 3: return "col-span-4 border-r-2 border-brand-text";
                  case 4: return "col-span-4";
                  default: return "col-span-4";
                }
              }
              if (total === 4) {
                switch (index) {
                  case 0: return "col-span-6 border-b-2 border-r-2 border-brand-text";
                  case 1: return "col-span-6 border-b-2 border-brand-text";
                  case 2: return "col-span-6 border-r-2 border-brand-text";
                  case 3: return "col-span-6";
                  default: return "col-span-6";
                }
              }
              if (total <= 3) {
                const span = Math.floor(12 / total);
                const isLast = index === total - 1;
                return `col-span-${span} ${!isLast ? "border-r-2 border-brand-text" : ""}`;
              }
              // Generic fallback for > 5 items (2 equal rows)
              const half = Math.ceil(total / 2);
              const isFirstRow = index < half;
              const rowItems = isFirstRow ? half : total - half;
              const colSpan = Math.floor(12 / rowItems);
              const isLastInRow = isFirstRow ? index === half - 1 : index === total - 1;
              return `col-span-${colSpan} ${isFirstRow ? "border-b-2 border-brand-text" : ""} ${!isLastInRow ? "border-r-2 border-brand-text" : ""}`;
            };

            return (
              <div className="w-full md:w-auto">
                <div className="grid grid-cols-12 md:inline-flex md:divide-x-2 md:divide-brand-text border-2 border-brand-text bg-brand-surface shadow-[3px_3px_0px_#050505] overflow-hidden select-none">
                  {allItems.map((item, idx) => {
                    const isSelected = activeCategoryId === item.id;
                    const cellLayout = getItemLayoutClasses(idx, allItems.length);

                    return (
                      <button
                        key={item.id ?? "all"}
                        onClick={() => onCategoryChange(item.id)}
                        className={`group relative py-2.5 px-2.5 sm:px-3.5 md:py-2 md:px-4 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap text-center md:border-none md:w-auto ${cellLayout} ${
                          isSelected
                            ? "bg-brand-text text-brand-bg"
                            : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                        }`}
                        title={item.label}
                      >
                        <span className="truncate">{item.label}</span>

                        {item.count > 0 ? (
                          <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 py-0.2 shrink-0 ${
                            isSelected ? "text-brand-bg/75" : "text-brand-text/50 group-hover:text-brand-text/80"
                          }`}>
                            [{item.count < 10 ? `0${item.count}` : item.count}]
                          </span>
                        ) : (
                          <span className={`text-[7px] sm:text-[8px] font-mono font-bold tracking-tight px-1 py-0.2 border shrink-0 uppercase ${
                            isSelected
                              ? "border-brand-bg/40 text-brand-bg bg-brand-bg/20"
                              : "border-brand-accent/60 text-brand-accent bg-brand-accent/10"
                          }`}>
                            <span className="hidden xs:inline">COMING </span>SOON
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Search & Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text/50" />
              <input 
                type="text"
                placeholder="SEARCH ARCHIVE..."
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
                <option value="featured">SERIES ORDER</option>
                <option value="price-asc">PRICE ↑</option>
                <option value="price-desc">PRICE ↓</option>
              </select>
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
              <span>[ STATUS: COMING SOON // IN PRODUCTION ]</span>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-brand-text">
                COMING SOON
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/80 leading-relaxed max-w-md mx-auto">
                Specimens for [{currentCategoryName ? ` ${currentCategoryName.toUpperCase()} ` : " THIS CATEGORY "}] are currently being crafted under strict material standards. New releases will be archived here shortly.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={() => { setSearchQuery(""); if (onCategoryChange) onCategoryChange(null); }} 
                className="px-6 py-3.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                ← VIEW ALL AVAILABLE OBJECTS
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 border-2 border-dashed border-brand-text/30 p-8 bg-brand-surface/20 max-w-xl mx-auto">
            <p className="font-mono font-bold uppercase text-base text-brand-text opacity-70">
              [ NO OBJECTS MATCHING SEARCH QUERY ]
            </p>
            <button 
              onClick={() => { setSearchQuery(""); if (onCategoryChange) onCategoryChange(null); }} 
              className="text-xs font-mono font-black uppercase tracking-widest text-brand-accent underline cursor-pointer"
            >
              RESET ALL FILTERS
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
        </div>
      )}
    </div>
  );
}


