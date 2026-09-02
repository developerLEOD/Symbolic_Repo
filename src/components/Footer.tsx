import { useAuth } from "../lib/AuthContext";

interface FooterProps {
  onCategoryClick?: (id: string | null) => void;
  onOwnerClick?: () => void;
  onCartClick?: () => void;
}

export default function Footer({ onCategoryClick, onOwnerClick, onCartClick }: FooterProps) {
  const { isOwner } = useAuth();
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
                <div className="flex items-baseline gap-1.5">
                  <h2 className="text-xs font-mono font-black tracking-widest uppercase text-brand-text">
                    SYMBOLIC
                  </h2>
                  <span className="text-[10px] font-mono font-bold tracking-tight text-brand-accent">
                    / MUSLIMS
                  </span>
                </div>
                <span className="block text-[8px] font-mono uppercase tracking-widest text-brand-text/60">
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
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick("garments")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                  >
                    &gt; GARMENTS
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick("headwear")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                  >
                    &gt; HEADWEAR
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onCategoryClick && onCategoryClick("vessels")}
                    className="hover:text-brand-accent transition-colors text-left cursor-pointer"
                  >
                    &gt; VESSELS
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
          <p>© 2026 SYMBOLIC / MUSLIMS // POSSESSION & IDENTITY</p>
          <p className="text-brand-accent">PERSON → SYMBOL → OBJECT</p>
        </div>
      </div>
    </footer>
  );
}




