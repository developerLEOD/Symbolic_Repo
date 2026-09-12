import React, { useState } from "react";
import { ShoppingBag, Check, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";
import { normalizeProductCategory, normalizeProductCollection, isProductDraftOrHidden, resolveProductImages, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

interface FeaturedObjectProps {
  product: Product;
  onViewProduct: (product: Product) => void;
  onAddToCart: (item: CartItem) => void;
}

export default function FeaturedObject({ product, onViewProduct, onAddToCart }: FeaturedObjectProps) {
  // Guard: Never show drafted or hidden products as statement pieces
  if (!product || isProductDraftOrHidden(product)) {
    return null;
  }

  const images = resolveProductImages(product);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.06);
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick(0.06);
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const medium = normalizeProductCategory(product).toUpperCase();
  const collectionName = normalizeProductCollection(product);
  const collectionTag = collectionName.toUpperCase();

  const handleQuickAdd = () => {
    onAddToCart({
      id: `${product.id}-default`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: images[activeImageIndex] || images[0],
      categoryLabel: `${medium} // ${collectionTag}`
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="py-20 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 mb-10 gap-4">
        <div>
          <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 02 // FOCAL ARTIFACT ]</span>
          <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1 text-brand-text">
            THE ANCHOR ARTIFACT
          </h2>
        </div>
        <div className="font-mono text-xs uppercase font-bold text-brand-text/70">
          EDITION RUN // {product.edition?.replace(/SPECIMENS/gi, "ARTIFACTS") || "050 ARTIFACTS"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Product Visual Framing */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative">
            {/* Architectural Corner Registration Crosshairs */}
            <span className="absolute -top-2 -left-2 font-mono text-[12px] font-black text-brand-text select-none pointer-events-none z-20 leading-none group-hover:text-brand-accent transition-colors">+</span>
            <span className="absolute -top-2 -right-2 font-mono text-[12px] font-black text-brand-text select-none pointer-events-none z-20 leading-none group-hover:text-brand-accent transition-colors">+</span>
            <span className="absolute -bottom-2 -left-2 font-mono text-[12px] font-black text-brand-text select-none pointer-events-none z-20 leading-none group-hover:text-brand-accent transition-colors">+</span>
            <span className="absolute -bottom-2 -right-2 font-mono text-[12px] font-black text-brand-text select-none pointer-events-none z-20 leading-none group-hover:text-brand-accent transition-colors">+</span>

            <motion.div 
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 450, damping: 24 }}
              onClick={() => {
                soundManager.playClick(0.14);
                onViewProduct(product);
              }}
              onMouseEnter={() => soundManager.playHover(0.065)}
              className="group cursor-pointer aspect-[4/5] bg-brand-surface border-[2.5px] border-brand-text relative overflow-hidden shadow-[8px_8px_0px_#050505] hover:shadow-[12px_12px_0px_#050505] active:translate-x-1 active:translate-y-1 active:shadow-[3px_3px_0px_#050505] transition-all duration-150"
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImageIndex}
                  src={images[activeImageIndex] || images[0] || STUDIO_FALLBACK_IMAGE} 
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== STUDIO_FALLBACK_IMAGE) {
                      target.src = STUDIO_FALLBACK_IMAGE;
                    }
                  }}
                  initial={{ opacity: 0.7, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </AnimatePresence>

              {/* Blueprint Reticle Marker */}
              <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none select-none">
                <span className="font-mono text-[8px] font-black uppercase tracking-widest bg-brand-bg text-brand-text px-2 py-0.5 border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
                  ⌖ HERO // ELEVATION [0{activeImageIndex + 1}]
                </span>
              </div>

              <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1 items-start">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest bg-brand-text text-brand-bg px-2.5 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                  [ {medium} ]
                </span>
                <span className="font-mono text-[8px] font-black uppercase tracking-widest bg-brand-accent text-white px-2 py-0.5 border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
                  {collectionTag}
                </span>
              </div>

              {product.images.length > 1 && (
                <>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    onClick={handlePrevImage}
                    aria-label="Previous view"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    onClick={handleNextImage}
                    aria-label="Next view"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-colors cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </motion.button>
                </>
              )}

              <div className="absolute bottom-4 right-4 bg-brand-bg text-brand-text font-mono text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
                <FileText size={12} />
                <span>INSPECT ARTIFACT DETAILS →</span>
              </div>
            </motion.div>
          </div>

          {/* Perspective Selector Mini Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  onMouseEnter={() => soundManager.playHover(0.04)}
                  onClick={() => {
                    soundManager.playToggle(0.09);
                    setActiveImageIndex(idx);
                  }}
                  className={`w-14 h-16 border-2 relative cursor-pointer overflow-hidden ${
                    activeImageIndex === idx 
                      ? 'border-brand-accent shadow-[3px_3px_0px_#050505]' 
                      : 'border-brand-text opacity-70 hover:opacity-100 shadow-[1px_1px_0px_#050505]'
                  }`}
                >
                  <img 
                    src={img || STUDIO_FALLBACK_IMAGE} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== STUDIO_FALLBACK_IMAGE) {
                        target.src = STUDIO_FALLBACK_IMAGE;
                      }
                    }}
                    className="w-full h-full object-cover" 
                  />
                  <span className={`absolute bottom-0.5 right-0.5 font-mono text-[7px] font-black px-0.5 leading-none ${
                    activeImageIndex === idx ? 'bg-brand-accent text-white' : 'bg-brand-text text-brand-bg'
                  }`}>
                    0{idx + 1}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Product Metadata & Specifications */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-text bg-brand-surface px-2 py-0.5 border border-brand-text">
                  [ {medium} ]
                </span>
                <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">
                  {collectionTag} // SERIES 01
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-brand-text/50">|</span>
              <span className="font-mono text-xs font-bold text-brand-text/70 uppercase">
                AVAILABLE: {product.inventory} UNITS
              </span>
            </div>
            <h3 className="text-4xl sm:text-5xl font-mono font-black uppercase tracking-tight text-brand-text">
              {product.name}
            </h3>
            <div className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-3 py-1 border border-brand-accent/30 inline-block">
              EDITION: {product.edition?.replace(/SPECIMENS/gi, "ARTIFACTS") || "050 ARTIFACTS // FIRST RUN"}
            </div>
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
              <span className="font-black text-brand-text">{product.edition?.replace(/SPECIMENS/gi, "ARTIFACTS") || "050 PIECES"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <LiquidCarveButton 
              onClick={() => {
                soundManager.playClick(0.12);
                onViewProduct(product);
              }}
              variant="primary"
              className="flex-1 py-4 text-xs font-mono font-black"
            >
              <span>EXAMINE ARTIFACT DOSSIER →</span>
            </LiquidCarveButton>
            <LiquidCarveButton 
              onClick={handleQuickAdd}
              variant="secondary"
              className="flex-1 py-4 text-xs font-mono font-black"
            >
              {added ? (
                <>
                  <Check size={16} className="text-brand-accent" />
                  <span>REGISTERED FOR CUSTODY</span>
                </>
              ) : (
                <span>TAKE POSSESSION →</span>
              )}
            </LiquidCarveButton>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
