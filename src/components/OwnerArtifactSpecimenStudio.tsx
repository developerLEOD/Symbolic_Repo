import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { 
  Artifact, 
  Specimen, 
  ArtifactWithSpecimens 
} from "../types";
import { 
  fetchArtifactsWithSpecimens, 
  saveArtifact, 
  saveSpecimen, 
  deleteArtifactCascade, 
  deleteSpecimenCascade,
  calculateArtifactSetPrice,
  getMediumConfig
} from "../lib/artifactService";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  Box, 
  Image as ImageIcon, 
  RefreshCw, 
  Search, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { soundManager } from "../lib/soundEffects";
import { PRESET_SYMBOL_KNOWLEDGE } from "../lib/symbolKnowledge";

interface OwnerArtifactSpecimenStudioProps {
  onDataChanged?: () => void;
  onViewArtifactInStore?: (id: string) => void;
}

export default function OwnerArtifactSpecimenStudio({
  onDataChanged,
  onViewArtifactInStore
}: OwnerArtifactSpecimenStudioProps) {
  const [data, setData] = useState<ArtifactWithSpecimens[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"registry" | "create_artifact" | "create_specimen">("registry");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Selected for editing
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editingSpecimen, setEditingSpecimen] = useState<{ specimen: Specimen; parentArtifact: Artifact } | null>(null);
  const [targetArtifactForSpecimen, setTargetArtifactForSpecimen] = useState<Artifact | null>(null);

  // Deletion Modal States (Bypasses iframe blocked window.confirm)
  const [artifactToDelete, setArtifactToDelete] = useState<Artifact | null>(null);
  const [specimenToDelete, setSpecimenToDelete] = useState<Specimen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Artifact Form State
  const [artName, setArtName] = useState("");
  const [artId, setArtId] = useState("");
  const [artInscription, setArtInscription] = useState("");
  const [artCollection, setArtCollection] = useState("Be Palestine");
  const [artGraphic, setArtGraphic] = useState("");
  const [artShortDesc, setArtShortDesc] = useState("");
  const [artConcept, setArtConcept] = useState("");
  const [artPillar1, setArtPillar1] = useState("");
  const [artPillar2, setArtPillar2] = useState("");
  const [artPillar3, setArtPillar3] = useState("");
  const [artPillar4, setArtPillar4] = useState("");
  const [artSetDiscount, setArtSetDiscount] = useState<number>(10);

  // Specimen Form State
  const [specParentId, setSpecParentId] = useState("");
  const [specMedium, setSpecMedium] = useState("T-Shirt");
  const [specType, setSpecType] = useState("Drop Shoulder Heavyweight");
  const [specMaterial, setSpecMaterial] = useState("400 GSM Combed Organic Cotton");
  const [specPrice, setSpecPrice] = useState<number>(4500);
  const [specInventory, setSpecInventory] = useState<number>(50);
  const [specAvailability, setSpecAvailability] = useState<boolean>(true);
  const [specColor, setSpecColor] = useState("Charcoal Black");
  const [specEdition, setSpecEdition] = useState("050 SPECIMENS");
  const [specSizes, setSpecSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [specImages, setSpecImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploadingGraphic, setIsUploadingGraphic] = useState(false);
  const [isUploadingSpecImages, setIsUploadingSpecImages] = useState(false);
  const [isDraggingGraphic, setIsDraggingGraphic] = useState(false);
  const [isDraggingSpecImages, setIsDraggingSpecImages] = useState(false);

  const artGraphicFileRef = useRef<HTMLInputElement | null>(null);
  const specImagesFileRef = useRef<HTMLInputElement | null>(null);

  // Client-side image compression to ensure fast loading and fit within storage limits
  const compressImage = (dataUrl: string, maxWidth = 1000, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const processFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("File is not an image"));
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === "string") {
          try {
            const compressed = await compressImage(reader.result, 1000, 0.82);
            resolve(compressed);
          } catch {
            resolve(reader.result);
          }
        } else {
          reject(new Error("Failed to read image"));
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsDataURL(file);
    });
  };

  // Artifact graphic file upload handler
  const handleGraphicFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileList.length === 0) return;
    setIsUploadingGraphic(true);
    try {
      const dataUrl = await processFileToDataUrl(fileList[0]);
      setArtGraphic(dataUrl);
      showNotification("success", "Central artwork image loaded from device.");
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to load image file.");
    } finally {
      setIsUploadingGraphic(false);
      if (artGraphicFileRef.current) artGraphicFileRef.current.value = "";
    }
  };

  // Specimen images file upload handler
  const handleSpecimenFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileList.length === 0) return;
    setIsUploadingSpecImages(true);
    try {
      const urls: string[] = [];
      for (const file of fileList) {
        const dataUrl = await processFileToDataUrl(file);
        urls.push(dataUrl);
      }
      setSpecImages(prev => [...prev, ...urls]);
      showNotification("success", `Added ${urls.length} photo(s) from device.`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to load one or more photos.");
    } finally {
      setIsUploadingSpecImages(false);
      if (specImagesFileRef.current) specImagesFileRef.current.value = "";
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await fetchArtifactsWithSpecimens();
      setData(items);
    } catch (err) {
      console.error("Failed to load artifacts and specimens:", err);
      showNotification("error", "Failed to retrieve archival register.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick preset loader for Artifact form
  const applySymbolKnowledge = (symKey: string) => {
    const info = PRESET_SYMBOL_KNOWLEDGE[symKey];
    if (info) {
      setArtInscription(info.symbol);
      setArtPillar1(info.represents);
      setArtPillar2(info.whyChosen);
      setArtPillar3(info.communicates);
      setArtPillar4(info.wearerCarries);
      showNotification("success", `Applied thesis for "${symKey}" (${info.name})`);
    }
  };

  // When medium changes in specimen form, auto-fill standard presets
  const handleMediumChange = (med: string) => {
    setSpecMedium(med);
    const cfg = getMediumConfig(med);
    setSpecType(cfg.defaultType || cfg.defaultGarmentTypes?.[0] || "");
    setSpecMaterial(cfg.defaultMaterial || "");
    setSpecPrice(cfg.defaultPrice || 2500);
    setSpecSizes(cfg.defaultSizes || ["S", "M", "L", "XL"]);
  };

  // Reset Artifact Form
  const resetArtifactForm = () => {
    setEditingArtifact(null);
    setArtName("");
    setArtId("");
    setArtInscription("");
    setArtCollection("Be Palestine");
    setArtGraphic("");
    setArtShortDesc("");
    setArtConcept("");
    setArtPillar1("");
    setArtPillar2("");
    setArtPillar3("");
    setArtPillar4("");
    setArtSetDiscount(10);
  };

  // Populate Artifact Form for editing
  const startEditArtifact = (art: Artifact) => {
    soundManager.playClick();
    setEditingArtifact(art);
    setArtName(art.name);
    setArtId(art.artifactId);
    setArtInscription(art.inscription || "");
    setArtCollection(art.collectionName || "Be Palestine");
    setArtGraphic(art.graphic || "");
    setArtShortDesc(art.shortDescription || "");
    setArtConcept(art.concept || "");
    setArtPillar1(art.pillar1Represents || "");
    setArtPillar2(art.pillar2WhyChosen || "");
    setArtPillar3(art.pillar3Communicates || "");
    setArtPillar4(art.pillar4WearerCarries || "");
    setArtSetDiscount(art.completeSetDiscountPercent ?? art.setDiscountPercentage ?? 10);
    setActiveTab("create_artifact");
  };

  // Reset Specimen Form
  const resetSpecimenForm = () => {
    setEditingSpecimen(null);
    setTargetArtifactForSpecimen(null);
    setSpecParentId(data[0]?.id || "");
    handleMediumChange("T-Shirt");
    setSpecInventory(50);
    setSpecAvailability(true);
    setSpecColor("Charcoal Black");
    setSpecEdition("050 SPECIMENS");
    setSpecImages([]);
    setNewImageUrl("");
  };

  // Start adding specimen under specific artifact
  const startAddSpecimenUnderArtifact = (art: Artifact) => {
    soundManager.playClick();
    resetSpecimenForm();
    setTargetArtifactForSpecimen(art);
    setSpecParentId(art.id);
    setActiveTab("create_specimen");
  };

  // Populate Specimen Form for editing
  const startEditSpecimen = (spec: Specimen, parent: Artifact) => {
    soundManager.playClick();
    setEditingSpecimen({ specimen: spec, parentArtifact: parent });
    setTargetArtifactForSpecimen(parent);
    setSpecParentId(parent.id);
    setSpecMedium(spec.medium);
    setSpecType(spec.type || "");
    setSpecMaterial(spec.material || "");
    setSpecPrice(spec.price);
    setSpecInventory(spec.inventory);
    setSpecAvailability(spec.availability);
    setSpecColor(spec.color || "Standard");
    setSpecEdition(spec.edition || "050 SPECIMENS");
    setSpecSizes(spec.availableSizes || ["S", "M", "L", "XL"]);
    setSpecImages(spec.images || [spec.thumbnailImage || ""]);
    setActiveTab("create_specimen");
  };

  // Save Artifact Handler
  const handleSaveArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artName.trim()) {
      showNotification("error", "Artifact name is required.");
      return;
    }

    try {
      soundManager.playClick();
      const artifactRecord: Artifact = {
        id: editingArtifact ? editingArtifact.id : `art_${Date.now()}`,
        name: artName.trim(),
        artifactId: artId.trim() || `SYM-${String(data.length + 1).padStart(2, '0')}`,
        inscription: artInscription.trim(),
        collectionName: artCollection,
        graphic: artGraphic.trim() || "/Logo_NoName.jpg",
        images: [artGraphic.trim() || "/Logo_NoName.jpg"],
        thumbnailImage: artGraphic.trim() || "/Logo_NoName.jpg",
        shortDescription: artShortDesc.trim(),
        description: artShortDesc.trim(),
        concept: artConcept.trim() || artShortDesc.trim(),
        pillar1Represents: artPillar1.trim(),
        pillar2WhyChosen: artPillar2.trim(),
        pillar3Communicates: artPillar3.trim(),
        pillar4WearerCarries: artPillar4.trim(),
        completeSetDiscountPercent: Number(artSetDiscount) || 10,
        setDiscountPercentage: Number(artSetDiscount) || 10,
        tags: [artCollection, "Series 01"],
        status: "published",
        specimenIds: editingArtifact ? editingArtifact.specimenIds : [],
        createdAt: editingArtifact?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await saveArtifact(artifactRecord);
      showNotification("success", `Artifact "${artName}" registered successfully.`);
      resetArtifactForm();
      await loadData();
      setActiveTab("registry");
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Save artifact error:", err);
      showNotification("error", "Failed to save artifact.");
    }
  };

  // Save Specimen Handler
  const handleSaveSpecimen = async (e: React.FormEvent) => {
    e.preventDefault();
    const parent = data.find(d => d.id === specParentId) || targetArtifactForSpecimen;
    if (!parent) {
      showNotification("error", "Please select a valid parent Artifact.");
      return;
    }

    try {
      soundManager.playClick();
      const cfg = getMediumConfig(specMedium);
      const generatedSku = `${parent.artifactId || "SYM"}-${specMedium.substring(0, 3).toUpperCase()}-01`;

      const specimenRecord: Specimen = {
        id: editingSpecimen ? editingSpecimen.specimen.id : `spec_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        parentArtifactId: parent.id,
        artifactName: parent.name,
        artifactGraphic: parent.graphic,
        artifactInscription: parent.inscription,
        medium: specMedium,
        mediumCategory: cfg.category,
        type: specType.trim() || cfg.defaultType || cfg.defaultGarmentTypes?.[0] || "Standard",
        garmentType: specType.trim() || cfg.defaultType || cfg.defaultGarmentTypes?.[0] || "Standard",
        material: specMaterial.trim() || cfg.defaultMaterial || "",
        price: Number(specPrice) || cfg.defaultPrice || 2500,
        inventory: Number(specInventory) || 50,
        availability: specAvailability,
        status: specAvailability ? "available" : "sold_out",
        color: specColor.trim() || "Standard Finish",
        edition: specEdition.trim() || "050 SPECIMENS",
        availableSizes: specSizes,
        sku: editingSpecimen?.specimen.sku || generatedSku,
        thumbnailImage: specImages[0] || parent.graphic,
        images: specImages.length > 0 ? specImages : [parent.graphic],
        createdAt: editingSpecimen?.specimen.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await saveSpecimen(specimenRecord);
      showNotification("success", `Specimen "${parent.name} — ${specMedium}" saved.`);
      resetSpecimenForm();
      await loadData();
      setActiveTab("registry");
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Save specimen error:", err);
      showNotification("error", "Failed to save specimen.");
    }
  };

  // Trigger Deletion Modal for Artifact
  const handleDeleteArtifact = (art: Artifact) => {
    soundManager.playClick();
    setArtifactToDelete(art);
  };

  // Execute Deletion for Artifact
  const executeDeleteArtifact = async () => {
    if (!artifactToDelete) return;
    setIsDeleting(true);

    try {
      soundManager.playClick();
      await deleteArtifactCascade(artifactToDelete.id);
      showNotification("success", `Artifact "${artifactToDelete.name}" and associated specimens permanently deleted.`);
      setArtifactToDelete(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Delete artifact error:", err);
      showNotification("error", "Failed to delete artifact.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger Deletion Modal for Specimen
  const handleDeleteSpecimen = (spec: Specimen) => {
    soundManager.playClick();
    setSpecimenToDelete(spec);
  };

  // Execute Deletion for Specimen
  const executeDeleteSpecimen = async () => {
    if (!specimenToDelete) return;
    setIsDeleting(true);

    try {
      soundManager.playClick();
      await deleteSpecimenCascade(specimenToDelete.id, specimenToDelete.parentArtifactId);
      showNotification("success", `Specimen "${specimenToDelete.medium}" (${specimenToDelete.sku}) removed.`);
      setSpecimenToDelete(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Delete specimen error:", err);
      showNotification("error", "Failed to delete specimen.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick toggle specimen availability
  const handleToggleSpecimenAvailability = async (spec: Specimen) => {
    try {
      soundManager.playClick(0.08);
      const newAvail = !spec.availability;
      await saveSpecimen({
        ...spec,
        availability: newAvail,
        status: newAvail ? "available" : "sold_out"
      });
      showNotification("success", `Specimen ${spec.medium} marked ${newAvail ? "AVAILABLE" : "ALLOTTED"}`);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Toggle availability error:", err);
    }
  };

  // Filtered dataset
  const filteredData = data.filter(item => {
    const art = item;
    if (collectionFilter !== "all" && art.collectionName?.toLowerCase() !== collectionFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (art.name || "").toLowerCase().includes(q);
      const matchInsc = (art.inscription || "").toLowerCase().includes(q);
      const matchCode = (art.artifactId || "").toLowerCase().includes(q);
      const matchSpecimen = (item.specimens || []).some(s => 
        (s.medium || "").toLowerCase().includes(q) || 
        (s.type || "").toLowerCase().includes(q) || 
        (s.sku || "").toLowerCase().includes(q)
      );
      return matchName || matchInsc || matchCode || matchSpecimen;
    }
    return true;
  });

  // Aggregated Stats
  const totalArtifacts = data.length;
  const totalSpecimens = data.reduce((sum, d) => sum + d.specimens.length, 0);
  const availableSpecimens = data.reduce((sum, d) => sum + d.specimens.filter(s => s.availability && s.status !== "sold_out").length, 0);
  const distinctMediums = new Set(data.flatMap(d => d.specimens.map(s => s.medium))).size;

  return (
    <div className="space-y-6 font-mono">
      {/* Notification Toast */}
      {notification && (
        <div className={`p-3 border-2 border-brand-text text-xs font-black uppercase flex items-center justify-between shadow-[4px_4px_0px_#050505] ${
          notification.type === "success" 
            ? "bg-emerald-100 text-emerald-950 border-emerald-800" 
            : "bg-red-100 text-red-950 border-red-800"
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── 1. ARCHIVAL SYSTEM STATS BANNER ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-brand-surface border-2 border-brand-text p-4 shadow-[4px_4px_0px_#050505]">
        <div>
          <span className="text-[8.5px] text-brand-text/60 font-black uppercase block">CORE ARTIFACTS</span>
          <span className="text-xl sm:text-2xl font-black text-brand-text">{totalArtifacts}</span>
          <span className="text-[8px] text-brand-text/50 uppercase block">DESIGNS REGISTERED</span>
        </div>
        <div>
          <span className="text-[8.5px] text-brand-text/60 font-black uppercase block">MANIFESTED SPECIMENS</span>
          <span className="text-xl sm:text-2xl font-black text-brand-text">{totalSpecimens}</span>
          <span className="text-[8px] text-brand-text/50 uppercase block">PHYSICAL OBJECTS</span>
        </div>
        <div>
          <span className="text-[8.5px] text-brand-text/60 font-black uppercase block">AVAILABLE FOR ALLOTMENT</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700">{availableSpecimens}</span>
          <span className="text-[8px] text-brand-text/50 uppercase block">IN ARCHIVE</span>
        </div>
        <div>
          <span className="text-[8.5px] text-brand-text/60 font-black uppercase block">MEDIUM CATEGORIES</span>
          <span className="text-xl sm:text-2xl font-black text-brand-accent">{distinctMediums}</span>
          <span className="text-[8px] text-brand-text/50 uppercase block">PHYSICAL FORMS</span>
        </div>
      </div>

      {/* ─── 2. STUDIO NAVIGATION STRIP ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-text pb-4">
        <div className="inline-flex border-2 border-brand-text bg-brand-surface shadow-[3px_3px_0px_#050505] divide-x-2 divide-brand-text overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab("registry");
            }}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "registry" 
                ? "bg-brand-text text-brand-bg" 
                : "hover:bg-brand-text/10 text-brand-text"
            }`}
          >
            <Layers size={14} />
            <span>ARTIFACT REGISTER ({data.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              resetArtifactForm();
              setActiveTab("create_artifact");
            }}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create_artifact" 
                ? "bg-brand-text text-brand-bg" 
                : "hover:bg-brand-text/10 text-brand-text"
            }`}
          >
            <Plus size={14} />
            <span>{editingArtifact ? "EDIT ARTIFACT" : "+ CREATE ARTIFACT"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              resetSpecimenForm();
              setActiveTab("create_specimen");
            }}
            className={`px-3 sm:px-4 py-2 text-xs font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create_specimen" 
                ? "bg-brand-text text-brand-bg" 
                : "hover:bg-brand-text/10 text-brand-text"
            }`}
          >
            <Box size={14} />
            <span>{editingSpecimen ? "EDIT SPECIMEN" : "+ ADD SPECIMEN"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            loadData();
          }}
          className="p-2 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text text-xs font-black uppercase flex items-center gap-1 shadow-[2px_2px_0px_#050505] transition-colors cursor-pointer"
          title="Refresh Registry"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">REFRESH</span>
        </button>
      </div>

      {/* ─── TAB 1: ARTIFACT & SPECIMEN MASTER REGISTRY ─── */}
      {activeTab === "registry" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
              <input
                type="text"
                placeholder="SEARCH ARTIFACT BY NAME, INSCRIPTION, OR SPECIMEN SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-bold uppercase placeholder:text-brand-text/40 shadow-[2px_2px_0px_#050505] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={collectionFilter}
                onChange={e => setCollectionFilter(e.target.value)}
                className="px-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-bold uppercase shadow-[2px_2px_0px_#050505] focus:outline-none cursor-pointer"
              >
                <option value="all">ALL COLLECTIONS</option>
                <option value="Be Palestine">BE PALESTINE</option>
                <option value="Be Symbolic">BE SYMBOLIC</option>
              </select>
            </div>
          </div>

          {/* Artifact Cards Tree */}
          {loading ? (
            <div className="p-8 text-center bg-brand-surface border-2 border-brand-text animate-pulse">
              <span className="text-xs font-black uppercase text-brand-text/60">SYNCHRONIZING ARCHIVAL REGISTER...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center bg-brand-surface border-2 border-brand-text space-y-3">
              <p className="text-xs font-black uppercase text-brand-text/70">NO MATCHING ARTIFACTS FOUND IN REGISTER.</p>
              <button
                type="button"
                onClick={() => {
                  resetArtifactForm();
                  setActiveTab("create_artifact");
                }}
                className="px-4 py-2 bg-brand-text text-brand-bg text-xs font-black uppercase border border-brand-text"
              >
                + REGISTER FIRST ARTIFACT
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredData.map((item, idx) => {
                const art = item;
                const specs = item.specimens || [];
                const setCalc = calculateArtifactSetPrice(art, specs);

                return (
                  <div 
                    key={art.id} 
                    className="border-2 border-brand-text bg-brand-surface shadow-[4px_4px_0px_#050505] overflow-hidden"
                  >
                    {/* Primary Artifact Header */}
                    <div className="p-4 sm:p-5 border-b-2 border-brand-text bg-brand-bg/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Artifact Artwork / Graphic Thumbnail */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505] overflow-hidden p-1 flex items-center justify-center">
                          <img 
                            src={art.graphic || "/Logo_NoName.jpg"} 
                            alt={art.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase bg-brand-text text-brand-bg px-1.5 py-0.5">
                              {art.artifactId || `ART-0${idx + 1}`}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-brand-text/70 border border-brand-text/30 px-1.5 py-0.5">
                              {art.collectionName}
                            </span>
                            {art.inscription && (
                              <span className="font-serif text-sm font-black text-brand-accent px-1.5 py-0.5 bg-brand-bg border border-brand-text/40 leading-none">
                                {art.inscription}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg sm:text-xl font-mono font-black uppercase text-brand-text leading-tight">
                            {art.name}
                          </h3>

                          <p className="text-[9.5px] font-mono uppercase text-brand-text/70 line-clamp-1 max-w-xl">
                            {art.shortDescription || art.concept || "Architectural symbolic identity work."}
                          </p>
                        </div>
                      </div>

                      {/* Artifact Actions & Set Pricing */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {onViewArtifactInStore && (
                          <button
                            type="button"
                            onClick={() => onViewArtifactInStore(art.artifactId || art.id)}
                            className="px-2.5 py-1.5 bg-brand-surface hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text text-[10px] font-black uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                            title="View in Storefront"
                          >
                            <ExternalLink size={12} />
                            <span>PREVIEW</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => startAddSpecimenUnderArtifact(art)}
                          className="px-2.5 py-1.5 bg-brand-accent hover:bg-brand-text text-white border border-brand-text text-[10px] font-black uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>+ ADD SPECIMEN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditArtifact(art)}
                          className="px-2.5 py-1.5 bg-brand-surface hover:bg-brand-text text-brand-text hover:text-brand-bg border border-brand-text text-[10px] font-black uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>EDIT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteArtifact(art)}
                          className="p-1.5 bg-brand-surface hover:bg-red-600 hover:text-white text-red-600 border border-brand-text text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                          title="Delete Artifact & All Specimens"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Set Bundle Privilege Bar */}
                    {setCalc.specimenCount > 1 && (
                      <div className="bg-brand-accent/5 border-b border-brand-text/20 px-4 py-2 flex items-center justify-between text-[9px] font-mono">
                        <div className="flex items-center gap-2">
                          <Box size={12} className="text-brand-accent" />
                          <span className="font-black text-brand-text uppercase">COMPLETE ARTIFACT SET:</span>
                          <span className="text-brand-text/70">{setCalc.specimenCount} Specimens</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="line-through text-brand-text/50">PKR {setCalc.individualTotal.toLocaleString()}</span>
                          <span className="font-black text-brand-accent">SET PRICE: PKR {setCalc.setPrice.toLocaleString()}</span>
                          <span className="text-emerald-700 font-black">({setCalc.discountPercent}% OFF)</span>
                        </div>
                      </div>
                    )}

                    {/* Specimens Manifestation Table / List */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase text-brand-text/60">
                        <span>PHYSICAL SPECIMENS UNDER THIS ARTIFACT ({specs.length})</span>
                        <span>CLICK SPECIMEN TO EDIT / MANAGE STOCK</span>
                      </div>

                      {specs.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-brand-text/40 text-[10px] uppercase font-bold text-brand-text/60">
                          No physical specimens currently attached to this design.
                          <button
                            type="button"
                            onClick={() => startAddSpecimenUnderArtifact(art)}
                            className="ml-2 underline text-brand-accent cursor-pointer"
                          >
                            Add first specimen now &rarr;
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {specs.map((spec) => {
                            const isSold = !spec.availability || spec.status === "sold_out" || spec.inventory <= 0;

                            return (
                              <div
                                key={spec.id}
                                className="border border-brand-text/60 bg-brand-bg p-3 shadow-[2px_2px_0px_#050505] flex flex-col justify-between space-y-2 relative"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 shrink-0 bg-brand-surface border border-brand-text p-0.5 overflow-hidden">
                                      <img 
                                        src={spec.thumbnailImage || art.graphic} 
                                        alt={spec.medium}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-black text-xs uppercase text-brand-text">
                                          {spec.medium}
                                        </span>
                                        <span className="text-[8px] font-mono text-brand-text/60">
                                          {spec.sku}
                                        </span>
                                      </div>
                                      <span className="text-[8.5px] font-bold text-brand-text/70 uppercase block">
                                        {spec.type || spec.garmentType || "Standard"}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleSpecimenAvailability(spec)}
                                    className={`text-[8px] font-black uppercase px-1.5 py-0.5 border cursor-pointer transition-colors ${
                                      isSold 
                                        ? "bg-red-100 text-red-700 border-red-400" 
                                        : "bg-emerald-100 text-emerald-800 border-emerald-400"
                                    }`}
                                  >
                                    {isSold ? "ALLOTTED" : "AVAILABLE"}
                                  </button>
                                </div>

                                <div className="border-t border-brand-text/20 pt-2 flex items-center justify-between text-[9px]">
                                  <span className="font-black text-brand-text">PKR {spec.price.toLocaleString()}</span>
                                  <span className="text-brand-text/70">{spec.inventory} in archive</span>
                                  <span className="text-brand-text/70">{spec.availableSizes?.join(",") || "Standard"}</span>
                                </div>

                                <div className="pt-1 flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEditSpecimen(spec, art)}
                                    className="p-1 hover:bg-brand-text hover:text-white border border-brand-text/50 text-[8.5px] uppercase font-bold transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSpecimen(spec)}
                                    className="p-1 hover:bg-red-600 hover:text-white text-red-600 border border-brand-text/50 text-[8.5px] uppercase font-bold transition-colors cursor-pointer"
                                    title="Delete specimen"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: REGISTER / EDIT ARTIFACT (THE DESIGN) ─── */}
      {activeTab === "create_artifact" && (
        <form onSubmit={handleSaveArtifact} className="space-y-6">
          <div className="border-2 border-brand-text bg-brand-surface p-6 shadow-[4px_4px_0px_#050505]">
            <div className="border-b-2 border-brand-text pb-3 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase text-brand-text">
                  {editingArtifact ? `EDIT ARTIFACT // ${editingArtifact.name}` : "REGISTER NEW ARTIFACT (THE DESIGN WORK)"}
                </h3>
                <p className="text-[10px] text-brand-text/70 uppercase">
                  The Artifact is the conceptual artwork, symbol, and ideological thesis. Physical objects are specimens under it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetArtifactForm();
                  setActiveTab("registry");
                }}
                className="text-xs font-bold uppercase underline text-brand-text/70 hover:text-brand-text"
              >
                CANCEL
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  ARTIFACT NAME (DESIGN IDENTITY) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMUD, ALIF, ADAB"
                  value={artName}
                  onChange={e => setArtName(e.target.value)}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-black uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  ARCHIVAL CODE (ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SYM-01, SYM-PAL-01"
                  value={artId}
                  onChange={e => setArtId(e.target.value)}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  ETHOS COLLECTION
                </label>
                <select
                  value={artCollection}
                  onChange={e => setArtCollection(e.target.value)}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none"
                >
                  <option value="Be Palestine">BE PALESTINE (THE STEADFAST LINE)</option>
                  <option value="Be Symbolic">BE SYMBOLIC (CORE IDENTITY)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[9.5px] font-black uppercase">
                    CENTRAL GRAPHIC / ARTWORK
                  </label>
                  <span className="text-[8px] font-mono text-brand-accent uppercase font-bold">
                    DEVICE UPLOAD &bull; DRAG & DROP &bull; URL
                  </span>
                </div>

                {/* Device Upload / Drag-and-drop Dropzone */}
                <div
                  onDragOver={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    setIsDraggingGraphic(true);
                  }}
                  onDragLeave={() => setIsDraggingGraphic(false)}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    setIsDraggingGraphic(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleGraphicFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`p-3 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-1.5 bg-brand-bg ${
                    isDraggingGraphic 
                      ? "border-brand-accent bg-brand-accent/10" 
                      : "border-brand-text/40 hover:border-brand-text"
                  }`}
                >
                  <input
                    type="file"
                    ref={artGraphicFileRef}
                    accept="image/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files) handleGraphicFiles(e.target.files);
                    }}
                    className="hidden"
                    id="artifact-graphic-file"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="artifact-graphic-file"
                      className="px-3 py-1.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white text-[9.5px] font-mono font-black uppercase flex items-center gap-1.5 border border-brand-text shadow-[1.5px_1.5px_0px_#050505] cursor-pointer transition-colors"
                    >
                      {isUploadingGraphic ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Upload size={11} />
                      )}
                      <span>{isUploadingGraphic ? "PROCESSING..." : "CHOOSE IMAGE FROM DEVICE"}</span>
                    </label>
                    <span className="text-[8px] font-mono uppercase text-brand-text/60">
                      or drag & drop
                    </span>
                  </div>
                </div>

                {/* URL Input */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://... or /assets/...)"
                    value={artGraphic}
                    onChange={e => setArtGraphic(e.target.value)}
                    className="flex-1 p-2 bg-brand-bg border-2 border-brand-text text-xs focus:outline-none font-mono"
                  />
                  {artGraphic && (
                    <button
                      type="button"
                      onClick={() => setArtGraphic("")}
                      className="px-2.5 py-1 bg-brand-surface hover:bg-red-600 hover:text-white text-red-600 border border-brand-text text-[9px] font-black uppercase shadow-[1px_1px_0px_#050505] cursor-pointer"
                      title="Clear image"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Graphic Preview */}
                {artGraphic && (
                  <div className="flex items-center gap-2 p-1.5 bg-brand-surface border border-brand-text/30">
                    <div className="w-10 h-10 bg-brand-bg border border-brand-text overflow-hidden shrink-0">
                      <img 
                        src={artGraphic} 
                        alt="Central Graphic Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8.5px] font-mono font-bold uppercase text-brand-text block truncate">
                        {artGraphic.startsWith("data:") ? "Custom Device Artwork (Encoded)" : artGraphic}
                      </span>
                      <span className="text-[7.5px] font-mono text-emerald-600 font-bold uppercase">
                        ✓ Primary Artwork Ready
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  ARABIC CALLIGRAPHIC INSCRIPTION
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. صُمُود, أَلِف"
                    value={artInscription}
                    onChange={e => setArtInscription(e.target.value)}
                    className="flex-1 p-2 bg-brand-bg border-2 border-brand-text text-base font-serif font-black text-brand-accent focus:outline-none"
                    dir="rtl"
                  />
                  <div className="flex gap-1">
                    {["صُمُود", "أَلِف", "صَبْر", "أَدَب"].map(sym => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => applySymbolKnowledge(sym)}
                        className="px-2 bg-brand-surface hover:bg-brand-text hover:text-white border border-brand-text text-xs font-serif cursor-pointer"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  SHORT THESIS / TAGLINE
                </label>
                <input
                  type="text"
                  placeholder="Unbending moral rootedness against displacement."
                  value={artShortDesc}
                  onChange={e => setArtShortDesc(e.target.value)}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  COMPLETE SET BUNDLE PRIVILEGE DISCOUNT (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={artSetDiscount}
                  onChange={e => setArtSetDiscount(Number(e.target.value))}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-black focus:outline-none"
                />
              </div>
            </div>

            {/* 4 Pillars Fields */}
            <div className="border-t border-brand-text/30 pt-4 mt-4 space-y-3">
              <span className="text-[9px] font-black text-brand-accent uppercase block">
                THE 4 PILLARS OF SYMBOLIC REPRESENTATION
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase mb-0.5">PILLAR 01 // WHAT IT REPRESENTS</label>
                  <textarea
                    rows={2}
                    value={artPillar1}
                    onChange={e => setArtPillar1(e.target.value)}
                    placeholder="Roots, steadfast resistance, unyielding identity..."
                    className="w-full p-2 bg-brand-bg border border-brand-text text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase mb-0.5">PILLAR 02 // WHY DELIBERATELY CHOSEN</label>
                  <textarea
                    rows={2}
                    value={artPillar2}
                    onChange={e => setArtPillar2(e.target.value)}
                    placeholder="Chosen because solidarity is not a seasonal trend..."
                    className="w-full p-2 bg-brand-bg border border-brand-text text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase mb-0.5">PILLAR 03 // WHAT IT COMMUNICATES</label>
                  <textarea
                    rows={2}
                    value={artPillar3}
                    onChange={e => setArtPillar3(e.target.value)}
                    placeholder="Public proclamation of unwavering support and refusal to assimilate..."
                    className="w-full p-2 bg-brand-bg border border-brand-text text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase mb-0.5">PILLAR 04 // WHAT WEARER CARRIES</label>
                  <textarea
                    rows={2}
                    value={artPillar4}
                    onChange={e => setArtPillar4(e.target.value)}
                    placeholder="Inward oath to maintain dignity and steadfastness in character..."
                    className="w-full p-2 bg-brand-bg border border-brand-text text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t-2 border-brand-text flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetArtifactForm();
                  setActiveTab("registry");
                }}
                className="px-4 py-2 border-2 border-brand-text text-xs font-black uppercase hover:bg-brand-text/10"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-brand-text text-brand-bg text-xs font-black uppercase border-2 border-brand-text hover:bg-brand-accent hover:text-white shadow-[2px_2px_0px_#050505] cursor-pointer"
              >
                {editingArtifact ? "SAVE ARTIFACT CHANGES" : "REGISTER ARTIFACT"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─── TAB 3: REGISTER / EDIT SPECIMEN (PHYSICAL MANIFESTATION) ─── */}
      {activeTab === "create_specimen" && (
        <form onSubmit={handleSaveSpecimen} className="space-y-6">
          <div className="border-2 border-brand-text bg-brand-surface p-6 shadow-[4px_4px_0px_#050505]">
            <div className="border-b-2 border-brand-text pb-3 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase text-brand-text">
                  {editingSpecimen 
                    ? `EDIT SPECIMEN // ${editingSpecimen.parentArtifact.name} — ${editingSpecimen.specimen.medium}` 
                    : "MANIFEST PHYSICAL SPECIMEN UNDER ARTIFACT"}
                </h3>
                <p className="text-[10px] text-brand-text/70 uppercase">
                  A Specimen is a physical garment or object (T-shirt, P-Cap, Mug, Hoodie) expressing an Artifact design.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetSpecimenForm();
                  setActiveTab("registry");
                }}
                className="text-xs font-bold uppercase underline text-brand-text/70 hover:text-brand-text"
              >
                CANCEL
              </button>
            </div>

            {/* Parent Artifact Picker */}
            <div className="mb-4 bg-brand-bg p-4 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
              <label className="block text-[9.5px] font-black uppercase mb-1.5 text-brand-accent">
                SELECT PARENT ARTIFACT (THE DESIGN IDENTITY) *
              </label>
              <select
                required
                value={specParentId}
                onChange={e => setSpecParentId(e.target.value)}
                className="w-full p-2.5 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase focus:outline-none cursor-pointer"
              >
                {data.map(d => (
                  <option key={d.id} value={d.id}>
                    ARTIFACT: {d.name} ({d.artifactId}) — {d.collectionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  SPECIMEN MEDIUM *
                </label>
                <select
                  value={specMedium}
                  onChange={e => handleMediumChange(e.target.value)}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-black uppercase focus:outline-none cursor-pointer"
                >
                  <option value="T-Shirt">T-SHIRT</option>
                  <option value="P-Cap">P-CAP (HEADWEAR)</option>
                  <option value="Mug">MUG (VESSEL)</option>
                  <option value="Hoodie">HOODIE</option>
                  <option value="Full Sleeve">FULL SLEEVE</option>
                  <option value="Tote Bag">TOTE BAG (CARRY)</option>
                  <option value="Journal">JOURNAL</option>
                  <option value="Artisan Stoneware">ARTISAN STONEWARE</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  CUT / STRUCTURAL PROFILE
                </label>
                <input
                  type="text"
                  value={specType}
                  onChange={e => setSpecType(e.target.value)}
                  placeholder="Drop Shoulder Boxy, 6-Panel Twill, etc."
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  ALLOTMENT PRICE (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={specPrice}
                  onChange={e => setSpecPrice(Number(e.target.value))}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  MATERIAL SPECIFICATION
                </label>
                <input
                  type="text"
                  value={specMaterial}
                  onChange={e => setSpecMaterial(e.target.value)}
                  placeholder="400 GSM Combed Cotton, 100% Twill..."
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  INVENTORY IN ARCHIVE
                </label>
                <input
                  type="number"
                  min={0}
                  value={specInventory}
                  onChange={e => setSpecInventory(Number(e.target.value))}
                  className="w-full p-2 bg-brand-bg border-2 border-brand-text text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase mb-1">
                  AVAILABILITY STATUS
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      checked={specAvailability}
                      onChange={e => setSpecAvailability(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>AVAILABLE FOR PUBLIC ALLOTMENT</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Available Sizes for this Specimen */}
            <div className="mb-4">
              <label className="block text-[9.5px] font-black uppercase mb-1.5">
                AVAILABLE SIZES (CLICK TO TOGGLE)
              </label>
              <div className="flex flex-wrap gap-2">
                {["Standard", "S", "M", "L", "XL", "2XL", "One Size"].map(sz => {
                  const isChecked = specSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.05);
                        if (isChecked) {
                          setSpecSizes(specSizes.filter(s => s !== sz));
                        } else {
                          setSpecSizes([...specSizes, sz]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-black uppercase border transition-colors cursor-pointer ${
                        isChecked 
                          ? "bg-brand-text text-brand-bg border-brand-text shadow-[1.5px_1.5px_0px_#050505]" 
                          : "bg-brand-bg text-brand-text border-brand-text/40 hover:border-brand-text"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specimen Multi-Angle Photos */}
            <div className="border-t border-brand-text/20 pt-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[9.5px] font-black uppercase">
                  SPECIMEN MULTI-ANGLE PHOTOGRAPHS (FRONT, BACK, DETAIL, ON-BODY)
                </label>
                <span className="text-[8px] font-mono text-brand-accent uppercase font-bold">
                  MULTI-FILE DEVICE UPLOAD &bull; DRAG & DROP &bull; URL
                </span>
              </div>

              {/* Local File Multi-Upload & Dropzone */}
              <div
                onDragOver={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  setIsDraggingSpecImages(true);
                }}
                onDragLeave={() => setIsDraggingSpecImages(false)}
                onDrop={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  setIsDraggingSpecImages(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleSpecimenFiles(e.dataTransfer.files);
                  }
                }}
                className={`p-4 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 bg-brand-bg ${
                  isDraggingSpecImages 
                    ? "border-brand-accent bg-brand-accent/10" 
                    : "border-brand-text/40 hover:border-brand-text"
                }`}
              >
                <input
                  type="file"
                  ref={specImagesFileRef}
                  multiple
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files) handleSpecimenFiles(e.target.files);
                  }}
                  className="hidden"
                  id="specimen-photos-file-upload"
                />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label
                    htmlFor="specimen-photos-file-upload"
                    className="px-4 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white text-[10px] font-mono font-black uppercase flex items-center gap-2 border border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer transition-colors"
                  >
                    {isUploadingSpecImages ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>{isUploadingSpecImages ? "PROCESSING PHOTOS..." : "UPLOAD PHOTOS FROM DEVICE (MULTIPLE)"}</span>
                  </label>
                  <span className="text-[8.5px] font-mono uppercase text-brand-text/60">
                    or drag & drop anywhere here
                  </span>
                </div>
              </div>

              {/* External Image URL input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste external image URL (https://... or /assets/images/...)"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  className="flex-1 p-2 bg-brand-bg border-2 border-brand-text text-xs focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newImageUrl.trim()) {
                      setSpecImages([...specImages, newImageUrl.trim()]);
                      setNewImageUrl("");
                      showNotification("success", "Photo URL added.");
                    }
                  }}
                  className="px-4 py-2 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text font-black text-xs uppercase border-2 border-brand-text shadow-[1.5px_1.5px_0px_#050505] transition-colors cursor-pointer"
                >
                  + ADD URL
                </button>
              </div>

              {/* Photos Gallery Preview */}
              {specImages.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[8.5px] font-mono font-bold uppercase text-brand-text/80 block">
                    ATTACHED SPECIMEN PHOTOS ({specImages.length}) &bull; FIRST IMAGE IS CARD COVER:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {specImages.map((img, i) => (
                      <div key={i} className="relative aspect-square bg-brand-bg border-2 border-brand-text p-1 shadow-[2px_2px_0px_#050505] group">
                        <img src={img} alt={`Specimen view ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-brand-accent text-white text-[7px] font-black uppercase px-1 py-0.5 border border-brand-text leading-none">
                            PRIMARY
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSpecImages(specImages.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-0.5 rounded-full border border-brand-text hover:scale-110 transition-transform cursor-pointer"
                          title="Remove photo"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t-2 border-brand-text flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetSpecimenForm();
                  setActiveTab("registry");
                }}
                className="px-4 py-2 border-2 border-brand-text text-xs font-black uppercase hover:bg-brand-text/10"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-brand-text text-brand-bg text-xs font-black uppercase border-2 border-brand-text hover:bg-brand-accent hover:text-white shadow-[2px_2px_0px_#050505] cursor-pointer"
              >
                {editingSpecimen ? "SAVE SPECIMEN CHANGES" : "MANIFEST SPECIMEN"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Custom In-App Artifact Delete Confirmation Modal (Iframe Sandbox Safe) */}
      {artifactToDelete && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setArtifactToDelete(null)}
        >
          <div 
            className="w-full max-w-lg bg-brand-surface border-4 border-brand-text p-6 shadow-[8px_8px_0px_#050505] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-brand-text/30 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 size={18} />
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  CONFIRM ARCHIVAL PURGE
                </span>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setArtifactToDelete(null)}
                disabled={isDeleting}
                className="text-brand-text/60 hover:text-brand-text disabled:opacity-50 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border-2 border-red-600/40 text-xs font-mono">
                <p className="font-bold text-red-700 uppercase">
                  PERMANENT DELETION WARNING //
                </p>
                <p className="text-brand-text mt-1">
                  You are about to permanently purge Artifact:
                </p>
                <p className="font-black text-sm uppercase mt-1 text-brand-text">
                  &quot;{artifactToDelete.name}&quot; ({artifactToDelete.artifactId || artifactToDelete.id})
                </p>
                <p className="text-[10px] text-brand-text/80 mt-2">
                  This will simultaneously delete all associated physical specimens and medium records from both Firestore and local registries.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setArtifactToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase hover:bg-brand-text/10 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_#050505]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={executeDeleteArtifact}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-brand-text text-xs font-black uppercase flex items-center gap-2 shadow-[2px_2px_0px_#050505] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>DELETE PERMANENTLY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Specimen Delete Confirmation Modal */}
      {specimenToDelete && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setSpecimenToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-brand-surface border-4 border-brand-text p-6 shadow-[8px_8px_0px_#050505] space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-brand-text/30 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 size={18} />
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  REMOVE SPECIMEN
                </span>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setSpecimenToDelete(null)}
                disabled={isDeleting}
                className="text-brand-text/60 hover:text-brand-text disabled:opacity-50 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <p className="text-brand-text">
                Remove physical specimen <span className="font-bold text-brand-text">&quot;{specimenToDelete.medium}&quot;</span> (SKU: {specimenToDelete.sku}) from this artifact?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSpecimenToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase hover:bg-brand-text/10 disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_#050505]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={executeDeleteSpecimen}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-brand-text text-xs font-black uppercase flex items-center gap-2 shadow-[2px_2px_0px_#050505] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>REMOVING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>CONFIRM REMOVAL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
