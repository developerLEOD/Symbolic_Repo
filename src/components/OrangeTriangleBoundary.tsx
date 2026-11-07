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
  showBackToHome = false,
  onBackToHome
}: OrangeTriangleBoundaryProps) {
  const isTop = position === "top";
  const defaultLabel = isTop 
    ? "THE COLLECTION" 
    : "THE COLLECTION // END OF CATALOGUE";

  return (
    <div className="w-full select-none">
      {isTop ? (
        <>
          {/* Top dark border rule */}
          <div className="h-[2px] bg-brand-text w-full" />

          {/* High-visibility industrial orange ribbon */}
          <div className="bg-brand-accent text-white px-4 sm:px-8 py-1.5 flex items-center justify-between font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="font-black text-white">{label || defaultLabel}</span>
            </div>
            {showBackToHome && onBackToHome && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBackToHome();
                }}
                className="bg-black text-white hover:bg-white hover:text-black border border-white/40 px-2.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.4)] transition-all select-none group"
                title="Return to Symbolic Homepage"
                aria-label="Back to Homepage"
              >
                <ArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform text-[#ff4500] group-hover:text-black" />
                <span>BACK TO HOMEPAGE</span>
              </button>
            )}
          </div>

          {/* Downward-pointing orange sawtooth triangle fringe */}
          <div className="w-full h-3 sm:h-3.5 overflow-hidden relative leading-none -mt-[1px]">
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
          <div className="w-full h-3 sm:h-3.5 overflow-hidden relative leading-none -mb-[1px]">
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
          <div className="bg-brand-accent text-white px-4 sm:px-8 py-1.5 flex items-center justify-between font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest overflow-hidden">
            <span className="font-black text-white">{label || defaultLabel}</span>
          </div>

          {/* Bottom dark border rule */}
          <div className="h-[2px] bg-brand-text w-full" />
        </>
      )}
    </div>
  );
}
