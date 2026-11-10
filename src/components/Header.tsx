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
  onTryOnClick?: () => void;
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
        console.warn("Categories header sync note (using fallback):", err);
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

  return (
    <motion.header 
      initial={false}
      animate={{ y: "0%", opacity: 1, scale: 1 }}
      className={`fixed top-0 left-0 w-full z-50 h-10 bg-brand-accent border-b-2 border-brand-text shadow-[0_2px_0px_#050505] flex items-center justify-between px-2.5 sm:px-8 lg:px-12 transition-all select-none ${
        scrolled ? "sm:h-10 sm:bg-brand-accent sm:border-b-2 sm:shadow-[0_2px_0px_#050505]" : "sm:h-28 sm:bg-transparent sm:border-b-0 sm:shadow-none"
      }`}
    >
      {/* Top Left: Logo */}
      <div className="flex items-center shrink-0">
        <Link 
          to="/"
          className="group flex items-center gap-2 sm:gap-4 focus:outline-none cursor-pointer shrink-0 select-none"
        >
          <div className={`shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border border-brand-text shadow-[1.5px_1.5px_0px_#050505] transition-all w-7 h-7 ${
            scrolled ? "sm:w-7 sm:h-7 sm:border sm:shadow-[1.5px_1.5px_0px_#050505]" : "sm:w-14 sm:h-14 sm:border-2 sm:shadow-[2px_2px_0px_#050505]"
          }`}>
            <img 
              src="/Logo_NoName.jpg" 
              alt="SYMBOLIC" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-0.5 sm:p-1"
            />
          </div>
          <div className="flex flex-col justify-center text-left shrink-0">
            <div className="w-fit inline-flex flex-col">
              <span className={`block font-mono font-black tracking-tight uppercase text-white leading-none text-xs ${
                scrolled ? "sm:text-xs sm:text-white" : "sm:text-2xl sm:text-brand-text"
              }`}>
                SYMBOLIC
              </span>
              <span className={`self-end font-mono font-black italic tracking-wider text-black leading-none mt-0.5 text-[8px] ${
                scrolled ? "sm:text-[8px] sm:text-black" : "sm:text-sm sm:text-brand-accent"
              }`}>
                MUSLIMS
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Top Right: Actions (Auth, Cart) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* User Account */}
        <motion.button
          onClick={() => {
            soundManager.playClick(0.12);
            onAuthClick();
          }}
          className={`h-7 flex items-center justify-center px-2.5 text-[9px] font-mono uppercase font-black tracking-wider rounded-none transition-colors shadow-[1.5px_1.5px_0px_#050505] cursor-pointer border border-brand-text bg-white text-brand-text hover:bg-black hover:text-white ${
            scrolled 
              ? "sm:h-7 sm:px-2.5 sm:text-[9px] sm:rounded-none sm:shadow-[1.5px_1.5px_0px_#050505] sm:border sm:bg-white sm:text-brand-text" 
              : "sm:h-12 sm:px-5 sm:text-xs sm:tracking-widest sm:rounded-full sm:shadow-[2px_2px_0px_#050505] sm:border-2 sm:bg-brand-surface"
          }`}
          title={user ? "Profile" : "Authenticate"}
        >
          {user ? (
            <span className="truncate max-w-[70px] sm:max-w-none">{userProfile?.displayName || "PROFILE"}</span>
          ) : (
            <span className="shrink-0">AUTH</span>
          )}
        </motion.button>

        {/* Cart */}
        <motion.button 
          onClick={() => {
            soundManager.playClick(0.14);
            onCartClick();
          }}
          className={`h-7 relative flex items-center px-2.5 text-[9px] font-mono uppercase font-black tracking-wider bg-black text-white rounded-none border border-brand-text hover:bg-brand-surface hover:text-brand-text transition-colors shadow-[1.5px_1.5px_0px_#050505] cursor-pointer ${
            scrolled 
              ? "sm:h-7 sm:px-2.5 sm:text-[9px] sm:rounded-none sm:shadow-[1.5px_1.5px_0px_#050505] sm:border" 
              : "sm:h-12 sm:px-5 sm:text-xs sm:tracking-widest sm:rounded-full sm:shadow-[2px_2px_0px_#050505] sm:border-2"
          }`}
          title="Possessions"
        >
          <span className={`shrink-0 ${scrolled ? "hidden sm:hidden" : "hidden sm:inline"}`}>POSSESSIONS // </span>
          <span className="shrink-0 font-black">
            [ {formattedCartCount} ]
          </span>
        </motion.button>
      </div>
    </motion.header>
  );
}
