import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Category } from "../types";

interface FooterProps {
  categories?: Category[];
  onCategoryClick?: (id: string | null) => void;
  onOwnerClick?: () => void;
  onCartClick?: () => void;
}

export default function Footer({ categories, onCategoryClick, onOwnerClick, onCartClick }: FooterProps) {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  
  // Filter out any garments references completely
  const validCategories = (categories || []).filter(c => {
    const id = (c.id || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    const label = (c.label || "").toLowerCase();
    return id !== "garments" && name !== "garments" && label !== "garments";
  });

  const getCategoryPath = (catId: string) => {
    const id = catId.toLowerCase();
    if (id === "be-symbolic") return "/collection/be-symbolic";
    if (id === "be-palestine" || id === "palestine") return "/collection/be-palestine";
    return `/artifacts/${id}`;
  };

  const handleLinkClick = (path: string, catId: string | null) => {
    if (onCategoryClick) onCategoryClick(catId);
    navigate(path);
  };

  return (
    <footer className="bg-brand-surface border-t-2 border-brand-text pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12 pb-12 border-b-2 border-brand-text">
          <div className="md:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                <img 
                  src="/Logo_NoName.jpg" 
                  alt="SYMBOLIC" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div>
                <div className="inline-flex flex-col items-end">
                  <h2 className="text-xs sm:text-sm font-mono font-black tracking-widest uppercase text-brand-text leading-none">
                    SYMBOLIC
                  </h2>
                  <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold italic tracking-wider text-brand-accent leading-none mt-1">
                    MUSLIMS
                  </span>
                </div>
                <span className="block text-[8px] font-mono uppercase tracking-widest text-brand-text/60 mt-1">
                  POSSESSION &amp; IDENTITY // EST. 1446 AH
                </span>
              </div>
            </div>
            <p className="font-mono text-xs text-brand-text/80 max-w-md leading-relaxed uppercase">
              A design house dedicated to manufacturing heavyweight physical instruments for those who carry unwavering faith and upright posture.
            </p>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 gap-8 font-mono text-xs">
            <div>
              <span className="text-brand-accent font-black block mb-4 uppercase tracking-widest">
                [ 01 // ARCHIVE ]
              </span>
              <ul className="space-y-2 uppercase font-bold text-brand-text">
                <li>
                  <Link
                    to="/artifacts"
                    onClick={() => handleLinkClick("/artifacts", null)}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                  >
                    &gt; ALL ARTIFACTS
                  </Link>
                </li>
                <li>
                  <Link
                    to="/collection/be-symbolic"
                    onClick={() => handleLinkClick("/collection/be-symbolic", "be-symbolic")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                  >
                    &gt; BE SYMBOLIC
                  </Link>
                </li>
                <li>
                  <Link
                    to="/collection/be-palestine"
                    onClick={() => handleLinkClick("/collection/be-palestine", "be-palestine")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                  >
                    &gt; BE PALESTINE
                  </Link>
                </li>
                {onCartClick && (
                  <li>
                    <motion.button 
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={onCartClick}
                      className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                    >
                      &gt; POSSESSION LEDGER
                    </motion.button>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <span className="text-brand-accent font-black block mb-4 uppercase tracking-widest">
                [ 02 // CODEX ]
              </span>
              <ul className="space-y-2 uppercase font-bold text-brand-text">
                {validCategories.length > 0 ? (
                  validCategories.map(c => (
                    <li key={c.id}>
                      <Link
                        to={getCategoryPath(c.id)}
                        onClick={() => handleLinkClick(getCategoryPath(c.id), c.id)}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                      >
                        &gt; {c.label || c.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <Link
                        to="/collection/be-symbolic"
                        onClick={() => handleLinkClick("/collection/be-symbolic", "be-symbolic")}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                      >
                        &gt; BE SYMBOLIC
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/collection/be-palestine"
                        onClick={() => handleLinkClick("/collection/be-palestine", "be-palestine")}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer block"
                      >
                        &gt; BE PALESTINE
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link
                    to="/about"
                    onClick={() => handleLinkClick("/about", "about")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer text-brand-accent block"
                  >
                    &gt; ABOUT SYMBOLIC
                  </Link>
                </li>
                <li>
                  <Link
                    to="/manifesto"
                    onClick={() => handleLinkClick("/manifesto", "manifesto")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer text-brand-accent block"
                  >
                    &gt; FOUNDATIONAL MANIFESTO
                  </Link>
                </li>
                {isOwner && onOwnerClick && (
                  <li>
                    <motion.button 
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={onOwnerClick}
                      className="hover:text-brand-accent transition-colors text-left cursor-pointer opacity-70"
                    >
                      &gt; STUDIO MANAGER
                    </motion.button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between font-mono text-[10px] uppercase tracking-widest font-bold text-brand-text gap-4">
          <div className="flex items-center gap-2">
            <span>© 2026</span>
            <span className="inline-flex flex-col items-end">
              <span className="font-black leading-tight">SYMBOLIC</span>
              <span className="text-[8px] font-bold italic text-brand-accent leading-none">MUSLIMS</span>
            </span>
            <span className="text-brand-text/70">// POSSESSION &amp; IDENTITY</span>
          </div>
          <p className="text-brand-accent">PERSON → SYMBOL → OBJECT</p>
        </div>
      </div>
    </footer>
  );
}
