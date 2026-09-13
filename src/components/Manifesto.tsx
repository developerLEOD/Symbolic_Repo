import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, Compass, Shield, Award, Sparkles } from "lucide-react";
import LiquidCarveButton from "./LiquidCarveButton";

interface ManifestoProps {
  onBack: () => void;
  onAbout?: () => void;
}

const observations = [
  {
    code: "01",
    title: "YOU ARE NOT CORPORATE BILLBOARD SPACE",
    body: "Modern streetwear and fashion ask you to pay high prices to become walking advertisements for another company's logo. What you wear should communicate your own values and identity—not increase another brand's equity."
  },
  {
    code: "02",
    title: "THE SYMBOL BELONGS TO THE WEARER",
    body: "A symbol printed on your chest should express something about who you are: conviction, discipline, patience, and purpose. SYMBOLIC remains discreet on the interior label because the primary canvas belongs to you."
  },
  {
    code: "03",
    title: "CONFIDENT, UNAPOLOGETIC IDENTITY",
    body: "Muslim identity is not a decorative novelty or a fleeting subculture trend. It is a profound worldview defined by dignity, restraint, and unwavering conviction. We express this through sharp, deliberate, uncompromising form."
  },
  {
    code: "04",
    title: "PERMANENCE OVER THE DROP CYCLE",
    body: "Disposable fast fashion manufactures disposable identity. We build dense 400 GSM organic cotton and high-fire stoneware designed to withstand years of active daily wear and study."
  },
  {
    code: "05",
    title: "THE HIERARCHY OF WEARING",
    body: "WEARER → STATEMENT & SYMBOL → ARTIFACT → BRAND. In that exact order. The brand is merely the maker; the statement is yours."
  },
  {
    code: "06",
    title: "OWN LESS, STAND FOR MORE",
    body: "Reject mindless accumulation. Choose deliberate pieces that represent what you refuse to compromise on, and wear them with intentionality."
  }
];

