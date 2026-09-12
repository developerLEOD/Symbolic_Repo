import { motion } from "motion/react";

export default function SystemSpec() {
  const specs = [
    {
      id: "01",
      category: "WEAR MEDIUM",
      standard: "400 GSM COMBED ORGANIC COTTON",
      detail: "Dense, preshrunk heavyweight jersey with zero synthetic blending. Minimal exterior branding leaves the canvas for symbols of personal conviction.",
      mandate: "WEARER-FIRST CANVAS"
    },
    {
      id: "02",
      category: "HEADWEAR MEDIUM",
      standard: "280 GSM STRUCTURED COTTON TWILL",
      detail: "Clean 6-panel crown with matte steel tension clasp. Free from corporate logos, communicating focus and composure through clean form.",
      mandate: "ZERO BILLBOARDS"
    },
    {
      id: "03",
      category: "VESSELS MEDIUM",
      standard: "1,280°C HIGH-FIRE STONEWARE",
      detail: "High-density mineral ceramic with weighted thermal base. Engineered for daily routines of reflection, focus, and purposeful gathering.",
      mandate: "PERMANENT SUBSTANCE"
    },
    {
      id: "04",
      category: "PRODUCTION ETHIC",
      standard: "INTENTIONAL LIMITED RUNS",
      detail: "Strict batch limits without artificial hype or fast-fashion drop cycles. Artifacts intended to be owned, maintained, and worn for years.",
      mandate: "OWN LESS, STAND FOR MORE"
    }
  ];

  return (
    <section className="py-20 px-6 sm:px-10 max-w-7xl mx-auto border-b-2 border-brand-text">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-brand-text pb-4 mb-10 gap-4">
        <div>
          <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 03 // PRODUCTION CRITERIA ]</span>
          <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1 text-brand-text">
            STANDARDS & INTEGRITY
          </h2>
        </div>
        <div className="font-mono text-xs uppercase font-bold text-brand-text/70">
          SYMBOLIC // STANDARDS
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {specs.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 350, damping: 25, delay: idx * 0.08 }}
            whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            className="bg-brand-surface border-2 border-brand-text p-6 flex flex-col justify-between shadow-[4px_4px_0px_#050505] hover:shadow-[7px_7px_0px_#050505] transition-shadow duration-200 space-y-6 cursor-default"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  {item.category}
                </span>
                <span className="font-mono text-[10px] font-bold bg-brand-text text-brand-bg px-1.5 py-0.5">
                  [ {item.id} ]
                </span>
              </div>
              <h3 className="font-mono text-base font-black uppercase tracking-tight text-brand-text">
                {item.standard}
              </h3>
              <p className="font-mono text-xs uppercase text-brand-text/80 leading-relaxed">
                {item.detail}
              </p>
            </div>

            <div className="pt-3 border-t border-brand-text/20 font-mono text-[9px] font-black uppercase tracking-widest text-brand-accent">
              {item.mandate}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
