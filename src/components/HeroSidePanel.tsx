import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sliders, 
  Layers, 
  Move, 
  Upload, 
  Play, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Maximize2, 
  Image as ImageIcon,
  Compass, 
  Grid, 
  Zap, 
  RefreshCw, 
  Pin, 
  PinOff, 
  X, 
  Check, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Type,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Italic,
  Monitor,
  Smartphone,
  Eye,
  Copy,
  Database,
  Plus,
  Download
} from "lucide-react";
import { 
  CustomHeroConfig,
  HeroLayerConfig,
  HeroLayerId,
  HeroTransitionDirection, 
  HeroTransitionSpeed, 
  HeroHoverEffect,
  TextObject,
  GraphicObject,
  BackdropConfig,
  HeroButtonsConfig,
  DeviceTarget,
  AvatarGraphic
} from "../types";
import { 
  DEFAULT_HERO_CONFIG, 
  DEFAULT_BG_LAYER,
  DEFAULT_MID_LAYER,
  DEFAULT_FG_LAYER,
  DEFAULT_BACKDROP,
  DEFAULT_HERO_BUTTONS,
  normalizeHeroConfig,
  saveHeroConfig, 
  resetHeroConfig,
  downloadHeroConfigJson,
  summonRepoGraphics,
  summonSingleLayerGraphics,
  summonRepoGraphicsStepByStep
} from "../lib/heroService";
import { processFileToCompressedDataUrl } from "../lib/imageOptimization";
import { soundManager } from "../lib/soundEffects";
import { 
  subscribeAvatarGraphics, 
  addAvatarGraphicToDatabase, 
  deleteAvatarGraphicFromDatabase 
} from "../lib/avatarGraphicsService";

interface HeroSidePanelProps {
  config: CustomHeroConfig;
  onUpdateConfig: (newConfig: CustomHeroConfig | ((prev: CustomHeroConfig) => CustomHeroConfig)) => void;
  userEmail?: string;
  isOpenControlled?: boolean;
  onToggleControlled?: () => void;
  activeObjectId: string;
  onActiveObjectChange: (id: string) => void;
  deviceEditMode?: "desktop" | "mobile";
  onDeviceEditModeChange?: (mode: "desktop" | "mobile") => void;
}

// 9-Point Instant Anchor Presets
const ANCHOR_PRESETS = [
  { label: "TOP-LEFT", x: 22, y: 25 },
  { label: "TOP-CENTER", x: 50, y: 25 },
  { label: "TOP-RIGHT", x: 78, y: 25 },
  { label: "MID-LEFT", x: 22, y: 50 },
  { label: "CENTER", x: 50, y: 50 },
  { label: "MID-RIGHT", x: 78, y: 50 },
  { label: "BOT-LEFT", x: 22, y: 75 },
  { label: "BOT-CENTER", x: 50, y: 75 },
  { label: "BOT-RIGHT", x: 78, y: 75 },
];

// Directional transition options
const DIRECTION_OPTIONS: { id: HeroTransitionDirection; label: string; icon: React.ReactNode }[] = [
  { id: "bottom", label: "BOTTOM", icon: <ArrowUp size={13} /> },
  { id: "top", label: "TOP", icon: <ArrowDown size={13} /> },
  { id: "left", label: "LEFT", icon: <ArrowRight size={13} /> },
  { id: "right", label: "RIGHT", icon: <ArrowLeft size={13} /> },
  { id: "scale", label: "SCALE", icon: <Maximize2 size={13} /> },
  { id: "fade", label: "FADE", icon: <Sparkles size={13} /> },
];

// Transition speed options
const SPEED_OPTIONS: { id: HeroTransitionSpeed; label: string }[] = [
  { id: "spring", label: "SPRING" },
  { id: "snappy", label: "SNAPPY (0.5s)" },
  { id: "smooth", label: "SMOOTH (0.9s)" },
  { id: "dramatic", label: "DRAMATIC (1.4s)" },
];

// Hover effect options
const HOVER_OPTIONS: { id: HeroHoverEffect; label: string }[] = [
  { id: "none", label: "STATIC" },
  { id: "float", label: "IDLE FLOAT" },
  { id: "tilt", label: "KINETIC TILT" },
  { id: "pulse", label: "BREATHE" },
];

// Curated avatar & specimen presets removed to strictly use repository assets

