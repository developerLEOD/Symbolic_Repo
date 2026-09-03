import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, ChevronRight, Sliders, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Category } from "../types";
import { useAuth } from "../lib/AuthContext";

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  onCategoryClick: (id: string | null) => void;
  onOwnerClick?: () => void;
  onAuthClick: () => void;
}

export default function Header({ onCartClick, cartCount, onCategoryClick, onOwnerClick, onAuthClick }: HeaderProps) {
  const { user, userProfile, isOwner } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, "categories"), orderBy("order"));
        const querySnapshot = await getDocs(q);
        const cats = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Category))
          .filter(c => {
            const id = (c.id || "").toLowerCase();
            const name = (c.name || "").toLowerCase();
            const label = (c.label || "").toLowerCase();
            return id !== "garments" && name !== "garments" && label !== "garments";
          });
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories in header:", err);
      }
    };
    fetchCategories();
  }, []);

  const formattedCartCount = String(cartCount).padStart(2, "0");

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-brand-bg/95 backdrop-blur-sm border-b-2 border-brand-text shadow-[0_4px_0px_#050505]' : 'bg-brand-bg border-b-2 border-brand-text'}`}>
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16 sm:h-20'}`}>
        <div className="flex items-center gap-3 lg:gap-8 ml-0">
          <button 
            onClick={() => { onCategoryClick(null); setIsMenuOpen(false); }}
            className="group flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none cursor-pointer shrink-0"
          >
            <div className={`shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 border-brand-text group-hover:border-brand-accent group-hover:shadow-[2px_2px_0px_#050505] transition-all duration-300 ${scrolled ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'}`}>
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col">
              <span className={`block font-mono font-black tracking-wider sm:tracking-widest uppercase text-brand-text leading-none transition-all duration-300 ${scrolled ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
                SYMBOLIC
              </span>
              <span className={`self-end font-mono font-normal tracking-wider text-brand-accent leading-none mt-0.5 transition-all duration-300 ${scrolled ? 'text-[8px]' : 'text-[8.5px] sm:text-[9.5px]'}`}>
                MUSLIMS
              </span>
              {!scrolled && (
                <span className="hidden sm:block text-[8px] font-mono uppercase tracking-widest text-brand-text/60 transition-opacity duration-200 mt-0.5">
                  POSSESSION & IDENTITY
                </span>
              )}
            </div>
          </button>
          
          <nav className={`hidden md:flex items-center gap-1 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] overflow-x-auto hide-scrollbar transition-all duration-300 ${scrolled ? 'p-0.5' : 'p-1'}`}>
            <button 
              onClick={() => onCategoryClick(null)} 
              className={`whitespace-nowrap shrink-0 rounded-none text-[10px] font-mono font-black tracking-widest uppercase transition-all hover:bg-brand-text hover:text-brand-bg cursor-pointer ${scrolled ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
            >
              [ ALL ]
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => onCategoryClick(cat.id)}
                className={`whitespace-nowrap shrink-0 rounded-none text-[10px] font-mono font-black tracking-widest uppercase transition-all hover:bg-brand-text hover:text-brand-bg cursor-pointer ${scrolled ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
              >
                [ {cat.label || cat.name} ]
              </button>
            ))}
            <button 
              onClick={() => onCategoryClick("about")}
              className={`whitespace-nowrap shrink-0 rounded-none text-[10px] font-mono font-black tracking-widest uppercase transition-all hover:bg-brand-text hover:text-brand-bg cursor-pointer ${scrolled ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
            >
              [ ABOUT ]
            </button>
            <button 
              onClick={() => onCategoryClick("why-merchandise")}
              className={`whitespace-nowrap shrink-0 rounded-none text-[10px] font-mono font-black tracking-widest uppercase transition-all text-brand-accent hover:bg-brand-accent hover:text-white cursor-pointer ${scrolled ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
            >
              [ WHY WE WEAR ]
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User Account / Sign In Button */}
          <button
            onClick={onAuthClick}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest rounded-none transition-all shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer border-2 border-brand-text bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg ${scrolled ? 'px-2 py-1.5 sm:px-3' : 'px-2 sm:px-4 py-1.5 sm:py-2.5'}`}
            title={user ? "Manage Account & Order History" : "Sign In or Register"}
          >
            {user ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-brand-text/30 animate-pulse shrink-0"></span>
                <span className="max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline shrink-0">
                  {userProfile?.displayName ? userProfile.displayName.split(" ")[0] : (user.email?.split("@")[0] || "ACCOUNT")}
                </span>
                <span className="sm:hidden shrink-0">ACCOUNT</span>
              </>
            ) : (
              <>
                <UserIcon size={12} className="text-brand-accent shrink-0" />
                <span className="shrink-0">SIGN IN</span>
              </>
            )}
          </button>

          <button 
            onClick={onCartClick}
            className={`whitespace-nowrap shrink-0 relative flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider sm:tracking-widest bg-brand-text text-brand-bg rounded-none border-2 border-brand-text hover:bg-brand-accent hover:text-white transition-all shadow-[2px_2px_0px_#050505] sm:shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${scrolled ? 'px-2 sm:px-4 py-1.5' : 'px-2 sm:px-5 py-1.5 sm:py-2.5'}`}
          >
            <ShoppingBag size={12} className="shrink-0" />
            <span className="shrink-0">BAG // [ {formattedCartCount} ]</span>
          </button>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden hover:bg-brand-surface rounded-none transition-all border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer ${scrolled ? 'p-1.5' : 'p-1.5 sm:p-2.5'}`}
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
                className="flex items-center justify-between text-xs font-black uppercase tracking-widest py-3 px-4 bg-brand-surface border-2 border-brand-text text-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer mb-2"
              >
                <span className="flex items-center gap-2">
                  <UserIcon size={14} className="text-brand-accent" />
                  {user ? `[ ${userProfile?.displayName || user.email} ]` : "[ SIGN IN / SIGN UP ]"}
                </span>
                <ChevronRight size={14} />
              </button>

              <button 
                onClick={() => { onCategoryClick(null); setIsMenuOpen(false); }}
                className="flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2.5 border-b border-brand-text/10 cursor-pointer"
              >
                <span>[ ALL ]</span> <ChevronRight size={14} className="text-brand-accent" />
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => { onCategoryClick(cat.id); setIsMenuOpen(false); }}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2.5 border-b border-brand-text/10 cursor-pointer"
                >
                  <span>[ {cat.name} ]</span> <ChevronRight size={14} className="text-brand-accent" />
                </button>
              ))}
              <button 
                onClick={() => { onCategoryClick("about"); setIsMenuOpen(false); }}
                className="flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2.5 border-b border-brand-text/10 cursor-pointer"
              >
                <span>[ ABOUT SYMBOLIC ]</span> <ChevronRight size={14} className="text-brand-accent" />
              </button>
              <button 
                onClick={() => { onCategoryClick("why-merchandise"); setIsMenuOpen(false); }}
                className="flex items-center justify-between text-xs font-bold uppercase tracking-widest py-2.5 border-b border-brand-text/10 text-brand-accent cursor-pointer"
              >
                <span>[ WHY WE WEAR ]</span> <ChevronRight size={14} className="text-brand-accent" />
              </button>
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

