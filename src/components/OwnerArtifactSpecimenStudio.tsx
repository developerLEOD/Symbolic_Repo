import React, { useState, useEffect } from "react";
import { 
  Artifact, 
  Specimen, 
  ArtifactWithSpecimens, 
  SpecimenMediumConfig, 
  ArtifactStatus, 
  SpecimenStatus 
} from "../types";
import { 
  fetchArtifactsWithSpecimens, 
  saveArtifact, 
  saveSpecimen, 
  deleteArtifact, 
  deleteSpecimen, 
  CANONICAL_SPECIMEN_MEDIUMS,
  FIRESTORE_DATABASE_ID
} from "../lib/artifactService";
import { soundManager } from "../lib/soundEffects";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Layers, 
  Save, 
  X, 
  Check, 
  AlertCircle, 
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Tag,
  RefreshCw,
  Database,
  Copy,
  FileCode
} from "lucide-react";
import { processFileToCompressedDataUrl } from "../lib/imageOptimization";
import LiquidCarveButton from "./LiquidCarveButton";

interface OwnerArtifactSpecimenStudioProps {
  onDataChanged?: () => void;
  onViewArtifactInStore?: (artifactId: string) => void;
}

export default function OwnerArtifactSpecimenStudio({
  onDataChanged,
  onViewArtifactInStore
}: OwnerArtifactSpecimenStudioProps) {
  const [artifactsWithSpecs, setArtifactsWithSpecs] = useState<ArtifactWithSpecimens[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  // Edit / Create modal states
  const [editingArtifact, setEditingArtifact] = useState<Partial<Artifact> | null>(null);
  const [editingSpecimen, setEditingSpecimen] = useState<{
    specimen: Partial<Specimen>;
    parentArtifact: Artifact;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const copySpecimenJson = (spec: Partial<Specimen>) => {
    const jsonToCopy = {
      id: spec.id || `spec_${Date.now()}`,
      medium: spec.medium || "Hoodie",
      mediumCategory: spec.mediumCategory || "wear",
      type: spec.type || spec.garmentType || "Heavyweight 450 GSM",
      sku: spec.sku || "SYM-01-HOD",
      price: spec.price || 7500,
      inventory: spec.inventory ?? 50,
      availability: spec.availability ?? true,
      status: spec.status || "available",
      color: spec.color || "Charcoal Black",
      colorHex: spec.colorHex || "#1C1C1C",
      availableColors: spec.availableColors || [
        { id: "charcoal", name: spec.color || "Charcoal Black", hex: spec.colorHex || "#1C1C1C" }
      ],
      availableSizes: spec.availableSizes || ["S", "M", "L", "XL"],
      material: spec.material || "Combed Cotton",
      weight: spec.weight || "450 GSM",
      fabricGsm: spec.fabricGsm || "450",
      fit: spec.fit || "Boxy Drop Shoulder",
      printMethod: spec.printMethod || "High-Density Puff & Screen Print",
      edition: spec.edition || "050 SPECIMENS // SERIES 01",
      editionDetails: spec.editionDetails || "Archival Studio Allocation",
      careInstructions: spec.careInstructions || "Machine wash cold inside out // Air dry",
      finish: spec.finish || "",
      dimensions: spec.dimensions || "",
      capacity: spec.capacity || "",
      previewImage: "preview.png",
      images: ["preview.png"]
    };
    try {
      navigator.clipboard.writeText(JSON.stringify(jsonToCopy, null, 2));
      soundManager.playSuccess(0.12);
      showNotification("success", "COPIED SPECIMEN.JSON TO CLIPBOARD // PASTE INTO /src/Artifacts/[artifact]/[specimen]/");
    } catch {
      showNotification("error", "Could not write to clipboard.");
    }
  };

  const copyArtifactJson = (art: Partial<Artifact>) => {
    const jsonToCopy = {
      id: art.id || `art_${Date.now()}`,
      artifactId: art.artifactId || "SYM-01",
      name: art.name || "ARTIFACT",
      shortDescription: art.shortDescription || "",
      description: art.description || "",
      concept: art.concept || "",
      inscription: art.inscription || "",
      pillar1Represents: art.pillar1Represents || "",
      pillar2WhyChosen: art.pillar2WhyChosen || "",
      pillar3Communicates: art.pillar3Communicates || "",
      pillar4WearerCarries: art.pillar4WearerCarries || "",
      symbolicTagline: art.symbolicTagline || "",
      collectionName: art.collectionName || "Be Palestine",
      tags: art.tags || ["Series 01"],
      status: art.status || "published",
      order: art.order || 1,
      setDiscountPercentage: art.setDiscountPercentage || 10
    };
    try {
      navigator.clipboard.writeText(JSON.stringify(jsonToCopy, null, 2));
      soundManager.playSuccess(0.12);
      showNotification("success", "COPIED ARTIFACT.JSON TO CLIPBOARD // PASTE INTO /src/Artifacts/[artifact]/");
    } catch {
      showNotification("error", "Could not write to clipboard.");
    }
  };

  const loadData = async (forceServer: boolean = false) => {
    setLoading(true);
    if (forceServer) {
      soundManager.playClick(0.12);
    }
    try {
      const data = await fetchArtifactsWithSpecimens(forceServer);
      setArtifactsWithSpecs(data);
      if (data.length > 0 && !activeArtifactId) {
        setActiveArtifactId(data[0].id);
      }
      if (forceServer) {
        soundManager.playSuccess(0.12);
        showNotification("success", `SYNCED // ${data.length} ARTIFACTS LOADED FROM /src/Artifacts/ CODE REPOSITORY`);
      }
    } catch (err: any) {
      console.error("Failed to load artifacts and specimens:", err);
      showNotification("error", "Failed to load artifacts catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewArtifact = () => {
    soundManager.playClick(0.12);
    setEditingArtifact({
      id: `art_${Date.now()}`,
      artifactId: `SYM-${String(artifactsWithSpecs.length + 1).padStart(2, "0")}`,
      name: "",
      shortDescription: "",
      description: "",
      graphic: "/Logo_NoName.jpg",
      images: ["/Logo_NoName.jpg"],
      inscription: "",
      pillar1Represents: "",
      pillar2WhyChosen: "",
      pillar3Communicates: "",
      pillar4WearerCarries: "",
      collectionName: "Be Symbolic",
      tags: ["Series 01"],
      status: "published",
      specimenIds: [],
      completeSetDiscountPercent: 10
    });
  };

  const handleSaveArtifact = async () => {
    if (!editingArtifact || !editingArtifact.name) {
      showNotification("error", "Artifact name is required.");
      return;
    }

    setSaving(true);
    soundManager.playClick(0.16);
    try {
      await saveArtifact(editingArtifact as Artifact);
      showNotification("success", `Artifact "${editingArtifact.name}" saved successfully.`);
      setEditingArtifact(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error("Error saving artifact:", err);
      showNotification("error", "Could not save artifact: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArtifact = async (artifact: Artifact) => {
    if (!window.confirm(`Delete Artifact "${artifact.name}" and all its physical specimens? This cannot be undone.`)) {
      return;
    }

    soundManager.playClick(0.14);
    try {
      await deleteArtifact(artifact.id, true);
      showNotification("success", `Artifact "${artifact.name}" deleted.`);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error("Error deleting artifact:", err);
      showNotification("error", "Failed to delete artifact: " + err.message);
    }
  };

  const handleCreateNewSpecimen = (parentArtifact: Artifact) => {
    soundManager.playClick(0.12);
    const defaultMedium = CANONICAL_SPECIMEN_MEDIUMS[0];
    setEditingSpecimen({
      parentArtifact,
      specimen: {
        id: `spec_${Date.now()}`,
        parentArtifactId: parentArtifact.id,
        medium: defaultMedium.name,
        mediumCategory: defaultMedium.category,
        sku: `${parentArtifact.artifactId || "SYM"}-${defaultMedium.name.slice(0, 3).toUpperCase()}`,
        price: defaultMedium.defaultPrice || 4200,
        inventory: 25,
        availability: true,
        status: "available",
        images: parentArtifact.images || ["/Logo_NoName.jpg"],
        garmentType: defaultMedium.defaultGarmentTypes?.[0] || "Heavyweight Boxy",
        availableSizes: defaultMedium.defaultSizes || ["S", "M", "L", "XL"],
        color: "Carbon Black",
        colorHex: "#1C1C1C"
      }
    });
  };

  const handleSaveSpecimen = async () => {
    if (!editingSpecimen || !editingSpecimen.specimen.medium) {
      showNotification("error", "Specimen medium and price are required.");
      return;
    }

    setSaving(true);
    soundManager.playClick(0.16);
    try {
      await saveSpecimen(editingSpecimen.specimen as Specimen);
      showNotification("success", `Specimen saved under "${editingSpecimen.parentArtifact.name}".`);
      setEditingSpecimen(null);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error("Error saving specimen:", err);
      showNotification("error", "Could not save specimen: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpecimen = async (specimenId: string) => {
    if (!window.confirm("Remove this physical specimen from the artifact?")) return;
    soundManager.playClick(0.14);
    try {
      await deleteSpecimen(specimenId);
      showNotification("success", "Specimen deleted.");
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error("Error deleting specimen:", err);
      showNotification("error", "Failed to delete specimen: " + err.message);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "artifact_graphic" | "artifact_image" | "specimen_image"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await processFileToCompressedDataUrl(file, 1400);
      if (target === "artifact_graphic" && editingArtifact) {
        setEditingArtifact(prev => ({ ...prev, graphic: dataUrl }));
      } else if (target === "artifact_image" && editingArtifact) {
        setEditingArtifact(prev => ({ 
          ...prev, 
          images: [...(prev?.images || []), dataUrl] 
        }));
      } else if (target === "specimen_image" && editingSpecimen) {
        setEditingSpecimen(prev => prev ? ({
          ...prev,
          specimen: {
            ...prev.specimen,
            images: [...(prev.specimen.images || []), dataUrl]
          }
        }) : null);
      }
      showNotification("success", "Image asset compressed and staged.");
    } catch (err: any) {
      showNotification("error", "Image upload failed: " + err.message);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 border-2 font-mono text-xs font-black uppercase flex items-center justify-between ${
          notification.type === "success" 
            ? "bg-green-500/10 border-green-500 text-green-400" 
            : "bg-red-500/10 border-red-500 text-red-400"
        }`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-brand-text pb-6">
        <div>
          <span className="font-mono text-xs font-black uppercase text-brand-accent tracking-widest bg-brand-accent/10 px-3 py-1 border border-brand-accent/30 inline-block">
            [ ATELIER ARCHIVE // SPECIMEN ARCHITECTURE ]
          </span>
          <h2 className="text-2xl sm:text-4xl font-mono font-black uppercase tracking-tight text-brand-text mt-2">
            ARTIFACTS &amp; SPECIMENS STUDIO
          </h2>
          <p className="font-mono text-xs text-brand-text/70 uppercase mt-1">
            // ARTIFACT = CONCEPT &amp; INSCRIPTION • SPECIMEN = PHYSICAL TACTILE MEDIUM (T-SHIRT, HOODIE, CAP, MUG)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading}
            className="px-3.5 sm:px-4 py-3 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text font-mono text-xs font-black uppercase border-2 border-brand-text shadow-[3px_3px_0px_#050505] transition-all cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            title={`Force live re-fetch from Firestore database ${FIRESTORE_DATABASE_ID}`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>SYNC DB</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNewArtifact}
            className="px-5 py-3 bg-brand-accent hover:bg-black text-white font-mono text-xs font-black uppercase border-2 border-brand-text shadow-[4px_4px_0px_#050505] transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus size={16} />
            <span>NEW ARTIFACT</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center font-mono text-xs font-bold text-brand-text/60 animate-pulse">
          // ACCESSING ARCHIVAL ARTIFACT REGISTRY...
        </div>
      ) : artifactsWithSpecs.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-brand-text/30 text-center space-y-4">
          <p className="font-mono text-sm font-bold text-brand-text/60 uppercase">
            No artifacts found in registry.
          </p>
          <button
            type="button"
            onClick={handleCreateNewArtifact}
            className="px-4 py-2 bg-brand-text text-brand-bg font-mono text-xs font-black uppercase"
          >
            Create Initial Artifact
          </button>
        </div>
      ) : (
        /* Artifacts List & Specimen Hierarchy */
        <div className="space-y-6">
          {artifactsWithSpecs.map((artifact) => {
            const isExpanded = activeArtifactId === artifact.id;
            return (
              <div 
                key={artifact.id}
                className="bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] overflow-hidden"
              >
                {/* Artifact Summary Bar */}
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-brand-text bg-brand-surface hover:bg-brand-bg/50 transition-colors cursor-pointer"
                  onClick={() => setActiveArtifactId(isExpanded ? null : artifact.id)}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      type="button" 
                      className="p-1 border border-brand-text/40 bg-brand-bg text-brand-text"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className="w-12 h-12 bg-black border border-brand-text shrink-0 overflow-hidden flex items-center justify-center">
                      <img 
                        src={artifact.graphic || artifact.images?.[0] || "/Logo_NoName.jpg"} 
                        alt={artifact.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-brand-accent uppercase">
                          {artifact.artifactId || "SYM"}
                        </span>
                        <h3 className="font-mono text-lg font-black text-brand-text uppercase">
                          {artifact.name}
                        </h3>
                        {artifact.inscription && (
                          <span className="font-serif text-sm font-bold text-brand-text/80 px-2 py-0.5 bg-brand-bg border border-brand-text/20">
                            {artifact.inscription}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-brand-text/60 mt-1">
                        <span>COLLECTION: {artifact.collectionName}</span>
                        <span>•</span>
                        <span>{artifact.specimens?.length || 0} PHYSICAL SPECIMENS</span>
                        <span>•</span>
                        <span className="uppercase text-green-500 font-black">{artifact.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                    {onViewArtifactInStore && (
                      <button
                        type="button"
                        onClick={() => onViewArtifactInStore(artifact.id)}
                        className="p-2 border border-brand-text hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer"
                        title="View Artifact Dossier in Store"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick(0.12);
                        setEditingArtifact(artifact);
                      }}
                      className="p-2 border border-brand-text hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer"
                      title="Edit Artifact Meta & Pillars"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateNewSpecimen(artifact)}
                      className="px-3 py-1.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-mono text-[10px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      <span>ATTACH SPECIMEN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteArtifact(artifact)}
                      className="p-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                      title="Delete Artifact"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Child Specimens Matrix */}
                {isExpanded && (
                  <div className="p-6 bg-brand-bg space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-text/20 pb-2">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-brand-text">
                        PHYSICAL MANIFESTATIONS ({artifact.specimens?.length || 0} SPECIMENS)
                      </span>
                      <span className="font-mono text-[10px] text-brand-text/60 uppercase">
                        COMPLETE SET ACQUISITION DISCOUNT: {artifact.completeSetDiscountPercent || 10}%
                      </span>
                    </div>

                    {!artifact.specimens || artifact.specimens.length === 0 ? (
                      <div className="p-8 border border-dashed border-brand-text/30 text-center space-y-2">
                        <p className="font-mono text-xs text-brand-text/60 uppercase">
                          No physical specimens attached to this design yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCreateNewSpecimen(artifact)}
                          className="px-3 py-1.5 bg-brand-text text-brand-bg font-mono text-[10px] font-black uppercase cursor-pointer"
                        >
                          Attach First Specimen
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artifact.specimens.map((spec) => (
                          <div 
                            key={spec.id}
                            className="bg-brand-surface border border-brand-text p-4 space-y-3 relative group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-14 h-14 bg-black border border-brand-text shrink-0 overflow-hidden flex items-center justify-center">
                                <img 
                                  src={spec.images?.[0] || artifact.graphic || "/Logo_NoName.jpg"} 
                                  alt={spec.medium}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <span className="font-mono text-[9px] font-black text-brand-accent uppercase block">
                                  {spec.sku}
                                </span>
                                <h4 className="font-mono text-sm font-black text-brand-text uppercase truncate">
                                  {spec.medium}
                                </h4>
                                <div className="font-mono text-xs font-bold text-brand-text mt-0.5">
                                  PKR {spec.price?.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="font-mono text-[10px] text-brand-text/70 space-y-1 border-t border-brand-text/10 pt-2">
                              <div className="flex justify-between">
                                <span>INVENTORY:</span>
                                <span className="font-bold">{spec.inventory} UNITS</span>
                              </div>
                              <div className="flex justify-between">
                                <span>GARMENT / CUT:</span>
                                <span>{spec.garmentType || "Standard"}</span>
                              </div>
                              {spec.color && (
                                <div className="flex justify-between">
                                  <span>SHADE:</span>
                                  <span>{spec.color}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-text/10">
                              <button
                                type="button"
                                onClick={() => copySpecimenJson(spec)}
                                className="px-2 py-1 border border-brand-text/50 text-[9px] font-mono font-bold uppercase hover:bg-brand-accent hover:text-white hover:border-brand-accent transition-colors cursor-pointer flex items-center gap-1"
                                title="Copy universal specimen.json format"
                              >
                                <Copy size={11} />
                                <span>JSON</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playClick(0.12);
                                  setEditingSpecimen({ parentArtifact: artifact, specimen: spec });
                                }}
                                className="px-2.5 py-1 border border-brand-text text-[9px] font-mono font-bold uppercase hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer"
                              >
                                Edit Spec
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSpecimen(spec.id)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                title="Remove specimen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Artifact Edit Modal */}
      {editingArtifact && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-surface border-2 border-brand-text max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_#050505]">
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-4">
              <h3 className="font-mono text-lg font-black uppercase text-brand-text">
                {editingArtifact.id ? "EDIT ARTIFACT SPECIFICATION" : "CREATE NEW ARTIFACT"}
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingArtifact(null)}
                className="p-1 hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Artifact ID / Code
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.artifactId || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, artifactId: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                    placeholder="e.g. SYM-01"
                  />
                </div>

                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Design Name *
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.name || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, name: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono font-bold"
                    placeholder="e.g. SUMUD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Primary Symbol Inscription
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.inscription || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, inscription: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-serif font-bold text-sm"
                    placeholder="e.g. صُمُود"
                  />
                </div>

                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.collectionName || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, collectionName: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                    placeholder="e.g. Be Palestine"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-brand-text/70 uppercase block mb-1">
                  Short Description
                </label>
                <textarea
                  value={editingArtifact.shortDescription || ""}
                  onChange={(e) => setEditingArtifact({ ...editingArtifact, shortDescription: e.target.value })}
                  rows={2}
                  className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                  placeholder="Concise theological/ideological summary..."
                />
              </div>

              {/* 4 Pillars of Symbolic Representation */}
              <div className="p-4 bg-brand-bg border border-brand-text/30 space-y-3">
                <span className="font-black text-brand-accent uppercase block">
                  // 4 PILLARS OF SYMBOLIC REPRESENTATION
                </span>

                <div>
                  <label className="font-bold text-[10px] text-brand-text/70 uppercase block mb-0.5">
                    Pillar 01: Doctrine / Scriptural Roots (What the symbol represents)
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.pillar1Represents || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, pillar1Represents: e.target.value })}
                    className="w-full bg-brand-surface border border-brand-text/40 p-1.5 font-sans text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[10px] text-brand-text/70 uppercase block mb-0.5">
                    Pillar 02: Intent / Selection (Why it was chosen)
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.pillar2WhyChosen || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, pillar2WhyChosen: e.target.value })}
                    className="w-full bg-brand-surface border border-brand-text/40 p-1.5 font-sans text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[10px] text-brand-text/70 uppercase block mb-0.5">
                    Pillar 03: Public Witness (What wearing communicates)
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.pillar3Communicates || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, pillar3Communicates: e.target.value })}
                    className="w-full bg-brand-surface border border-brand-text/40 p-1.5 font-sans text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[10px] text-brand-text/70 uppercase block mb-0.5">
                    Pillar 04: Inward Burden (What idea the wearer carries)
                  </label>
                  <input
                    type="text"
                    value={editingArtifact.pillar4WearerCarries || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, pillar4WearerCarries: e.target.value })}
                    className="w-full bg-brand-surface border border-brand-text/40 p-1.5 font-sans text-xs"
                  />
                </div>
              </div>

              {/* Graphic Asset */}
              <div>
                <label className="font-bold text-brand-text/70 uppercase block mb-1">
                  Central Artwork Graphic Asset
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editingArtifact.graphic || ""}
                    onChange={(e) => setEditingArtifact({ ...editingArtifact, graphic: e.target.value })}
                    className="flex-1 bg-brand-bg border border-brand-text p-2 font-mono"
                    placeholder="/Logo_NoName.jpg or data URL"
                  />
                  <label className="px-3 py-2 bg-brand-text text-brand-bg font-bold cursor-pointer shrink-0 uppercase text-[10px]">
                    UPLOAD
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "artifact_graphic")}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-brand-text pt-4">
              <button
                type="button"
                onClick={() => editingArtifact && copyArtifactJson(editingArtifact)}
                className="px-3 py-2 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white font-mono text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy universal artifact.json format"
              >
                <Copy size={13} />
                <span>COPY ARTIFACT.JSON</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingArtifact(null)}
                  className="px-4 py-2 border border-brand-text font-mono text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveArtifact}
                  disabled={saving}
                  className="px-5 py-2 bg-brand-accent text-white font-mono text-xs font-black uppercase border border-brand-text cursor-pointer disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE ARTIFACT"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specimen Edit Modal */}
      {editingSpecimen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-surface border-2 border-brand-text max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_#050505]">
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-4">
              <div>
                <span className="font-mono text-[10px] text-brand-accent font-black uppercase">
                  PARENT: {editingSpecimen.parentArtifact.name}
                </span>
                <h3 className="font-mono text-lg font-black uppercase text-brand-text">
                  CONFIGURE PHYSICAL SPECIMEN
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingSpecimen(null)}
                className="p-1 hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="font-bold text-brand-text/70 uppercase block mb-1">
                  Physical Medium *
                </label>
                <select
                  value={editingSpecimen.specimen.medium || ""}
                  onChange={(e) => {
                    const mediumName = e.target.value;
                    const matched = CANONICAL_SPECIMEN_MEDIUMS.find(m => m.name === mediumName);
                    setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: {
                        ...editingSpecimen.specimen,
                        medium: mediumName,
                        mediumCategory: matched?.category || "wear",
                        price: matched?.defaultPrice || editingSpecimen.specimen.price || 4200,
                        garmentType: matched?.defaultGarmentTypes?.[0] || editingSpecimen.specimen.garmentType
                      }
                    });
                  }}
                  className="w-full bg-brand-bg border border-brand-text p-2 font-mono font-bold"
                >
                  {CANONICAL_SPECIMEN_MEDIUMS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    value={editingSpecimen.specimen.price || ""}
                    onChange={(e) => setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: { ...editingSpecimen.specimen, price: Number(e.target.value) }
                    })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Inventory Units
                  </label>
                  <input
                    type="number"
                    value={editingSpecimen.specimen.inventory ?? 20}
                    onChange={(e) => setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: { ...editingSpecimen.specimen, inventory: Number(e.target.value) }
                    })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Garment Cut / Silhouette
                  </label>
                  <input
                    type="text"
                    value={editingSpecimen.specimen.garmentType || ""}
                    onChange={(e) => setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: { ...editingSpecimen.specimen, garmentType: e.target.value }
                    })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                    placeholder="e.g. Drop Shoulder"
                  />
                </div>

                <div>
                  <label className="font-bold text-brand-text/70 uppercase block mb-1">
                    Color Shade
                  </label>
                  <input
                    type="text"
                    value={editingSpecimen.specimen.color || ""}
                    onChange={(e) => setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: { ...editingSpecimen.specimen, color: e.target.value }
                    })}
                    className="w-full bg-brand-bg border border-brand-text p-2 font-mono"
                    placeholder="e.g. Carbon Black"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-brand-text/70 uppercase block mb-1">
                  Specimen Photo / Asset
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editingSpecimen.specimen.images?.[0] || ""}
                    onChange={(e) => setEditingSpecimen({
                      ...editingSpecimen,
                      specimen: { ...editingSpecimen.specimen, images: [e.target.value] }
                    })}
                    className="flex-1 bg-brand-bg border border-brand-text p-2 font-mono text-[11px]"
                    placeholder="Image URL or upload"
                  />
                  <label className="px-3 py-2 bg-brand-text text-brand-bg font-bold cursor-pointer shrink-0 uppercase text-[10px]">
                    UPLOAD
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "specimen_image")}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-brand-text pt-4">
              <button
                type="button"
                onClick={() => editingSpecimen && copySpecimenJson(editingSpecimen.specimen)}
                className="px-3 py-2 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white font-mono text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy universal specimen.json format"
              >
                <Copy size={13} />
                <span>COPY SPECIMEN.JSON</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSpecimen(null)}
                  className="px-4 py-2 border border-brand-text font-mono text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpecimen}
                  disabled={saving}
                  className="px-5 py-2 bg-brand-accent text-white font-mono text-xs font-black uppercase border border-brand-text cursor-pointer disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE SPECIMEN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
