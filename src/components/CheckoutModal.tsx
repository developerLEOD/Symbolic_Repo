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
  Gift,
  Copy,
  ExternalLink,
  Clock,
  Smartphone
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
import { calculateFinancialValuation } from "../lib/financialValuation";
import { 
  buildWhatsAppOrderDirective, 
  getWhatsAppUrl, 
  openWhatsAppChat,
  OrderSnapshotData,
  STUDIO_WHATSAPP_DISPLAY,
  STUDIO_WHATSAPP_LOCAL_DISPLAY
} from "../lib/whatsappService";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onClearCart: () => void;
  onOpenAuth?: (mode?: "signin" | "signup", customNotice?: string) => void;
}

export default function CheckoutModal({ isOpen, onClose, items, onClearCart, onOpenAuth }: CheckoutModalProps) {
  const { user, userProfile, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<"details" | "shipping" | "payment" | "success">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [completedOrderSnapshot, setCompletedOrderSnapshot] = useState<OrderSnapshotData | null>(null);
  const [showDirectivePreview, setShowDirectivePreview] = useState(false);

  const handleGoogleSignInDirect = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign in failed:", err);
    }
  };

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
    paymentMethod: "whatsapp"
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
  } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sym_applied_referral_code");
      if (saved) {
        return {
          code: saved,
          discountAmount: 0,
          discountPercentage: 10,
          message: `Referral code linked (${saved})`
        };
      }
    }
    return null;
  });
  const [referralMessage, setReferralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic, single-source-of-truth financial valuation
  const valuation = calculateFinancialValuation({
    items,
    appliedReferral,
    referralSettings
  });

  const subtotal = valuation.subtotal;
  const discount = valuation.discountAmount;
  const shipping = valuation.shippingFee;
  const total = valuation.total;
  const isComplimentaryShipping = valuation.isComplimentaryShipping;

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
      if (savedCode) {
        setReferralCodeInput(savedCode);
        if (valuation.subtotal > 0) {
          validateReferralCode(savedCode, valuation.subtotal, user?.uid, user?.email, settings).then(res => {
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
  }, [isOpen, user?.uid, user?.email]);

  const handleApplyReferral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!referralCodeInput.trim()) return;

    setIsApplyingReferral(true);
    setReferralMessage(null);

    try {
      const result = await validateReferralCode(
        referralCodeInput,
        valuation.subtotal,
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
        if (typeof window !== "undefined") {
          localStorage.setItem("sym_applied_referral_code", result.referrerCode);
        }
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("sym_applied_referral_code");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getActiveOrderSnapshot = (overrideOrderNo?: string, explicitSnapshot?: OrderSnapshotData): OrderSnapshotData => {
    if (explicitSnapshot) {
      return explicitSnapshot;
    }

    if (completedOrderSnapshot) {
      return {
        ...completedOrderSnapshot,
        orderNumber: overrideOrderNo || completedOrderSnapshot.orderNumber || orderNumber
      };
    }

    return {
      orderNumber: overrideOrderNo || orderNumber || "SYM-ACQUISITION",
      items: items.length > 0 ? items : [],
      subtotal: valuation.subtotal,
      shipping: valuation.shippingFee,
      discount: valuation.discountAmount,
      total: valuation.total,
      totalSavings: valuation.totalSavings,
      isComplimentaryShipping: valuation.isComplimentaryShipping,
      referralCode: appliedReferral?.code || null,
      referralDiscountPercentage: valuation.referralDiscountPercentage,
      customerInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        houseNo: formData.houseNo,
        street: formData.street,
        suburb: formData.suburb,
        city: formData.city,
        zip: formData.zip,
        country: formData.country,
      }
    };
  };

  const generateWhatsAppMessage = (overrideOrderNo?: string, explicitSnapshot?: OrderSnapshotData) => {
    const snapshot = getActiveOrderSnapshot(overrideOrderNo, explicitSnapshot);
    return buildWhatsAppOrderDirective(snapshot);
  };

  const handleSendWhatsAppOrder = (overrideOrderNo?: string, explicitSnapshot?: OrderSnapshotData) => {
    const message = generateWhatsAppMessage(overrideOrderNo, explicitSnapshot);
    openWhatsAppChat(message);
  };

  const handleCopyDirective = (overrideOrderNo?: string, explicitSnapshot?: OrderSnapshotData) => {
    const message = generateWhatsAppMessage(overrideOrderNo, explicitSnapshot);
    navigator.clipboard.writeText(message);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsSubmitting(false);
      if (onOpenAuth) {
        onOpenAuth("signup", "REGISTRATION MANDATORY // Studio protocol mandates all custodians register before acquiring physical artifacts.");
      }
      return;
    }

    setIsSubmitting(true);

    const randomOrderNo = "SYM-" + Math.floor(100000 + Math.random() * 900000);
    
    // Capture full, immutable snapshot before anything is altered or cleared
    const orderSnapshot: OrderSnapshotData = {
      orderNumber: randomOrderNo,
      items: [...items],
      subtotal: valuation.subtotal,
      shipping: valuation.shippingFee,
      discount: valuation.discountAmount,
      total: valuation.total,
      totalSavings: valuation.totalSavings,
      isComplimentaryShipping: valuation.isComplimentaryShipping,
      referralCode: appliedReferral?.code || null,
      referralDiscountPercentage: valuation.referralDiscountPercentage,
      customerInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        houseNo: formData.houseNo,
        street: formData.street,
        suburb: formData.suburb,
        city: formData.city,
        zip: formData.zip,
        country: formData.country
      }
    };

    // Retain completed order snapshot in state immediately
    setCompletedOrderSnapshot(orderSnapshot);
    setOrderNumber(randomOrderNo);

    // Construct structured order data
    const orderData = {
      orderNumber: randomOrderNo,
      userId: user ? user.uid : null,
      items: [...items],
      subtotal: valuation.subtotal,
      shipping: valuation.shippingFee,
      discount: valuation.discountAmount,
      total: valuation.total,
      totalSavings: valuation.totalSavings,
      isComplimentaryShipping: valuation.isComplimentaryShipping,
      referralCode: appliedReferral ? appliedReferral.code : null,
      referrerUid: appliedReferral?.referrerUid || null,
      isReferrerReward: Boolean(appliedReferral?.isReferrerReward),
      status: "pending_wa_verification",
      paymentMethod: "whatsapp_interaction",
      createdAt: Date.now(),
      customerInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: `${formData.houseNo ? `${formData.houseNo}, ` : ''}${formData.street}, ${formData.suburb}`,
        city: formData.city,
        zip: formData.zip,
        country: formData.country
      }
    };

    try {
      // Save order to Firestore
      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Record referral redemption if code applied
      if (appliedReferral) {
        await recordReferralUsage({
          referrerUid: appliedReferral.referrerUid,
          referrerCode: appliedReferral.code,
          refereeEmail: formData.email,
          orderId: orderRef.id,
          orderTotal: valuation.total,
          discountApplied: valuation.discountAmount,
          isReferrerReward: appliedReferral.isReferrerReward
        });
      }

      // Cache order locally so customer can see it immediately regardless of Firestore quota status
      if (user?.uid) {
        try {
          const cacheKey = `sym_user_cached_orders_${user.uid}`;
          const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]");
          localStorage.setItem(cacheKey, JSON.stringify([{ id: orderRef.id, ...orderData }, ...existing]));
        } catch (_) {}
      }

      setStep("success");

      // Transmit complete order directive to WhatsApp with the captured snapshot
      handleSendWhatsAppOrder(randomOrderNo, orderSnapshot);

      // Clear the cart now that snapshot is safely secured
      onClearCart();
    } catch (err) {
      console.warn("Firestore order record note (proceeding smoothly with local dispatch):", err);
      // Even if Firestore encounters an issue, proceed smoothly so customer is not blocked
      if (user?.uid) {
        try {
          const cacheKey = `sym_user_cached_orders_${user.uid}`;
          const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]");
          localStorage.setItem(cacheKey, JSON.stringify([{ id: `local-${Date.now()}`, ...orderData }, ...existing]));
        } catch (_) {}
      }
      setStep("success");
      handleSendWhatsAppOrder(randomOrderNo, orderSnapshot);
      onClearCart();
    } finally {
      setIsSubmitting(false);
    }
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
          className="relative w-full max-w-3xl bg-brand-bg/95 backdrop-blur-md border border-brand-text/10 shadow-2xl z-[100] overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b-2 border-brand-text flex items-center justify-between bg-brand-surface/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-brand-accent" />
              <div>
                <h2 className="text-xs font-mono font-black uppercase tracking-[0.2em]">CUSTODY TRANSFER PROTOCOL</h2>
                <p className="text-[9px] font-mono text-brand-text/60 uppercase">FINALIZATION OF ARTIFACT POSSESSION</p>
              </div>
            </div>
            {step !== "success" && (
              <button 
                onClick={onClose} 
                className="p-2 border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#050505]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="p-8 sm:p-12">
            {step === "success" ? (
              /* ACQUISITION CERTIFICATE / ARCHIVE ENTRY */
              <div className="space-y-8 max-w-xl mx-auto">
                <div className="border-[2.5px] border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[8px_8px_0px_#ff4500] relative space-y-6">
                  {/* Corner Crosshairs */}
                  <span className="absolute -top-2 -left-2 font-mono text-[12px] font-black text-brand-text select-none">+</span>
                  <span className="absolute -top-2 -right-2 font-mono text-[12px] font-black text-brand-text select-none">+</span>
                  <span className="absolute -bottom-2 -left-2 font-mono text-[12px] font-black text-brand-text select-none">+</span>
                  <span className="absolute -bottom-2 -right-2 font-mono text-[12px] font-black text-brand-text select-none">+</span>

                  {/* Certificate Header */}
                  <div className="border-b-2 border-brand-text pb-4 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono font-black uppercase tracking-widest text-brand-accent">
                      <span>[ OFFICIAL ARCHIVAL DEED ]</span>
                      <span>STUDIO ARCHIVE // OFFICIAL REGISTRY</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight text-brand-text">
                      CERTIFICATE OF ARTIFACT POSSESSION
                    </h3>
                    <p className="text-[10px] font-mono uppercase text-brand-text/70">
                      ACQUISITION REGISTRY ENTRY NO. #{orderNumber}
                    </p>
                  </div>

                  {/* Possessor & Coordinates */}
                  {(() => {
                    const displayCustomer = completedOrderSnapshot?.customerInfo || formData;
                    const displayTotal = completedOrderSnapshot ? completedOrderSnapshot.total : total;
                    const currentWhatsAppMessage = generateWhatsAppMessage(orderNumber, completedOrderSnapshot || undefined);
                    const currentWhatsAppUrl = getWhatsAppUrl(currentWhatsAppMessage);

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono border-b border-brand-text/20 pb-4">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-brand-text/60 block">REGISTERED POSSESSOR:</span>
                            <p className="font-black uppercase text-brand-text">
                              {displayCustomer.firstName} {displayCustomer.lastName}
                            </p>
                            <p className="text-[10px] text-brand-text/75">{displayCustomer.email}</p>
                            <p className="text-[10px] text-brand-text/75">LINE: {displayCustomer.phone}</p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-brand-text/60 block">DISPATCH COORDINATES:</span>
                            <p className="text-[10px] font-bold uppercase leading-relaxed text-brand-text">
                              {displayCustomer.houseNo ? `${displayCustomer.houseNo}, ` : ''}{displayCustomer.street}<br />
                              {displayCustomer.suburb && `${displayCustomer.suburb}, `}{displayCustomer.city}<br />
                              {displayCustomer.country} {displayCustomer.zip ? `[POST: ${displayCustomer.zip}]` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Settlement Total & Protocol Status */}
                        <div className="flex items-center justify-between font-mono text-xs border-b border-brand-text/20 pb-4">
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-brand-text/60 block">SETTLEMENT METHOD</span>
                            <span className="font-black uppercase text-[#128C7E]">WHATSAPP CONCIERGE INTERACTION</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8.5px] uppercase font-bold text-brand-text/60 block">CUSTODY VALUATION</span>
                            <span className="font-black text-base text-brand-accent">Rs. {displayTotal.toLocaleString()} PKR</span>
                          </div>
                        </div>

                        {/* Status Banner */}
                        <div className="bg-[#25D366]/10 border-2 border-[#25D366] p-4 text-center space-y-1.5">
                          <div className="flex items-center justify-center gap-2 font-mono text-xs font-black uppercase text-[#128C7E]">
                            <MessageCircle size={15} className="shrink-0" />
                            <span>DIRECTIVE TRANSMITTED TO WHATSAPP ({STUDIO_WHATSAPP_DISPLAY})</span>
                          </div>
                          <p className="font-mono text-[9.5px] sm:text-[10.5px] uppercase text-brand-text/85 font-bold leading-relaxed">
                            Bank payments are currently on standby. Your order directive is dispatched directly to our WhatsApp concierge for customized payment instructions (Direct IBFT / Raast / Nayapay) and physical reservation clearance.
                          </p>
                        </div>

                        {/* Archival Authenticity Statement */}
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] font-mono uppercase text-brand-text/80 leading-relaxed">
                            "You have acquired an authentic artifact of conviction and steadfast identity. Our master artisans are now preparing your pieces under strict studio standards for physical custody transfer."
                          </p>
                          <div className="font-mono text-[8px] tracking-widest text-brand-text/40 uppercase font-bold pt-1">
                            ||||| | ||||| || |||||| | [SYMBOLIC CORPUS — VERIFIED ARCHIVAL ENTRY]
                          </div>
                        </div>

                        {/* Collapsible Directive Inspection */}
                        <div className="pt-2 border-t border-brand-text/10">
                          <button
                            type="button"
                            onClick={() => setShowDirectivePreview(!showDirectivePreview)}
                            className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-text/60 hover:text-brand-text flex items-center gap-1.5 transition-colors mx-auto"
                          >
                            <span>{showDirectivePreview ? "[-] HIDE TRANSMITTED INQUIRY DIRECTIVE" : "[+] PREVIEW TRANSMITTED INQUIRY DIRECTIVE"}</span>
                          </button>
                          {showDirectivePreview && (
                            <div className="mt-3 p-4 bg-brand-surface border-2 border-brand-text/30 font-mono text-[9.5px] leading-relaxed text-brand-text whitespace-pre-wrap select-all max-h-60 overflow-y-auto">
                              {currentWhatsAppMessage}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={getWhatsAppUrl(generateWhatsAppMessage(orderNumber, completedOrderSnapshot || undefined))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-[#25D366] text-white px-6 py-4 text-[10px] font-mono font-black uppercase tracking-[0.2em] hover:opacity-95 transition-all flex items-center justify-center gap-2 border-2 border-brand-text shadow-[4px_4px_0px_#050505] cursor-pointer text-center"
                  >
                    <MessageCircle size={15} /> OPEN WHATSAPP ({STUDIO_WHATSAPP_LOCAL_DISPLAY})
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyDirective(orderNumber, completedOrderSnapshot || undefined)}
                    className="w-full sm:w-auto bg-brand-surface text-brand-text px-6 py-4 text-[10px] font-mono font-black uppercase tracking-[0.2em] hover:bg-brand-text hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-brand-text shadow-[4px_4px_0px_#050505] cursor-pointer"
                  >
                    <Copy size={14} /> {isCopied ? "COPIED DIRECTIVE!" : "COPY DIRECTIVE"}
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      setStep("details");
                    }}
                    className="w-full sm:w-auto bg-brand-text text-white px-6 py-4 text-[10px] font-mono font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all border-2 border-brand-text shadow-[4px_4px_0px_#050505] cursor-pointer"
                  >
                    RETURN TO STUDIO
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteOrder} className="space-y-8">
                {/* Progress Steps */}
                <div className="flex items-center justify-between border-b-2 border-brand-text pb-5 font-mono">
                  <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${step === "details" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 border-2 border-current flex items-center justify-center text-[10px]">1</span>
                    POSSESSOR &amp; DESTINATION
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${step === "shipping" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 border-2 border-current flex items-center justify-center text-[10px]">2</span>
                    TRANSIT LOGISTICS
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${step === "payment" ? "text-brand-accent" : "text-brand-text opacity-40"}`}>
                    <span className="w-5 h-5 border-2 border-current flex items-center justify-center text-[10px]">3</span>
                    SETTLEMENT
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
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenAuth?.("signin")}
                            className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-brand-text bg-brand-surface border-2 border-brand-text px-2.5 py-1.5 shadow-[2px_2px_0px_#050505] hover:bg-brand-text hover:text-brand-bg transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                          >
                            <UserIcon size={12} className="text-brand-accent shrink-0" />
                            <span>[ HAVE AN ACCOUNT? SIGN IN ]</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAuth?.("signup", "REGISTRATION MANDATORY // Studio protocol mandates all custodians register before acquiring physical artifacts.")}
                            className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-white bg-brand-accent border-2 border-brand-text px-2.5 py-1.5 shadow-[2px_2px_0px_#050505] hover:bg-brand-text hover:text-brand-bg transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                          >
                            <ShieldCheck size={12} className="shrink-0" />
                            <span>[ REGISTER FIRST ]</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!user && (
                      <div className="p-4 sm:p-5 border-2 border-brand-text bg-amber-500/10 shadow-[4px_4px_0px_#050505] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-text/20 pb-2.5">
                          <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-brand-accent">
                            <ShieldCheck size={16} className="shrink-0" />
                            <span>ARCHIVAL DISCIPLINE // REGISTRATION MANDATORY</span>
                          </div>
                          <span className="self-start sm:self-auto text-[9px] font-mono font-black uppercase text-white bg-brand-accent px-2 py-0.5 border border-brand-text shadow-[1px_1px_0px_#050505]">
                            MUST BE REGISTERED FIRST
                          </span>
                        </div>
                        
                        <p className="text-[11px] font-mono text-brand-text/90 uppercase font-bold leading-relaxed">
                          In accordance with Symbolic studio protocol, physical artifact custody transfer requires an authenticated studio account. You must register your identity or sign in before dispatch logistics can be authorized.
                        </p>

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onOpenAuth?.("signup", "REGISTRATION MANDATORY // Studio protocol mandates all custodians register before acquiring physical artifacts.")}
                            className="px-4 py-2.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                          >
                            <UserIcon size={14} />
                            <span>INITIALIZE REGISTRATION (REQUIRED)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenAuth?.("signin")}
                            className="px-4 py-2.5 bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                          >
                            <span>SIGN IN TO IDENTITY</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGoogleSignInDirect}
                            className="px-4 py-2.5 bg-white text-black hover:bg-neutral-100 font-mono text-xs font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>CONTINUE WITH GOOGLE</span>
                          </button>
                        </div>
                      </div>
                    )}
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

                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-text/10">
                      {!user ? (
                        <div className="flex items-center gap-2 text-[11px] font-mono font-black uppercase text-brand-accent">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>MANDATORY: REGISTER OR SIGN IN TO CONTINUE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase text-emerald-700">
                          <Check size={14} className="shrink-0" />
                          <span>AUTHENTICATED POSSESSOR CONFIRMED</span>
                        </div>
                      )}

                      <LiquidCarveButton
                        type="button"
                        onClick={() => {
                          if (!user) {
                            if (onOpenAuth) {
                              onOpenAuth("signup", "REGISTRATION MANDATORY // Studio protocol mandates all custodians register before acquiring physical artifacts.");
                            }
                            return;
                          }
                          if (formData.email && formData.firstName && formData.houseNo && formData.street && formData.suburb && formData.city && formData.phone) {
                            setStep("shipping");
                          } else {
                            alert("Please fill in all required address, contact, and WhatsApp phone fields.");
                          }
                        }}
                        variant="primary"
                        className="w-full sm:w-auto py-3.5 text-xs"
                      >
                        {!user ? (
                          <>REGISTER / SIGN IN TO PROCEED <ArrowRight size={14} /></>
                        ) : (
                          <>Continue to Shipping <ArrowRight size={14} /></>
                        )}
                      </LiquidCarveButton>
                    </div>
                  </div>
                )}

                {step === "shipping" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono font-black uppercase text-base tracking-tight">Shipping Method</h3>
                      {valuation.isComplimentaryShipping && (
                        <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-300 uppercase tracking-widest">
                          COMPLIMENTARY THRESHOLD UNLOCKED
                        </span>
                      )}
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border-2 border-brand-accent bg-brand-surface cursor-pointer shadow-[2px_2px_0px_#050505]">
                        <div className="flex items-center gap-4">
                          <Truck size={20} className="text-brand-accent shrink-0" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">Curated Express Courier</p>
                            <p className="text-[10px] text-brand-text/70">
                              {valuation.isComplimentaryShipping 
                                ? "Complimentary archival dispatch unlocked (subtotal exceeds Rs. 15,000 PKR)."
                                : "Delivered within 2–4 business days with tamper-evident seal and carbon-neutral transit."}
                            </p>
                            {!valuation.isComplimentaryShipping && valuation.amountNeededForComplimentaryShipping > 0 && (
                              <p className="text-[9px] font-mono text-brand-accent font-bold mt-1">
                                Add Rs. {valuation.amountNeededForComplimentaryShipping.toLocaleString()} PKR more to unlock complimentary dispatch!
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-black ml-4 shrink-0">
                          {valuation.isComplimentaryShipping ? (
                            <span className="text-emerald-700 font-black">COMPLIMENTARY</span>
                          ) : (
                            "Rs. 500 PKR"
                          )}
                        </span>
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
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-mono font-black uppercase text-base tracking-tight">
                          SETTLEMENT PROTOCOL
                        </h3>
                        <span className="text-[9px] font-mono font-black text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30">
                          MANDATORY WA TRANSMISSION
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-brand-text/60 uppercase mt-0.5">
                        DIRECT CUSTODY CONFIRMATION VIA STUDIO LIAISON
                      </p>
                    </div>

                    {/* Standby Notice Banner */}
                    <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/40 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-900 font-mono text-xs font-black uppercase tracking-wider">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span>NOTICE // AUTOMATED BANK &amp; CARD CLEARING ON STANDBY</span>
                      </div>
                      <p className="text-[10px] font-mono text-amber-900/80 uppercase leading-relaxed font-bold">
                        Direct automated card/merchant gateways are temporarily set to standby. All order clearing (Direct IBFT, Meezan, Raast, Nayapay) and physical reservation are finalized through direct WhatsApp interactions (+92 334 2764183).
                      </p>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-3">
                      {/* Active WhatsApp Method */}
                      <div className="p-4 border-2 border-[#25D366] bg-[#25D366]/5 relative space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                              <MessageCircle size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-mono font-black uppercase tracking-tight text-brand-text">
                                WhatsApp Concierge &amp; Direct Transfer Protocol
                              </p>
                              <p className="text-[9px] font-mono text-brand-text/60 uppercase">
                                LINE: +92 334 2764183 // INSTANT RESPONSE
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono font-black uppercase text-[#128C7E] bg-[#25D366]/20 px-2 py-0.5 border border-[#25D366]/40">
                            [ ACTIVE &amp; MANDATORY ]
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-brand-text/80 space-y-1.5 border-t border-brand-text/10 pt-2.5">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#128C7E]">01.</span>
                            <span>Order details and dispatch coordinates are formatted into an Archival Directive.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#128C7E]">02.</span>
                            <span>WhatsApp opens automatically to transmit specifications directly to our studio team.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-[#128C7E]">03.</span>
                            <span>Studio coordinator provides verified IBFT / Raast / Nayapay settlement details.</span>
                          </div>
                        </div>
                      </div>

                      {/* Standby Card/Bank Option */}
                      <div className="p-4 border border-brand-text/20 bg-brand-surface/60 opacity-60 relative space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <CreditCard size={18} className="text-brand-text/40" />
                            <div>
                              <p className="text-xs font-mono font-bold uppercase tracking-tight text-brand-text/60">
                                Automated Electronic Bank / Card Clearing
                              </p>
                              <p className="text-[9px] font-mono text-brand-text/40 uppercase">
                                GATEWAYS: VISA / MASTERCARD / 1LINK
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono font-black uppercase text-brand-text/50 bg-brand-text/5 px-2 py-0.5 border border-brand-text/20">
                            [ ON STANDBY ]
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-brand-text/60 uppercase">
                          Automated direct card clearing is currently on standby. All transactions are directed to WhatsApp.
                        </p>
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
                                  validateReferralCode(code, valuation.subtotal, user.uid, user.email, referralSettings).then(res => {
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
                                      if (typeof window !== "undefined") {
                                        localStorage.setItem("sym_applied_referral_code", res.referrerCode);
                                      }
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
                            valuation.discountAmount > 0 
                              ? "bg-emerald-50 border-emerald-300" 
                              : "bg-amber-50 border-amber-300"
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 size={16} className={valuation.discountAmount > 0 ? "text-emerald-600 shrink-0" : "text-amber-600 shrink-0"} />
                              <div>
                                <div className={`text-xs font-mono font-black uppercase tracking-wider ${
                                  valuation.discountAmount > 0 ? "text-emerald-900" : "text-amber-900"
                                }`}>
                                  {appliedReferral.isReferrerReward
                                    ? `REWARD APPLIED: ${appliedReferral.code} (${appliedReferral.discountPercentage}% OFF)` 
                                    : `FRIEND PRIVILEGE APPLIED: ${appliedReferral.code} (${appliedReferral.discountPercentage}% OFF)`}
                                </div>
                                <div className={`text-[10px] font-sans ${
                                  valuation.discountAmount > 0 ? "text-emerald-700" : "text-amber-800"
                                }`}>
                                  {valuation.isReferralEligible
                                    ? (appliedReferral.message || `Privilege activated. -Rs. ${valuation.discountAmount.toLocaleString()} PKR discounted.`)
                                    : (valuation.referralIneligibleReason || appliedReferral.message)}
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
                        <span className="font-mono uppercase font-bold text-[10px]">Artifact Subtotal</span>
                        <span className="font-mono font-bold">Rs. {valuation.subtotal.toLocaleString()} PKR</span>
                      </div>

                      {valuation.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-brand-accent font-bold">
                          <span className="flex items-center gap-1 font-mono uppercase text-[10px]">
                            <Tag size={12} />
                            <span>{appliedReferral?.isReferrerReward ? "Affiliation Reward" : "Accreditation Privilege"} ({valuation.referralDiscountPercentage}%)</span>
                          </span>
                          <span className="font-mono font-black">-Rs. {valuation.discountAmount.toLocaleString()} PKR</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-brand-text/70">
                        <span className="font-mono uppercase font-bold text-[10px]">Atelier Dispatch &amp; Logistics</span>
                        <span className="font-mono font-bold">
                          {valuation.isComplimentaryShipping ? (
                            <span className="text-emerald-700 font-black">COMPLIMENTARY</span>
                          ) : (
                            `Rs. ${valuation.shippingFee.toLocaleString()} PKR`
                          )}
                        </span>
                      </div>

                      {valuation.totalSavings > 0 && (
                        <div className="flex justify-between text-xs text-emerald-800 bg-emerald-50/70 p-2 border border-emerald-200">
                          <span className="font-mono uppercase font-bold text-[10px]">Total Privileges Saved</span>
                          <span className="font-mono font-black">Rs. {valuation.totalSavings.toLocaleString()} PKR</span>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-brand-text/10 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono font-black uppercase tracking-tight">TOTAL VALUATION</p>
                          <p className="text-[9px] font-mono text-brand-text/60 uppercase">Inclusive of direct packaging and custody deed</p>
                        </div>
                        <span className="text-lg font-mono font-black uppercase text-brand-text">
                          Rs. {valuation.total.toLocaleString()} PKR
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setStep("shipping")}
                        className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-text/60 hover:text-brand-text cursor-pointer"
                      >
                        ← BACK TO LOGISTICS
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-[#25D366] text-white px-8 py-4 text-xs font-mono font-black uppercase tracking-[0.2em] hover:opacity-95 transition-all flex items-center justify-center gap-2 border-2 border-brand-text shadow-[4px_4px_0px_#050505] cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          "REGISTERING DIRECTIVE..."
                        ) : (
                          <>
                            <MessageCircle size={16} />
                            <span>CONFIRM ORDER &amp; TRANSMIT TO WHATSAPP</span>
                          </>
                        )}
                      </button>
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
