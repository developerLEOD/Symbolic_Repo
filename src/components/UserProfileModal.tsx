import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Package, MapPin, LogOut, Check, AlertCircle, ShoppingBag, Clock, Sliders } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Order } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOwnerManager?: () => void;
}

export default function UserProfileModal({ isOpen, onClose, onOpenOwnerManager }: UserProfileModalProps) {
  const { user, userProfile, isOwner, signOutUser, updateUserProfileData } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
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
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || "");
      setPhone(userProfile.phone || "");
      setAddress(userProfile.address || "");
      setCity(userProfile.city || "");
      setZip(userProfile.zip || "");
    }
  }, [userProfile, user]);

  // Load User Orders
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const ordersRef = collection(db, "orders");
        let userOrders: Order[] = [];

        // Primary Query: Fetch orders associated with the user's UID
        try {
          const q1 = query(ordersRef, where("userId", "==", user.uid));
          const snap1 = await getDocs(q1);
          userOrders = snap1.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        } catch (err1) {
          console.warn("Could not query orders by userId:", err1);
        }

        // Secondary Query: If user has an email and no orders by UID were found, check by customer email
        if (userOrders.length === 0 && user.email) {
          try {
            const q2 = query(ordersRef, where("customerInfo.email", "==", user.email));
            const snap2 = await getDocs(q2);
            userOrders = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          } catch (err2) {
            console.warn("Could not query orders by email:", err2);
          }
        }

        // Sort by createdAt descending
        userOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(userOrders);
      } catch (err) {
        console.error("Error loading user orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

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

  const handleSignOut = async () => {
    await signOutUser();
    onClose();
  };

  const initialLetter = (userProfile?.displayName || user.displayName || user.email || "U").charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-brand-bg border-2 border-brand-text shadow-[8px_8px_0px_#050505] p-6 sm:p-8 max-h-[90vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-brand-text pb-4 mb-6">
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
                <p className="font-mono text-xs text-brand-text/60">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOwner && onOpenOwnerManager && (
                <button
                  onClick={() => {
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
                onClick={handleSignOut}
                className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-brand-surface border-2 border-brand-text text-brand-text hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                title="Sign out of account"
              >
                <LogOut size={12} />
                <span>SIGN OUT</span>
              </button>
              <button 
                onClick={onClose}
                className="p-1.5 text-brand-text hover:bg-brand-surface border border-brand-text/30 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 font-mono text-xs font-black uppercase">
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-2.5 px-4 text-center border-2 border-brand-text transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "orders"
                  ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
            >
              <Package size={14} />
              <span>ACQUISITIONS ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-2.5 px-4 text-center border-2 border-brand-text transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "profile"
                  ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                  : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
              }`}
            >
              <MapPin size={14} />
              <span>SHIPPING & IDENTITY</span>
            </button>
          </div>

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
                      const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });

                      const statusColor = 
                        order.status === "delivered" ? "bg-green-600 text-white" :
                        order.status === "shipped" ? "bg-brand-accent text-white" :
                        order.status === "processing" ? "bg-amber-600 text-white" :
                        "bg-brand-text text-brand-bg";

                      return (
                        <div 
                          key={order.id}
                          className="bg-brand-surface border-2 border-brand-text p-4 sm:p-5 shadow-[3px_3px_0px_#050505] space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between border-b border-brand-text/20 pb-2.5 gap-2">
                            <div>
                              <span className="font-black uppercase text-brand-accent">
                                ORDER #{order.id.slice(0, 10).toUpperCase()}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-brand-text/60 mt-0.5">
                                <Clock size={11} />
                                <span>{orderDate}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase border border-brand-text ${statusColor}`}>
                                {order.status}
                              </span>
                              <span className="font-black text-sm text-brand-text">
                                Rs. {order.total.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-2 pt-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
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
                                      QTY: {item.quantity} {item.options?.Size ? `• SIZE: ${item.options.Size}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-bold">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>

                          {/* Shipping destination */}
                          <div className="pt-2 border-t border-brand-text/15 text-[10px] text-brand-text/70 uppercase flex justify-between">
                            <span>DESTINATION: {order.customerInfo.city}, {order.customerInfo.country}</span>
                            <span>{order.items.length} ITEM{order.items.length > 1 ? 'S' : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
