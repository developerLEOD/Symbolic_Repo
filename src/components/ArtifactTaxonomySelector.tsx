import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Tag as TagIcon, 
  Plus, 
  Check, 
  X, 
  Search, 
  Sparkles, 
  ChevronRight,
  Info
} from "lucide-react";
import { 
  TaxonomyCatalog, 
  ArtifactClassification, 
  ArtifactTypeItem, 
  CustomArtifactTag 
} from "../types";
import { 
  fetchTaxonomyCatalog, 
  saveTaxonomyCatalog, 
  DEFAULT_CLASSIFICATIONS, 
  DEFAULT_TAGS 
} from "../lib/taxonomyService";

interface ArtifactTaxonomySelectorProps {
  selectedClassification?: string;
  selectedType?: string;
  selectedTags?: string[];
  onClassificationChange: (classification: string) => void;
  onTypeChange: (type: string) => void;
  onTagsChange: (tags: string[]) => void;
  onOpenTaxonomyManager?: () => void;
}

export default function ArtifactTaxonomySelector({
  selectedClassification = "",
  selectedType = "",
  selectedTags = [],
  onClassificationChange,
  onTypeChange,
  onTagsChange,
  onOpenTaxonomyManager
}: ArtifactTaxonomySelectorProps) {
  const [catalog, setCatalog] = useState<TaxonomyCatalog>({
    classifications: DEFAULT_CLASSIFICATIONS,
    tags: DEFAULT_TAGS
  });
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [isQuickAddingTag, setIsQuickAddingTag] = useState(false);
  const [quickTagName, setQuickTagName] = useState("");
  const [quickTagColor, setQuickTagColor] = useState("#0c0c0c");

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await fetchTaxonomyCatalog();
      setCatalog(data);
      
      // If no classification selected yet, select first default if available
      if (!selectedClassification && data.classifications.length > 0) {
        onClassificationChange(data.classifications[0].name);
        if (data.classifications[0].types.length > 0) {
          onTypeChange(data.classifications[0].types[0].name);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Find active classification object (by name or id)
  const currentClassificationObj = catalog.classifications.find(
    c => c.name.toUpperCase() === (selectedClassification || "").toUpperCase() || c.id === selectedClassification
  ) || catalog.classifications[0];

  const availableTypes = currentClassificationObj ? currentClassificationObj.types : [];

  const handleClassificationSelect = (className: string) => {
    onClassificationChange(className);
    const targetObj = catalog.classifications.find(c => c.name.toUpperCase() === className.toUpperCase());
    if (targetObj && targetObj.types.length > 0) {
      // If current type doesn't exist in new classification, default to first
      const exists = targetObj.types.some(t => t.name.toLowerCase() === (selectedType || "").toLowerCase());
      if (!exists) {
        onTypeChange(targetObj.types[0].name);
      }
    }
  };

  const toggleTag = (tagName: string) => {
    const isSelected = selectedTags.some(t => t.toLowerCase() === tagName.toLowerCase());
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.toLowerCase() !== tagName.toLowerCase()));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleQuickCreateTag = async () => {
    if (!quickTagName.trim()) return;
    const cleanName = quickTagName.trim();
    const tagId = `tag-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const newTag: CustomArtifactTag = {
      id: tagId,
      name: cleanName,
      color: quickTagColor || "#0c0c0c",
      createdAt: Date.now()
    };

    const nextCatalog: TaxonomyCatalog = {
      ...catalog,
      tags: [...catalog.tags, newTag]
    };

    setCatalog(nextCatalog);
    onTagsChange([...selectedTags, cleanName]);
    setQuickTagName("");
    setIsQuickAddingTag(false);

    try {
      await saveTaxonomyCatalog(nextCatalog);
    } catch (e) {
      console.error("Failed to auto-save quick tag", e);
    }
  };

  const filteredTags = catalog.tags.filter(t => {
    if (!tagFilter.trim()) return true;
    return t.name.toLowerCase().includes(tagFilter.toLowerCase());
  });

  return (
    <div className="space-y-5 border-2 border-brand-text bg-brand-surface p-4 sm:p-5 shadow-[4px_4px_0px_#050505]">
      {/* Header & Subtitle */}
      <div className="border-b-2 border-brand-text pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-brand-accent shrink-0" />
          <div>
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
              MEDIUM CLASSIFICATION &amp; INTERNAL TAXONOMY
            </h3>
            <p className="text-[10px] font-mono text-brand-text/60">
              Primary medium classification and metadata tagging (separate from purchasable artifact variants)
            </p>
          </div>
        </div>

        {onOpenTaxonomyManager && (
          <button
            type="button"
            onClick={onOpenTaxonomyManager}
            className="text-[10px] font-mono font-bold uppercase underline text-brand-text hover:text-brand-accent cursor-pointer self-start sm:self-auto"
          >
            Manage Hierarchy &rarr;
          </button>
        )}
      </div>

      {/* Classification & Type Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Step 1: Top-Level Medium */}
        <div className="md:col-span-6 space-y-2">
          <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-text">
            1. PRIMARY MEDIUM <span className="text-red-500">*</span>
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {catalog.classifications.map(c => {
              const isSelected = (selectedClassification || "").toUpperCase() === c.name.toUpperCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleClassificationSelect(c.name)}
                  className={`py-2 px-2.5 text-xs font-mono font-black uppercase tracking-wider border-2 border-brand-text transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected 
                      ? "bg-brand-text text-brand-bg shadow-[3px_3px_0px_#050505] -translate-y-0.5" 
                      : "bg-brand-bg text-brand-text hover:bg-brand-text/10"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`text-[8px] font-mono ${isSelected ? "text-brand-bg/75" : "text-brand-text/50"}`}>
                    {c.types.length} Types
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Specific Artifact Type */}
        <div className="md:col-span-6 space-y-2">
          <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-text">
            2. ARTIFACT TYPE <span className="text-red-500">*</span>
          </label>

          {availableTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableTypes.map(t => {
                const isSelected = (selectedType || "").toLowerCase() === t.name.toLowerCase();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTypeChange(t.name)}
                    className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-2 border-brand-text transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected 
                        ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505] -translate-y-0.5" 
                        : "bg-brand-bg text-brand-text hover:bg-brand-text/10"
                    }`}
                  >
                    {isSelected && <Check size={11} className="shrink-0" />}
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 border-2 border-dashed border-brand-text/30 bg-brand-bg text-center text-xs font-mono text-brand-text/60">
              No artifact types defined for {currentClassificationObj?.name}. Use the hierarchy manager to add types.
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Optional Owner-Defined Tags */}
      <div className="space-y-2.5 pt-2 border-t border-brand-text/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TagIcon size={14} className="text-brand-accent" />
            <label className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-text">
              3. OWNER METADATA TAGS ({selectedTags.length} ASSIGNED)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input 
                type="text"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                placeholder="Filter tags..."
                className="pl-6 pr-2 py-0.5 text-[10px] font-mono bg-brand-bg border border-brand-text w-28 sm:w-36"
              />
              <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-brand-text/50" />
            </div>

            <button
              type="button"
              onClick={() => setIsQuickAddingTag(!isQuickAddingTag)}
              className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-brand-text bg-brand-bg hover:bg-brand-text hover:text-brand-bg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus size={10} />
              <span>Quick Tag</span>
            </button>
          </div>
        </div>

        {/* Quick Add Tag Bar */}
        {isQuickAddingTag && (
          <div className="p-2.5 border-2 border-brand-text bg-brand-bg flex items-center gap-2 flex-wrap">
            <input 
              type="text"
              value={quickTagName}
              onChange={e => setQuickTagName(e.target.value)}
              placeholder="Tag name (e.g. Series 03)"
              className="px-2 py-1 bg-brand-surface border border-brand-text text-xs font-bold uppercase flex-1 min-w-[140px]"
              autoFocus
            />
            <input 
              type="color"
              value={quickTagColor}
              onChange={e => setQuickTagColor(e.target.value)}
              className="w-7 h-7 p-0 border border-brand-text cursor-pointer"
              title="Tag Accent Color"
            />
            <button
              type="button"
              onClick={handleQuickCreateTag}
              disabled={!quickTagName.trim()}
              className="px-2.5 py-1 text-xs font-mono font-black uppercase bg-brand-text text-brand-bg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
            >
              Add &amp; Assign
            </button>
            <button
              type="button"
              onClick={() => setIsQuickAddingTag(false)}
              className="px-2 py-1 text-xs font-mono font-bold uppercase border border-brand-text hover:bg-brand-text/10 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Active Selected Tags Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-brand-bg border border-brand-text">
            <span className="text-[9px] font-mono font-bold uppercase text-brand-text/60 self-center mr-1">
              ASSIGNED:
            </span>
            {selectedTags.map(tName => {
              const tagConfig = catalog.tags.find(t => t.name.toLowerCase() === tName.toLowerCase());
              return (
                <span
                  key={tName}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-text text-brand-bg text-[10px] font-mono font-black uppercase tracking-wider"
                >
                  {tagConfig?.color && (
                    <span 
                      className="w-2 h-2 rounded-full shrink-0 border border-brand-bg" 
                      style={{ backgroundColor: tagConfig.color }} 
                    />
                  )}
                  <span>{tName}</span>
                  <button
                    type="button"
                    onClick={() => toggleTag(tName)}
                    className="hover:text-red-300 cursor-pointer ml-0.5"
                    title="Remove tag"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Global Tag Repository Chips to Toggle */}
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
          {filteredTags.map(tag => {
            const isAssigned = selectedTags.some(t => t.toLowerCase() === tag.name.toLowerCase());
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.name)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAssigned 
                    ? "bg-brand-text text-brand-bg border-brand-text shadow-[1px_1px_0px_#050505]" 
                    : "bg-brand-bg text-brand-text/80 border-brand-text/30 hover:border-brand-text hover:text-brand-text"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0 border border-brand-text/50" 
                  style={{ backgroundColor: tag.color || "#0c0c0c" }} 
                />
                <span>{tag.name}</span>
                {isAssigned && <Check size={10} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Informational Taxonomy Distinction Box */}
      <div className="p-3 bg-brand-bg border-2 border-brand-text text-xs font-mono space-y-1.5">
        <div className="flex items-center gap-2 text-brand-accent font-black text-[10px] uppercase">
          <Info size={13} />
          <span>TAXONOMY METADATA SUMMARY</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-brand-text">
          <span className="font-black uppercase tracking-wider">
            {selectedClassification || "UNASSIGNED MEDIUM"}
          </span>
          <ChevronRight size={12} className="text-brand-text/60" />
          <span className="font-black uppercase tracking-wider">
            {selectedType || "GENERIC ARTIFACT"}
          </span>
          {selectedTags.length > 0 && (
            <>
              <span className="text-brand-text/40">|</span>
              <span className="text-[10px] font-bold text-brand-text/80">
                TAGS: {selectedTags.join(", ")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
