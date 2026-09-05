import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 500 : 0;
  const total = subtotal + shipping;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[70]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-bg z-[80] shadow-2xl flex flex-col border-l border-brand-text/10"
          >
            <div className="p-6 sm:p-8 border-b-2 border-brand-text flex items-center justify-between bg-brand-surface">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-brand-accent inline-block" />
                <h2 className="text-xs sm:text-sm font-mono font-black tracking-widest uppercase text-brand-text">
                  REQUISITION LEDGER // CARGO
                </h2>
                <span className="text-[10px] font-mono font-black bg-brand-text text-brand-bg px-2 py-0.5 uppercase">
                  [ {items.length < 10 ? `0${items.length}` : items.length} ]
                </span>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 border-2 border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white transition-colors shadow-[2px_2px_0px_#050505] cursor-pointer"
                title="Dismiss Ledger"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed border-brand-text/30 p-8 bg-brand-surface/20">
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">[ LEDGER STATUS: VACANT ]</span>
                  <p className="text-brand-text opacity-70 font-mono font-bold uppercase text-xs sm:text-sm">
                    NO ARTIFACT ALLOTMENTS REGISTERED IN CURRENT SESSION
                  </p>
                  <LiquidCarveButton 
                    onClick={onClose}
                    variant="primary"
                    className="px-6 py-3.5 text-xs font-mono font-black"
                  >
                    INSPECT SPECIMEN CORPUS →
                  </LiquidCarveButton>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex gap-4 p-4 border-2 border-brand-text bg-brand-surface shadow-[3px_3px_0px_#050505]">
                    <div className="w-20 h-24 sm:w-24 sm:h-28 bg-brand-bg flex-shrink-0 border-2 border-brand-text overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[8.5px] font-mono font-black text-brand-accent uppercase tracking-widest">{item.categoryLabel}</p>
                            <h3 className="text-xs sm:text-sm font-mono font-black uppercase tracking-tight text-brand-text leading-tight">{item.name}</h3>
                          </div>
                          <button 
                            onClick={() => onRemove(item.id)} 
                            className="text-brand-text/40 hover:text-red-600 hover:scale-110 transition-all p-1"
                            title="Purge Item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {item.options && (
                          <p className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider font-bold mt-1">
                            {Object.entries(item.options as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' // ')}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-brand-text/15">
                        <div className="flex items-center border border-brand-text bg-brand-bg shadow-[1px_1px_0px_#050505]">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1.5 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center font-mono text-xs font-black">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1.5 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-xs font-mono font-black tracking-tight uppercase text-brand-text">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 sm:p-8 border-t-2 border-brand-text bg-brand-surface space-y-6">
                <div className="space-y-2.5 font-mono text-xs uppercase">
                  <div className="flex justify-between text-brand-text/70">
                    <span>SPECIMENS VALUATION</span>
                    <span className="font-bold text-brand-text">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-brand-text/70">
                    <span>SECURE TRANSIT DISPATCH</span>
                    <span className="font-bold text-brand-text">Rs. {shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-4 border-t-2 border-brand-text font-black text-brand-text">
                    <span>REQUISITION TOTAL</span>
                    <span className="text-base text-brand-accent">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>
                <LiquidCarveButton 
                  onClick={onCheckout}
                  variant="primary"
                  className="w-full py-4 text-xs font-mono font-black tracking-widest"
                >
                  COMMENCE CLEARANCE PROTOCOL →
                </LiquidCarveButton>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
