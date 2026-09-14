import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Minus, 
  Plus, 
  Edit3, 
  Trash2, 
  Sliders, 
  ArrowLeft, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  Maximize2, 
  Ruler, 
  ArrowUpRight,
  Info,
  Bell,
  Clock,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, ProductVariant, CartItem } from "../types";
import LiquidCarveButton from "./LiquidCarveButton";
import { normalizeProductCategory, normalizeProductCollection, resolveProductImages, STUDIO_FALLBACK_IMAGE } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";
import { PRESET_SYMBOL_KNOWLEDGE } from "../lib/symbolKnowledge";

interface ProductDetailProps {
  product: Product;
  categoryLabel: string;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onOpenLedger?: () => void;
  onEditProduct?: (productId: string) => void;
  onDeleteProduct?: (productId: string, productName: string) => Promise<void> | void;
}

// Symbolic deep knowledge base mapping when detailed thesis fields are not filled
interface SymbolDossier {
  represents: string;
  whyChosen: string;
  communicates: string;
  wearerCarries: string;
}

const DEFAULT_SYMBOL_KNOWLEDGE: Record<string, SymbolDossier> = {
  "أَلِف": {
    represents: "The primary vertical stroke of the Arabic alphabet—symbolizing Divine Oneness (Tawhid), unbending uprightness, and moral clarity that refuses to bow to compromise or falsehood.",
    whyChosen: "The human spine is engineered to stand vertical and steadfast. Alif was chosen as the inaugural symbol because upright moral character precedes all outer adornment.",
    communicates: "An unflinching refusal to compromise sacred principles for social approval. It tells the observer that the individual is anchored to truth.",
    wearerCarries: "An internal oath to maintain total honesty in speech, integrity in dealings, and steadfastness when solitary or public."
  },
  "صُمُود": {
    represents: "Sumud: the enduring Palestinian and Quranic discipline of steadfast rootedness, unyielding perseverance, and steadfast defiance against erasure.",
    whyChosen: "Solidarity with Falasteen is not a fleeting trend or seasonal hashtag; it is an enduring covenant. The symbol anchors this conviction in physical, tactile armor.",
    communicates: "Active, deliberate alignment with the resilient spirit of Palestine and the righteous resistance of an enduring people.",
    wearerCarries: "The solemn memory of ancestral land, the responsibility of bearing moral witness, and daily solidarity in prayers and actions."
  },
  "أَدَب": {
    represents: "Adab: spiritual etiquette, refined restraint, intellectual humility, and the moral discipline that elevates bare knowledge into lived wisdom.",
    whyChosen: "True scholars and seekers have historically prioritized the cultivation of character before the accumulation of intellect. Adab is the vessel through which knowledge is received.",
    communicates: "Quiet intellectual reverence, respect for sacred teachers and tradition, and intentional restraint of speech and appetite.",
    wearerCarries: "The daily reminder that the seeker must first humble the ego before seeking to illuminate the mind."
  },
  "بَصِيرَة": {
    represents: "Basirah: the interior perception and spiritual discernment that penetrates outward illusions to perceive the essential reality of things.",
    whyChosen: "In a consumer society drowned in superficial stimuli and noise, Basirah serves as an optical anchor to return the mind to essential, eternal truths.",
    communicates: "Prioritizing spiritual depth and character over external appearances and societal validation.",
    wearerCarries: "The intentional discipline of guarding the gaze, filtering mental input, and seeking divine guidance in discernment."
  },
  "أَمَانَة": {
    represents: "Amanah: the sacred trust and custodial responsibility placed upon human beings as stewards rather than exploiters of creation.",
    whyChosen: "Everything we bear—our bodies, our intellect, our possessions, and our words—constitutes a sacred trust that will be accounted for.",
    communicates: "Careful custody, professional excellence, and ethical integrity in carrying out responsibilities.",
    wearerCarries: "The consciousness that privilege demands duty, and that all physical resources are entrusted for purposeful service."
  }
};

