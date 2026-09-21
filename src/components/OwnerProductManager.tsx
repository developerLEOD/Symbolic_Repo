import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  Eye, 
  Layers, 
  Sparkles, 
  Package, 
  DollarSign, 
  Tag, 
  FileText, 
  ShieldCheck, 
  RefreshCw, 
  Edit3, 
  Sliders, 
  Info,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  LogIn,
  LogOut,
  Key,
  Search,
  X,
  Filter,
  Users,
  FolderTree
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { Product, ProductVariant, Category, GarmentTypeConfig, ProductColorConfig } from "../types";
import OwnerReferralManager from "./OwnerReferralManager";
import OwnerTaxonomyManager from "./OwnerTaxonomyManager";
import ArtifactTaxonomySelector from "./ArtifactTaxonomySelector";
import OwnerArtifactSpecimenStudio from "./OwnerArtifactSpecimenStudio";
import VariantMatrixManager, { 
  DEFAULT_GARMENT_TYPES, 
  PRESET_COLORS, 
  PRESET_SIZES 
} from "./VariantMatrixManager";
import { PRESET_SYMBOL_KNOWLEDGE } from "../lib/symbolKnowledge";
import { processFileToCompressedDataUrl } from "../lib/imageOptimization";
import { 
  fetchCategories, 
  fetchProducts, 
  fetchProductVariants, 
  saveProductWithVariants, 
  deleteProductAndVariants, 
  toggleProductAvailability 
} from "../lib/productService";

interface OwnerProductManagerProps {
  onClose: () => void;
  onProductPublished: () => void;
  categories: Category[];
  onViewProductInStore?: (catId: string) => void;
  initialEditProductId?: string | null;
}

// Pre-curated SYMBOLIC editorial asset images for quick photo selection
const PRESET_IMAGES = [
  { name: "Be Symbolic Mug", url: "/src/assets/images/mug_be_symbolic_1788008321905.jpg", category: "mugs" },
  { name: "Seek Wisdom Mug", url: "/src/assets/images/mug_seek_wisdom_1788008333595.jpg", category: "mugs" },
  { name: "Find Clarity Mug", url: "/src/assets/images/mug_find_clarity_1788008345150.jpg", category: "mugs" },
  { name: "Editorial Apparel & Cap", url: "/src/assets/images/store_hero_editorial_1788008309317.jpg", category: "t-shirts" },
];

