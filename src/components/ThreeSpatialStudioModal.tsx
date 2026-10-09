import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  RotateCw, 
  Camera, 
  Layers, 
  Sun, 
  Sliders, 
  Sparkles, 
  ArrowRight, 
  Box, 
  Cpu, 
  Check, 
  RefreshCw,
  Compass,
  Maximize2
} from "lucide-react";
import ThreeArtifactViewer from "./ThreeArtifactViewer";
import { ThreeSpatialElementData } from "../types/threeGeometry";
import { Artifact, Specimen } from "../types";
import { soundManager } from "../lib/soundEffects";

interface ThreeSpatialStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts?: Artifact[];
  specimens?: Specimen[];
  initialArtifactId?: string | null;
  onSelectArtifactToAcquire?: (artifactId: string, specimenId?: string) => void;
}

const DEFAULT_3D_DATA: ThreeSpatialElementData = {
  name: "TAWHID OCTAGONAL STELLATION // ARCHITECTURAL FORM",
  classification: "Sacred Geometric Polyhedron // Khatam Sulayman",
  philosophicalMonograph: "A three-dimensional stereographic projection of the eight-pointed Islamic star (Khatam). Symmetrical interpenetration of twin cubes embodying celestial order, divine unity, and moral restraint in physical space.",
  geometryArchetype: "octagonal_stellation",
  mathematicalParameters: {
    proportions: "1 : 1.618 (Divine Golden Ratio)",
    symmetryGroup: "D8 Octagonal Dihedral Symmetries",
    tessellationOrder: 8,
    wireframeDensity: 24,
    scaleVector: [1.2, 1.2, 1.2],
    twistFactor: 0.15,
    bevelRadius: 0.08,
    radialSegments: 32
  },
  materialPhysics: {
    baseColor: "#141416",
    roughness: 0.65,
    metalness: 0.35,
    transmission: 0.05,
    wireframeColor: "#ff4500",
    ambientOcclusionIntensity: 0.8,
    finishType: "brutalist_concrete"
  },
  orbitalSatellites: [
    { name: "Orbital Axis Alpha", shape: "ring", distance: 2.4, speed: 0.8, size: 0.04, color: "#ff4500" },
    { name: "Tessellation Node 01", shape: "octahedron", distance: 2.1, speed: -0.6, size: 0.14, color: "#ffffff" },
    { name: "Tessellation Node 02", shape: "tetrahedron", distance: 2.7, speed: 0.4, size: 0.12, color: "#e2e8f0" }
  ],
  inscriptionEngraving: {
    arabicText: "كن ذا رمزية",
    transliteration: "Kun Dha Ramziyyah",
    englishTranslation: "BE SYMBOLIC // Wear conviction, not logos",
    coordinatePlacement: "equator"
  },
  lightingPreset: "atelier_neutral"
};

const PROMPT_SUGGESTIONS = [
  "Compute 8-point sacred stellation of Tawhid with brushed brass lattice",
  "Synthesize 480 GSM boxy drop-shoulder garment armor with dark obsidian drape",
  "Lathe 1,280°C high-fire stoneware contemplation vessel with brutalist base",
  "Generate infinite topological torus knot of steadfast conviction",
  "Sculpt monolithic octagonal prism with engraved Arabic inscription relief"
];