export default function ProductDetail({ 
  product, 
  categoryLabel, 
  onClose, 
  onAddToCart,
  onOpenLedger,
  onEditProduct,
  onDeleteProduct
}: ProductDetailProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [added, setAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [showStickyAcquire, setShowStickyAcquire] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const isSoldOut = product.inventory !== undefined && product.inventory <= 0;

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail) return;
    soundManager.playClick();
    setNotifySubmitted(true);
  };

  const dossierContainerRef = useRef<HTMLDivElement>(null);
  const possessionRef = useRef<HTMLDivElement>(null);

  const mediumType = normalizeProductCategory(product).toUpperCase();
  const collectionName = normalizeProductCollection(product);
  const collectionTag = collectionName.toUpperCase();

  // Extract clean numerical artifact ID (e.g. "SYM-04" -> "04", "SYM-TSH-001" -> "01")
  const rawId = product.productId || product.sku || product.id || "";
  const numericMatch = rawId.match(/\d+/);
  const artifactNumber = numericMatch 
    ? String(parseInt(numericMatch[0], 10)).padStart(3, "0") 
    : "001";
  const specimenNumber = artifactNumber;
  const objectNumber = artifactNumber;

  // Derive monumental artifact name
  const rawName = product.name.trim();
  const artifactTitle = rawName
    .replace(/^THE\s+/i, "")
    .replace(/\s+(HEAVYWEIGHT|FIELD|VESSEL|CAP|TOTE|TEE|HOODIE|STONEWARE)/gi, "")
    .trim() || rawName;

  const editionLabel = product.edition?.replace(/ARTIFACTS/gi, "SPECIMENS") || "050 SPECIMENS // FIRST EDITION";

  // Conceptual tagline / thesis
  const conceptualStatement = product.symbolicTagline || 
    product.wearingCommunicates || 
    product.statement || 
    "STEADFAST CONVICTION, MATERIALIZED.";

  // Fetch product variants from Firestore
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products", product.id, "variants"));
        const vars = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductVariant));
        setVariants(vars);
        
        if (vars.length > 0) {
          const initialOptions: { [key: string]: string } = {};
          if (vars[0].option1Name) initialOptions[vars[0].option1Name] = vars[0].option1Value!;
          if (vars[0].option2Name) initialOptions[vars[0].option2Name] = vars[0].option2Value!;
          if (vars[0].option3Name) initialOptions[vars[0].option3Name] = vars[0].option3Value!;
          setSelectedOptions(initialOptions);
        } else {
          // If no variants in Firestore and item is wearable, provide standard size default
          if (mediumType === "WEAR") {
            setSelectedOptions({ Size: "M" });
          }
        }
      } catch (err) {
        console.warn("Could not fetch variants:", err);
      }
    };
    fetchVariants();
    window.scrollTo(0, 0);
  }, [product, mediumType]);

  const images = resolveProductImages(product);

  // Keyboard navigation & scroll listener for sticky acquire bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        soundManager.playToggle(0.06);
        setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        soundManager.playToggle(0.06);
        setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
      } else if (e.key === "Escape") {
        if (showFullscreenImage) {
          setShowFullscreenImage(false);
        } else if (showSizeGuide) {
          setShowSizeGuide(false);
        } else {
          onClose();
        }
      }
    };

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowStickyAcquire(scrollTop > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [images.length, showFullscreenImage, showSizeGuide, onClose]);

  const selectedVariant = variants.find(v => {
    const vOptions: { [key: string]: string } = {};
    if (v.option1Name) vOptions[v.option1Name] = v.option1Value!;
    if (v.option2Name) vOptions[v.option2Name] = v.option2Value!;
    if (v.option3Name) vOptions[v.option3Name] = v.option3Value!;
    
    return JSON.stringify(vOptions) === JSON.stringify(selectedOptions);
  });

  const handleOptionSelect = (name: string, value: string) => {
    soundManager.playToggle(0.08);
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const getOptionValues = (name: string): string[] => {
    const values = new Set<string>();
    variants.forEach(v => {
      if (v.option1Name === name && v.option1Value) values.add(v.option1Value);
      if (v.option2Name === name && v.option2Value) values.add(v.option2Value);
      if (v.option3Name === name && v.option3Value) values.add(v.option3Value);
    });
    return Array.from(values);
  };

  const optionNames = Array.from(new Set(variants.flatMap(v => [v.option1Name, v.option2Name, v.option3Name].filter(Boolean) as string[])));

  const handlePossess = () => {
    soundManager.playAcquire(0.28);
    onAddToCart({
      id: `${product.id}-${selectedVariant?.id || 'default'}`,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      quantity: quantity,
      image: images[activeImageIndex],
      categoryLabel: `${mediumType} // ${collectionTag}`,
      options: selectedOptions
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const scrollToSection = (id: string) => {
    soundManager.playToggle(0.06);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Derive symbolic details and prioritize custom owner-edited pillars
  const cleanInscription = product.inscription?.replace(/^#\s*/, "").trim() || "";

  // Documentation Perspectives
  const documentationPlates = [
    {
      title: "PRIMARY angles",
      subtitle: "FRONTAL FORM & SILHOUETTE",
      detail: "Overall physical presence, architectural proportions, and structural balance."
    },
    {
      title: "TACTILE TEXTURE & GRAIN",
      subtitle: "FIBER COMPOSITION & SURFACE DENSITY",
      detail: "High-density weave / stoneware mineral glaze under neutral studio daylight."
    },
    {
      title: "THE INSCRIPTION",
      subtitle: "SCRIPTURAL DEBOSS & CALLIGRAPHIC EMBED",
      detail: "Zero exterior corporate logos. Conviction motif applied with archival precision."
    },
    {
      title: "CONSTRUCTION & JOINERY",
      subtitle: "SEAMS, REINFORCEMENTS & INTERNAL TAPE",
      detail: "Double-needle coverstitching, interior collar binding, and stress-point bar tacks."
    },
    {
      title: "SOVEREIGNTY PROFILE",
      subtitle: "REVERSE angles & INTERNAL MARK",
      detail: "Clean unadorned back. The surface belongs completely to the sovereign wearer."
    }
  ];
  const presetKnowledge = PRESET_SYMBOL_KNOWLEDGE[cleanInscription] || PRESET_SYMBOL_KNOWLEDGE[product.name] || DEFAULT_SYMBOL_KNOWLEDGE[cleanInscription];

  const symbolKnowledge = {
    represents: product.pillar1Represents || product.statementMeaning || presetKnowledge?.represents || "A scriptural distillation of unbending virtue and spiritual integrity.",
    whyChosen: product.pillar2WhyChosen || product.representation || presetKnowledge?.whyChosen || "Chosen as a tangible reminder that physical possessions must ground the soul rather than distract it.",
    communicates: product.pillar3Communicates || product.wearingCommunicates || presetKnowledge?.communicates || "A dignified refusal to conform to transient trends or commercialized identities.",
    wearerCarries: product.pillar4WearerCarries || product.statement || presetKnowledge?.wearerCarries || "An unwavering oath to embody moral uprightness, humility, and steadfast courage in public spaces."
  };

  return (
    <div 
      ref={dossierContainerRef}
      className="w-full min-h-screen bg-brand-bg text-brand-text"
    >
      {/* 1. TOP ARCHIVAL DOSSIER NAVIGATION BAR */}
      <header className="sticky top-14 sm:top-16 z-30 bg-brand-bg/95 backdrop-blur-md border-b-2 border-brand-text shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Left: Return action & Specimen Reference */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 font-mono text-[10.5px] sm:text-xs font-black uppercase tracking-wider text-brand-text hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer border-2 border-brand-text px-3 py-1.5 bg-brand-surface shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ArrowLeft size={13} /> 
              <span>[ RETURN TO HOMEPAGE ]</span>
            </button>

            <div className="hidden sm:flex items-center gap-2.5 font-mono text-[10.5px] font-black uppercase tracking-wider">
              <span className="text-brand-accent">ARTIFACT DOSSIER // {artifactNumber}</span>
              <span className="opacity-30">/</span>
              <span className="text-brand-text bg-brand-surface px-2 py-0.5 border border-brand-text text-[9px] font-black">
                {collectionTag}
              </span>
            </div>
          </div>

          {/* Right: Quick Section Jump Navigation & Close */}
          <div className="flex items-center gap-3">
            <nav className="hidden xl:flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              <button 
                type="button"
                onClick={() => scrollToSection("dossier-identity")} 
                className="px-2 py-1 text-brand-text/80 hover:text-brand-accent cursor-pointer transition-colors"
              >
                #IDENTITY
              </button>
              <span className="opacity-30">/</span>
              <button 
                type="button"
                onClick={() => scrollToSection("dossier-visuals")} 
                className="px-2 py-1 text-brand-text/80 hover:text-brand-accent cursor-pointer transition-colors"
              >
                #VISUALS
              </button>
              <span className="opacity-30">/</span>
              <button 
                type="button"
                onClick={() => scrollToSection("dossier-symbol")} 
                className="px-2 py-1 text-brand-text/80 hover:text-brand-accent cursor-pointer transition-colors"
              >
                #THE-SYMBOL
              </button>
              <span className="opacity-30">/</span>
              <button 
                type="button"
                onClick={() => scrollToSection("dossier-specimen")} 
                className="px-2 py-1 text-brand-text/80 hover:text-brand-accent cursor-pointer transition-colors"
              >
                #THE-ARTIFACT
              </button>
              <span className="opacity-30">/</span>
              <button 
                type="button"
                onClick={() => scrollToSection("dossier-possession")} 
                className="px-2.5 py-1 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_#050505]"
              >
                #POSSESSION
              </button>
            </nav>

            {/* Copy Dossier Direct URL */}
            <button 
              type="button"
              onClick={() => {
                soundManager.playClick();
                const identifier = product.productId || product.sku || product.id;
                const canonicalUrl = `${window.location.origin}/artifact/${identifier}`;
                navigator.clipboard?.writeText(canonicalUrl).then(() => {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2400);
                }).catch(() => {
                  // Fallback
                  try {
                    navigator.clipboard?.writeText(window.location.href);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2400);
                  } catch (e) {}
                });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#050505] text-[10px] font-mono font-black uppercase tracking-wider"
              title="Copy Artifact URL"
            >
              {copiedLink ? (
                <>
                  <Check size={13} className="text-brand-accent" />
                  <span className="hidden sm:inline">URL COPIED</span>
                </>
              ) : (
                <>
                  <Share2 size={13} />
                  <span className="hidden sm:inline">SHARE</span>
                </>
              )}
            </button>

            {/* Close Action */}
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#050505]"
              title="Dismiss Dossier"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. OWNER ARCHIVIST CONTROLS (When Edit/Delete are provided) */}
      {(onEditProduct || onDeleteProduct) && (
        <div className="bg-brand-surface border-b-2 border-brand-text">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-black tracking-widest text-brand-accent">
              <Sliders size={13} />
              <span>STUDIO ARCHIVIST CONTROLS // {product.productId || product.sku}</span>
            </div>
            <div className="flex items-center gap-2">
              {onEditProduct && (
                <button
                  type="button"
                  onClick={() => onEditProduct(product.id)}
                  className="px-3 py-1 bg-brand-text text-brand-bg font-mono text-[9px] font-black uppercase tracking-widest hover:bg-brand-accent hover:text-white flex items-center gap-1.5 transition-colors border border-brand-text cursor-pointer"
                >
                  <Edit3 size={11} /> EDIT RECORD
                </button>
              )}
              {onDeleteProduct && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1 bg-red-600 text-white font-mono text-[9px] font-black uppercase tracking-widest hover:bg-red-700 flex items-center gap-1.5 transition-colors border border-brand-text cursor-pointer"
                >
                  <Trash2 size={11} /> EXPUNGE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN SPECIMEN DOSSIER BODY */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-12 sm:py-16 space-y-24">

        {/* ============================================================
            SECTION 1: ARTIFACT IDENTIFICATION
            ============================================================ */}
        <section id="dossier-identity" aria-label="Artifact Identification" className="space-y-6 border-b-2 border-brand-text pb-12">
          
          {/* Identity Hierarchy Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest bg-brand-text text-brand-bg px-3 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                ARTIFACT / {artifactNumber}
              </span>
              {isSoldOut && (
                <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                  SOLD OUT
                </span>
              )}
              <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-accent border border-brand-accent/40 bg-brand-accent/10 px-2.5 py-1">
                COLLECTION // {collectionTag}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px] sm:text-xs uppercase font-bold text-brand-text/75">
              <span>ALLOTMENT STATUS:</span>
              <span className={`font-black px-2 py-0.5 border border-brand-text ${isSoldOut ? "bg-red-600 text-white" : "text-brand-text bg-brand-surface"}`}>
                {isSoldOut ? "ALL SPECIMENS IN CUSTODY // SOLD OUT" : `${product.inventory} SPECIMENS AVAILABLE`}
              </span>
            </div>
          </div>

          {/* Monumental Inscription & Title Display */}
          <div className="space-y-4 pt-2">
            {/* Arabic Inscription */}
            {product.inscription && (
              <div className="flex items-baseline gap-4">
                <span 
                  dir="rtl" 
                  className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black text-brand-accent tracking-normal leading-none select-none"
                >
                  {product.inscription.startsWith('#') ? product.inscription : `# ${product.inscription}`}
                </span>
              </div>
            )}

            {/* Artifact Title */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-mono font-black uppercase tracking-tight text-brand-text leading-[0.95]">
              {artifactTitle}
            </h1>

            {/* Conceptual Statement */}
            <div className="max-w-3xl pt-2">
              <p className="font-mono text-base sm:text-xl lg:text-2xl font-black uppercase tracking-wide text-brand-text/90 leading-relaxed border-l-4 border-brand-accent pl-4">
                {conceptualStatement}
              </p>
            </div>
          </div>

          {/* Dossier Quick Spec Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 font-mono text-xs border-t border-brand-text/20">
            <div>
              <span className="text-brand-text/60 block text-[9px] uppercase font-bold">MEDIUM</span>
              <span className="font-black uppercase">{mediumType}</span>
            </div>
            <div>
              <span className="text-brand-text/60 block text-[9px] uppercase font-bold">EDITION RUN</span>
              <span className="font-black uppercase text-brand-accent">{editionLabel}</span>
            </div>
            <div>
              <span className="text-brand-text/60 block text-[9px] uppercase font-bold">MATERIAL / DENSITY</span>
              <span className="font-black uppercase text-base truncate block">{product.material || "280 GSM COMBED COTTON"}</span>
            </div>
            <div>
              <span className="text-brand-text/60 block text-[9px] uppercase font-bold">PRIMARY SURFACE</span>
              <span className="font-black uppercase">ZERO EXTERIOR MARKS</span>
            </div>
          </div>
        </section>


        {/* ============================================================
            SECTION 2: VISUAL DOCUMENTATION
            ============================================================ */}
        <section id="dossier-visuals" aria-label="Visual Documentation" className="space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-brand-text pb-4">
            <div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent block">
                [ SECTION 02 // ARCHIVAL PLATES ]
              </span>
              <h2 className="text-2xl sm:text-4xl font-mono font-black uppercase tracking-tight">
                VISUAL DOCUMENTATION
              </h2>
            </div>
            <div className="font-mono text-[10px] uppercase font-bold text-brand-text/70 flex items-center gap-3">
              <span>UNFILTERED STUDIO LIGHT</span>
              <span>•</span>
              <span className="text-brand-accent font-black">RATIO: 3:4 ARCHIVAL angles</span>
              <span>•</span>
              <span>SCALE: 1:1 PHYSICAL FIDELITY</span>
            </div>
          </div>

          {/* Main Hero Visual Plate (Monumental Scale) */}
          <div className="relative border-[2.5px] border-brand-text bg-brand-surface shadow-[8px_8px_0px_#050505] p-4 sm:p-6 lg:p-8">
            {/* Corner Registration Reticles */}
            <span className="absolute -top-2 -left-2 font-mono text-[14px] font-black text-brand-text select-none pointer-events-none z-20">+</span>
            <span className="absolute -top-2 -right-2 font-mono text-[14px] font-black text-brand-text select-none pointer-events-none z-20">+</span>
            <span className="absolute -bottom-2 -left-2 font-mono text-[14px] font-black text-brand-text select-none pointer-events-none z-20">+</span>
            <span className="absolute -bottom-2 -right-2 font-mono text-[14px] font-black text-brand-text select-none pointer-events-none z-20">+</span>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* Primary Image Viewport (Strict 3:4 Archival Specification) */}
              <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-[480px] aspect-[3/4] max-h-[620px] relative bg-brand-bg border-2 border-brand-text overflow-hidden group shadow-[4px_4px_0px_#050505]">
                  <AnimatePresence>
                    <motion.img 
                      key={activeImageIndex}
                      src={images[activeImageIndex] || STUDIO_FALLBACK_IMAGE} 
                      alt={`${artifactTitle} - Perspective 0${activeImageIndex + 1}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== STUDIO_FALLBACK_IMAGE) {
                          target.src = STUDIO_FALLBACK_IMAGE;
                        }
                      }}
                      initial={{ clipPath: "inset(100% 0% 0% 0%)", filter: "contrast(120%) grayscale(100%)" }}
                      animate={{ clipPath: "inset(0% 0% 0% 0%)", filter: "contrast(100%) grayscale(0%)" }}
                      exit={{ clipPath: "inset(0% 0% 100% 0%)", filter: "contrast(120%) grayscale(100%)" }}
                      transition={{ duration: 0.4, ease: [0.85, 0, 0.15, 1] }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </AnimatePresence>

                  {/* Perspective Badge */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                    <span className="font-mono text-[9.5px] font-black uppercase tracking-widest bg-brand-text text-brand-bg px-2.5 py-1 border border-brand-text shadow-[2px_2px_0px_#050505]">
                      PLATE 0{activeImageIndex + 1} // {documentationPlates[activeImageIndex]?.title || "DOCUMENTATION"}
                    </span>
                    <span className="font-mono text-[8.5px] font-black uppercase tracking-widest bg-brand-surface/95 text-brand-text px-2 py-0.5 border border-brand-text">
                      {documentationPlates[activeImageIndex]?.subtitle || "angles RECORD [3:4]"}
                    </span>
                  </div>

                  {/* Lightbox / Zoom Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowFullscreenImage(true)}
                    className="absolute top-3 right-3 z-10 p-2 bg-brand-surface/90 hover:bg-brand-text hover:text-brand-bg border border-brand-text shadow-[2px_2px_0px_#050505] transition-colors cursor-pointer"
                    title="Inspect Fullscreen Artifact"
                  >
                    <Maximize2 size={16} />
                  </button>

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playToggle(0.06);
                          setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-brand-surface hover:bg-brand-text hover:text-white border-2 border-brand-text shadow-[3px_3px_0px_#050505] cursor-pointer transition-colors"
                        title="Previous Perspective"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playToggle(0.06);
                          setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-brand-surface hover:bg-brand-text hover:text-white border-2 border-brand-text shadow-[3px_3px_0px_#050505] cursor-pointer transition-colors"
                        title="Next Perspective"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  {/* Corner Stamp */}
                  <div className="absolute bottom-3 right-3 z-10 font-mono text-[8px] font-black uppercase tracking-widest bg-brand-bg text-brand-text px-2 py-0.5 border border-brand-text">
                    STUDIO ARCHIVE // PHYSICAL ARTIFACT
                  </div>
                </div>
              </div>

              {/* Documentation Ledger Column */}
              <div className="lg:col-span-6 xl:col-span-6 space-y-4 font-mono flex flex-col justify-between">
                
                {/* Plate Analysis Header */}
                <div className="border-b-2 border-brand-text pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-accent text-[9px] font-black uppercase tracking-widest">
                      PLATE ANALYSIS // PERSPECTIVE 0{activeImageIndex + 1} OF 0{images.length}
                    </span>
                    <span className="font-mono text-[8px] font-black uppercase px-2 py-0.5 bg-brand-text text-brand-bg">
                      ARTIFACT VIEW
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-brand-text mt-1 tracking-tight">
                    {documentationPlates[activeImageIndex]?.title || "ARCHIVAL ANGLE"}
                  </h3>
                  <p className="text-[11px] text-brand-text/80 uppercase mt-1 leading-relaxed font-bold">
                    {documentationPlates[activeImageIndex]?.detail || "Uncompromised capture of structural craftsmanship."}
                  </p>
                </div>

                {/* Perspective Selectors (Full List of Plates with 3:4 Previews) */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/60 block">
                    REGISTERED PERSPECTIVES:
                  </span>
                  <div className="space-y-2">
                    {images.map((_, idx) => {
                      const isActive = activeImageIndex === idx;
                      const plate = documentationPlates[idx] || { title: `PERSPECTIVE 0${idx + 1}`, subtitle: "TECHNICAL CAPTURE" };
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            soundManager.playClick(0.07);
                            setActiveImageIndex(idx);
                          }}
                          className={`w-full text-left px-3 py-2.5 sm:py-3 border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isActive
                              ? "bg-brand-text text-brand-bg border-brand-text shadow-[3px_3px_0px_#050505]"
                              : "bg-brand-surface text-brand-text border-brand-text/70 hover:border-brand-text hover:bg-brand-text/5"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-[10px] font-black font-mono ${isActive ? "text-brand-accent" : "text-brand-text/50"}`}>
                              [0{idx + 1}]
                            </span>
                            <div className="w-8 h-[40px] shrink-0 aspect-[3/4] border border-brand-text/30 bg-brand-bg overflow-hidden">
                              <img 
                                src={images[idx] || STUDIO_FALLBACK_IMAGE} 
                                alt="" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (target.src !== STUDIO_FALLBACK_IMAGE) target.src = STUDIO_FALLBACK_IMAGE;
                                }}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 truncate">
                              <div className="text-[11px] font-black uppercase truncate">{plate.title}</div>
                              <div className={`text-[9px] uppercase truncate ${isActive ? "text-brand-bg/75" : "text-brand-text/60"}`}>
                                {plate.subtitle}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[8.5px] font-black uppercase shrink-0 px-2 py-0.5 border ${
                            isActive ? "border-brand-accent bg-brand-accent text-white" : "border-brand-text/20 text-brand-text/50"
                          }`}>
                            {isActive ? "ACTIVE" : "VIEW"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tactile Material Spec Note & Actions */}
                <div className="pt-3 border-t-2 border-brand-text/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[9.5px] text-brand-text/75 uppercase leading-relaxed flex-1">
                    <span className="font-bold text-brand-text">RECORD NOTE:</span> Heavy-gauge tactile material engineered to age gracefully. All natural fibers and mineral glazes retain distinct organic nuances.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullscreenImage(true)}
                    className="shrink-0 px-3.5 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#050505]"
                  >
                    <Maximize2 size={12} />
                    <span>FULLSCREEN</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Secondary Visual Strip (Multi-Plate Macro Grid in 3:4 Archival Format) */}
          {images.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    soundManager.playClick(0.08);
                    setActiveImageIndex(idx);
                  }}
                  className={`border-2 border-brand-text p-2 bg-brand-surface cursor-pointer group transition-all ${
                    activeImageIndex === idx ? "shadow-[4px_4px_0px_#050505] bg-brand-text/5 border-brand-accent" : "hover:shadow-[2px_2px_0px_#050505]"
                  }`}
                >
                  <div className="aspect-[3/4] overflow-hidden border border-brand-text relative bg-brand-bg">
                    <img 
                      src={img || STUDIO_FALLBACK_IMAGE} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== STUDIO_FALLBACK_IMAGE) {
                          target.src = STUDIO_FALLBACK_IMAGE;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                    />
                    <span className="absolute bottom-1.5 left-1.5 font-mono text-[8px] font-black bg-brand-text text-brand-bg px-1.5 py-0.5 border border-brand-text">
                      PLATE 0{idx + 1} // 3:4
                    </span>
                  </div>
                  <div className="font-mono text-[9px] font-black uppercase text-brand-text pt-2 truncate">
                    {documentationPlates[idx]?.title || `PLATE 0${idx + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* ============================================================
            SECTION 3: THE SYMBOL
            ============================================================ */}
        <section id="dossier-symbol" aria-label="The Symbol" className="space-y-8">
          
          <div className="border-b-2 border-brand-text pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent block">
                [ SECTION 03 // THEOLOGICAL &amp; MORAL THESIS ]
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight">
                  # THE SYMBOL
                </h2>
                {cleanInscription && (
                  <span className="font-mono text-xl sm:text-2xl font-black bg-brand-text text-brand-bg px-3.5 py-1 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                    {cleanInscription}
                  </span>
                )}
              </div>
              <p className="font-mono text-xs sm:text-sm text-brand-text/80 uppercase mt-2 max-w-2xl leading-relaxed">
                An artifact is not merely apparel or hardware. It is a physical carrier of meaning. What you wear communicates what you believe.
              </p>
            </div>
            
            {onEditProduct && (
              <button
                type="button"
                onClick={() => onEditProduct(product.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border-2 border-brand-text text-[10px] font-mono font-black uppercase tracking-wider hover:bg-brand-text hover:text-brand-bg transition-all shadow-[2px_2px_0px_#050505] cursor-pointer"
                title="Edit these 4 pillars in Studio Manager"
              >
                <Edit3 size={12} />
                <span>EDIT PILLARS</span>
              </button>
            )}
          </div>

          {/* 4 Pillars of Symbolic Meaning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 1. What the symbol represents */}
            <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[5px_5px_0px_#050505] space-y-3">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  PILLAR 01 // DOCTRINE
                </span>
                <span className="font-mono text-[9px] font-bold uppercase text-brand-text/50">
                  SCRIPTURAL ROOTS
                </span>
              </div>
              <h3 className="font-mono text-lg sm:text-xl font-black uppercase text-brand-text tracking-tight">
                WHAT THE SYMBOL REPRESENTS
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/85 leading-relaxed">
                {symbolKnowledge.represents}
              </p>
            </div>

            {/* 2. Why it was chosen */}
            <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[5px_5px_0px_#050505] space-y-3">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  PILLAR 02 // INTENT
                </span>
                <span className="font-mono text-[9px] font-bold uppercase text-brand-text/50">
                  DELIBERATE SELECTION
                </span>
              </div>
              <h3 className="font-mono text-lg sm:text-xl font-black uppercase text-brand-text tracking-tight">
                WHY IT WAS CHOSEN
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/85 leading-relaxed">
                {symbolKnowledge.whyChosen}
              </p>
            </div>

            {/* 3. What the artifact communicates */}
            <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[5px_5px_0px_#050505] space-y-3">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  PILLAR 03 // TRANSMISSION
                </span>
                <span className="font-mono text-[9px] font-bold uppercase text-brand-text/50">
                  PUBLIC WITNESS
                </span>
              </div>
              <h3 className="font-mono text-lg sm:text-xl font-black uppercase text-brand-text tracking-tight">
                WHAT THE ARTIFACT COMMUNICATES
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/85 leading-relaxed">
                {symbolKnowledge.communicates}
              </p>
            </div>

            {/* 4. What idea the wearer is carrying */}
            <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 shadow-[5px_5px_0px_#050505] space-y-3">
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent">
                  PILLAR 04 // COVENANT
                </span>
                <span className="font-mono text-[9px] font-bold uppercase text-brand-text/50">
                  INWARD BURDEN
                </span>
              </div>
              <h3 className="font-mono text-lg sm:text-xl font-black uppercase text-brand-text tracking-tight">
                WHAT IDEA THE WEARER IS CARRYING
              </h3>
              <p className="font-mono text-xs sm:text-sm uppercase text-brand-text/85 leading-relaxed">
                {symbolKnowledge.wearerCarries}
              </p>
            </div>

          </div>

          {/* Dedicated Studio Doctrine Callout */}
          <div className="border-[2.5px] border-brand-text bg-brand-text text-brand-bg p-8 sm:p-10 shadow-[6px_6px_0px_#F95721] relative">
            <span className="font-mono text-[9.5px] font-black uppercase tracking-widest text-brand-accent bg-brand-bg/10 px-2.5 py-0.5 border border-brand-bg/20 inline-block mb-3">
              STUDIO COVENANT // ZERO EXTERIOR LOGOS
            </span>
            <h3 className="font-mono text-2xl sm:text-3xl font-black uppercase tracking-tight">
              "WE DO NOT TURN OUR WEARERS INTO UNPAID BILLBOARDS."
            </h3>
            <p className="font-mono text-xs sm:text-sm opacity-85 uppercase leading-relaxed max-w-3xl mt-2">
              Every millimeter of the visible garment belongs to the human being wearing it. Our maker's insignia is restricted entirely to the internal collar tape or vessel base. You are representing an enduring virtue, not corporate equity.
            </p>
          </div>
        </section>


        {/* ============================================================
            SECTION 4: THE ARTIFACT
            ============================================================ */}
        <section id="dossier-specimen" aria-label="The Artifact Specifications" className="space-y-8">
          
          <div className="border-b-2 border-brand-text pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent block">
                [ SECTION 04 // PHYSICAL SPECIFICATIONS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-mono font-black uppercase tracking-tight mt-1">
                # THE ARTIFACT
              </h2>
            </div>
            <div className="font-mono text-[10px] uppercase font-bold text-brand-text/70">
              PURE FACTUAL DOCUMENTATION • ZERO LUXURY HYPERBOLE
            </div>
          </div>

          {/* Factual Specification Matrix */}
          <div className="border-2 border-brand-text bg-brand-surface shadow-[6px_6px_0px_#050505]">
            <table className="w-full text-left font-mono border-collapse">
              <tbody className="divide-y-2 divide-brand-text text-xs sm:text-sm">
                
                {/* Material */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    MATERIAL COMPOSITION
                  </th>
                  <td className="p-4 sm:p-5 uppercase font-bold text-brand-text">
                    {product.material || "100% COMBED ORGANIC RING-SPUN COTTON (280-450 GSM ARCHIVAL WEIGHT)"}
                  </td>
                </tr>

                {/* Construction */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    CONSTRUCTION &amp; JOINERY
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    Double-needle reinforced coverstitching, 1x1 rib collar binding, twill neck tape reinforcement, and blind hem edge finishing engineered for structural longevity.
                  </td>
                </tr>

                {/* Print Technique */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    PRINT &amp; DEBOSS TECHNIQUE
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    {product.printMethod || "High-density reactive water-based pigment deboss / Intaglio stoneware seal. Formulated to fuse with fibers and resist washing degradation."}
                  </td>
                </tr>

                {/* Fit & Silhouette */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    FIT &amp; SILHOUETTE
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    {product.fit || "Boxy architectural cut with dropped shoulders, generous chest clearance, and heavy thermal drape that prevents clinging."}
                  </td>
                </tr>

                {/* Dimensions */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    DIMENSIONS &amp; SPECIFICATIONS
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    {product.dimensions || product.capacity || "Graded unisex matrix: S (Pit 56cm, Len 70cm) | M (Pit 59cm, Len 72cm) | L (Pit 62cm, Len 74cm) | XL (Pit 65cm, Len 76cm)"}
                  </td>
                </tr>

                {/* Care */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    MAINTENANCE &amp; CARE
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    {product.careInstructions || "Machine wash cold inside-out with neutral detergent. Line dry in shade. Do not tumble dry. Do not iron directly onto debossed calligraphy."}
                  </td>
                </tr>

                {/* Brand Placement Mandate */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    MAKER PLACEMENT
                  </th>
                  <td className="p-4 sm:p-5 uppercase font-black text-brand-text">
                    STRICTLY INTERIOR (COLLAR TAPE / BASE STAMP ONLY). NEVER EXTERIOR CHEST.
                  </td>
                </tr>

                {/* Studio Provenance */}
                <tr className="hover:bg-brand-text/5">
                  <th className="p-4 sm:p-5 uppercase font-black text-brand-accent text-xs w-1/3 border-r-2 border-brand-text bg-brand-text/5">
                    STUDIO PROVENANCE
                  </th>
                  <td className="p-4 sm:p-5 uppercase text-brand-text/90">
                    Designed, documented, and archived under strict material and ethical standards. Hand-finished in limited batch runs.
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Size Chart Trigger (if wearable) */}
          {mediumType === "WEAR" && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-brand-text hover:text-brand-accent border-2 border-brand-text bg-brand-surface px-4 py-2 shadow-[2px_2px_0px_#050505] cursor-pointer"
              >
                <Ruler size={14} />
                <span>EXAMINE DETAILED SIZE CHART &amp; BODY MEASUREMENTS</span>
              </button>
            </div>
          )}
        </section>


        {/* ============================================================
            SECTION 5: POSSESSION
            ============================================================ */}
        <section 
          ref={possessionRef}
          id="dossier-possession" 
          aria-label="Possession Protocol" 
          className="space-y-8 border-t-4 border-brand-text pt-16"
        >
          <div className="border-b-2 border-brand-text pb-4">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-accent block">
              [ SECTION 05 // ACQUISITION PROTOCOL ]
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-mono font-black uppercase tracking-tight mt-1">
              # POSSESSION
            </h2>
            <p className="font-mono text-xs sm:text-sm text-brand-text/80 uppercase mt-2 max-w-2xl leading-relaxed">
              Now that you understand the artifact and its symbolic weight, register custody of this physical artifact. Allotments are strictly limited per edition.
            </p>
          </div>

          {/* ACQUISITION INTERFACE (Unambiguous, High-Contrast, Direct) */}
          <div className="border-[2.5px] border-brand-text bg-brand-surface p-6 sm:p-10 lg:p-12 shadow-[8px_8px_0px_#050505] space-y-8">
            
            {/* Price & Allotment Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-2 border-brand-text pb-8">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase text-brand-text/60 tracking-wider block">
                  VALUATION / ACQUISITION SETTLEMENT
                </span>
                <div className="text-3xl sm:text-5xl font-mono font-black text-brand-text tracking-tight mt-1">
                  Rs. {(selectedVariant?.price || product.price).toLocaleString()}{" "}
                  <span className="text-xs sm:text-sm font-bold text-brand-text/60 font-mono">PKR</span>
                </div>
                <div className="font-mono text-[10px] text-brand-text/70 uppercase mt-1">
                  [INCLUSIVE OF ALL TAXES • DIRECT ATELIER DISTRIBUTION]
                </div>
              </div>

              {/* Allotment & Batch Status */}
              <div className="font-mono text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-2 border-brand-accent pl-4 sm:pl-0 sm:pr-4">
                <span className="text-[9px] font-bold uppercase text-brand-text/60 tracking-wider block">
                  BATCH ALLOTMENT STATUS
                </span>
                <div className="text-sm sm:text-base font-black uppercase text-brand-accent">
                  {product.inventory > 0 ? "SPECIMENS AVAILABLE" : "ALLOTTED // WAITLIST ONLY"}
                </div>
                <div className="text-[10px] text-brand-text/70 uppercase">
                  BATCH: {editionLabel}
                </div>
              </div>
            </div>

            {/* Variant / Size Selection */}
            {optionNames.length > 0 ? (
              <div className="space-y-6">
                {optionNames.map((name: string) => (
                  <div key={name} className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-text">
                        SPECIFICATION // {name}:
                      </span>
                      <span className="font-mono text-xs font-black uppercase text-brand-accent bg-brand-text/5 px-2 py-0.5 border border-brand-text/20">
                        SELECTED: {selectedOptions[name] || "PLEASE SELECT"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {getOptionValues(name).map((val: string) => {
                        const isSelected = selectedOptions[name] === val;
                        const isColorOption = name.toLowerCase().includes("color");
                        const colorConfig = isColorOption 
                          ? product.availableColors?.find(c => c.name.toLowerCase() === val.toLowerCase())
                          : null;
                        const matchedVariant = variants.find(v => 
                          (v.option1Name === name && v.option1Value === val) ||
                          (v.option2Name === name && v.option2Value === val) ||
                          (v.option3Name === name && v.option3Value === val)
                        );
                        const colorHex = colorConfig?.hex || matchedVariant?.colorHex;

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleOptionSelect(name, val)}
                            className={`min-w-[56px] px-5 py-3 font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? "bg-brand-text text-brand-bg shadow-[4px_4px_0px_#050505] -translate-y-0.5"
                                : "bg-brand-bg text-brand-text hover:bg-brand-text/10 shadow-[2px_2px_0px_#050505]"
                            }`}
                          >
                            {isColorOption && colorHex && (
                              <span 
                                className="w-3.5 h-3.5 border border-brand-text shrink-0" 
                                style={{ backgroundColor: colorHex }} 
                              />
                            )}
                            <span>{val}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : mediumType === "WEAR" ? (
              /* Fallback standard sizing for wear if no variants in DB */
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-text">
                    SPECIFICATION // SIZE:
                  </span>
                  <span className="font-mono text-xs font-black uppercase text-brand-accent bg-brand-text/5 px-2 py-0.5 border border-brand-text/20">
                    SELECTED: {selectedOptions["Size"] || "M"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {["S", "M", "L", "XL", "2XL"].map((sz) => {
                    const isSelected = (selectedOptions["Size"] || "M") === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleOptionSelect("Size", sz)}
                        className={`min-w-[56px] px-5 py-3 font-mono text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-text text-brand-bg shadow-[4px_4px_0px_#050505] -translate-y-0.5"
                            : "bg-brand-bg text-brand-text hover:bg-brand-text/10 shadow-[2px_2px_0px_#050505]"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isSoldOut ? (
              <div className="space-y-6 pt-2">
                <div className="border-2 border-brand-text p-6 bg-brand-bg space-y-3">
                  <div className="flex items-center gap-2 text-brand-accent font-mono text-xs font-black uppercase tracking-wider">
                    <Clock size={16} />
                    <span>ARCHIVAL NOTICE // PHYSICAL ALLOTMENT ACCORDED</span>
                  </div>
                  <h3 className="font-mono text-xl sm:text-2xl font-black uppercase tracking-tight text-brand-text">
                    ARTIFACT / {artifactNumber} IS SOLD OUT
                  </h3>
                  <p className="font-mono text-xs text-brand-text/80 uppercase leading-relaxed max-w-2xl">
                    Every physical artifact from this edition is currently in custody. In accordance with studio philosophy, this artifact remains part of the collection as an artifact that has existed. All visual documentation, symbolic thesis, and technical specifications remain accessible in this permanent dossier.
                  </p>
                </div>

                {/* NOTIFY ME Protocol */}
                <div className="border-2 border-brand-text bg-brand-surface p-6 sm:p-8 space-y-4 shadow-[4px_4px_0px_#050505]">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-brand-accent" />
                    <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest text-brand-text">
                      NOTIFY ME OF FUTURE ALLOTMENTS
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-brand-text/70 uppercase">
                    Provide your email coordinates to receive an immediate dispatch advisory if archival vault artifacts or a future edition is authorized.
                  </p>
                  {notifySubmitted ? (
                    <div className="p-4 bg-brand-text text-brand-bg font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2.5 border-2 border-brand-text">
                      <Check size={16} className="text-brand-accent shrink-0" />
                      <span>DISPATCH LOGGED. YOU WILL BE TRANSMITTED NOTICE IF ARTIFACT / {artifactNumber} RE-ENTERS THE ATELIER.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="ENTER YOUR EMAIL FOR RE-RELEASE NOTICE"
                        className="flex-1 px-4 py-3.5 bg-brand-bg border-2 border-brand-text font-mono text-xs uppercase tracking-wider text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:border-brand-accent"
                      />
                      <button
                        type="submit"
                        className="px-8 py-3.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer whitespace-nowrap"
                      >
                        NOTIFY ME
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Quantity Controller */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-text">
                    ALLOTMENT QUANTITY:
                  </span>
                  <div className="inline-flex items-center border-2 border-brand-text bg-brand-bg shadow-[3px_3px_0px_#050505]">
                    <button 
                      type="button"
                      onClick={() => {
                        soundManager.playToggle(0.06);
                        setQuantity(Math.max(1, quantity - 1));
                      }}
                      className="p-3 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                      title="Decrease Allotment"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-mono text-sm font-black select-none">
                      {quantity}
                    </span>
                    <motion.button 
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => {
                        soundManager.playToggle(0.06);
                        setQuantity(quantity + 1);
                      }}
                      className="p-3 hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
                      title="Increase Allotment"
                    >
                      <Plus size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Primary Acquisition Buttons with Juicy Springs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-4">
                  <div className="sm:col-span-7">
                    <motion.button 
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 450, damping: 18 }}
                      onClick={handlePossess}
                      className="w-full py-5 px-6 font-mono text-sm font-black uppercase tracking-widest bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border-2 border-brand-text shadow-[5px_5px_0px_#050505] active:shadow-[2px_2px_0px_#050505] transition-colors cursor-pointer flex items-center justify-center gap-2 select-none"
                    >
                      {added ? (
                        <motion.div 
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                          className="flex items-center gap-2 text-white"
                        >
                          <Check size={18} className="text-white animate-bounce" />
                          <span>RECORDED IN POSSESSION LEDGER</span>
                        </motion.div>
                      ) : (
                        <>
                          <span>ACQUIRE SPECIMEN</span>
                          <ArrowUpRight size={18} />
                        </>
                      )}
                    </motion.button>
                  </div>

                  <div className="sm:col-span-5">
                    <motion.button 
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 450, damping: 18 }}
                      onClick={() => {
                        handlePossess();
                        onClose();
                        if (onOpenLedger) onOpenLedger();
                      }}
                      className="w-full py-5 px-6 font-mono text-sm font-black uppercase tracking-widest bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text shadow-[5px_5px_0px_#050505] active:shadow-[2px_2px_0px_#050505] transition-colors cursor-pointer flex items-center justify-center gap-2 select-none"
                    >
                      <span>ACQUIRE &amp; PROCEED TO LEDGER →</span>
                    </motion.button>
                  </div>
                </div>
              </>
            )}

            {/* Shipping & Custody Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t-2 border-brand-text font-mono text-xs">
              <div className="flex items-start gap-3">
                <Truck size={18} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase">NATIONWIDE DISPATCH</div>
                  <p className="text-brand-text/75 uppercase text-[10.5px] mt-0.5">
                    2–4 business days via insured express studio courier across Pakistan.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase">ARCHIVAL PACKAGING</div>
                  <p className="text-brand-text/75 uppercase text-[10.5px] mt-0.5">
                    Enclosed in plastic-free unbleached kraft casing with serialized certificate.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info size={18} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase">EXCHANGE PRIVILEGE</div>
                  <p className="text-brand-text/75 uppercase text-[10.5px] mt-0.5">
                    7-day complimentary size exchange guarantee in pristine condition.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* STICKY BOTTOM QUICK-ACQUIRE DOCK (Appears when scrolling deep into the dossier) */}
      <AnimatePresence>
        {showStickyAcquire && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-brand-bg/95 backdrop-blur-md border-t-2 border-brand-text p-3 sm:p-4 shadow-[0px_-4px_12px_rgba(0,0,0,0.15)]"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black uppercase text-brand-accent hidden sm:inline">
                  ARTIFACT / {artifactNumber}
                </span>
                <div>
                  <div className="font-mono text-xs sm:text-sm font-black uppercase truncate max-w-[200px] sm:max-w-xs text-brand-text">
                    {artifactTitle}
                  </div>
                  <div className="font-mono text-[10px] font-bold text-brand-accent uppercase">
                    {isSoldOut ? "ARCHIVAL ALLOTMENT FILLED" : "POSSESSION PROTOCOL READY"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isSoldOut ? (
                  <button
                    type="button"
                    onClick={() => scrollToSection("dossier-possession")}
                    className="px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider bg-brand-surface text-brand-text hover:bg-brand-accent hover:text-white border-2 border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Bell size={14} className="text-brand-accent" />
                    <span>NOTIFY ME // SOLD OUT</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollToSection("dossier-possession")}
                      className="px-4 py-2 font-mono text-[10.5px] font-black uppercase border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer hidden md:block"
                    >
                      CONFIGURE SPECS
                    </button>
                    <button
                      type="button"
                      onClick={handlePossess}
                      className="px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border-2 border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {added ? (
                        <>
                          <Check size={14} className="text-brand-accent" />
                          <span>RECORDED</span>
                        </>
                      ) : (
                        <>
                          <span>ACQUIRE ARTIFACT</span>
                          <ArrowUpRight size={14} />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN ARTIFACT LIGHTBOX */}
      {showFullscreenImage && (
        <div 
          onClick={() => setShowFullscreenImage(false)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] border-2 border-white bg-black">
            <img 
              src={images[activeImageIndex] || STUDIO_FALLBACK_IMAGE} 
              alt={artifactTitle} 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== STUDIO_FALLBACK_IMAGE) {
                  target.src = STUDIO_FALLBACK_IMAGE;
                }
              }}
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
            <div className="absolute top-3 left-3 bg-black text-white font-mono text-xs px-2.5 py-1 border border-white">
              PLATE 0{activeImageIndex + 1} // {documentationPlates[activeImageIndex]?.title}
            </div>
            <button
              type="button"
              onClick={() => setShowFullscreenImage(false)}
              className="absolute top-3 right-3 p-2 bg-black text-white hover:bg-white hover:text-black border border-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* DETAILED SIZE CHART MODAL */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-surface border-2 border-brand-text p-6 md:p-8 max-w-lg w-full shadow-[8px_8px_0px_#050505] space-y-6 text-brand-text font-mono">
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent block">
                  TECHNICAL GRADING TABLE
                </span>
                <h3 className="text-xl font-black uppercase">GARMENT DIMENSIONS</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="p-1 border border-brand-text hover:bg-brand-text hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-brand-text">
                <thead>
                  <tr className="bg-brand-text text-brand-bg uppercase">
                    <th className="p-2 border border-brand-text">SIZE</th>
                    <th className="p-2 border border-brand-text">CHEST (PIT-TO-PIT)</th>
                    <th className="p-2 border border-brand-text">LENGTH</th>
                    <th className="p-2 border border-brand-text">SHOULDER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-text">
                  <tr>
                    <td className="p-2 font-black border border-brand-text">S</td>
                    <td className="p-2 border border-brand-text">56 cm / 22"</td>
                    <td className="p-2 border border-brand-text">70 cm / 27.5"</td>
                    <td className="p-2 border border-brand-text">52 cm / 20.5"</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-black border border-brand-text">M</td>
                    <td className="p-2 border border-brand-text">59 cm / 23.2"</td>
                    <td className="p-2 border border-brand-text">72 cm / 28.3"</td>
                    <td className="p-2 border border-brand-text">54 cm / 21.2"</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-black border border-brand-text">L</td>
                    <td className="p-2 border border-brand-text">62 cm / 24.4"</td>
                    <td className="p-2 border border-brand-text">74 cm / 29.1"</td>
                    <td className="p-2 border border-brand-text">56 cm / 22"</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-black border border-brand-text">XL</td>
                    <td className="p-2 border border-brand-text">65 cm / 25.6"</td>
                    <td className="p-2 border border-brand-text">76 cm / 30"</td>
                    <td className="p-2 border border-brand-text">58 cm / 22.8"</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-black border border-brand-text">2XL</td>
                    <td className="p-2 border border-brand-text">68 cm / 26.8"</td>
                    <td className="p-2 border border-brand-text">78 cm / 30.7"</td>
                    <td className="p-2 border border-brand-text">60 cm / 23.6"</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[10px] uppercase text-brand-text/70 leading-relaxed">
              *All measurements are taken flat. Designed for a relaxed architectural boxy fit. Take your normal size for the intended drape, or size down for a slimmer silhouette.
            </p>

            <button
              type="button"
              onClick={() => setShowSizeGuide(false)}
              className="w-full py-2.5 font-mono text-xs font-black uppercase bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border-2 border-brand-text transition-colors cursor-pointer"
            >
              CLOSE DIMENSION MATRIX
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-brand-surface border-2 border-brand-text p-6 md:p-8 max-w-md w-full shadow-[8px_8px_0px_#050505] space-y-6 text-brand-text font-mono">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                [ EXPUNGE ARTIFACT DOSSIER ]
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight">CONFIRM EXPULSION</h3>
              <p className="text-xs uppercase text-brand-text/80 leading-relaxed">
                Permanently expunge <strong>"{product.name}"</strong> from archive records and studio ledger?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-brand-text">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-black uppercase border-2 border-brand-text bg-brand-bg hover:bg-brand-text/10 transition-colors cursor-pointer"
              >
                ABORT
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (onDeleteProduct) {
                    setIsDeleting(true);
                    try {
                      await onDeleteProduct(product.id, product.name);
                    } finally {
                      setIsDeleting(false);
                      setShowDeleteModal(false);
                    }
                  }
                }}
                className="px-5 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-brand-text cursor-pointer transition-colors shadow-[2px_2px_0px_#050505]"
              >
                {isDeleting ? "EXPUNGING..." : "CONFIRM PURGE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
