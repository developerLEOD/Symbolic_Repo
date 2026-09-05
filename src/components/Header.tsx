import React, { useState, useEffect, useRef } from "react";
import { ShoppingBag, Menu, X, ChevronRight, ChevronDown, Sliders, User as UserIcon, Gift, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Category, ReferralSettings } from "../types";
import { useAuth } from "../lib/AuthContext";
import { getReferralSettings, subscribeReferralSettings, getFriendDiscountPercentage } from "../lib/referralService";
import { fetchCategories } from "../lib/productService";

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  onCategoryClick: (id: string | null) => void;
  onOwnerClick?: () => void;
  onAuthClick: () => void;
  onReferralClick?: () => void;
}

export default function Header({ onCartClick, cartCount, onCategoryClick, onOwnerClick, onAuthClick, onReferralClick }: HeaderProps) {
  const { user, userProfile, isOwner } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(null);
  const [showReferralTooltip, setShowReferralTooltip] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"corpus" | "collections" | "manifestoes" | null>(null);
  const accountContainerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeReferralSettings((settings) => {
      setReferralSettings(settings);
      if (!settings.isEnabled) {
        setShowReferralTooltip(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Show referral tooltip after a brief delay if referral program is active and not dismissed this session
  useEffect(() => {
    if (!referralSettings || !referralSettings.isEnabled) {
      setShowReferralTooltip(false);
      return;
    }

    const dismissed = sessionStorage.getItem("symbolic_referral_tooltip_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => {
        setShowReferralTooltip(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [referralSettings]);

  // Handle outside click to dismiss tooltip gracefully
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountContainerRef.current && !accountContainerRef.current.contains(e.target as Node)) {
        setShowReferralTooltip(false);
      }
    };
    if (showReferralTooltip) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [showReferralTooltip]);

  const handleDismissTooltip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowReferralTooltip(false);
    sessionStorage.setItem("symbolic_referral_tooltip_dismissed", "true");
  };

  const handleOpenReferral = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowReferralTooltip(false);
    sessionStorage.setItem("symbolic_referral_tooltip_dismissed", "true");
    if (onReferralClick) {
      onReferralClick();
    } else {
      onAuthClick();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const loadedCats = await fetchCategories();
        if (loadedCats.length > 0) {
          setCategories(loadedCats);
        }
      } catch (err) {
        console.error("Failed to load categories in header:", err);
      }
    };
    loadCategories();
  }, []);

  const formattedCartCount = String(cartCount).padStart(2, "0");

  // Canonical Specimen Types
  const standardSpecimens = [
    { id: null, label: "CORPUS // ALL", desc: "Complete Transmission Archive" },
    { id: "wear", label: "WEAR", desc: "Heavyweight Tees, Fleece & Outerwear" },
    { id: "carry", label: "CARRY", desc: "Utility Totes & Artifact Carriers" },
    { id: "headwear", label: "HEADWEAR", desc: "Structured Twill Caps & Headwear" },
    { id: "vessels", label: "VESSELS", desc: "Ceramic Mugs & Stoneware" },
  ];

  const canonicalSpecimenIds = new Set(["wear", "carry", "headwear", "vessels", "be-palestine", "palestine", "be-symbolic", "garments"]);
  const extraCategories = categories
    .filter(c => !canonicalSpecimenIds.has((c.id || "").toLowerCase()))
    .map(c => ({
      id: c.id,
      label: (c.label || c.name).toUpperCase(),
      desc: "Custom Specimen Taxonomy"
    }));

  const specimenItems = [...standardSpecimens, ...extraCategories];

  const collectionItems = [
    { id: null, label: "ALL COLLECTIONS", desc: "Unified Archive // Both Ethos Lines" },
    { id: "be-symbolic", label: "BE SYMBOLIC", desc: "Core Identity & Modern Islamic Ethos" },
    { id: "be-palestine", label: "BE PALESTINE", desc: "The Steadfast Line // Heritage & Solidarity" },
  ];

  const manifestoItems = [
    { id: "why-merchandise", label: "DOCTRINE // WHY MERCHANDISE", desc: "Foundational Manifesto & Philosophy" },
    { id: "about", label: "PROVENANCE // ABOUT SYMBOLIC", desc: "Identity, Origin & Material Mandates" },
  ];

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-brand-bg/95 backdrop-blur-sm border-b-2 border-brand-text shadow-[0_4px_0px_#050505]' : 'bg-brand-bg border-b-2 border-brand-text'}`}>
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-13 sm:h-14' : 'h-16'}`}>
        <div className="flex items-center gap-2.5 lg:gap-4 xl:gap-6 min-w-0">
          <button 
            onClick={() => { onCategoryClick(null); setIsMenuOpen(false); }}
            className="group flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none cursor-pointer shrink-0"
          >
            <div className={`shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 border-brand-text group-hover:border-brand-accent group-hover:shadow-[2px_2px_0px_#050505] transition-all duration-200 ${scrolled ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-11 sm:h-11'}`}>
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col justify-center text-left">
              <div className="w-fit inline-flex flex-col">
                <span className={`block font-mono font-black tracking-wider uppercase text-brand-text leading-none transition-all duration-200 ${scrolled ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-[15px]'}`}>
                  SYMBOLIC
                </span>
                <span className={`self-end font-mono font-bold italic tracking-wider text-brand-accent leading-none mt-0.5 transition-all duration-200 ${scrolled ? 'text-[9px] sm:text-[9.5px]' : 'text-[10px] sm:text-[11px]'}`}>
                  MUSLIMS
                </span>
              </div>
              <span className={`font-mono uppercase tracking-widest text-brand-text/50 leading-none transition-all duration-200 ${scrolled ? 'hidden' : 'hidden xl:block text-[8px] sm:text-[8.5px] mt-0.5'}`}>
                POSSESSION & IDENTITY
              </span>
            </div>
          </button>
          
          {/* PC Navigation: Shrunk into 3 Dropdowns */}
          <nav 
            ref={navRef}
            className="hidden md:flex items-center gap-1 lg:gap-1.5 shrink-0 select-none font-mono"
          >
            {/* Dropdown 1: Corpus Types */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "corpus" ? null : "corpus")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "corpus" 
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2.5 lg:px-3 py-1.5'}`}
                aria-expanded={openDropdown === "corpus"}
              >
                <span>[ CORPUS TYPES ]</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${openDropdown === "corpus" ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {openDropdown === "corpus" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// SPECIMEN TAXONOMY</span>
                      <span className="text-brand-text/40">{specimenItems.length} ENTRIES</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-brand-text/10">
                      {specimenItems.map(item => (
                        <button
                          key={item.id ?? "all"}
                          type="button"
                          onClick={() => {
                            onCategoryClick(item.id);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-mono text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider group-hover:text-brand-bg">
                              [ {item.label} ]
                            </div>
                            <div className="font-mono text-[8.5px] text-brand-text/60 group-hover:text-brand-bg/80 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                          <ChevronRight size={12} className="text-brand-text/40 group-hover:text-brand-bg shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 2: Collections */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "collections" ? null : "collections")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "collections" 
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2.5 lg:px-3 py-1.5'}`}
                aria-expanded={openDropdown === "collections"}
              >
                <span>[ COLLECTIONS ]</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${openDropdown === "collections" ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {openDropdown === "collections" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// ETHOS LINES</span>
                      <span className="text-brand-text/40">{collectionItems.length} LINES</span>
                    </div>
                    <div className="divide-y divide-brand-text/10">
                      {collectionItems.map(item => (
                        <button
                          key={item.id ?? "all"}
                          type="button"
                          onClick={() => {
                            onCategoryClick(item.id);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className={`font-mono text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider group-hover:text-brand-bg ${item.id ? 'text-brand-accent' : ''}`}>
                              [ {item.label} ]
                            </div>
                            <div className="font-mono text-[8.5px] text-brand-text/60 group-hover:text-brand-bg/80 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                          <ChevronRight size={12} className="text-brand-text/40 group-hover:text-brand-bg shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 3: About & Manifestoes */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "manifestoes" ? null : "manifestoes")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "manifestoes" 
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2.5 lg:px-3 py-1.5'}`}
                aria-expanded={openDropdown === "manifestoes"}
              >
                <span>[ ABOUT &amp; MANIFESTOES ]</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${openDropdown === "manifestoes" ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {openDropdown === "manifestoes" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-68 sm:w-80 bg-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// PHILOSOPHICAL FOUNDATION</span>
                      <span className="text-brand-text/40">ARCHIVE</span>
                    </div>
                    <div className="divide-y divide-brand-text/10">
                      {manifestoItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onCategoryClick(item.id);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-mono text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider group-hover:text-brand-bg text-brand-accent">
                              [ {item.label} ]
                            </div>
                            <div className="font-mono text-[8.5px] text-brand-text/60 group-hover:text-brand-bg/80 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                          <ChevronRight size={12} className="text-brand-text/40 group-hover:text-brand-bg shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Account / Sign In Button with Brutalist Referral Tooltip */}
          <div ref={accountContainerRef} className="relative">
            <button
              onClick={onAuthClick}
              className={`whitespace-nowrap shrink-0 h-8 sm:h-8.5 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest rounded-none transition-all shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer border-2 border-brand-text bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg ${scrolled ? 'px-2 sm:px-2.5' : 'px-2.5 sm:px-3'}`}
              title={user ? "Inspect Identity Profile & Dispatch Logs" : "Authenticate Identity"}
            >
              {user ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-brand-text/30 animate-pulse shrink-0"></span>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline shrink-0">
                    {userProfile?.displayName ? userProfile.displayName.split(" ")[0] : (user.email?.split("@")[0] || "STATION")}
                  </span>
                  <span className="sm:hidden shrink-0">STATION</span>
                </>
              ) : (
                <>
                  <UserIcon size={12} className="text-brand-accent shrink-0" />
                  <span className="shrink-0">AUTHENTICATE</span>
                </>
              )}

              {/* Referral Perk Tag Indicator on Account Button */}
              {referralSettings?.isEnabled && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReferralTooltip(prev => !prev);
                  }}
                  className="hidden xl:inline-flex items-center gap-1 text-[8px] font-mono font-black text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 border border-brand-accent/30 hover:bg-brand-accent hover:text-white transition-colors cursor-pointer"
                  title="Referral Rewards"
                >
                  <Gift size={9} />
                  <span>REFER & EARN</span>
                </span>
              )}
            </button>

            {/* Brutalist Referral Tooltip anchored to Account Box */}
            <AnimatePresence>
              {showReferralTooltip && referralSettings?.isEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-50 top-[calc(100%+12px)] right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-[310px] sm:w-[350px] bg-brand-bg border-2 border-brand-text p-4 shadow-[8px_8px_0px_#050505] pointer-events-auto text-left"
                >
                  {/* Brutalist Directional Pointer Anchor pointing UP to the Account button */}
                  <div className="absolute -top-2 right-6 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-3.5 h-3.5 bg-brand-surface border-l-2 border-t-2 border-brand-text rotate-45 pointer-events-none" />

                  {/* Tooltip Header Bar */}
                  <div className="flex items-center justify-between border-b-2 border-brand-text pb-2.5 mb-3 bg-brand-surface -mx-4 -mt-4 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#ff5500] inline-block animate-ping"></span>
                      <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-text">
                        COMMUNITY REWARDS // REFERRAL PROGRAM
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDismissTooltip}
                      aria-label="Dismiss referral tooltip"
                      className="p-1 border border-brand-text bg-brand-bg hover:bg-[#ff5500] hover:text-white text-brand-text shadow-[1px_1px_0px_#050505] transition-colors cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>

                  {/* Big Bold Orange Headline */}
                  <div className="mb-2.5">
                    <div className="font-mono text-xl sm:text-[24px] font-black uppercase tracking-tight text-[#ff5500] leading-none drop-shadow-sm">
                      INVITE FRIENDS & SAVE
                    </div>
                    <div className="font-mono text-[9.5px] font-black uppercase tracking-widest text-brand-text/80 mt-1">
                      YOU GET {referralSettings?.referrerRewardPercentage ?? 20}% OFF // FRIENDS GET {referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% OFF
                    </div>
                  </div>

                  {/* Details Under the Big Heading with OR condition */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-brand-text/85 font-mono leading-relaxed">
                      Share your personal referral link or code. You'll unlock <span className="font-bold text-[#ff5500]">{referralSettings?.referrerRewardPercentage ?? 20}% OFF</span> your next order when <span className="font-bold text-brand-text font-mono underline decoration-[#ff5500] decoration-2">{referralSettings?.minimumReferrals ?? 2} friends</span> place an order <span className="font-bold text-[#ff5500]">OR</span> when <span className="font-bold text-brand-text font-mono underline decoration-[#ff5500] decoration-2">{referralSettings?.minimumVisits ?? 35} visitors</span> browse the store through your link! Friends get <span className="font-bold text-[#ff5500] font-mono">{referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% OFF</span> instantly at checkout.
                    </p>

                    {/* How It Works 3-Step Card */}
                    <div className="bg-brand-surface border border-brand-text/20 p-2.5 space-y-1.5 font-mono text-[9px]">
                      <div className="flex items-center gap-2 text-brand-text">
                        <span className="w-4 h-4 bg-brand-text text-brand-bg font-black flex items-center justify-center shrink-0">1</span>
                        <span className="font-bold uppercase truncate">Share your personal referral link or code</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-text">
                        <span className="w-4 h-4 bg-brand-text text-brand-bg font-black flex items-center justify-center shrink-0">2</span>
                        <span className="font-bold uppercase truncate">Friends receive {referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% off at checkout</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#ff5500]">
                        <span className="w-4 h-4 bg-[#ff5500] text-white font-black flex items-center justify-center shrink-0">3</span>
                        <span className="font-black uppercase truncate">You unlock {referralSettings?.referrerRewardPercentage ?? 20}% off your next order!</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleOpenReferral}
                      className="w-full mt-2 py-2.5 px-3 bg-[#ff5500] text-white font-mono text-[11px] font-black uppercase tracking-wider hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 border-2 border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    >
                      <Gift size={13} />
                      <span>{user ? "VIEW REWARDS & GET MY CODE" : "SIGN IN TO GET YOUR CODE"}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={onCartClick}
            className={`whitespace-nowrap shrink-0 h-8 sm:h-8.5 relative flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest bg-brand-text text-brand-bg rounded-none border-2 border-brand-text hover:bg-brand-accent hover:text-white transition-all shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${scrolled ? 'px-2.5 sm:px-3' : 'px-3 sm:px-4'}`}
          >
            <ShoppingBag size={12} className="shrink-0" />
            <span className="shrink-0">CARGO // [ {formattedCartCount} ]</span>
          </button>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden h-8 w-8 flex items-center justify-center hover:bg-brand-surface rounded-none transition-all border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-bg border-b-2 border-brand-text md:hidden overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-8 flex flex-col gap-3 font-mono">
              {/* User Bar in Mobile Menu */}
              <button
                onClick={() => { onAuthClick(); setIsMenuOpen(false); }}
                className="flex items-center justify-between text-xs font-black uppercase tracking-widest py-3 px-4 bg-brand-surface border-2 border-brand-text text-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer mb-1"
              >
                <span className="flex items-center gap-2">
                  <UserIcon size={14} className="text-brand-accent" />
                  {user ? `[ ${userProfile?.displayName || user.email} ]` : "[ SIGN IN / SIGN UP ]"}
                </span>
                <ChevronRight size={14} />
              </button>

              {/* Referral Banner in Mobile Menu */}
              {referralSettings?.isEnabled && (
                <button
                  onClick={handleOpenReferral}
                  className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider py-2.5 px-3 bg-[#ff5500]/10 border-2 border-[#ff5500] text-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer mb-2"
                >
                  <span className="flex items-center gap-2 text-[#ff5500]">
                    <Gift size={14} />
                    <span>REFER A FRIEND // {referralSettings ? getFriendDiscountPercentage(referralSettings) : 10}% OFF FOR FRIENDS</span>
                  </span>
                  <ChevronRight size={14} className="text-[#ff5500]" />
                </button>
              )}

              {/* Mobile Navigation Sections */}
              <div className="space-y-4 pt-1">
                {/* Section 1: Corpus Types */}
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-text/50 mb-1.5 px-1">
                    // CORPUS TYPES
                  </div>
                  <div className="space-y-1">
                    {specimenItems.map(item => (
                      <button
                        key={item.id ?? "all"}
                        onClick={() => { onCategoryClick(item.id); setIsMenuOpen(false); }}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors"
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Collections */}
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-text/50 mb-1.5 px-1">
                    // COLLECTIONS
                  </div>
                  <div className="space-y-1">
                    {collectionItems.map(item => (
                      <button
                        key={item.id ?? "all"}
                        onClick={() => { onCategoryClick(item.id); setIsMenuOpen(false); }}
                        className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors ${item.id ? 'text-brand-accent font-black' : ''}`}
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: About & Manifestoes */}
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-text/50 mb-1.5 px-1">
                    // ABOUT & MANIFESTOES
                  </div>
                  <div className="space-y-1">
                    {manifestoItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { onCategoryClick(item.id); setIsMenuOpen(false); }}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors text-brand-accent font-black"
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {isOwner && onOwnerClick && (
                <button 
                  onClick={() => { onOwnerClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-widest py-3 px-4 bg-brand-surface border-2 border-brand-text text-brand-text shadow-[2px_2px_0px_#050505] mt-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-brand-accent" /> 
                    <span>[ STUDIO MANAGER ]</span>
                  </span>
                  <span className="text-[9px] font-black bg-brand-accent text-white px-2 py-0.5">OWNER</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

