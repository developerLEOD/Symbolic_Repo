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
            <div className="p-8 border-b border-brand-text/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold tracking-tight uppercase">Shopping Bag</h2>
                <span className="text-[10px] font-bold text-brand-accent uppercase tracking-tight">({items.length})</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-brand-text/5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-10">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                  <p className="text-brand-text opacity-50 font-mono font-bold uppercase text-base">[ YOUR BAG IS EMPTY ]</p>
                  <LiquidCarveButton 
                    onClick={onClose}
                    variant="primary"
                    className="px-6 py-3 text-xs"
                  >
                    Explore the Collection
                  </LiquidCarveButton>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex gap-8">
                    <div className="w-24 h-32 bg-brand-surface flex-shrink-0 border border-brand-text/5">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-brand-accent uppercase tracking-tight">{item.categoryLabel}</p>
                          <h3 className="text-base font-mono font-black uppercase tracking-tight">{item.name}</h3>
                          {item.options && (
                            <p className="text-[10px] text-brand-text opacity-50 uppercase tracking-tight font-bold">
                              {Object.entries(item.options as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                            </p>
                          )}
                        </div>
                        <button onClick={() => onRemove(item.id)} className="text-brand-text opacity-20 hover:opacity-100 transition-opacity">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <div className="flex items-center border border-brand-text/10 bg-white/50">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-2 hover:bg-brand-text/5"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-2 hover:bg-brand-text/5"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-xs font-bold tracking-tight uppercase opacity-70">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 border-t border-brand-text/10 bg-brand-surface space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="opacity-40">Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="opacity-40">Shipping</span>
                    <span>Rs. {shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base pt-6 border-t border-brand-text/10 font-mono font-bold">
                    <span className="uppercase">Total Due</span>
                    <span className="font-mono font-black tracking-tight uppercase">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>
                <LiquidCarveButton 
                  onClick={onCheckout}
                  variant="primary"
                  className="w-full py-4 text-xs"
                >
                  Proceed to Checkout
                </LiquidCarveButton>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