export default function ThreeSpatialStudioModal({
  isOpen,
  onClose,
  artifacts = [],
  specimens = [],
  initialArtifactId,
  onSelectArtifactToAcquire
}: ThreeSpatialStudioModalProps) {
  const [spatialData, setSpatialData] = useState<ThreeSpatialElementData>(DEFAULT_3D_DATA);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(initialArtifactId || null);
  const [viewMode, setViewMode] = useState<"dual" | "solid" | "wireframe" | "exploded">("dual");
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1.0);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [lightingPreset, setLightingPreset] = useState<"atelier_neutral" | "high_contrast_noir" | "warm_amber_sanctuary">("atelier_neutral");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync selected artifact if changed from outside
  useEffect(() => {
    if (initialArtifactId) {
      setSelectedArtifactId(initialArtifactId);
    }
  }, [initialArtifactId]);

  // Lookup active artifact entity
  const activeArtifact = artifacts.find(
    a => a.id === selectedArtifactId || a.artifactId === selectedArtifactId
  ) || artifacts[0] || null;

  // Request Gemini 3D Geometry synthesis
  const handleGenerate3D = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || customPrompt;
    setIsGenerating(true);
    setStatusMessage("Querying Gemini 3D Parametric Engine...");
    soundManager.playClick(0.12);

    try {
      const activeSpecimen = specimens.find(
        s => s.parentArtifactId === activeArtifact?.id || s.parentArtifactId === activeArtifact?.artifactId || activeArtifact?.specimenIds?.includes(s.id)
      );

      const response = await fetch("/api/3d/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          artifactId: activeArtifact?.id || activeArtifact?.artifactId,
          artifactName: activeArtifact?.name,
          medium: activeSpecimen?.medium || "Heavyweight Specimen",
          material: activeSpecimen?.material || "480 GSM Cotton",
          inscription: activeArtifact?.inscription || "كن ذا رمزية",
          concept: activeArtifact?.concept || "Self-representation through what we wear"
        })
      });

      const resJson = await response.json();
      if (resJson?.success && resJson?.data) {
        setSpatialData({
          ...resJson.data,
          lightingPreset: lightingPreset
        });
        setStatusMessage(`3D Specimen Synthesized via ${resJson.source || "Gemini"}`);
        soundManager.playSuccess(0.15);
      } else {
        setStatusMessage("Parametric architecture updated.");
      }
    } catch (err: any) {
      console.error("Gemini 3D generation error:", err);
      setStatusMessage("Spatial engine ready.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Trigger initial generation when opening with a specific artifact
  useEffect(() => {
    if (isOpen && activeArtifact) {
      handleGenerate3D(`Synthesize 3D geometry for ${activeArtifact.name} (${activeArtifact.concept || "Symbolic specimen"})`);
    }
  }, [isOpen, selectedArtifactId]);

  // Snapshot handler
  const handleCaptureSnapshot = () => {
    soundManager.playClick(0.15);
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `SYMBOLIC-3D-${spatialData.name.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
        {/* Main Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-7xl h-[92vh] max-h-[920px] bg-brand-bg border-2 border-brand-text shadow-[10px_10px_0px_#050505] flex flex-col overflow-hidden"
        >
          {/* Studio Top Header */}
          <div className="h-13 px-4 sm:px-6 bg-brand-surface border-b-2 border-brand-text flex items-center justify-between shrink-0 font-mono select-none">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-brand-accent animate-pulse" />
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-brand-text">
                  3D SPATIAL ATELIER
                </span>
                <span className="hidden md:inline text-[9.5px] font-bold text-brand-text/50 uppercase tracking-wider">
                  // COMPUTATIONAL GEOMETRY BY GEMINI
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {statusMessage && (
                <span className="hidden sm:inline font-mono text-[9px] font-bold text-brand-accent uppercase tracking-wider animate-pulse">
                  [ {statusMessage} ]
                </span>
              )}

              <button
                onClick={() => {
                  soundManager.playClick(0.12);
                  onClose();
                }}
                className="h-8 px-2.5 flex items-center justify-center gap-1.5 bg-brand-bg hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text shadow-[2px_2px_0px_#050505] text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                title="Close 3D Atelier"
              >
                <X size={14} />
                <span className="hidden sm:inline">EXIT</span>
              </button>
            </div>
          </div>

          {/* Modal Body: Split Screen (Left: Three.js Canvas, Right: Gemini Controller & Monograph) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            
            {/* LEFT: 3D WebGL Canvas Viewport (7 cols on Desktop) */}
            <div className="lg:col-span-7 xl:col-span-8 relative flex flex-col bg-neutral-950 min-h-[300px] border-b-2 lg:border-b-0 lg:border-r-2 border-brand-text overflow-hidden">
              
              {/* Three.js Canvas */}
              <div className="flex-1 w-full h-full relative">
                <ThreeArtifactViewer
                  data={spatialData}
                  viewMode={viewMode}
                  isAutoRotate={isAutoRotate}
                  rotationSpeed={rotationSpeed}
                  explodeFactor={explodeFactor}
                  showLattice={true}
                  className="w-full h-full"
                />

                {/* Corner HUD: Inscription Watermark */}
                <div className="absolute top-3 left-3 pointer-events-none z-10 font-mono text-left bg-black/60 backdrop-blur-sm p-2.5 border border-white/10 max-w-[280px]">
                  <div className="text-[14px] font-serif text-brand-accent tracking-wide font-bold">
                    {spatialData.inscriptionEngraving.arabicText}
                  </div>
                  <div className="text-[8.5px] font-bold text-white/90 tracking-widest uppercase mt-0.5">
                    {spatialData.inscriptionEngraving.transliteration}
                  </div>
                  <div className="text-[7.5px] text-white/50 tracking-wider uppercase mt-0.5">
                    "{spatialData.inscriptionEngraving.englishTranslation}"
                  </div>
                </div>

                {/* Top Right: Atmosphere & Snapshot */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 font-mono">
                  <button
                    onClick={() => {
                      const nextLight = lightingPreset === "atelier_neutral" 
                        ? "high_contrast_noir" 
                        : lightingPreset === "high_contrast_noir"
                        ? "warm_amber_sanctuary"
                        : "atelier_neutral";
                      setLightingPreset(nextLight);
                      setSpatialData(prev => ({ ...prev, lightingPreset: nextLight }));
                      soundManager.playClick(0.08);
                    }}
                    className="h-7 px-2 bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    title="Toggle Lighting Atmosphere"
                  >
                    <Sun size={11} className="text-amber-400" />
                    <span className="hidden sm:inline">
                      {lightingPreset === "warm_amber_sanctuary" ? "AMBER" : lightingPreset === "high_contrast_noir" ? "NOIR" : "ATELIER"}
                    </span>
                  </button>

                  <button
                    onClick={handleCaptureSnapshot}
                    className="h-7 px-2 bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    title="Export 3D Render Snapshot"
                  >
                    <Camera size={11} className="text-brand-accent" />
                    <span className="hidden sm:inline">SNAPSHOT</span>
                  </button>
                </div>

                {/* Bottom Center: Viewport Gesture Instructions */}
                <div className="absolute bottom-16 sm:bottom-14 left-1/2 -translate-x-1/2 pointer-events-none z-10 font-mono text-[8px] sm:text-[8.5px] text-white/40 uppercase tracking-widest px-2.5 py-1 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap">
                  DRAG: ORBIT 360° · SCROLL: ZOOM · RIGHT-DRAG: PAN
                </div>

                {/* Bottom Viewport HUD Controls Strip */}
                <div className="absolute bottom-2 inset-x-2 sm:inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 p-1.5 sm:p-2 bg-black/80 backdrop-blur-md border border-white/15 font-mono">
                  
                  {/* View Mode Tabs */}
                  <div className="flex items-center gap-1">
                    {(["dual", "solid", "wireframe", "exploded"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          soundManager.playClick(0.08);
                          if (mode === "exploded" && explodeFactor === 0) setExplodeFactor(0.6);
                          if (mode !== "exploded" && explodeFactor > 0) setExplodeFactor(0);
                        }}
                        className={`h-6 sm:h-7 px-2 text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          viewMode === mode
                            ? "bg-brand-accent text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                        }`}
                      >
                        {mode === "dual" ? "DUAL CORE" : mode === "solid" ? "SOLID PBR" : mode === "wireframe" ? "LATTICE" : "EXPLODED"}
                      </button>
                    ))}
                  </div>

                  {/* Auto-Rotate & Explode Sliders */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsAutoRotate(!isAutoRotate)}
                      className={`h-6 sm:h-7 px-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer ${
                        isAutoRotate ? "bg-white/20 text-white" : "bg-transparent text-white/40 hover:text-white"
                      }`}
                      title="Toggle Continuous Turntable Orbit"
                    >
                      <RotateCw size={10} className={isAutoRotate ? "animate-spin" : ""} />
                      <span>{isAutoRotate ? "ORBIT ON" : "ORBIT PAUSED"}</span>
                    </button>

                    {viewMode === "exploded" && (
                      <div className="flex items-center gap-1 text-[8.5px] text-white/70">
                        <span>EXPLODE:</span>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={explodeFactor}
                          onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                          className="w-16 accent-brand-accent cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Gemini 3D Synthesizer & Specimen Dossier (5 cols on Desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-brand-surface overflow-y-auto font-mono p-4 sm:p-5 space-y-5">
              
              {/* Specimen Archetype Header */}
              <div>
                <div className="flex items-center justify-between text-[9px] font-bold text-brand-text/50 uppercase tracking-widest mb-1">
                  <span>// MATHEMATICAL DOSSIER</span>
                  <span className="text-brand-accent">{spatialData.mathematicalParameters.symmetryGroup}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-brand-text">
                  {spatialData.name}
                </h3>
                <div className="text-[10px] font-bold text-brand-accent uppercase tracking-wider mt-0.5">
                  [ {spatialData.classification} ]
                </div>
              </div>

              {/* Philosophical Monograph by Gemini */}
              <div className="p-3 bg-brand-bg border border-brand-text/30 shadow-[2px_2px_0px_#050505]">
                <div className="text-[8px] font-black uppercase tracking-widest text-brand-text/50 mb-1">
                  // CURATORIAL MONOGRAPH
                </div>
                <p className="text-[11px] leading-relaxed text-brand-text/85">
                  {spatialData.philosophicalMonograph}
                </p>
              </div>

              {/* Gemini 3D Direction Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-brand-text/70">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-brand-accent" />
                    DIRECT GEMINI 3D ENGINE
                  </span>
                  <span className="text-[8px] text-brand-text/50">PROMPT OR TRANSFORM</span>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isGenerating) handleGenerate3D();
                    }}
                    placeholder="e.g. Sculpt 12-point star with brushed brass lattice..."
                    className="flex-1 px-2.5 py-2 bg-brand-bg text-brand-text text-[10.5px] font-mono border border-brand-text shadow-[1.5px_1.5px_0px_#050505] focus:outline-none focus:border-brand-accent"
                  />
                  <button
                    onClick={() => handleGenerate3D()}
                    disabled={isGenerating}
                    className="px-3 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    <span>{isGenerating ? "COMPUTING" : "SYNTHESIZE"}</span>
                  </button>
                </div>

                {/* Prompt Directives */}
                <div className="space-y-1 pt-1">
                  <div className="text-[8px] font-bold text-brand-text/40 uppercase tracking-widest">
                    QUICK MATHEMATICAL DIRECTIVES:
                  </div>
                  <div className="flex flex-col gap-1">
                    {PROMPT_SUGGESTIONS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCustomPrompt(preset);
                          handleGenerate3D(preset);
                        }}
                        className="text-left px-2 py-1 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border border-brand-text/20 text-[9px] text-brand-text/80 transition-colors cursor-pointer truncate"
                      >
                        → {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mathematical Metrics Grid */}
              <div className="space-y-1.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-brand-text/50">
                  // COMPUTED TOPOLOGICAL METRICS
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                  <div className="p-2 bg-brand-bg border border-brand-text/20">
                    <div className="text-[7.5px] text-brand-text/50 uppercase">PROPORTIONS</div>
                    <div className="font-bold text-brand-text">{spatialData.mathematicalParameters.proportions}</div>
                  </div>
                  <div className="p-2 bg-brand-bg border border-brand-text/20">
                    <div className="text-[7.5px] text-brand-text/50 uppercase">SURFACE TEXTURE</div>
                    <div className="font-bold text-brand-text uppercase">{spatialData.materialPhysics.finishType.replace(/_/g, " ")}</div>
                  </div>
                  <div className="p-2 bg-brand-bg border border-brand-text/20">
                    <div className="text-[7.5px] text-brand-text/50 uppercase">TESSELLATION ORDER</div>
                    <div className="font-bold text-brand-text">{spatialData.mathematicalParameters.tessellationOrder}-Fold Radial</div>
                  </div>
                  <div className="p-2 bg-brand-bg border border-brand-text/20">
                    <div className="text-[7.5px] text-brand-text/50 uppercase">ORBITAL NODES</div>
                    <div className="font-bold text-brand-text">{spatialData.orbitalSatellites.length} Satellites Active</div>
                  </div>
                </div>
              </div>

              {/* Link to Physical Specimen Acquisition */}
              {activeArtifact && (
                <div className="pt-2 border-t border-brand-text/30">
                  <button
                    onClick={() => {
                      soundManager.playClick(0.14);
                      onClose();
                      if (onSelectArtifactToAcquire) {
                        const targetSpecimen = specimens.find(
                          s => s.parentArtifactId === activeArtifact.id || s.parentArtifactId === activeArtifact.artifactId || activeArtifact.specimenIds?.includes(s.id)
                        );
                        onSelectArtifactToAcquire(
                          activeArtifact.artifactId || activeArtifact.id,
                          targetSpecimen?.id
                        );
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-brand-accent hover:bg-brand-text text-white text-[10.5px] font-black uppercase tracking-wider border border-brand-text shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>ACQUIRE PHYSICAL SPECIMEN</span>
                    <ArrowRight size={13} />
                  </button>
                  <div className="text-[8px] text-brand-text/50 text-center uppercase tracking-widest mt-1">
                    TRANSMIT ORDER TO PHYSICAL CUSTODIAL REGISTRY
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
