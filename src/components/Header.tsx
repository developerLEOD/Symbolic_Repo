import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronRight, ChevronDown, User as UserIcon, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Category } from "../types";
import { useAuth } from "../lib/AuthContext";
import { fetchCategories } from "../lib/productService";

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
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

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
    { id: null, path: "/artefacts", label: "MEDIUMS // ALL", desc: "Complete Transmission Archive" },
    { id: "wear", path: "/artefacts/wear", label: "WEAR", desc: "Heavyweight Tees, Fleece & Outerwear" },
    { id: "carry", path: "/artefacts/carry", label: "CARRY", desc: "Utility Totes & Artefact Carriers" },
    { id: "headwear", path: "/artefacts/headwear", label: "HEADWEAR", desc: "Structured Twill Caps & Headwear" },
    { id: "vessels", path: "/artefacts/vessels", label: "VESSELS", desc: "Ceramic Mugs & Stoneware" },
  ];

  const canonicalMediumIds = new Set(["wear", "carry", "headwear", "vessels", "be-palestine", "palestine", "be-symbolic", "garments"]);
  const extraCategories = categories
    .filter(c => !canonicalMediumIds.has((c.id || "").toLowerCase()))
    .map(c => ({
      id: c.id,
      path: `/artefacts/${c.id}`,
      label: (c.label || c.name).toUpperCase(),
      desc: "Custom Medium Taxonomy"
    }));

  const mediumItems = [...standardMediums, ...extraCategories];

  const collectionItems = [
    { id: null, path: "/artefacts", label: "ALL COLLECTIONS", desc: "Unified Archive // Both Ethos Lines" },
    { id: "be-symbolic", path: "/collection/be-symbolic", label: "BE SYMBOLIC", desc: "Core Identity & Modern Islamic Ethos" },
    { id: "be-palestine", path: "/collection/be-palestine", label: "BE PALESTINE", desc: "The Steadfast Line // Heritage & Solidarity" },
  ];

  const manifestoItems = [
    { id: "why-merchandise", path: "/why-merchandise", label: "DOCTRINE // WHY MERCHANDISE", desc: "Foundational Manifesto & Philosophy" },
    { id: "about", path: "/about", label: "PROVENANCE // ABOUT SYMBOLIC", desc: "Identity, Origin & Material Mandates" },
  ];

  const isMediumActive = location.pathname.startsWith("/artefacts");
  const isCollectionActive = location.pathname.startsWith("/collection");
  const isManifestoActive = location.pathname === "/about" || location.pathname === "/why-merchandise";

  const handleItemSelect = (path: string, id: string | null) => {
    setOpenDropdown(null);
    setIsMenuOpen(false);
    if (onCategoryClick) {
      onCategoryClick(id);
    }
    navigate(path);
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-brand-bg/95 backdrop-blur-sm border-b-2 border-brand-text shadow-[0_4px_0px_#050505]' : 'bg-brand-bg border-b-2 border-brand-text'}`}>
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ${scrolled ? 'h-13 sm:h-14' : 'h-16'}`}>
        <div className="flex items-center gap-3 lg:gap-5 xl:gap-8 shrink-0">
          <Link 
            to="/"
            onClick={() => {
              if (onCategoryClick) onCategoryClick(null);
              setIsMenuOpen(false);
            }}
            className="group flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none cursor-pointer shrink-0 select-none"
          >
            <div className={`shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 border-brand-text group-hover:border-brand-accent group-hover:shadow-[2px_2px_0px_#050505] transition-all duration-200 ${scrolled ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-10 sm:h-10'}`}>
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col justify-center text-left shrink-0">
              <div className="w-fit inline-flex flex-col">
                <span className={`block font-mono font-black tracking-wider uppercase text-brand-text leading-none transition-all duration-200 ${scrolled ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-[14px]'}`}>
                  SYMBOLIC
                </span>
                <span className={`self-end font-mono font-bold italic tracking-wider text-brand-accent leading-none mt-0.5 transition-all duration-200 ${scrolled ? 'text-[9px] sm:text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'}`}>
                  MUSLIMS
                </span>
              </div>
              <span className={`font-mono uppercase tracking-widest text-brand-text/50 leading-none transition-all duration-200 ${scrolled ? 'hidden' : 'hidden 2xl:block text-[8px] mt-0.5'}`}>
                POSSESSION &amp; IDENTITY
              </span>
            </div>
          </Link>
          
          {/* PC Navigation: Visible on desktop (lg:flex) */}
          <nav 
            ref={navRef}
            className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0 select-none font-mono"
          >
            {/* Dropdown 1: Mediums */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "corpus" ? null : "corpus")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "corpus" || isMediumActive
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2.5 lg:px-3 py-1.5'}`}
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
                    className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
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
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "collections" || isCollectionActive
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

            {/* Dropdown 3: Manifesto / Doctrine / Provenance */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "manifestoes" ? null : "manifestoes")}
                className={`whitespace-nowrap shrink-0 rounded-none text-[9.5px] lg:text-[10px] font-mono font-black tracking-wider lg:tracking-widest uppercase transition-all flex items-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${
                  openDropdown === "manifestoes" || isManifestoActive
                    ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                    : "bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg"
                } ${scrolled ? 'px-2 lg:px-2.5 py-1' : 'px-2.5 lg:px-3 py-1.5'}`}
                aria-expanded={openDropdown === "manifestoes"}
              >
                <span>[ ABOUT &amp; MANIFESTO ]</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${openDropdown === "manifestoes" ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {openDropdown === "manifestoes" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] z-[60] overflow-hidden divide-y divide-brand-text/10"
                  >
                    <div className="px-3 py-1.5 bg-brand-surface border-b border-brand-text/20 text-[8.5px] font-mono font-black uppercase text-brand-accent tracking-widest flex items-center justify-between">
                      <span>// PHILOSOPHICAL FOUNDATIONS</span>
                      <span className="text-brand-text/40">2 FOLIOS</span>
                    </div>
                    <div className="divide-y divide-brand-text/10">
                      {manifestoItems.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => handleItemSelect(item.path, item.id)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-brand-text hover:text-brand-bg group transition-colors flex items-center justify-between cursor-pointer block"
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
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Account / Identity Authentication */}
          <button
            onClick={onAuthClick}
            className={`whitespace-nowrap shrink-0 h-8 sm:h-8.5 flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest rounded-none transition-all shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer border-2 border-brand-text bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg ${scrolled ? 'px-2 sm:px-2.5' : 'px-2 sm:px-3'}`}
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
          </button>

          <button 
            onClick={onCartClick}
            className={`whitespace-nowrap shrink-0 h-8 sm:h-8.5 relative flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest bg-brand-text text-brand-bg rounded-none border-2 border-brand-text hover:bg-brand-accent hover:text-white transition-all shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${scrolled ? 'px-2 sm:px-2.5' : 'px-2.5 sm:px-3.5'}`}
            title="Open Possession Ledger"
          >
            <span className="w-2 h-2 bg-brand-accent inline-block shrink-0" />
            <span className="hidden sm:inline shrink-0">POSSESSIONS // </span>
            <span className="shrink-0">[ {formattedCartCount} ]</span>
          </button>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden h-8 w-8 shrink-0 flex items-center justify-center bg-brand-surface hover:bg-brand-text hover:text-brand-bg rounded-none transition-all border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
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
            className="bg-brand-bg border-b-2 border-brand-text lg:hidden overflow-hidden shadow-2xl"
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
                    // ABOUT &amp; MANIFESTOES
                  </div>
                  <div className="space-y-1">
                    {manifestoItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => handleItemSelect(item.path, item.id)}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2 px-2.5 bg-brand-surface/40 hover:bg-brand-text hover:text-brand-bg border border-brand-text/15 cursor-pointer transition-colors text-brand-accent font-black block"
                      >
                        <span>[ {item.label} ]</span>
                        <ChevronRight size={13} className="text-brand-accent" />
                      </Link>
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
