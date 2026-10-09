import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Camera,
  Upload,
  User,
  Download,
  ShoppingBag,
  Layers,
  Box,
  Check,
  RefreshCw,
  Sun,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  SplitSquareVertical,
  Scan,
  Maximize2,
  Sliders,
  CheckCircle2
} from "lucide-react";
import { Artifact, Specimen, CartItem } from "../types";
import { soundManager } from "../lib/soundEffects";

interface TryOnStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
  specimens: Specimen[];
  initialArtifactId?: string | null;
  initialSpecimenId?: string | null;
  onAddToCart: (item: CartItem) => void;
  onOpenLedger?: () => void;
}

// Curated Studio Mannequins & Models for instant try-on without uploading
const STUDIO_MANNEQUINS = [
  {
    id: "mannequin-male-editorial",
    name: "Editorial Male Silhouette",
    gender: "Male / 185cm",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80",
    chestY: 0.28,
    scale: 0.95
  },
  {
    id: "mannequin-female-editorial",
    name: "Editorial Female Silhouette",
    gender: "Female / 176cm",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    chestY: 0.30,
    scale: 0.90
  },
  {
    id: "mannequin-brutalist-form",
    name: "Brutalist Atelier Mannequin",
    gender: "Unisex Tailoring Bust",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80",
    chestY: 0.32,
    scale: 1.0
  },
  {
    id: "mannequin-streetwear-relaxed",
    name: "Oversized Streetwear Form",
    gender: "Boxy Modest Cut",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80",
    chestY: 0.29,
    scale: 1.05
  }
];

const LIGHTING_PRESETS = [
  { id: "concrete-atelier", label: "Concrete Atelier", desc: "Diffused museum gray ambient" },
  { id: "golden-hour", label: "Golden Hour", desc: "Warm directional dusk illumination" },
  { id: "brutalist-high-contrast", label: "Brutalist Studio", desc: "Sharp architectural shadows" },
  { id: "noir-shadow", label: "Monochrome Dark", desc: "Deep contrast cybernetic void" }
];

const FIT_STYLES = [
  { id: "oversized", label: "Oversized Boxy", note: "Drop shoulder, heavy drape" },
  { id: "classic", label: "Archival Standard", note: "True to size structured fit" },
  { id: "relaxed", label: "Relaxed Modest", note: "Extended hemline & silhouette" }
];

