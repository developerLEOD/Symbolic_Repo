import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const STATUS_MESSAGES = [
  {
    primary: "CURATING ARCHIVAL OBJECTS & SPECIMENS",
    secondary: "INDEXING 400 GSM HOODIES, STONEWARE & HEADWEAR"
  },
  {
    primary: "CALIBRATING MULTI-ANGLE PERSPECTIVES",
    secondary: "PREPARING HIGH-FIDELITY TACTILE ARCHIVES"
  },
  {
    primary: "HARMONIZING DESIGN ETHOS & INSCRIPTIONS",
    secondary: "CRAFTED WITH INTENT • WEAR WITH PURPOSE"
  },
  {
    primary: "THE ARCHIVE OF CONSCIOUS MUSLIMS",
    secondary: "LAUNCHING POSSESSION & IDENTITY STUDIO"
  }
];

export default function LoadingScreen() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const current = STATUS_MESSAGES[index];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-brand-bg px-4 py-8 sm:py-12 select-none font-mono">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#050505_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* Top Balancing Spacer */}
      <div className="h-4 sm:h-8 w-full shrink-0" />

      {/* Center: Brand Logo & Title */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center my-auto">
        {/* Clean, Prominent Brand Logo Container (without + ornaments) */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0.9 }}
          animate={{ scale: [0.97, 1.02, 0.97], opacity: [0.93, 1, 0.93] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 mb-6 shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 sm:border-[3px] border-brand-text shadow-[6px_6px_0px_#050505]"
        >
          <img 
            src="/Logo_NoName.jpg" 
            alt="SYMBOLIC" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-3.5 sm:p-4"
          />
        </motion.div>

        {/* Brand Lockup: Increased SYMBOLIC size with refined proportional MUSLIMS gap */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex flex-col items-end leading-none">
            <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-black tracking-tight uppercase text-brand-text leading-none">
              SYMBOLIC
            </span>
            <span className="text-base sm:text-lg md:text-xl font-mono font-black italic tracking-normal text-brand-accent uppercase leading-none mt-0 sm:mt-0">
              MUSLIMS
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-mono tracking-widest text-brand-text/50 uppercase mt-2.5 font-semibold">
            POSSESSION &amp; IDENTITY STUDIO
          </p>
        </div>
      </div>

      {/* Bottom Part: Loading Progress Bar and Animated Loading Text */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center pb-2 sm:pb-4 shrink-0">
        {/* Brutalist Progress Indicator */}
        <div className="w-56 sm:w-64 h-2 bg-brand-surface border-2 border-brand-text overflow-hidden shadow-[3px_3px_0px_#050505] mb-3">
          <motion.div 
            className="h-full bg-brand-accent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </div>

        {/* Animated Rotating Status Text Container positioned at bottom */}
        <div className="h-12 sm:h-14 flex flex-col items-center justify-center w-full px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-1 w-full"
            >
              <p className="text-[11px] sm:text-xs font-mono font-black tracking-[0.16em] uppercase text-brand-text leading-tight">
                {current.primary}
              </p>
              <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-brand-accent font-bold uppercase leading-tight">
                {current.secondary}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