export default function Manifesto({ onBack, onAbout }: ManifestoProps) {
  useEffect(() => {
    document.title = "SYMBOLIC // Foundational Manifesto & Doctrine";
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-brand-bg pt-10 sm:pt-14 pb-24 border-b-2 border-brand-text"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
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
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest bg-brand-text text-brand-bg px-2.5 py-1">
                MANIFESTO // 01
              </span>
              <span className="font-mono text-xs uppercase font-bold text-brand-text/60">
                FOUNDATIONAL DOCTRINE // WHY WE WEAR WHAT WE WEAR
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-mono font-black uppercase text-brand-text leading-[0.9] tracking-tighter">
              WEAR WHAT YOU STAND FOR.
            </h1>

            <div className="space-y-4 max-w-3xl border-l-4 border-brand-accent pl-5">
              <p className="font-mono text-sm sm:text-base uppercase text-brand-text font-bold leading-relaxed">
                <span className="inline-flex flex-col items-end align-middle mr-1.5">
                  <span className="font-black text-sm sm:text-base leading-none">SYMBOLIC</span>
                  <span className="text-[10px] sm:text-[11px] font-bold italic text-brand-accent leading-none mt-0.5">MUSLIMS</span>
                </span>
                exists for those who refuse to be walking billboards. We create heavyweight garments, headwear, and vessels where the symbol represents the wearer's identity—not a brand's corporate status.
              </p>
              <p className="font-mono text-xs uppercase text-brand-text/70 leading-relaxed">
                What we choose to possess and wear should communicate what we stand for.
              </p>
            </div>
          </section>

          {/* Primary Axiom Block */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="lg:col-span-7 bg-brand-surface border-2 border-brand-text p-8 shadow-[6px_6px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] transition-shadow space-y-6 cursor-default"
            >
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  THE CORE BENCHMARK
                </span>
                <span className="font-mono text-[10px] bg-brand-text text-brand-bg px-2 py-0.5 font-bold">IDENTITY FIRST</span>
              </div>
              <h2 className="font-mono text-2xl sm:text-3xl font-black uppercase text-brand-text tracking-tight">
                SELF-REPRESENTATION OVER CORPORATE PROMOTION.
              </h2>
              <div className="font-mono text-xs uppercase space-y-4 text-brand-text/80 leading-relaxed">
                <p>
                  Most contemporary clothing turns the wearer into an unpaid advertising surface for multinational logos. People wear brands to signal external status rather than internal conviction.
                </p>
                <p>
                  SYMBOLIC flips this relationship. We keep our branding secondary on interior tags, making the graphic space on the garment a canvas for symbols that communicate personal identity, resilience, and our Deen.
                </p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="lg:col-span-5 bg-brand-text text-brand-bg p-8 border-2 border-brand-text flex flex-col justify-between shadow-[6px_6px_0px_#050505] hover:shadow-[8px_8px_0px_#050505] transition-shadow cursor-default"
            >
              <div className="space-y-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                  OUR CONVICTION
                </span>
                <p className="font-mono text-xl sm:text-2xl font-black uppercase leading-snug">
                  "WE CHOOSE TO WEAR WHAT WE STAND FOR, RATHER THAN TURNING OURSELVES INTO WALKING BANNERS FOR OTHER BRANDS."
                </p>
              </div>
              <div className="pt-6 border-t border-white/20 font-mono text-[10px] uppercase tracking-widest text-brand-accent font-bold flex items-center gap-2">
                <span className="inline-flex flex-col items-end">
                  <span className="text-white text-[11px] font-black leading-tight">SYMBOLIC</span>
                  <span className="text-[8.5px] font-bold italic text-brand-accent leading-none">MUSLIMS</span>
                </span>
                <span className="text-white/60">// SERIES 01</span>
              </div>
            </motion.div>
          </section>

          {/* Six Observations Grid */}
          <section className="space-y-8">
            <div className="border-b-2 border-brand-text pb-4 flex justify-between items-end">
              <div>
                <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest">[ 06 OBSERVATIONS ]</span>
                <h3 className="font-mono text-2xl sm:text-4xl font-black uppercase tracking-tight text-brand-text mt-1">
                  THE SIX OBSERVATIONS
                </h3>
              </div>
              <span className="font-mono text-xs uppercase font-bold text-brand-text/60 hidden sm:inline">
                REPRESENT YOURSELF
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {observations.map((item, idx) => (
                <motion.div 
                  key={item.code}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 350, damping: 25, delay: idx * 0.06 }}
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                  className="bg-brand-surface border-2 border-brand-text p-6 space-y-4 shadow-[4px_4px_0px_#050505] hover:shadow-[7px_7px_0px_#050505] transition-shadow duration-200 flex flex-col justify-between cursor-default"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                        OBSERVATION // {item.code}
                      </span>
                      <span className="w-2 h-2 bg-brand-text inline-block"></span>
                    </div>
                    <h4 className="font-mono text-sm sm:text-base font-black uppercase tracking-tight text-brand-text leading-snug">
                      {item.title}
                    </h4>
                    <p className="font-mono text-xs uppercase text-brand-text/80 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Bottom Action Section */}
          <section className="bg-brand-surface border-2 border-brand-text p-10 sm:p-14 text-center space-y-6 shadow-[6px_6px_0px_#050505]">
            <h3 className="font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-brand-text">
              CHOOSE WHAT YOU REPRESENT
            </h3>
            <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/80 max-w-xl mx-auto leading-relaxed">
              Explore heavyweight garments, clean headwear, and stoneware vessels built to communicate who you are.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <LiquidCarveButton 
                onClick={onBack}
                variant="primary"
                className="px-10 py-4 text-xs font-mono font-black"
              >
                <span>EXPLORE ALL ARTIFACTS →</span>
              </LiquidCarveButton>
              {onAbout && (
                <LiquidCarveButton 
                  onClick={onAbout}
                  variant="outline"
                  className="px-8 py-4 text-xs font-mono font-black"
                >
                  <span>ABOUT THE MARK &amp; LEOD →</span>
                </LiquidCarveButton>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
