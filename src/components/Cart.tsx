import { useState, useEffect, useRef } from "react";
import { X, Minus, Plus, ArrowRight, Trash2, ArrowLeft, ShieldCheck, Truck, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CartItem, ProductVariant } from "../types";
import { soundManager } from "../lib/soundEffects";
import { STUDIO_FALLBACK_IMAGE } from "../lib/productService";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateItem?: (oldId: string, updatedItem: CartItem) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

// Standard atelier size ladder for wearable objects
const ATELIER_SIZES = ["S", "M", "L", "XL", "XXL"];

export default function Cart({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onUpdateItem,
  onRemove, 
  onCheckout 
}: CartProps) {
  // Cache of product variants fetched from Firestore
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, ProductVariant[]>>({});
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const cartContainerRef = useRef<HTMLDivElement>(null);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isComplimentaryShipping = subtotal >= 15000;
  const shipping = subtotal > 0 ? (isComplimentaryShipping ? 0 : 500) : 0;
  const total = subtotal + shipping;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch Firestore variants for products in cart if available
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const fetchVariantsForItems = async () => {
      const newMap = { ...productVariantsMap };
      let updated = false;

      for (const item of items) {
        if (!newMap[item.productId]) {
          try {
            const querySnapshot = await getDocs(collection(db, "products", item.productId, "variants"));
            const vars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductVariant));
            newMap[item.productId] = vars;
            updated = true;
          } catch (err) {
            console.warn("Could not fetch variants for item in cart:", item.productId, err);
            newMap[item.productId] = [];
            updated = true;
          }
        }
      }

      if (updated) {
        setProductVariantsMap(newMap);
      }
    };

    fetchVariantsForItems();
  }, [isOpen, items]);

  // Keyboard shortcut listener: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Derive monumental artifact number and identifier
  const getArtifactCode = (item: CartItem, index: number): string => {
    const raw = item.productId || item.id || "";
    const numMatch = raw.match(/\d+/);
    if (numMatch) {
      return `artifact ${String(parseInt(numMatch[0], 10)).padStart(3, "0")}`;
    }
    const upperName = item.name.toUpperCase();
    if (upperName.includes("ALIF") || upperName.includes("TSH-001")) return "artifact 001";
    if (upperName.includes("SUMUD FIELD") || upperName.includes("HOODIE")) return "artifact 004";
    if (upperName.includes("ADAB") || upperName.includes("VESSEL")) return "artifact 003";
    if (upperName.includes("PALESTINE") || upperName.includes("FALASTEEN")) return "artifact 002";
    if (upperName.includes("BASIRAH") || upperName.includes("CAP") || upperName.includes("HAT")) return "artifact 005";
    if (upperName.includes("AMANAH") || upperName.includes("TOTE") || upperName.includes("BAG")) return "artifact 006";
    return `artifact ${String(index + 1).padStart(3, "0")}`;
  };

  // Derive Arabic symbol or inscription if present
  const getArtifactSymbol = (item: CartItem): string | null => {
    const upper = (item.name + " " + (item.categoryLabel || "")).toUpperCase();
    if (upper.includes("ALIF")) return "# أَلِف";
    if (upper.includes("SUMUD") || upper.includes("PALESTINE") || upper.includes("FALASTEEN")) return "# صُمُود";
    if (upper.includes("ADAB")) return "# أَدَب";
    if (upper.includes("BASIRAH")) return "# بَصِيرَة";
    if (upper.includes("AMANAH")) return "# أَمَانَة";
    return null;
  };

  // Handle switching variant / size
  const handleSelectOption = (item: CartItem, optionName: string, optionValue: string) => {
    soundManager.playToggle(0.08);
    if (!onUpdateItem) return;

    const updatedOptions = { ...(item.options || {}), [optionName]: optionValue };
    
    // Check if there is a matching Firestore variant with custom pricing
    const availableVariants = productVariantsMap[item.productId] || [];
    const matchedVariant = availableVariants.find(v => {
      if (v.option1Name === optionName && v.option1Value === optionValue) return true;
      if (v.option2Name === optionName && v.option2Value === optionValue) return true;
      if (v.option3Name === optionName && v.option3Value === optionValue) return true;
      return false;
    });

    const newVariantId = matchedVariant ? matchedVariant.id : optionValue;
    const newCompositeId = `${item.productId}-${newVariantId}`;
    const newPrice = matchedVariant?.price ? matchedVariant.price : item.price;

    const updatedItem: CartItem = {
      ...item,
      id: newCompositeId,
      variantId: matchedVariant?.id || item.variantId,
      price: newPrice,
      options: updatedOptions
    };

    onUpdateItem(item.id, updatedItem);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Layer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              soundManager.playToggle(0.05);
              onClose();
            }}
            className="fixed inset-0 bg-neutral-950/75 backdrop-blur-sm z-[70]"
          />

          {/* Architectural Possessions Ledger Panel */}
          <motion.div 
            ref={cartContainerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-brand-bg z-[80] shadow-[0_0_50px_rgba(0,0,0,0.4)] flex flex-col border-l-2 border-brand-text text-brand-text font-mono selection:bg-brand-text selection:text-white"
          >
            
            {/* 1. HEADER: YOUR POSSESSIONS DOSSIER */}
            <header className="p-5 sm:p-6 border-b-2 border-brand-text bg-brand-surface shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-black uppercase tracking-widest bg-brand-accent text-white px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                      CUSTODY TRANSFER
                    </span>
                    <span className="text-[10px] font-mono font-bold text-brand-text/60 uppercase">
                      ATELIER ARCHIVE
                    </span>
                  </div>

                  {/* Main Header Title */}
                  <h1 className="text-2xl sm:text-3xl font-mono font-black tracking-tight uppercase text-brand-text leading-none flex items-center gap-3">
                    <span># YOUR POSSESSIONS</span>
                  </h1>

                  <div className="flex items-center gap-2 text-[10px] text-brand-text/75 uppercase font-black">
                    <span className="text-brand-accent">SELECTED ARTIFACTS</span>
                    <span className="opacity-30">/</span>
                    <span className="bg-brand-text text-brand-bg px-2 py-0.5 border border-brand-text">
                      [ {totalQuantity < 10 ? `0${totalQuantity}` : totalQuantity} {totalQuantity === 1 ? "ARTIFACT" : "ARTIFACTS"} ]
                    </span>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button 
                  type="button"
                  onClick={() => {
                    soundManager.playToggle(0.05);
                    onClose();
                  }} 
                  className="p-2 border-2 border-brand-text bg-brand-bg hover:bg-brand-text hover:text-brand-bg transition-colors shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  title="Dismiss Ledger"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* 2. SELECTED ARTIFACTS LIST (NO DISTRACTIONS, NO UPSELLS) */}
            <div className="flex-grow overflow-y-auto p-5 sm:p-6 space-y-6">
              {items.length === 0 ? (
                /* Empty Possessions State */
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed border-brand-text/30 p-8 sm:p-12 bg-brand-surface/30 my-auto">
                  <div className="space-y-3 max-w-sm">
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-3 py-1 border border-brand-accent/30 inline-block">
                      [ CUSTODY LEDGER: ZERO ARTIFACTS ]
                    </span>
                    <h2 className="text-xl font-mono font-black uppercase tracking-tight text-brand-text">
                      NO ARTIFACTS CURRENTLY SELECTED
                    </h2>
                    <p className="text-brand-text/75 font-mono text-xs uppercase leading-relaxed">
                      You have not yet registered physical instruments for custody transfer. Explore the collection to inspect artifacts carrying enduring conviction.
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.1);
                      onClose();
                      const catalog = document.getElementById("catalog-section");
                      if (catalog) {
                        catalog.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="px-6 py-3.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[4px_4px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>EXAMINE THE COLLECTION</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                /* Iterative Selected Artifact Dossiers */
                items.map((item, idx) => {
                  const artifactCode = getArtifactCode(item, idx);
                  const symbolInscription = getArtifactSymbol(item);
                  const isApparel = item.categoryLabel?.toUpperCase().includes("WEAR") || 
                    item.name.toUpperCase().includes("HOODIE") || 
                    item.name.toUpperCase().includes("TEE") || 
                    item.name.toUpperCase().includes("SHIRT");

                  const currentSize = item.options?.Size || item.options?.size || "M";
                  const availableVariants = productVariantsMap[item.productId] || [];
                  const variantSizes = availableVariants
                    .map(v => v.option1Value || v.option2Value || v.option3Value)
                    .filter(Boolean) as string[];

                  // Use fetched sizes if available, otherwise standard atelier ladder for apparel
                  const sizeOptions = variantSizes.length > 0 
                    ? Array.from(new Set(variantSizes)) 
                    : (isApparel ? ATELIER_SIZES : []);

                  const isConfirmingRemove = itemToRemove === item.id;

                  return (
                    <article 
                      key={item.id} 
                      className="border-[2.5px] border-brand-text bg-brand-surface shadow-[5px_5px_0px_#050505] p-4 sm:p-5 space-y-4 relative group"
                    >
                      {/* Corner Registration Crosshairs */}
                      <span className="absolute -top-1.5 -left-1.5 font-mono text-[10px] font-black text-brand-text select-none pointer-events-none">+</span>
                      <span className="absolute -top-1.5 -right-1.5 font-mono text-[10px] font-black text-brand-text select-none pointer-events-none">+</span>

                      {/* Header Line: Artifact Number & Category & Symbol */}
                      <div className="flex items-center justify-between gap-2 border-b-2 border-brand-text/20 pb-2 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="font-black bg-brand-text text-brand-bg px-2 py-0.5 border border-brand-text uppercase">
                            {artifactCode}
                          </span>
                          {symbolInscription && (
                            <span dir="rtl" className="font-serif font-black text-brand-accent text-xs">
                              {symbolInscription}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase font-bold text-brand-text/60">
                            {item.categoryLabel}
                          </span>

                          {/* Quick Release Action */}
                          <button 
                            type="button"
                            onClick={() => {
                              soundManager.playToggle(0.06);
                              setItemToRemove(isConfirmingRemove ? null : item.id);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase border transition-colors cursor-pointer ${
                              isConfirmingRemove
                                ? "bg-red-600 text-white border-red-800"
                                : "bg-brand-bg text-brand-text/60 hover:text-red-600 hover:border-red-600 border-brand-text/40"
                            }`}
                            title="Release Artifact from Custody"
                          >
                            {isConfirmingRemove ? "CANCEL" : "RELEASE"}
                          </button>
                        </div>
                      </div>

                      {/* Removal Confirmation Bar if active */}
                      <AnimatePresence>
                        {isConfirmingRemove && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 border-2 border-red-600 p-3 space-y-2 text-red-950 font-mono"
                          >
                            <div className="flex items-center justify-between text-[11px] font-black uppercase">
                              <span>CONFIRM RELEASE OF ARTIFACT?</span>
                              <Trash2 size={13} className="text-red-600" />
                            </div>
                            <p className="text-[9.5px] uppercase opacity-90 leading-tight">
                              This physical artifact will be de-registered from your possession ledger.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playClick(0.08);
                                  onRemove(item.id);
                                  setItemToRemove(null);
                                }}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase border border-red-800 shadow-[1px_1px_0px_#050505] cursor-pointer"
                              >
                                [ CONFIRM RELEASE ]
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToRemove(null)}
                                className="px-3 py-1.5 bg-white text-neutral-800 font-bold text-[10px] uppercase border border-neutral-400 cursor-pointer"
                              >
                                CANCEL
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Main Dossier Split: Image Plate + Specifications */}
                      <div className="grid grid-cols-12 gap-4 items-start">
                        
                        {/* Archival Documentation Image Plate */}
                        <div className="col-span-4 sm:col-span-3 aspect-[3/4] bg-brand-bg border-2 border-brand-text relative overflow-hidden group/img">
                          <img 
                            src={item.image || STUDIO_FALLBACK_IMAGE} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== STUDIO_FALLBACK_IMAGE) {
                                target.src = STUDIO_FALLBACK_IMAGE;
                              }
                            }}
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute bottom-1 right-1 text-[7.5px] font-black uppercase bg-brand-text text-brand-bg px-1 py-0.5 border border-brand-text pointer-events-none">
                            PLATE
                          </span>
                        </div>

                        {/* Object Specifications & Interactive Controls */}
                        <div className="col-span-8 sm:col-span-9 space-y-3">
                          
                          {/* Artifact Title */}
                          <div>
                            <h3 className="text-sm sm:text-base font-mono font-black uppercase tracking-tight text-brand-text leading-tight">
                              {item.name}
                            </h3>
                            <div className="font-mono text-[9.5px] text-brand-text/60 uppercase font-bold mt-0.5">
                              VALUATION: Rs. {item.price.toLocaleString()} PKR / UNIT
                            </div>
                          </div>

                          {/* Selected Configuration & Variant Switcher */}
                          <div className="space-y-1.5 pt-1 border-t border-brand-text/15">
                            <div className="flex items-center justify-between text-[9.5px] font-bold">
                              <span className="text-brand-text/60 uppercase">CONFIGURATION:</span>
                              <span className="text-brand-text font-black uppercase">
                                {Object.entries(item.options || {}).map(([k, v]) => `${k}: ${v}`).join(" // ") || "STANDARD SPECIFICATION"}
                              </span>
                            </div>

                            {/* Interactive Size / Variant Switcher (if wearable or variants exist) */}
                            {sizeOptions.length > 0 && (
                              <div className="pt-1">
                                <div className="text-[8.5px] uppercase font-bold text-brand-text/50 mb-1">
                                  SWITCH SIZE / FIT:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {sizeOptions.map((size) => {
                                    const isSelected = currentSize.toUpperCase() === size.toUpperCase();
                                    return (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={() => handleSelectOption(item, "Size", size)}
                                        className={`px-2 py-1 text-[9.5px] font-mono font-black uppercase border transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-brand-text text-brand-bg border-brand-text shadow-[2px_2px_0px_#050505]"
                                            : "bg-brand-bg text-brand-text/80 border-brand-text/40 hover:border-brand-text hover:bg-brand-surface"
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls & Line Settlement */}
                          <div className="flex items-center justify-between gap-3 pt-2 border-t-2 border-brand-text/20">
                            {/* Tactile Quantity Stepper */}
                            <div className="flex items-center border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]">
                              <button 
                                type="button"
                                onClick={() => {
                                  soundManager.playToggle(0.06);
                                  if (item.quantity === 1) {
                                    setItemToRemove(item.id);
                                  } else {
                                    onUpdateQuantity(item.id, -1);
                                  }
                                }}
                                className="p-1.5 sm:p-2 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                                title="Reduce Allotment"
                              >
                                <Minus size={11} />
                              </button>
                              
                              <span className="w-8 text-center font-mono text-xs font-black select-none">
                                {item.quantity}
                              </span>

                              <button 
                                type="button"
                                onClick={() => {
                                  soundManager.playToggle(0.06);
                                  onUpdateQuantity(item.id, 1);
                                }}
                                className="p-1.5 sm:p-2 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                                title="Increase Allotment"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            {/* Extended Line Total */}
                            <div className="text-right">
                              <span className="text-[8px] uppercase font-bold text-brand-text/50 block">
                                LINE VALUATION
                              </span>
                              <span className="text-sm sm:text-base font-mono font-black tracking-tight text-brand-text">
                                Rs. {(item.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          </div>

                        </div>

                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* 3. FINANCIAL SUMMARY & PROCEED TO POSSESSION */}
            {items.length > 0 && (
              <footer className="p-5 sm:p-6 border-t-2 border-brand-text bg-brand-surface shrink-0 space-y-4 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]">
                
                {/* Financial Ledger Calculation Matrix */}
                <div className="space-y-2 font-mono text-xs uppercase border-b-2 border-brand-text/20 pb-4">
                  <div className="flex justify-between items-center text-brand-text/75">
                    <span>ARTIFACTS VALUATION ({totalQuantity} {totalQuantity === 1 ? "ARTIFACT" : "ARTIFACTS"})</span>
                    <span className="font-bold text-brand-text">Rs. {subtotal.toLocaleString()} PKR</span>
                  </div>

                  <div className="flex justify-between items-center text-brand-text/75">
                    <span className="flex items-center gap-1.5">
                      <Truck size={12} className="text-brand-accent" />
                      <span>SECURE ARCHIVAL TRANSIT</span>
                    </span>
                    <span className="font-bold text-brand-text">
                      {isComplimentaryShipping ? (
                        <span className="text-brand-accent font-black">COMPLIMENTARY</span>
                      ) : (
                        `Rs. ${shipping.toLocaleString()} PKR`
                      )}
                    </span>
                  </div>

                  {/* Settlement Total (Prominent & Non-Negotiable Clarity) */}
                  <div className="flex justify-between items-baseline pt-2 border-t-2 border-brand-text font-black text-brand-text">
                    <span className="text-xs sm:text-sm uppercase tracking-wider">
                      TOTAL SETTLEMENT
                    </span>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl text-brand-accent tracking-tight">
                        Rs. {total.toLocaleString()}{" "}
                        <span className="text-xs font-bold text-brand-text/60">PKR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Assurance Notes */}
                <div className="text-[9px] text-brand-text/70 uppercase leading-tight font-bold flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-brand-accent shrink-0" />
                  <span>INCLUSIVE OF TAXES • DISPATCHED VIA TRACKED ARCHIVAL COURIER (2–4 DAYS)</span>
                </div>

                {/* Primary CTA: PROCEED TO POSSESSION */}
                <div className="space-y-2 pt-1">
                  <button 
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.18);
                      onCheckout();
                    }}
                    className="w-full py-4 px-6 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-brand-text shadow-[4px_4px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-3"
                  >
                    <span>PROCEED TO POSSESSION</span>
                    <ArrowRight size={16} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      soundManager.playToggle(0.06);
                      onClose();
                    }}
                    className="w-full py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-text/70 hover:text-brand-text cursor-pointer transition-colors text-center"
                  >
                    [ RETURN TO COLLECTION ]
                  </button>
                </div>

              </footer>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