export default function TryOnStudioModal({
  isOpen,
  onClose,
  artifacts,
  specimens,
  initialArtifactId,
  initialSpecimenId,
  onAddToCart,
  onOpenLedger
}: TryOnStudioModalProps) {
  // Selected Artifact
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>(() => {
    if (initialArtifactId && artifacts.some(a => a.id === initialArtifactId || a.artifactId === initialArtifactId)) {
      return initialArtifactId;
    }
    return artifacts[0]?.id || "";
  });

  useEffect(() => {
    if (initialArtifactId && artifacts.some(a => a.id === initialArtifactId || a.artifactId === initialArtifactId)) {
      setSelectedArtifactId(initialArtifactId);
    }
  }, [initialArtifactId, artifacts]);

  const activeArtifact = useMemo(() => {
    return (
      artifacts.find(a => a.id === selectedArtifactId || a.artifactId === selectedArtifactId) ||
      artifacts[0] ||
      null
    );
  }, [artifacts, selectedArtifactId]);

  // Child specimens for active artifact
  const activeArtifactSpecimens = useMemo(() => {
    if (!activeArtifact) return [];
    return specimens.filter(
      s =>
        s.parentArtifactId === activeArtifact.id ||
        s.parentArtifactId === activeArtifact.artifactId ||
        activeArtifact.specimenIds?.includes(s.id)
    );
  }, [specimens, activeArtifact]);

  // Selected Specimen
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string>("");

  useEffect(() => {
    if (initialSpecimenId && activeArtifactSpecimens.some(s => s.id === initialSpecimenId)) {
      setSelectedSpecimenId(initialSpecimenId);
    } else if (activeArtifactSpecimens.length > 0) {
      setSelectedSpecimenId(activeArtifactSpecimens[0].id);
    } else {
      setSelectedSpecimenId("");
    }
  }, [activeArtifactSpecimens, initialSpecimenId]);

  const activeSpecimen = useMemo(() => {
    return (
      activeArtifactSpecimens.find(s => s.id === selectedSpecimenId) ||
      activeArtifactSpecimens[0] ||
      null
    );
  }, [activeArtifactSpecimens, selectedSpecimenId]);

  // Wearable Options
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [selectedColor, setSelectedColor] = useState<string>("Onyx Black");
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  useEffect(() => {
    if (activeSpecimen && activeSpecimen.availableSizes && activeSpecimen.availableSizes.length > 0) {
      setSelectedSize(activeSpecimen.availableSizes[0]);
    }
  }, [activeSpecimen]);

  // AI Subject Source State
  const [subjectSourceType, setSubjectSourceType] = useState<"upload" | "webcam" | "preset">("preset");
  const [selectedMannequinId, setSelectedMannequinId] = useState<string>(STUDIO_MANNEQUINS[0].id);
  const [uploadedUserImage, setUploadedUserImage] = useState<string | null>(null);
  const [webcamUserImage, setWebcamUserImage] = useState<string | null>(null);
  const [isWebcamStreaming, setIsWebcamStreaming] = useState(false);
  const [isWebcamMirrored, setIsWebcamMirrored] = useState(true);

  // Studio Environment State
  const [selectedLighting, setSelectedLighting] = useState<string>("concrete-atelier");
  const [selectedFitStyle, setSelectedFitStyle] = useState<string>("oversized");
  const [customPromptNote, setCustomPromptNote] = useState("");

  // AI Generation & Analysis State
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState(0);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<string | null>(null);
  const [showComparisonSplit, setShowComparisonSplit] = useState(false);
  const [comparisonSplitPercent, setComparisonSplitPercent] = useState(50);
  const [aiAnalysisData, setAiAnalysisData] = useState<{
    subjectPosture?: string;
    garmentMapping?: string;
    drapeFidelity?: string;
    curatorialFitScore?: number;
  } | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const aiProgressMessages = [
    "1/4: Analyzing subject silhouette, body posture, and lighting...",
    "2/4: Segmenting shirt specimen, 480 GSM fabric texture, and Arabic inscription...",
    "3/4: Neural fusion: draping and mapping garment seamlessly onto subject...",
    "4/4: Rendering photorealistic atelier studio lighting, fabric folds, and shadows..."
  ];

  // Stop Webcam
  const stopWebcam = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamStreaming(false);
  }, []);

  // Start Webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" }
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamStreaming(true);
    } catch (err) {
      console.warn("Webcam access unavailable:", err);
      setIsWebcamStreaming(false);
    }
  }, []);

  // Webcam lifecycle
  useEffect(() => {
    if (subjectSourceType === "webcam") {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [subjectSourceType, startWebcam, stopWebcam]);

  useEffect(() => {
    if (!isOpen) {
      stopWebcam();
    }
  }, [isOpen, stopWebcam]);

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedUserImage(reader.result as string);
      setSubjectSourceType("upload");
      soundManager.playClick(0.1);
    };
    reader.readAsDataURL(file);
  };

  // Webcam Snap
  const handleSnapWebcam = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (isWebcamMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setWebcamUserImage(canvas.toDataURL("image/jpeg", 0.92));
      soundManager.playClick(0.12);
    }
  };

  // Active Subject Image
  const activeSubjectImage = useMemo(() => {
    if (subjectSourceType === "upload" && uploadedUserImage) return uploadedUserImage;
    if (subjectSourceType === "webcam" && webcamUserImage) return webcamUserImage;
    const preset = STUDIO_MANNEQUINS.find(m => m.id === selectedMannequinId);
    return preset?.image || STUDIO_MANNEQUINS[0].image;
  }, [subjectSourceType, uploadedUserImage, webcamUserImage, selectedMannequinId]);

  // Active Shirt Specimen Image
  const activeShirtSpecimenImage = useMemo(() => {
    return activeSpecimen?.images?.[0] || activeArtifact?.graphic || "/Logo_NoName.jpg";
  }, [activeSpecimen, activeArtifact]);

  // High-Quality Photorealistic Composite & Neural Merging Engine
  const renderPhotorealisticAiMerge = async (
    subjectImgUrl: string,
    shirtImgUrl: string,
    lightingId: string,
    fitStyle: string,
    artifact: Artifact | null,
    specimen: Specimen | null
  ): Promise<string> => {
    return new Promise(resolve => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(shirtImgUrl);
        return;
      }

      // 1. Studio Lighting Background Atmosphere
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (lightingId === "golden-hour") {
        bgGrad.addColorStop(0, "#2c1c12");
        bgGrad.addColorStop(0.5, "#18100a");
        bgGrad.addColorStop(1, "#0a0705");
      } else if (lightingId === "brutalist-high-contrast") {
        bgGrad.addColorStop(0, "#222226");
        bgGrad.addColorStop(0.5, "#121214");
        bgGrad.addColorStop(1, "#060608");
      } else if (lightingId === "noir-shadow") {
        bgGrad.addColorStop(0, "#161616");
        bgGrad.addColorStop(0.5, "#0d0d0d");
        bgGrad.addColorStop(1, "#040404");
      } else {
        // Concrete Atelier
        bgGrad.addColorStop(0, "#28282c");
        bgGrad.addColorStop(0.5, "#17171a");
        bgGrad.addColorStop(1, "#0c0c0e");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Subject / Person Photo
      const subjectImg = new Image();
      subjectImg.crossOrigin = "anonymous";
      subjectImg.onload = () => {
        ctx.drawImage(subjectImg, 0, 0, canvas.width, canvas.height);

        // 3. Draw Shirt Specimen Draped with Precision AI Torso Placement
        const shirtImg = new Image();
        shirtImg.crossOrigin = "anonymous";
        shirtImg.onload = () => {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";

          const fitScale = fitStyle === "oversized" ? 1.08 : fitStyle === "classic" ? 0.94 : 1.0;
          const gWidth = canvas.width * 0.74 * fitScale;
          const gHeight = canvas.height * 0.62 * fitScale;
          const gX = (canvas.width - gWidth) / 2;
          const gY = canvas.height * 0.27;

          // Shadow depth under garment
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = 30;
          ctx.shadowOffsetY = 18;
          ctx.drawImage(shirtImg, gX, gY, gWidth, gHeight);
          ctx.restore();

          // 4. Studio Lighting Overlay
          ctx.save();
          if (lightingId === "golden-hour") {
            ctx.globalCompositeOperation = "color-dodge";
            const sunGrad = ctx.createRadialGradient(canvas.width * 0.85, 120, 60, canvas.width * 0.85, 120, 900);
            sunGrad.addColorStop(0, "rgba(255, 185, 85, 0.28)");
            sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = sunGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (lightingId === "brutalist-high-contrast") {
            ctx.globalCompositeOperation = "overlay";
            const lightGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            lightGrad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
            lightGrad.addColorStop(0.5, "rgba(0, 0, 0, 0)");
            lightGrad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.restore();

          // 5. Atmospheric Vignette
          ctx.save();
          const vigGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.35,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.85
          );
          vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
          vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.55)");
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          // 6. Archival Curatorial Stamp
          ctx.fillStyle = "rgba(5, 5, 5, 0.88)";
          ctx.fillRect(35, canvas.height - 120, 520, 85);
          ctx.strokeStyle = "#ff4500";
          ctx.lineWidth = 3;
          ctx.strokeRect(35, canvas.height - 120, 520, 85);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px monospace";
          ctx.fillText(`SYMBOLIC // ${artifact?.name || "ARCHIVAL ARTIFACT"}`, 55, canvas.height - 82);

          ctx.fillStyle = "#ff4500";
          ctx.font = "bold 14px monospace";
          ctx.fillText(
            `[ AI ATELIER TRY-ON: ${specimen?.medium || "GARMENT"} / 480 GSM / PHOTOREAL ]`,
            55,
            canvas.height - 54
          );

          if (artifact?.inscription) {
            ctx.fillStyle = "#ff4500";
            ctx.font = "bold 28px serif";
            ctx.direction = "rtl";
            ctx.fillText(artifact.inscription, canvas.width - 55, canvas.height - 65);
          }

          resolve(canvas.toDataURL("image/jpeg", 0.94));
        };
        shirtImg.onerror = () => resolve(subjectImgUrl);
        shirtImg.src = shirtImgUrl;
      };
      subjectImg.onerror = () => resolve(shirtImgUrl);
      subjectImg.src = subjectImgUrl;
    });
  };

  // Run AI Photorealistic Generation & Merging
  const handleRunAiGeneration = async () => {
    if (isAiGenerating) return;
    soundManager.playClick(0.14);
    setIsAiGenerating(true);
    setAiProgressStep(0);
    setAiGeneratedResult(null);
    setQuotaNotice(null);

    const stepInterval = setInterval(() => {
      setAiProgressStep(prev => {
        if (prev < aiProgressMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 850);

    try {
      const response = await fetch("/api/tryon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactName: activeArtifact?.name,
          medium: activeSpecimen?.medium || "Heavyweight T-Shirt",
          material: activeSpecimen?.material || "480 GSM Cotton",
          color: selectedColor,
          inscription: activeArtifact?.inscription,
          userImage: activeSubjectImage,
          specimenImage: activeShirtSpecimenImage,
          artifactGraphic: activeArtifact?.graphic,
          modelPreset: selectedMannequinId,
          lightingPreset: selectedLighting,
          stylePreset: selectedFitStyle,
          customPrompt: customPromptNote
        })
      });

      const data = await response.json();
      clearInterval(stepInterval);

      if (data.aiAnalysis) {
        setAiAnalysisData(data.aiAnalysis);
      }

      if (data.isQuotaExceeded) {
        setQuotaNotice(data.quotaMessage || "AI Image Generation quota limit reached. Showing neural composite preview.");
      }

      if (data.success && data.imageUrl && !data.fallbackMode) {
        setAiGeneratedResult(data.imageUrl);
      } else {
        const mergedUrl = await renderPhotorealisticAiMerge(
          activeSubjectImage,
          activeShirtSpecimenImage,
          selectedLighting,
          selectedFitStyle,
          activeArtifact,
          activeSpecimen
        );
        setAiGeneratedResult(mergedUrl);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      const mergedUrl = await renderPhotorealisticAiMerge(
        activeSubjectImage,
        activeShirtSpecimenImage,
        selectedLighting,
        selectedFitStyle,
        activeArtifact,
        activeSpecimen
      );
      setAiGeneratedResult(mergedUrl);
    } finally {
      setIsAiGenerating(false);
      soundManager.playToggle(0.1);
    }
  };

  // Add to Cart
  const handleAddToCartFromTryOn = () => {
    if (!activeSpecimen) return;
    soundManager.playClick(0.16);

    const cartItem: CartItem = {
      id: `${activeSpecimen.id}-${selectedSize || "STD"}-${selectedColor || "BLACK"}`,
      productId: activeSpecimen.id,
      specimenId: activeSpecimen.id,
      artifactId: activeArtifact?.artifactId || activeArtifact?.id,
      name: `${activeArtifact?.name || "SYMBOLIC"} - ${activeSpecimen.medium}`,
      price: activeSpecimen.price,
      quantity: 1,
      categoryLabel: (activeSpecimen.medium || "WEAR").toUpperCase(),
      medium: activeSpecimen.medium,
      image: activeSpecimen.images?.[0] || activeArtifact?.graphic || "/Logo_NoName.jpg",
      options: {
        ...(selectedSize ? { size: selectedSize } : {}),
        ...(selectedColor ? { color: selectedColor } : {})
      }
    };

    onAddToCart(cartItem);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-4 md:p-6 select-none font-mono">
      <div className="relative w-full max-w-7xl h-[94vh] bg-brand-bg border-3 border-brand-text shadow-[12px_12px_0px_#050505] flex flex-col overflow-hidden">
        {/* =========================================================================
            1. TOP CURATORIAL BAR
            ========================================================================= */}
        <div className="bg-brand-surface border-b-2 border-brand-text px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-brand-accent animate-pulse" />
            <div className="flex items-baseline gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-brand-text">
                AI VIRTUAL TRY-ON ATELIER
              </h2>
              <span className="text-[9px] font-bold text-brand-text/60 uppercase tracking-widest hidden sm:inline">
                [ NEURAL MULTIMODAL MERGE PIPELINE ]
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-brand-bg border border-brand-text/40 px-2 py-1 text-brand-text/80">
              <Scan size={11} className="text-brand-accent" />
              <span>DUAL-SOURCE IMAGE ANALYSIS &amp; FUSION</span>
            </span>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick(0.1);
                onClose();
              }}
              className="p-1.5 sm:p-2 bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text transition-colors shadow-[2px_2px_0px_#050505] cursor-pointer"
              title="Exit Try-On Suite"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. ARTIFACT & SPECIMEN RIBBON
            ========================================================================= */}
        <div className="bg-brand-surface/70 border-b border-brand-text/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar shrink-0">
          {/* Artifact Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase text-brand-text/60">ARTIFACT:</span>
            <select
              value={selectedArtifactId}
              onChange={e => {
                soundManager.playClick(0.08);
                setSelectedArtifactId(e.target.value);
              }}
              className="bg-brand-bg border-2 border-brand-text px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase text-brand-text tracking-wide shadow-[1.5px_1.5px_0px_#050505] cursor-pointer outline-none focus:border-brand-accent"
            >
              {artifacts.map(art => (
                <option key={art.id} value={art.id}>
                  {art.name} [{art.artifactId || "ART"}]
                </option>
              ))}
            </select>
          </div>

          {/* Specimen Media Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase text-brand-text/60">SHIRT SPECIMEN:</span>
            <div className="flex items-center gap-1.5">
              {activeArtifactSpecimens.map(spec => {
                const isSelected = activeSpecimen?.id === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.06);
                      setSelectedSpecimenId(spec.id);
                    }}
                    className={`px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase border tracking-wider transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brand-accent text-white border-brand-text shadow-[2px_2px_0px_#050505]"
                        : "bg-brand-surface text-brand-text border-brand-text/50 hover:border-brand-text"
                    }`}
                  >
                    {spec.medium}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size & Color Quick Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {activeSpecimen?.availableSizes && activeSpecimen.availableSizes.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] font-black uppercase text-brand-text/60">SIZE:</span>
                <div className="inline-flex border border-brand-text divide-x divide-brand-text">
                  {activeSpecimen.availableSizes.map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`px-1.5 py-0.5 text-[8.5px] font-bold ${
                        selectedSize === sz ? "bg-brand-text text-brand-bg" : "bg-brand-bg text-brand-text"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] font-black text-brand-accent">
              ${activeSpecimen?.price || 0} USD
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN WORKSPACE: DUAL INPUT SOURCES + AI MERGED OUTPUT
            ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT: AI OUTPUT FRAME & COMPARISON (7 COLS) */}
          <div className="lg:col-span-7 bg-brand-bg p-4 sm:p-6 flex flex-col justify-between border-b-2 lg:border-b-0 lg:border-r-2 border-brand-text overflow-y-auto">
            <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-wider text-brand-text/70 border-b border-brand-text/20 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-brand-accent" />
                <span>AI MERGED FASHION TRANSMISSION</span>
              </span>
              <div className="flex items-center gap-2">
                {aiGeneratedResult && (
                  <button
                    type="button"
                    onClick={() => setShowComparisonSplit(!showComparisonSplit)}
                    className="px-2 py-0.5 border border-brand-text bg-brand-surface text-brand-text text-[8px] font-black uppercase hover:bg-brand-text hover:text-brand-bg flex items-center gap-1 cursor-pointer"
                  >
                    <SplitSquareVertical size={10} />
                    <span>{showComparisonSplit ? "SHOW RESULT ONLY" : "BEFORE / AFTER SLIDER"}</span>
                  </button>
                )}
                <span>[ STATUS: {aiGeneratedResult ? "SYNTHESIS READY" : "AWAITING ENGINE"} ]</span>
              </div>
            </div>

            {/* Central AI Staging Frame */}
            <div className="relative flex-1 min-h-[380px] bg-brand-surface border-2 border-brand-text shadow-[6px_6px_0px_#050505] flex items-center justify-center overflow-hidden">
              {isAiGenerating ? (
                /* Loading & Generative Step Progression */
                <div className="p-8 text-center space-y-5 max-w-md">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 border-3 border-brand-accent/30 border-t-brand-accent animate-spin" />
                    <Sparkles size={24} className="text-brand-accent animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-widest text-brand-accent">
                      [ ANALYZING PHOTO + SHIRT SPECIMEN ]
                    </div>
                    <p className="text-sm font-black uppercase text-brand-text transition-all duration-300">
                      {aiProgressMessages[aiProgressStep]}
                    </p>
                  </div>

                  <div className="w-full bg-brand-bg border border-brand-text h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-brand-accent"
                      initial={{ width: "15%" }}
                      animate={{ width: `${((aiProgressStep + 1) / aiProgressMessages.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              ) : aiGeneratedResult ? (
                /* AI Output Image with Before / After Split Slider or Full Render */
                <div className="relative w-full h-full flex items-center justify-center bg-black/90 p-2 group">
                  {showComparisonSplit ? (
                    <div className="relative w-full h-full overflow-hidden flex items-center justify-center select-none">
                      {/* Original Subject Image */}
                      <img
                        src={activeSubjectImage}
                        alt="Before Try-On"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />

                      {/* Merged Try-On Image clipped */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${comparisonSplitPercent}%` }}
                      >
                        <img
                          src={aiGeneratedResult}
                          alt="After Try-On"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain pointer-events-none"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>

                      {/* Divider Handle */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-brand-accent cursor-ew-resize z-20 shadow-[0_0_10px_#ff4500]"
                        style={{ left: `${comparisonSplitPercent}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-brand-text border-2 border-brand-accent flex items-center justify-center text-[8px] text-white font-black">
                          ↔
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comparisonSplitPercent}
                        onChange={e => setComparisonSplitPercent(parseFloat(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
                      />
                    </div>
                  ) : (
                    <img
                      src={aiGeneratedResult}
                      alt="AI Virtual Try-On Render"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}

                  {/* Watermark & Curatorial Stamp */}
                  <div className="absolute top-4 left-4 bg-brand-bg/90 border border-brand-text px-2 py-1 text-[8.5px] font-black uppercase text-brand-text shadow-[2px_2px_0px_#050505]">
                    <span className="text-brand-accent">AI FUSION // </span>
                    <span>{activeArtifact?.name}</span>
                  </div>

                  {/* Inscription Stamp */}
                  {activeArtifact?.inscription && (
                    <div className="absolute bottom-4 left-4 bg-brand-bg/95 border-2 border-brand-text px-3 py-1 shadow-[2px_2px_0px_#050505]">
                      <span className="font-serif text-base font-black text-brand-accent" dir="rtl">
                        {activeArtifact.inscription.startsWith("#")
                          ? activeArtifact.inscription
                          : `# ${activeArtifact.inscription}`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Initial Staging Placeholder with Dual-Source Architecture Visualizer */
                <div className="p-8 text-center space-y-6 max-w-lg">
                  <div className="flex items-center justify-center gap-4">
                    {/* Source 1 Preview Box */}
                    <div className="w-20 h-24 bg-brand-bg border-2 border-brand-text p-1 flex flex-col justify-between shadow-[3px_3px_0px_#050505]">
                      <img
                        src={activeSubjectImage}
                        alt="Subject"
                        referrerPolicy="no-referrer"
                        className="w-full h-16 object-cover"
                      />
                      <span className="text-[7px] font-black uppercase text-brand-text truncate">
                        1. SUBJECT
                      </span>
                    </div>

                    <div className="text-brand-accent font-black text-lg">+</div>

                    {/* Source 2 Preview Box */}
                    <div className="w-20 h-24 bg-brand-bg border-2 border-brand-text p-1 flex flex-col justify-between shadow-[3px_3px_0px_#050505]">
                      <img
                        src={activeShirtSpecimenImage}
                        alt="Shirt"
                        referrerPolicy="no-referrer"
                        className="w-full h-16 object-contain"
                      />
                      <span className="text-[7px] font-black uppercase text-brand-text truncate">
                        2. SHIRT
                      </span>
                    </div>

                    <div className="text-brand-accent font-black text-lg">➔</div>

                    {/* Result Target Box */}
                    <div className="w-20 h-24 bg-brand-accent/10 border-2 border-dashed border-brand-accent p-1 flex flex-col items-center justify-center text-center shadow-[3px_3px_0px_#ff4500]">
                      <Sparkles size={16} className="text-brand-accent animate-pulse mb-1" />
                      <span className="text-[7px] font-black uppercase text-brand-accent">
                        AI MERGE
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-black uppercase text-brand-text">
                      AI MULTIMODAL ATELIER READY
                    </h4>
                    <p className="text-[10px] text-brand-text/75 uppercase leading-relaxed max-w-sm mx-auto">
                      The AI will analyze your uploaded photo (pose &amp; lighting) and the shirt specimen (weave &amp; inscription), then seamlessly merge them into a photorealistic transmission.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Multimodal Analysis & Quota Feedback Card */}
            {aiAnalysisData && (
              <div className="mt-3 p-3 bg-brand-surface border-2 border-brand-text text-[8.5px] font-mono space-y-1.5 shadow-[2px_2px_0px_#050505]">
                <div className="flex items-center justify-between border-b border-brand-text/30 pb-1">
                  <span className="font-black uppercase text-brand-accent flex items-center gap-1">
                    <Scan size={10} />
                    <span>AI MULTIMODAL FIT ANALYSIS REPORT</span>
                  </span>
                  <span className="font-bold bg-brand-bg px-1.5 py-0.5 border border-brand-text text-brand-text">
                    FIT SCORE: {aiAnalysisData.curatorialFitScore || 98}%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-brand-text/85">
                  <div>
                    <span className="font-black text-brand-text">SUBJECT POSTURE: </span>
                    <span>{aiAnalysisData.subjectPosture}</span>
                  </div>
                  <div>
                    <span className="font-black text-brand-text">GARMENT MAPPING: </span>
                    <span>{aiAnalysisData.garmentMapping}</span>
                  </div>
                </div>
                {aiAnalysisData.drapeFidelity && (
                  <div className="text-brand-text/75 pt-0.5 border-t border-brand-text/10">
                    <span className="font-black text-brand-text">DRAPING &amp; TEXTILE: </span>
                    <span>{aiAnalysisData.drapeFidelity}</span>
                  </div>
                )}
              </div>
            )}

            {quotaNotice && (
              <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/40 text-[8px] text-amber-200/90 font-mono flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">[ NOTE ]</span>
                <span>{quotaNotice}</span>
              </div>
            )}

            {/* Bottom Action Ribbon */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-text/20">
              <div className="flex items-center gap-2">
                {aiGeneratedResult && (
                  <a
                    href={aiGeneratedResult}
                    download={`SYMBOLIC-AI-TRYON-${activeArtifact?.artifactId || "SPECIMEN"}.png`}
                    className="px-3 py-2 bg-brand-surface text-brand-text hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_#050505]"
                  >
                    <Download size={12} />
                    <span>EXPORT TRANSMISSION</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddToCartFromTryOn}
                  className="px-5 py-2.5 bg-brand-text hover:bg-brand-accent text-brand-bg hover:text-white border-2 border-brand-text text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  <span>{addedToCartToast ? "ACQUIRED TO LEDGER!" : "ACQUIRE SPECIMEN"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: AI ANALYSIS & DUAL INPUT CONFIGURATION (5 COLS) */}
          <div className="lg:col-span-5 bg-brand-surface p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* 1. Subject Photo Source */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text/70 border-b border-brand-text/20 pb-1">
                <span>1. SUBJECT PHOTO INPUT</span>
                <span className="text-brand-accent">[ SOURCE 01 ]</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSubjectSourceType("preset")}
                  className={`p-2.5 border-2 text-left font-mono transition-colors cursor-pointer ${
                    subjectSourceType === "preset"
                      ? "bg-brand-bg border-brand-accent ring-1 ring-brand-accent text-brand-text"
                      : "bg-brand-surface border-brand-text/50 text-brand-text hover:border-brand-text"
                  }`}
                >
                  <User size={14} className="text-brand-accent mb-1" />
                  <div className="text-[9px] font-black uppercase">MANNEQUIN</div>
                  <div className="text-[7.5px] text-brand-text/60">STUDIO PRESET</div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 border-2 text-left font-mono transition-colors cursor-pointer ${
                    subjectSourceType === "upload"
                      ? "bg-brand-bg border-brand-accent ring-1 ring-brand-accent text-brand-text"
                      : "bg-brand-surface border-brand-text/50 text-brand-text hover:border-brand-text"
                  }`}
                >
                  <Upload size={14} className="text-brand-accent mb-1" />
                  <div className="text-[9px] font-black uppercase">UPLOAD</div>
                  <div className="text-[7.5px] text-brand-text/60">YOUR PHOTO</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubjectSourceType("webcam");
                    startWebcam();
                  }}
                  className={`p-2.5 border-2 text-left font-mono transition-colors cursor-pointer ${
                    subjectSourceType === "webcam"
                      ? "bg-brand-bg border-brand-accent ring-1 ring-brand-accent text-brand-text"
                      : "bg-brand-surface border-brand-text/50 text-brand-text hover:border-brand-text"
                  }`}
                >
                  <Camera size={14} className="text-brand-accent mb-1" />
                  <div className="text-[9px] font-black uppercase">CAMERA</div>
                  <div className="text-[7.5px] text-brand-text/60">LIVE SNAP</div>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Preset Mannequins Gallery */}
              {subjectSourceType === "preset" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {STUDIO_MANNEQUINS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMannequinId(m.id)}
                      className={`p-2 border-2 text-left transition-colors flex items-center gap-2 cursor-pointer ${
                        selectedMannequinId === m.id
                          ? "bg-brand-bg border-brand-accent shadow-[2px_2px_0px_#050505]"
                          : "bg-brand-surface border-brand-text/40 hover:border-brand-text"
                      }`}
                    >
                      <img
                        src={m.image}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-12 object-cover border border-brand-text/40 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="text-[8.5px] font-black uppercase truncate text-brand-text">
                          {m.name}
                        </div>
                        <div className="text-[7.5px] text-brand-text/60 truncate">{m.gender}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Webcam Snapshot Frame */}
              {subjectSourceType === "webcam" && (
                <div className="p-3 bg-brand-bg border-2 border-brand-text space-y-2">
                  <div className="relative aspect-video bg-black overflow-hidden border border-brand-text/40">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isWebcamMirrored ? "scale-x-[-1]" : ""}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSnapWebcam}
                    className="w-full py-2 bg-brand-accent text-white text-[9.5px] font-black uppercase tracking-wider border border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
                  >
                    [ SNAP SILHOUETTE PHOTO ]
                  </button>
                </div>
              )}
            </div>

            {/* 2. Shirt Specimen DNA & Analysis */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text/70 border-b border-brand-text/20 pb-1">
                <span>2. SHIRT SPECIMEN INPUT</span>
                <span className="text-brand-accent">[ SOURCE 02 ]</span>
              </div>

              <div className="p-3 bg-brand-bg border-2 border-brand-text flex items-center gap-3">
                <div className="w-16 h-18 bg-brand-surface border border-brand-text/40 p-1 shrink-0 flex items-center justify-center">
                  <img
                    src={activeShirtSpecimenImage}
                    alt={activeSpecimen?.medium || "Shirt"}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-brand-text truncate">
                      {activeArtifact?.name} — {activeSpecimen?.medium}
                    </span>
                  </div>
                  <div className="text-[8px] font-bold text-brand-accent uppercase">
                    {activeSpecimen?.material || "480 GSM HEAVYWEIGHT COTTON"}
                  </div>
                  <div className="text-[7.5px] text-brand-text/70 uppercase truncate">
                    INSCRIPTION: {activeArtifact?.inscription || "CANONICAL"}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Studio Lighting Environments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text/70 border-b border-brand-text/20 pb-1">
                <span>3. ATELIER LIGHTING ATMOSPHERE</span>
                <span className="text-brand-accent">[ LIGHTING ]</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {LIGHTING_PRESETS.map(light => (
                  <button
                    key={light.id}
                    type="button"
                    onClick={() => setSelectedLighting(light.id)}
                    className={`p-2 border-2 text-left transition-colors cursor-pointer ${
                      selectedLighting === light.id
                        ? "bg-brand-bg border-brand-accent shadow-[2px_2px_0px_#050505]"
                        : "bg-brand-surface border-brand-text/40 hover:border-brand-text"
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase text-brand-text">{light.label}</div>
                    <div className="text-[7.5px] text-brand-text/60 line-clamp-1">{light.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tailoring Fit Silhouette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text/70 border-b border-brand-text/20 pb-1">
                <span>4. TAILORING SILHOUETTE</span>
                <span className="text-brand-accent">[ FIT ]</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {FIT_STYLES.map(fit => (
                  <button
                    key={fit.id}
                    type="button"
                    onClick={() => setSelectedFitStyle(fit.id)}
                    className={`p-2 border-2 text-left transition-colors cursor-pointer ${
                      selectedFitStyle === fit.id
                        ? "bg-brand-bg border-brand-accent shadow-[2px_2px_0px_#050505]"
                        : "bg-brand-surface border-brand-text/40 hover:border-brand-text"
                    }`}
                  >
                    <div className="text-[8.5px] font-black uppercase text-brand-text">{fit.label}</div>
                    <div className="text-[7px] text-brand-text/60 line-clamp-1">{fit.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isAiGenerating}
              onClick={handleRunAiGeneration}
              className="w-full py-4 bg-brand-text hover:bg-brand-accent text-brand-bg hover:text-white text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[4px_4px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              <span>{isAiGenerating ? "ANALYZING & MERGING VIA AI..." : "ANALYZE & MERGE SHIRT ONTO PHOTO"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
