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
        const cats = catsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
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
              {activeCategoryId ? `${activeCategoryId.toUpperCase()} SPECIMENS` : "SERIES 01 // THE TRANSMISSION CORPUS"}
            </h2>
          </div>
          <div className="font-mono text-xs font-bold uppercase text-brand-text/70">
            SHOWING {sortedProducts.length} OF {activeProducts.length} RECORDED SPECIMENS
          </div>
        </div>

        {/* Category Filters + Search & Sort Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-brand-text/20">
          {/* Taxonomy Pills */}
          {onCategoryChange && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange(null)}
                className={`px-4 py-2 font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer ${
                  activeCategoryId === null 
                    ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-mute"
                }`}
              >
                ALL OBJECTS
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`px-4 py-2 font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer ${
                    activeCategoryId === cat.id 
                      ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]" 
                      : "bg-brand-surface text-brand-text hover:bg-brand-mute"
                  }`}
                >
                  {cat.label || cat.name}
                </button>
              ))}
            </div>
          )}

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
        <div className="py-20 text-center space-y-4 border-2 border-dashed border-brand-text/30 p-8">
          <p className="font-mono font-bold uppercase text-base text-brand-text opacity-70">
            [ NO OBJECTS MATCHING SYSTEM QUERY ]
          </p>
          <button 
            onClick={() => { setSearchQuery(""); if (onCategoryChange) onCategoryChange(null); }} 
            className="text-xs font-mono font-black uppercase tracking-widest text-brand-accent underline cursor-pointer"
          >
            RESET ALL FILTERS
          </button>
        </div>
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


