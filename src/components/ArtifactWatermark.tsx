import React from "react";

interface ArtifactWatermarkProps {
  artifactName?: string;
  artifactId?: string;
  collectionName?: string;
  variant?: "full" | "subtle" | "badge" | "minimal";
  className?: string;
}

/**
 * ArtifactWatermark
 * 
 * Distinctive brutalist archival watermark overlay designed for
 * SYMBOLIC MUSLIMS central artwork graphics.
 * 
 * Features:
 * - Technical corner reticle crosshairs & coordinate markers
 * - Repeating angled archival security text streams
 * - Official "SYMBOLIC MUSLIMS // CANONICAL ARTIFACT" authenticity seal
 * - Non-intrusive opacity with high aesthetic fidelity
 */
export default function ArtifactWatermark({
  artifactName,
  artifactId,
  collectionName,
  variant = "subtle",
  className = "",
}: ArtifactWatermarkProps) {
  const displayId = artifactId || "SYM-ART";
  const displayName = artifactName ? artifactName.toUpperCase() : "CANONICAL ARTIFACT";
  const displayCollection = collectionName ? collectionName.toUpperCase() : "SYMBOLIC ARCHIVE";

  if (variant === "badge") {
    return (
      <div 
        className={`pointer-events-none select-none absolute bottom-2 right-2 z-20 font-mono text-[7.5px] font-black uppercase tracking-wider bg-brand-bg/90 text-brand-text/80 px-2 py-0.5 border border-brand-text/40 shadow-[1px_1px_0px_#050505] backdrop-blur-[2px] flex items-center gap-1.5 ${className}`}
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 bg-brand-accent inline-block animate-pulse" />
        <span>SYMBOLIC MUSLIMS // ARCHIVE PROOF</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div 
        className={`pointer-events-none select-none absolute inset-0 z-15 overflow-hidden flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        <div className="absolute top-2 right-2 font-mono text-[7px] font-black tracking-widest text-brand-text/40 uppercase bg-brand-bg/60 px-1.5 py-0.5 border border-brand-text/20 backdrop-blur-[1px]">
          [ SYM // REGISTERED ]
        </div>
        <div className="rotate-[-24deg] text-brand-text/25 font-mono text-[10px] sm:text-xs font-black tracking-[0.25em] uppercase whitespace-nowrap border-y border-brand-text/15 py-1 px-4 backdrop-blur-[0.5px]">
          SYMBOLIC MUSLIMS &bull; ARCHIVAL DESIGN &bull; {displayId}
        </div>
      </div>
    );
  }

  // Full / Subtle Watermark Overlay
  const isFull = variant === "full";
  const opacityText = isFull ? "text-brand-text/35" : "text-brand-text/25";
  const borderOpacity = isFull ? "border-brand-text/30" : "border-brand-text/15";

  return (
    <div 
      className={`pointer-events-none select-none absolute inset-0 z-15 overflow-hidden flex flex-col justify-between p-2.5 sm:p-3.5 ${className}`}
      aria-hidden="true"
      data-artifact-watermark="true"
    >
      {/* 1. Four Corner Technical Crosshairs & Coordinates */}
      <div className="w-full flex items-start justify-between font-mono text-[8px] text-brand-text/40 leading-none">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-black text-brand-text/60">+</span>
          <span className="text-[6.5px] uppercase tracking-tighter opacity-60">REG.01 // TL</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-black text-brand-text/60">+</span>
          <span className="text-[6.5px] uppercase tracking-tighter opacity-60">{displayId}</span>
        </div>
      </div>

      {/* 2. Diagonal Angled Archival Security Watermark Streams */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="rotate-[-28deg] flex flex-col items-center gap-4 sm:gap-6 w-[160%]">
          
          {/* Stream 1 */}
          <div className={`whitespace-nowrap font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] ${opacityText} flex items-center gap-4 select-none`}>
            <span>SYMBOLIC MUSLIMS</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>CANONICAL ARTIFACT</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>{displayCollection}</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>SYMBOLIC MUSLIMS</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>CANONICAL ARTIFACT</span>
          </div>

          {/* Centerpiece Watermark Band */}
          <div className={`w-full py-1 sm:py-1.5 border-y ${borderOpacity} bg-brand-surface/20 backdrop-blur-[0.5px] flex items-center justify-center gap-3 sm:gap-6`}>
            <div className={`font-mono text-[11px] sm:text-[13px] md:text-[15px] font-black uppercase tracking-[0.35em] ${isFull ? "text-brand-text/45" : "text-brand-text/30"} whitespace-nowrap`}>
              &bull; SYMBOLIC MUSLIMS // {displayName} // {displayId} &bull;
            </div>
          </div>

          {/* Stream 2 */}
          <div className={`whitespace-nowrap font-mono text-[8.5px] sm:text-[10px] font-black uppercase tracking-[0.28em] ${opacityText} flex items-center gap-4 select-none`}>
            <span>DO NOT REPRODUCE</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>ARCHIVAL PROPERTY</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>AUTHENTIC REGISTER</span>
            <span className="text-brand-accent/50">&bull;</span>
            <span>DO NOT REPRODUCE</span>
          </div>
        </div>
      </div>

      {/* 3. Central Archival Security Seal (For Full View) */}
      {isFull && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-brand-text/25 bg-brand-bg/40 backdrop-blur-[1px] p-2.5 sm:p-3 text-center shadow-[2px_2px_0px_rgba(5,5,5,0.15)] max-w-[200px]">
            <div className="font-mono text-[7px] font-black tracking-widest text-brand-text/50 uppercase border-b border-brand-text/20 pb-0.5 mb-1">
              ARCHIVE AUTHENTICITY STAMP
            </div>
            <div className="font-mono text-[10px] font-black tracking-wider text-brand-text/60 uppercase">
              SYMBOLIC MUSLIMS
            </div>
            <div className="font-mono text-[6.5px] font-bold text-brand-text/40 tracking-widest uppercase mt-0.5">
              REGISTERED MASTER GRAPHIC
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Corner Reticles & Seal Stamp */}
      <div className="w-full flex items-end justify-between font-mono text-[8px] text-brand-text/40 leading-none z-10">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[6.5px] uppercase tracking-tighter opacity-60">REG.02 // BL</span>
          <span className="font-black text-brand-text/60">+</span>
        </div>

        {/* Small Archival Seal in Bottom Right */}
        <div className="bg-brand-bg/80 border border-brand-text/30 px-2 py-1 shadow-[1px_1px_0px_#050505] flex items-center gap-1.5 backdrop-blur-[2px]">
          <div className="w-1.5 h-1.5 bg-brand-accent/80" />
          <span className="font-mono text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-brand-text/75">
            SYMBOLIC // ARCHIVE PROOF
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[6.5px] uppercase tracking-tighter opacity-60">REG.03 // BR</span>
          <span className="font-black text-brand-text/60">+</span>
        </div>
      </div>
    </div>
  );
}
