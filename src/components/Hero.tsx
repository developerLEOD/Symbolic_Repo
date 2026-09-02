import { motion } from "motion/react";
import LiquidCarveButton from "./LiquidCarveButton";

interface HeroProps {
  onExplore: () => void;
  onWhy: () => void;
}

export default function Hero({ onExplore, onWhy }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text">
      {/* Top Benchmark Bar */}
      <div className="flex flex-wrap justify-between items-center text-[9px] sm:text-[10px] font-mono tracking-widest uppercase border-b border-brand-text/30 pb-3 mb-12 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-accent inline-block"></span>
          <span className="font-bold">SYMBOLIC / MUSLIMS</span>
        </div>
        <span className="text-brand-text/70 hidden sm:inline">PERSON → POSSESSION → SYMBOL → IDENTITY</span>
        <span className="text-brand-accent font-bold">REPRESENT YOURSELF</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Core Display */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-8 space-y-8"
        >
          {/* Proposition Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-text text-brand-bg font-mono text-[10px] font-black uppercase tracking-widest border-2 border-brand-text">
            <span>POSSESSION & IDENTITY</span>
            <span className="text-brand-accent">//</span>
            <span className="text-brand-bg/75">SERIES 01</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="inline-block bg-brand-accent text-white pl-3 sm:pl-4 pr-4 pt-[13px] pb-0 mt-[-4px] ml-0 text-5xl sm:text-7xl lg:text-8xl font-mono font-black uppercase tracking-tighter leading-[0.88] border-2 border-brand-text shadow-[4px_4px_0px_#050505]">
                BE SYMBOLIC.
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-mono font-bold uppercase tracking-tighter text-brand-text leading-[0.88]">
              WEAR WHAT YOU STAND FOR.
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-4xl lg:text-5xl font-mono font-black text-brand-accent tracking-tight uppercase">
                NOT A BRAND'S LOGO.
              </span>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl border-l-4 border-brand-accent pl-5">
            <p className="text-sm sm:text-base font-mono uppercase tracking-wide text-brand-text font-bold leading-relaxed">
              What we possess and wear should communicate who we are and what we stand for—not turn us into walking advertisements for another company.
            </p>
            <p className="text-xs font-mono uppercase tracking-wider text-brand-text/70 leading-relaxed">
              400 GSM heavyweight organic cotton, unbranded twill headwear, and high-fire ceramic stoneware. Built with minimal external branding so the symbol belongs entirely to the wearer.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <LiquidCarveButton 
              onClick={onExplore}
              variant="primary"
              className="px-8 py-4 text-xs font-mono font-black"
            >
              <span>CHOOSE WHAT YOU REPRESENT →</span>
            </LiquidCarveButton>
            <LiquidCarveButton 
              onClick={onWhy}
              variant="secondary"
              className="px-8 py-4 text-xs font-mono font-black"
            >
              <span>WHY WE WEAR THIS →</span>
            </LiquidCarveButton>
          </div>
        </motion.div>

        {/* Right Benchmark Criteria Block */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="lg:col-span-4 bg-brand-surface border-2 border-brand-text p-6 sm:p-7 shadow-[6px_6px_0px_#050505] space-y-6"
        >
          <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
            <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-text">
              THE BENCHMARK
            </span>
            <span className="text-[10px] font-mono bg-brand-text text-brand-bg px-2 py-0.5 font-bold">04 CRITERIA</span>
          </div>

          <div className="space-y-3.5 font-mono text-xs">
            <div className="border-b border-brand-text/20 pb-2.5">
              <span className="text-brand-accent font-black block text-[10px]">01 // SYMBOL OVER LOGO</span>
              <p className="text-[11px] text-brand-text/80 uppercase font-bold mt-0.5">The graphic carries personal meaning, not a corporation's status symbol.</p>
            </div>
            <div className="border-b border-brand-text/20 pb-2.5">
              <span className="text-brand-accent font-black block text-[10px]">02 // SECONDARY BRANDING</span>
              <p className="text-[11px] text-brand-text/80 uppercase font-bold mt-0.5">Brand identifiers are kept to discreet interior labels.</p>
            </div>
            <div className="border-b border-brand-text/20 pb-2.5">
              <span className="text-brand-accent font-black block text-[10px]">03 // DENSE SUBSTANCE</span>
              <p className="text-[11px] text-brand-text/80 uppercase font-bold mt-0.5">400 GSM combed cotton and high-fire ceramic built for years of daily use.</p>
            </div>
            <div>
              <span className="text-brand-accent font-black block text-[10px]">04 // INTENTIONAL OWNERSHIP</span>
              <p className="text-[11px] text-brand-text/80 uppercase font-bold mt-0.5">Fewer, deliberate objects that reflect genuine conviction.</p>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-brand-text text-[9px] font-mono tracking-widest uppercase text-brand-text/60 font-bold flex items-center justify-between">
            <span>[ CHOICE ]</span>
            <span>[ SYMBOL ]</span>
            <span>[ IDENTITY ]</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


