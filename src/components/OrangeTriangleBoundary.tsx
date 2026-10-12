import React from "react";
import { ArrowLeft } from "lucide-react";

interface OrangeTriangleBoundaryProps {
  position: "top" | "bottom";
  label?: string;
  sublabel?: string;
  code?: string;
  showBackToHome?: boolean;
  onBackToHome?: () => void;
}

export default function OrangeTriangleBoundary({
  position,
  label,
  sublabel,
  code = "SPEC:COL-01",
  showBackToHome = false,
  onBackToHome
}: OrangeTriangleBoundaryProps) {
  const isTop = position === "top";
  const defaultLabel = isTop 
    ? "SECTION BOUNDARY // THE COLLECTION REGISTER" 
    : "EXIT BOUNDARY // THE COLLECTION REGISTER";
  const defaultSublabel = isTop 
    ? "CANONICAL ARTIFACT CATALOGUE" 
    : "ALLOTMENTS VALIDATED // ARCHIVE DISPATCH";

  return (
    <div className="w-full select-none">
      {isTop ? (
        <>
          {/* Top dark border rule */}
          <div className="h-[2.5px] bg-brand-text w-full" />

          {/* High-visibility industrial orange ribbon */}
          <div className="bg-brand-accent text-white px-3 sm:px-6 py-2 flex items-center justify-between font-mono text-[9px] sm:text-[10.5px] font-black uppercase tracking-widest overflow-hidden shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="tracking-[0.3em] text-white font-black" aria-hidden="true">▲▲▲▲▲</span>
              <span className="font-black text-white">{label || defaultLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[9.5px] font-bold opacity-95">
              <span>{sublabel || defaultSublabel}</span>
              <span>•</span>
              <span>PRIMARY ARCHIVE ZONE</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {showBackToHome && onBackToHome && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBackToHome();
                  }}
                  className="bg-black text-white hover:bg-white hover:text-black border border-white/40 px-2 sm:px-2.5 py-0.5 text-[8px] sm:text-[9.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.4)] transition-all select-none group"
                  title="Return to Symbolic Homepage"
                  aria-label="Back to Homepage"
                >
                  <ArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform text-[#ff4500] group-hover:text-black" />
                  <span>BACK TO HOMEPAGE</span>
                </button>
              )}
              <span className="hidden sm:inline bg-black/25 px-2 py-0.5 border border-white/30 text-[8.5px] font-mono font-black">
                {code}
              </span>
              <span className="tracking-[0.3em] text-white font-black" aria-hidden="true">▲▲▲▲▲</span>
            </div>
          </div>

          {/* Downward-pointing orange sawtooth triangle fringe */}
          <div className="w-full h-3.5 sm:h-4 overflow-hidden relative leading-none -mt-[1px]">
            <svg 
              className="w-full h-full block" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <pattern id="sawtooth-fringe-down" width="24" height="16" patternUnits="userSpaceOnUse">
                  <polygon points="0,0 24,0 12,16" fill="#ff4500" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sawtooth-fringe-down)" />
            </svg>
          </div>
        </>
      ) : (
        <>
          {/* Upward-pointing orange sawtooth triangle fringe */}
          <div className="w-full h-3.5 sm:h-4 overflow-hidden relative leading-none -mb-[1px]">
            <svg 
              className="w-full h-full block" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <pattern id="sawtooth-fringe-up" width="24" height="16" patternUnits="userSpaceOnUse">
                  <polygon points="0,16 24,16 12,0" fill="#ff4500" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sawtooth-fringe-up)" />
            </svg>
          </div>

          {/* High-visibility industrial orange ribbon */}
          <div className="bg-brand-accent text-white px-3 sm:px-6 py-2 flex items-center justify-between font-mono text-[9px] sm:text-[10.5px] font-black uppercase tracking-widest overflow-hidden shadow-[inset_0_1px_0_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="tracking-[0.3em] text-white font-black">▼▼▼▼▼</span>
              <span className="font-black text-white">{label || defaultLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[9.5px] font-bold opacity-95">
              <span>{sublabel || defaultSublabel}</span>
              <span>•</span>
              <span>TRANSITION TO ATELIER CRITERIA</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="hidden sm:inline bg-black/25 px-2 py-0.5 border border-white/30 text-[8.5px] font-mono font-black">
                {code}
              </span>
              <span className="tracking-[0.3em] text-white font-black">▼▼▼▼▼</span>
            </div>
          </div>

          {/* Bottom dark border rule */}
          <div className="h-[2.5px] bg-brand-text w-full" />
        </>
      )}
    </div>
  );
}
