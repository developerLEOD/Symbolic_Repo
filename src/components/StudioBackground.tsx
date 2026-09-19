/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";

export interface PageBackgroundTheme {
  cornerTopLeft: string;
  cornerTopRight: string;
  cornerBottomLeft: string;
  cornerBottomRight: string;
  tagline: string;
  systemTag: string;
  primaryWord: string;
  secondaryWord: string;
  highlightWord: string;
  specimenDescriptor: string;
  statementLine1: string;
  statementLine2: string;
}

/**
 * StudioBackground
 * 
 * Full-screen architectural background layer rendered strictly in Space Grotesk.
 * Covers the entire viewport with subtle diagonal ribbons of route-specific motifs
 * featuring rich typographic variations with clean, high-contrast visibility.
 * 
 * Smooth entrance animation and tranquil continuous drift.
 */
export default function StudioBackground({
  currentView = "home",
  selectedProductTitle,
}: {
  currentView?: string;
  selectedProductTitle?: string;
}) {
  const location = useLocation();

  // Custom high-velocity cubic-bezier curve
  const BEZIER_CURVE = [0.16, 1, 0.3, 1] as const;

  // Explicit Space Grotesk inline style
  const spaceGroteskStyle: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
  };

  // Route-to-theme mapping
  const theme: PageBackgroundTheme = useMemo(() => {
    const path = (currentView || location.pathname).toLowerCase();
    
    if (path.includes('/artifact/') || path.includes('/artifacts')) {
      return {
        cornerTopLeft: '+ ARTIFACTS // CURATED.GALLERY',
        cornerTopRight: 'PROVENANCE RECORD +',
        cornerBottomLeft: '+ MASTER ARTWORKS',
        cornerBottomRight: 'ARTIFACT EXHIBITION +',
        tagline: 'CURATED ARTIFACT SPECIMEN GALLERY',
        systemTag: 'ARTIFACT GALLERY',
        primaryWord: 'artifact',
        secondaryWord: 'ARTIFACTS',
        highlightWord: 'artifact',
        specimenDescriptor: 'MASTER ARTWORK RUNS',
        statementLine1: 'HISTORICAL INSCRIPTIONS AND SPECIMENS',
        statementLine2: 'ORIGINAL ARTIFACT ACQUISITIONS',
      };
    }
    
    if (path.includes('/collection/')) {
      const isPalestine = path.includes('palestine');
      return {
        cornerTopLeft: isPalestine ? '+ COLLECTION // BE.PALESTINE' : '+ COLLECTION // BE.SYMBOLIC',
        cornerTopRight: 'CANONICAL EDITIONS +',
        cornerBottomLeft: '+ PHYSICAL TAXONOMY',
        cornerBottomRight: 'PROVENANCE ASSURED +',
        tagline: isPalestine ? 'PALESTINE SOLIDARITY & HERITAGE SUITE' : 'BE SYMBOLIC FOUNDATIONAL CANON',
        systemTag: 'CURATED COLLECTION',
        primaryWord: isPalestine ? 'palestine' : 'symbolic',
        secondaryWord: isPalestine ? 'SOLIDARITY' : 'CONVICTION',
        highlightWord: isPalestine ? 'palestine' : 'symbolic',
        specimenDescriptor: 'HISTORICAL COMMEMORATIVE RUNS',
        statementLine1: 'COMMEMORATIVE SOLIDARITY & TIMELESS MEMORY',
        statementLine2: 'EVERY THREAD STANDS FOR JUSTICE',
      };
    }

    if (path.includes('/catalog')) {
      return {
        cornerTopLeft: '+ CATALOG // SPECIMEN.INDEX',
        cornerTopRight: 'ARCHIVAL INVENTORY +',
        cornerBottomLeft: '+ PHYSICAL TAXONOMY',
        cornerBottomRight: 'CANONICAL EDITIONS +',
        tagline: 'CATALOGUE RAISONNÉ OF ARCHIVAL GOODS',
        systemTag: 'ARCHIVAL CATALOG',
        primaryWord: 'catalog',
        secondaryWord: 'INVENTORY',
        highlightWord: 'catalog',
        specimenDescriptor: 'REGISTERED SPECIMENS',
        statementLine1: 'EXAMINE THE ENTIRE CATALOG ARCHIVE',
        statementLine2: 'SYSTEMATIC SPECIMEN REGISTRY',
      };
    }

    if (path.includes('/about')) {
      return {
        cornerTopLeft: '+ ABOUT // ATELIER.ORIGIN',
        cornerTopRight: 'EST. 2024 STANDARDS +',
        cornerBottomLeft: '+ HEAVYWEIGHT FABRICATION',
        cornerBottomRight: 'STUDIO ETHOS +',
        tagline: 'THE ATELIER STORY & FABRICATION ETHOS',
        systemTag: 'ABOUT THE ATELIER',
        primaryWord: 'about',
        secondaryWord: 'ATELIER',
        highlightWord: 'atelier',
        specimenDescriptor: 'CRAFT & INTEGRITY',
        statementLine1: 'LEARN ABOUT OUR UNWAVERING DISCIPLINE',
        statementLine2: 'CRAFTED PURPOSE OVER PROMOTION',
      };
    }

    if (path.includes('/manifesto') || path.includes('/why-merchandise')) {
      return {
        cornerTopLeft: '+ CANON // THE.MANIFESTO',
        cornerTopRight: 'SILENT WITNESS +',
        cornerBottomLeft: '+ ZERO EXTERIOR BRANDING',
        cornerBottomRight: 'UPRIGHT POSTURE COVENANT +',
        tagline: 'CANONICAL DECLARATION OF INTENT & DISCIPLINE',
        systemTag: 'THE MANIFESTO',
        primaryWord: 'manifesto',
        secondaryWord: 'MANIFESTO',
        highlightWord: 'manifesto',
        specimenDescriptor: 'UNWAVERING POSTURE',
        statementLine1: 'WHAT YOU CARRY SAYS SOMETHING',
        statementLine2: 'MAKE IT WORTH SAYING WITH DISCIPLINE',
      };
    }

    if (path.includes('/owner')) {
      return {
        cornerTopLeft: '+ SYSTEM // OWNER.STUDIO',
        cornerTopRight: 'ARCHIVE CONTROLS +',
        cornerBottomLeft: '+ SPECIMEN MATRIX & TAXONOMY',
        cornerBottomRight: 'OWNER STUDIO ACCESS +',
        tagline: 'INTERNAL ATELIER MANAGEMENT & STUDIO',
        systemTag: 'OWNER STUDIO',
        primaryWord: 'studio',
        secondaryWord: 'GOVERNANCE',
        highlightWord: 'studio',
        specimenDescriptor: 'SYSTEM MANAGEMENT',
        statementLine1: 'INTERNAL ATELIER MANAGEMENT PORTAL',
        statementLine2: 'SPECIMEN REGISTRY AND CURATION',
      };
    }

    if (path.includes('/acquisitions/') || path.includes('/p/')) {
      return {
        cornerTopLeft: `+ SPECIMEN // ${selectedProductTitle ? selectedProductTitle.toUpperCase().slice(0, 22) : 'OBJECT.INSPECTION'}`,
        cornerTopRight: 'HEAVYWEIGHT FABRIC +',
        cornerBottomLeft: '+ ZERO EXTERIOR LOGOS',
        cornerBottomRight: 'INSPECTION COMPLETE +',
        tagline: `SPECIMEN INSPECTION: ${selectedProductTitle ? selectedProductTitle.toUpperCase() : 'PHYSICAL INSTRUMENT'}`,
        systemTag: 'SPECIMEN DETAIL',
        primaryWord: 'specimen',
        secondaryWord: 'INSPECT',
        highlightWord: 'specimen',
        specimenDescriptor: 'HEAVYWEIGHT FABRICATION',
        statementLine1: 'DETAILED SPECIMEN INSPECTION & METRICS',
        statementLine2: 'TACTILE HEAVYWEIGHT SPECIFICATIONS',
      };
    }
    
    // Default Home
    return {
      cornerTopLeft: '+ ARCHIVE // SYS.01',
      cornerTopRight: 'CANONICAL ATELIER +',
      cornerBottomLeft: '+ ZERO EXTERIOR MARKS',
      cornerBottomRight: 'ARCHIVAL GRADE +',
      tagline: 'CANONICAL PHYSICAL INSTRUMENTS',
      systemTag: 'ARCHIVAL SYSTEM',
      primaryWord: 'symbolic',
      secondaryWord: 'SYMBOLIC',
      highlightWord: 'symbolic',
      specimenDescriptor: 'ARCHIVAL INSTRUMENTS',
      statementLine1: 'WHAT YOU CARRY SAYS SOMETHING',
      statementLine2: 'MAKE IT WORTH SAYING',
    };
  }, [currentView, location.pathname, selectedProductTitle]);

  // Repetition array to guarantee seamless horizontal coverage across displays
  const repeatLong = Array.from({ length: 8 });

  return (
    <div
      aria-hidden="true"
      style={spaceGroteskStyle}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none font-space-grotesk"
    >
      {/* ─── Architectural Registration Crosshairs in Space Grotesk ─── */}
      <div 
        style={spaceGroteskStyle}
        className="absolute top-6 left-6 text-[11px] tracking-widest font-bold text-brand-text/18 select-none font-space-grotesk z-10"
      >
        {theme.cornerTopLeft}
      </div>
      <div 
        style={spaceGroteskStyle}
        className="absolute top-6 right-6 text-[11px] tracking-widest font-bold text-brand-text/18 select-none font-space-grotesk z-10"
      >
        {theme.cornerTopRight}
      </div>
      <div 
        style={spaceGroteskStyle}
        className="absolute bottom-6 left-6 text-[11px] tracking-widest font-bold text-brand-text/18 select-none font-space-grotesk z-10"
      >
        {theme.cornerBottomLeft}
      </div>
      <div 
        style={spaceGroteskStyle}
        className="absolute bottom-6 right-6 text-[11px] tracking-widest font-bold text-brand-text/18 select-none font-space-grotesk z-10"
      >
        {theme.cornerBottomRight}
      </div>

      {/* ─── Full Screen Diagonal Stage (Rotated -18° across the entire viewport) ─── */}
      <div className="absolute inset-0 flex items-center justify-center opacity-70">
        <div 
          style={spaceGroteskStyle}
          className="relative w-[340vw] h-[340vh] -rotate-[18deg] flex flex-col justify-center gap-4 sm:gap-6 lg:gap-8 font-space-grotesk"
        >

          {/* ROW 1: Spaced Micro-Spec Track */}
          <motion.div
            key={`row-1-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-90vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.02, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-b border-brand-text/[0.05] pb-1.5"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 240, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 whitespace-nowrap text-xs font-bold uppercase tracking-[0.35em] text-brand-text/18"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="tracking-[0.45em] lowercase text-brand-accent/35 font-bold">{theme.highlightWord}</span>
                  <span>•</span>
                  <span className="text-brand-text/20">{theme.tagline}</span>
                  <span>•</span>
                  <span className="text-transparent [-webkit-text-stroke:1.2px_rgba(5,5,5,0.15)] font-bold lowercase tracking-widest">{theme.primaryWord}</span>
                  <span>•</span>
                  <span className="text-brand-text/20">{theme.specimenDescriptor}</span>
                  <span>•</span>
                  <span className="text-brand-text/25 font-bold">[ {theme.primaryWord} ]</span>
                  <span>•</span>
                  <span className="text-brand-text/20">EST. 2024</span>
                  <span>•</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 2: Monumental Hollow Wireframe */}
          <motion.div
            key={`row-2-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-95vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.8, delay: 0.04, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden py-1 border-b border-brand-text/[0.05]"
          >
            <motion.div
              animate={{ x: ["-30%", "0%"] }}
              transition={{ duration: 260, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-8 sm:gap-14 whitespace-nowrap font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl select-none"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="lowercase tracking-tighter leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(5,5,5,0.16)]">
                    {theme.primaryWord}
                  </span>
                  <span className="text-2xl sm:text-3xl text-brand-accent/28 font-bold">///</span>
                  <span className="uppercase tracking-tight leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(5,5,5,0.14)]">
                    {theme.secondaryWord}
                  </span>
                  <span className="text-xl sm:text-2xl text-brand-text/18 font-light">+</span>
                  <span className="lowercase tracking-[0.25em] leading-none text-transparent [-webkit-text-stroke:1.4px_rgba(5,5,5,0.15)] text-3xl sm:text-5xl">
                    {theme.highlightWord}
                  </span>
                  <span className="text-xl sm:text-2xl text-brand-text/18 font-light">—</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 3: Medium Architectural Narrative */}
          <motion.div
            key={`row-3-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-85vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.7, delay: 0.06, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-b border-brand-text/[0.05] py-1"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 250, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-8 whitespace-nowrap text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-brand-text/18"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span>{theme.statementLine1}</span>
                  <span className="text-brand-accent/35 font-bold lowercase tracking-widest text-sm sm:text-base">{theme.highlightWord}</span>
                  <span>{theme.statementLine2}</span>
                  <span className="text-brand-text/22 font-bold">[ {theme.secondaryWord} ]</span>
                  <span>{theme.specimenDescriptor}</span>
                  <span className="text-transparent [-webkit-text-stroke:1.2px_rgba(5,5,5,0.14)] lowercase font-bold text-sm sm:text-base">{theme.primaryWord}</span>
                  <span>—</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 4: Large Solid Lowercase */}
          <motion.div
            key={`row-4-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-100vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.9, delay: 0.08, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden py-1 border-y border-brand-text/[0.05]"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 230, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-8 sm:gap-14 whitespace-nowrap font-black select-none text-brand-text/10 text-5xl sm:text-7xl md:text-8xl lg:text-[8vw]"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="lowercase tracking-tighter leading-none hover:text-brand-accent/30 transition-colors">
                    {theme.primaryWord}
                  </span>
                  <span className="text-3xl sm:text-5xl text-brand-accent/28 font-bold">///</span>
                  <span className="uppercase tracking-tight leading-none text-brand-text/14">
                    {theme.secondaryWord}
                  </span>
                  <span className="text-2xl sm:text-4xl text-brand-text/18 font-light">+</span>
                  <span className="lowercase tracking-tighter leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(5,5,5,0.14)]">
                    {theme.highlightWord}
                  </span>
                  <span className="text-xl sm:text-3xl text-brand-accent/28 font-bold tracking-widest">[ 01 ]</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 5: Spaced Letterform Ribbon */}
          <motion.div
            key={`row-5-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-90vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.8, delay: 0.1, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-b border-brand-text/[0.05] py-1.5"
          >
            <motion.div
              animate={{ x: ["-30%", "0%"] }}
              transition={{ duration: 270, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 whitespace-nowrap font-bold text-2xl sm:text-4xl lg:text-5xl lowercase select-none text-brand-text/12"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="tracking-[0.35em] text-brand-text/16">{theme.highlightWord}</span>
                  <span className="text-xl sm:text-2xl text-brand-accent/28">—</span>
                  <span className="tracking-[0.35em] text-transparent [-webkit-text-stroke:1.2px_rgba(5,5,5,0.14)]">{theme.primaryWord}</span>
                  <span className="text-xl sm:text-2xl text-brand-text/18 font-light">•</span>
                  <span className="tracking-[0.2em] uppercase text-xl sm:text-3xl text-brand-text/18">[ {theme.systemTag} ]</span>
                  <span className="text-xl sm:text-2xl text-brand-accent/28 font-bold">///</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 6: Monumental Focal Centerpiece Ribbon */}
          <motion.div
            key={`row-6-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-110vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 2.0, delay: 0.12, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden py-2 sm:py-3 border-y border-brand-text/[0.07]"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 220, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 sm:gap-16 whitespace-nowrap font-black select-none text-brand-text/14 text-6xl sm:text-8xl md:text-9xl lg:text-[10vw] xl:text-[11.5vw]"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="lowercase tracking-tighter leading-none hover:text-brand-accent/35 transition-colors">
                    {theme.primaryWord}
                  </span>
                  <span className="text-3xl sm:text-5xl lg:text-6xl text-brand-accent/28 font-bold">///</span>
                  <span className="lowercase tracking-tighter leading-none text-transparent [-webkit-text-stroke:1.8px_rgba(5,5,5,0.18)]">
                    {theme.highlightWord}
                  </span>
                  <span className="text-2xl sm:text-4xl lg:text-5xl text-brand-text/18 font-light">+</span>
                  <span className="uppercase tracking-tight leading-none text-brand-text/18">
                    {theme.secondaryWord}
                  </span>
                  <span className="text-xl sm:text-3xl text-brand-accent/30 font-bold tracking-widest">[ 01 ]</span>
                  <span className="lowercase tracking-[0.3em] leading-none text-brand-text/10 text-5xl sm:text-7xl lg:text-[8.5vw]">
                    {theme.highlightWord}
                  </span>
                  <span className="text-3xl sm:text-5xl text-brand-text/22 font-bold">—</span>
                  <span className="lowercase tracking-tighter leading-none text-brand-accent/28">
                    {theme.primaryWord}
                  </span>
                  <span className="text-2xl sm:text-4xl lg:text-5xl text-brand-text/18 font-bold">///</span>
                  <span className="uppercase tracking-tight leading-none text-transparent [-webkit-text-stroke:1.8px_rgba(5,5,5,0.16)]">
                    {theme.secondaryWord}
                  </span>
                  <span className="text-2xl sm:text-4xl text-brand-text/22 font-bold">+</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 7: Accent-Tinted Lowercase Ribbon */}
          <motion.div
            key={`row-7-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-95vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.8, delay: 0.14, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-b border-brand-text/[0.05] py-1.5"
          >
            <motion.div
              animate={{ x: ["-30%", "0%"] }}
              transition={{ duration: 280, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 whitespace-nowrap font-bold text-3xl sm:text-5xl lg:text-6xl select-none"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="lowercase tracking-tight text-brand-accent/25">{theme.primaryWord}</span>
                  <span className="text-xl sm:text-3xl text-brand-text/18 font-light">+</span>
                  <span className="lowercase tracking-tight text-brand-text/14">{theme.highlightWord}</span>
                  <span className="text-xl sm:text-3xl text-brand-accent/28 font-bold">///</span>
                  <span className="uppercase tracking-tight text-transparent [-webkit-text-stroke:1.4px_rgba(5,5,5,0.14)]">{theme.secondaryWord}</span>
                  <span className="text-xl sm:text-3xl text-brand-text/18 font-light">—</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 8: Large Hollow Uppercase Ribbon */}
          <motion.div
            key={`row-8-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-100vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.9, delay: 0.16, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden py-1 border-b border-brand-text/[0.05]"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 260, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-8 sm:gap-14 whitespace-nowrap font-bold select-none text-4xl sm:text-6xl md:text-7xl lg:text-8xl"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="uppercase tracking-tight leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(5,5,5,0.16)]">
                    {theme.secondaryWord}
                  </span>
                  <span className="text-2xl sm:text-4xl text-brand-accent/28 font-bold">///</span>
                  <span className="lowercase tracking-tighter leading-none text-brand-text/14">
                    {theme.primaryWord}
                  </span>
                  <span className="text-xl sm:text-3xl text-brand-text/18 font-light">+</span>
                  <span className="lowercase tracking-[0.25em] leading-none text-transparent [-webkit-text-stroke:1.4px_rgba(5,5,5,0.14)] text-3xl sm:text-5xl">
                    {theme.highlightWord}
                  </span>
                  <span className="text-xl sm:text-3xl text-brand-accent/28 font-bold">—</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 9: Lower Architecture Narrative */}
          <motion.div
            key={`row-9-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-85vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.7, delay: 0.18, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-t border-brand-text/[0.05] pt-1.5"
          >
            <motion.div
              animate={{ x: ["-30%", "0%"] }}
              transition={{ duration: 290, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 whitespace-nowrap text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-brand-text/18"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span>{theme.statementLine1}</span>
                  <span>—</span>
                  <span className="text-brand-accent/32 font-bold lowercase tracking-widest text-sm sm:text-base">
                    {theme.highlightWord}
                  </span>
                  <span>—</span>
                  <span>{theme.statementLine2}</span>
                  <span>—</span>
                  <span className="text-brand-text/25 font-bold">
                    [ {theme.secondaryWord} ]
                  </span>
                  <span>—</span>
                  <span>{theme.tagline}</span>
                  <span>—</span>
                  <span className="text-transparent [-webkit-text-stroke:1.3px_rgba(5,5,5,0.15)] lowercase font-bold text-sm sm:text-base">
                    {theme.primaryWord}
                  </span>
                  <span>—</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

          {/* ROW 10: Spaced Lower Micro-Spec Track */}
          <motion.div
            key={`row-10-${location.pathname}-${theme.primaryWord}`}
            initial={{ x: "-90vw", opacity: 0 }}
            animate={{ x: "0vw", opacity: 1 }}
            transition={{ duration: 1.7, delay: 0.2, ease: BEZIER_CURVE }}
            className="w-full overflow-hidden border-t border-brand-text/[0.05] pt-1.5"
          >
            <motion.div
              animate={{ x: ["0%", "-30%"] }}
              transition={{ duration: 300, ease: "linear", repeat: Infinity }}
              className="flex items-center gap-10 whitespace-nowrap text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-brand-text/18"
            >
              {repeatLong.map((_, i) => (
                <React.Fragment key={i}>
                  <span className="tracking-[0.4em] lowercase text-brand-accent/30 font-bold">{theme.highlightWord}</span>
                  <span>•</span>
                  <span>{theme.systemTag}</span>
                  <span>•</span>
                  <span className="text-transparent [-webkit-text-stroke:1.2px_rgba(5,5,5,0.14)] lowercase font-bold">{theme.primaryWord}</span>
                  <span>•</span>
                  <span>EST. 2024</span>
                  <span>•</span>
                  <span className="text-brand-text/25 font-bold">[ {theme.primaryWord} ]</span>
                  <span>•</span>
                  <span>{theme.specimenDescriptor}</span>
                  <span>•</span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
