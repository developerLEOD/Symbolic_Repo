import { useState, useEffect } from "react";
import { X, Minus, Plus, Truck, RotateCcw, Edit3, Trash2, Sliders, ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, ProductVariant, CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";

interface ProductDetailProps {
  product: Product;
  categoryLabel: string;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onEditProduct?: (productId: string) => void;
  onDeleteProduct?: (productId: string, productName: string) => Promise<void> | void;
}

export default function ProductDetail({ 
  product, 
  categoryLabel, 
  onClose, 
  onAddToCart,
  onEditProduct,
  onDeleteProduct
}: ProductDetailProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchVariants = async () => {
      const querySnapshot = await getDocs(collection(db, "products", product.id, "variants"));
      const vars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductVariant));
      setVariants(vars);
      
      if (vars.length > 0) {
        const initialOptions: { [key: string]: string } = {};
        if (vars[0].option1Name) initialOptions[vars[0].option1Name] = vars[0].option1Value!;
        if (vars[0].option2Name) initialOptions[vars[0].option2Name] = vars[0].option2Value!;
        if (vars[0].option3Name) initialOptions[vars[0].option3Name] = vars[0].option3Value!;
        setSelectedOptions(initialOptions);
      }
    };
    fetchVariants();
    window.scrollTo(0, 0);
  }, [product]);

  const handlePrevImage = () => {
    setActiveImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [product.images.length]);

  const selectedVariant = variants.find(v => {
    const vOptions: { [key: string]: string } = {};
    if (v.option1Name) vOptions[v.option1Name] = v.option1Value!;
    if (v.option2Name) vOptions[v.option2Name] = v.option2Value!;
    if (v.option3Name) vOptions[v.option3Name] = v.option3Value!;
    
    return JSON.stringify(vOptions) === JSON.stringify(selectedOptions);
  });

  const handleOptionSelect = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const getOptionValues = (name: string): string[] => {
    const values = new Set<string>();
    variants.forEach(v => {
      if (v.option1Name === name) values.add(v.option1Value as string);
      if (v.option2Name === name) values.add(v.option2Value as string);
      if (v.option3Name === name) values.add(v.option3Value as string);
    });
    return Array.from(values);
  };

  const optionNames = Array.from(new Set(variants.flatMap(v => [v.option1Name, v.option2Name, v.option3Name].filter(Boolean) as string[])));

  const handleAddToBag = () => {
    onAddToCart({
      id: `${product.id}-${selectedVariant?.id || 'default'}`,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      quantity: quantity,
      image: product.images[activeImageIndex],
      categoryLabel: categoryLabel,
      options: selectedOptions
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const displayId = product.productId || product.sku;
  const editionLabel = product.edition || "050 UNITS";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-brand-bg overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        {/* Back & Close Top Bar */}
        <div className="flex items-center justify-between border-b-2 border-brand-text pb-4 mb-8">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-brand-text hover:text-brand-accent transition-colors cursor-pointer border-2 border-brand-text px-3 py-1.5 bg-brand-surface shadow-[2px_2px_0px_#050505]"
          >
            <ArrowLeft size={14} /> [ RETURN TO OBJECTS ]
          </button>
          
          <div className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">
            OBJECT_VIEW // {displayId}
          </div>

          <button 
            onClick={onClose}
            className="p-2 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#050505]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Images Section */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-[4/5] bg-brand-surface border-2 border-brand-text shadow-[8px_8px_0px_#050505] overflow-hidden relative group">
              <img 
                src={product.images[activeImageIndex]} 
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-200"
              />
              
              {/* Category Tag */}
              <div className="absolute top-4 left-4 z-10">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-accent text-white px-2.5 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                  {(product.categoryId || categoryLabel).toUpperCase()}
                </span>
              </div>

              {/* Angle / View Counter */}
              {product.images.length > 1 && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest bg-brand-bg text-brand-text px-2.5 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                    ANGLE // [ {activeImageIndex + 1} / {product.images.length} ]
                  </span>
                </div>
              )}

              {/* Arrow Navigation Controls */}
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-brand-surface/95 hover:bg-brand-text hover:text-white text-brand-text border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Bottom Angle Indicator Bar */}
              {product.images.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                  <div className="flex gap-1.5 pointer-events-auto bg-brand-surface/90 border border-brand-text px-2 py-1 shadow-[2px_2px_0px_#050505]">
                    {product.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`h-1.5 transition-all cursor-pointer ${
                          activeImageIndex === idx 
                            ? 'w-6 bg-brand-accent' 
                            : 'w-2.5 bg-brand-text/30 hover:bg-brand-text/60'
                        }`}
                        title={`Perspective ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest bg-brand-text text-brand-bg px-2 py-0.5">
                    USE ARROW KEYS [← →]
                  </span>
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-square border-2 transition-all cursor-pointer relative group/thumb ${
                      activeImageIndex === idx 
                        ? 'border-brand-accent shadow-[3px_3px_0px_#050505] scale-[1.02]' 
                        : 'border-brand-text opacity-70 hover:opacity-100 hover:border-brand-text'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 font-mono text-[8px] font-black bg-brand-text text-brand-bg px-1 leading-none">
                      0{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Specs Section */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            {/* Owner Quick Actions Bar */}
            {(onEditProduct || onDeleteProduct) && (
              <div className="p-3 bg-brand-surface border-2 border-brand-text flex items-center justify-between shadow-[3px_3px_0px_#050505]">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-black tracking-widest text-brand-accent">
                  <Sliders size={13} />
                  <span>STUDIO CONTROL</span>
                </div>
                <div className="flex items-center gap-2">
                  {onEditProduct && (
                    <button
                      type="button"
                      onClick={() => onEditProduct(product.id)}
                      className="px-3 py-1 bg-brand-text text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-neutral-800 flex items-center gap-1.5 transition-colors border border-brand-text cursor-pointer"
                    >
                      <Edit3 size={11} /> EDIT
                    </button>
                  )}
                  {onDeleteProduct && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="px-3 py-1 bg-red-600 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-red-700 flex items-center gap-1.5 transition-colors border border-brand-text cursor-pointer"
                    >
                      <Trash2 size={11} /> DELETE
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 border-b-2 border-brand-text pb-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">
                  {(product.categoryId || categoryLabel).toUpperCase()} // SERIES 01
                </span>
                <span className="font-mono text-xs font-bold uppercase text-brand-text/70">
                  AVAILABLE STOCK: {product.inventory} PIECES
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-mono font-black tracking-tight uppercase text-brand-text">
                {product.name}
              </h1>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-mono font-black text-brand-text">
                  Rs. {(selectedVariant?.price || product.price).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/85 leading-relaxed border-l-2 border-brand-text pl-4">
                {product.description}
              </p>

              {/* Identity & Statement Card */}
              {(product.wearingCommunicates || product.statementMeaning) && (
                <div className="p-4 bg-brand-surface border-2 border-brand-text space-y-2 shadow-[3px_3px_0px_#050505]">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                    [ WHAT THIS COMMUNICATES ]
                  </span>
                  {product.wearingCommunicates && (
                    <p className="font-mono text-xs font-bold uppercase text-brand-text">
                      {product.wearingCommunicates}
                    </p>
                  )}
                  {product.statementMeaning && (
                    <p className="font-mono text-[11px] uppercase text-brand-text/70">
                      {product.statementMeaning}
                    </p>
                  )}
                </div>
              )}

              {/* Variants Selector */}
              {optionNames.length > 0 && (
                <div className="space-y-4 pt-2">
                  {optionNames.map((name: string) => (
                    <div key={name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                          SELECT {name}:
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase text-brand-text/70">
                          {selectedOptions[name]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getOptionValues(name).map((value: string) => (
                          <button
                            key={value}
                            onClick={() => handleOptionSelect(name, value)}
                            className={`px-4 py-2 font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer ${
                              selectedOptions[name] === value 
                                ? 'border-brand-text bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]' 
                                : 'border-brand-text bg-brand-surface text-brand-text hover:bg-brand-bg'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Technical Spec Table */}
              <div className="bg-brand-surface border-2 border-brand-text p-5 shadow-[4px_4px_0px_#050505] space-y-2.5 font-mono text-xs">
                <div className="flex justify-between border-b border-brand-text/15 pb-2">
                  <span className="opacity-60">IDENTIFIER:</span>
                  <span className="font-black">{displayId}</span>
                </div>
                {product.inscription && (
                  <div className="flex justify-between border-b border-brand-text/15 pb-2">
                    <span className="opacity-60">PRIMARY SYMBOL:</span>
                    <span className="font-black text-brand-accent">{product.inscription}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex justify-between border-b border-brand-text/15 pb-2">
                    <span className="opacity-60">MATERIAL COMPOSITION:</span>
                    <span className="font-black">{product.material}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between border-b border-brand-text/15 pb-2">
                    <span className="opacity-60">WEIGHT / DENSITY:</span>
                    <span className="font-black">{product.weight}</span>
                  </div>
                )}
                {product.fit && (
                  <div className="flex justify-between border-b border-brand-text/15 pb-2">
                    <span className="opacity-60">BLOCK / CUT:</span>
                    <span className="font-black">{product.fit}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-brand-text/15 pb-2">
                  <span className="opacity-60">BRAND PLACEMENT:</span>
                  <span className="font-black text-brand-text">INTERIOR LABEL (WEARER FIRST)</span>
                </div>
                <div className="flex justify-between border-b border-brand-text/15 pb-2">
                  <span className="opacity-60">BATCH RUN:</span>
                  <span className="font-black text-brand-accent">{editionLabel}</span>
                </div>
                {product.careInstructions && (
                  <div className="flex flex-col pt-1">
                    <span className="opacity-60 text-[10px]">MAINTENANCE & CARE:</span>
                    <span className="font-bold text-[11px] mt-0.5">{product.careInstructions}</span>
                  </div>
                )}
              </div>

              {/* Quantity and Actions */}
              <div className="space-y-4 pt-4 border-t-2 border-brand-text">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-black uppercase text-brand-accent">QTY:</span>
                  <div className="flex items-center border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505]">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2.5 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-mono text-xs font-black">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2.5 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LiquidCarveButton 
                    onClick={handleAddToBag}
                    variant="primary"
                    className="py-4 text-xs font-mono font-black"
                  >
                    {added ? (
                      <>
                        <Check size={16} className="text-brand-accent" />
                        <span>ADDED TO BAG</span>
                      </>
                    ) : (
                      <span>ADD TO BAG →</span>
                    )}
                  </LiquidCarveButton>
                  <LiquidCarveButton 
                    onClick={() => {
                      handleAddToBag();
                      onClose();
                    }}
                    variant="secondary"
                    className="py-4 text-xs font-mono font-black"
                  >
                    <span>BUY NOW →</span>
                  </LiquidCarveButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Custom In-App Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-surface border-2 border-brand-text p-6 md:p-8 max-w-md w-full shadow-[8px_8px_0px_#050505] space-y-6 text-brand-text">
            <div className="space-y-3">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-red-600">
                [ REMOVE ARTIFACT ]
              </span>
              <h3 className="font-mono text-xl font-black uppercase tracking-tight">CONFIRM DELETION</h3>
              <p className="font-mono text-xs uppercase text-brand-text/80 leading-relaxed">
                Permanently purge <strong>"{product.name}"</strong> from system records?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-brand-text">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 font-mono text-xs font-black uppercase border-2 border-brand-text bg-brand-bg hover:bg-brand-mute transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (onDeleteProduct) {
                    setIsDeleting(true);
                    try {
                      await onDeleteProduct(product.id, product.name);
                    } finally {
                      setIsDeleting(false);
                      setShowDeleteModal(false);
                    }
                  }
                }}
                className="px-5 py-2 font-mono text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-brand-text cursor-pointer transition-colors shadow-[2px_2px_0px_#050505]"
              >
                {isDeleting ? "PURGING..." : "CONFIRM PURGE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

