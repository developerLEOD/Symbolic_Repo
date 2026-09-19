import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  Fingerprint, 
  Sparkles,
  ArrowUpRight,
  MoveRight
} from "lucide-react";
import LiquidCarveButton from "./LiquidCarveButton";
import { soundManager } from "../lib/soundEffects";

interface HeroProps {
  onExplore: () => void;
  onWhy: () => void;
}

// Animated count-up component for live telemetry numbers
function CountUpNumber({ end, duration = 1.2, suffix = "", delay = 0.2 }: { end: number; duration?: number; suffix?: string; delay?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let timer: NodeJS.Timeout;

    timer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        setCount(Math.floor(easeOutQuad * end));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setCount(end);
        }
      };
      window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [end, duration, delay]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function Hero({ onExplore, onWhy }: HeroProps) {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.04,
      },
    },
  };

  const itemSlideUp = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const lineMaskVariant = {
    hidden: { y: "110%", opacity: 0 },
    visible: {
      y: "0%",
      opacity: 1,
      transition: {
        duration: 0.75,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const coreJourneySteps = [
    { step: "01", name: "DISCOVER", detail: "Curated collection of symbolic artifacts" },
    { step: "02", name: "EXAMINE", detail: "Multi-perspective structural documentation" },
    { step: "03", name: "DECIPHER", detail: "The symbol, inscription & ethos" },
    { step: "04", name: "EMBODY", detail: "Carry the conviction into the world" }
  ];

  return (
    <section className="relative pt-10 sm:pt-14 pb-20 sm:pb-24 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text overflow-hidden">
      {/* Main Hero Split Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Core Display Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7 space-y-7"
        >
          {/* Proposition Tag with Kinetic Stamp Pulse */}
          <motion.div variants={itemSlideUp} className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-text text-brand-bg font-mono text-[10px] font-black uppercase tracking-widest border-2 border-brand-text shadow-[2px_2px_0px_#ff4500]">
              <span className="inline-block w-1.5 h-1.5 bg-[#ff4500]"></span>
              <span>POSSESSION STUDIO</span>
              <span className="text-[#ff4500]">//</span>
              <span className="text-brand-bg/80">PHYSICAL OBJECTS &amp; ARTIFACTS</span>
            </div>
          </motion.div>

          {/* Core Hierarchy: BE SYMBOLIC + Clear Explanation */}
          <div className="space-y-4">
            {/* Primary Headline: BE SYMBOLIC. */}
            <motion.div
              variants={itemSlideUp}
              className="inline-block"
            >
              <motion.span
                initial={{ scale: 0.88, rotate: -2.5, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 18,
                  delay: 0.12,
                }}
                whileHover={{
                  scale: 1.03,
                  rotate: -0.8,
                  transition: { type: "spring", stiffness: 450, damping: 14 },
                }}
                className="inline-block bg-brand-accent text-white pl-4 sm:pl-6 pr-6 pt-3.5 pb-2 text-5xl sm:text-7xl lg:text-8xl font-mono font-black uppercase tracking-tighter leading-[0.88] border-2 border-brand-text shadow-[6px_6px_0px_#050505] cursor-default select-none transition-shadow hover:shadow-[8px_8px_0px_#050505]"
              >
                BE SYMBOLIC.
              </motion.span>
            </motion.div>

            {/* Clear Sub-headline: What BE SYMBOLIC means in human terms */}
            <div className="overflow-hidden pt-1">
              <motion.h2
                variants={lineMaskVariant}
                className="text-2xl sm:text-4xl lg:text-5xl font-mono font-black uppercase tracking-tight text-brand-text leading-[1.08]"
              >
                Objects that carry what you believe, value, and choose to represent.
              </motion.h2>
            </div>
          </div>

          {/* Clear Product Statement: What SYMBOLIC Muslims creates */}
          <motion.div variants={itemSlideUp} className="relative max-w-2xl pl-5 py-2">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ff4500] origin-top"
            />
            <div>
              <p className="text-sm sm:text-base font-mono uppercase tracking-wide text-brand-text font-bold leading-relaxed">
                What you carry says something. Make it worth saying.
              </p>
            </div>
          </motion.div>

          {/* Interactive CTA Action Row */}
          <motion.div
            variants={itemSlideUp}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3"
          >
            <LiquidCarveButton
              onClick={onExplore}
              variant="primary"
              className="px-8 py-4 text-xs font-mono font-black group"
            >
              <span className="flex items-center gap-2">
                ENTER THE COLLECTION
                <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </LiquidCarveButton>

            <LiquidCarveButton
              onClick={onWhy}
              variant="secondary"
              className="px-8 py-4 text-xs font-mono font-black group"
            >
              <span className="flex items-center gap-2">
                MANIFESTO
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </LiquidCarveButton>
          </motion.div>
        </motion.div>

        {/* Right Prominent Official Emblem Display with Sideways Tilt Effect */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start pt-10 lg:pt-16">
          <div className="flex flex-col items-center justify-center text-center px-2 pb-2 sm:px-4 sm:pb-4 w-full">
            {/* The Actual Official SYMBOLIC Logo Emblem - Tilted sideways by default like Be Symbol, tilting more on hover */}
            <motion.div
              initial={{ scale: 0.88, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 18,
                delay: 0.12,
              }}
              whileHover={{
                scale: 1.04,
                rotate: -8.5,
                transition: { type: "spring", stiffness: 450, damping: 14 },
              }}
              onMouseEnter={() => soundManager.playHover(0.04)}
              className="relative cursor-pointer select-none"
            >
              <div
                className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-64 lg:h-64 border-3 sm:border-4 border-black overflow-hidden bg-brand-surface select-none shadow-[6px_6px_0px_#050505] hover:shadow-[9px_9px_0px_#050505] transition-shadow duration-200 relative"
              >
                <img 
                  src="/Logo_NoName.jpg" 
                  alt="SYMBOLIC Official Emblem" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />

                {/* Corner Architectural Coordinate Markers */}
                <div className="absolute top-1.5 left-1.5 font-mono text-[7px] font-black text-black/50 pointer-events-none">
                  +01
                </div>
                <div className="absolute bottom-1.5 right-1.5 font-mono text-[7px] font-black text-black/50 pointer-events-none">
                  SPEC:SYM-00
                </div>
              </div>
            </motion.div>

            {/* Emblem Specifications Callout with Pop-up Spring Entrance */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.6, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.42 }}
              className="mt-8 sm:mt-9 space-y-3 max-w-sm"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-brand-text text-brand-bg font-mono text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-brand-text shadow-[3px_3px_0px_#ff4500]">
                <span className="w-2 h-2 bg-[#ff4500] inline-block animate-pulse"></span>
                MONOLITHIC IDENTITY EMBLEM
              </div>
              <div className="font-mono text-xs sm:text-[12.5px] text-brand-text/85 uppercase tracking-wider font-bold flex items-center justify-center gap-2 pt-0.5">
                <span>ORANGE: CONFORMITY</span>
                <span className="text-[#ff4500]">•</span>
                <span className="text-[#ff4500] font-black">WHITE DISC: STAND APART</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* The 4-Step Core Journey Protocol (Full-Width) */}
      <motion.div
        variants={itemSlideUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative z-10 mt-14 space-y-4"
      >
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-widest text-brand-text/75">
          <span className="w-2 h-2 bg-brand-accent inline-block border border-brand-text" />
          <span>THE ARTIFACT ENCOUNTER // 4-STAGE PROTOCOL</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          {coreJourneySteps.map((s, idx) => {
            const isSelected = activeStep === s.step;
            return (
              <motion.div 
                key={s.step}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 450, damping: 20 }}
                onMouseEnter={() => soundManager.playHover(0.03)}
                onClick={() => {
                  soundManager.playClick(0.12);
                  setActiveStep(isSelected ? null : s.step);
                }}
                className={`border-2 border-brand-text p-4 shadow-[4px_4px_0px_#050505] hover:shadow-[7px_7px_0px_#050505] transition-colors flex flex-col justify-between min-h-[120px] cursor-pointer select-none ${
                  isSelected ? "bg-brand-text text-brand-bg shadow-[6px_6px_0px_#ff4500]" : "bg-brand-surface text-brand-text"
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-black pb-2 border-b-2 ${isSelected ? "border-brand-bg/20 text-brand-accent" : "border-brand-text/15 text-brand-accent"}`}>
                  <span>STAGE {s.step}</span>
                  <motion.span 
                    animate={{ x: isSelected ? [0, 3, 0] : 0 }}
                    transition={{ repeat: isSelected ? Infinity : 0, duration: 1 }}
                    className={`text-[10px] uppercase font-black ${isSelected ? "text-brand-bg" : "text-brand-text/50"}`}
                  >
                    {idx < 4 ? '→' : '■'}
                  </motion.span>
                </div>
                <div className="pt-2 flex-1 flex flex-col justify-start">
                  <div className={`text-sm sm:text-[15px] font-black tracking-wide uppercase leading-tight ${isSelected ? "text-brand-bg" : "text-brand-text"}`}>
                    {s.name}
                  </div>
                  <div className={`text-[10px] sm:text-[11px] font-bold uppercase leading-snug mt-1.5 ${isSelected ? "text-brand-bg/80" : "text-brand-text/80"}`}>
                    {s.detail}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Repositioned Benchmark 04 Criteria Full-Width Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mt-16 pt-8 border-t-2 border-brand-text bg-brand-surface border-2 border-brand-text p-6 sm:p-8 shadow-[6px_6px_0px_#050505]"
      >
        <div className="flex flex-wrap items-center justify-between border-b-2 border-brand-text pb-4 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#ff4500] inline-block"></span>
            <span className="font-mono text-sm font-black uppercase tracking-widest text-brand-text">
              THE BENCHMARK // 04 CRITERIA
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase text-brand-text/70 font-bold">
            <span className="hidden sm:inline">[ CHOICE • SYMBOL • IDENTITY ]</span>
            <span className="bg-brand-text text-brand-bg px-2.5 py-1 font-black">
              STANDARD SPEC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
          {[
            { num: "01", title: "SYMBOL OVER LOGO", desc: "The graphic carries personal meaning, not a corporation's status symbol." },
            { num: "02", title: "SECONDARY BRANDING", desc: "Brand identifiers are kept to discreet interior labels." },
            { num: "03", title: "DENSE SUBSTANCE", desc: "400 GSM combed cotton and high-fire ceramic built for years of daily use." },
            { num: "04", title: "INTENTIONAL OWNERSHIP", desc: "Fewer, deliberate artifacts that reflect genuine conviction." }
          ].map((item) => (
            <motion.div
              key={item.num}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="p-4 bg-brand-bg border-2 border-brand-text/40 hover:border-brand-text hover:shadow-[4px_4px_0px_#ff4500] transition-all cursor-default group"
            >
              <span className="text-[#ff4500] font-black block text-[11px] mb-1.5 group-hover:underline">
                {item.num} // {item.title}
              </span>
              <p className="font-space-grotesk text-[12.5px] text-brand-text/85 normal-case font-normal leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}




