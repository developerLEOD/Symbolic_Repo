import React from "react";

interface OrangeTriangleBoundaryProps {
  position: "top" | "bottom";
  label?: string;
  sublabel?: string;
  code?: string;
}

export default function OrangeTriangleBoundary({
  position,
  label,
  sublabel,
  code = "SPEC:COL-01"
}: OrangeTriangleBoundaryProps) {
  const isTop = position === "top";
  const defaultLabel = isTop 
    ? "SECTION BOUNDARY // THE COLLECTION REGISTER" 
    : "EXIT BOUNDARY // THE COLLECTION REGISTER";
  const defaultSublabel = isTop 
    ? "CANONICAL ARTIFACT CATALOGUE" 
    : "ALLOTMENTS VALIDATED // ARCHIVE DISPATCH";

  return (
    <div className="w-full select-none" aria-hidden="true">
      {isTop ? (
        <>
          {/* Top dark border rule */}
          <div className="h-[2.5px] bg-brand-text w-full" />

          {/* High-visibility industrial orange ribbon */}
          <div className="bg-brand-accent text-white px-3 sm:px-6 py-2 flex items-center justify-between font-mono text-[9px] sm:text-[10.5px] font-black uppercase tracking-widest overflow-hidden shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="tracking-[0.3em] text-white font-black">▲▲▲▲▲</span>
              <span className="font-black text-white">{label || defaultLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[9.5px] font-bold opacity-95">
              <span>{sublabel || defaultSublabel}</span>
              <span>•</span>
              <span>PRIMARY ARCHIVE ZONE</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="hidden sm:inline bg-black/25 px-2 py-0.5 border border-white/30 text-[8.5px] font-mono font-black">
                {code}
              </span>
              <span className="tracking-[0.3em] text-white font-black">▲▲▲▲▲</span>
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
