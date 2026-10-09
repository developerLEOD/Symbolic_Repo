import { motion } from "motion/react";
import LiquidCarveButton from "./LiquidCarveButton";

interface PhilosophyProps {
  onReadManifesto?: () => void;
  onReadAbout?: () => void;
}

export default function Philosophy({ onReadManifesto, onReadAbout }: PhilosophyProps) {
  const tenets = [
    {
      id: "01",
      title: "REFUSAL OF BILLBOARD CULTURE",
      description: "When you wear a giant corporate logo, you pay for the privilege of advertising another company. What you wear should communicate your own convictions, not their brand equity.",
      mandate: "YOU ARE NOT A BILLBOARD"
    },
    {
      id: "02",
      title: "THE SYMBOL BELONGS TO YOU",
      description: "Every symbol we print represents an idea: conviction, patience, discipline, and clarity. SYMBOLIC remains secondary on interior labels so your identity stays primary.",
      mandate: "WEARER OVER BRAND"
    },
    {
      id: "03",
      title: "OBJECTS OF WEIGHT & INTENTION",
      description: "Disposable fashion produces disposable identity. We build dense 400 GSM textiles and high-fire ceramic stoneware intended for years of disciplined daily use.",
      mandate: "INTENTIONAL POSSESSION"
    }
  ];

  return (
    <section className="py-20 bg-brand-surface/50 backdrop-blur-sm border-b-2 border-brand-text px-6 sm:px-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 gap-4">
          <div>
            <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest bg-brand-accent/10 px-3 py-1 rounded-none border border-brand-accent/30 inline-block">
              [ 04 // CORE TENETS ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-2 text-brand-text">
              WHY WE WEAR WHAT WE WEAR
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onReadAbout && (
              <LiquidCarveButton 
                onClick={onReadAbout}
                variant="outline"
                shape="pill"
                className="py-3 text-xs font-mono font-black"
              >
                <span>ABOUT THE MARK &amp; MISSION →</span>
              </LiquidCarveButton>
            )}
            {onReadManifesto && (
              <LiquidCarveButton 
                onClick={onReadManifesto}
                variant="secondary"
                shape="pill"
                className="py-3 text-xs font-mono font-black"
              >
                <span>READ FULL MANIFESTO →</span>
              </LiquidCarveButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tenets.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 350, damping: 25, delay: idx * 0.09 }}
              whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 25 } }}
              className="p-7 sm:p-8 bg-brand-surface/85 backdrop-blur-md border-2 border-brand-text rounded-none space-y-5 shadow-[6px_6px_0px_#050505] hover:shadow-[9px_9px_0px_#050505] transition-all flex flex-col justify-between cursor-default group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-text/20 pb-3">
                  <span className="font-mono text-[9.5px] font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-none border border-brand-accent/30">
                    PRINCIPLE // {item.id}
                  </span>
                  <span className="w-9 h-9 rounded-none border-2 border-brand-text bg-brand-bg text-brand-accent flex items-center justify-center font-mono text-xs font-black shadow-[2px_2px_0px_#050505] group-hover:scale-105 transition-transform">
                    {item.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-mono font-black uppercase tracking-tight text-brand-text leading-snug">
                  {item.title}
                </h3>
                <p className="font-space-grotesk text-xs sm:text-[13px] normal-case text-brand-text/80 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
              <div className="pt-3 border-t border-brand-text/20 font-mono text-[9px] font-bold uppercase text-brand-accent bg-brand-bg/90 px-3.5 py-1.5 rounded-none border border-brand-text/25 inline-block text-center">
                {item.mandate}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}



