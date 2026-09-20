import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Compass, ShieldCheck, MapPin, Sparkles, ExternalLink } from "lucide-react";
import LiquidCarveButton from "./LiquidCarveButton";
import { soundManager } from "../lib/soundEffects";

interface AboutProps {
  onBack: () => void;
  onWhyWeWear?: () => void;
}

export default function About({ onBack, onWhyWeWear }: AboutProps) {
  useEffect(() => {
    document.title = "SYMBOLIC // About & Identity Dossier";
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-transparent pt-10 sm:pt-14 pb-24 border-b-2 border-brand-text"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-10">
        {/* Navigation Return Button */}
        <motion.button 
          whileHover={{ scale: 1.04, x: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-brand-text hover:text-brand-accent transition-colors mb-12 border-2 border-brand-text bg-brand-surface px-4 py-2 shadow-[2px_2px_0px_#050505] cursor-pointer"
        >
          <ArrowLeft size={14} /> [ RETURN TO HOMEPAGE ]
        </motion.button>

        <div className="space-y-20">
          {/* Folio Header */}
          <section className="border-b-2 border-brand-text pb-12 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest bg-brand-text text-brand-bg px-2.5 py-1">
                IDENTITY ARCHIVE // 00
              </span>
              <span className="font-mono text-xs uppercase font-bold text-brand-text/60">
                GENESIS, THE MARK &amp; THE MISSION
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-mono font-black uppercase text-brand-text leading-[0.95] tracking-tighter">
              THE MARK OF THE DISTINCT.
            </h1>

            <div className="space-y-4 max-w-3xl border-l-4 border-brand-accent pl-5">
              <p className="font-mono text-sm sm:text-base normal-case text-brand-text font-medium leading-relaxed">
                SYMBOLIC is a manifestation of conviction, deliberate possession, and unapologetic identity. Rooted in the mission to establish our Deen through daily presence.
              </p>
              <p className="font-mono text-xs sm:text-[13px] normal-case text-brand-text/70 leading-relaxed">
                Atelier Archive // Under the Let’s Establish Our Deen (LEOD) Mission.
              </p>
            </div>
          </section>

          {/* SECTION 1: THE LOGO */}
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-brand-text pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-brand-accent inline-block shrink-0" />
                <h2 className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-brand-text">
                  SECTION 01 // THE LOGO
                </h2>
              </div>
              <span className="self-start sm:self-auto font-mono text-[9px] sm:text-[10px] font-bold bg-brand-surface border border-brand-text px-2.5 py-1 uppercase whitespace-nowrap shadow-[2px_2px_0px_#050505]">
                EMBLEM DECODED
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Visual Breakdown Artifact */}
              <div className="lg:col-span-5 bg-brand-surface border-2 border-brand-text p-8 shadow-[6px_6px_0px_#050505] flex flex-col justify-between space-y-8">
                <div>
                  <div className="flex items-center justify-between border-b border-brand-text/20 pb-3 mb-6">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                      VISUAL SCHEMATIC
                    </span>
                    <span className="font-mono text-[10px] bg-brand-text text-brand-bg px-2 py-0.5 font-bold">
                      RATIO 1:1
                    </span>
                  </div>

                  {/* Logo Display Canvas */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative aspect-square max-w-[280px] mx-auto bg-brand-bg border-2 border-brand-text shadow-[6px_6px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] transition-shadow p-6 flex flex-col items-center justify-center cursor-default"
                  >
                    {/* Actual official logo */}
                    <div 
                      className="w-40 h-40 relative flex items-center justify-center border-2 border-brand-text shadow-[4px_4px_0px_#050505] overflow-hidden bg-brand-surface"
                    >
                      <img 
                        src="/Logo_NoName.jpg" 
                        alt="SYMBOLIC Logo: A small white circle in an orange square" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    {/* Callout tags */}
                    <div className="mt-4 flex items-center justify-between w-full font-mono text-[9px] text-brand-text/60 uppercase">
                      <span>[ ORANGE SQUARE ]</span>
                      <span>[ WHITE CIRCLE ]</span>
                    </div>
                  </motion.div>
                </div>

                {/* Blueprint Dimension Specs */}
                <div className="bg-brand-bg border border-brand-text/30 p-4 space-y-2 font-mono text-[10px] uppercase">
                  <div className="flex justify-between border-b border-brand-text/10 pb-1">
                    <span className="text-brand-text/60">PRIMARY FORM:</span>
                    <span className="font-bold">ORANGE SQUARE (#E04006)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-text/10 pb-1">
                    <span className="text-brand-text/60">FOCAL ELEMENT:</span>
                    <span className="font-bold">SMALL WHITE CIRCLE (#FFFFFF)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text/60">CONSTRUCTION:</span>
                    <span className="font-bold text-brand-accent">DISCRETE &amp; UNCOMPROMISING</span>
                  </div>
                </div>
              </div>

              {/* Explanatory Narrative for the Logo */}
              <div className="lg:col-span-7 bg-brand-surface border-2 border-brand-text p-8 sm:p-10 shadow-[6px_6px_0px_#050505] flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-text text-brand-bg font-mono text-[10px] font-black uppercase tracking-widest border border-brand-text">
                    <Sparkles size={12} className="text-brand-accent" />
                    <span>THE PHILOSOPHY OF THE MARK</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-mono font-black uppercase text-brand-text tracking-tight leading-tight">
                    "THE LOGO REPRESENTS SOCIETY THROUGH ORANGE, WHICH SYMBOLIZES CONSUMERISM AND CONFORMITY, WHILE THE WHITE CIRCLE REPRESENTS THE SYMBOLIC MUSLIM WHO, DESPITE EXISTING WITHIN IT, REMAINS UNAPOLOGETICALLY DISTINCT."
                  </h3>


                  <div className="font-mono text-xs sm:text-[13px] normal-case space-y-4 text-brand-text/85 leading-relaxed border-l-2 border-brand-text pl-4">
                    <p>
                      At first glance, the mark is composed of an unmistakable orange square anchoring a singular, solid white circle.
                    </p>
                    <p>
                      The orange square establishes the surrounding space—a vibrant, uniform field representing the world, the environment, and the conventional crowd that conforms to standard molds.
                    </p>
                    <p className="text-brand-text font-bold">
                      Set within this plane is a small white circle: solitary, sharp, and resolute. It represents the one who stands apart—the individual whose visual presence, character, and appearance refuse to dissolve into the background.
                    </p>
                    <p>
                      In a society dominated by homogeneous trends and corporate consumerism, being distinct through dignity, modesty, and righteous conviction is not a compromise—it is our strength.
                    </p>
                  </div>
                </div>

                {/* Key Observations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-text/20 font-mono">
                  <div className="p-3 bg-brand-bg border border-brand-text">
                    <span className="text-brand-accent text-[10px] font-black uppercase block mb-1">
                      01 // VISUAL CONTRAST
                    </span>
                    <p className="text-[11px] sm:text-xs normal-case text-brand-text/80 leading-relaxed">
                      Unapologetic contrast against the surrounding plane. Recognizable from distance, enduring in presence.
                    </p>
                  </div>
                  <div className="p-3 bg-brand-bg border border-brand-text">
                    <span className="text-brand-accent text-[10px] font-black uppercase block mb-1">
                      02 // UNCOMPROMISED CHARACTER
                    </span>
                    <p className="text-[11px] sm:text-xs normal-case text-brand-text/80 leading-relaxed">
                      The white dot holds its form without fading or warping, symbolizing steadfast adherence to core values.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: THE BACKGROUND & ROOTS */}
          <section className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-brand-text pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-brand-accent inline-block shrink-0" />
                <h2 className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-brand-text">
                  SECTION 02 // BACKGROUND &amp; ORIGIN
                </h2>
              </div>
              <span className="self-start sm:self-auto font-mono text-[9px] sm:text-[10px] font-bold bg-brand-surface border border-brand-text px-2.5 py-1 uppercase whitespace-nowrap shadow-[2px_2px_0px_#050505]">
                ATELIER ARCHIVE // MISSION LEOD
              </span>
            </div>

            {/* Main Card with Diamond Specimen on Top-Right Corner */}
            <div className="relative mt-8 sm:mt-12 md:mt-16 bg-brand-surface border-2 border-brand-text p-6 sm:p-10 md:p-12 shadow-[6px_6px_0px_#050505] space-y-8 sm:space-y-10">
              {/* Overlapping Corner Specimen: 90-degree rotated square containing owner portrait */}
              <div 
                className="absolute -top-8 -right-4 sm:-top-12 sm:-right-6 md:-top-14 md:-right-8 z-20 group"
                title="Symbolic Founder & Architect // LEOD Mission"
              >
                {/* 90-Degree Rotated Square Frame (Diamond) overlapping the card boundaries */}
                <div 
                  onMouseEnter={() => soundManager.playHover()}
                  onClick={() => soundManager.playClick()}
                  className="relative w-26 h-26 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white group-hover:bg-brand-accent hover:bg-brand-accent border-2 sm:border-3 md:border-4 border-brand-text shadow-[5px_5px_0px_#050505] sm:shadow-[7px_7px_0px_#050505] rotate-45 overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-[8px_8px_0px_#050505] cursor-pointer"
                >
                  {/* Counter-rotated image container so the owner picture remains upright and balanced */}
                  <div className="-rotate-45 w-[145%] h-[145%] flex items-center justify-center overflow-hidden">
                    <img 
                      src="/Owner_Pic.png" 
                      alt="Owner of Symbolic // LEOD Mission"
                      className="w-full h-full object-cover object-[50%_18%] filter contrast-105 drop-shadow-sm select-none transition-transform duration-300 group-hover:scale-105"
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Overlapping Brutalist Identifier Tag */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 sm:-bottom-3.5 md:-bottom-4 bg-brand-text text-brand-bg px-2.5 sm:px-3.5 py-0.5 sm:py-1 font-mono text-[8px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505] sm:shadow-[3px_3px_0px_#050505] border border-brand-surface whitespace-nowrap z-30">
                  [ ARCHITECT // OWNER ]
                </div>
              </div>

              {/* Card Badges: Padded on the right so the enlarged corner diamond never overlaps the badges */}
              <div className="pr-28 sm:pr-40 md:pr-56">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 bg-brand-accent text-white font-mono text-xs font-black uppercase tracking-widest border border-brand-text shadow-[2px_2px_0px_#050505]">
                    FOUNDATIONAL ROOTS
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-brand-text uppercase bg-brand-bg px-2.5 py-1 border border-brand-text/30 shadow-[1px_1px_0px_#050505]">
                    <ShieldCheck size={14} className="text-brand-accent shrink-0" /> ATELIER ARCHIVE
                  </span>
                </div>
                <div className="font-mono text-[10px] uppercase font-bold text-brand-text/60 tracking-wider mt-2">
                  SOVEREIGN INITIATIVE // EST. DEEN MISSION
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-mono font-black uppercase text-brand-text tracking-tight leading-tight">
                    BORN AS A SUB-PROJECT UNDER THE LET’S ESTABLISH OUR DEEN (LEOD) MISSION.
                  </h3>

                  <div className="font-mono text-xs sm:text-sm normal-case space-y-4 text-brand-text/90 leading-relaxed">
                    <p className="font-bold text-brand-accent">
                      Symbolic is owned by a Muslim who initiated this brand as a sub-project under the Let’s Establish Our Deen (LEOD) mission.
                    </p>
                    <p>
                      The LEOD mission is grounded in a singular aspiration: reviving, establishing, and proudly upholding our Deen (the holistic Islamic System, principles, and comprehensive way of life) across every facet of modern daily experience.
                    </p>
                    <p>
                      For years, modern merchandise and streetwear have forced youth to become passive billboards for foreign secular corporations, wearing symbols devoid of spiritual depth or personal resonance.
                    </p>
                    <p>
                      SYMBOLIC was initiated to provide an alternative: heavyweight, minimalist, and meticulously crafted possessions that allow believers to embody their convictions with quiet strength and uncompromising dignity.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
                  {/* LEOD Mission Spec Card */}
                  <div className="bg-brand-bg border-2 border-brand-text p-6 shadow-[4px_4px_0px_#050505] space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                        MISSION SPECIFICATION
                      </span>
                      <ShieldCheck size={14} className="text-brand-accent" />
                    </div>

                    <div className="space-y-3 font-mono text-[11px] uppercase">
                      <div>
                        <span className="text-brand-text/60 block text-[9px]">PARENT INITIATIVE</span>
                        <span className="font-black text-brand-text text-xs">LET’S ESTABLISH OUR DEEN (LEOD)</span>
                      </div>
                      <div>
                        <span className="text-brand-text/60 block text-[9px]">ORIGIN ARCHIVE</span>
                        <span className="font-bold text-brand-text">ATELIER REGISTRY</span>
                      </div>
                      <div>
                        <span className="text-brand-text/60 block text-[9px]">CORE DIRECTIVE</span>
                        <span className="font-bold text-brand-text">DEEN-CONSCIOUS DAILY POSSESSIONS</span>
                      </div>
                      <div>
                        <span className="text-brand-text/60 block text-[9px]">MANUFACTURING MANDATE</span>
                        <span className="font-bold text-brand-accent">HEAVYWEIGHT // ZERO CORPORATE BILLBOARDING</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-text text-brand-bg p-5 border-2 border-brand-text font-mono text-xs space-y-2">
                    <p className="font-black text-brand-accent uppercase">
                      [ ESTABLISHING THE DEEN ]
                    </p>
                    <p className="text-[11px] sm:text-xs normal-case leading-relaxed text-brand-bg/90">
                      Our Deen is not confined to private thought—it shapes what we value, how we walk, and what we choose to represent in the public square.
                    </p>
                  </div>
                </div>
              </div>

              {/* Three Pillars Grid */}
              <div className="pt-8 border-t-2 border-brand-text grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
                <motion.div 
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-6 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] transition-shadow space-y-2 cursor-default"
                >
                  <span className="text-[10px] font-black text-brand-accent tracking-widest uppercase">
                    PILLAR 01 // IDENTITY
                  </span>
                  <h4 className="text-sm font-black uppercase text-brand-text">
                    DISTINCT APPEARANCE
                  </h4>
                  <p className="text-xs sm:text-[13px] normal-case text-brand-text/80 leading-relaxed">
                    Representing the believer whose appearance and manner stand distinct from the crowd with self-respect and intentionality.
                  </p>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-6 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] transition-shadow space-y-2 cursor-default"
                >
                  <span className="text-[10px] font-black text-brand-accent tracking-widest uppercase">
                    PILLAR 02 // INTENTIONALITY
                  </span>
                  <h4 className="text-sm font-black uppercase text-brand-text">
                    NO BILLBOARD STATUS
                  </h4>
                  <p className="text-xs sm:text-[13px] normal-case text-brand-text/80 leading-relaxed">
                    External labels remain discrete. The symbol on your chest or desk belongs to your values, not our corporate marketing.
                  </p>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-6 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] transition-shadow space-y-2 cursor-default"
                >
                  <span className="text-[10px] font-black text-brand-accent tracking-widest uppercase">
                    PILLAR 03 // MISSION
                  </span>
                  <h4 className="text-sm font-black uppercase text-brand-text">
                    ESTABLISHING OUR DEEN
                  </h4>
                  <p className="text-xs sm:text-[13px] normal-case text-brand-text/80 leading-relaxed">
                    An active sub-project of LEOD designed to cultivate self-esteem, Islamic consciousness, and purposeful youth living.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Action Navigation Footer */}
          <section className="bg-brand-surface border-2 border-brand-text p-8 sm:p-10 shadow-[6px_6px_0px_#050505] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                EXPLORE THE ARCHIVES
              </span>
              <h3 className="font-mono text-xl sm:text-2xl font-black uppercase text-brand-text">
                EXPERIENCE THE PHYSICAL ARTIFACTS
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <LiquidCarveButton
                onClick={onBack}
                variant="primary"
                className="px-6 py-3.5 text-xs font-mono font-black"
              >
                <span>BROWSE THE CATALOG →</span>
              </LiquidCarveButton>
              {onWhyWeWear && (
                <LiquidCarveButton
                  onClick={onWhyWeWear}
                  variant="outline"
                  className="px-6 py-3.5 text-xs font-mono font-black"
                >
                  <span>READ THE MANIFESTO →</span>
                </LiquidCarveButton>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
