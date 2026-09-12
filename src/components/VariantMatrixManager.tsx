import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  Palette, 
  Ruler, 
  DollarSign, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Package,
  Eye,
  Edit2
} from "lucide-react";
import { GarmentTypeConfig, ProductColorConfig, ProductVariant } from "../types";

// Curated default garment types for apparel and modular objects
export const DEFAULT_GARMENT_TYPES: GarmentTypeConfig[] = [
  { id: "regular-fit", name: "Regular Fit", basePrice: 3200, skuPrefix: "REG", description: "Standard relaxed drape with classic collar" },
  { id: "drop-shoulder", name: "Drop Shoulder", basePrice: 3800, skuPrefix: "DRP", description: "Dropped seam shoulder with architectural volume" },
  { id: "oversized", name: "Oversized", basePrice: 4200, skuPrefix: "OVR", description: "Generous wide-body silhouette with elongated sleeves" },
  { id: "heavyweight", name: "Heavyweight Boxy", basePrice: 4600, skuPrefix: "HVY", description: "Dense 280-450 GSM structured boxy armor piece" },
  { id: "hoodie-thermal", name: "Thermal Field Hoodie", basePrice: 5800, skuPrefix: "HOD", description: "Double-layered French terry thermal construction" },
];

// Curated architectural color palette presets
export const PRESET_COLORS: ProductColorConfig[] = [
  { id: "obsidian-black", name: "Obsidian Black", hex: "#0c0c0c" },
  { id: "washed-ecru", name: "Washed Raw Ecru", hex: "#f3eee4" },
  { id: "matte-charcoal", name: "Matte Charcoal", hex: "#262626" },
  { id: "heather-grey", name: "Heather Grey", hex: "#7a7a7a" },
  { id: "midnight-olive", name: "Midnight Olive", hex: "#3b4334" },
  { id: "desert-sand", name: "Desert Sand", hex: "#c7bba5" },
  { id: "deep-navy", name: "Midnight Navy", hex: "#182230" },
  { id: "pure-white", name: "Pure White", hex: "#ffffff" },
  { id: "earth-terracotta", name: "Earth Terracotta", hex: "#7d3f32" },
];

// Standard size ladders
export const PRESET_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "XS", "One Size"];

interface VariantMatrixManagerProps {
  productSku: string;
  defaultProductPrice: number;
  garmentTypes: GarmentTypeConfig[];
  onChangeGarmentTypes: (types: GarmentTypeConfig[]) => void;
  colors: ProductColorConfig[];
  onChangeColors: (colors: ProductColorConfig[]) => void;
  sizes: string[];
  onChangeSizes: (sizes: string[]) => void;
  variants: ProductVariant[];
  onChangeVariants: (variants: ProductVariant[]) => void;
}

