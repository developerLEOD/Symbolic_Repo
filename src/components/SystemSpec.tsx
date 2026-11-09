import React from "react";
import { motion } from "motion/react";
import { Shield, Layers, Scale, Sparkles, CheckCircle2 } from "lucide-react";

interface SpecItem {
  id: string;
  category: string;
  headline: string;
  standard: string;
  gauge: string;
  details: string;
  rationale: string;
}

const SYSTEM_SPECIFICATIONS: SpecItem[] = [
  {
    id: "01",
    category: "WEAR // TEXTILE ARMOR",
    headline: "HEAVYWEIGHT BOX-CUT COMBED COTTON",
    standard: "400 - 450 GSM INTERLOCK DENSE GAUGE",
    gauge: "450 GSM",
    details: "100% compact combed ring-spun cotton. High-density 2x2 ribbing on collar and cuffs. Double-faced French Terry pullovers and drop-shoulder structural silhouette.",
    rationale: "Eliminates cling and flimsy drape. Builds a rigid silhouette that belongs to the wearer rather than disposable fast-fashion trends."
  },
  {
    id: "02",
    category: "VESSELS // ARTISAN STONEWARE",
    headline: "HIGH-FIRED BASALT CERAMIC OBJECTS",
    standard: "1,280°C STONEWARE MATRIX // 380ML CAPACITY",
    gauge: "420G BASE",
    details: "High-temperature kiln vitreous ceramic stoneware with matte basalt mineral glaze. Hand-cast ergonomic handle and debossed SYMBOLIC seal on base.",
    rationale: "Thermal mass retention for contemplative solitary morning rituals. Built for decades of daily physical presence."
  },
  {
    id: "03",
    category: "HEADWEAR // STRUCTURAL CROWN",
    headline: "6-PANEL BRUSHED COTTON TWILL",
    standard: "280 GSM BIO-WASHED HEAVY TWILL // BRASS CLASP",
    gauge: "280 GSM",
    details: "Uncompromising structured crown with tonal high-density precision embroidery. Matte anti-corrosive brass tension clasp with tucked strap.",
    rationale: "Clean brutalist profile that holds shape through rain, travel, and prolonged disciplined wear."
  },
  {
    id: "04",
    category: "INSCRIPTION // WITNESS MATRIX",
    headline: "ARCHIVAL PERMANENT EMULSION DISCHARGE",
    standard: "WATER-BASED DISCHARGE MATRIX // INTERIOR BRANDING",
    gauge: "ZERO-FEEL",
    details: "Direct-to-fiber breathable pigment binding that softens with wash rather than cracking. SYMBOLIC branding is strictly relegated to interior neck tags.",
    rationale: "You are not a corporate billboard. The exterior surface carries your inward theological conviction, not a company logo."
  }
];

export default function SystemSpec() {
  return (
    <section 
      id="system-specifications"
      aria-label="Symbolic Architecture System Specifications"
      className="py-20 bg-brand-bg border-b-2 border-brand-text px-4 sm:px-8 select-none"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 gap-4">
          <div>
            <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest bg-brand-accent/10 px-3 py-1 border border-brand-accent/30 inline-block">
              [ 03 // ARCHITECTURAL SYSTEM SPECIFICATIONS ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-2 text-brand-text">
              MATERIALITY &amp; TACTILE GAUGE
            </h2>
          </div>
          <div className="font-mono text-xs text-brand-text/70 uppercase max-w-sm tracking-wide">
            // UNCOMPROMISING HARDWARE STANDARDS. BUILT TO OUTLAST THE COMMODITY CULTURE OF PLANNED OBSOLESCENCE.
          </div>
        </div>

        {/* 4-Column Brutalist Spec Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SYSTEM_SPECIFICATIONS.map((spec) => (
            <motion.div
              key={spec.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-brand-surface border-2 border-brand-text p-6 flex flex-col justify-between hover:border-brand-accent transition-colors shadow-[4px_4px_0px_0px_#050505] relative group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                  <span className="font-mono text-[10px] font-black text-brand-accent tracking-wider uppercase">
                    SPEC // {spec.id}
                  </span>
                  <span className="font-mono text-[10px] font-black bg-brand-text text-brand-bg px-2 py-0.5 uppercase">
                    {spec.gauge}
                  </span>
                </div>

                <div>
                  <span className="font-mono text-[9px] font-black text-brand-text/60 tracking-wider uppercase block">
                    {spec.category}
                  </span>
                  <h3 className="font-mono text-base font-black text-brand-text uppercase tracking-tight mt-1 group-hover:text-brand-accent transition-colors">
                    {spec.headline}
                  </h3>
                </div>

                <div className="bg-brand-bg/70 p-2.5 border border-brand-text/20 font-mono text-[10px] font-bold text-brand-text uppercase leading-relaxed">
                  {spec.standard}
                </div>

                <p className="font-sans text-xs text-brand-text/80 leading-relaxed">
                  {spec.details}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-brand-text/10">
                <span className="font-mono text-[9px] font-black text-brand-text/50 uppercase block mb-1">
                  // ARCHITECTURAL RATIONALE:
                </span>
                <p className="font-mono text-[10px] text-brand-text/70 italic leading-snug">
                  "{spec.rationale}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
