import { useState, useEffect } from "react";
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

  const telemetryBadges = [
    { label: "MATERIAL DENSITY", value: 400, suffix: " GSM", icon: Layers, note: "Unbleached Heavyweight 2-Ply" },
    { label: "COMMERCIAL NOISE", value: 0, suffix: "%", icon: ShieldCheck, note: "Zero Outer Logomania" },
    { label: "CONVICTION PURITY", value: 100, suffix: "%", icon: Fingerprint, note: "Personal Sovereign Doctrine" },
    { label: "STRUCTURAL LIFESPAN", value: 10, suffix: " YR+", icon: Activity, note: "Monolithic Mineral & Cotton" },
  ];

  return (
    <section className="relative pt-32 pb-24 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text overflow-hidden">
      {/* Industrial Corner Crosshairs with Pulse */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 z-10 text-brand-text/40 font-mono text-[9px] font-bold select-none">
        <motion.span
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[#ff4500]"
        >
          +
        </motion.span>
        <span className="tracking-widest">FOUNDRY:33.68°N/73.04°E</span>
      </div>

      <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 z-10 text-brand-text/40 font-mono text-[9px] font-bold select-none">
        <span className="tracking-widest">CORPUS:RATIFIED // V2.6</span>
        <motion.span
          initial={{ scale: 0, rotate: 90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[#ff4500]"
        >
          +
        </motion.span>
      </div>

      {/* Top Benchmark Bar with Pulsing Radar and Live Identity Stream */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-wrap justify-between items-center text-[9px] sm:text-[10px] font-mono tracking-widest uppercase border-b-2 border-brand-text/20 pb-3.5 mb-10 gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full bg-[#ff4500] opacity-75"></span>
            <span className="relative inline-flex w-2.5 h-2.5 bg-[#ff4500] border border-black"></span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-black text-[11px] sm:text-[12px] leading-tight text-brand-text tracking-wider">
              SYMBOLIC
            </span>
            <span className="font-mono text-[9px] font-bold italic text-brand-accent tracking-wider">
              / MUSLIMS
            </span>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 bg-brand-text/5 border border-brand-text/20 text-[8.5px] font-bold text-brand-text/70">
            SOVEREIGN MANIFESTO // SERIES 01
          </span>
        </div>

        <div className="flex items-center gap-4 text-brand-text/70 hidden sm:flex">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="text-[#ff4500] font-black"
          >
            ●
          </motion.span>
          <span className="tracking-widest">INDIVIDUAL → ARTIFACT → SYMBOL → IDENTITY</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-[#ff4500] animate-pulse"></span>
          <span className="text-[#ff4500] font-bold tracking-wider">[ EMBODY YOUR CONVICTION ]</span>
        </div>
      </motion.div>

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
              <span>POSSESSION & IDENTITY FOUNDRY</span>
              <span className="text-[#ff4500]">//</span>
              <span className="text-brand-bg/80">CORPUS 01</span>
            </div>
          </motion.div>

          {/* Staggered Kinetic Headline with Spring Physics */}
          <div className="space-y-2.5">
            {/* "BE SYMBOLIC." Stamp with 3D Pop & Hover Tilt */}
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
                className="inline-block bg-brand-accent text-white pl-3.5 sm:pl-5 pr-5 pt-[14px] pb-1 mt-[-4px] ml-0 text-5xl sm:text-7xl lg:text-8xl font-mono font-black uppercase tracking-tighter leading-[0.88] border-2 border-brand-text shadow-[6px_6px_0px_#050505] cursor-default select-none transition-shadow hover:shadow-[8px_8px_0px_#050505]"
              >
                BE SYMBOLIC.
              </motion.span>
            </motion.div>

            {/* Masked Slide-up Line 1 */}
            <div className="overflow-hidden pt-1.5">
              <motion.h1
                variants={lineMaskVariant}
                className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-mono font-bold uppercase tracking-tighter text-brand-text leading-[0.88]"
              >
                WEAR WHAT YOU STAND FOR.
              </motion.h1>
            </div>

            {/* Masked Slide-up Line 2 */}
            <div className="overflow-hidden pt-1 flex items-baseline gap-3">
              <motion.span
                variants={lineMaskVariant}
                className="text-2xl sm:text-4xl lg:text-5xl font-mono font-black text-[#ff4500] tracking-tight uppercase"
              >
                NOT A BRAND'S LOGO.
              </motion.span>
            </div>
          </div>

          {/* Dynamic Manifesto Quote with Expanding Architectural Accent */}
          <motion.div variants={itemSlideUp} className="relative max-w-2xl pl-5 py-1">
            {/* Animated left accent pillar that grows vertically */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ff4500] origin-top"
            />
            <div>
              <p className="text-sm sm:text-base font-mono uppercase tracking-wide text-brand-text font-bold leading-relaxed">
                What we possess and wear should communicate who we are and what we stand for—not turn us into walking advertisements for another company.
              </p>
            </div>
          </motion.div>

          {/* Kinetic Telemetry Strip: Real-time Count-up Specs */}
          <motion.div
            variants={itemSlideUp}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1"
          >
            {telemetryBadges.map((badge, idx) => {
              const IconComp = badge.icon;
              return (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + idx * 0.08, duration: 0.5 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  className="bg-brand-surface border-2 border-brand-text p-3 shadow-[3px_3px_0px_#050505] hover:shadow-[4px_4px_0px_#ff4500] transition-all group"
                >
                  <div className="flex items-center justify-between text-brand-text/60 mb-1.5">
                    <span className="font-mono text-[8px] font-black tracking-widest uppercase">
                      {badge.label}
                    </span>
                    <IconComp size={12} className="text-[#ff4500] group-hover:rotate-12 transition-transform" />
                  </div>
                  <div className="font-mono text-lg sm:text-xl font-black text-brand-text tracking-tight">
                    <CountUpNumber end={badge.value} suffix={badge.suffix} delay={0.5 + idx * 0.1} />
                  </div>
                  <div className="font-mono text-[8.5px] text-brand-text/60 uppercase font-semibold mt-0.5 truncate">
                    {badge.note}
                  </div>
                </motion.div>
              );
            })}
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
                EXPLORE SPECIMEN CORPUS
                <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </LiquidCarveButton>

            <LiquidCarveButton
              onClick={onWhy}
              variant="secondary"
              className="px-8 py-4 text-xs font-mono font-black group"
            >
              <span className="flex items-center gap-2">
                INSPECT THE DOCTRINE
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </LiquidCarveButton>
          </motion.div>
        </motion.div>

        {/* Right Prominent Official Emblem Display */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start pt-10 lg:pt-16">
          <div className="flex flex-col items-center justify-center text-center px-2 pb-2 sm:px-4 sm:pb-4 w-full">
            {/* The Actual Official SYMBOLIC Logo Emblem with Pop-up Spring Entrance and 2D Tilt */}
            <motion.div
              initial={{ opacity: 0, scale: 0.45, rotate: -8, y: 40 }}
              animate={{ opacity: 1, scale: 1, rotate: -3, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.22 }}
              whileHover={{ 
                rotate: 2.5, 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 15 } 
              }}
              whileTap={{ 
                rotate: -5, 
                scale: 0.97,
                transition: { type: "spring", stiffness: 450, damping: 15 } 
              }}
              className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-64 lg:h-64 border-3 sm:border-4 border-black overflow-hidden bg-brand-surface shadow-[8px_8px_0px_#050505] hover:shadow-[12px_12px_0px_#ff4500] transition-shadow duration-200 cursor-pointer select-none"
            >
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC Official Emblem" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
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
            { num: "04", title: "INTENTIONAL OWNERSHIP", desc: "Fewer, deliberate objects that reflect genuine conviction." }
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
              <p className="text-[11.5px] text-brand-text/80 uppercase font-bold leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}




