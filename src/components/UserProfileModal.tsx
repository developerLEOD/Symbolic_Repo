import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Package, 
  MapPin, 
  LogOut, 
  Check, 
  AlertCircle, 
  ShoppingBag, 
  Clock, 
  Sliders, 
  Users, 
  Copy, 
  CheckCheck, 
  Tag, 
  Gift, 
  Link as LinkIcon, 
  ExternalLink, 
  Globe 
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Order, ReferralSettings } from "../types";
import { 
  subscribeReferralSettings,
  getFriendDiscountPercentage, 
  isReferrerRewardUnlocked,
  DEFAULT_REFERRAL_SETTINGS
} from "../lib/referralService";
import LiquidCarveButton from "./LiquidCarveButton";
import { soundManager } from "../lib/soundEffects";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOwnerManager?: () => void;
  initialTab?: "profile" | "orders" | "referral";
}

/**
 * Safely parse any timestamp representation (number, Firestore Timestamp, ISO string, etc.)
 */
function parseTimestampToMs(val: unknown): number {
  if (!val) return Date.now();
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "object" && val !== null) {
    const anyVal = val as Record<string, unknown>;
    if (typeof anyVal.toMillis === "function") {
      try {
        const ms = (anyVal.toMillis as () => number)();
        if (typeof ms === "number" && !isNaN(ms)) return ms;
      } catch {}
    }
    if (typeof anyVal.toDate === "function") {
      try {
        const d = (anyVal.toDate as () => Date)();
        if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
      } catch {}
    }
    if (typeof anyVal.seconds === "number" && !isNaN(anyVal.seconds)) {
      const nanos = typeof anyVal.nanoseconds === "number" ? anyVal.nanoseconds : 0;
      return anyVal.seconds * 1000 + Math.floor(nanos / 1000000);
    }
  }
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Formats order date safely without ever throwing RangeError
 */
function formatDateSafe(val: unknown): string {
  try {
    const ms = parseTimestampToMs(val);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "RECENT";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "RECENT";
  }
}

/**
 * Defensive normalizer to sanitize Firestore order documents against any missing fields
 */
function normalizeOrder(raw: any, idFallback: string = ""): Order {
  const safeItems = Array.isArray(raw?.items)
    ? raw.items.map((item: any, idx: number) => ({
        id: String(item?.id || `item-${idx}`),
        productId: String(item?.productId || ""),
        variantId: item?.variantId ? String(item.variantId) : undefined,
        specimenId: item?.specimenId ? String(item.specimenId) : undefined,
        artifactId: item?.artifactId ? String(item.artifactId) : undefined,
        name: String(item?.name || "SPECIMEN ARTIFACT"),
        price: typeof item?.price === "number" && !isNaN(item.price) ? item.price : 0,
        quantity: typeof item?.quantity === "number" && !isNaN(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        image: item?.image || item?.thumbnail || "",
        options: item?.options && typeof item.options === "object" ? item.options : undefined
      }))
    : [];

  const rawTotal = typeof raw?.total === "number" && !isNaN(raw.total) ? raw.total : null;
  const computedTotal = rawTotal !== null
    ? rawTotal
    : safeItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);

  const createdAt = parseTimestampToMs(raw?.createdAt);

  return {
    id: String(raw?.id || idFallback || `ORD-${Date.now()}`),
    userId: raw?.userId ? String(raw.userId) : undefined,
    items: safeItems,
    subtotal: typeof raw?.subtotal === "number" && !isNaN(raw.subtotal) ? raw.subtotal : computedTotal,
    shipping: typeof raw?.shipping === "number" && !isNaN(raw.shipping) ? raw.shipping : 0,
    discount: typeof raw?.discount === "number" && !isNaN(raw.discount) ? raw.discount : 0,
    total: computedTotal,
    status: (raw?.status as any) || "processing",
    createdAt,
    customerInfo: {
      firstName: String(raw?.customerInfo?.firstName || raw?.firstName || "CUSTODIAN"),
      lastName: String(raw?.customerInfo?.lastName || raw?.lastName || ""),
      email: String(raw?.customerInfo?.email || raw?.email || ""),
      phone: raw?.customerInfo?.phone || raw?.phone || "",
      address: String(raw?.customerInfo?.address || raw?.address || ""),
      city: String(raw?.customerInfo?.city || raw?.city || "STANDARD"),
      zip: String(raw?.customerInfo?.zip || raw?.zip || ""),
      country: String(raw?.customerInfo?.country || raw?.country || "DOMESTIC")
    }
  };
}