export default function HeroSidePanel({ 
  config, 
  onUpdateConfig, 
  userEmail,
  isOpenControlled,
  onToggleControlled,
  activeObjectId,
  onActiveObjectChange,
  deviceEditMode: externalDeviceMode,
  onDeviceEditModeChange
}: HeroSidePanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<HeroLayerId>(() => config.activeEditingLayer || "mid");
  const [internalDeviceMode, setInternalDeviceMode] = useState<"desktop" | "mobile">("desktop");
  
  const deviceEditMode = externalDeviceMode ?? internalDeviceMode;
  const isMobileMode = deviceEditMode === "mobile";
  const setDeviceEditMode = (mode: "desktop" | "mobile") => {
    if (onDeviceEditModeChange) {
      onDeviceEditModeChange(mode);
    } else {
      setInternalDeviceMode(mode);
    }
  };
  const [nudgeStep, setNudgeStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCopiedJson, setIsCopiedJson] = useState(false);
  const [stepProgressStatus, setStepProgressStatus] = useState<string>("");

  const handleCopyJson = () => {
    soundManager.playClick(0.1);
    try {
      const jsonStr = JSON.stringify(config, null, 2);
      navigator.clipboard.writeText(jsonStr);
      setIsCopiedJson(true);
      setTimeout(() => setIsCopiedJson(false), 2500);
    } catch (err: any) {
      alert("Failed to copy JSON to clipboard: " + (err?.message || "Error"));
    }
  };

  // Database Avatar Graphics catalog state
  const [dbAvatarGraphics, setDbAvatarGraphics] = useState<AvatarGraphic[]>([]);
  const [newGraphicName, setNewGraphicName] = useState("");
  const [isAddingGraphicToDb, setIsAddingGraphicToDb] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to live Avatar Graphics database collection
  useEffect(() => {
    const unsub = subscribeAvatarGraphics((list) => {
      setDbAvatarGraphics(list);
    });
    return () => unsub();
  }, []);

  // Sync activeLayerId if parent config changes
  useEffect(() => {
    if (config.activeEditingLayer && config.activeEditingLayer !== activeLayerId) {
      setActiveLayerId(config.activeEditingLayer);
    }
  }, [config.activeEditingLayer]);

  const effectiveIsOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;

  const toggleOpen = () => {
    soundManager.playClick(0.08);
    if (onToggleControlled) {
      onToggleControlled();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Active layer getter
  const activeLayerKey = activeLayerId === "bg" ? "bgLayer" : activeLayerId === "fg" ? "fgLayer" : activeLayerId === "backdrop" ? "backdrop" : "midLayer";
  const currentLayer: any = activeLayerId === "backdrop" ? (config.backdrop || DEFAULT_BACKDROP) : (config[activeLayerKey as keyof CustomHeroConfig] || (activeLayerId === "bg" ? DEFAULT_BG_LAYER : activeLayerId === "fg" ? DEFAULT_FG_LAYER : DEFAULT_MID_LAYER));

  // Selected object identifier logic
  const isMainGraphic = activeObjectId === "graphic";
  const selectedSecondaryGraphic = currentLayer.graphicObjects?.find((g: GraphicObject) => g.id === activeObjectId);
  const selectedSecondaryGraphicIndex = currentLayer.graphicObjects?.findIndex((g: GraphicObject) => g.id === activeObjectId) ?? -1;
  const isGraphicSelected = isMainGraphic || !!selectedSecondaryGraphic;

  const selectedTextObject = currentLayer.textObjects?.find((t: TextObject) => t.id === activeObjectId);
  const selectedTextIndex = currentLayer.textObjects?.findIndex((t: TextObject) => t.id === activeObjectId) ?? -1;

  // Active graphic object entity for display (either main layer or secondary graphic)
  const currentGraphicEntity: any = isMainGraphic ? currentLayer : selectedSecondaryGraphic;

  // Helper to update properties on the active layer atomically in local state
  const updateLayerProps = (updates: Partial<HeroLayerConfig>) => {
    onUpdateConfig((prev: CustomHeroConfig) => {
      const layerToUpdate = activeLayerId === "bg" ? (prev.bgLayer || DEFAULT_BG_LAYER) : activeLayerId === "fg" ? (prev.fgLayer || DEFAULT_FG_LAYER) : (prev.midLayer || DEFAULT_MID_LAYER);
      const updatedLayer = { ...layerToUpdate, ...updates };
      const nextConfig = {
        ...prev,
        activeEditingLayer: activeLayerId,
        [activeLayerKey]: updatedLayer,
        ...(activeLayerId === "mid" ? updates : {}),
      };
      return nextConfig;
    });
  };

  const updateLayerProp = <K extends keyof HeroLayerConfig>(key: K, value: HeroLayerConfig[K]) => {
    if (activeLayerId === "backdrop") {
      updateTopProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), [key]: value });
    } else {
      updateLayerProps({ [key]: value });
    }
  };

  // Helper to update top-level config property
  const updateTopProp = <K extends keyof CustomHeroConfig>(key: K, value: CustomHeroConfig[K]) => {
    const newConfig: CustomHeroConfig = { ...config, [key]: value };
    onUpdateConfig(newConfig);
  };

  // Unified updater that targets either the layer graphic, secondary graphic, or a specific text object
  const updateActiveObjectProps = (updates: any) => {
    if (activeLayerId === "backdrop") {
      updateTopProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), ...updates });
    } else if (isMainGraphic) {
      updateLayerProps(updates);
    } else if (selectedSecondaryGraphic) {
      const newGraphics = [...(currentLayer.graphicObjects || [])];
      newGraphics[selectedSecondaryGraphicIndex] = { ...selectedSecondaryGraphic, ...updates };
      updateLayerProps({ graphicObjects: newGraphics });
    } else if (selectedTextObject) {
      const newTextObjects = [...(currentLayer.textObjects || [])];
      newTextObjects[selectedTextIndex] = { ...selectedTextObject, ...updates };
      updateLayerProps({ textObjects: newTextObjects });
    }
  };

  const getActiveObjectValue = <K extends keyof HeroLayerConfig | keyof TextObject | keyof GraphicObject | keyof BackdropConfig>(key: K, fallback: any): any => {
    if (activeLayerId === "backdrop") return (config.backdrop as any)?.[key] ?? (DEFAULT_BACKDROP as any)[key] ?? fallback;
    if (isMainGraphic) return (currentLayer as any)[key] ?? fallback;
    if (selectedSecondaryGraphic) return (selectedSecondaryGraphic as any)[key] ?? fallback;
    if (selectedTextObject) return (selectedTextObject as any)[key] ?? fallback;
    return fallback;
  };

  // Nudge active object (desktop vs mobile mode aware)
  const handleNudge = (dx: number, dy: number) => {
    soundManager.playClick(0.04);
    if (deviceEditMode === "mobile") {
      const curX = getActiveObjectValue("mobilePosX", getActiveObjectValue("posX", 50));
      const curY = getActiveObjectValue("mobilePosY", getActiveObjectValue("posY", 50));
      const newX = Math.max(-80, Math.min(180, curX + dx * nudgeStep));
      const newY = Math.max(-80, Math.min(180, curY + dy * nudgeStep));
      updateActiveObjectProps({ 
        mobileEnabled: true,
        mobilePosX: newX, 
        mobilePosY: newY 
      });
    } else {
      const curX = getActiveObjectValue("posX", 50);
      const curY = getActiveObjectValue("posY", 50);
      const newX = Math.max(-80, Math.min(180, curX + dx * nudgeStep));
      const newY = Math.max(-80, Math.min(180, curY + dy * nudgeStep));
      updateActiveObjectProps({ posX: newX, posY: newY });
    }
  };

  // Hover management with debounce buffer
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setInternalIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setInternalIsOpen(false);
    }, 450);
  };

  // Save changes to hero-config.json file
  const handleSave = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      await saveHeroConfig(config, userEmail, true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error("Save hero JSON config error:", err);
      alert("Hero Config Save Note: " + (err?.message || "Could not save to JSON file."));
    } finally {
      setIsSaving(false);
    }
  };

  // Import saved JSON configuration file directly into database and apply
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeHeroConfig(parsed);
      
      // Save directly to server JSON and Firestore database /settings/hero
      const saved = await saveHeroConfig(normalized, userEmail, true);
      onUpdateConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert("Hero JSON successfully imported, saved to database, and applied to Main Hero!");
    } catch (err: any) {
      alert("Failed to import JSON file: " + (err?.message || "Invalid JSON format"));
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = "";
    }
  };

  // Summon all repo graphics step by step layer by layer: (Backdrop -> Background -> Avatar -> Foreground)
  const handleSummonStepByStep = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      setStepProgressStatus("Step 1/4: Scanning Backdrop layer...");
      const { config: updatedConfig, totalCount, summary } = await summonRepoGraphicsStepByStep(
        config,
        (stepName, count) => {
          setStepProgressStatus(`Step: ${stepName} (${count} added)...`);
        }
      );
      onUpdateConfig(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setStepProgressStatus("");
      }, 4000);
      alert(`Step-by-step layer summoning complete!\nTotal Graphics Summoned: ${totalCount}\n\nBreakdown by Layer:\n• BACKDROP: ${summary["BACKDROP"] || 0}\n• BACKGROUND: ${summary["BACKGROUND"] || 0}\n• AVATAR: ${summary["AVATAR"] || 0}\n• FOREGROUND: ${summary["FOREGROUND"] || 0}`);
    } catch (err: any) {
      alert("Failed step-by-step layer summoning: " + (err?.message || "Unknown error"));
      setStepProgressStatus("");
    } finally {
      setIsSaving(false);
    }
  };

  // Summon graphics specifically for a single layer
  const handleSummonSingleLayer = async (targetLayerId: "backdrop" | "bg" | "mid" | "fg") => {
    setIsSaving(true);
    soundManager.playClick(0.14);
    try {
      const { config: updatedConfig, count, layerLabel } = await summonSingleLayerGraphics(config, targetLayerId);
      onUpdateConfig(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`Summoned ${count} graphics into ${layerLabel} layer!`);
    } catch (err: any) {
      alert(`Failed to summon ${targetLayerId} layer graphics: ` + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Summon all repo graphics from code/directory
  const handleSummonGraphics = async () => {
    setIsSaving(true);
    soundManager.playClick(0.16);
    try {
      const { config: updatedConfig, count } = await summonRepoGraphics(config);
      onUpdateConfig(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`Summoned ${count} repo graphics! Set parameters for each graphic and click EXPORT to save JSON.`);
    } catch (err: any) {
      alert("Failed to summon repo graphics: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm("Reset hero canvas back to default settings?")) return;
    soundManager.playClick(0.12);
    setIsSaving(true);
    try {
      const reset = await resetHeroConfig(userEmail);
      onUpdateConfig(reset);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard arrow listeners when panel is open
  useEffect(() => {
    if (!effectiveIsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNudge(0, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNudge(0, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNudge(-1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNudge(1, 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [effectiveIsOpen, nudgeStep, activeLayerId, activeObjectId, currentLayer]);

  // ... rest of existing effects (handleMouseEnter, handleMouseLeave, handleSave, handleReset, handleFileUpload)

  return (
    <aside 
      aria-label="Hero Canvas Studio Controls"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-stretch select-none pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Docked Collapsed Side Tab (Hover trigger) */}
      <motion.button
        type="button"
        onClick={toggleOpen}
        initial={false}
        animate={{
          x: effectiveIsOpen ? 6 : 0,
          opacity: 1,
        }}
        className={`flex items-center gap-2 py-4 px-2.5 bg-brand-surface border-y-2 border-l-2 border-brand-text text-brand-text shadow-[-4px_4px_0px_#050505] cursor-pointer transition-colors group ${
          effectiveIsOpen ? "bg-brand-text text-brand-bg border-brand-accent" : "hover:bg-brand-text hover:text-brand-bg"
        }`}
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
        title="Hover or Click to Expand Hero Canvas Controls"
      >
        <div className="flex items-center gap-1.5 rotate-180">
          <Compass size={14} className="text-brand-accent animate-spin-slow shrink-0" />
          <span className="font-mono text-[9px] font-black uppercase tracking-widest">
            HERO CANVAS // CONTROLS
          </span>
          <span className="text-[7.5px] px-1 py-0.5 bg-brand-accent text-white font-mono font-bold uppercase rounded-[1px]">
            {activeLayerId.toUpperCase()}
          </span>
        </div>
      </motion.button>

      {/* Slide-out Flyout Side Panel */}
      <AnimatePresence>
        {effectiveIsOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 28,
              mass: 0.8,
            }}
            className="w-[calc(100vw-1.25rem)] sm:w-[390px] max-w-[390px] max-h-[92vh] sm:max-h-[88vh] bg-brand-surface/98 backdrop-blur-md border-2 border-brand-text shadow-[-4px_4px_0px_#050505] flex flex-col font-mono text-brand-text overflow-hidden rounded-l-md"
          >
            {/* Panel Header & Control Bar */}
            <div className="p-3.5 bg-brand-bg border-b-2 border-brand-text flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-accent rounded-full animate-ping" />
                <h3 className="font-black text-[11px] uppercase tracking-wider text-brand-text">
                  HERO CANVAS CONTROLS
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Pin / Lock Open Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.08);
                    setIsPinned(!isPinned);
                  }}
                  className={`p-1.5 border border-brand-text text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all ${
                    isPinned ? "bg-brand-accent text-white" : "bg-brand-surface hover:bg-brand-text hover:text-brand-bg"
                  }`}
                  title={isPinned ? "Pinned Open (Click to Unpin)" : "Pin Panel Open"}
                >
                  {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                  <span className="text-[8px] hidden sm:inline">{isPinned ? "PINNED" : "PIN"}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.06);
                    setInternalIsOpen(false);
                    setIsPinned(false);
                    if (onToggleControlled) onToggleControlled();
                  }}
                  className="p-1.5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text cursor-pointer transition-colors"
                  title="Close Panel"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Scrollable Controls Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-brand-text">
              
              {/* Top Quick Actions (Summon Repo Graphics + Save to JSON & Export + Reset) */}
              <div className="space-y-1.5 pb-2 border-b border-brand-text/15">
                <div className="flex items-center justify-between text-[8px] font-mono text-brand-text/60 uppercase">
                  <span>METADATA STORAGE:</span>
                  <span className="text-emerald-600 font-bold">hero-config.json [ZERO DB USAGE]</span>
                </div>

                {/* Step-by-Step Layer Summoning Button */}
                <button
                  type="button"
                  onClick={handleSummonStepByStep}
                  disabled={isSaving}
                  className="w-full py-2 px-2 bg-brand-accent hover:bg-black text-white border-2 border-brand-text text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Reads layers sequentially step-by-step: 1. Backdrop -> 2. Background -> 3. Avatar -> 4. Foreground"
                >
                  <Sparkles size={13} className="text-white animate-pulse" />
                  <span>SUMMON STEP-BY-STEP (ALL LAYERS)</span>
                </button>

                {/* Single Batch Summon Graphics Button */}
                <button
                  type="button"
                  onClick={handleSummonGraphics}
                  disabled={isSaving}
                  className="w-full py-1.5 px-2 bg-amber-500 hover:bg-black text-black hover:text-white border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Render all local repo graphics into Studio Hero canvas in one batch"
                >
                  <Sparkles size={12} className="text-black group-hover:text-white" />
                  <span>QUICK SUMMON ALL GRAPHICS</span>
                </button>

                {stepProgressStatus && (
                  <div className="p-1.5 bg-brand-accent/10 border border-brand-accent text-brand-accent text-[8px] font-mono font-bold uppercase tracking-wider text-center animate-pulse">
                    {stepProgressStatus}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="py-2 px-1.5 bg-brand-accent text-white hover:bg-black border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                    title="Persist hero coordinates and animations into hero-config.json"
                  >
                    {saveSuccess ? <Check size={11} /> : <Zap size={11} />}
                    <span>{isSaving ? "SAVING..." : saveSuccess ? "SAVED!" : "SAVE JSON"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.1);
                      downloadHeroConfigJson(config);
                    }}
                    className="py-2 px-1.5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    title="Export and download hero-config.json"
                  >
                    <Download size={11} />
                    <span>EXPORT</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="py-2 px-1.5 bg-brand-surface hover:bg-brand-accent hover:text-white border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    title="Copy hero configuration JSON directly to clipboard"
                  >
                    {isCopiedJson ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{isCopiedJson ? "COPIED!" : "COPY JSON"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSaving}
                    className="py-2 px-1.5 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={10} />
                    <span>RESET</span>
                  </button>
                </div>
              </div>

              {/* Target Device Mode Switcher (PC vs Mobile Phone) */}
              <div className="space-y-1.5 p-2 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                <div className="flex items-center justify-between text-[8.5px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={12} className="text-brand-accent" />
                    <span>DEVICE MODE:</span>
                  </span>
                  <span className={`text-[7px] font-mono px-1.5 py-0.2 border uppercase ${
                    deviceEditMode === "mobile" 
                      ? "bg-brand-accent text-white border-brand-accent font-black animate-pulse" 
                      : "bg-brand-surface text-brand-text border-brand-text/40 font-bold"
                  }`}>
                    {deviceEditMode === "mobile" ? "📱 MOBILE ACTIVE" : "💻 PC ACTIVE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.08);
                      setDeviceEditMode("desktop");
                    }}
                    className={`py-1.5 px-2 flex items-center justify-center gap-1.5 border-2 border-brand-text text-[8px] font-black uppercase transition-all cursor-pointer ${
                      deviceEditMode === "desktop"
                        ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#ff4500] -translate-y-0.5"
                        : "bg-brand-surface hover:bg-brand-bg text-brand-text shadow-[1px_1px_0px_#050505]"
                    }`}
                  >
                    <Monitor size={12} />
                    <span>PC / DESKTOP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick(0.08);
                      setDeviceEditMode("mobile");
                    }}
                    className={`py-1.5 px-2 flex items-center justify-center gap-1.5 border-2 border-brand-text text-[8px] font-black uppercase transition-all cursor-pointer ${
                      deviceEditMode === "mobile"
                        ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#ff4500] -translate-y-0.5"
                        : "bg-brand-surface hover:bg-brand-bg text-brand-text shadow-[1px_1px_0px_#050505]"
                    }`}
                  >
                    <Smartphone size={12} />
                    <span>MOBILE PHONE</span>
                  </button>
                </div>
              </div>

              {/* 3-Layer Selector Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-brand-accent" />
                    <span>LAYER COMPOSITION:</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(["backdrop", "bg", "mid", "fg"] as const).map((layerId) => {
                    const isSelected = activeLayerId === layerId;
                    const layer = layerId === "backdrop" ? config.backdrop : (layerId === "bg" ? config.bgLayer : layerId === "fg" ? config.fgLayer : config.midLayer);
                    const label = layerId === "backdrop" ? "BACKDROP" : (layerId === "bg" ? "BACKGROUND" : layerId === "mid" ? "AVATAR" : "FOREGROUND");
                    const zText = layerId === "backdrop" ? "Z-0" : (layerId === "bg" ? "Z-10" : layerId === "mid" ? "Z-20" : "Z-30");

                    return (
                    <button
                        key={layerId}
                        type="button"
                        onClick={() => {
                          soundManager.playClick(0.08);
                          setActiveLayerId(layerId);
                          updateTopProp("activeEditingLayer", layerId);
                          onActiveObjectChange("graphic"); // Default to graphic on layer change
                        }}
                        className={`p-2 border-2 border-brand-text flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#ff4500] -translate-y-0.5"
                            : "bg-brand-bg hover:bg-brand-surface text-brand-text shadow-[1px_1px_0px_#050505]"
                        }`}
                      >
                        <span className="text-[8.5px] font-black leading-tight">{label}</span>
                        <span className="text-[7.5px] opacity-70">({zText})</span>
                        <span className="text-[7px] font-black uppercase mt-0.5 opacity-80">
                          {layerId === "backdrop" ? (config.backdrop?.imageUrl ? 1 : 0) : ((layer as HeroLayerConfig)?.graphicObjects?.length || 0)} ITEMS
                        </span>
                        <span className={`text-[7px] font-black uppercase tracking-wider mt-1 px-1 py-0.2 border ${
                          layer?.isEnabled ? "bg-brand-accent text-white border-brand-accent" : "bg-transparent text-brand-text/50 border-brand-text/30"
                        }`}>
                          {layer?.isEnabled ? "ON" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleSummonSingleLayer(activeLayerId)}
                  disabled={isSaving}
                  className="w-full py-1.5 px-2 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border border-brand-text text-[8.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#050505] cursor-pointer disabled:opacity-50 transition-all"
                  title={`Summon graphics specifically for ${activeLayerId.toUpperCase()} layer step-by-step`}
                >
                  <Sparkles size={11} className="text-brand-accent animate-pulse" />
                  <span>SUMMON {activeLayerId === "backdrop" ? "BACKDROP" : activeLayerId === "bg" ? "BACKGROUND" : activeLayerId === "mid" ? "AVATAR" : "FOREGROUND"} LAYER ONLY</span>
                </button>
              </div>

              {/* Backdrop Layer Editor (Specific Controls) */}
              {activeLayerId === "backdrop" && (
                <div className="p-3 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-text/15 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-brand-accent" />
                      <span className="text-[9.5px] font-black uppercase">
                        BACKDROP ASSET (FULL WIDTH)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateTopProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), isEnabled: !config.backdrop?.isEnabled })}
                      className={`px-2 py-0.5 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        config.backdrop?.isEnabled ? "bg-brand-accent text-white" : "bg-brand-surface text-brand-text/50"
                      }`}
                    >
                      {config.backdrop?.isEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-brand-bg border border-brand-text overflow-hidden flex items-center justify-center">
                      {config.backdrop?.imageUrl ? (
                        <img src={config.backdrop.imageUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[7px] opacity-30">EMPTY</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[7.5px] font-mono text-brand-text/60 leading-tight">
                        // Backdrop graphics are loaded directly from code repo: /assets/hero/backdrop
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase">
                      <span>BACKDROP OPACITY</span>
                      <span className="text-brand-accent">{Math.round((config.backdrop?.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input 
                      type="range" min={0.05} max={1} step={0.05}
                      value={config.backdrop?.opacity ?? 1}
                      onChange={(e) => updateTopProp("backdrop", { ...(config.backdrop || DEFAULT_BACKDROP), opacity: Number(e.target.value) })}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>

                  <p className="text-[8px] text-brand-text/50 uppercase leading-relaxed">
                    Tip: The backdrop automatically covers the entire hero area. Use high-resolution atmospheric or texture images for best results.
                  </p>
                </div>
              )}

              {/* Slideshow & Bottom Stick Controller - ONLY for Avatar Layer */}
              {activeLayerId === "mid" && (
                <div className="p-3 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  {/* Sticky Bottom Anchor Mode */}
                  <div className="flex items-center justify-between border-b border-brand-text/15 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowDown size={12} className="text-brand-accent" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">
                          STICK BOTTOM TO SCREEN
                        </span>
                      </div>
                      <p className="text-[7.5px] font-mono text-brand-text/60 leading-none">
                        // Anchor graphic bottom directly to the screen edge like backdrop
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.1);
                        const curStick = getActiveObjectValue("stickToBottom", false);
                        updateActiveObjectProps({ stickToBottom: !curStick });
                      }}
                      className={`px-2 py-1 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        getActiveObjectValue("stickToBottom", false) ? "bg-brand-accent text-white shadow-[1px_1px_0px_#050505]" : "bg-brand-bg text-brand-text/50"
                      }`}
                    >
                      {getActiveObjectValue("stickToBottom", false) ? "STICK TO BOTTOM [ON]" : "FREE FLOAT [OFF]"}
                    </button>
                  </div>

                  {/* Slideshow Mode Controller */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-brand-text/15 pb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-brand-accent animate-pulse" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">
                          AVATAR SPECIMEN SLIDESHOW
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick(0.1);
                          updateLayerProps({ slideshowEnabled: !currentLayer.slideshowEnabled });
                        }}
                        className={`px-2 py-0.5 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                          currentLayer.slideshowEnabled ? "bg-brand-accent text-white" : "bg-brand-bg text-brand-text/50"
                        }`}
                      >
                        {currentLayer.slideshowEnabled ? "SLIDESHOW ON" : "SLIDESHOW OFF"}
                      </button>
                    </div>

                    {currentLayer.slideshowEnabled ? (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] font-black uppercase">
                            <span className="opacity-70">CYCLE INTERVAL:</span>
                            <span className="text-brand-accent font-mono">{currentLayer.slideshowInterval || 4} SECONDS</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={currentLayer.slideshowInterval || 4}
                            onChange={(e) => updateLayerProps({ slideshowInterval: Number(e.target.value) })}
                            className="w-full accent-brand-accent cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase opacity-70 block">
                            IN / OUT ANIMATION TRANSITION:
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {(["fade", "slide-horizontal", "slide-vertical", "zoom"] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                  soundManager.playClick(0.08);
                                  updateLayerProps({ slideshowTransition: mode });
                                }}
                                className={`py-1 text-[7px] font-black uppercase border border-brand-text transition-all ${
                                  (currentLayer.slideshowTransition || "fade") === mode
                                    ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]"
                                    : "bg-brand-bg hover:bg-brand-surface"
                                }`}
                              >
                                {mode === "slide-horizontal" ? "SLIDE H" : mode === "slide-vertical" ? "SLIDE V" : mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className="text-[7.5px] font-mono text-brand-text/60 leading-tight">
                          // Avatar Layer automatically cycles between the main avatar graphic and all added secondary avatars with smooth in and out transitions.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[7.5px] font-mono text-brand-text/50 leading-tight">
                        // Off: Static display of main avatar graphic.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Object Selector (Graphics & Texts) - HIDDEN for Backdrop */}
              {activeLayerId !== "backdrop" && (
                <div className="p-3 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span>OBJECT SELECTOR:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const newGraphic: GraphicObject = {
                          id: `graphic_${Date.now()}`,
                          avatarUrl: "/Logo_NoName.jpg",
                          avatarAlt: "Secondary Graphic",
                          posX: 50,
                          posY: 50,
                          size: 140,
                          rotation: 0,
                          opacity: 1,
                          transitionDirection: "fade",
                          transitionSpeed: "smooth",
                          hoverEffect: "none",
                          shadow: false,
                          border: false,
                        };
                        const newGraphics = [...(currentLayer.graphicObjects || []), newGraphic];
                        updateLayerProps({ graphicObjects: newGraphics });
                        onActiveObjectChange(newGraphic.id);
                        soundManager.playClick(0.12);
                      }}
                      className="px-2 py-0.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text text-[8px] font-black transition-colors cursor-pointer"
                    >
                      + ADD GRAPHIC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newText: TextObject = {
                          id: Date.now().toString(),
                          text: "NEW TEXT",
                          posX: 50,
                          posY: 50,
                          fontSize: 64,
                          color: "#050505",
                          rotation: 0,
                          opacity: 1,
                          transitionDirection: "fade",
                          transitionSpeed: "smooth",
                          hoverEffect: "none",
                          textAlign: "center",
                          lineHeight: 1.1,
                          letterSpacing: 0,
                          fontWeight: 900,
                          textTransform: "none",
                          italic: false,
                        };
                        const newTextObjects = [...(currentLayer.textObjects || []), newText];
                        updateLayerProps({ textObjects: newTextObjects });
                        onActiveObjectChange(newText.id);
                        soundManager.playClick(0.12);
                      }}
                      className="px-2 py-0.5 bg-brand-accent text-white border border-brand-text text-[8px] font-black hover:bg-black transition-colors cursor-pointer"
                    >
                      + ADD TEXT
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {/* Primary Layer Graphic */}
                  <button
                    onClick={() => onActiveObjectChange("graphic")}
                    className={`px-2 py-1.5 border border-brand-text text-[8.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeObjectId === "graphic" ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" : "bg-brand-bg hover:bg-brand-surface"
                    }`}
                  >
                    <ImageIcon size={11} className={activeObjectId === "graphic" ? "text-brand-accent" : ""} />
                    MAIN GRAPHIC
                  </button>

                  {/* Secondary Graphic Objects */}
                  {(currentLayer.graphicObjects || []).map((g: GraphicObject, idx: number) => (
                    <div key={g.id} className="relative group">
                      <button
                        onClick={() => onActiveObjectChange(g.id)}
                        className={`px-2 py-1.5 border border-brand-text text-[8.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeObjectId === g.id ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" : "bg-brand-bg hover:bg-brand-surface"
                        }`}
                      >
                        <ImageIcon size={11} className={activeObjectId === g.id ? "text-brand-accent" : ""} />
                        GRAPHIC {idx + 2}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm("Remove this graphic?")) return;
                          const newGraphics = (currentLayer.graphicObjects || []).filter((item: GraphicObject) => item.id !== g.id);
                          updateLayerProps({ graphicObjects: newGraphics });
                          if (activeObjectId === g.id) onActiveObjectChange("graphic");
                          soundManager.playClick(0.1);
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white border border-black rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete Graphic"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  ))}

                  {/* Text Objects */}
                  {(currentLayer.textObjects || []).map((t: TextObject, idx: number) => (
                    <div key={t.id} className="relative group">
                      <button
                        onClick={() => onActiveObjectChange(t.id)}
                        className={`px-2 py-1.5 border border-brand-text text-[8.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeObjectId === t.id ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" : "bg-brand-bg hover:bg-brand-surface"
                        }`}
                      >
                        <Type size={11} className={activeObjectId === t.id ? "text-brand-accent" : ""} />
                        TEXT {idx + 1}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm("Remove this text?")) return;
                          const newTexts = (currentLayer.textObjects || []).filter((item: TextObject) => item.id !== t.id);
                          updateLayerProps({ textObjects: newTexts });
                          if (activeObjectId === t.id) onActiveObjectChange("graphic");
                          soundManager.playClick(0.1);
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white border border-black rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete Text"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Graphic Asset Editor (Only if graphic selected) */}
              {isGraphicSelected && (
                <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-text/15 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-brand-accent" />
                      <span className="text-[9.5px] font-black uppercase">
                        {isMainGraphic ? "MAIN GRAPHIC ASSET" : "SECONDARY GRAPHIC ASSET"}
                      </span>
                    </div>
                    {isMainGraphic ? (
                      <button
                        type="button"
                        onClick={() => updateLayerProp("isEnabled", !currentLayer.isEnabled)}
                        className={`px-2 py-0.5 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                          currentLayer.isEnabled ? "bg-brand-accent text-white" : "bg-brand-surface text-brand-text/50"
                        }`}
                      >
                        {currentLayer.isEnabled ? "ENABLED" : "DISABLED"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm("Remove this secondary graphic?")) return;
                          const newGraphics = (currentLayer.graphicObjects || []).filter((item: GraphicObject) => item.id !== activeObjectId);
                          updateLayerProps({ graphicObjects: newGraphics });
                          onActiveObjectChange("graphic");
                          soundManager.playClick(0.1);
                        }}
                        className="px-2 py-0.5 bg-red-600 text-white border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 hover:bg-black"
                      >
                        <Trash2 size={9} />
                        <span>REMOVE</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] shrink-0 overflow-hidden flex items-center justify-center p-1">
                      {currentGraphicEntity?.avatarUrl ? (
                        <img 
                          src={currentGraphicEntity.avatarUrl} 
                          alt="Current Graphic" 
                          style={{ opacity: currentGraphicEntity?.opacity ?? 1 }}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[7.5px] font-mono text-brand-text/40 font-bold">EMPTY</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-wider text-brand-text/60 block">
                          GRAPHIC IMAGE PATH / URL
                        </label>
                        <input
                          type="text"
                          value={currentGraphicEntity?.avatarUrl || ""}
                          onChange={(e) => updateActiveObjectProps({ avatarUrl: e.target.value })}
                          placeholder="/assets/hero/..."
                          className="w-full bg-brand-surface border border-brand-text px-2 py-1 text-[8px] font-mono font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Firestore Database Avatar Graphics Catalog Manager & Picker */}
                  <div className="pt-2 border-t-2 border-brand-text space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Database size={13} className="text-brand-accent animate-pulse" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">
                          DATABASE AVATARS CATALOG ({dbAvatarGraphics.length})
                        </span>
                      </div>
                      <span className="text-[7px] font-mono font-bold bg-brand-accent text-white px-1.5 py-0.2 border border-brand-text">
                        FIRESTORE LIVE
                      </span>
                    </div>

                    {/* Manual Add Graphic to Database Controls */}
                    <div className="p-2 bg-brand-surface border border-brand-text space-y-1.5">
                      <label className="text-[7.5px] font-black uppercase tracking-wider text-brand-text/70 block">
                        + REGISTER CURRENT GRAPHIC URL IN CATALOG
                      </label>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newGraphicName}
                          onChange={(e) => setNewGraphicName(e.target.value)}
                          placeholder="AVATAR GRAPHIC TITLE..."
                          className="flex-1 bg-brand-bg border border-brand-text px-2 py-1 text-[8.5px] font-mono font-bold focus:outline-none focus:border-brand-accent"
                        />

                        <button
                          type="button"
                          onClick={async () => {
                            const url = currentGraphicEntity?.avatarUrl;
                            if (!url) {
                              alert("Please enter or select a graphic URL first");
                              return;
                            }
                            setIsAddingGraphicToDb(true);
                            try {
                              const name = newGraphicName.trim() || "REPO GRAPHIC";
                              await addAvatarGraphicToDatabase({
                                name,
                                imageInput: url,
                                createdByEmail: userEmail,
                              });
                              setNewGraphicName("");
                              soundManager.playClick(0.16);
                            } catch (err: any) {
                              alert("Failed to save to database: " + err.message);
                            } finally {
                              setIsAddingGraphicToDb(false);
                            }
                          }}
                          disabled={isAddingGraphicToDb}
                          className="py-1 px-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          <span>SAVE URL</span>
                        </button>
                      </div>
                    </div>

                    {/* Database Avatar Cards Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-brand-text">
                      {dbAvatarGraphics.map((item) => {
                        const isSelected = currentGraphicEntity?.avatarUrl === item.url;
                        return (
                          <div
                            key={item.id}
                            className={`p-1.5 border border-brand-text relative group flex flex-col gap-1 transition-all ${
                              isSelected
                                ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#ff4500]"
                                : "bg-brand-surface hover:bg-brand-bg text-brand-text"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => {
                              soundManager.playClick(0.08);
                              updateActiveObjectProps({
                                avatarUrl: item.url,
                                avatarAlt: item.name,
                              });
                            }}>
                              <img src={item.url} alt={item.name} className="w-8 h-8 object-contain border border-current bg-black/10 shrink-0 p-0.5" />
                              <div className="overflow-hidden flex-1">
                                <p className="text-[7.5px] font-black uppercase truncate leading-tight">{item.name}</p>
                                <span className="text-[6.5px] opacity-70 uppercase font-mono block">
                                  {item.category || "custom"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-current/20 pt-1 mt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playClick(0.08);
                                  updateActiveObjectProps({
                                    avatarUrl: item.url,
                                    avatarAlt: item.name,
                                  });
                                }}
                                className={`text-[6.5px] font-black uppercase px-1 py-0.2 border ${
                                  isSelected ? "bg-brand-accent text-white border-brand-accent" : "bg-brand-text text-brand-bg border-brand-text"
                                }`}
                              >
                                {isSelected ? "ACTIVE" : "SELECT"}
                              </button>

                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Delete "${item.name}" permanently from the database?`)) return;
                                  soundManager.playClick(0.12);
                                  await deleteAvatarGraphicFromDatabase(item.id);
                                }}
                                className="p-0.5 text-red-600 hover:bg-red-600 hover:text-white border border-transparent hover:border-black rounded-[1px] transition-colors"
                                title="Delete from Database"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Text Editor (Only if text selected) */}
              {!isGraphicSelected && selectedTextObject && (
                <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-brand-text/15 pb-1.5">
                    <Type size={13} className="text-brand-accent" />
                    <span className="text-[9.5px] font-black uppercase">
                      TEXT CONTENT
                    </span>
                  </div>
                  <textarea
                    value={selectedTextObject.text}
                    onChange={(e) => updateActiveObjectProps({ text: e.target.value })}
                    rows={2}
                    className="w-full bg-brand-surface border border-brand-text px-2 py-1.5 text-[10px] font-bold text-brand-text focus:outline-none focus:border-brand-accent resize-none"
                    placeholder="ENTER TEXT..."
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black opacity-60">TEXT COLOR:</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={selectedTextObject.color || "#050505"} 
                          onChange={(e) => updateActiveObjectProps({ color: e.target.value })} 
                          className="w-10 h-8 bg-transparent border-0 p-0 cursor-pointer shrink-0"
                        />
                        <input 
                          type="text" 
                          value={selectedTextObject.color || "#050505"} 
                          onChange={(e) => updateActiveObjectProps({ color: e.target.value })} 
                          className="w-full bg-brand-surface border border-brand-text px-2 py-1 text-[8px] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Formatting (Only if text selected) */}
              {!isGraphicSelected && selectedTextObject && (
                <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-brand-text/15 pb-1.5">
                    <Sliders size={13} className="text-brand-accent" />
                    <span className="text-[9.5px] font-black uppercase">
                      TEXT FORMATTING
                    </span>
                  </div>

                  {/* Alignment & Weight */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black opacity-60">ALIGNMENT:</label>
                      <div className="flex border border-brand-text bg-brand-surface p-0.5">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => updateActiveObjectProps({ textAlign: align })}
                            className={`flex-1 flex items-center justify-center p-1 transition-all ${
                              (selectedTextObject.textAlign || "center") === align 
                                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" 
                                : "hover:bg-brand-text/5 text-brand-text/60"
                            }`}
                          >
                            {align === "left" && <AlignLeft size={12} />}
                            {align === "center" && <AlignCenter size={12} />}
                            {align === "right" && <AlignRight size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black opacity-60">BOLDNESS:</label>
                      <select
                        value={selectedTextObject.fontWeight || 900}
                        onChange={(e) => updateActiveObjectProps({ fontWeight: Number(e.target.value) })}
                        className="w-full bg-brand-surface border border-brand-text px-1.5 py-1 text-[9px] font-bold focus:outline-none focus:border-brand-accent"
                      >
                        <option value={400}>400 - REGULAR</option>
                        <option value={500}>500 - MEDIUM</option>
                        <option value={700}>700 - BOLD</option>
                        <option value={800}>800 - EXTRA</option>
                        <option value={900}>900 - BLACK</option>
                      </select>
                    </div>
                  </div>

                  {/* Line Height & Letter Spacing */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase">
                        <span className="opacity-60">LINE SPACING:</span>
                        <span className="text-brand-accent">{selectedTextObject.lineHeight || 1.1}</span>
                      </div>
                      <input 
                        type="range" min={0.5} max={3.0} step={0.1}
                        value={selectedTextObject.lineHeight || 1.1}
                        onChange={(e) => updateActiveObjectProps({ lineHeight: Number(e.target.value) })}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase">
                        <span className="opacity-60">LETTER SPACING:</span>
                        <span className="text-brand-accent">{selectedTextObject.letterSpacing || 0}px</span>
                      </div>
                      <input 
                        type="range" min={-5} max={40} step={1}
                        value={selectedTextObject.letterSpacing || 0}
                        onChange={(e) => updateActiveObjectProps({ letterSpacing: Number(e.target.value) })}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Transform & Italic */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black opacity-60">CASE:</label>
                      <select
                        value={selectedTextObject.textTransform || "none"}
                        onChange={(e) => updateActiveObjectProps({ textTransform: e.target.value })}
                        className="w-full bg-brand-surface border border-brand-text px-1.5 py-1 text-[9px] font-bold focus:outline-none focus:border-brand-accent"
                      >
                        <option value="none">NONE</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">LOWERCASE</option>
                        <option value="capitalize">CAPITALIZE</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black opacity-60">STYLE:</label>
                      <button
                        type="button"
                        onClick={() => updateActiveObjectProps({ italic: !selectedTextObject.italic })}
                        className={`w-full py-1 border border-brand-text flex items-center justify-center gap-1.5 transition-all ${
                          selectedTextObject.italic 
                            ? "bg-brand-text text-brand-bg" 
                            : "bg-brand-surface hover:bg-brand-text/5 text-brand-text/60"
                        }`}
                      >
                        <Italic size={11} />
                        <span className="text-[9px] font-black">ITALIC</span>
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone: Delete */}
                  <div className="pt-2 border-t border-brand-text/15">
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("Remove this text object permanently?")) return;
                        const newTexts = (currentLayer.textObjects || []).filter(item => item.id !== selectedTextObject.id);
                        updateLayerProps({ textObjects: newTexts });
                        onActiveObjectChange("graphic");
                        soundManager.playClick(0.12);
                      }}
                      className="w-full py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 size={12} />
                      <span>DELETE TEXT OBJECT</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Shared Transform & Motion Controls (Adapts to Active Object) - HIDDEN for Backdrop */}
              {activeLayerId !== "backdrop" && (() => {
                const isMobileMode = deviceEditMode === "mobile";
                const isMobileOverride = Boolean(isMobileMode && getActiveObjectValue("mobileEnabled", false));

                const curPosX = isMobileMode 
                  ? getActiveObjectValue("mobilePosX", getActiveObjectValue("posX", 50)) 
                  : getActiveObjectValue("posX", 50);

                const curPosY = isMobileMode 
                  ? getActiveObjectValue("mobilePosY", getActiveObjectValue("posY", 50)) 
                  : getActiveObjectValue("posY", 50);

                const curSize = isMobileMode 
                  ? getActiveObjectValue("mobileSize", getActiveObjectValue("size", 180)) 
                  : getActiveObjectValue("size", 180);

                const curFontSize = isMobileMode 
                  ? getActiveObjectValue("mobileFontSize", getActiveObjectValue("fontSize", 64)) 
                  : getActiveObjectValue("fontSize", 64);

                const curRotation = isMobileMode 
                  ? getActiveObjectValue("mobileRotation", getActiveObjectValue("rotation", 0)) 
                  : getActiveObjectValue("rotation", 0);

                const currentTarget: DeviceTarget = getActiveObjectValue("deviceTarget", "both") || "both";

                return (
                  <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                    <div className="flex items-center justify-between border-b border-brand-text/15 pb-1">
                      <div className="flex items-center gap-1.5">
                        <Sliders size={13} className="text-brand-accent" />
                        <span className="text-[9.5px] font-black uppercase">
                          OBJECT TRANSFORM &amp; MOTION
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isGraphicSelected && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick(0.08);
                                (window as any).sym_graphic_clipboard = { ...currentGraphicEntity, isMain: isMainGraphic };
                                alert("COPIED PARAMETERS: " + (isMainGraphic ? "Main Graphic" : "Secondary Graphic"));
                              }}
                              className="px-1.5 py-0.2 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text text-[6.5px] font-black uppercase cursor-pointer"
                              title="Copy parameters (size, position, animations)"
                            >
                              COPY
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const clipboard = (window as any).sym_graphic_clipboard;
                                if (!clipboard) {
                                  alert("Clipboard empty. COPY a graphic first.");
                                  return;
                                }
                                soundManager.playClick(0.12);
                                if (!window.confirm("PASTE to ALL avatars in this layer? This will sync size, position, and animations across all graphics.")) return;
                                
                                const paramsToPaste = {
                                  posX: clipboard.posX,
                                  posY: clipboard.posY,
                                  size: clipboard.size,
                                  rotation: clipboard.rotation,
                                  opacity: clipboard.opacity,
                                  transitionDirection: clipboard.transitionDirection,
                                  transitionSpeed: clipboard.transitionSpeed,
                                  transitionDelay: clipboard.transitionDelay,
                                  hoverEffect: clipboard.hoverEffect,
                                  disableIdleAnimation: clipboard.disableIdleAnimation,
                                  shadow: clipboard.shadow,
                                  border: clipboard.border,
                                  stickToBottom: clipboard.stickToBottom,
                                  mobileEnabled: clipboard.mobileEnabled,
                                  mobilePosX: clipboard.mobilePosX,
                                  mobilePosY: clipboard.mobilePosY,
                                  mobileSize: clipboard.mobileSize,
                                  mobileRotation: clipboard.mobileRotation,
                                  mobileStickToBottom: clipboard.mobileStickToBottom,
                                };

                                onUpdateConfig(prev => {
                                  const layer = prev[activeLayerKey as keyof CustomHeroConfig] as any;
                                  const nextLayer = { ...layer };
                                  
                                  // Apply to main
                                  nextLayer.posX = paramsToPaste.posX;
                                  nextLayer.posY = paramsToPaste.posY;
                                  nextLayer.size = paramsToPaste.size;
                                  nextLayer.rotation = paramsToPaste.rotation;
                                  nextLayer.opacity = paramsToPaste.opacity;
                                  nextLayer.transitionDirection = paramsToPaste.transitionDirection;
                                  nextLayer.transitionSpeed = paramsToPaste.transitionSpeed;
                                  nextLayer.transitionDelay = paramsToPaste.transitionDelay;
                                  nextLayer.hoverEffect = paramsToPaste.hoverEffect;
                                  nextLayer.disableIdleAnimation = paramsToPaste.disableIdleAnimation;
                                  nextLayer.shadow = paramsToPaste.shadow;
                                  nextLayer.border = paramsToPaste.border;
                                  nextLayer.stickToBottom = paramsToPaste.stickToBottom;
                                  nextLayer.mobileEnabled = paramsToPaste.mobileEnabled;
                                  nextLayer.mobilePosX = paramsToPaste.mobilePosX;
                                  nextLayer.mobilePosY = paramsToPaste.mobilePosY;
                                  nextLayer.mobileSize = paramsToPaste.mobileSize;
                                  nextLayer.mobileRotation = paramsToPaste.mobileRotation;
                                  nextLayer.mobileStickToBottom = paramsToPaste.mobileStickToBottom;

                                  // Apply to all secondaries
                                  if (nextLayer.graphicObjects) {
                                    nextLayer.graphicObjects = nextLayer.graphicObjects.map((g: any) => ({
                                      ...g,
                                      ...paramsToPaste
                                    }));
                                  }

                                  return {
                                    ...prev,
                                    activeEditingLayer: activeLayerId,
                                    [activeLayerKey]: nextLayer,
                                    ...(activeLayerId === "mid" ? paramsToPaste : {})
                                  };
                                });
                              }}
                              className="px-1.5 py-0.2 bg-brand-accent text-white hover:bg-black border border-brand-text text-[6.5px] font-black uppercase cursor-pointer"
                              title="Paste parameters to ALL graphics in this layer"
                            >
                              PASTE ALL
                            </button>
                          </>
                        )}
                        <span className={`text-[7px] font-mono px-1 py-0.2 border uppercase ${
                          isMobileMode ? "bg-brand-accent text-white border-brand-accent font-bold" : "bg-brand-surface text-brand-text border-brand-text/40"
                        }`}>
                          {isMobileMode ? "📱 MOBILE" : "💻 PC"}
                        </span>
                      </div>
                    </div>

                    {/* 1. Device Target / Screen Visibility Selector */}
                    <div className="p-2.5 bg-brand-surface border border-brand-text space-y-1.5">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase">
                        <div className="flex items-center gap-1">
                          <Eye size={11} className="text-brand-accent" />
                          <span>SHOW ON SCREENS:</span>
                        </div>
                        <span className="text-[7.5px] font-bold font-mono text-brand-accent">
                          {currentTarget === "both" ? "ALL SCREENS" : currentTarget === "desktop" ? "PC ONLY" : "MOBILE ONLY"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {(["both", "desktop", "mobile"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.08);
                              updateActiveObjectProps({ deviceTarget: mode });
                            }}
                            className={`py-1 px-1 text-[7px] font-black uppercase border border-brand-text flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              currentTarget === mode
                                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]"
                                : "bg-brand-bg hover:bg-brand-surface text-brand-text"
                            }`}
                          >
                            {mode === "both" && <span>🌐 BOTH</span>}
                            {mode === "desktop" && (
                              <>
                                <Monitor size={9} />
                                <span>PC ONLY</span>
                              </>
                            )}
                            {mode === "mobile" && (
                              <>
                                <Smartphone size={9} />
                                <span>MOBILE</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>

                      <p className="text-[7px] font-mono text-brand-text/50 uppercase leading-none">
                        {currentTarget === "desktop" && "// Hidden on mobile screens (< 768px)"}
                        {currentTarget === "mobile" && "// Hidden on desktop / PC screens (≥ 768px)"}
                        {currentTarget === "both" && "// Visible on both PC and mobile screens"}
                      </p>
                    </div>

                    {/* 2. Mobile Mode Transforms Override Toggle */}
                    {isMobileMode && (
                      <div className="p-2.5 bg-brand-surface border border-brand-text space-y-2">
                        <div className="flex items-center justify-between border-b border-brand-text/15 pb-1">
                          <div className="flex items-center gap-1">
                            <Smartphone size={11} className="text-brand-accent animate-pulse" />
                            <span className="text-[8px] font-black uppercase">
                              MOBILE TRANSFORMS &amp; SIZE
                            </span>
                          </div>
                          <span className={`text-[6.5px] font-mono px-1 py-0.2 border ${
                            getActiveObjectValue("mobileEnabled", false) ? "bg-brand-accent text-white border-brand-accent font-bold" : "bg-transparent text-brand-text/50 border-brand-text/30"
                          }`}>
                            {getActiveObjectValue("mobileEnabled", false) ? "CUSTOM ON" : "USING PC"}
                          </span>
                        </div>

                        {!getActiveObjectValue("mobileEnabled", false) ? (
                          <div className="space-y-1.5">
                            <p className="text-[7.5px] font-mono text-brand-text/60 leading-tight">
                              Currently inheriting PC transforms &amp; dimensions. Activate custom mobile transforms to position, resize, or rotate this specifically for smartphone screens.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick(0.12);
                                const defaultX = getActiveObjectValue("posX", 50);
                                const defaultY = getActiveObjectValue("posY", 50);
                                const defaultRot = getActiveObjectValue("rotation", 0);
                                const isG = isGraphicSelected;
                                const defaultSize = isG ? Math.min(getActiveObjectValue("size", 180), 280) : undefined;
                                const defaultFontSize = !isG ? Math.min(getActiveObjectValue("fontSize", 64), 38) : undefined;
                                const defaultStick = isG ? getActiveObjectValue("stickToBottom", false) : undefined;
                                updateActiveObjectProps({
                                  mobileEnabled: true,
                                  mobilePosX: defaultX,
                                  mobilePosY: defaultY,
                                  mobileRotation: defaultRot,
                                  ...(defaultSize !== undefined ? { mobileSize: defaultSize } : {}),
                                  ...(defaultFontSize !== undefined ? { mobileFontSize: defaultFontSize } : {}),
                                  ...(defaultStick !== undefined ? { mobileStickToBottom: defaultStick } : {}),
                                });
                              }}
                              className="w-full py-1.5 px-2 bg-brand-accent text-white hover:bg-black border border-brand-text text-[7.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#050505] cursor-pointer"
                            >
                              <Smartphone size={10} />
                              <span>+ ACTIVATE CUSTOM MOBILE TRANSFORMS</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[7px] font-mono">
                              <span className="text-brand-accent font-bold">● Separate Mobile Values Active</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick(0.08);
                                    const defaultX = getActiveObjectValue("posX", 50);
                                    const defaultY = getActiveObjectValue("posY", 50);
                                    const defaultRot = getActiveObjectValue("rotation", 0);
                                    const isG = isGraphicSelected;
                                    const defaultSize = isG ? getActiveObjectValue("size", 180) : undefined;
                                    const defaultFontSize = !isG ? getActiveObjectValue("fontSize", 64) : undefined;
                                    updateActiveObjectProps({
                                      mobilePosX: defaultX,
                                      mobilePosY: defaultY,
                                      mobileRotation: defaultRot,
                                      ...(defaultSize !== undefined ? { mobileSize: defaultSize } : {}),
                                      ...(defaultFontSize !== undefined ? { mobileFontSize: defaultFontSize } : {}),
                                    });
                                  }}
                                  className="px-1.5 py-0.5 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border border-brand-text text-[6.5px] font-black uppercase cursor-pointer"
                                  title="Copy current PC coordinates and size to mobile"
                                >
                                  COPY FROM PC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick(0.08);
                                    updateActiveObjectProps({ mobileEnabled: false });
                                  }}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-600 hover:text-white border border-brand-text text-[6.5px] font-black uppercase cursor-pointer"
                                >
                                  DISABLE
                                </button>
                              </div>
                            </div>

                            {isGraphicSelected && (
                              <div className="flex items-center justify-between pt-1 border-t border-brand-text/10">
                                <span className="text-[7.5px] font-black uppercase">MOBILE STICK TO BOTTOM:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick(0.08);
                                    const curStick = getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false));
                                    updateActiveObjectProps({ mobileStickToBottom: !curStick });
                                  }}
                                  className={`px-1.5 py-0.5 border border-brand-text text-[7px] font-black uppercase cursor-pointer ${
                                    getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false)) ? "bg-brand-accent text-white" : "bg-brand-bg"
                                  }`}
                                >
                                  {getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false)) ? "ON (STICK)" : "OFF (FLOAT)"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Position D-Pad */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase opacity-60">
                        <span>{isMobileMode ? "MOBILE COORDINATES (X / Y %)" : "PC COORDINATES (X / Y %)"}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-brand-accent">{curPosX}%, {curPosY}%</span>
                          {/* Paste to All Other Avatars */}
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.1);
                              if (!isGraphicSelected) return;
                              const updates = {
                                posX: getActiveObjectValue("posX", 50),
                                posY: getActiveObjectValue("posY", 50),
                                size: getActiveObjectValue("size", 180),
                                rotation: getActiveObjectValue("rotation", 0),
                                opacity: getActiveObjectValue("opacity", 1),
                                transitionDirection: getActiveObjectValue("transitionDirection", "fade"),
                                transitionSpeed: getActiveObjectValue("transitionSpeed", "smooth"),
                                transitionDelay: getActiveObjectValue("transitionDelay", 0.2),
                                hoverEffect: getActiveObjectValue("hoverEffect", "none"),
                                disableIdleAnimation: getActiveObjectValue("disableIdleAnimation", false),
                                shadow: getActiveObjectValue("shadow", false),
                                border: getActiveObjectValue("border", false),
                                // Mobile parameters synchronization
                                mobileEnabled: getActiveObjectValue("mobileEnabled", false),
                                mobilePosX: getActiveObjectValue("mobilePosX", undefined),
                                mobilePosY: getActiveObjectValue("mobilePosY", undefined),
                                mobileSize: getActiveObjectValue("mobileSize", undefined),
                                mobileRotation: getActiveObjectValue("mobileRotation", undefined),
                                mobileStickToBottom: getActiveObjectValue("mobileStickToBottom", undefined),
                              };
                              // Apply to all other graphics in the layer
                              if (isMainGraphic) {
                                // Paste to all graphics in the layer
                                const newGraphics = (currentLayer.graphicObjects || []).map((g: GraphicObject) => ({
                                  ...g,
                                  ...updates
                                }));
                                updateLayerProps({ graphicObjects: newGraphics });
                              } else if (selectedSecondaryGraphic) {
                                // Paste to all graphics in the layer EXCEPT the active one
                                const newGraphics = (currentLayer.graphicObjects || []).map((g: GraphicObject) => {
                                  if (g.id === activeObjectId) return g;
                                  return { ...g, ...updates };
                                });
                                updateLayerProps({ graphicObjects: newGraphics });
                              }
                              alert("Parameters applied to all other avatars!");
                            }}
                            className="px-1.5 py-0.5 bg-brand-accent text-white hover:bg-black font-black uppercase text-[7px]"
                            title="Paste these parameters to all other avatars"
                          >
                            PASTE TO ALL
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleNudge(0, -1)}
                          className="w-10 h-7 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black text-[10px] shadow-[1.5px_1.5px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center cursor-pointer"
                        >
                          ▲
                        </button>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleNudge(-1, 0)}
                            className="w-10 h-7 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black text-[10px] shadow-[1.5px_1.5px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center cursor-pointer"
                          >
                            ◀
                          </button>
                          <div className="w-14 h-7 bg-brand-surface border border-brand-text/30 flex items-center justify-center text-[7px] font-mono">
                            {nudgeStep}%
                          </div>
                          <button
                            type="button"
                            onClick={() => handleNudge(1, 0)}
                            className="w-10 h-7 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black text-[10px] shadow-[1.5px_1.5px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center cursor-pointer"
                          >
                            ▶
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNudge(0, 1)}
                          className="w-10 h-7 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black text-[10px] shadow-[1.5px_1.5px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1">
                        {ANCHOR_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              soundManager.playClick(0.06);
                              if (isMobileMode) {
                                updateActiveObjectProps({ 
                                  mobileEnabled: true,
                                  mobilePosX: preset.x, 
                                  mobilePosY: preset.y 
                                });
                              } else {
                                updateActiveObjectProps({ posX: preset.x, posY: preset.y });
                              }
                            }}
                            className="py-1 px-1 border border-brand-text text-[7px] font-black uppercase bg-brand-surface hover:bg-brand-text hover:text-brand-bg cursor-pointer transition-all"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Unified Scale Slider (Size for Graphic, FontSize for Text) */}
                    <div className="space-y-1 pt-1.5 border-t border-brand-text/10">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>
                          {isMobileMode ? "📱 MOBILE " : "💻 PC "}
                          {isGraphicSelected ? "GRAPHIC SCALE" : "TEXT FONT SIZE"}
                        </span>
                        <span className="text-brand-accent font-mono font-bold">
                          {isGraphicSelected ? `${curSize}px` : `${curFontSize}px`}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min={isGraphicSelected ? (isMobileMode ? 30 : 40) : (isMobileMode ? 8 : 10)} 
                        max={isGraphicSelected ? (isMobileMode ? 600 : 1000) : (isMobileMode ? 140 : 400)} 
                        step={isGraphicSelected ? 5 : 2}
                        value={isGraphicSelected ? curSize : curFontSize}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isMobileMode) {
                            if (isGraphicSelected) updateActiveObjectProps({ mobileEnabled: true, mobileSize: val });
                            else updateActiveObjectProps({ mobileEnabled: true, mobileFontSize: val });
                          } else {
                            if (isGraphicSelected) updateActiveObjectProps({ size: val });
                            else updateActiveObjectProps({ fontSize: val });
                          }
                        }}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1 pt-1.5 border-t border-brand-text/10">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>
                          {isMobileMode ? "📱 MOBILE " : "💻 PC "}
                          ROTATION / TILT
                        </span>
                        <span className="text-brand-accent font-mono font-bold">{curRotation}°</span>
                      </div>
                      <input 
                        type="range" min={-45} max={45} step={1}
                        value={curRotation}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isMobileMode) {
                            updateActiveObjectProps({ mobileEnabled: true, mobileRotation: val });
                          } else {
                            updateActiveObjectProps({ rotation: val });
                          }
                        }}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1 pt-1.5 border-t border-brand-text/10">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>OPACITY</span>
                        <span className="text-brand-accent font-mono font-bold">{Math.round(getActiveObjectValue("opacity", 1) * 100)}%</span>
                      </div>
                      <input 
                        type="range" min={0.05} max={1} step={0.05}
                        value={getActiveObjectValue("opacity", 1)}
                        onChange={(e) => updateActiveObjectProps({ opacity: Number(e.target.value) })}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>
                
                    {/* Idle Ambient */}
                    <div className="space-y-1.5 pt-1.5 border-t border-brand-text/10">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>IDLE AMBIENT EFFECT:</span>
                        <button
                          onClick={() => updateActiveObjectProps({ disableIdleAnimation: !getActiveObjectValue("disableIdleAnimation", false) })}
                          className={`px-1.5 py-0.5 border border-brand-text text-[7.5px] font-black ${getActiveObjectValue("disableIdleAnimation", false) ? "bg-brand-accent text-white" : "bg-brand-surface opacity-50"}`}
                        >
                          PAUSE
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {HOVER_OPTIONS.map((hov) => (
                          <button
                            key={hov.id}
                            type="button"
                            onClick={() => updateActiveObjectProps({ hoverEffect: hov.id })}
                            className={`py-1.5 border border-brand-text text-[7px] font-black uppercase cursor-pointer transition-all ${
                              getActiveObjectValue("hoverEffect", "none") === hov.id ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" : "bg-brand-bg hover:bg-brand-surface"
                            }`}
                          >
                            {hov.label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transitions */}
                    <div className="space-y-1.5 pt-1.5 border-t border-brand-text/10">
                      <div className="text-[9px] font-black uppercase">ENTRANCE TRANSITION:</div>
                      <div className="grid grid-cols-3 gap-1">
                        {DIRECTION_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateActiveObjectProps({ transitionDirection: opt.id })}
                            className={`p-1.5 border border-brand-text flex items-center justify-center gap-1 text-[7px] font-black uppercase cursor-pointer transition-all ${
                              getActiveObjectValue("transitionDirection", "fade") === opt.id ? "bg-brand-text text-brand-bg" : "bg-brand-surface hover:bg-brand-bg"
                            }`}
                          >
                            {opt.icon}
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="space-y-1.5 pt-1.5 border-t border-brand-text/10">
                      <div className="text-[9px] font-black uppercase">TRANSITION SPEED:</div>
                      <div className="grid grid-cols-2 gap-1">
                        {SPEED_OPTIONS.map((spd) => (
                          <button
                            key={spd.id}
                            type="button"
                            onClick={() => updateActiveObjectProps({ transitionSpeed: spd.id })}
                            className={`p-1.5 border border-brand-text text-[7px] font-black uppercase cursor-pointer transition-all ${
                              getActiveObjectValue("transitionSpeed", "spring") === spd.id ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#ff4500]" : "bg-brand-surface hover:bg-brand-bg"
                            }`}
                          >
                            {spd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Hero Action Buttons Controller Section */}
              <div className="p-3 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                <div className="flex items-center justify-between border-b border-brand-text/15 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap size={13} className="text-brand-accent" />
                    <span className="text-[9.5px] font-black uppercase">
                      HERO ACTION BUTTONS
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), showButtons: config.heroButtons?.showButtons === false ? true : false })}
                    className={`px-2 py-0.5 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      config.heroButtons?.showButtons !== false ? "bg-brand-accent text-white" : "bg-brand-surface text-brand-text/50"
                    }`}
                  >
                    {config.heroButtons?.showButtons !== false ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                {config.heroButtons?.showButtons !== false && (
                  <div className="space-y-3">
                    {/* Position X Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>BUTTONS X POSITION</span>
                        <span className="text-brand-accent">{config.heroButtons?.posX ?? 50}%</span>
                      </div>
                      <input
                        type="range" min={5} max={95} step={1}
                        value={config.heroButtons?.posX ?? 50}
                        onChange={(e) => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), posX: Number(e.target.value) })}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>

                    {/* Position Y Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>BUTTONS Y POSITION</span>
                        <span className="text-brand-accent">{config.heroButtons?.posY ?? 85}%</span>
                      </div>
                      <input
                        type="range" min={10} max={95} step={1}
                        value={config.heroButtons?.posY ?? 85}
                        onChange={(e) => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), posY: Number(e.target.value) })}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>

                    {/* Quick Position Presets */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[
                        { label: "CENTER BOT", x: 50, y: 85 },
                        { label: "CENTER MID", x: 50, y: 65 },
                        { label: "CENTER TOP", x: 50, y: 25 },
                        { label: "LEFT BOT", x: 25, y: 85 },
                        { label: "CENTER", x: 50, y: 50 },
                        { label: "RIGHT BOT", x: 75, y: 85 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), posX: preset.x, posY: preset.y })}
                          className={`py-1 text-[7.5px] font-black uppercase border border-brand-text ${
                            (config.heroButtons?.posX ?? 50) === preset.x && (config.heroButtons?.posY ?? 85) === preset.y
                              ? "bg-brand-text text-brand-bg"
                              : "bg-brand-bg hover:bg-brand-surface"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Button 1 (About the Mark) Customizer */}
                    <div className="space-y-1 pt-2 border-t border-brand-text/10">
                      <label className="text-[8.5px] font-black uppercase text-brand-text/80 block">BUTTON 1 LABEL:</label>
                      <input
                        type="text"
                        value={config.heroButtons?.button1Label || "ABOUT THE MARK"}
                        onChange={(e) => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), button1Label: e.target.value })}
                        className="w-full px-2 py-1 bg-brand-bg border border-brand-text text-[9px] font-mono font-bold"
                        placeholder="ABOUT THE MARK"
                      />
                    </div>

                    {/* Button 2 (Manifesto) Customizer */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[8.5px] font-black uppercase text-brand-text/80 block">BUTTON 2 LABEL:</label>
                      <input
                        type="text"
                        value={config.heroButtons?.button2Label || "MANIFESTO"}
                        onChange={(e) => updateTopProp("heroButtons", { ...(config.heroButtons || DEFAULT_HERO_BUTTONS), button2Label: e.target.value })}
                        className="w-full px-2 py-1 bg-brand-bg border border-brand-text text-[9px] font-mono font-bold"
                        placeholder="MANIFESTO"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Layer-Specific Global Toggles (Box, Coordinates, etc) */}
              <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/75 block border-b border-brand-text/15 pb-1">
                  GLOBAL STAGE CONTROLS:
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateTopProp("showCanvasBoundingBox", config.showCanvasBoundingBox === false ? true : false)}
                    className={`py-1.5 px-2 border border-brand-text text-[8px] font-black uppercase text-center cursor-pointer ${
                      config.showCanvasBoundingBox !== false ? "bg-brand-text text-brand-bg" : "bg-brand-surface text-brand-text/50"
                    }`}
                  >
                    STAGE BOX: {config.showCanvasBoundingBox !== false ? "ON" : "OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateTopProp("canvasOverflowVisible", config.canvasOverflowVisible === false ? true : false)}
                    className={`py-1.5 px-2 border border-brand-text text-[8px] font-black uppercase text-center cursor-pointer ${
                      config.canvasOverflowVisible !== false ? "bg-brand-text text-brand-bg" : "bg-brand-surface text-brand-text/50"
                    }`}
                  >
                    FREE OUTSIDE: {config.canvasOverflowVisible !== false ? "ON" : "OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateTopProp("showCoordinates", !config.showCoordinates)}
                    className={`col-span-2 py-1.5 px-2 border border-brand-text text-[8px] font-black uppercase text-center cursor-pointer ${
                      config.showCoordinates ? "bg-brand-text text-brand-bg" : "bg-brand-surface text-brand-text/50"
                    }`}
                  >
                    COORDINATE TAGS: {config.showCoordinates ? "ON" : "OFF"}
                  </button>
                </div>
                
                <div className="space-y-1 pt-1.5 border-t border-brand-text/10">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase">
                    <span>STAGE HEIGHT</span>
                    <span className="text-brand-accent">{config.canvasHeight || 700}px</span>
                  </div>
                  <input 
                    type="range" min={380} max={1200} step={20}
                    value={config.canvasHeight || 700}
                    onChange={(e) => updateTopProp("canvasHeight", Number(e.target.value))}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>

                <div className="space-y-1 pt-1.5 border-t border-brand-text/10">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase">
                    <span>GRID DOTS OPACITY</span>
                    <span className="text-brand-accent">{Math.round((config.gridOpacity ?? 0.12) * 100)}%</span>
                  </div>
                  <input 
                    type="range" min={0} max={1} step={0.01}
                    value={config.gridOpacity ?? 0.12}
                    onChange={(e) => updateTopProp("gridOpacity", Number(e.target.value))}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                </div>
              </div>

              {/* Bounding/Frame settings & Stick to Bottom for Graphic or Text */}
              {(isGraphicSelected || selectedTextObject) && (
                <div className="p-3 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/75 block border-b border-brand-text/15 pb-1">
                    STICK TO BOTTOM &amp; FRAME STYLING:
                  </span>

                  {/* Sticky Bottom Anchor Mode */}
                  <div className="flex items-center justify-between border-b border-brand-text/15 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowDown size={12} className="text-brand-accent" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">
                          {isMobileMode && getActiveObjectValue("mobileEnabled", false) ? "MOBILE STICK TO BOTTOM" : "PC STICK TO BOTTOM"}
                        </span>
                      </div>
                      <p className="text-[7.5px] font-mono text-brand-text/60 leading-none">
                        // Anchor graphic bottom to stage bottom
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.1);
                        if (isMobileMode && getActiveObjectValue("mobileEnabled", false)) {
                          const cur = getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false));
                          updateActiveObjectProps({ mobileStickToBottom: !cur });
                        } else {
                          const cur = getActiveObjectValue("stickToBottom", false);
                          updateActiveObjectProps({ stickToBottom: !cur });
                        }
                      }}
                      className={`px-2 py-1 border border-brand-text text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        (isMobileMode && getActiveObjectValue("mobileEnabled", false) 
                          ? getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false)) 
                          : getActiveObjectValue("stickToBottom", false)) 
                          ? "bg-brand-accent text-white shadow-[1px_1px_0px_#050505]" 
                          : "bg-brand-bg text-brand-text/50"
                      }`}
                    >
                      {(isMobileMode && getActiveObjectValue("mobileEnabled", false) 
                        ? getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false)) 
                        : getActiveObjectValue("stickToBottom", false)) ? "STICK [ON]" : "FLOAT [OFF]"}
                    </button>
                  </div>

                  {/* Stick Offset Parameter */}
                  {((isMobileMode && getActiveObjectValue("mobileEnabled", false))
                    ? getActiveObjectValue("mobileStickToBottom", getActiveObjectValue("stickToBottom", false))
                    : getActiveObjectValue("stickToBottom", false)) && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span>BOTTOM OFFSET (PX)</span>
                        <span className="text-brand-accent font-mono font-bold">
                          {isMobileMode && getActiveObjectValue("mobileEnabled", false)
                            ? (getActiveObjectValue("mobileStickToBottomOffset", getActiveObjectValue("stickToBottomOffset", 0)))
                            : (getActiveObjectValue("stickToBottomOffset", 0))}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-150}
                        max={750}
                        step={2}
                        value={isMobileMode && getActiveObjectValue("mobileEnabled", false)
                          ? (getActiveObjectValue("mobileStickToBottomOffset", getActiveObjectValue("stickToBottomOffset", 0)))
                          : (getActiveObjectValue("stickToBottomOffset", 0))}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isMobileMode && getActiveObjectValue("mobileEnabled", false)) {
                            updateActiveObjectProps({ mobileStickToBottomOffset: val });
                          } else {
                            updateActiveObjectProps({ stickToBottomOffset: val });
                          }
                        }}
                        className="w-full accent-brand-accent cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-text/15">
                    <button
                      type="button"
                      onClick={() => updateActiveObjectProps({ shadow: !getActiveObjectValue("shadow", false) })}
                      className={`py-1.5 border border-brand-text text-[8px] font-black uppercase cursor-pointer ${getActiveObjectValue("shadow", false) ? "bg-brand-text text-brand-bg" : "bg-brand-surface"}`}
                    >
                      SHADOW: {getActiveObjectValue("shadow", false) ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveObjectProps({ border: !getActiveObjectValue("border", false) })}
                      className={`py-1.5 border border-brand-text text-[8px] font-black uppercase cursor-pointer ${getActiveObjectValue("border", false) ? "bg-brand-text text-brand-bg" : "bg-brand-surface"}`}
                    >
                      BORDER: {getActiveObjectValue("border", false) ? "ON" : "OFF"}
                    </button>
                  </div>
                  
                  <div className="space-y-1 pt-1">
                    <span className="text-[8px] font-black opacity-60">CAPTION BADGE:</span>
                    <input 
                      type="text"
                      value={getActiveObjectValue("captionTitle", "")}
                      onChange={(e) => updateActiveObjectProps({ captionTitle: e.target.value })}
                      placeholder="PRIMARY CAPTION"
                      className="w-full bg-brand-surface border border-brand-text px-2 py-1 text-[8px] font-bold uppercase focus:border-brand-accent outline-none"
                    />
                    <input 
                      type="text"
                      value={getActiveObjectValue("captionSubtitle", "")}
                      onChange={(e) => updateActiveObjectProps({ captionSubtitle: e.target.value })}
                      placeholder="SUBTEXT TAG"
                      className="w-full bg-brand-surface border border-brand-text px-2 py-1 text-[8px] font-bold uppercase focus:border-brand-accent outline-none"
                    />
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
