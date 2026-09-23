import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronRight, ChevronDown, User as UserIcon, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Category } from "../types";
import { useAuth } from "../lib/AuthContext";
import { fetchCategories } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  onCategoryClick?: (id: string | null) => void;
  onOwnerClick?: () => void;
  onAuthClick: () => void;
  onReferralClick?: () => void;
}

export default function Header({ 
  onCartClick, 
  cartCount, 
  onCategoryClick, 
  onOwnerClick, 
  onAuthClick, 
  onReferralClick 
}: HeaderProps) {
  const { user, userProfile, isOwner } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"corpus" | "collections" | "manifestoes" | null>(null);
  const [isProductHovered, setIsProductHovered] = useState(false);
  const [isInCollectionSection, setIsInCollectionSection] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Detect when the screen is in THE COLLECTION SECTION and hide header all the time
  useEffect(() => {
    const checkCollectionSectionInView = () => {
      const collectionSection =
        document.getElementById("catalog-section") ||
        document.querySelector("[data-collection-section='true']");

      if (!collectionSection) {
        setIsInCollectionSection(false);
        return;
      }

      const rect = collectionSection.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      // Active in view if collection top has reached viewing area and bottom hasn't scrolled away
      const inView = rect.top < windowHeight * 0.85 && rect.bottom > 70;
      setIsInCollectionSection(inView);
    };

    checkCollectionSectionInView();

    const handleScrollAndCheck = () => {
      checkCollectionSectionInView();
    };

    window.addEventListener("scroll", handleScrollAndCheck, { passive: true });
    window.addEventListener("resize", handleScrollAndCheck, { passive: true });

    let observer: IntersectionObserver | null = null;
    const target =
      document.getElementById("catalog-section") ||
      document.querySelector("[data-collection-section='true']");

    if (target && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        () => {
          checkCollectionSectionInView();
        },
        {
          root: null,
          rootMargin: "-70px 0px -70px 0px",
          threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
        }
      );
      observer.observe(target);
    }

    const timer = window.setTimeout(checkCollectionSectionInView, 120);
    const timer2 = window.setTimeout(checkCollectionSectionInView, 400);

    return () => {
      window.removeEventListener("scroll", handleScrollAndCheck);
      window.removeEventListener("resize", handleScrollAndCheck);
      if (observer) observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, [location.pathname]);

  // Hide header when hovering over any product card, specimen plate, or artifact preview
  useEffect(() => {
    const isProductElement = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof Element)) return false;
      return Boolean(
        el.closest(
          "[data-product-card], [data-preview-element], [data-preview-canvas], [data-specimen-card], .product-card, .artifact-card, .specimen-card, .featured-product"
        )
      );
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (isProductElement(e.target)) {
        setIsProductHovered(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget && isProductElement(e.relatedTarget)) {
        return;
      }
      setIsProductHovered(false);
    };

    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("mouseout", handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

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
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
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

  // Canonical Mediums
  const standardMediums = [
    { id: null, path: "/artifacts", label: "MEDIUMS // ALL", desc: "Complete Transmission Archive" },
    { id: "wear", path: "/artifacts/wear", label: "WEAR", desc: "Heavyweight Tees, Fleece & Outerwear" },
    { id: "carry", path: "/artifacts/carry", label: "CARRY", desc: "Utility Totes & Artifact Carriers" },
    { id: "headwear", path: "/artifacts/headwear", label: "HEADWEAR", desc: "Structured Twill Caps & Headwear" },
    { id: "vessels", path: "/artifacts/vessels", label: "VESSELS", desc: "Ceramic Mugs & Stoneware" },
  ];

  const canonicalMediumIds = new Set(["wear", "carry", "headwear", "vessels", "be-palestine", "palestine", "be-symbolic", "garments"]);
  const extraCategories = categories
    .filter(c => !canonicalMediumIds.has((c.id || "").toLowerCase()))
    .map(c => ({
      id: c.id,
      path: `/artifacts/${c.id}`,
      label: (c.label || c.name).toUpperCase(),
      desc: "Custom Medium Taxonomy"
    }));

  const mediumItems = [...standardMediums, ...extraCategories];

  const collectionItems = [
    { id: null, path: "/artifacts", label: "ALL COLLECTIONS", desc: "Unified Archive // Both Ethos Lines" },
    { id: "be-symbolic", path: "/collection/be-symbolic", label: "BE SYMBOLIC", desc: "Core Identity & Modern Islamic Ethos" },
    { id: "be-palestine", path: "/collection/be-palestine", label: "BE PALESTINE", desc: "The Steadfast Line // Heritage & Solidarity" },
  ];

  const manifestoItems = [
    { id: "manifesto", path: "/manifesto", label: "FOUNDATIONAL MANIFESTO", desc: "Doctrine // Why We Wear What We Wear" },
    { id: "about", path: "/about", label: "PROVENANCE // ABOUT SYMBOLIC", desc: "Identity, Origin & Material Mandates" },
  ];

  const isMediumActive = location.pathname.startsWith("/artifacts");
  const isCollectionActive = location.pathname.startsWith("/collection");
  const isManifestoActive = location.pathname === "/manifesto" || location.pathname === "/why-merchandise";
  const isAboutActive = location.pathname === "/about";

  const handleItemSelect = (path: string, id: string | null) => {
    setOpenDropdown(null);
    setIsMenuOpen(false);
    if (onCategoryClick) {
      onCategoryClick(id);
    }
    navigate(path);
  };

  const isHidden = (isInCollectionSection || isProductHovered) && !isMenuOpen && !openDropdown;

  return (
    <motion.header 
      initial={false}
      animate={
        isHidden
          ? { y: "-108%", opacity: 0, scale: 0.98 }
          : { y: "0%", opacity: 1, scale: 1 }
      }
      transition={{
        type: "spring",
        stiffness: 480,
        damping: isHidden ? 32 : 23,
        mass: 0.75,
      }}
      style={{
        pointerEvents: isHidden ? "none" : "auto",
      }}
      className={`fixed top-0 left-0 w-full z-50 bg-brand-bg/85 backdrop-blur-md border-b-2 border-brand-text origin-top ${
        scrolled ? 'shadow-[0_4px_0px_#050505]' : ''
      }`}
    >
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 transition-all duration-300 ${scrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-20'}`}>
        {/* Left: Prominent Brand Identity & Large Logo */}
        <div className="flex items-center shrink-0">
          <Link 
            to="/"
            onClick={() => {
              if (onCategoryClick) onCategoryClick(null);
              setIsMenuOpen(false);
            }}
            className="group flex items-center gap-2.5 sm:gap-3.5 text-left focus:outline-none cursor-pointer shrink-0 select-none"
          >
            <div className={`shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 sm:border-3 border-brand-text group-hover:border-brand-accent group-hover:shadow-[3px_3px_0px_#050505] transition-all duration-200 ${scrolled ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14'}`}>
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col justify-center text-left shrink-0">
              <div className="w-fit inline-flex flex-col">
                <span className={`block font-mono font-black tracking-tight sm:tracking-normal uppercase text-brand-text leading-none transition-all duration-200 ${scrolled ? 'text-sm sm:text-base md:text-lg' : 'text-base sm:text-xl md:text-2xl lg:text-[25px]'}`}>
                  SYMBOLIC
                </span>
                <span className={`self-end font-mono font-black italic tracking-wider text-brand-accent leading-[12px] -mt-[3px] transition-all duration-200 ${scrolled ? 'text-[8px] sm:text-[9px] md:text-[9.5px]' : 'text-[9.5px] sm:text-[11px] md:text-xs lg:text-[12.5px]'}`}>
                  MUSLIMS
                </span>
              </div>
              <span className={`font-mono uppercase tracking-widest text-brand-text/50 leading-none transition-all duration-200 ${scrolled ? 'hidden' : 'hidden sm:block text-[8px] sm:text-[9px] mt-1'}`}>
                POSSESSION &amp; IDENTITY
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation on md+ / Brutalist Status Ticker on mobile to eliminate empty space */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
          {/* Tablet & PC Navigation (Visible starting from md: 768px) */}
          <nav 
            ref={navRef}
            className="hidden md:flex items-center justify-center gap-1.5 lg:gap-2 xl:gap-2.5 shrink-0 select-none font-mono"
          >
            {/* Dropdown 1: Mediums */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "corpus" ? null : "corpus")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "corpus" || isMediumActive
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5'}`}
                aria-expanded={openDropdown === "corpus"}
              >
                <span>[ MEDIUMS ]</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${openDropdown === "corpus" ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {openDropdown === "corpus" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-brand-bg/95 backdrop-blur-md border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// MEDIUMS</span>
                      <span className="text-brand-text/40">{mediumItems.length} ENTRIES</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-brand-text/10">
                      {mediumItems.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => handleItemSelect(item.path, item.id)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer block"
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
                        </Link>
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
                className={`whitespace-nowrap shrink-0 rounded-none text-[9px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "collections" || isCollectionActive
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5'}`}
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
                    className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-brand-bg/95 backdrop-blur-md border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// ETHOS LINES</span>
                      <span className="text-brand-text/40">{collectionItems.length} LINES</span>
                    </div>
                    <div className="divide-y divide-brand-text/10">
                      {collectionItems.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => handleItemSelect(item.path, item.id)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer block"
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
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Link 3: Manifesto */}
            <Link
              to="/manifesto"
              onClick={() => {
                setOpenDropdown(null);
                setIsMenuOpen(false);
              }}
              className={`whitespace-nowrap shrink-0 rounded-none text-[9px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                isManifestoActive
                  ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                  : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
              } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5'}`}
            >
              <span>[ MANIFESTO ]</span>
            </Link>

            {/* Link 4: About */}
            <Link
              to="/about"
              onClick={() => {
                setOpenDropdown(null);
                setIsMenuOpen(false);
              }}
              className={`whitespace-nowrap shrink-0 rounded-none text-[9px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                isAboutActive
                  ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                  : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
              } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5'}`}
            >
              <span>[ ABOUT ]</span>
            </Link>
          </nav>
        </div>

        {/* Right: Actions (Auth, Possessions, Drawer Toggle) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Account / Identity Authentication */}
          <motion.button
            onClick={() => {
              soundManager.playClick(0.12);
              onAuthClick();
            }}
            onMouseEnter={() => soundManager.playHover(0.03)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            className={`whitespace-nowrap shrink-0 h-8.5 sm:h-9 flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest rounded-none transition-colors shadow-[2px_2px_0px_#050505] cursor-pointer border-2 border-brand-text bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg ${scrolled ? 'px-2 sm:px-2.5' : 'px-2 sm:px-3'}`}
            title={user ? "Inspect Identity Record & Orders" : "Authenticate Identity"}
          >
            {user ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-brand-text/30 animate-pulse shrink-0"></span>
                <span className="max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline shrink-0">
                  {userProfile?.displayName ? userProfile.displayName.split(" ")[0] : (user.email?.split("@")[0] || "STATION")}
                </span>
                <span className="sm:hidden shrink-0 text-[8.5px]">ID</span>
              </>
            ) : (
              <>
                <UserIcon size={13} className="text-brand-accent shrink-0" />
                <span className="hidden sm:inline shrink-0">AUTHENTICATE</span>
              </>
            )}
          </motion.button>

          <motion.button 
            onClick={() => {
              soundManager.playClick(0.14);
              onCartClick();
            }}
            onMouseEnter={() => soundManager.playHover(0.03)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            className={`whitespace-nowrap shrink-0 h-8.5 sm:h-9 relative flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest bg-brand-text text-brand-bg rounded-none border-2 border-brand-text hover:bg-brand-accent hover:text-white transition-colors shadow-[2px_2px_0px_#050505] cursor-pointer ${scrolled ? 'px-2 sm:px-2.5' : 'px-2.5 sm:px-3.5'}`}
            title="Open Possession Ledger"
          >
            <span className="w-2 h-2 bg-brand-accent inline-block shrink-0" />
            <span className="hidden sm:inline shrink-0">POSSESSIONS // </span>
            <motion.span 
              key={formattedCartCount}
              initial={{ scale: 1.4, color: "#ff4500" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ type: "spring", stiffness: 450, damping: 15 }}
              className="shrink-0 font-black"
            >
              [ {formattedCartCount} ]
            </motion.span>
          </motion.button>

          <button 
            onClick={() => {
              soundManager.playToggle(0.08);
              setIsMenuOpen(!isMenuOpen);
            }}
            className="md:hidden h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 flex items-center justify-center bg-brand-surface hover:bg-brand-text hover:text-brand-bg rounded-none transition-all border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
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
            className="bg-brand-bg/95 backdrop-blur-md border-b-2 border-brand-text lg:hidden overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-8 flex flex-col gap-3 font-mono">
              {/* User Bar in Mobile Menu */}
              <button
                onClick={() => { onAuthClick(); setIsMenuOpen(false); }}
                className="flex items-center justify-between text-xs font-black uppercase tracking-widest py-3 px-4 bg-brand-surface border-2 border-brand-text text-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer mb-2"
              >
                <span className="flex items-center gap-2">
                  <UserIcon size={14} className="text-brand-accent" />
                  {user ? `[ ${userProfile?.displayName || user.email} ]` : "[ AUTHENTICATE CLIENT ]"}
                </span>
                <span className="text-[9px] font-bold text-brand-accent">
                  {user ? "PROFILE" : "LOGIN / REGISTER"}
                </span>
              </button>

              {/* Mobile Navigation Sections */}
              <div className="space-y-4 pt-1">
                {/* Section 1: Mediums */}
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-text/50 mb-1.5 px-1">
                    // MEDIUMS
                  </div>
                  <div className="space-y-1">
                    {mediumItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => handleItemSelect(item.path, item.id)}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors block"
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </Link>
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
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => handleItemSelect(item.path, item.id)}
                        className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors block ${item.id ? 'text-brand-accent font-black' : ''}`}
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Section 3: About & Manifestoes */}
                <div>
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-brand-text/50 mb-1.5 px-1">
                    // SEPARATE FOLIOS &amp; ARCHIVES
                  </div>
                  <div className="space-y-1">
                    <Link
                      to="/manifesto"
                      onClick={() => handleItemSelect("/manifesto", "manifesto")}
                      className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 border border-brand-text/15 cursor-pointer transition-colors block ${
                        isManifestoActive 
                          ? 'bg-brand-text text-brand-bg font-black' 
                          : 'bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg text-brand-accent font-black'
                      }`}
                    >
                      <span>[ MANIFESTO // WHY MERCHANDISE ]</span>
                      <ChevronRight size={13} className={isManifestoActive ? 'text-brand-bg' : 'text-brand-accent'} />
                    </Link>
                    <Link
                      to="/about"
                      onClick={() => handleItemSelect("/about", "about")}
                      className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 border border-brand-text/15 cursor-pointer transition-colors block ${
                        isAboutActive 
                          ? 'bg-brand-text text-brand-bg font-black' 
                          : 'bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg text-brand-accent font-black'
                      }`}
                    >
                      <span>[ ABOUT SYMBOLIC // PROVENANCE ]</span>
                      <ChevronRight size={13} className={isAboutActive ? 'text-brand-bg' : 'text-brand-accent'} />
                    </Link>
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
    </motion.header>
  );
}