export default function UserProfileModal({ isOpen, onClose, onOpenOwnerManager, initialTab }: UserProfileModalProps) {
  const { user, userProfile, isOwner, signOutUser, updateUserProfileData, isQuotaExceeded, quotaUpgradeUrl } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "referral">(initialTab || "orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(DEFAULT_REFERRAL_SETTINGS);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Profile edit state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeReferralSettings((settings) => {
      if (settings) {
        setReferralSettings(settings);
        if (!settings.isEnabled && activeTab === "referral") {
          setActiveTab("orders");
        }
      }
    });
    return () => unsubscribe();
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || "");
      setPhone(userProfile.phone || "");
      setAddress(userProfile.address || "");
      setCity(userProfile.city || "");
      setZip(userProfile.zip || "");
      if (userProfile.referralCode && typeof window !== "undefined") {
        try {
          localStorage.setItem("sym_user_referral_code", userProfile.referralCode);
        } catch {
          // ignore
        }
      }
    }
  }, [userProfile, user]);

  // Load User Orders safely
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;

    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const ordersRef = collection(db, "orders");
        let rawOrders: any[] = [];

        // Primary Query: Fetch orders associated with the user's UID
        try {
          if (user.uid) {
            const q1 = query(ordersRef, where("userId", "==", user.uid));
            const snap1 = await getDocs(q1);
            rawOrders = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
        } catch (err1) {
          console.warn("Could not query orders by userId:", err1);
        }

        // Secondary Query: If user has an email and no orders by UID were found, check by customer email
        if (rawOrders.length === 0 && user.email) {
          try {
            const q2 = query(ordersRef, where("customerInfo.email", "==", user.email));
            const snap2 = await getDocs(q2);
            rawOrders = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (err2) {
            console.warn("Could not query orders by email:", err2);
          }
        }

        // Check local cache if network/quota prevented query or returned empty
        const cacheKey = `sym_user_cached_orders_${user.uid}`;
        if (rawOrders.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(rawOrders));
          } catch (_) {}
        } else if (typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) rawOrders = parsed;
            }
          } catch (_) {}
        }

        // Defensively normalize every single order to prevent any render-time exceptions
        const safeOrders = rawOrders.map((raw, idx) => normalizeOrder(raw, `ord-${idx}`));

        // Sort by createdAt descending
        safeOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (isMounted) {
          setOrders(safeOrders);
        }
      } catch (err) {
        console.warn("User orders load fallback:", err);
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveError(null);
    try {
      await updateUserProfileData({
        displayName,
        phone,
        address,
        city,
        zip
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile information.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        soundManager.playClick(0.08);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOutUser();
    onClose();
  };

  if (!isOpen || !user) return null;

  const rawIdentity = userProfile?.displayName || user.displayName || user.email || "CUSTODIAN";
  const initialLetter = (String(rawIdentity).charAt(0) || "U").toUpperCase();

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[140] overflow-y-auto p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => {
          soundManager.playClick(0.08);
          onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-brand-bg border-2 border-brand-text shadow-[8px_8px_0px_#050505] p-5 sm:p-7 max-h-[min(90vh,820px)] flex flex-col my-auto overflow-hidden"
        >
          {/* Header Bar */}
          <div className="shrink-0 flex items-center justify-between border-b-2 border-brand-text pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-text text-brand-bg flex items-center justify-center font-mono font-black text-base border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                {initialLetter}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-sm font-black uppercase text-brand-text">
                    {userProfile?.displayName || user.displayName || "SYMBOLIC MEMBER"}
                  </h3>
                  <span className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 border border-brand-text ${
                    userProfile?.role === "admin" ? "bg-amber-500 text-black font-black" : "bg-brand-accent text-white"
                  }`}>
                    {userProfile?.role === "admin" ? "OWNER // ADMIN" : "VERIFIED MEMBER"}
                  </span>
                </div>
                <p className="font-mono text-xs text-brand-text/60">{user.email || "VERIFIED STATION"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOwner && onOpenOwnerManager && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.08);
                    onClose();
                    onOpenOwnerManager();
                  }}
                  className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-brand-surface border-2 border-brand-text text-brand-text hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px]"
                  title="Open Studio Manager"
                >
                  <Sliders size={12} className="text-brand-accent" />
                  <span>STUDIO</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-brand-surface border-2 border-brand-text text-brand-text hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                title="Sign out of account"
              >
                <LogOut size={12} />
                <span>SIGN OUT</span>
              </button>
              <button 
                type="button"
                onClick={() => {
                  soundManager.playClick(0.1);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-brand-text hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer font-mono text-[10px] font-black uppercase select-none group"
                title="Close Profile (Esc)"
                aria-label="Close"
              >
                <span className="hidden sm:inline">CLOSE</span>
                <X size={15} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={`grid ${referralSettings?.isEnabled ? "grid-cols-3" : "grid-cols-2"} gap-2 mb-6 font-mono text-[10px] sm:text-xs font-black uppercase`}>
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-2 sm:py-2.5 px-2 text-center border-2 border-brand-text transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                activeTab === "orders"
                  ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
            >
              <Package size={13} className="shrink-0" />
              <span className="truncate">ORDERS ({orders.length})</span>
            </button>
            {referralSettings?.isEnabled && (
              <button
                onClick={() => setActiveTab("referral")}
                className={`py-2 sm:py-2.5 px-2 text-center border-2 border-brand-text transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  activeTab === "referral"
                    ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                    : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                }`}
              >
                <Users size={13} className="shrink-0 text-brand-accent" />
                <span className="truncate">REFERRAL</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-2 sm:py-2.5 px-2 text-center border-2 border-brand-text transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                activeTab === "profile"
                  ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
            >
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">IDENTITY</span>
            </button>
          </div>

          {/* Firestore Quota Notice Banner (Spark Free-tier daily read limit) */}
          {isQuotaExceeded && (
            <div className="mb-4 p-3 border-2 border-brand-accent bg-brand-accent/10 text-brand-text text-[11px] font-mono leading-relaxed shadow-[2px_2px_0px_#ff4500]">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="text-brand-accent shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-brand-accent uppercase tracking-wider mb-1">
                    Firestore Free Tier Quota Limit Reached
                  </p>
                  <p className="text-brand-text/80 text-[10px] mb-2">
                    Daily free read units have reached capacity for today. The application is running smoothly using offline cached profile data. Quota automatically resets tomorrow.
                  </p>
                  <a
                    href={quotaUpgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-bg bg-brand-accent hover:bg-brand-text px-2.5 py-1 border border-brand-text transition-colors shadow-[1px_1px_0px_#050505]"
                  >
                    <span>ENABLE BILLING / UPGRADE DATABASE</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-4 font-mono text-xs">
            {activeTab === "orders" ? (
              <div>
                {loadingOrders ? (
                  <div className="py-12 text-center text-brand-text/60">
                    <p className="animate-pulse">SEARCHING DISPATCH RECORDS...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-brand-surface border-2 border-brand-text p-8 text-center space-y-3">
                    <ShoppingBag size={28} className="mx-auto text-brand-text/40" />
                    <p className="font-black uppercase tracking-wider text-brand-text">NO ACQUISITIONS RECORDED YET</p>
                    <p className="text-brand-text/60 text-[11px] uppercase">
                      Your confirmed orders and dispatch tracking numbers will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const orderDate = formatDateSafe(order.createdAt);

                      const statusColor = 
                        order.status === "delivered" ? "bg-green-600 text-white" :
                        order.status === "shipped" ? "bg-brand-accent text-white" :
                        order.status === "processing" ? "bg-amber-600 text-white" :
                        "bg-brand-text text-brand-bg";

                      const displayOrderId = (order.id || "ORD").slice(0, 10).toUpperCase();
                      const displayTotal = (order.total ?? 0).toLocaleString();
                      const safeItems = order.items || [];
                      const city = order.customerInfo?.city || "STANDARD";
                      const country = order.customerInfo?.country || "DOMESTIC";

                      return (
                        <div 
                          key={order.id}
                          className="bg-brand-surface border-2 border-brand-text p-4 sm:p-5 shadow-[3px_3px_0px_#050505] space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between border-b border-brand-text/20 pb-2.5 gap-2">
                            <div>
                              <span className="font-black uppercase text-brand-accent">
                                ORDER #{displayOrderId}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-brand-text/60 mt-0.5">
                                <Clock size={11} />
                                <span>{orderDate}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase border border-brand-text ${statusColor}`}>
                                {order.status || "processing"}
                              </span>
                              <span className="font-black text-sm text-brand-text">
                                Rs. {displayTotal}
                              </span>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-2 pt-1">
                            {safeItems.map((item, idx) => {
                              const itemTotal = ((item.price || 0) * (item.quantity || 1)).toLocaleString();
                              return (
                                <div key={item.id || idx} className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2.5">
                                    {item.image && (
                                      <img 
                                        src={item.image} 
                                        alt={item.name}
                                        className="w-9 h-9 object-cover border border-brand-text bg-white shrink-0" 
                                      />
                                    )}
                                    <div>
                                      <p className="font-black uppercase truncate max-w-[200px] sm:max-w-[280px]">{item.name}</p>
                                      <p className="text-[10px] text-brand-text/60 uppercase">
                                        QTY: {item.quantity || 1} {item.options?.Size ? `• SIZE: ${item.options.Size}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-bold">Rs. {itemTotal}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Shipping destination */}
                          <div className="pt-2 border-t border-brand-text/15 text-[10px] text-brand-text/70 uppercase flex justify-between">
                            <span>DESTINATION: {city}, {country}</span>
                            <span>{safeItems.length} ITEM{safeItems.length === 1 ? '' : 'S'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (activeTab === "referral" && referralSettings?.isEnabled) ? (
              <div className="space-y-4">
                {/* Big Orange Header Banner */}
                <div className="p-4 bg-brand-surface border-2 border-brand-text space-y-2 shadow-[2px_2px_0px_#050505]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 border border-[#ff5500]/30">
                      EXCLUSIVE MEMBER PROGRAM
                    </span>
                    <Gift size={16} className="text-[#ff5500]" />
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black uppercase text-[#ff5500] tracking-tight leading-none">
                    REFER A FRIEND!
                  </div>
                  <p className="text-[11px] text-brand-text/80 font-sans leading-relaxed">
                    Share your personal referral link or code. Unlock <span className="font-bold text-[#ff5500]">{referralSettings?.referrerRewardPercentage ?? 20}% OFF</span> your next purchase when <span className="font-bold text-brand-text font-mono underline decoration-[#ff5500] decoration-2">{referralSettings?.minimumReferrals ?? 2} friends</span> place an order <span className="font-bold text-[#ff5500]">OR</span> when <span className="font-bold text-brand-text font-mono underline decoration-[#ff5500] decoration-2">{referralSettings?.minimumVisits ?? 35} unique visitors</span> browse the studio through your link! Referred friends also get <span className="font-bold text-[#ff5500] font-mono">{referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% OFF</span> immediately.
                  </p>
                </div>

                {/* Shareable Link & Code Display Card */}
                {(() => {
                  const fallbackSuffix = (user?.uid ? user.uid.substring(0, 8) : "MEMBER").toUpperCase();
                  const userCode = userProfile?.referralCode || ("SYM-" + fallbackSuffix);
                  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://symbolic.store";
                  const shareableUrl = `${baseUrl}?ref=${userCode}`;

                  return (
                    <div className="p-4 sm:p-5 border-2 border-brand-text bg-white shadow-[4px_4px_0px_#050505] space-y-4">
                      {/* Direct Link Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/60 flex items-center gap-1.5">
                            <Globe size={11} className="text-[#ff5500]" />
                            YOUR PERSONAL REFERRAL LINK (TRACKS VISITS AUTOMATICALLY)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-brand-bg border-2 border-brand-text">
                          <span className="font-mono text-[11px] sm:text-xs font-bold text-brand-text truncate select-all">
                            {shareableUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shareableUrl);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2500);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#ff5500] text-white text-[10px] font-black uppercase tracking-wider hover:bg-neutral-900 transition-all cursor-pointer shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                          >
                            {copiedLink ? <CheckCheck size={12} className="text-white" /> : <LinkIcon size={12} />}
                            <span>{copiedLink ? "COPIED" : "COPY LINK"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Direct Code Section */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/60 flex items-center gap-1.5">
                          <Tag size={11} className="text-[#ff5500]" />
                          OR SHARE DIRECT CODE (FOR CHECKOUT)
                        </span>
                        <div className="flex items-center justify-between gap-3 p-2.5 bg-brand-bg border-2 border-brand-text">
                          <span className="font-mono text-sm sm:text-base font-black tracking-widest text-brand-text select-all">
                            {userCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(userCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2500);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-wider hover:bg-[#ff5500] hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                          >
                            {copiedCode ? <CheckCheck size={12} /> : <Copy size={12} />}
                            <span>{copiedCode ? "COPIED" : "COPY CODE"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Dual-Unlock Progress Cards with OR Condition */}
                {(() => {
                  const currentOrders = userProfile?.referralsCount ?? 0;
                  const currentVisits = userProfile?.referralVisitsCount ?? 0;
                  const targetOrders = Math.max(1, referralSettings?.minimumReferrals ?? 2);
                  const targetVisits = Math.max(1, referralSettings?.minimumVisits ?? 35);
                  const rewardPercent = referralSettings?.referrerRewardPercentage ?? 20;
                  const friendDiscount = referralSettings ? getFriendDiscountPercentage(referralSettings) : 10;

                  const ordersPercent = Math.min(100, Math.round((currentOrders / targetOrders) * 100));
                  const visitsPercent = Math.min(100, Math.round((currentVisits / targetVisits) * 100));

                  const check = referralSettings 
                    ? isReferrerRewardUnlocked(currentOrders, currentVisits, referralSettings)
                    : { unlocked: currentOrders >= targetOrders, progressText: "" };
                  
                  const isUnlocked = check.unlocked;

                  return (
                    <div className="space-y-3">
                      {/* Overall Status Banner */}
                      <div className={`p-3.5 border-2 border-brand-text font-mono shadow-[3px_3px_0px_#050505] flex items-center justify-between gap-3 ${
                        isUnlocked ? "bg-emerald-50 text-emerald-900 border-emerald-900" : "bg-amber-50 text-amber-900 border-amber-900"
                      }`}>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                            <Gift size={13} className={isUnlocked ? "text-emerald-700" : "text-amber-700"} />
                            {isUnlocked ? "🎉 REWARD UNLOCKED & READY TO CLAIM" : "MILESTONE IN PROGRESS"}
                          </span>
                          <p className="text-xs font-bold leading-tight">
                            {isUnlocked 
                              ? `You have unlocked ${rewardPercent}% OFF your next order! Use your code at checkout to claim.`
                              : `Reach EITHER goal below to unlock your exclusive ${rewardPercent}% discount!`
                            }
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase border border-current shrink-0 ${
                          isUnlocked ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                        }`}>
                          {isUnlocked ? "ACTIVE" : "LOCKED"}
                        </span>
                      </div>

                      {/* Dual Progress: Orders [OR] Visits */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-2.5">
                        {/* Option 1: Checkout Orders */}
                        <div className={`p-3.5 border-2 border-brand-text bg-white shadow-[2px_2px_0px_#050505] flex flex-col justify-between space-y-2.5 ${
                          currentOrders >= targetOrders ? "border-emerald-600 bg-emerald-50/40" : ""
                        }`}>
                          <div>
                            <div className="flex items-center justify-between text-[9px] font-mono font-black uppercase text-brand-text/70 mb-1">
                              <span>GOAL A: COMPLETED ORDERS</span>
                              <span className={currentOrders >= targetOrders ? "text-emerald-700 font-bold" : ""}>
                                {currentOrders >= targetOrders ? "✓ COMPLETED" : "IN PROGRESS"}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="font-mono text-2xl font-black text-brand-text">
                                {currentOrders} <span className="text-xs text-brand-text/50 font-normal">/ {targetOrders} ORDERS</span>
                              </span>
                              <span className="font-mono text-xs font-bold text-brand-text/70">{ordersPercent}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-brand-surface border border-brand-text h-2.5 mt-2 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${currentOrders >= targetOrders ? "bg-emerald-600" : "bg-[#ff5500]"}`}
                                style={{ width: `${ordersPercent}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-brand-text/75 font-sans leading-snug">
                            {currentOrders >= targetOrders 
                              ? "Goal achieved! Your referral orders qualify you for reward."
                              : `Need ${Math.max(1, targetOrders - currentOrders)} more friend checkout order${(targetOrders - currentOrders) > 1 ? "s" : ""}.`}
                          </p>
                        </div>

                        {/* Middle OR Divider */}
                        <div className="flex md:flex-col items-center justify-center p-1 font-mono font-black text-xs text-[#ff5500] uppercase tracking-widest bg-brand-surface border-2 border-brand-text shadow-[1px_1px_0px_#050505]">
                          <span>O</span>
                          <span>R</span>
                        </div>

                        {/* Option 2: Website Visits */}
                        <div className={`p-3.5 border-2 border-brand-text bg-white shadow-[2px_2px_0px_#050505] flex flex-col justify-between space-y-2.5 ${
                          currentVisits >= targetVisits ? "border-emerald-600 bg-emerald-50/40" : ""
                        }`}>
                          <div>
                            <div className="flex items-center justify-between text-[9px] font-mono font-black uppercase text-brand-text/70 mb-1">
                              <span>GOAL B: STUDIO VISITS</span>
                              <span className={currentVisits >= targetVisits ? "text-emerald-700 font-bold" : ""}>
                                {currentVisits >= targetVisits ? "✓ COMPLETED" : "IN PROGRESS"}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="font-mono text-2xl font-black text-brand-text">
                                {currentVisits} <span className="text-xs text-brand-text/50 font-normal">/ {targetVisits} VISITS</span>
                              </span>
                              <span className="font-mono text-xs font-bold text-brand-text/70">{visitsPercent}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-brand-surface border border-brand-text h-2.5 mt-2 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${currentVisits >= targetVisits ? "bg-emerald-600" : "bg-brand-accent"}`}
                                style={{ width: `${visitsPercent}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-brand-text/75 font-sans leading-snug">
                            {currentVisits >= targetVisits
                              ? "Goal achieved! Your referral link traffic qualifies you for reward."
                              : `Need ${Math.max(1, targetVisits - currentVisits)} more website visitor${(targetVisits - currentVisits) > 1 ? "s" : ""}.`}
                          </p>
                        </div>
                      </div>

                      {/* Rates and Privileges Overview */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3 border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505]">
                          <span className="text-[9px] font-black uppercase text-brand-text/60 block">YOUR REWARD PRIVILEGE</span>
                          <span className="text-xl font-black font-mono text-[#ff5500]">{rewardPercent}% OFF</span>
                          <span className="text-[9px] text-brand-text/70 block mt-0.5">Unlocked once either goal is met</span>
                        </div>
                        <div className="p-3 border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505]">
                          <span className="text-[9px] font-black uppercase text-brand-text/60 block">FRIEND PRIVILEGE (HALF)</span>
                          <span className="text-xl font-black font-mono text-brand-text">{friendDiscount}% OFF</span>
                          <span className="text-[9px] text-brand-text/70 block mt-0.5">Instant checkout discount for friends</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Program Rules Card */}
                <div className="p-3.5 border border-brand-text/20 bg-brand-surface text-[10px] space-y-2 text-brand-text/85 font-sans">
                  <div className="font-mono font-black uppercase text-brand-text text-[11px] flex items-center gap-1.5">
                    <Tag size={12} className="text-[#ff5500]" />
                    <span>REFERRAL PROTOCOL & RULES</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-[10px]">
                    <li>
                      <strong className="text-brand-text font-mono">Immediate Friend Discount:</strong> Any friend using your link or code immediately receives <span className="font-bold text-[#ff5500] font-mono">{referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% OFF</span> their purchase at checkout.
                    </li>
                    <li>
                      <strong className="text-brand-text font-mono">Dual-Unlock OR Milestone:</strong> You unlock your <span className="font-bold text-[#ff5500] font-mono">{referralSettings?.referrerRewardPercentage ?? 20}% OFF</span> reward as soon as <span className="font-bold">EITHER</span> {referralSettings?.minimumReferrals ?? 2} friends complete an order <span className="font-bold text-[#ff5500]">OR</span> {referralSettings?.minimumVisits ?? 35} unique visitors visit through your link.
                    </li>
                    <li>
                      <strong className="text-brand-text font-mono">Automatic Visit Tracking:</strong> Unique visits through your link are counted automatically per visitor session.
                    </li>
                    <li>
                      <strong className="text-brand-text font-mono">Redeeming Your Reward:</strong> Once unlocked, enter your referral code during checkout to apply your {referralSettings?.referrerRewardPercentage ?? 20}% discount!
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="p-3 bg-brand-surface border-2 border-brand-text text-[11px] text-brand-text/80 uppercase">
                  Saved address details are automatically applied during checkout for rapid order transmission.
                </div>

                {profileSaved && (
                  <div className="p-3 bg-green-500/10 border-2 border-green-600 text-green-700 flex items-center gap-2 font-bold uppercase text-[11px]">
                    <Check size={16} />
                    <span>Identity and shipping profile saved successfully.</span>
                  </div>
                )}

                {saveError && (
                  <div className="p-3 bg-red-500/10 border-2 border-red-500 text-red-600 flex items-center gap-2 font-bold uppercase text-[11px]">
                    <AlertCircle size={16} />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                      DISPLAY NAME
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full bg-brand-surface border-2 border-brand-text px-3 py-2 text-xs uppercase font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                      PHONE CONTACT
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full bg-brand-surface border-2 border-brand-text px-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                    STREET ADDRESS
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House / Apartment / Building, Street"
                    className="w-full bg-brand-surface border-2 border-brand-text px-3 py-2 text-xs uppercase font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                      CITY
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lahore / Karachi"
                      className="w-full bg-brand-surface border-2 border-brand-text px-3 py-2 text-xs uppercase font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                      POSTAL CODE
                    </label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="e.g. 54000"
                      className="w-full bg-brand-surface border-2 border-brand-text px-3 py-2 text-xs uppercase font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <LiquidCarveButton
                    type="submit"
                    variant="primary"
                    disabled={savingProfile}
                    className="py-3 px-6 text-xs font-mono font-black"
                  >
                    <span>{savingProfile ? "SAVING..." : "SAVE PROFILE DATA"}</span>
                  </LiquidCarveButton>

                  {isOwner && onOpenOwnerManager && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenOwnerManager(); }}
                      className="text-[10px] font-mono font-black uppercase text-brand-accent hover:underline cursor-pointer"
                    >
                      [ OPEN STUDIO MANAGER ]
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
