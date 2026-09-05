import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Truck, 
  CreditCard, 
  ShoppingBag, 
  MessageCircle, 
  User as UserIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  Gift
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, ReferralSettings } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";
import { useAuth } from "../lib/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  getReferralSettings, 
  subscribeReferralSettings,
  validateReferralCode, 
  recordReferralUsage,
  getFriendDiscountPercentage,
  isReferrerRewardUnlocked
} from "../lib/referralService";

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

  // Referral System States
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    discountAmount: number;
    discountPercentage: number;
    message: string;
    referrerUid?: string;
    referrerEmail?: string;
    isReferrerReward?: boolean;
  } | null>(null);
  const [referralMessage, setReferralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = (referralSettings?.isEnabled && appliedReferral) ? appliedReferral.discountAmount : 0;
  const shipping = subtotal > 0 ? 500 : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeReferralSettings((settings) => {
      setReferralSettings(settings);
      if (!settings.isEnabled) {
        setAppliedReferral(null);
        setReferralMessage(null);
        return;
      }

      const savedCode = localStorage.getItem("sym_applied_referral_code");
      if (savedCode && !referralCodeInput && !appliedReferral) {
        setReferralCodeInput(savedCode);
        if (subtotal > 0) {
          validateReferralCode(savedCode, subtotal, user?.uid, user?.email, settings).then(res => {
            if (res.valid) {
              setAppliedReferral({
                code: res.referrerCode,
                discountAmount: res.discountAmount,
                discountPercentage: res.discountPercentage,
                message: res.message,
                referrerUid: res.referrerUid,
                referrerEmail: res.referrerEmail,
                isReferrerReward: res.isReferrerReward
              });
            }
          }).catch(console.warn);
        }
      }
    });

    return () => unsubscribe();
  }, [isOpen, subtotal, user?.uid, user?.email]);

  const handleApplyReferral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!referralCodeInput.trim()) return;

    setIsApplyingReferral(true);
    setReferralMessage(null);

    try {
      const result = await validateReferralCode(
        referralCodeInput,
        subtotal,
        user?.uid,
        user?.email,
        referralSettings || undefined
      );

      if (result.valid) {
        setAppliedReferral({
          code: result.referrerCode,
          discountAmount: result.discountAmount,
          discountPercentage: result.discountPercentage,
          message: result.message,
          referrerUid: result.referrerUid,
          referrerEmail: result.referrerEmail,
          isReferrerReward: result.isReferrerReward
        });
        setReferralMessage({ type: "success", text: result.message });
      } else {
        setAppliedReferral(null);
        setReferralMessage({ type: "error", text: result.message });
      }
    } catch (err: any) {
      setAppliedReferral(null);
      setReferralMessage({ type: "error", text: err?.message || "Failed to validate referral code." });
    } finally {
      setIsApplyingReferral(false);
    }
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralCodeInput("");
    setReferralMessage(null);
  };

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
        discount,
        total,
        referralCode: appliedReferral ? appliedReferral.code : null,
        referrerUid: appliedReferral?.referrerUid || null,
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

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Record referral redemption if code applied
      if (appliedReferral) {
        await recordReferralUsage({
          referrerUid: appliedReferral.referrerUid,
          referrerCode: appliedReferral.code,
          refereeEmail: formData.email,
          orderId: orderRef.id,
          orderTotal: total,
          discountApplied: discount
        });
      }

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
    const discountText = discount > 0 
      ? `Referral Discount (${appliedReferral?.code}): -Rs. ${discount.toLocaleString()} (${appliedReferral?.discountPercentage}% off)\n` 
      : '';
    const message = `🛍️ *NEW ORDER - SYMBOLIC*\n\n*Customer Details:*\nName: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPhone / WhatsApp: ${formData.phone}\nAddress: House #${formData.houseNo}, ${formData.street}, ${formData.suburb}, ${formData.city} ${formData.zip ? `(Postal: ${formData.zip})` : ''}\n\n*Order Items:*\n${itemsList}\n\nSubtotal: Rs. ${subtotal.toLocaleString()}\n${discountText}Shipping: Rs. ${shipping.toLocaleString()}\n*Total: Rs. ${total.toLocaleString()}*\n\nPayment Method: ${formData.paymentMethod.toUpperCase()}`;

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

                    {/* Friend Referral & Referrer Reward Box (Only shown if referral program is active) */}
                    {referralSettings?.isEnabled && (
                      <div className="bg-brand-surface p-4 border border-brand-text/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-[#ff5500]" />
                            <span className="text-xs font-black uppercase tracking-wider">Referral Program</span>
                          </div>
                          <span className="text-[9px] font-mono font-black uppercase text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 border border-[#ff5500]/30">
                            REFERRERS EARN {referralSettings.referrerRewardPercentage}% OFF
                          </span>
                        </div>

                        {/* Logged in User Unlocked Reward Banner */}
                        {user && !appliedReferral && (() => {
                          const ordersCount = userProfile?.referralsCount ?? 0;
                          const visitsCount = userProfile?.referralVisitsCount ?? 0;
                          const unlockCheck = isReferrerRewardUnlocked(ordersCount, visitsCount, referralSettings);

                          if (!unlockCheck.unlocked) return null;

                          return (
                            <div className="p-3 bg-[#ff5500]/10 border-2 border-[#ff5500] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <Gift size={16} className="text-[#ff5500] shrink-0" />
                                <div>
                                  <div className="text-xs font-mono font-black uppercase text-[#ff5500]">
                                    REWARD UNLOCKED ({unlockCheck.reason === "orders" ? `${ordersCount} ORDERS MET` : `${visitsCount} VISITS MET`})!
                                  </div>
                                  <div className="text-[10px] text-brand-text/80">
                                    You met your referral milestone. Claim your {referralSettings.referrerRewardPercentage}% discount!
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const code = userProfile?.referralCode || "SYM-REWARD";
                                  setReferralCodeInput(code);
                                  validateReferralCode(code, subtotal, user.uid, user.email, referralSettings).then(res => {
                                    if (res.valid) {
                                      setAppliedReferral({
                                        code: res.referrerCode,
                                        discountAmount: res.discountAmount,
                                        discountPercentage: res.discountPercentage,
                                        message: res.message,
                                        referrerUid: res.referrerUid,
                                        referrerEmail: res.referrerEmail,
                                        isReferrerReward: true
                                      });
                                      setReferralMessage({ type: "success", text: res.message });
                                    }
                                  });
                                }}
                                className="px-3 py-1.5 bg-[#ff5500] text-white font-mono text-[10px] font-black uppercase tracking-wider hover:bg-neutral-900 transition-colors shadow-[2px_2px_0px_#050505] shrink-0 cursor-pointer"
                              >
                                CLAIM REWARD
                              </button>
                            </div>
                          );
                        })()}

                        {appliedReferral ? (
                          <div className={`p-3 border flex items-center justify-between ${
                            appliedReferral.discountAmount > 0 
                              ? "bg-emerald-50 border-emerald-300" 
                              : "bg-amber-50 border-amber-300"
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 size={16} className={appliedReferral.discountAmount > 0 ? "text-emerald-600 shrink-0" : "text-amber-600 shrink-0"} />
                              <div>
                                <div className={`text-xs font-mono font-black uppercase tracking-wider ${
                                  appliedReferral.discountAmount > 0 ? "text-emerald-900" : "text-amber-900"
                                }`}>
                                  {appliedReferral.isReferrerReward
                                    ? `REWARD APPLIED: ${appliedReferral.code} (${appliedReferral.discountPercentage}% OFF)` 
                                    : `FRIEND PRIVILEGE APPLIED: ${appliedReferral.code} (${appliedReferral.discountPercentage}% OFF)`}
                                </div>
                                <div className={`text-[10px] font-sans ${
                                  appliedReferral.discountAmount > 0 ? "text-emerald-700" : "text-amber-800"
                                }`}>
                                  {appliedReferral.message}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveReferral}
                              className="text-[10px] font-mono font-black uppercase text-red-600 hover:underline cursor-pointer ml-3 shrink-0"
                            >
                              REMOVE
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={referralCodeInput}
                                onChange={(e) => {
                                  setReferralCodeInput(e.target.value.toUpperCase());
                                  setReferralMessage(null);
                                }}
                                placeholder="Enter friend's code or your reward code"
                                className="flex-grow bg-white border border-brand-text/20 px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-accent shadow-[1px_1px_0px_#050505]"
                              />
                              <button
                                type="button"
                                onClick={handleApplyReferral}
                                disabled={isApplyingReferral || !referralCodeInput.trim()}
                                className="px-4 py-2 bg-brand-text text-brand-bg text-[10px] font-mono font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-[2px_2px_0px_#050505] whitespace-nowrap"
                              >
                                {isApplyingReferral ? "CHECKING..." : "APPLY CODE"}
                              </button>
                            </div>

                            {referralMessage && (
                              <div className={`p-2.5 text-[10px] flex items-center gap-2 ${
                                referralMessage.type === "success" 
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300" 
                                  : "bg-red-50 text-red-700 border border-red-300"
                              }`}>
                                {referralMessage.type === "success" ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
                                <span>{referralMessage.text}</span>
                              </div>
                            )}

                            <p className="text-[9px] text-brand-text/70 font-sans leading-relaxed">
                              Friends receive {getFriendDiscountPercentage(referralSettings)}% OFF immediately. Referrers unlock {referralSettings.referrerRewardPercentage}% OFF when they reach EITHER {referralSettings.minimumReferrals} friend orders OR {referralSettings.minimumVisits ?? 35} website visits!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Cost Breakdown */}
                    <div className="bg-brand-surface p-4 border border-brand-text/10 space-y-2.5">
                      <div className="flex justify-between text-xs text-brand-text/70">
                        <span>Cart Subtotal</span>
                        <span className="font-mono font-bold">Rs. {subtotal.toLocaleString()}</span>
                      </div>

                      {discount > 0 && (
                        <div className="flex justify-between text-xs text-brand-accent font-bold">
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            <span>{appliedReferral?.isReferrerReward ? "Referrer Reward" : "Friend Referral Discount"} ({appliedReferral?.discountPercentage}%)</span>
                          </span>
                          <span className="font-mono font-black">-Rs. {discount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-brand-text/70">
                        <span>Standard Secure Delivery</span>
                        <span className="font-mono font-bold">Rs. {shipping.toLocaleString()}</span>
                      </div>

                      <div className="pt-2.5 border-t border-brand-text/10 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold uppercase tracking-tight">Total Amount Due</p>
                          <p className="text-[10px] text-brand-text/60">Inclusive of all taxes, discounts, and shipping</p>
                        </div>
                        <span className="text-lg font-mono font-black uppercase text-brand-text">
                          Rs. {total.toLocaleString()}
                        </span>
                      </div>
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
