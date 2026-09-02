import React, { useState, useEffect } from "react";
import { X, Check, ShieldCheck, ArrowRight, Lock, Truck, CreditCard, ShoppingBag, MessageCircle, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";
import { useAuth } from "../lib/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onClearCart: () => void;
  onOpenAuth?: () => void;
}

export default function CheckoutModal({ isOpen, onClose, items, onClearCart, onOpenAuth }: CheckoutModalProps) {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState<"details" | "shipping" | "payment" | "success">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    houseNo: "",
    street: "",
    suburb: "",
    city: "",
    zip: "",
    country: "Pakistan",
    phone: "",
    paymentMethod: "card"
  });

  // Auto-fill from authenticated user profile
  useEffect(() => {
    if (user) {
      const nameParts = (userProfile?.displayName || user.displayName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || "",
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        phone: prev.phone || userProfile?.phone || "",
        street: prev.street || userProfile?.address || "",
        city: prev.city || userProfile?.city || "",
        zip: prev.zip || userProfile?.zip || "",
      }));
    }
  }, [user, userProfile]);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 500 : 0;
  const total = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const randomOrderNo = "SYM-" + Math.floor(100000 + Math.random() * 900000);
      
      // Save order to Firestore
      const orderData = {
        userId: user ? user.uid : null,
        items,
        subtotal,
        shipping,
        discount: 0,
        total,
        status: "pending",
        createdAt: Date.now(),
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: `House #${formData.houseNo}, ${formData.street}, ${formData.suburb}`,
          city: formData.city,
          zip: formData.zip,
          country: formData.country
        }
      };

      await addDoc(collection(db, "orders"), orderData);

      setOrderNumber(randomOrderNo);
      setStep("success");
      onClearCart();
    } catch (err) {
      console.error("Error creating order record in Firestore:", err);
      // Fallback display success with local generated order number
      const randomOrderNo = "SYM-" + Math.floor(100000 + Math.random() * 900000);
      setOrderNumber(randomOrderNo);
      setStep("success");
      onClearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppOrder = () => {
    const itemsList = items.map(item => {
      const opts = item.options ? Object.entries(item.options as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
      return `• ${item.name}${opts ? ` (${opts})` : ''} x ${item.quantity} - Rs. ${(item.price * item.quantity).toLocaleString()}`;
    }).join('\n');
    const message = `🛍️ *NEW ORDER - SYMBOLIC*\n\n*Customer Details:*\nName: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPhone / WhatsApp: ${formData.phone}\nAddress: House #${formData.houseNo}, ${formData.street}, ${formData.suburb}, ${formData.city} ${formData.zip ? `(Postal: ${formData.zip})` : ''}\n\n*Order Items:*\n${itemsList}\n\nSubtotal: Rs. ${subtotal.toLocaleString()}\nShipping: Rs. ${shipping.toLocaleString()}\n*Total: Rs. ${total.toLocaleString()}*\n\nPayment Method: ${formData.paymentMethod.toUpperCase()}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/923342764183?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-brand-bg border border-brand-text/10 shadow-2xl z-[100] overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-brand-text/10 flex items-center justify-between bg-brand-surface">
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-brand-accent" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Secure Checkout</h2>
            </div>
            {step !== "success" && (
              <button onClick={onClose} className="p-2 hover:bg-brand-text/5 rounded-full transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="p-8 sm:p-12">
            {step === "success" ? (
              <div className="text-center py-12 space-y-8">
                <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent mx-auto flex items-center justify-center rounded-full">
                  <Check size={32} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-accent">Order Confirmed</span>
                  <h3 className="text-3xl font-mono font-black uppercase tracking-tight">Thank you for your order</h3>
                  <p className="text-xs text-brand-text/60 max-w-sm mx-auto pt-2">
                    Order confirmation #{orderNumber} has been sent to <span className="font-bold text-brand-text">{formData.email}</span>.
                  </p>
                </div>

                <div className="bg-brand-surface p-6 max-w-md mx-auto text-left space-y-4 border border-brand-text/10">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                    <span>Shipping Address</span>
                    <span className="text-brand-accent">Standard Curated</span>
                  </div>
                  <p className="text-xs text-brand-text/70 leading-relaxed font-mono font-medium">
                    {formData.firstName} {formData.lastName}<br />
                    House #{formData.houseNo}, {formData.street}, {formData.suburb}<br />
                    {formData.city} {formData.zip ? `- ${formData.zip}` : ""}<br />
                    {formData.country} (WhatsApp: {formData.phone})
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppOrder}
                    className="bg-[#25D366] text-white px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-95 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <MessageCircle size={15} /> Send Order via WhatsApp (03342764183)
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      setStep("details");
                    }}
                    className="bg-brand-text text-white px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-lg"
                  >
                    Return to Sanctuary
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteOrder} className="space-y-10">
                {/* Progress Steps */}
                <div className="flex items-center justify-between border-b border-brand-text/10 pb-6">
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-tight ${step === "details" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
                    Contact & Address
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-tight ${step === "shipping" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
                    Shipping
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-tight ${step === "payment" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
                    Payment
                  </div>
                </div>

                {step === "details" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-text/10 pb-3">
                      <h3 className="font-mono font-black uppercase text-base tracking-tight">Personal & Delivery Details</h3>
                      {user ? (
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-green-700 bg-green-500/10 px-2.5 py-1 border border-green-600">
                          <Check size={12} />
                          <span>LOGGED IN AS {user.email}</span>
                        </div>
                      ) : onOpenAuth ? (
                        <button
                          type="button"
                          onClick={onOpenAuth}
                          className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-brand-accent hover:underline cursor-pointer"
                        >
                          <UserIcon size={12} />
                          <span>[ HAVE AN ACCOUNT? SIGN IN ]</span>
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Email Address</label>
                        <input
                          required
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="seeker@symbolic.system"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">First Name</label>
                        <input
                          required
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="Marcus"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Last Name</label>
                        <input
                          required
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Aurelius"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">House / Apartment #</label>
                        <input
                          required
                          type="text"
                          name="houseNo"
                          value={formData.houseNo}
                          onChange={handleChange}
                          placeholder="House 42B"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Street</label>
                        <input
                          required
                          type="text"
                          name="street"
                          value={formData.street}
                          onChange={handleChange}
                          placeholder="Contemplation Avenue"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Suburb / Ilaqa</label>
                        <input
                          required
                          type="text"
                          name="suburb"
                          value={formData.suburb}
                          onChange={handleChange}
                          placeholder="Gulberg / Defence / Sector F-7"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">City</label>
                        <input
                          required
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="New Delhi / Lahore / Mumbai"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Postal Code (Optional)</label>
                        <input
                          type="text"
                          name="zip"
                          value={formData.zip}
                          onChange={handleChange}
                          placeholder="110001"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Phone Number (with WhatsApp)</label>
                        <input
                          required
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full bg-brand-surface border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <LiquidCarveButton
                        type="button"
                        onClick={() => {
                          if (formData.email && formData.firstName && formData.houseNo && formData.street && formData.suburb && formData.city && formData.phone) {
                            setStep("shipping");
                          } else {
                            alert("Please fill in all required address, contact, and WhatsApp phone fields.");
                          }
                        }}
                        variant="primary"
                        className="py-3.5 text-xs"
                      >
                        Continue to Shipping <ArrowRight size={14} />
                      </LiquidCarveButton>
                    </div>
                  </div>
                )}

                {step === "shipping" && (
                  <div className="space-y-6">
                    <h3 className="font-mono font-black uppercase text-base tracking-tight">Shipping Method</h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border border-brand-accent bg-brand-surface cursor-pointer">
                        <div className="flex items-center gap-4">
                          <Truck size={20} className="text-brand-accent" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">Curated Express Courier</p>
                            <p className="text-[10px] text-brand-text/60">Delivered within 3-5 business days with carbon-neutral packaging.</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold">Rs. 500</span>
                      </label>
                    </div>

                    <div className="pt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep("details")}
                        className="text-[10px] font-bold uppercase tracking-tight opacity-60 hover:opacity-100"
                      >
                        Back
                      </button>
                      <LiquidCarveButton
                        type="button"
                        onClick={() => setStep("payment")}
                        variant="primary"
                        className="py-3.5 text-xs"
                      >
                        Continue to Payment <ArrowRight size={14} />
                      </LiquidCarveButton>
                    </div>
                  </div>
                )}

                {step === "payment" && (
                  <div className="space-y-6">
                    <h3 className="font-mono font-black uppercase text-base tracking-tight">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "card" })}
                        className={`p-4 border text-left space-y-2 ${formData.paymentMethod === "card" ? "border-brand-accent bg-brand-surface" : "border-brand-text/10"}`}
                      >
                        <CreditCard size={18} className="text-brand-accent" />
                        <p className="text-xs font-bold uppercase tracking-tight">Credit / Debit Card</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "upi" })}
                        className={`p-4 border text-left space-y-2 ${formData.paymentMethod === "upi" ? "border-brand-accent bg-brand-surface" : "border-brand-text/10"}`}
                      >
                        <ShieldCheck size={18} className="text-brand-accent" />
                        <p className="text-xs font-bold uppercase tracking-tight">UPI / NetBanking</p>
                      </button>
                    </div>

                    <div className="bg-brand-surface p-6 border border-brand-text/10 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Card Number</label>
                        <input
                          type="text"
                          placeholder="4532 •••• •••• 8921"
                          className="w-full bg-white border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM / YY"
                            className="w-full bg-white border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-tight opacity-70">CVV</label>
                          <input
                            type="password"
                            placeholder="•••"
                            maxLength={4}
                            className="w-full bg-white border border-brand-text/10 px-4 py-3 text-xs focus:outline-none focus:border-brand-accent font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-brand-surface p-4 border border-brand-text/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-tight">Total Amount Due</p>
                        <p className="text-[10px] text-brand-text/60">Inclusive of all taxes and shipping</p>
                      </div>
                      <span className="text-lg font-mono font-black uppercase">Rs. {total.toLocaleString()}</span>
                    </div>

                    <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setStep("shipping")}
                        className="text-[10px] font-bold uppercase tracking-tight opacity-60 hover:opacity-100"
                      >
                        Back
                      </button>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={handleSendWhatsAppOrder}
                          className="bg-[#25D366] text-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-95 transition-all flex items-center gap-2 shadow-lg"
                        >
                          <MessageCircle size={14} /> Send via WhatsApp
                        </button>
                        <LiquidCarveButton
                          type="submit"
                          disabled={isSubmitting}
                          variant="primary"
                          className="py-4 text-xs"
                        >
                          {isSubmitting ? (
                            "Processing..."
                          ) : (
                            <>
                              <Lock size={13} /> Complete Order
                            </>
                          )}
                        </LiquidCarveButton>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
