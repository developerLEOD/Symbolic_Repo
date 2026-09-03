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
  
  // Filter out any garments references completely
  const validCategories = (categories || []).filter(c => {
    const id = (c.id || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    const label = (c.label || "").toLowerCase();
    return id !== "garments" && name !== "garments" && label !== "garments";
  });
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
                  POSSESSION & IDENTITY STUDIO
                </span>
              </div>
            </div>
            <p className="font-mono text-xs text-brand-text/80 max-w-sm leading-relaxed uppercase">
              What we possess and wear should communicate who we are and what we stand for—not turn us into walking banners for other brands.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-text text-brand-bg font-mono text-[9px] uppercase tracking-widest border border-brand-text">
              <span className="w-2 h-2 bg-brand-accent" />
              <span>REPRESENT YOURSELF // ZERO BILLBOARD CULTURE</span>
            </div>
          </div>
          
          <div className="md:col-span-6 flex justify-start md:justify-end gap-12 font-mono text-xs">
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-accent">
                [ DIRECTORY ]
              </h3>
              <ul className="space-y-2.5 font-bold uppercase">
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick(null)}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                  >
                    &gt; ALL OBJECTS
                  </button>
                </li>
                {validCategories.length > 0 ? (
                  validCategories.map((c) => (
                    <li key={c.id}>
                      <button 
                        onClick={() => onCategoryClick && onCategoryClick(c.id)}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                      >
                        &gt; {c.label || c.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <button 
                        onClick={() => onCategoryClick && onCategoryClick("caps")}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                      >
                        &gt; HEADWEAR
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => onCategoryClick && onCategoryClick("mugs")}
                        className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                      >
                        &gt; VESSELS
                      </button>
                    </li>
                  </>
                )}
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick("about")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                  >
                    &gt; ABOUT SYMBOLIC
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick("why-merchandise")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer text-brand-accent"
                  >
                    &gt; WHY WE WEAR THIS
                  </button>
                </li>
                {isOwner && onOwnerClick && (
                  <li>
                    <button 
                      onClick={onOwnerClick}
                      className="hover:text-brand-accent transition-colors text-left cursor-pointer opacity-70"
                    >
                      &gt; STUDIO MANAGER
                    </button>
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
            <span className="text-brand-text/70">// POSSESSION & IDENTITY</span>
          </div>
          <p className="text-brand-accent">PERSON → SYMBOL → OBJECT</p>
        </div>
      </div>
    </footer>
  );
}