export default function OwnerProductManager({ 
  onClose, 
  onProductPublished, 
  categories, 
  onViewProductInStore,
  initialEditProductId 
}: OwnerProductManagerProps) {
  const { user, isOwner, signInWithEmail, signInWithGoogle, signOutUser, formatAuthError } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"artifacts" | "upload" | "catalog" | "referrals" | "taxonomy">("artifacts");
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "list">("grid");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");
  const [catalogClassificationFilter, setCatalogClassificationFilter] = useState("all");
  const [catalogTagFilter, setCatalogTagFilter] = useState("all");
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [collectionName, setCollectionName] = useState("Be Symbolic");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "be-symbolic");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(1490);
  const [inventory, setInventory] = useState<number>(50);
  const [availability, setAvailability] = useState(true);
  
  // Owner-only Artifact Classification & Tagging State
  const [artifactClassification, setArtifactClassification] = useState<string>("WEAR");
  const [artifactType, setArtifactType] = useState<string>("T-Shirts");
  const [artifactTags, setArtifactTags] = useState<string[]>(["Heavyweight"]);
  
  // Editorial Philosophy
  const [symbolicTagline, setSymbolicTagline] = useState("A symbol of reflective culture.");
  const [description, setDescription] = useState("");
  
  // Meaning & 4 Pillars of Symbolic Representation
  const [inscription, setInscription] = useState("أَلِف");
  const [pillar1Represents, setPillar1Represents] = useState(PRESET_SYMBOL_KNOWLEDGE["أَلِف"]?.represents || "");
  const [pillar2WhyChosen, setPillar2WhyChosen] = useState(PRESET_SYMBOL_KNOWLEDGE["أَلِف"]?.whyChosen || "");
  const [pillar3Communicates, setPillar3Communicates] = useState(PRESET_SYMBOL_KNOWLEDGE["أَلِف"]?.communicates || "");
  const [pillar4WearerCarries, setPillar4WearerCarries] = useState(PRESET_SYMBOL_KNOWLEDGE["أَلِف"]?.wearerCarries || "");

  const applySymbolPreset = (sym: string) => {
    const data = PRESET_SYMBOL_KNOWLEDGE[sym];
    if (data) {
      setInscription(data.symbol);
      setPillar1Represents(data.represents);
      setPillar2WhyChosen(data.whyChosen);
      setPillar3Communicates(data.communicates);
      setPillar4WearerCarries(data.wearerCarries);
      showNotification("success", `Loaded thesis for symbol "${sym}" (${data.name})`);
    }
  };
  
  // Materiality & Specs
  const [material, setMaterial] = useState("100% Organic Cotton");
  const [color, setColor] = useState("Matte Charcoal");
  const [capacity, setCapacity] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [weight, setWeight] = useState("");
  const [careInstructions, setCareInstructions] = useState("Hand wash recommended. Air dry.");

  // Images
  const [images, setImages] = useState<string[]>([PRESET_IMAGES[0].url]);
  const [thumbnailImage, setThumbnailImage] = useState<string>("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-Axis Scalable Variant Architecture State
  const [hasVariants, setHasVariants] = useState(false);
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeConfig[]>(DEFAULT_GARMENT_TYPES.slice(0, 3));
  const [availableColors, setAvailableColors] = useState<ProductColorConfig[]>(PRESET_COLORS.slice(0, 3));
  const [availableSizes, setAvailableSizes] = useState<string[]>(["S", "M", "L", "XL", "XXL"]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Helper to construct permutations
  const buildInitialVariants = (
    types: GarmentTypeConfig[],
    cols: ProductColorConfig[],
    szs: string[],
    baseSku: string,
    fallbackPrice: number
  ): ProductVariant[] => {
    const list: ProductVariant[] = [];
    types.forEach(gType => {
      const typeCode = (gType.skuPrefix || gType.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");
      cols.forEach(col => {
        const colCode = col.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
        szs.forEach(sz => {
          list.push({
            id: `v-${gType.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${col.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${sz.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            productId: "",
            sku: `${baseSku || "SYM-PROD"}-${typeCode}-${colCode}-${sz}`,
            price: gType.basePrice || fallbackPrice || 3500,
            priceOverride: null,
            inventoryQuantity: 15,
            inStock: true,
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
    return list;
  };

  // Load existing products when catalog tab is opened
  const loadExistingProducts = async () => {
    setLoadingProducts(true);
    try {
      const prods = await fetchProducts();
      setExistingProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeTab === "catalog") {
      loadExistingProducts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (initialEditProductId) {
      const loadInitial = async () => {
        try {
          const prods = await fetchProducts();
          const target = prods.find(p => p.id === initialEditProductId);
          if (target) {
            startEditProduct(target);
          }
        } catch (e) {
          console.error("Failed to load initial product to edit", e);
        }
      };
      loadInitial();
    }
  }, [initialEditProductId]);

  // Auto-generate SKU when name or collection changes if SKU is untouched or auto-formatted
  const generateSku = (prodName: string, catId: string) => {
    const catCode = (catId === "palestine" || catId === "be-palestine") ? "PAL" : "SYM";
    const nameCode = prodName
      .trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 3) || "01";
    const rand = Math.floor(100 + Math.random() * 900);
    return `SYM-${catCode}-${nameCode || rand}`;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingProductId && (!sku || sku.startsWith("SYM-"))) {
      setSku(generateSku(val, categoryId));
    }
  };

  const handleCollectionChange = (newCol: string) => {
    setCollectionName(newCol);
    if (!editingProductId && (!sku || sku.startsWith("SYM-"))) {
      setSku(generateSku(name, categoryId));
    }
  };

  // Image Upload handler via FileReader with optimized compression
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = (Array.from(files) as File[]).filter(f => f.type.startsWith("image/"));
    for (const file of fileList) {
      try {
        const compressed = await processFileToCompressedDataUrl(file, 1600, 0.88);
        setImages(prev => [...prev, compressed]);
      } catch (err) {
        console.error("Error optimizing product image:", err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setImages(prev => [...prev, customImageUrl.trim()]);
    setCustomImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages(prev => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  // Reset form
  const resetForm = () => {
    setEditingProductId(null);
    setName("");
    setCollectionName("Be Symbolic");
    setCategoryId(categories[0]?.id || "be-symbolic");
    setSku("");
    setPrice(1490);
    setInventory(50);
    setAvailability(true);
    setArtifactClassification("WEAR");
    setArtifactType("T-Shirts");
    setArtifactTags(["Heavyweight"]);
    setSymbolicTagline("A symbol of reflective culture.");
    setDescription("");
    setInscription("");
    setPillar1Represents("");
    setPillar2WhyChosen("");
    setPillar3Communicates("");
    setPillar4WearerCarries("");
    setMaterial("100% Organic Cotton");
    setColor("Matte Charcoal");
    setCapacity("");
    setDimensions("");
    setWeight("");
    setCareInstructions("Hand wash recommended. Air dry.");
    setImages([PRESET_IMAGES[0].url]);
    setThumbnailImage("");
    setHasVariants(false);
    setGarmentTypes(DEFAULT_GARMENT_TYPES.slice(0, 3));
    setAvailableColors(PRESET_COLORS.slice(0, 3));
    setAvailableSizes(["S", "M", "L", "XL", "XXL"]);
    setVariants([]);
  };

  // Edit existing product
  const startEditProduct = async (prod: Product) => {
    setEditingProductId(prod.id);
    setName(prod.name);
    setCollectionName(prod.collectionName || "Be Symbolic");
    setCategoryId(prod.categoryId);
    setSku(prod.sku);
    setPrice(prod.price);
    setInventory(prod.inventory);
    setAvailability(prod.availability);
    
    // Load taxonomy metadata
    setArtifactClassification(prod.artifactClassification || (prod.categoryId ? prod.categoryId.toUpperCase() : "WEAR"));
    setArtifactType(prod.artifactType || "T-Shirts");
    setArtifactTags(Array.isArray(prod.artifactTags) ? prod.artifactTags : []);

    setSymbolicTagline(prod.symbolicTagline || "A symbol of reflective culture.");
    setDescription(prod.description);
    
    // Load 4 Pillars & Symbol
    const cleanSym = prod.inscription?.replace(/^#\s*/, "").trim() || "";
    const preset = PRESET_SYMBOL_KNOWLEDGE[cleanSym] || PRESET_SYMBOL_KNOWLEDGE[prod.name];
    setInscription(prod.inscription || "");
    setPillar1Represents(prod.pillar1Represents || prod.statementMeaning || preset?.represents || "");
    setPillar2WhyChosen(prod.pillar2WhyChosen || prod.representation || preset?.whyChosen || "");
    setPillar3Communicates(prod.pillar3Communicates || prod.wearingCommunicates || preset?.communicates || "");
    setPillar4WearerCarries(prod.pillar4WearerCarries || prod.statement || preset?.wearerCarries || "");

    setMaterial(prod.material || "");
    setColor(prod.color || "");
    setCapacity(prod.capacity || "");
    setDimensions(prod.dimensions || "");
    setWeight(prod.weight || "");
    setCareInstructions(prod.careInstructions || "");
    setImages(prod.images && prod.images.length > 0 ? prod.images : [PRESET_IMAGES[0].url]);
    setThumbnailImage(prod.thumbnailImage || "");

    // Load existing variants if any
    try {
      const vars = await fetchProductVariants(prod.id);
      if (prod.garmentTypes && prod.garmentTypes.length > 0) {
        setGarmentTypes(prod.garmentTypes);
      }
      if (prod.availableColors && prod.availableColors.length > 0) {
        setAvailableColors(prod.availableColors);
      }
      if (prod.availableSizes && prod.availableSizes.length > 0) {
        setAvailableSizes(prod.availableSizes);
      }

      if (vars.length > 0) {
        setHasVariants(true);
        setVariants(vars);

        // Backward compatibility: Extract garmentTypes, colors, and sizes if not saved in product document
        if (!prod.garmentTypes || prod.garmentTypes.length === 0) {
          const typeNames = Array.from(new Set(vars.map(v => v.garmentType || v.option1Value || "Regular Fit")));
          setGarmentTypes(typeNames.map((tName, idx) => ({
            id: `type-${idx}-${tName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: tName,
            basePrice: vars.find(v => (v.garmentType || v.option1Value) === tName)?.price || prod.price || 3500
          })));
        }

        if (!prod.availableColors || prod.availableColors.length === 0) {
          const colNames = Array.from(new Set(vars.map(v => v.color || v.option2Value || prod.color || "Standard")));
          setAvailableColors(colNames.map((cName, idx) => {
            const foundPreset = PRESET_COLORS.find(p => p.name.toLowerCase() === cName.toLowerCase());
            return {
              id: `col-${idx}-${cName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
              name: cName,
              hex: foundPreset ? foundPreset.hex : "#222222"
            };
          }));
        }

        if (!prod.availableSizes || prod.availableSizes.length === 0) {
          const szNames = Array.from(new Set(vars.map(v => v.size || v.option3Value || "M")));
          setAvailableSizes(szNames);
        }
      } else {
        setHasVariants(false);
        setVariants([]);
        if (!prod.garmentTypes || prod.garmentTypes.length === 0) {
          setGarmentTypes(DEFAULT_GARMENT_TYPES.slice(0, 3).map(t => ({ ...t, basePrice: prod.price || t.basePrice })));
        }
      }
    } catch (e) {
      console.error("Failed to load variants", e);
    }

    setActiveTab("upload");
    showNotification("success", `Editing "${prod.name}"`);
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Submit product to Firestore
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showNotification("error", "Please provide a product name.");
      return;
    }
    if (!description.trim()) {
      showNotification("error", "Please include an editorial description.");
      return;
    }
    if (!price || price <= 0) {
      showNotification("error", "Please specify a valid price.");
      return;
    }
    if (images.length === 0) {
      showNotification("error", "Please attach at least one product photo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const prodId = editingProductId || (sku ? sku.toLowerCase().replace(/[^a-z0-9_-]/g, "-") : `prod-${Date.now()}`);
      
      const calculatedTotalInventory = hasVariants && variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.inStock !== false ? (v.inventoryQuantity || 0) : 0), 0)
        : Number(inventory);

      const productPayload: Product = {
        id: prodId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        sku: sku.trim() || `SYM-${Date.now()}`,
        images,
        thumbnailImage: thumbnailImage || undefined,
        inventory: calculatedTotalInventory,
        availability: Boolean(availability),
        collectionName: collectionName.trim(),
        symbolicTagline: symbolicTagline.trim(),
        inscription: inscription.trim() || undefined,
        pillar1Represents: pillar1Represents.trim() || undefined,
        pillar2WhyChosen: pillar2WhyChosen.trim() || undefined,
        pillar3Communicates: pillar3Communicates.trim() || undefined,
        pillar4WearerCarries: pillar4WearerCarries.trim() || undefined,
        // Legacy compatibility aliases
        statementMeaning: pillar1Represents.trim() || undefined,
        representation: pillar2WhyChosen.trim() || undefined,
        wearingCommunicates: pillar3Communicates.trim() || undefined,
        statement: pillar4WearerCarries.trim() || undefined,
        material: material.trim(),
        color: color.trim(),
        capacity: capacity.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        weight: weight.trim() || undefined,
        careInstructions: careInstructions.trim() || undefined,
        artifactClassification: artifactClassification.trim() || undefined,
        artifactType: artifactType.trim() || undefined,
        artifactTags: artifactTags && artifactTags.length > 0 ? artifactTags : undefined,
        garmentTypes: hasVariants ? garmentTypes : undefined,
        availableColors: hasVariants ? availableColors : undefined,
        availableSizes: hasVariants ? availableSizes : undefined
      };

      const variantsPayload = hasVariants 
        ? variants.map(v => ({
            ...v,
            productId: prodId,
            sku: v.sku || `${productPayload.sku}-${v.option1Value || "VAR"}`
          }))
        : [];

      await saveProductWithVariants(productPayload, variantsPayload);
      
      showNotification("success", editingProductId ? "Product updated successfully in store catalog!" : "Product published live to SYMBOLIC store!");
      onProductPublished();
      
      if (!editingProductId) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to save product to Firestore. Check console logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product - opens non-blocking in-app confirmation modal (works safely inside iframes)
  const handleDeleteProduct = (id: string, prodName: string) => {
    setProductToDelete({ id, name: prodName });
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const { id, name: prodName } = productToDelete;
    setIsDeletingProduct(true);
    try {
      await deleteProductAndVariants(id);
      // Immediately reflect removal in local catalog state
      setExistingProducts(prev => prev.filter(p => p.id !== id));
      showNotification("success", `Removed "${prodName}" from catalog.`);
      
      // If currently editing the product that was deleted, reset form
      if (editingProductId === id) {
        resetForm();
        setActiveTab("catalog");
      }
      
      loadExistingProducts();
      onProductPublished();
      setProductToDelete(null);
    } catch (err) {
      console.error("Failed to delete product:", err);
      showNotification("error", "Failed to delete product from database.");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Toggle availability inline in catalog
  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      await toggleProductAvailability(id, !current);
      setExistingProducts(prev => prev.map(p => p.id === id ? { ...p, availability: !current } : p));
      onProductPublished();
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === categoryId);

  if (!isOwner) {
    const handleOwnerEmailLogin = async (e: FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setAuthLoading(true);
      try {
        if (!loginEmail.trim() || !loginPassword) {
          throw new Error("Please enter both email and password.");
        }
        await signInWithEmail(loginEmail, loginPassword);
      } catch (err: any) {
        setAuthError(formatAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    };

    const handleOwnerGoogleLogin = async () => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        await signInWithGoogle();
      } catch (err: any) {
        setAuthError(formatAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    };

    const handleSwitchAccount = async () => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        await signOutUser();
      } catch (err: any) {
        setAuthError(formatAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm text-brand-text flex items-center justify-center p-4 sm:p-6 font-mono overflow-y-auto">
        <div className="max-w-lg w-full bg-brand-bg border-2 border-brand-text p-6 sm:p-8 shadow-[8px_8px_0px_#050505] space-y-6 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-brand-text pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-brand-accent" />
              <h2 className="font-black text-sm uppercase tracking-wider text-brand-text">
                STUDIO // OWNER ACCESS GATE
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-mono font-bold uppercase hover:text-brand-accent p-1 cursor-pointer"
            >
              [ CLOSE ]
            </button>
          </div>

          {/* Session Status Banner */}
          <div className="bg-brand-surface border-2 border-brand-text p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-text/60 uppercase">CURRENT AUTH SESSION:</span>
              {user && (
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-[9px] font-black uppercase text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={10} /> SIGN OUT / SWITCH
                </button>
              )}
            </div>
            <span className="font-bold text-brand-text truncate block">
              {user ? user.email : "[ UNAUTHENTICATED SESSION ]"}
            </span>
            {user && !isOwner && (
              <p className="text-[10px] text-red-600 font-bold uppercase mt-1">
                Notice: Logged in account is not on the owner whitelist. Sign in with an authorized owner account below.
              </p>
            )}
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Quick Sign-In */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleOwnerGoogleLogin}
              className="w-full py-3 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text border-2 border-brand-text font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_#050505] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>SIGN IN WITH GOOGLE (OWNER)</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-brand-text/20 w-full"></div>
            <span className="bg-brand-bg px-3 text-[10px] font-black uppercase text-brand-text/50 shrink-0">
              OR EMAIL PASSWORD
            </span>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleOwnerEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                OWNER EMAIL
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2.5 text-xs font-bold uppercase text-brand-text focus:outline-none focus:border-brand-accent"
                />
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/60" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2.5 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                />
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/60" />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white border-2 border-brand-text font-black text-xs uppercase tracking-widest transition-all shadow-[3px_3px_0px_#050505] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn size={14} />
              <span>{authLoading ? "AUTHENTICATING..." : "ENTER STUDIO MANAGER"}</span>
            </button>
          </form>

          {/* Footer actions */}
          <div className="pt-2 border-t border-brand-text/15 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-mono font-bold uppercase text-brand-text/70 hover:text-brand-text cursor-pointer"
            >
              &larr; Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredCatalogProducts = existingProducts.filter(p => {
    let matchesCat = true;
    if (catalogCategoryFilter === "be-symbolic") {
      matchesCat = p.categoryId === "be-symbolic" || (!p.collectionName || p.collectionName.toLowerCase().includes("symbolic"));
    } else if (catalogCategoryFilter === "palestine" || catalogCategoryFilter === "be-palestine") {
      matchesCat = p.categoryId === "palestine" || p.categoryId === "be-palestine" || (p.collectionName && p.collectionName.toLowerCase().includes("palestine"));
    } else if (catalogCategoryFilter !== "all") {
      matchesCat = p.categoryId === catalogCategoryFilter;
    }

    let matchesClassification = true;
    if (catalogClassificationFilter !== "all") {
      matchesClassification = (p.artifactClassification || "").toUpperCase() === catalogClassificationFilter.toUpperCase();
    }

    let matchesTag = true;
    if (catalogTagFilter !== "all") {
      matchesTag = Array.isArray(p.artifactTags) && p.artifactTags.some(t => t.toLowerCase() === catalogTagFilter.toLowerCase());
    }

    const q = catalogSearch.toLowerCase().trim();
    const matchesQuery = !q || 
      p.name.toLowerCase().includes(q) || 
      (p.sku || "").toLowerCase().includes(q) || 
      (p.collectionName || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.artifactClassification || "").toLowerCase().includes(q) ||
      (p.artifactType || "").toLowerCase().includes(q) ||
      (Array.isArray(p.artifactTags) && p.artifactTags.some(t => t.toLowerCase().includes(q)));
      
    return matchesCat && matchesClassification && matchesTag && matchesQuery;
  });

  const liveCount = existingProducts.filter(p => p.availability).length;
  const draftCount = existingProducts.filter(p => !p.availability).length;

  return (
    <div className="fixed inset-0 z-[100] bg-brand-bg text-brand-text flex flex-col overflow-hidden font-mono selection:bg-brand-text selection:text-brand-bg">
      {/* Top Bar */}
      <header className="h-16 border-b-2 border-brand-text bg-brand-bg/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20 select-none">
        {/* Left: Merged Symbolic Brand & Exit Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
          <button 
            type="button"
            onClick={onClose}
            title="Exit Studio & Return to Storefront"
            className="group flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-brand-bg shadow-[2px_2px_0px_#050505] active:translate-x-0.5 active:translate-y-0.5 transition-all text-left shrink-0 cursor-pointer"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 overflow-hidden bg-brand-bg flex items-center justify-center border border-brand-text group-hover:border-brand-bg transition-colors">
              <img 
                src="/Logo_NoName.jpg" 
                alt="SYMBOLIC" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col items-end leading-none">
              <div className="flex items-center gap-1">
                <ArrowLeft size={11} className="text-brand-accent group-hover:text-brand-bg transition-transform group-hover:-translate-x-0.5 shrink-0" />
                <span className="font-mono font-black text-xs sm:text-sm tracking-tight leading-tight">SYMBOLIC</span>
              </div>
              <span className="font-mono text-[8px] sm:text-[9px] font-bold italic text-brand-accent group-hover:text-brand-bg leading-tight -mt-0.5">MUSLIMS</span>
            </div>
          </button>

          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30 whitespace-nowrap">
              STUDIO REGISTRY
            </span>
            <span className="text-[10px] font-mono font-bold uppercase text-brand-text/60 truncate max-w-[180px] whitespace-nowrap">
              {editingProductId ? `// EDIT: ${name || "SPECIMEN"}` : "// CATALOG CONTROL"}
            </span>
          </div>
        </div>

        {/* Center: Clean Segmented Mode Switcher */}
        <div className="flex items-center bg-brand-surface border-2 border-brand-text p-1 shadow-[2px_2px_0px_#050505] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("artifacts")}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "artifacts" 
                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
            }`}
          >
            <Layers size={12} className="shrink-0 text-brand-accent" />
            <span>ARTIFACTS &amp; SPECIMENS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "upload" 
                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
            }`}
          >
            {editingProductId ? (
              <>
                <Edit3 size={12} className="shrink-0 hidden xs:inline" />
                <span>EDIT SPECIMEN</span>
              </>
            ) : (
              <>
                <Plus size={12} className="shrink-0 hidden xs:inline" />
                <span>NEW SPECIMEN</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("catalog"); loadExistingProducts(); }}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "catalog" 
                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
            }`}
          >
            <Package size={12} className="shrink-0 hidden xs:inline" />
            <span>CATALOG ({existingProducts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("referrals")}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "referrals" 
                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
            }`}
          >
            <Users size={12} className="shrink-0 hidden xs:inline" />
            <span>REFERRALS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("taxonomy")}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "taxonomy" 
                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
            }`}
          >
            <FolderTree size={12} className="shrink-0 hidden xs:inline text-brand-accent" />
            <span>CLASSIFICATIONS &amp; TAGS</span>
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "upload" ? (
            <>
              {editingProductId && (
                <>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="hidden md:flex items-center gap-1 px-2.5 py-1.5 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_#050505] whitespace-nowrap shrink-0"
                    title="Start a new blank product"
                  >
                    <Plus size={12} className="shrink-0" />
                    <span>NEW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const prod = existingProducts.find(p => p.id === editingProductId);
                      if (prod) handleDeleteProduct(prod.id, prod.name);
                    }}
                    className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] hover:border-red-700 transition-all whitespace-nowrap shrink-0"
                    title="Delete product"
                  >
                    <Trash2 size={12} className="shrink-0" />
                    <span className="hidden sm:inline">DELETE</span>
                  </button>
                </>
              )}
              <button
                type="submit"
                form="owner-product-form"
                disabled={isSubmitting}
                className="bg-brand-accent text-white px-3.5 sm:px-5 py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin shrink-0" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} className="shrink-0" />
                    <span>{editingProductId ? "SAVE CHANGES" : "PUBLISH LIVE"}</span>
                  </>
                )}
              </button>
            </>
          ) : activeTab === "catalog" ? (
            <>
              <button
                type="button"
                onClick={loadExistingProducts}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 border-2 border-brand-text bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_#050505] whitespace-nowrap shrink-0"
              >
                <RefreshCw size={12} className={`shrink-0 ${loadingProducts ? "animate-spin" : ""}`} />
                <span>REFRESH</span>
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setActiveTab("upload"); }}
                className="bg-brand-text text-brand-bg px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] hover:bg-neutral-800 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus size={12} className="shrink-0" />
                <span>+ NEW OBJECT</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 border border-emerald-600">
                REFERRAL LOGIC // ACTIVE
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-24 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 border-2 border-brand-text shadow-[6px_6px_0px_#050505] flex items-center gap-3 text-xs font-black uppercase tracking-wider ${notification.type === "success" ? "bg-brand-text text-brand-bg" : "bg-red-600 text-white"}`}
          >
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto">
        {activeTab === "artifacts" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            <OwnerArtifactSpecimenStudio
              onDataChanged={() => {
                loadExistingProducts();
                onProductPublished();
              }}
              onViewArtifactInStore={(artId) => {
                if (onViewProductInStore) {
                  onViewProductInStore(artId);
                }
              }}
            />
          </div>
        ) : activeTab === "taxonomy" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            <OwnerTaxonomyManager />
          </div>
        ) : activeTab === "referrals" ? (
          <OwnerReferralManager
            onNotify={(type, message) => {
              setNotification({ type, message });
              setTimeout(() => setNotification(null), 4000);
            }}
          />
        ) : activeTab === "catalog" ? (
          /* Catalog View */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
            {/* Header and Stats */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-brand-text pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/20">
                      LIVE ARCHIVE
                    </span>
                    <span className="text-[10px] text-brand-text/60">FIRESTORE ENGINE</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-mono font-black uppercase tracking-tight text-brand-text">
                    MERCHANDISE ARCHIVE CATALOG
                  </h2>
                  <p className="text-xs text-brand-text/70 mt-1">
                    Control publication state, inventory levels, and editorial specifications across all specimens.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={loadExistingProducts}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 border-2 border-brand-text bg-brand-surface text-[10px] font-mono font-black uppercase tracking-wider hover:bg-brand-text hover:text-brand-bg transition-all shadow-[2px_2px_0px_#050505]"
                  >
                    <RefreshCw size={12} className={loadingProducts ? "animate-spin" : ""} />
                    <span>REFRESH</span>
                  </button>
                  <button
                    onClick={() => { resetForm(); setActiveTab("upload"); }}
                    className="flex items-center gap-2 bg-brand-text text-brand-bg px-4 sm:px-5 py-2 text-[10px] font-mono font-black uppercase tracking-wider hover:bg-neutral-800 transition-all border-2 border-brand-text shadow-[3px_3px_0px_#050505]"
                  >
                    <Plus size={13} />
                    <span>+ NEW OBJECT</span>
                  </button>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="border-2 border-brand-text bg-brand-surface p-4 shadow-[3px_3px_0px_#050505]">
                  <p className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-text/60">TOTAL OBJECTS</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-brand-text mt-1">{existingProducts.length}</p>
                </div>
                <div className="border-2 border-brand-text bg-brand-surface p-4 shadow-[3px_3px_0px_#050505]">
                  <p className="text-[9px] font-mono font-black uppercase tracking-wider text-emerald-700">LIVE ON STORE</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-700 mt-1">{liveCount}</p>
                </div>
                <div className="border-2 border-brand-text bg-brand-surface p-4 shadow-[3px_3px_0px_#050505]">
                  <p className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-text/60">DRAFTS / HIDDEN</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-brand-text mt-1">{draftCount}</p>
                </div>
                <div className="border-2 border-brand-text bg-brand-surface p-4 shadow-[3px_3px_0px_#050505]">
                  <p className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent">CATEGORIES</p>
                  <p className="text-2xl sm:text-3xl font-mono font-black text-brand-accent mt-1">{categories.length}</p>
                </div>
              </div>

              {/* Command Filter & Search Bar */}
              <div className="border-2 border-brand-text bg-brand-surface p-3 sm:p-4 shadow-[4px_4px_0px_#050505] flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="SEARCH SPECIMEN BY NAME, SKU, ETHOS..."
                    className="w-full bg-brand-bg border-2 border-brand-text pl-9 pr-8 py-2 text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => setCatalogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text/50 hover:text-brand-text"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Category Pills & View Switcher */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                    <button
                      onClick={() => setCatalogCategoryFilter("all")}
                      className={`px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text transition-all ${
                        catalogCategoryFilter === "all"
                          ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                          : "bg-brand-bg text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
                      }`}
                    >
                      ALL
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCatalogCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text transition-all whitespace-nowrap ${
                          catalogCategoryFilter === cat.id
                            ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                            : "bg-brand-bg text-brand-text/70 hover:text-brand-text hover:bg-brand-text/5"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  <div className="h-6 w-[2px] bg-brand-text/20 hidden lg:block" />

                  {/* View Mode */}
                  <div className="flex border-2 border-brand-text bg-brand-bg p-0.5">
                    <button
                      onClick={() => setCatalogViewMode("grid")}
                      className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
                        catalogViewMode === "grid" ? "bg-brand-text text-brand-bg" : "text-brand-text/60 hover:text-brand-text"
                      }`}
                      title="Grid Tiles View"
                    >
                      GRID
                    </button>
                    <button
                      onClick={() => setCatalogViewMode("list")}
                      className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
                        catalogViewMode === "list" ? "bg-brand-text text-brand-bg" : "text-brand-text/60 hover:text-brand-text"
                      }`}
                      title="Ledger Table View"
                    >
                      LEDGER
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingProducts ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-brand-text border-t-brand-accent rounded-full animate-spin" />
                <p className="text-xs font-mono uppercase tracking-wider text-brand-text/60">SYNCHRONIZING WITH ARCHIVE...</p>
              </div>
            ) : filteredCatalogProducts.length === 0 ? (
              <div className="p-16 border-2 border-dashed border-brand-text/30 bg-brand-surface text-center space-y-4 shadow-[4px_4px_0px_#050505]">
                <Package size={36} className="mx-auto text-brand-text/30" />
                <p className="text-sm font-mono font-black uppercase tracking-wider text-brand-text">
                  {catalogSearch || catalogCategoryFilter !== "all" 
                    ? "[ NO SPECIMENS MATCH CURRENT SEARCH CRITERIA ]"
                    : "[ NO SPECIMENS REGISTERED IN DATABASE YET ]"}
                </p>
                <p className="text-xs text-brand-text/60 max-w-md mx-auto">
                  {catalogSearch || catalogCategoryFilter !== "all"
                    ? "Try clearing the search query or adjusting the category filter."
                    : "Create and publish your first archival object using the Studio upload engine."}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  {catalogSearch || catalogCategoryFilter !== "all" ? (
                    <button
                      onClick={() => { setCatalogSearch(""); setCatalogCategoryFilter("all"); }}
                      className="border-2 border-brand-text bg-brand-text text-brand-bg px-5 py-2 text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505]"
                    >
                      CLEAR FILTERS
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="border-2 border-brand-text bg-brand-text text-brand-bg px-6 py-2.5 text-[10px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#050505]"
                    >
                      + UPLOAD FIRST SPECIMEN
                    </button>
                  )}
                </div>
              </div>
            ) : catalogViewMode === "list" ? (
              <div className="bg-brand-surface border-2 border-brand-text overflow-hidden shadow-[4px_4px_0px_#050505]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="border-b-2 border-brand-text bg-brand-bg text-[9px] uppercase tracking-wider font-black text-brand-text">
                        <th className="p-3.5">OBJECT</th>
                        <th className="p-3.5">SKU / COLLECTION</th>
                        <th className="p-3.5">PRICE</th>
                        <th className="p-3.5">STOCK</th>
                        <th className="p-3.5">PUBLICATION</th>
                        <th className="p-3.5 text-right">CONTROLS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-brand-text/10 text-xs">
                      {filteredCatalogProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-brand-text/[0.03] transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <img 
                              src={prod.thumbnailImage || prod.images?.[0] || PRESET_IMAGES[0].url} 
                              alt={prod.name} 
                              className="w-12 h-12 object-cover border-2 border-brand-text shrink-0 bg-brand-bg"
                            />
                            <div>
                              <p className="font-mono font-black uppercase text-brand-text">{prod.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {prod.artifactClassification && (
                                  <span className="text-[8px] font-mono font-black px-1.5 py-0.2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent uppercase">
                                    {prod.artifactClassification}
                                    {prod.artifactType ? ` // ${prod.artifactType}` : ""}
                                  </span>
                                )}
                                {Array.isArray(prod.artifactTags) && prod.artifactTags.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="text-[8px] font-mono px-1 py-0.2 bg-brand-bg border border-brand-text/30 text-brand-text/70 uppercase">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-brand-text/60 truncate max-w-xs mt-0.5">{prod.description}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <p className="font-mono text-[11px] font-bold text-brand-text">{prod.sku}</p>
                            <p className="text-[9px] text-brand-accent uppercase font-bold tracking-tight">{prod.collectionName || (prod.categoryId === 'palestine' ? 'BE PALESTINE' : 'BE SYMBOLIC')}</p>
                          </td>
                          <td className="p-3.5 font-black text-brand-text">Rs. {prod.price?.toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${prod.inventory < 10 ? "border-amber-500 bg-amber-50 text-amber-900" : "border-brand-text/20 bg-brand-bg text-brand-text"}`}>
                              {prod.inventory} UNITS
                            </span>
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => handleToggleAvailability(prod.id, Boolean(prod.availability))}
                              className={`text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-1 border-2 border-brand-text shadow-[1px_1px_0px_#050505] transition-all ${
                                prod.availability 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-brand-bg text-brand-text/70"
                              }`}
                            >
                              {prod.availability ? "LIVE" : "DRAFT"}
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => startEditProduct(prod)}
                              className="px-2.5 py-1 bg-brand-text text-brand-bg text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[1px_1px_0px_#050505] hover:bg-neutral-800"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="px-2.5 py-1 bg-red-600 text-white text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[1px_1px_0px_#050505] hover:bg-red-700"
                            >
                              DELETE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCatalogProducts.map(prod => (
                  <div 
                    key={prod.id} 
                    className="border-2 border-brand-text bg-brand-surface p-4 flex flex-col justify-between space-y-4 shadow-[4px_4px_0px_#050505] hover:shadow-[6px_6px_0px_#050505] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square w-full bg-brand-bg overflow-hidden border-2 border-brand-text">
                        <img 
                          src={prod.thumbnailImage || prod.images?.[0] || PRESET_IMAGES[0].url} 
                          alt={prod.name} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-2 left-2">
                          <span className="text-[8px] font-mono font-black bg-brand-text text-brand-bg px-2 py-0.5 uppercase tracking-wider border border-brand-text">
                            {prod.collectionName || (prod.categoryId === 'palestine' ? 'BE PALESTINE' : 'BE SYMBOLIC')}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`text-[8px] font-mono font-black px-2 py-0.5 uppercase tracking-wider border border-brand-text ${prod.availability ? "bg-emerald-600 text-white" : "bg-neutral-800 text-white"}`}>
                            {prod.availability ? "LIVE" : "DRAFT"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-mono font-black text-brand-accent uppercase tracking-wider">{prod.collectionName || "BE SYMBOLIC"}</p>
                          {prod.artifactClassification && (
                            <span className="text-[8px] font-mono font-black px-1.5 py-0.2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent uppercase">
                              {prod.artifactClassification} {prod.artifactType ? `// ${prod.artifactType}` : ""}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-mono font-black uppercase tracking-tight text-brand-text line-clamp-1 mt-0.5">{prod.name}</h3>
                        <p className="text-sm font-mono font-black text-brand-text mt-1">Rs. {prod.price?.toLocaleString()}</p>
                        <p className="text-[10px] text-brand-text/60 uppercase tracking-wider mt-0.5">SKU: {prod.sku} • STOCK: {prod.inventory}</p>

                        {Array.isArray(prod.artifactTags) && prod.artifactTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {prod.artifactTags.map((t, idx) => (
                              <span key={idx} className="text-[8px] font-mono px-1.5 py-0.5 bg-brand-bg border border-brand-text/20 text-brand-text/70 uppercase">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-brand-text/70 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t-2 border-brand-text/15 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleAvailability(prod.id, Boolean(prod.availability))}
                        className={`text-[9px] font-mono font-black uppercase tracking-wider px-3 py-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] transition-all ${
                          prod.availability 
                            ? "bg-brand-bg text-brand-text hover:bg-brand-text hover:text-brand-bg" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {prod.availability ? "SET TO DRAFT" : "MAKE LIVE"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditProduct(prod)}
                          className="px-2.5 py-1.5 bg-brand-text text-brand-bg text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] hover:bg-neutral-800 transition-all flex items-center gap-1"
                          title="Edit Specimen"
                        >
                          <Edit3 size={11} />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 bg-red-600 text-white border-2 border-brand-text shadow-[2px_2px_0px_#050505] hover:bg-red-700 transition-all"
                          title="Delete Specimen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Upload Form + Live Preview Split Layout */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
            {editingProductId && (
              <div className="flex items-center justify-between p-3 bg-brand-surface border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-text">
                  EDITING SPECIMEN: <span className="text-brand-accent">{name || editingProductId}</span>
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider border-2 border-red-600 text-red-600 bg-brand-bg hover:bg-red-600 hover:text-white transition-all shadow-[1px_1px_0px_#050505]"
                >
                  CANCEL EDIT / NEW FORM
                </button>
              </div>
            )}

            {/* Main Form & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Column */}
              <form id="owner-product-form" onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
                
                {/* Prominent Publish Callout Banner */}
                <div className="bg-brand-surface border-2 border-brand-accent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_#050505]">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30">
                      STATUS: {availability ? "READY TO DEPLOY" : "DRAFT STAGED"}
                    </span>
                    <h4 className="text-base font-mono font-black uppercase tracking-tight text-brand-text">
                      {editingProductId ? `UPDATE "${name || "OBJECT"}"` : "DEPLOY SPECIMEN TO CATALOG"}
                    </h4>
                    <p className="text-xs text-brand-text/70">
                      Sync changes directly with Firestore database and customer storefront.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-brand-accent text-white px-6 py-3 text-xs font-mono font-black uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-2 border-2 border-brand-text shadow-[3px_3px_0px_#050505] disabled:opacity-50 shrink-0"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>SAVING...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{editingProductId ? "SAVE SPECIMEN" : "PUBLISH TO STORE"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1. Identity & Classification */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
                  <div className="border-b-2 border-brand-text pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">1</span>
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                        IDENTITY & CLASSIFICATION
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider">CORE METADATA</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                        SPECIMEN NAME *
                      </label>
                      <input 
                        type="text"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder="e.g. Seek Wisdom Heavyweight Tee"
                        required
                        className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          COLLECTION / ETHOS LINE *
                        </label>
                        <select
                          value={collectionName}
                          onChange={e => handleCollectionChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        >
                          <option value="Be Symbolic">Be Symbolic (Core Ethos)</option>
                          <option value="Be Palestine">Be Palestine (The Steadfast Line)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          SPECIMEN TYPE (CATEGORY) *
                        </label>
                        <select
                          value={categoryId}
                          onChange={e => setCategoryId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        >
                          <option value="wear">Wear (Heavyweight Tees, Fleece, Hoodies)</option>
                          <option value="carry">Carry (Utility Totes, Bags, Organizers)</option>
                          <option value="headwear">Headwear (Structured Twill Caps, Headwear)</option>
                          <option value="vessels">Vessels (Ceramic Mugs, Stoneware)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          SKU IDENTIFIER *
                        </label>
                        <input 
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="SYM-TSH-001"
                          required
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          BASE PRICE (RS.) *
                        </label>
                        <input 
                          type="number"
                          value={price}
                          onChange={e => setPrice(Number(e.target.value))}
                          min="0"
                          step="10"
                          required
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          INVENTORY UNITS *
                        </label>
                        <input 
                          type="number"
                          value={inventory}
                          onChange={e => setInventory(Number(e.target.value))}
                          min="0"
                          required
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>
                    </div>

                    {/* Publication Status */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-brand-bg border-2 border-brand-text">
                      <div>
                        <span className="text-xs font-mono font-black uppercase tracking-wider">PUBLICATION VISIBILITY</span>
                        <p className="text-[11px] text-brand-text/60 mt-0.5">
                          {availability ? "Item will immediately appear live in the customer storefront." : "Item will be archived as a draft (hidden from customers)."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvailability(!availability)}
                        className={`px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] transition-all ${
                          availability 
                            ? "bg-emerald-600 text-white" 
                            : "bg-brand-surface text-brand-text/70 hover:text-brand-text"
                        }`}
                      >
                        {availability ? "LIVE (STOREFRONT)" : "DRAFT (ARCHIVED)"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Owner-only Artifact Classification & Tag Architecture */}
                <ArtifactTaxonomySelector
                  selectedClassification={artifactClassification}
                  selectedType={artifactType}
                  selectedTags={artifactTags}
                  onClassificationChange={val => setArtifactClassification(val)}
                  onTypeChange={val => setArtifactType(val)}
                  onTagsChange={val => setArtifactTags(val)}
                  onOpenTaxonomyManager={() => setActiveTab("taxonomy")}
                />

                {/* 3. Editorial Philosophy */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
                  <div className="border-b-2 border-brand-text pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">3</span>
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                        EDITORIAL PHILOSOPHY &amp; STORY
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider">THE SOUL OF THE OBJECT</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                        SYMBOLIC TAGLINE / MICRO-MANIFESTO
                      </label>
                      <input 
                        type="text"
                        value={symbolicTagline}
                        onChange={e => setSymbolicTagline(e.target.value)}
                        placeholder="e.g. A symbol of reflective culture."
                        className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          EDITORIAL DESCRIPTION *
                        </label>
                        <span className="text-[10px] font-mono text-brand-text/50">{description.length} CHARACTERS</span>
                      </div>
                      <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe the intellectual, symbolic, and aesthetic context of this piece. Explain how it relates to reading, reflection, or knowledge..."
                        required
                        className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Theological & Moral Thesis (The 4 Pillars of Symbolic Meaning) */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-6">
                  <div className="border-b-2 border-brand-text pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">4</span>
                      <div>
                        <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                          THEOLOGICAL &amp; MORAL THESIS (4 PILLARS OF MEANING)
                        </h3>
                        <p className="text-[9px] text-brand-text/60 uppercase">
                          SCRIPTURAL ROOTS, PURPOSEFUL INTENT, PUBLIC WITNESS &amp; INWARD COVENANT
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-brand-accent bg-brand-accent/10 px-2 py-0.5 border border-brand-accent/30 uppercase tracking-wider">
                      DOSSIER SECTION 03 ENGINE
                    </span>
                  </div>

                  {/* Symbol Calligraphy / Inscription Identifier */}
                  <div className="p-4 bg-brand-bg border-2 border-brand-text space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                        PRIMARY SYMBOL / CALLIGRAPHIC INSCRIPTION
                      </label>
                      <span className="text-[9px] font-mono text-brand-text/60 uppercase">
                        APPEARS IN DOSSIER HEADER
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={inscription}
                        onChange={e => setInscription(e.target.value)}
                        placeholder="e.g. أَلِف  or  صُمُود  or  أَدَب"
                        className="flex-grow px-3.5 py-2.5 bg-brand-surface border-2 border-brand-text text-sm font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                    </div>

                    {/* Quick Preset Symbol Autofill Pills */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase text-brand-text/60">
                        <Sparkles size={11} className="text-brand-accent" />
                        <span>PRE-COMPOSED SYMBOL THESES (CLICK TO AUTOLOAD 4 PILLARS):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(PRESET_SYMBOL_KNOWLEDGE).map(([symKey, symData]) => (
                          <button
                            key={symKey}
                            type="button"
                            onClick={() => applySymbolPreset(symKey)}
                            className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase border border-brand-text transition-all ${
                              inscription === symKey 
                                ? "bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]" 
                                : "bg-brand-surface hover:bg-brand-text hover:text-brand-bg"
                            }`}
                            title={`Load 4 pillars for ${symData.name}`}
                          >
                            <span className="font-black text-brand-accent mr-1.5">{symKey}</span>
                            <span>{symData.name.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4 Pillars Interactive Editor Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Pillar 01: Doctrine */}
                    <div className="p-4 bg-brand-bg border-2 border-brand-text space-y-2">
                      <div className="flex items-center justify-between border-b border-brand-text/20 pb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          PILLAR 01 // DOCTRINE
                        </span>
                        <span className="text-[9px] font-mono text-brand-text/50 uppercase">
                          SCRIPTURAL ROOTS
                        </span>
                      </div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-tight text-brand-text">
                        WHAT THE SYMBOL REPRESENTS *
                      </label>
                      <textarea
                        value={pillar1Represents}
                        onChange={e => setPillar1Represents(e.target.value)}
                        rows={3}
                        placeholder="Detail the spiritual, scriptural, or philosophical roots of the symbol..."
                        className="w-full px-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Pillar 02: Intent */}
                    <div className="p-4 bg-brand-bg border-2 border-brand-text space-y-2">
                      <div className="flex items-center justify-between border-b border-brand-text/20 pb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          PILLAR 02 // INTENT
                        </span>
                        <span className="text-[9px] font-mono text-brand-text/50 uppercase">
                          DELIBERATE SELECTION
                        </span>
                      </div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-tight text-brand-text">
                        WHY IT WAS CHOSEN *
                      </label>
                      <textarea
                        value={pillar2WhyChosen}
                        onChange={e => setPillar2WhyChosen(e.target.value)}
                        rows={3}
                        placeholder="Explain why this exact symbol and motif was chosen for this specimen..."
                        className="w-full px-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Pillar 03: Transmission */}
                    <div className="p-4 bg-brand-bg border-2 border-brand-text space-y-2">
                      <div className="flex items-center justify-between border-b border-brand-text/20 pb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          PILLAR 03 // TRANSMISSION
                        </span>
                        <span className="text-[9px] font-mono text-brand-text/50 uppercase">
                          PUBLIC WITNESS
                        </span>
                      </div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-tight text-brand-text">
                        WHAT THE SPECIMEN COMMUNICATES *
                      </label>
                      <textarea
                        value={pillar3Communicates}
                        onChange={e => setPillar3Communicates(e.target.value)}
                        rows={3}
                        placeholder="Describe the message communicated outward to observers and society..."
                        className="w-full px-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Pillar 04: Covenant */}
                    <div className="p-4 bg-brand-bg border-2 border-brand-text space-y-2">
                      <div className="flex items-center justify-between border-b border-brand-text/20 pb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          PILLAR 04 // COVENANT
                        </span>
                        <span className="text-[9px] font-mono text-brand-text/50 uppercase">
                          INWARD BURDEN
                        </span>
                      </div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-tight text-brand-text">
                        WHAT IDEA THE WEARER IS CARRYING *
                      </label>
                      <textarea
                        value={pillar4WearerCarries}
                        onChange={e => setPillar4WearerCarries(e.target.value)}
                        rows={3}
                        placeholder="Detail the internal oath, spiritual weight, or moral discipline carried by the custodian..."
                        className="w-full px-3 py-2 bg-brand-surface border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors leading-relaxed"
                      />
                    </div>

                  </div>
                </div>

                {/* 5. Media & Photography */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
                  <div className="border-b-2 border-brand-text pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">5</span>
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                        PHOTOGRAPHY & VISUAL REGISTRY
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider">{images.length} IMAGES SELECTED</span>
                  </div>

                  <div className="space-y-5">
                    {/* Presets Selector */}
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-2">
                        QUICK SELECT SYMBOLIC PHOTOGRAPHY
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PRESET_IMAGES.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (!images.includes(img.url)) {
                                setImages(prev => [img.url, ...prev]);
                              } else {
                                handleSetPrimaryImage(images.indexOf(img.url));
                              }
                            }}
                            className={`group relative aspect-square border-2 overflow-hidden p-1 transition-all ${
                              images[0] === img.url 
                                ? "border-brand-text ring-2 ring-brand-text bg-brand-bg" 
                                : "border-brand-text/20 hover:border-brand-text"
                            }`}
                          >
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-brand-text/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-brand-bg text-[9px] font-mono font-black uppercase tracking-wider p-1 text-center">
                              {images[0] === img.url ? "PRIMARY COVER" : "SELECT PHOTO"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Local File Upload Box */}
                    <div className="p-6 border-2 border-dashed border-brand-text bg-brand-bg hover:border-brand-accent transition-colors text-center space-y-3">
                      <ImageIcon size={28} className="mx-auto text-brand-text/40" />
                      <div>
                        <p className="text-xs font-mono font-black uppercase tracking-wider">UPLOAD IMAGES FROM DEVICE</p>
                        <p className="text-[11px] text-brand-text/60 mt-0.5">
                          SUPPORTS PNG, JPG, WEBP • DRAG AND DROP OR SELECT
                        </p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload} 
                        multiple 
                        accept="image/*"
                        className="hidden" 
                        id="owner-file-upload"
                      />
                      <label 
                        htmlFor="owner-file-upload"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-text text-brand-bg text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer hover:bg-neutral-800 transition-all border-2 border-brand-text shadow-[2px_2px_0px_#050505]"
                      >
                        <Upload size={12} />
                        <span>CHOOSE FILES</span>
                      </label>
                    </div>

                    {/* External URL Input */}
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={customImageUrl}
                        onChange={e => setCustomImageUrl(e.target.value)}
                        placeholder="OR PASTE EXTERNAL IMAGE URL (HTTPS://...)"
                        className="flex-grow px-3.5 py-2 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-4 py-2 border-2 border-brand-text bg-brand-surface text-brand-text text-[10px] font-mono font-black uppercase tracking-wider hover:bg-brand-text hover:text-brand-bg transition-all shadow-[2px_2px_0px_#050505]"
                      >
                        ADD URL
                      </button>
                    </div>

                    {/* Attached Images List */}
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                          ATTACHED IMAGERY (FIRST IMAGE IS CARD COVER):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {images.map((imgUrl, i) => (
                            <div key={i} className="relative aspect-square border-2 border-brand-text bg-brand-bg group overflow-hidden">
                              <img src={imgUrl} alt={`Product view ${i + 1}`} className="w-full h-full object-cover" />
                              {i === 0 && (
                                <span className="absolute top-1 left-1 bg-brand-text text-brand-bg text-[8px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 border border-brand-text">
                                  PRIMARY
                                </span>
                              )}
                              {(thumbnailImage === imgUrl || (!thumbnailImage && i === 0)) && (
                                <span className="absolute top-1 right-1 bg-brand-accent text-white text-[8px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 border border-brand-text">
                                  THUMB
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity p-2 text-white">
                                {thumbnailImage !== imgUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setThumbnailImage(imgUrl)}
                                    className="text-[8px] font-mono font-black uppercase tracking-wider px-2 py-1 bg-brand-accent text-white border border-brand-text"
                                  >
                                    TAG THUMB
                                  </button>
                                )}
                                {i !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(i)}
                                    className="text-[8px] font-mono font-black uppercase tracking-wider px-2 py-1 bg-white text-brand-text border border-brand-text"
                                  >
                                    SET PRIMARY
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(i)}
                                  className="text-[8px] font-mono font-black uppercase tracking-wider px-2 py-1 bg-red-600 text-white border border-brand-text"
                                >
                                  REMOVE
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Materiality & Specifications */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
                  <div className="border-b-2 border-brand-text pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">6</span>
                      <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                        MATERIALITY & PHYSICAL SPECIFICATIONS
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider">TACTILE ATTRIBUTES</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          MATERIAL COMPOSITION
                        </label>
                        <input 
                          type="text"
                          value={material}
                          onChange={e => setMaterial(e.target.value)}
                          placeholder="e.g. 100% Organic Heavyweight Cotton"
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          COLORWAY / GLAZE FINISH
                        </label>
                        <input 
                          type="text"
                          value={color}
                          onChange={e => setColor(e.target.value)}
                          placeholder="e.g. Matte Charcoal / Washed Navy"
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          CAPACITY (DRINKWARE)
                        </label>
                        <input 
                          type="text"
                          value={capacity}
                          onChange={e => setCapacity(e.target.value)}
                          placeholder="330ml"
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          DIMENSIONS / FIT
                        </label>
                        <input 
                          type="text"
                          value={dimensions}
                          onChange={e => setDimensions(e.target.value)}
                          placeholder="9.5cm x 8.2cm"
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                          WEIGHT / GSM DENSITY
                        </label>
                        <input 
                          type="text"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          placeholder="320g / 240 GSM"
                          className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent mb-1.5">
                        CARE & MAINTENANCE INSTRUCTIONS
                      </label>
                      <input 
                        type="text"
                        value={careInstructions}
                        onChange={e => setCareInstructions(e.target.value)}
                        placeholder="e.g. Hand wash recommended to preserve matte glaze. Air dry."
                        className="w-full px-3.5 py-2.5 bg-brand-bg border-2 border-brand-text text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Scalable Variant Architecture & Matrix Manager */}
                <div className="border-2 border-brand-text bg-brand-surface p-5 sm:p-6 shadow-[4px_4px_0px_#050505] space-y-5">
                  <div className="border-b-2 border-brand-text pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-brand-text text-brand-bg text-[10px] font-mono font-black flex items-center justify-center">7</span>
                      <div>
                        <h3 className="text-xs font-mono font-black uppercase tracking-wider text-brand-text">
                          GARMENT TYPE, COLORWAY &amp; VARIANT PRICING SYSTEM
                        </h3>
                        <p className="text-[9px] text-brand-text/60 uppercase">
                          CONFIGURE SILHOUETTES, VISUAL PALETTES, SIZES &amp; INHERITED BASE RATES
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-brand-text/60 uppercase tracking-wider">
                        {hasVariants ? `${variants.length} PERMUTATIONS` : "SINGLE ITEM"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!hasVariants && variants.length === 0) {
                            const newVars = buildInitialVariants(garmentTypes, availableColors, availableSizes, sku, price);
                            setVariants(newVars);
                            setHasVariants(true);
                          } else {
                            setHasVariants(!hasVariants);
                          }
                        }}
                        className={`px-3.5 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text shadow-[2px_2px_0px_#050505] transition-all cursor-pointer ${
                          hasVariants ? "bg-brand-text text-brand-bg" : "bg-brand-bg text-brand-text/70 hover:text-brand-text"
                        }`}
                      >
                        {hasVariants ? "✓ VARIANTS ACTIVE" : "ENABLE VARIANT SYSTEM"}
                      </button>
                    </div>
                  </div>

                  {hasVariants && (
                    <VariantMatrixManager
                      productSku={sku}
                      defaultProductPrice={price}
                      garmentTypes={garmentTypes}
                      onChangeGarmentTypes={setGarmentTypes}
                      colors={availableColors}
                      onChangeColors={setAvailableColors}
                      sizes={availableSizes}
                      onChangeSizes={setAvailableSizes}
                      variants={variants}
                      onChangeVariants={setVariants}
                    />
                  )}
                </div>

                {/* Form Action Controls */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full sm:w-auto px-5 py-3 text-[10px] font-mono font-black uppercase tracking-wider border-2 border-brand-text bg-brand-surface text-brand-text/70 hover:bg-brand-text hover:text-brand-bg transition-all shadow-[2px_2px_0px_#050505]"
                    >
                      RESET FORM
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setActiveTab("catalog");
                        }}
                        className="w-full sm:w-auto px-5 py-3 text-[10px] font-mono font-black uppercase tracking-wider border-2 border-brand-text bg-brand-bg text-brand-text hover:bg-brand-text hover:text-brand-bg transition-all shadow-[2px_2px_0px_#050505]"
                      >
                        CANCEL EDIT
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-brand-accent text-white px-8 py-3 text-xs font-mono font-black uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-2 border-2 border-brand-text shadow-[4px_4px_0px_#050505] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>SYNCHRONIZING WITH CLOUD...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{editingProductId ? "UPDATE STORE SPECIMEN" : "DEPLOY TO STOREFRONT →"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Live Interactive Storefront Preview Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="sticky top-24 space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-brand-accent" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-accent">
                        STOREFRONT SIMULATOR
                      </span>
                    </div>

                    <div className="flex border-2 border-brand-text bg-brand-bg p-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("card")}
                        className={`px-3 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
                          previewMode === "card" ? "bg-brand-text text-brand-bg" : "text-brand-text/60 hover:text-brand-text"
                        }`}
                      >
                        CARD VIEW
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("detail")}
                        className={`px-3 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
                          previewMode === "detail" ? "bg-brand-text text-brand-bg" : "text-brand-text/60 hover:text-brand-text"
                        }`}
                      >
                        DETAIL VIEW
                      </button>
                    </div>
                  </div>

                  {previewMode === "card" ? (
                    /* Product Card Preview (Matches ProductCard.tsx) */
                    <div className="p-4 sm:p-5 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono font-black uppercase tracking-wider opacity-60">
                          // CUSTOMER GRID REPRESENTATION
                        </span>
                        <span className="text-[8px] font-mono font-bold uppercase text-brand-accent">
                          LIVE SIMULATION
                        </span>
                      </div>

                      {/* Card Shell */}
                      <div className="border-2 border-brand-text bg-brand-surface p-3.5 space-y-3 shadow-[6px_6px_0px_#050505]">
                        <div className="flex items-center justify-between text-[9px] font-mono font-black uppercase tracking-wider border-b-2 border-brand-text pb-2">
                          <span>ARCHIVE // {(collectionName || "BE SYMBOLIC").toUpperCase()}</span>
                          <span className="text-brand-accent">050 SPECIMENS</span>
                        </div>

                        <div className="relative aspect-square w-full bg-brand-bg overflow-hidden border-2 border-brand-text">
                          <img 
                            src={images[0] || PRESET_IMAGES[0].url} 
                            alt={name || "Product preview"}
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-2 left-2">
                            <span className="text-[8px] font-mono font-black bg-brand-text text-brand-bg px-2 py-0.5 uppercase tracking-wider border border-brand-text">
                              {(collectionName || "BE SYMBOLIC").toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <p className="text-[9px] font-mono font-black tracking-wider text-brand-accent uppercase">
                            {collectionName || "BE SYMBOLIC"}
                          </p>
                          <div className="flex justify-between items-baseline border-t-2 border-brand-text/15 pt-2">
                            <h4 className="text-base font-mono font-black uppercase tracking-tight text-brand-text line-clamp-1">
                              {name || "UNTITLED OBJECT"}
                            </h4>
                            <p className="text-xs font-mono font-black text-brand-text uppercase shrink-0 ml-2">
                              Rs. {(price || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex justify-between items-center opacity-60 text-[9px] font-mono uppercase tracking-wider pt-1 border-t border-brand-text/10">
                            <span>{sku || "SYM-PREVIEW"}</span>
                            <span>{collectionName.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Meta Breakdown */}
                      <div className="text-[10px] font-mono space-y-1 bg-brand-bg p-3 border-2 border-brand-text">
                        <div className="flex justify-between">
                          <span className="font-black uppercase">COLLECTION:</span>
                          <span className="text-brand-accent font-bold uppercase">{collectionName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-black uppercase">INVENTORY:</span>
                          <span>{inventory} UNITS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-black uppercase">STOREFRONT STATUS:</span>
                          <span className={availability ? "text-emerald-700 font-black" : "text-amber-700 font-black"}>
                            {availability ? "ACTIVE (LIVE)" : "DRAFT (HIDDEN)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Detail Modal Preview */
                    <div className="p-4 sm:p-5 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-4 max-h-[620px] overflow-y-auto">
                      <div className="flex items-center justify-between border-b-2 border-brand-text pb-2">
                        <span className="text-[8px] font-mono font-black uppercase tracking-wider opacity-60">
                          // CUSTOMER MODAL INSPECTOR
                        </span>
                        <span className="text-[8px] font-mono font-bold uppercase text-brand-accent">
                          INTERACTIVE SPEC
                        </span>
                      </div>

                      <div className="border-b-2 border-brand-text pb-3">
                        <p className="text-[9px] font-mono font-black text-brand-accent uppercase tracking-wider mb-1">
                          {(collectionName || "BE SYMBOLIC").toUpperCase()} // SPECIMEN
                        </p>
                        <h3 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight text-brand-text">
                          {name || "UNTITLED OBJECT"}
                        </h3>
                        <p className="text-lg font-mono font-black text-brand-text tracking-tight mt-1">
                          Rs. {(price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed font-mono">
                        <p className="text-brand-text/80">{description || "Editorial description will appear here."}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-brand-accent/5 p-2 border-l-2 border-brand-accent">
                          "{symbolicTagline || "A symbol of reflective culture."}"
                        </p>
                      </div>

                      {/* Live 4 Pillars Preview */}
                      {(pillar1Represents || pillar2WhyChosen || pillar3Communicates || pillar4WearerCarries || inscription) && (
                        <div className="space-y-2 pt-3 border-t-2 border-brand-text text-[10px] font-mono">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-brand-accent uppercase text-[9px] tracking-wider">
                              # THE SYMBOL {inscription ? `// ${inscription}` : ""}
                            </span>
                            <span className="text-[8px] font-mono text-brand-text/50 uppercase">4 PILLARS</span>
                          </div>
                          
                          <div className="space-y-1.5">
                            {pillar1Represents && (
                              <div className="p-2 bg-brand-bg border border-brand-text/20">
                                <span className="font-black text-brand-accent block text-[8px]">01 // DOCTRINE (REPRESENTS)</span>
                                <p className="text-brand-text/80 mt-0.5 line-clamp-2">{pillar1Represents}</p>
                              </div>
                            )}
                            {pillar2WhyChosen && (
                              <div className="p-2 bg-brand-bg border border-brand-text/20">
                                <span className="font-black text-brand-accent block text-[8px]">02 // INTENT (WHY CHOSEN)</span>
                                <p className="text-brand-text/80 mt-0.5 line-clamp-2">{pillar2WhyChosen}</p>
                              </div>
                            )}
                            {pillar3Communicates && (
                              <div className="p-2 bg-brand-bg border border-brand-text/20">
                                <span className="font-black text-brand-accent block text-[8px]">03 // TRANSMISSION (COMMUNICATES)</span>
                                <p className="text-brand-text/80 mt-0.5 line-clamp-2">{pillar3Communicates}</p>
                              </div>
                            )}
                            {pillar4WearerCarries && (
                              <div className="p-2 bg-brand-bg border border-brand-text/20">
                                <span className="font-black text-brand-accent block text-[8px]">04 // COVENANT (WEARER CARRIES)</span>
                                <p className="text-brand-text/80 mt-0.5 line-clamp-2">{pillar4WearerCarries}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Variants Preview */}
                      {hasVariants && variants.length > 0 && (
                        <div className="space-y-2 pt-3 border-t-2 border-brand-text">
                          <p className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-accent">
                            {variants[0].option1Name || "OPTIONS"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {variants.map((v, idx) => (
                              <span 
                                key={idx} 
                                className="px-3 py-1 text-[9px] font-mono font-black uppercase tracking-wider border-2 border-brand-text bg-brand-text text-brand-bg shadow-[1px_1px_0px_#050505]"
                              >
                                {v.option1Value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-brand-text text-[10px] font-mono">
                        <div>
                          <span className="font-black text-brand-accent uppercase block">MATERIAL</span>
                          <span className="text-brand-text">{material || "SPECIFIED UPON REQUEST"}</span>
                        </div>
                        <div>
                          <span className="font-black text-brand-accent uppercase block">COLOR / FINISH</span>
                          <span className="text-brand-text">{color || "STANDARD"}</span>
                        </div>
                        {capacity && (
                          <div>
                            <span className="font-black text-brand-accent uppercase block">CAPACITY</span>
                            <span className="text-brand-text">{capacity}</span>
                          </div>
                        )}
                        {dimensions && (
                          <div>
                            <span className="font-black text-brand-accent uppercase block">DIMENSIONS</span>
                            <span className="text-brand-text">{dimensions}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <div className="w-full bg-brand-text text-brand-bg py-3 text-[10px] font-mono font-black uppercase tracking-wider text-center border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                          ADD TO BAG (CUSTOMER VIEW)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom In-App Delete Confirmation Modal (Bypasses iframe blocked window.confirm) */}
      {productToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-brand-bg border-2 border-brand-text p-6 md:p-8 max-w-md w-full shadow-[8px_8px_0px_#050505] space-y-6 text-brand-text">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 border-2 border-brand-text shrink-0 shadow-[2px_2px_0px_#050505]">
                <Trash2 size={22} />
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-xl font-black uppercase tracking-tight">REMOVE SPECIMEN</h3>
                <p className="text-xs text-brand-text/80 leading-relaxed">
                  Are you certain you want to permanently remove <strong className="text-brand-text font-black">"{productToDelete.name}"</strong> from the store catalog?
                </p>
                <p className="text-[10px] text-red-600 font-black uppercase tracking-wider">// THIS ACTION PERMANENTLY PURGES THE ITEM FROM FIRESTORE</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-brand-text">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-mono font-black uppercase tracking-wider text-brand-text/70 hover:text-brand-text border-2 border-brand-text bg-brand-surface shadow-[2px_2px_0px_#050505] transition-all disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-mono font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all disabled:opacity-50 border-2 border-brand-text shadow-[3px_3px_0px_#050505]"
              >
                {isDeletingProduct ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>PURGING...</span>
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
