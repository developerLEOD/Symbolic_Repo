import React, { useState } from "react";
import { ShoppingBag, Check, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Product, CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";

interface FeaturedObjectProps {
  product: Product;
  onViewProduct: (product: Product) => void;
  onAddToCart: (item: CartItem) => void;
}

export default function FeaturedObject({ product, onViewProduct, onAddToCart }: FeaturedObjectProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleQuickAdd = () => {
    onAddToCart({
      id: `${product.id}-default`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.thumbnailImage || product.images[activeImageIndex] || product.images[0],
      categoryLabel: (product.categoryId || "CORPUS").toUpperCase()
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <section className="py-20 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 mb-10 gap-4">
        <div>
          <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 02 // FEATURED PIECE ]</span>
          <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1 text-brand-text">
            STATEMENT PIECE
          </h2>
        </div>
        <div className="font-mono text-xs uppercase font-bold text-brand-text/70">
          BATCH RUN // {product.edition || "050 PIECES"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Product Visual Framing */}
        <div className="lg:col-span-6">
          <div 
            onClick={() => onViewProduct(product)}
            className="group cursor-pointer aspect-[4/5] bg-brand-surface border-2 border-brand-text relative overflow-hidden shadow-[8px_8px_0px_#050505] transition-all"
          >
            <img 
              src={product.images[activeImageIndex] || product.images[0]} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4 z-10">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-accent text-white px-3 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                {product.productId || "SYM-001"}
              </span>
            </div>

            {product.images.length > 1 && (
              <>
                <div className="absolute top-4 right-4 z-10">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-bg text-brand-text px-2.5 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                    [ {activeImageIndex + 1} / {product.images.length} ]
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous view"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-all cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next view"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-all cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            <div className="absolute bottom-4 right-4 bg-brand-bg text-brand-text font-mono text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
              <FileText size={12} />
              <span>VIEW OBJECT DETAILS →</span>
            </div>
          </div>
        </div>

        {/* Product Metadata & Specifications */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">
                {product.categoryId.toUpperCase()} // SERIES 01
              </span>
              <span className="font-mono text-xs font-bold text-brand-text/50">|</span>
              <span className="font-mono text-xs font-bold text-brand-text/70 uppercase">
                AVAILABLE: {product.inventory} UNITS
              </span>
            </div>
            <h3 className="text-4xl sm:text-5xl font-mono font-black uppercase tracking-tight text-brand-text">
              {product.name}
            </h3>
            <p className="text-2xl font-mono font-black text-brand-text">
              Rs. {product.price.toLocaleString()}
            </p>
          </div>

          <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/80 leading-relaxed border-l-2 border-brand-text pl-4">
            {product.description}
          </p>

          {/* Statement & Specification Grid */}
          <div className="bg-brand-surface border-2 border-brand-text p-5 shadow-[4px_4px_0px_#050505] font-mono text-xs space-y-2.5">
            <div className="flex justify-between border-b border-brand-text/15 pb-2">
              <span className="opacity-60">PRIMARY SYMBOL:</span>
              <span className="font-black text-brand-accent">{product.inscription || "THE ALIF / CONVICTION"}</span>
            </div>
            <div className="flex justify-between border-b border-brand-text/15 pb-2">
              <span className="opacity-60">WHAT IT COMMUNICATES:</span>
              <span className="font-black text-right max-w-[240px] truncate">{product.wearingCommunicates || "UNWAVERING INTEGRITY"}</span>
            </div>
            <div className="flex justify-between border-b border-brand-text/15 pb-2">
              <span className="opacity-60">MATERIAL STRUCTURE:</span>
              <span className="font-black">{product.material || "100% COMBED ORGANIC COTTON"}</span>
            </div>
            <div className="flex justify-between border-b border-brand-text/15 pb-2">
              <span className="opacity-60">WEIGHT DENSITY:</span>
              <span className="font-black">{product.weight || "400 GSM"}</span>
            </div>
            <div className="flex justify-between border-b border-brand-text/15 pb-2">
              <span className="opacity-60">BRAND HIERARCHY:</span>
              <span className="font-black text-brand-text">INTERNAL LABEL (WEARER FIRST)</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">BATCH SPECIFICATION:</span>
              <span className="font-black text-brand-text">{product.edition || "050 PIECES"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <LiquidCarveButton 
              onClick={() => onViewProduct(product)}
              variant="primary"
              className="flex-1 py-4 text-xs font-mono font-black"
            >
              <span>VIEW FULL SPEC →</span>
            </LiquidCarveButton>
            <LiquidCarveButton 
              onClick={handleQuickAdd}
              variant="secondary"
              className="flex-1 py-4 text-xs font-mono font-black"
            >
              {added ? (
                <>
                  <Check size={16} className="text-brand-accent" />
                  <span>ADDED TO BAG</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  <span>ADD TO BAG →</span>
                </>
              )}
            </LiquidCarveButton>
          </div>
        </div>
      </div>
    </section>
  );
}
