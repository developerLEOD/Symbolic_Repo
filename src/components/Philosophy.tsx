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
    <section className="py-20 bg-brand-surface border-b-2 border-brand-text px-6 sm:px-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 gap-4">
          <div>
            <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 04 // CORE TENETS ]</span>
            <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1 text-brand-text">
              WHY WE WEAR WHAT WE WEAR
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onReadAbout && (
              <LiquidCarveButton 
                onClick={onReadAbout}
                variant="outline"
                className="py-3 text-xs font-mono font-black"
              >
                <span>THE LOGO &amp; LEOD MISSION →</span>
              </LiquidCarveButton>
            )}
            {onReadManifesto && (
              <LiquidCarveButton 
                onClick={onReadManifesto}
                variant="secondary"
                className="py-3 text-xs font-mono font-black"
              >
                <span>READ OBSERVATIONS →</span>
              </LiquidCarveButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tenets.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="p-6 bg-brand-bg border-2 border-brand-text space-y-4 shadow-[4px_4px_0px_#050505] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                    PRINCIPLE // {item.id}
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-brand-text text-brand-bg px-1.5 py-0.5">
                    [ {item.id} ]
                  </span>
                </div>
                <h3 className="text-base font-mono font-black uppercase tracking-tight text-brand-text">
                  {item.title}
                </h3>
                <p className="font-mono text-xs uppercase text-brand-text/80 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="pt-3 border-t border-brand-text/20 font-mono text-[9px] font-bold uppercase text-brand-accent">
                {item.mandate}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}