export default function VariantMatrixManager({
  productSku,
  defaultProductPrice,
  garmentTypes,
  onChangeGarmentTypes,
  colors,
  onChangeColors,
  sizes,
  onChangeSizes,
  variants,
  onChangeVariants
}: VariantMatrixManagerProps) {
  // Local states for adding new custom types/colors/sizes
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState<number>(defaultProductPrice || 3500);
  
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#242424");
  
  const [newSizeInput, setNewSizeInput] = useState("");
  const [activeGarmentTab, setActiveGarmentTab] = useState<string>("all");
  const [bulkStockValue, setBulkStockValue] = useState<number>(15);

  // Sync / regenerate matrix when types, colors, or sizes change
  const handleRegenerateMatrix = (
    currentTypes = garmentTypes,
    currentColors = colors,
    currentSizes = sizes
  ) => {
    if (currentTypes.length === 0 || currentColors.length === 0 || currentSizes.length === 0) {
      return;
    }

    const newVariants: ProductVariant[] = [];
    const baseSku = productSku || "SYM-PROD";

    currentTypes.forEach(gType => {
      const typeCode = (gType.skuPrefix || gType.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");
      
      currentColors.forEach(col => {
        const colCode = col.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
        
        currentSizes.forEach(sz => {
          const varId = `v-${gType.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${col.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${sz.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          
          // Look for an existing variant to preserve custom price overrides or inventory
          const existing = variants.find(v => 
            (v.garmentType === gType.name || v.option1Value === gType.name) &&
            (v.color === col.name || v.option2Value === col.name) &&
            (v.size === sz || v.option3Value === sz)
          );

          const finalPrice = existing?.priceOverride !== undefined && existing.priceOverride !== null
            ? existing.priceOverride
            : (existing?.price !== undefined ? existing.price : (gType.basePrice || defaultProductPrice));

          newVariants.push({
            id: existing?.id || varId,
            productId: existing?.productId || "",
            sku: existing?.sku || `${baseSku}-${typeCode}-${colCode}-${sz}`,
            price: finalPrice,
            priceOverride: existing?.priceOverride ?? null,
            inventoryQuantity: existing?.inventoryQuantity !== undefined ? existing.inventoryQuantity : 15,
            inStock: existing?.inStock !== undefined ? existing.inStock : true,
            garmentType: gType.name,
            color: col.name,
            colorHex: col.hex,
            size: sz,
            option1Name: "Garment Type",
            option1Value: gType.name,
            option2Name: "Color",
            option2Value: col.name,
            option3Name: "Size",
            option3Value: sz
          });
        });
      });
    });

    onChangeVariants(newVariants);
  };

  // --- GARMENT TYPE MANAGEMENT ---
  const handleAddGarmentType = () => {
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (garmentTypes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const newType: GarmentTypeConfig = {
      id,
      name,
      basePrice: Number(newTypePrice) || defaultProductPrice || 3500,
      skuPrefix: name.slice(0, 3).toUpperCase()
    };
    const updated = [...garmentTypes, newType];
    onChangeGarmentTypes(updated);
    setNewTypeName("");
    handleRegenerateMatrix(updated, colors, sizes);
  };

  const handleRemoveGarmentType = (id: string) => {
    const updated = garmentTypes.filter(t => t.id !== id);
    onChangeGarmentTypes(updated);
    handleRegenerateMatrix(updated, colors, sizes);
  };

  const handleUpdateGarmentBasePrice = (id: string, newBasePrice: number) => {
    const updatedTypes = garmentTypes.map(t => 
      t.id === id ? { ...t, basePrice: newBasePrice } : t
    );
    onChangeGarmentTypes(updatedTypes);

    const targetType = updatedTypes.find(t => t.id === id);
    if (!targetType) return;

    // Propagate updated base price to variants that do not have an explicit priceOverride
    const updatedVariants = variants.map(v => {
      if (v.garmentType === targetType.name || v.option1Value === targetType.name) {
        if (!v.priceOverride) {
          return { ...v, price: newBasePrice };
        }
      }
      return v;
    });
    onChangeVariants(updatedVariants);
  };

  const handleToggleGarmentPreset = (preset: GarmentTypeConfig) => {
    const exists = garmentTypes.some(t => t.name.toLowerCase() === preset.name.toLowerCase());
    let updated: GarmentTypeConfig[];
    if (exists) {
      updated = garmentTypes.filter(t => t.name.toLowerCase() !== preset.name.toLowerCase());
    } else {
      updated = [...garmentTypes, { ...preset, basePrice: preset.basePrice || defaultProductPrice || 3500 }];
    }
    onChangeGarmentTypes(updated);
    handleRegenerateMatrix(updated, colors, sizes);
  };

  // --- COLOR MANAGEMENT ---
  const handleToggleColorPreset = (preset: ProductColorConfig) => {
    const exists = colors.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
    let updated: ProductColorConfig[];
    if (exists) {
      updated = colors.filter(c => c.name.toLowerCase() !== preset.name.toLowerCase());
    } else {
      updated = [...colors, preset];
    }
    onChangeColors(updated);
    handleRegenerateMatrix(garmentTypes, updated, sizes);
  };

  const handleAddCustomColor = () => {
    if (!newColorName.trim()) return;
    const name = newColorName.trim();
    if (colors.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    const customCol: ProductColorConfig = {
      id: `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
      name,
      hex: newColorHex
    };
    const updated = [...colors, customCol];
    onChangeColors(updated);
    setNewColorName("");
    handleRegenerateMatrix(garmentTypes, updated, sizes);
  };

  const handleRemoveColor = (colName: string) => {
    const updated = colors.filter(c => c.name.toLowerCase() !== colName.toLowerCase());
    onChangeColors(updated);
    handleRegenerateMatrix(garmentTypes, updated, sizes);
  };

  // --- SIZE MANAGEMENT ---
  const handleToggleSizePreset = (sz: string) => {
    const exists = sizes.includes(sz);
    let updated: string[];
    if (exists) {
      updated = sizes.filter(s => s !== sz);
    } else {
      updated = [...sizes, sz];
    }
    onChangeSizes(updated);
    handleRegenerateMatrix(garmentTypes, colors, updated);
  };

  const handleAddCustomSize = () => {
    if (!newSizeInput.trim()) return;
    const sz = newSizeInput.trim().toUpperCase();
    if (sizes.includes(sz)) return;
    const updated = [...sizes, sz];
    onChangeSizes(updated);
    setNewSizeInput("");
    handleRegenerateMatrix(garmentTypes, colors, updated);
  };

  const handleRemoveSize = (sz: string) => {
    const updated = sizes.filter(s => s !== sz);
    onChangeSizes(updated);
    handleRegenerateMatrix(garmentTypes, colors, updated);
  };

  // --- VARIANT ROW UPDATES ---
  const handleUpdateVariantField = (varId: string, field: keyof ProductVariant, value: any) => {
    const updated = variants.map(v => {
      if (v.id === varId) {
        const copy = { ...v, [field]: value };
        if (field === "priceOverride") {
          if (value === null || value === undefined || value === "") {
            copy.priceOverride = null;
            // Fall back to garment base price
            const gType = garmentTypes.find(t => t.name === v.garmentType || t.name === v.option1Value);
            copy.price = gType ? gType.basePrice : defaultProductPrice;
          } else {
            copy.priceOverride = Number(value);
            copy.price = Number(value);
          }
        }
        return copy;
      }
      return v;
    });
    onChangeVariants(updated);
  };

  const handleRemoveSingleVariant = (varId: string) => {
    onChangeVariants(variants.filter(v => v.id !== varId));
  };

  // Bulk set stock
  const handleBulkApplyStock = (gTypeName?: string) => {
    const updated = variants.map(v => {
      if (!gTypeName || v.garmentType === gTypeName || v.option1Value === gTypeName) {
        return { ...v, inventoryQuantity: bulkStockValue, inStock: bulkStockValue > 0 };
      }
      return v;
    });
    onChangeVariants(updated);
  };

  // Filtered variants based on selected Garment Type tab
  const displayedVariants = useMemo(() => {
    if (activeGarmentTab === "all") return variants;
    return variants.filter(v => (v.garmentType || v.option1Value) === activeGarmentTab);
  }, [variants, activeGarmentTab]);

  const totalPossiblePermutations = garmentTypes.length * colors.length * sizes.length;
  const totalActiveStock = variants.reduce((sum, v) => sum + (v.inStock !== false ? (v.inventoryQuantity || 0) : 0), 0);

  return (
    <div className="space-y-6 font-mono text-brand-text">
      {/* 1. GARMENT TYPE ARCHITECTURE & BASE PRICING */}
      <div className="bg-brand-bg border-2 border-brand-text p-4 sm:p-5 space-y-4 shadow-[2px_2px_0px_#050505]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-brand-text pb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-brand-accent shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              1. GARMENT TYPES &amp; BASE SILHOUETTES ({garmentTypes.length} SELECTED)
            </span>
          </div>
          <span className="text-[9px] font-bold text-brand-text/60 uppercase">
            BASE PRICE DEFINED AT SILHOUETTE LEVEL
          </span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="block text-[9px] font-black uppercase tracking-wider text-brand-accent">
            PRESET SILHOUETTE SELECTOR:
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_GARMENT_TYPES.map(preset => {
              const isSelected = garmentTypes.some(t => t.name.toLowerCase() === preset.name.toLowerCase());
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleToggleGarmentPreset(preset)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected 
                      ? "border-brand-text bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]" 
                      : "border-brand-text/30 bg-brand-surface text-brand-text/70 hover:border-brand-text hover:text-brand-text"
                  }`}
                >
                  {isSelected && <Check size={11} className="text-brand-bg" />}
                  <span>{preset.name}</span>
                  <span className={`text-[8px] px-1 py-0.2 border ${isSelected ? "border-brand-bg/30 text-brand-bg" : "border-brand-text/20 text-brand-accent font-bold"}`}>
                    Rs. {preset.basePrice.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Garment Types with Base Price Controls */}
        {garmentTypes.length > 0 && (
          <div className="space-y-2 pt-2">
            <label className="block text-[9px] font-black uppercase tracking-wider text-brand-text/80">
              ACTIVE SILHOUETTES &amp; BASE RATES:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {garmentTypes.map(t => (
                <div 
                  key={t.id}
                  className="p-3 bg-brand-surface border-2 border-brand-text flex items-center justify-between gap-3 shadow-[2px_2px_0px_#050505]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tight truncate">{t.name}</p>
                    <div className="flex items-center gap-1 text-[9px] text-brand-text/60">
                      <span>BASE:</span>
                      <div className="flex items-center">
                        <span className="font-bold text-brand-accent mr-1">Rs.</span>
                        <input 
                          type="number" 
                          value={t.basePrice}
                          onChange={e => handleUpdateGarmentBasePrice(t.id, Number(e.target.value))}
                          step="50"
                          min="0"
                          className="w-20 px-1.5 py-0.5 bg-brand-bg border border-brand-text text-xs font-black focus:outline-none focus:border-brand-accent"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGarmentType(t.id)}
                    className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                    title="Remove Garment Type"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Garment Type Adder */}
        <div className="p-3 bg-brand-surface border border-brand-text/20 space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/70 block">
            ADD CUSTOM GARMENT / OBJECT TYPE:
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              placeholder="e.g. Boxy Heavyweight Tee, 6-Panel Twill, 350ml Ceramic"
              className="flex-grow px-3 py-1.5 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none focus:border-brand-accent"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold">Rs.</span>
              <input 
                type="number"
                value={newTypePrice}
                onChange={e => setNewTypePrice(Number(e.target.value))}
                placeholder="Base Price"
                step="50"
                className="w-24 px-2 py-1.5 bg-brand-bg border-2 border-brand-text text-xs font-bold focus:outline-none focus:border-brand-accent"
              />
              <button
                type="button"
                onClick={handleAddGarmentType}
                disabled={!newTypeName.trim()}
                className="px-4 py-1.5 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer whitespace-nowrap border-2 border-brand-text shadow-[1px_1px_0px_#050505]"
              >
                + ADD TYPE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VISUAL COLORWAY PALETTE */}
      <div className="bg-brand-bg border-2 border-brand-text p-4 sm:p-5 space-y-4 shadow-[2px_2px_0px_#050505]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-brand-text pb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-brand-accent shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              2. COLORWAYS &amp; VISUAL SWATCHES ({colors.length} SELECTED)
            </span>
          </div>
          <span className="text-[9px] font-bold text-brand-text/60 uppercase">
            INTERACTIVE SWATCH SELECTOR
          </span>
        </div>

        {/* Preset Swatches */}
        <div className="space-y-2">
          <label className="block text-[9px] font-black uppercase tracking-wider text-brand-accent">
            PRESET ARCHITECTURAL PALETTES:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {PRESET_COLORS.map(preset => {
              const isSelected = colors.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleToggleColorPreset(preset)}
                  className={`p-2 border-2 text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505]"
                      : "border-brand-text/20 bg-brand-bg opacity-70 hover:opacity-100 hover:border-brand-text"
                  }`}
                >
                  <div 
                    className="w-5 h-5 rounded-full border border-black/30 shrink-0 shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && (
                      <Check size={11} className={preset.hex === "#ffffff" || preset.hex === "#f3eee4" ? "text-black" : "text-white"} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase truncate leading-tight">{preset.name}</p>
                    <p className="text-[8px] font-mono text-brand-text/50 uppercase">{preset.hex}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Creator */}
        <div className="p-3 bg-brand-surface border border-brand-text/20 space-y-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/70 block">
            CREATE CUSTOM COLOR / GLAZE / FINISH:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-brand-bg border-2 border-brand-text px-2 py-1">
              <input 
                type="color"
                value={newColorHex}
                onChange={e => setNewColorHex(e.target.value)}
                className="w-6 h-6 border-0 bg-transparent cursor-pointer"
              />
              <span className="text-[10px] font-mono uppercase font-bold">{newColorHex}</span>
            </div>
            <input 
              type="text"
              value={newColorName}
              onChange={e => setNewColorName(e.target.value)}
              placeholder="Color Name (e.g. Washed Bone, Sandstone)"
              className="flex-grow px-3 py-1.5 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none focus:border-brand-accent min-w-[180px]"
            />
            <button
              type="button"
              onClick={handleAddCustomColor}
              disabled={!newColorName.trim()}
              className="px-4 py-1.5 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer whitespace-nowrap border-2 border-brand-text shadow-[1px_1px_0px_#050505]"
            >
              + ADD COLOR
            </button>
          </div>
        </div>

        {/* Active Color Chips */}
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {colors.map(col => (
              <div 
                key={col.id || col.name}
                className="flex items-center gap-2 px-2.5 py-1 bg-brand-surface border-2 border-brand-text shadow-[1px_1px_0px_#050505]"
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-black/30"
                  style={{ backgroundColor: col.hex }}
                />
                <span className="text-[10px] font-black uppercase">{col.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(col.name)}
                  className="text-brand-text/50 hover:text-red-600 ml-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SIZES & VOLUMES */}
      <div className="bg-brand-bg border-2 border-brand-text p-4 sm:p-5 space-y-4 shadow-[2px_2px_0px_#050505]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-brand-text pb-3">
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-brand-accent shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              3. SIZES &amp; DIMENSIONS ({sizes.length} SELECTED)
            </span>
          </div>
          <span className="text-[9px] font-bold text-brand-text/60 uppercase">
            CONFIGURABLE PER PRODUCT
          </span>
        </div>

        {/* Preset Size Toggles */}
        <div className="space-y-2">
          <label className="block text-[9px] font-black uppercase tracking-wider text-brand-accent">
            QUICK SIZE TOGGLE:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SIZES.map(sz => {
              const isSelected = sizes.includes(sz);
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleToggleSizePreset(sz)}
                  className={`w-11 h-9 border-2 text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? "border-brand-text bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                      : "border-brand-text/30 bg-brand-surface text-brand-text/60 hover:border-brand-text hover:text-brand-text"
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Size Adder */}
        <div className="flex gap-2">
          <input 
            type="text"
            value={newSizeInput}
            onChange={e => setNewSizeInput(e.target.value)}
            placeholder="Custom Size (e.g. 3XL, 300ml, 38R, 7 1/4)"
            className="flex-grow px-3 py-1.5 bg-brand-bg border-2 border-brand-text text-xs font-bold uppercase focus:outline-none focus:border-brand-accent max-w-sm"
          />
          <button
            type="button"
            onClick={handleAddCustomSize}
            disabled={!newSizeInput.trim()}
            className="px-4 py-1.5 bg-brand-text text-brand-bg text-[10px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer border-2 border-brand-text shadow-[1px_1px_0px_#050505]"
          >
            + ADD SIZE
          </button>
        </div>
      </div>

      {/* 4. VARIANT PRICING & INVENTORY MATRIX */}
      <div className="bg-brand-surface border-2 border-brand-text p-4 sm:p-6 space-y-5 shadow-[4px_4px_0px_#050505]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-brand-text pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-brand-accent shrink-0" />
              <h4 className="text-sm font-black uppercase tracking-wider">
                4. VARIANT PRICING &amp; STOCK MATRIX
              </h4>
            </div>
            <p className="text-[10px] text-brand-text/70 uppercase">
              TOTAL PERMUTATIONS: <strong className="text-brand-accent font-black">{variants.length}</strong> ACTIVE VARIANTS // COMBINED STOCK: <strong className="text-brand-text font-black">{totalActiveStock}</strong> UNITS
            </p>
          </div>

          {/* Quick Matrix Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleRegenerateMatrix()}
              className="px-3 py-1.5 bg-brand-bg border-2 border-brand-text text-[10px] font-black uppercase tracking-wider hover:bg-brand-text hover:text-brand-bg transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#050505] cursor-pointer"
            >
              <RefreshCw size={11} /> REBUILD MATRIX
            </button>
          </div>
        </div>

        {/* Matrix Header Filters & Bulk stock bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-brand-bg border-2 border-brand-text">
          {/* Garment Type Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-black uppercase text-brand-text/60 mr-1">VIEW:</span>
            <button
              type="button"
              onClick={() => setActiveGarmentTab("all")}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                activeGarmentTab === "all"
                  ? "bg-brand-text text-brand-bg border-brand-text"
                  : "bg-brand-surface text-brand-text/70 border-brand-text/20 hover:border-brand-text"
              }`}
            >
              ALL ({variants.length})
            </button>
            {garmentTypes.map(t => {
              const count = variants.filter(v => (v.garmentType || v.option1Value) === t.name).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveGarmentTab(t.name)}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    activeGarmentTab === t.name
                      ? "bg-brand-text text-brand-bg border-brand-text"
                      : "bg-brand-surface text-brand-text/70 border-brand-text/20 hover:border-brand-text"
                  }`}
                >
                  {t.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Bulk stock assign */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-black uppercase text-brand-text/60">BULK STOCK:</span>
            <input 
              type="number"
              value={bulkStockValue}
              onChange={e => setBulkStockValue(Number(e.target.value))}
              className="w-14 px-1.5 py-1 bg-brand-surface border border-brand-text text-xs font-bold"
              min="0"
            />
            <button
              type="button"
              onClick={() => handleBulkApplyStock(activeGarmentTab === "all" ? undefined : activeGarmentTab)}
              className="px-2.5 py-1 bg-brand-text text-brand-bg text-[9px] font-black uppercase hover:opacity-90 cursor-pointer shadow-[1px_1px_0px_#050505]"
            >
              APPLY
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        {variants.length === 0 ? (
          <div className="p-8 text-center bg-brand-bg border-2 border-dashed border-brand-text/40 space-y-3">
            <AlertCircle size={28} className="mx-auto text-brand-text/40" />
            <p className="text-xs font-black uppercase tracking-wider">
              NO VARIANTS GENERATED YET
            </p>
            <p className="text-[10px] text-brand-text/60 uppercase max-w-md mx-auto">
              Select at least 1 Garment Type, 1 Color, and 1 Size above to automatically generate all specimen variants.
            </p>
            <button
              type="button"
              onClick={() => handleRegenerateMatrix()}
              className="px-4 py-2 bg-brand-text text-brand-bg font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#050505] cursor-pointer"
            >
              GENERATE MATRIX NOW
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-brand-text">
            <table className="w-full text-left text-xs font-mono border-collapse bg-brand-bg">
              <thead>
                <tr className="border-b-2 border-brand-text bg-brand-surface text-[9px] font-black uppercase tracking-wider text-brand-text/80">
                  <th className="py-2.5 px-3">GARMENT TYPE</th>
                  <th className="py-2.5 px-3">COLORWAY</th>
                  <th className="py-2.5 px-2 text-center">SIZE</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">BASE RATE</th>
                  <th className="py-2.5 px-3">PRICE OVERRIDE (OPTIONAL)</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-center">STOCK</th>
                  <th className="py-2.5 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-text/10">
                {displayedVariants.map(v => {
                  const gType = garmentTypes.find(t => t.name === (v.garmentType || v.option1Value));
                  const basePrice = gType?.basePrice || defaultProductPrice || 3500;
                  const hasOverride = v.priceOverride !== null && v.priceOverride !== undefined && v.priceOverride > 0;
                  const currentPrice = v.price || (hasOverride ? v.priceOverride : basePrice);
                  const isAvailable = v.inStock !== false && (v.inventoryQuantity ?? 1) > 0;

                  return (
                    <tr key={v.id} className="hover:bg-brand-surface/70 transition-colors">
                      {/* Garment Type */}
                      <td className="py-2.5 px-3 font-black uppercase text-xs">
                        <span className="bg-brand-surface px-2 py-0.5 border border-brand-text/30">
                          {v.garmentType || v.option1Value}
                        </span>
                      </td>

                      {/* Color */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0 shadow-inner"
                            style={{ backgroundColor: v.colorHex || colors.find(c => c.name === (v.color || v.option2Value))?.hex || "#222" }}
                          />
                          <span className="font-bold uppercase text-[11px]">
                            {v.color || v.option2Value}
                          </span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-block min-w-[28px] px-1.5 py-0.5 bg-brand-text text-brand-bg font-black text-[10px] text-center border border-brand-text">
                          {v.size || v.option3Value}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3 font-mono text-[10px] text-brand-text/70 uppercase">
                        <input 
                          type="text"
                          value={v.sku}
                          onChange={e => handleUpdateVariantField(v.id, "sku", e.target.value)}
                          className="w-32 px-1.5 py-0.5 bg-transparent border-b border-brand-text/20 focus:outline-none focus:border-brand-accent uppercase font-mono text-[10px]"
                        />
                      </td>

                      {/* Base Rate */}
                      <td className="py-2.5 px-3 font-bold text-[11px] text-brand-text/70">
                        Rs. {basePrice.toLocaleString()}
                      </td>

                      {/* Price Override */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-brand-text/60">Rs.</span>
                          <input 
                            type="number"
                            value={v.priceOverride !== null && v.priceOverride !== undefined ? v.priceOverride : ""}
                            onChange={e => {
                              const val = e.target.value;
                              handleUpdateVariantField(v.id, "priceOverride", val === "" ? null : Number(val));
                            }}
                            placeholder={String(basePrice)}
                            step="50"
                            className={`w-24 px-2 py-1 bg-brand-surface border text-xs font-black focus:outline-none ${
                              hasOverride 
                                ? "border-brand-accent bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent" 
                                : "border-brand-text/30"
                            }`}
                          />
                          {hasOverride && (
                            <span className="text-[8px] font-black uppercase bg-brand-accent text-white px-1.5 py-0.5">
                              OVERRIDE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* In-Stock Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateVariantField(v.id, "inStock", !isAvailable)}
                          className={`px-2 py-1 text-[8px] font-black uppercase tracking-wider border cursor-pointer ${
                            isAvailable 
                              ? "bg-emerald-600 text-white border-emerald-700" 
                              : "bg-red-100 text-red-700 border-red-400"
                          }`}
                        >
                          {isAvailable ? "IN STOCK" : "OUT"}
                        </button>
                      </td>

                      {/* Inventory Count */}
                      <td className="py-2.5 px-3 text-center">
                        <input 
                          type="number"
                          value={v.inventoryQuantity}
                          onChange={e => handleUpdateVariantField(v.id, "inventoryQuantity", Number(e.target.value))}
                          min="0"
                          className="w-16 px-1.5 py-1 text-center bg-brand-surface border border-brand-text text-xs font-bold focus:outline-none focus:border-brand-accent"
                        />
                      </td>

                      {/* Remove Row */}
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleVariant(v.id)}
                          className="text-brand-text/40 hover:text-red-600 p-1 cursor-pointer"
                          title="Remove variant permutation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
