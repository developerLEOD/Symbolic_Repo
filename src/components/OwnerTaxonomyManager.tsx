import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Tag as TagIcon, 
  FolderTree, 
  Sparkles,
  Save,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Search,
  Hash
} from "lucide-react";
import { 
  ArtifactClassification, 
  ArtifactTypeItem, 
  CustomArtifactTag, 
  TaxonomyCatalog 
} from "../types";
import { 
  fetchTaxonomyCatalog, 
  saveTaxonomyCatalog, 
  DEFAULT_CLASSIFICATIONS, 
  DEFAULT_TAGS 
} from "../lib/taxonomyService";

interface OwnerTaxonomyManagerProps {
  onCatalogUpdated?: (catalog: TaxonomyCatalog) => void;
}

const PRESET_TAG_COLORS = [
  { name: "Obsidian", hex: "#0c0c0c" },
  { name: "Charcoal", hex: "#262626" },
  { name: "Olive", hex: "#3b4334" },
  { name: "Stone", hex: "#44403c" },
  { name: "Terracotta", hex: "#7d3f32" },
  { name: "Amber", hex: "#92400e" },
  { name: "Indigo", hex: "#1e3a5f" },
  { name: "Forest", hex: "#14532d" },
  { name: "Clay", hex: "#78350f" },
  { name: "Crimson", hex: "#991b1b" },
  { name: "Violet", hex: "#4c1d95" }
];

export default function OwnerTaxonomyManager({ onCatalogUpdated }: OwnerTaxonomyManagerProps) {
  const [catalog, setCatalog] = useState<TaxonomyCatalog>({
    classifications: DEFAULT_CLASSIFICATIONS,
    tags: DEFAULT_TAGS,
    updatedAt: Date.now(),
    updatedBy: "owner"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected Classification for managing its Types
  const [selectedClassificationId, setSelectedClassificationId] = useState<string>("");

  // Classification Edit State
  const [editingClassificationId, setEditingClassificationId] = useState<string | null>(null);
  const [editClassificationName, setEditClassificationName] = useState("");
  const [editClassificationDesc, setEditClassificationDesc] = useState("");
  
  // New Classification State
  const [isAddingClassification, setIsAddingClassification] = useState(false);
  const [newClassificationName, setNewClassificationName] = useState("");
  const [newClassificationDesc, setNewClassificationDesc] = useState("");

  // Type Edit State
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeDesc, setEditTypeDesc] = useState("");

  // New Type State
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");

  // Tag Manager State
  const [tagSearch, setTagSearch] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagDesc, setEditTagDesc] = useState("");
  const [editTagColor, setEditTagColor] = useState("#0c0c0c");

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagDesc, setNewTagDesc] = useState("");
  const [newTagColor, setNewTagColor] = useState("#0c0c0c");

  // Load from database on mount
  useEffect(() => {
    loadTaxonomy();
  }, []);

  const loadTaxonomy = async () => {
    setLoading(true);
    try {
      const data = await fetchTaxonomyCatalog();
      setCatalog(data);
      if (data.classifications.length > 0 && !selectedClassificationId) {
        setSelectedClassificationId(data.classifications[0].id);
      }
    } catch (err) {
      console.error("Failed to load taxonomy catalog", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (updatedCatalog: TaxonomyCatalog) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveTaxonomyCatalog(updatedCatalog);
      setCatalog(saved);
      onCatalogUpdated?.(saved);
      setSaveMessage({ type: "success", text: "Taxonomy & tag changes saved to database!" });
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: "error", text: "Failed to persist taxonomy changes." });
    } finally {
      setSaving(false);
    }
  };

  const selectedClassification = catalog.classifications.find(c => c.id === selectedClassificationId) 
    || catalog.classifications[0];

  // --- Classification CRUD Handlers ---
  const handleAddClassification = () => {
    if (!newClassificationName.trim()) return;
    const cleanName = newClassificationName.trim().toUpperCase();
    const newId = `class-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    
    const newClass: ArtifactClassification = {
      id: newId,
      name: cleanName,
      description: newClassificationDesc.trim() || undefined,
      order: catalog.classifications.length + 1,
      types: []
    };

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: [...catalog.classifications, newClass]
    };

    setNewClassificationName("");
    setNewClassificationDesc("");
    setIsAddingClassification(false);
    setSelectedClassificationId(newId);
    handleSaveAll(nextCatalog);
  };

  const handleSaveEditClassification = (classId: string) => {
    if (!editClassificationName.trim()) return;
    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: catalog.classifications.map(c => {
        if (c.id === classId) {
          return {
            ...c,
            name: editClassificationName.trim().toUpperCase(),
            description: editClassificationDesc.trim() || undefined
          };
        }
        return c;
      })
    };
    setEditingClassificationId(null);
    handleSaveAll(nextCatalog);
  };

  const handleDeleteClassification = (classId: string) => {
    const target = catalog.classifications.find(c => c.id === classId);
    if (!target) return;
    if (catalog.classifications.length <= 1) {
      alert("At least one artifact classification must exist.");
      return;
    }
    const hasTypes = target.types.length > 0;
    const confirmMsg = hasTypes 
      ? `Delete classification "${target.name}" and its ${target.types.length} artifact types?` 
      : `Delete classification "${target.name}"?`;
    
    if (window.confirm(confirmMsg)) {
      const remaining = catalog.classifications.filter(c => c.id !== classId);
      const nextCatalog: TaxonomyCatalog = {
        ...catalog,
        classifications: remaining.map((c, idx) => ({ ...c, order: idx + 1 }))
      };
      if (selectedClassificationId === classId) {
        setSelectedClassificationId(remaining[0]?.id || "");
      }
      handleSaveAll(nextCatalog);
    }
  };

  const handleMoveClassification = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= catalog.classifications.length) return;

    const list = [...catalog.classifications];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: list.map((c, idx) => ({ ...c, order: idx + 1 }))
    };
    handleSaveAll(nextCatalog);
  };

  // --- Artifact Type CRUD Handlers ---
  const handleAddType = () => {
    if (!newTypeName.trim() || !selectedClassification) return;
    const cleanName = newTypeName.trim();
    const newTypeId = `type-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const newTypeItem: ArtifactTypeItem = {
      id: newTypeId,
      name: cleanName,
      description: newTypeDesc.trim() || undefined,
      order: selectedClassification.types.length + 1
    };

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: catalog.classifications.map(c => {
        if (c.id === selectedClassification.id) {
          return {
            ...c,
            types: [...c.types, newTypeItem]
          };
        }
        return c;
      })
    };

    setNewTypeName("");
    setNewTypeDesc("");
    setIsAddingType(false);
    handleSaveAll(nextCatalog);
  };

  const handleSaveEditType = (typeId: string) => {
    if (!editTypeName.trim() || !selectedClassification) return;
    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: catalog.classifications.map(c => {
        if (c.id === selectedClassification.id) {
          return {
            ...c,
            types: c.types.map(t => {
              if (t.id === typeId) {
                return {
                  ...t,
                  name: editTypeName.trim(),
                  description: editTypeDesc.trim() || undefined
                };
              }
              return t;
            })
          };
        }
        return c;
      })
    };
    setEditingTypeId(null);
    handleSaveAll(nextCatalog);
  };

  const handleDeleteType = (typeId: string) => {
    if (!selectedClassification) return;
    const target = selectedClassification.types.find(t => t.id === typeId);
    if (!target) return;

    if (window.confirm(`Remove artifact type "${target.name}" under ${selectedClassification.name}?`)) {
      const remainingTypes = selectedClassification.types.filter(t => t.id !== typeId);
      const nextCatalog: TaxonomyCatalog = {
        ...catalog,
        classifications: catalog.classifications.map(c => {
          if (c.id === selectedClassification.id) {
            return {
              ...c,
              types: remainingTypes.map((t, idx) => ({ ...t, order: idx + 1 }))
            };
          }
          return c;
        })
      };
      handleSaveAll(nextCatalog);
    }
  };

  const handleMoveType = (index: number, direction: "up" | "down") => {
    if (!selectedClassification) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedClassification.types.length) return;

    const list = [...selectedClassification.types];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      classifications: catalog.classifications.map(c => {
        if (c.id === selectedClassification.id) {
          return {
            ...c,
            types: list.map((t, idx) => ({ ...t, order: idx + 1 }))
          };
        }
        return c;
      })
    };
    handleSaveAll(nextCatalog);
  };

  // --- Custom Tag CRUD Handlers ---
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const cleanName = newTagName.trim();
    const tagId = `tag-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const newTag: CustomArtifactTag = {
      id: tagId,
      name: cleanName,
      description: newTagDesc.trim() || undefined,
      color: newTagColor || "#0c0c0c",
      createdAt: Date.now()
    };

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      tags: [...catalog.tags, newTag]
    };

    setNewTagName("");
    setNewTagDesc("");
    setNewTagColor("#0c0c0c");
    setIsAddingTag(false);
    handleSaveAll(nextCatalog);
  };

  const handleSaveEditTag = (tagId: string) => {
    if (!editTagName.trim()) return;
    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      tags: catalog.tags.map(t => {
        if (t.id === tagId) {
          return {
            ...t,
            name: editTagName.trim(),
            description: editTagDesc.trim() || undefined,
            color: editTagColor || "#0c0c0c"
          };
        }
        return t;
      })
    };
    setEditingTagId(null);
    handleSaveAll(nextCatalog);
  };

  const handleDeleteTag = (tagId: string) => {
    const target = catalog.tags.find(t => t.id === tagId);
    if (!target) return;

    if (window.confirm(`Delete custom tag "${target.name}"?`)) {
      const nextCatalog: TaxonomyCatalog = {
        ...catalog,
        tags: catalog.tags.filter(t => t.id !== tagId)
      };
      handleSaveAll(nextCatalog);
    }
  };

  const filteredTags = catalog.tags.filter(t => {
    if (!tagSearch.trim()) return true;
    const q = tagSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent mb-1.5">
            <FolderTree size={16} />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest">OWNER TAXONOMY &amp; MEDIUM ENGINE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-mono font-black tracking-tight uppercase text-brand-text">
            MEDIUM &amp; ARTEFACT TAXONOMY ARCHITECTURE
          </h2>
          <p className="text-xs font-mono text-brand-text/70 mt-1 max-w-2xl leading-relaxed">
            Manage SYMBOLIC&apos;s internal organizational hierarchy. Define top-level Mediums (WEAR, CARRY, HEADWEAR, VESSELS), configure distinct artefact types within each Medium, and establish reusable metadata tags for deep collection structuring without altering public storefront curation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={loadTaxonomy}
            disabled={loading || saving}
            className="px-3.5 py-2 text-xs font-mono font-bold uppercase border-2 border-brand-text bg-brand-bg hover:bg-brand-text hover:text-brand-bg transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#050505] cursor-pointer disabled:opacity-50"
            title="Reload from database"
          >
            <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
            <span>RELOAD</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleSaveAll(catalog)}
            disabled={saving}
            className="px-4 py-2 text-xs font-mono font-black uppercase tracking-wider border-2 border-brand-text bg-brand-text text-brand-bg hover:bg-neutral-800 transition-all flex items-center gap-1.5 shadow-[3px_3px_0px_#050505] cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            <span>{saving ? "SAVING..." : "SAVE HIERARCHY"}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3.5 border-2 border-brand-text text-xs font-mono font-bold flex items-center gap-2 shadow-[3px_3px_0px_#050505] ${
          saveMessage.type === "success" ? "bg-emerald-100 text-emerald-950" : "bg-red-100 text-red-950"
        }`}>
          <AlertCircle size={14} />
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Grid: Left = Top-Level Classifications, Right = Selected Classification's Artifact Types */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel 1: Top-Level Mediums (Cols 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-2 border-brand-text bg-brand-surface p-4 sm:p-5 shadow-[4px_4px_0px_#050505] space-y-4">
            <div className="border-b-2 border-brand-text pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-brand-accent" />
                <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                  1. MEDIUMS ({catalog.classifications.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingClassification(true);
                  setNewClassificationName("");
                  setNewClassificationDesc("");
                }}
                className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-brand-text text-brand-bg hover:bg-neutral-800 flex items-center gap-1 shadow-[2px_2px_0px_#050505] cursor-pointer"
              >
                <Plus size={11} />
                <span>ADD MEDIUM</span>
              </button>
            </div>

            {/* Add Medium Form */}
            {isAddingClassification && (
              <div className="p-3.5 border-2 border-brand-text bg-brand-bg space-y-3">
                <div className="text-[10px] font-mono font-black uppercase text-brand-accent">
                  + CREATE NEW MEDIUM
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                    MEDIUM NAME (E.G. WEAR, CARRY, HEADWEAR, VESSELS)
                  </label>
                  <input 
                    type="text"
                    value={newClassificationName}
                    onChange={e => setNewClassificationName(e.target.value.toUpperCase())}
                    placeholder="E.G. WEAR"
                    className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase tracking-wider"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                    INTERNAL PURPOSE / SCOPE (OPTIONAL)
                  </label>
                  <input 
                    type="text"
                    value={newClassificationDesc}
                    onChange={e => setNewClassificationDesc(e.target.value)}
                    placeholder="Short description of this medium"
                    className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingClassification(false)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleAddClassification}
                    disabled={!newClassificationName.trim()}
                    className="px-3 py-1 text-[10px] font-mono font-black uppercase bg-brand-text text-brand-bg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            )}

            {/* Classifications List */}
            <div className="space-y-2.5">
              {catalog.classifications.map((item, idx) => {
                const isSelected = item.id === selectedClassificationId;
                const isEditing = item.id === editingClassificationId;

                return (
                  <div 
                    key={item.id}
                    className={`border-2 border-brand-text p-3 transition-all ${
                      isSelected 
                        ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505]" 
                        : "bg-brand-bg text-brand-text hover:border-brand-text"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2 text-brand-text">
                        <input 
                          type="text"
                          value={editClassificationName}
                          onChange={e => setEditClassificationName(e.target.value.toUpperCase())}
                          className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase tracking-wider"
                          autoFocus
                        />
                        <input 
                          type="text"
                          value={editClassificationDesc}
                          onChange={e => setEditClassificationDesc(e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-xs"
                        />
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingClassificationId(null)}
                            className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditClassification(item.id)}
                            className="px-2.5 py-0.5 text-[9px] font-mono font-black uppercase bg-brand-text text-brand-bg"
                          >
                            SAVE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedClassificationId(item.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 border ${
                              isSelected ? "border-brand-bg bg-brand-bg text-brand-text" : "border-brand-text bg-brand-surface text-brand-text"
                            }`}>
                              #{idx + 1}
                            </span>
                            <span className="font-mono font-black text-sm uppercase tracking-wider">
                              {item.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 border ${
                              isSelected ? "border-brand-bg text-brand-bg/80" : "border-brand-text/30 text-brand-text/60"
                            }`}>
                              {item.types.length} TYPES
                            </span>
                          </div>
                          {item.description && (
                            <p className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? "text-brand-bg/80" : "text-brand-text/70"}`}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveClassification(idx, "up")}
                            disabled={idx === 0}
                            title="Move Up"
                            className={`p-1 border disabled:opacity-20 cursor-pointer ${
                              isSelected ? "border-brand-bg hover:bg-brand-bg hover:text-brand-text" : "border-brand-text hover:bg-brand-text hover:text-brand-bg"
                            }`}
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveClassification(idx, "down")}
                            disabled={idx === catalog.classifications.length - 1}
                            title="Move Down"
                            className={`p-1 border disabled:opacity-20 cursor-pointer ${
                              isSelected ? "border-brand-bg hover:bg-brand-bg hover:text-brand-text" : "border-brand-text hover:bg-brand-text hover:text-brand-bg"
                            }`}
                          >
                            <ArrowDown size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassificationId(item.id);
                              setEditClassificationName(item.name);
                              setEditClassificationDesc(item.description || "");
                            }}
                            title="Rename / Edit"
                            className={`p-1 border cursor-pointer ${
                              isSelected ? "border-brand-bg hover:bg-brand-bg hover:text-brand-text" : "border-brand-text hover:bg-brand-text hover:text-brand-bg"
                            }`}
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClassification(item.id)}
                            title="Delete Medium"
                            className={`p-1 border cursor-pointer ${
                              isSelected ? "border-brand-bg hover:bg-red-600 hover:border-red-600 text-brand-bg" : "border-brand-text hover:bg-red-600 hover:border-red-600 hover:text-white"
                            }`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel 2: Artefact Types for Selected Medium (Cols 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border-2 border-brand-text bg-brand-surface p-4 sm:p-5 shadow-[4px_4px_0px_#050505] space-y-4">
            <div className="border-b-2 border-brand-text pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase text-brand-accent">
                    MEDIUM SPECIFICS:
                  </span>
                  <span className="px-2 py-0.5 bg-brand-text text-brand-bg text-xs font-mono font-black uppercase tracking-wider">
                    {selectedClassification ? selectedClassification.name : "NONE"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-brand-text/60 mt-0.5">
                  Artefact types nested within this primary medium
                </p>
              </div>

              {selectedClassification && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingType(true);
                    setNewTypeName("");
                    setNewTypeDesc("");
                  }}
                  className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-brand-text text-brand-bg hover:bg-neutral-800 flex items-center gap-1 shadow-[2px_2px_0px_#050505] cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus size={11} />
                  <span>ADD ARTEFACT TYPE</span>
                </button>
              )}
            </div>

            {/* Add Type Form */}
            {isAddingType && (
              <div className="p-3.5 border-2 border-brand-text bg-brand-bg space-y-3">
                <div className="text-[10px] font-mono font-black uppercase text-brand-accent">
                  + ADD ARTEFACT TYPE UNDER &quot;{selectedClassification?.name}&quot;
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                    ARTEFACT TYPE NAME (E.G. T-SHIRTS, HOODIES, TOTES, CAPS, MUGS)
                  </label>
                  <input 
                    type="text"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="E.G. Hoodies"
                    className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase tracking-wider"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                    INTERNAL SCOPE NOTES (OPTIONAL)
                  </label>
                  <input 
                    type="text"
                    value={newTypeDesc}
                    onChange={e => setNewTypeDesc(e.target.value)}
                    placeholder="E.g. Heavyweight french terry pullovers and zip hoodies"
                    className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingType(false)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleAddType}
                    disabled={!newTypeName.trim()}
                    className="px-3 py-1 text-[10px] font-mono font-black uppercase bg-brand-text text-brand-bg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                  >
                    ADD TYPE
                  </button>
                </div>
              </div>
            )}

            {/* Types List */}
            {selectedClassification && selectedClassification.types.length > 0 ? (
              <div className="space-y-2">
                {selectedClassification.types.map((tItem, tIdx) => {
                  const isEditingType = tItem.id === editingTypeId;

                  return (
                    <div 
                      key={tItem.id}
                      className="border-2 border-brand-text bg-brand-bg p-3 flex items-start justify-between gap-3 shadow-[2px_2px_0px_#050505]"
                    >
                      {isEditingType ? (
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text"
                            value={editTypeName}
                            onChange={e => setEditTypeName(e.target.value)}
                            className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-xs font-black uppercase tracking-wider"
                            autoFocus
                          />
                          <input 
                            type="text"
                            value={editTypeDesc}
                            onChange={e => setEditTypeDesc(e.target.value)}
                            placeholder="Description"
                            className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-xs"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingTypeId(null)}
                              className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10"
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditType(tItem.id)}
                              className="px-2.5 py-0.5 text-[9px] font-mono font-black uppercase bg-brand-text text-brand-bg"
                            >
                              SAVE
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-1.5 py-0.5 border border-brand-text bg-brand-surface text-brand-text">
                              #{tIdx + 1}
                            </span>
                            <span className="font-mono font-black text-sm uppercase tracking-wider text-brand-text">
                              {tItem.name}
                            </span>
                          </div>
                          {tItem.description && (
                            <p className="text-[10px] font-mono text-brand-text/70 mt-1">
                              {tItem.description}
                            </p>
                          )}
                        </div>
                      )}

                      {!isEditingType && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveType(tIdx, "up")}
                            disabled={tIdx === 0}
                            title="Move Up"
                            className="p-1 border border-brand-text hover:bg-brand-text hover:text-brand-bg disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveType(tIdx, "down")}
                            disabled={tIdx === selectedClassification.types.length - 1}
                            title="Move Down"
                            className="p-1 border border-brand-text hover:bg-brand-text hover:text-brand-bg disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTypeId(tItem.id);
                              setEditTypeName(tItem.name);
                              setEditTypeDesc(tItem.description || "");
                            }}
                            title="Rename / Edit"
                            className="p-1 border border-brand-text hover:bg-brand-text hover:text-brand-bg cursor-pointer"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteType(tItem.id)}
                            title="Delete Type"
                            className="p-1 border border-brand-text hover:bg-red-600 hover:border-red-600 hover:text-white cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-brand-text/30 text-center space-y-2">
                <p className="text-xs font-mono text-brand-text/60 uppercase">
                  No artefact types registered under &quot;{selectedClassification?.name}&quot; yet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingType(true);
                    setNewTypeName("");
                    setNewTypeDesc("");
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-black uppercase bg-brand-text text-brand-bg hover:bg-neutral-800 inline-flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#050505]"
                >
                  <Plus size={12} />
                  <span>ADD FIRST ARTEFACT TYPE</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Reusable Global Tag Repository */}
      <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
        <div className="border-b-2 border-brand-text pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TagIcon size={18} className="text-brand-accent" />
            <div>
              <h3 className="text-sm font-mono font-black uppercase tracking-wider text-brand-text">
                REUSABLE ARTEFACT TAG REPOSITORY ({catalog.tags.length})
              </h3>
              <p className="text-[10px] font-mono text-brand-text/60 uppercase">
                GLOBAL ATTRIBUTE TAGS ASSIGNABLE ACROSS ARTEFACTS (SILHOUETTE, FABRICATION, SERIES, LIMITED RUNS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input 
                type="text"
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="pl-7 pr-2.5 py-1 text-xs font-mono bg-brand-bg border border-brand-text w-36 sm:w-48"
              />
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-text/60" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAddingTag(true);
                setNewTagName("");
                setNewTagDesc("");
                setNewTagColor("#0c0c0c");
              }}
              className="px-3 py-1 text-[10px] font-mono font-black uppercase tracking-wider bg-brand-text text-brand-bg hover:bg-neutral-800 flex items-center gap-1 shadow-[2px_2px_0px_#050505] cursor-pointer shrink-0"
            >
              <Plus size={11} />
              <span>NEW TAG</span>
            </button>
          </div>
        </div>

        {/* Add Tag Form */}
        {isAddingTag && (
          <div className="p-4 border-2 border-brand-text bg-brand-bg space-y-3">
            <div className="text-[10px] font-mono font-black uppercase text-brand-accent">
              + DEFINE REUSABLE ARTEFACT TAG
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                  TAG NAME (E.G. Heavyweight, Drop Shoulder, Series 01)
                </label>
                <input 
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="E.g. Drop Shoulder"
                  className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs font-bold uppercase"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                  BADGE ACCENT TONE
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_TAG_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewTagColor(c.hex)}
                      className={`w-6 h-6 border-2 transition-transform cursor-pointer ${
                        newTagColor === c.hex ? "border-brand-text scale-110 shadow-[1px_1px_0px_#050505]" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input 
                    type="color"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    className="w-6 h-6 p-0 border border-brand-text cursor-pointer"
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold uppercase text-brand-text/70 mb-1">
                DESCRIPTION / CRITERIA (OPTIONAL)
              </label>
              <input 
                type="text"
                value={newTagDesc}
                onChange={e => setNewTagDesc(e.target.value)}
                placeholder="E.g. Cut with relaxed architectural drape across shoulders"
                className="w-full px-2.5 py-1.5 bg-brand-surface border-2 border-brand-text text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTag(false)}
                className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className="px-3 py-1 text-[10px] font-mono font-black uppercase bg-brand-text text-brand-bg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                CREATE TAG
              </button>
            </div>
          </div>
        )}

        {/* Tags Grid / Cloud */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredTags.map(tag => {
            const isEditingThisTag = tag.id === editingTagId;

            return (
              <div 
                key={tag.id}
                className="border-2 border-brand-text bg-brand-bg p-3 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_#050505]"
              >
                {isEditingThisTag ? (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      value={editTagName}
                      onChange={e => setEditTagName(e.target.value)}
                      className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-xs font-bold uppercase"
                      autoFocus
                    />
                    <input 
                      type="text"
                      value={editTagDesc}
                      onChange={e => setEditTagDesc(e.target.value)}
                      placeholder="Tag description"
                      className="w-full px-2 py-1 bg-brand-surface border-2 border-brand-text text-[11px]"
                    />
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {PRESET_TAG_COLORS.slice(0, 6).map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setEditTagColor(c.hex)}
                          className={`w-4 h-4 border ${editTagColor === c.hex ? "border-brand-text ring-1 ring-brand-text" : "border-transparent"}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTagId(null)}
                        className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase border border-brand-text"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditTag(tag.id)}
                        className="px-2.5 py-0.5 text-[9px] font-mono font-black uppercase bg-brand-text text-brand-bg"
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full border border-brand-text shrink-0" 
                          style={{ backgroundColor: tag.color || "#0c0c0c" }} 
                        />
                        <span className="font-mono font-black text-xs uppercase tracking-wider text-brand-text">
                          {tag.name}
                        </span>
                      </div>
                      {tag.description && (
                        <p className="text-[10px] font-mono text-brand-text/70 mt-1 line-clamp-2">
                          {tag.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1 border-t border-brand-text/10 pt-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setEditTagName(tag.name);
                          setEditTagDesc(tag.description || "");
                          setEditTagColor(tag.color || "#0c0c0c");
                        }}
                        title="Edit Tag"
                        className="p-1 border border-brand-text hover:bg-brand-text hover:text-brand-bg text-[9px] font-mono cursor-pointer"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id)}
                        title="Delete Tag"
                        className="p-1 border border-brand-text hover:bg-red-600 hover:border-red-600 hover:text-white text-[9px] font-mono cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
