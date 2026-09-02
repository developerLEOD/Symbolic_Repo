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
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { Product, ProductVariant, Category } from "../types";
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

// Pre-curated SYMBOLIC editorial asset images
const PRESET_IMAGES = [
  { name: "Be Symbolic Mug", url: "/src/assets/images/mug_be_symbolic_1788008321905.jpg", category: "mugs" },
  { name: "Seek Wisdom Mug", url: "/src/assets/images/mug_seek_wisdom_1788008333595.jpg", category: "mugs" },
  { name: "Find Clarity Mug", url: "/src/assets/images/mug_find_clarity_1788008345150.jpg", category: "mugs" },
  { name: "Editorial Apparel & Cap", url: "/src/assets/images/store_hero_editorial_1788008309317.jpg", category: "t-shirts" },
];

const TEMPLATES = {
  tshirt: {
    name: "Quiet Contemplation Heavyweight Tee",
    collectionName: "Be Symbolic",
    categoryId: "t-shirts",
    sku: "TWL-TSH-003",
    price: 2490,
    inventory: 60,
    availability: true,
    material: "100% Organic Ring-Spun Cotton (240 GSM)",
    color: "Washed Charcoal",
    dimensions: "Relaxed Boxy Fit",
    weight: "260g",
    careInstructions: "Machine wash cold inside out with similar colors. Line dry in shade. Do not iron directly on print.",
    symbolicTagline: "A silent affirmation of the reflective life.",
    description: "An understated garment tailored for the reader, the scholar, and the thinker. Cut from heavyweight combed organic cotton, it features subtle typographic coordinates celebrating the quiet discipline of contemplation.",
    images: ["/src/assets/images/store_hero_editorial_1788008309317.jpg"],
    variants: [
      { id: "v-s", sku: "TWL-TSH-003-S", option1Name: "Size", option1Value: "S", price: 2490, inventoryQuantity: 15 },
      { id: "v-m", sku: "TWL-TSH-003-M", option1Name: "Size", option1Value: "M", price: 2490, inventoryQuantity: 20 },
      { id: "v-l", sku: "TWL-TSH-003-L", option1Name: "Size", option1Value: "L", price: 2490, inventoryQuantity: 15 },
      { id: "v-xl", sku: "TWL-TSH-003-XL", option1Name: "Size", option1Value: "XL", price: 2490, inventoryQuantity: 10 }
    ]
  },
  mug: {
    name: "The Student of Adab Vessel",
    collectionName: "Seek Wisdom",
    categoryId: "mugs",
    sku: "TWL-MUG-004",
    price: 1590,
    inventory: 80,
    availability: true,
    material: "High-fired Artisan Ceramic",
    color: "Matte Desert Sand",
    capacity: "350ml",
    dimensions: "9.6cm Height x 8.4cm Diameter",
    weight: "340g",
    careInstructions: "Hand wash recommended to preserve the satin matte texture. Microwave safe.",
    symbolicTagline: "Carry what you seek. Drink with intention.",
    description: "Crafted to ground your daily reading ritual. Tactile matte finish on the exterior with an unglazed mineral rim, engineered for contemplative pauses between passages of profound texts.",
    images: ["/src/assets/images/mug_seek_wisdom_1788008333595.jpg"],
    variants: [
      { id: "v-standard", sku: "TWL-MUG-004-STD", option1Name: "Capacity", option1Value: "350ml", option2Name: "Finish", option2Value: "Matte", price: 1590, inventoryQuantity: 80 }
    ]
  },
  cap: {
    name: "Seeker Archival Structured Cap",
    collectionName: "The Seeker",
    categoryId: "caps",
    sku: "TWL-CAP-002",
    price: 1950,
    inventory: 40,
    availability: true,
    material: "100% Washed Cotton Chino Twill",
    color: "Midnight Navy",
    dimensions: "Adjustable Antique Brass Clasp (56-62cm)",
    weight: "110g",
    careInstructions: "Spot clean with mild soapy water. Reshape and air dry.",
    symbolicTagline: "Keep wisdom close, wherever your search leads.",
    description: "A minimalist 6-panel unstructured silhouette adorned with high-density tonal embroidery of the SYMBOLIC monogram. Unpretentious, durable, and understated.",
    images: ["/src/assets/images/store_hero_editorial_1788008309317.jpg"],
    variants: [
      { id: "v-navy", sku: "TWL-CAP-002-NVY", option1Name: "Color", option1Value: "Midnight Navy", price: 1950, inventoryQuantity: 25 },
      { id: "v-charcoal", sku: "TWL-CAP-002-CHR", option1Name: "Color", option1Value: "Charcoal Black", price: 1950, inventoryQuantity: 15 }
    ]
  }
};

export default function OwnerProductManager({ onClose, onProductPublished, categories, initialEditProductId }: OwnerProductManagerProps) {
  const { user, isOwner, signInWithEmail, signInWithGoogle, signOutUser, formatAuthError } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "catalog">("upload");
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "list">("grid");
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
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "t-shirts");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(1490);
  const [inventory, setInventory] = useState<number>(50);
  const [availability, setAvailability] = useState(true);
  
  // Editorial Philosophy
  const [symbolicTagline, setSymbolicTagline] = useState("A symbol of reflective culture.");
  const [description, setDescription] = useState("");
  
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

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

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

  // Auto-generate SKU when name or category changes if SKU is untouched or auto-formatted
  const generateSku = (prodName: string, catId: string) => {
    const catCode = catId === "t-shirts" ? "TSH" : catId === "mugs" ? "MUG" : catId === "caps" ? "CAP" : "TWL";
    const nameCode = prodName
      .trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 3) || "01";
    const rand = Math.floor(100 + Math.random() * 900);
    return `TWL-${catCode}-${nameCode || rand}`;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingProductId && (!sku || sku.startsWith("TWL-"))) {
      setSku(generateSku(val, categoryId));
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    if (newCatId === "mugs") {
      if (!capacity) setCapacity("330ml");
      if (!material || material.includes("Cotton")) setMaterial("Ceramic");
    } else if (newCatId === "t-shirts") {
      if (!material || material === "Ceramic") setMaterial("100% Organic Cotton");
    }
    if (!editingProductId && (!sku || sku.startsWith("TWL-"))) {
      setSku(generateSku(name, newCatId));
    }
  };

  // Image Upload handler via FileReader with compression
  const compressImage = (dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === "string") {
          try {
            const compressed = await compressImage(reader.result, 800, 0.75);
            setImages(prev => [...prev, compressed]);
          } catch {
            setImages(prev => [...prev, reader.result as string]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

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

  // Quick Template Applicator
  const applyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const tmpl = TEMPLATES[templateKey];
    setName(tmpl.name);
    setCollectionName(tmpl.collectionName);
    setCategoryId(tmpl.categoryId);
    setSku(tmpl.sku);
    setPrice(tmpl.price);
    setInventory(tmpl.inventory);
    setAvailability(tmpl.availability);
    setMaterial(tmpl.material);
    setColor(tmpl.color);
    setDimensions(tmpl.dimensions || "");
    setWeight(tmpl.weight || "");
    setCareInstructions(tmpl.careInstructions);
    setSymbolicTagline(tmpl.symbolicTagline);
    setDescription(tmpl.description);
    setImages(tmpl.images);

    if (tmpl.variants && tmpl.variants.length > 0) {
      setHasVariants(true);
      setVariants(tmpl.variants.map((v, idx) => ({
        id: `v-${idx + 1}-${Date.now()}`,
        productId: "",
        sku: v.sku,
        price: v.price,
        inventoryQuantity: v.inventoryQuantity,
        option1Name: v.option1Name,
        option1Value: v.option1Value,
        option2Name: (v as any).option2Name,
        option2Value: (v as any).option2Value
      })));
    } else {
      setHasVariants(false);
      setVariants([]);
    }

    showNotification("success", `Applied "${tmpl.name}" template.`);
  };

  // Quick Variant Generation
  const generateSizeVariants = () => {
    const sizes = ["S", "M", "L", "XL", "XXL"];
    const newVars: ProductVariant[] = sizes.map(sz => ({
      id: `v-${sz.toLowerCase()}-${Date.now()}`,
      productId: "",
      sku: `${sku || "TWL-PROD"}-${sz}`,
      price: price || 2490,
      inventoryQuantity: Math.floor((inventory || 50) / sizes.length),
      option1Name: "Size",
      option1Value: sz,
      option2Name: "Color",
      option2Value: color || "Charcoal"
    }));
    setVariants(newVars);
    setHasVariants(true);
  };

  const generateColorVariants = () => {
    const colors = ["Charcoal", "Bone White", "Olive Sand"];
    const newVars: ProductVariant[] = colors.map(c => ({
      id: `v-${c.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      productId: "",
      sku: `${sku || "TWL-PROD"}-${c.slice(0, 3).toUpperCase()}`,
      price: price || 1950,
      inventoryQuantity: Math.floor((inventory || 30) / colors.length),
      option1Name: "Color",
      option1Value: c
    }));
    setVariants(newVars);
    setHasVariants(true);
  };

  const addEmptyVariant = () => {
    const newVar: ProductVariant = {
      id: `v-custom-${Date.now()}`,
      productId: "",
      sku: `${sku || "TWL-PROD"}-VAR-${variants.length + 1}`,
      price: price || 1500,
      inventoryQuantity: 10,
      option1Name: categoryId === "t-shirts" ? "Size" : "Option",
      option1Value: "Standard"
    };
    setVariants(prev => [...prev, newVar]);
    setHasVariants(true);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    if (variants.length <= 1) {
      setHasVariants(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingProductId(null);
    setName("");
    setCollectionName("Be Symbolic");
    setCategoryId(categories[0]?.id || "t-shirts");
    setSku("");
    setPrice(1490);
    setInventory(50);
    setAvailability(true);
    setSymbolicTagline("A symbol of reflective culture.");
    setDescription("");
    setMaterial("100% Organic Cotton");
    setColor("Matte Charcoal");
    setCapacity("");
    setDimensions("");
    setWeight("");
    setCareInstructions("Hand wash recommended. Air dry.");
    setImages([PRESET_IMAGES[0].url]);
    setThumbnailImage("");
    setHasVariants(false);
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
    setSymbolicTagline(prod.symbolicTagline || "A symbol of reflective culture.");
    setDescription(prod.description);
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
      if (vars.length > 0) {
        setHasVariants(true);
        setVariants(vars);
      } else {
        setHasVariants(false);
        setVariants([]);
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
      
      const productPayload: Product = {
        id: prodId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        sku: sku.trim() || `TWL-${Date.now()}`,
        images,
        thumbnailImage: thumbnailImage || undefined,
        inventory: Number(inventory),
        availability: Boolean(availability),
        collectionName: collectionName.trim(),
        symbolicTagline: symbolicTagline.trim(),
        material: material.trim(),
        color: color.trim(),
        capacity: capacity.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        weight: weight.trim() || undefined,
        careInstructions: careInstructions.trim() || undefined
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

  return (
    <div className="fixed inset-0 z-[100] bg-brand-bg text-brand-text flex flex-col overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-20 border-b border-brand-text/10 bg-brand-bg/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-brand-text hover:text-brand-accent transition-colors"
          >
            <ArrowLeft size={16} /> Storefront
          </button>

          <div className="h-5 w-px bg-brand-text/15 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-tight uppercase text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded">
                Owner Access
              </span>
              <h1 className="text-sm font-bold tracking-tight uppercase">
                {editingProductId ? `Edit Object: ${name || "Untitled"}` : "Product Upload & Catalog Studio"}
              </h1>
            </div>
            <p className="text-[11px] text-brand-text/50 hidden md:block">
              Archival specifications, editorial philosophy & inventory for SYMBOLIC
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-3">
          <div className="flex bg-brand-text/5 p-1 rounded border border-brand-text/10">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded transition-all ${activeTab === "upload" ? "bg-brand-text text-white shadow-sm" : "text-brand-text/70 hover:text-brand-text"}`}
            >
              {editingProductId ? "Edit Form" : "+ Upload Object"}
            </button>
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded transition-all ${activeTab === "catalog" ? "bg-brand-text text-white shadow-sm" : "text-brand-text/70 hover:text-brand-text"}`}
            >
              Catalog ({existingProducts.length || categories.length * 3}+)
            </button>
          </div>

          {activeTab === "upload" && (
            <div className="flex items-center gap-2">
              {editingProductId && (
                <button
                  type="button"
                  onClick={() => {
                    const prod = existingProducts.find(p => p.id === editingProductId);
                    if (prod) handleDeleteProduct(prod.id, prod.name);
                  }}
                  className="bg-red-600 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-tight hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={13} /> Delete Product
                </button>
              )}
              <button
                type="submit"
                form="owner-product-form"
                disabled={isSubmitting}
                className="bg-brand-accent text-white px-5 py-2 text-[10px] font-bold uppercase tracking-tight hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check size={13} /> {editingProductId ? "Update Product" : "Publish to Store"}
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="bg-brand-text text-white px-5 py-2 text-[10px] font-bold uppercase tracking-tight hover:bg-neutral-800 transition-colors hidden sm:flex items-center gap-2"
          >
            <ExternalLink size={13} /> View Live Store
          </button>
        </div>
      </header>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-24 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded shadow-xl flex items-center gap-3 text-xs font-bold uppercase tracking-tight ${notification.type === "success" ? "bg-brand-text text-white" : "bg-red-600 text-white"}`}
          >
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto">
        {activeTab === "catalog" ? (
          /* Catalog View */
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-brand-text/10 pb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-tight text-brand-accent">Live Database</span>
                <h2 className="text-3xl font-mono font-black uppercase tracking-tight text-brand-text">Merchandise Catalog</h2>
                <p className="text-xs text-brand-text/60 mt-1">
                  Manage availability, stock, and specifications for all objects in the store.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-brand-text/5 p-1 rounded border border-brand-text/10">
                  <button
                    onClick={() => setCatalogViewMode("grid")}
                    className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight rounded transition-all ${catalogViewMode === "grid" ? "bg-brand-text text-white shadow-sm" : "text-brand-text/70 hover:text-brand-text"}`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setCatalogViewMode("list")}
                    className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight rounded transition-all ${catalogViewMode === "list" ? "bg-brand-text text-white shadow-sm" : "text-brand-text/70 hover:text-brand-text"}`}
                  >
                    List View (All Active)
                  </button>
                </div>
                <button
                  onClick={loadExistingProducts}
                  className="flex items-center gap-2 px-4 py-2 border border-brand-text/15 text-[10px] font-bold uppercase tracking-tight hover:border-brand-text transition-colors"
                >
                  <RefreshCw size={12} className={loadingProducts ? "animate-spin" : ""} /> Refresh
                </button>
                <button
                  onClick={() => { resetForm(); setActiveTab("upload"); }}
                  className="flex items-center gap-2 bg-brand-text text-white px-5 py-2 text-[10px] font-bold uppercase tracking-tight hover:bg-neutral-800 transition-colors"
                >
                  <Plus size={14} /> New Object
                </button>
              </div>
            </div>

            {loadingProducts ? (
              <div className="py-24 flex justify-center">
                <div className="w-8 h-8 border border-brand-text/20 border-t-brand-text rounded-full animate-spin" />
              </div>
            ) : existingProducts.length === 0 ? (
              <div className="p-16 border border-dashed border-brand-text/20 text-center space-y-4">
                <Package size={36} className="mx-auto text-brand-text/30" />
                <p className="text-base font-mono font-bold uppercase text-brand-text opacity-70">[ No custom products found in database yet ]</p>
                <p className="text-xs text-brand-text/60">Products published from the studio will appear here.</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="bg-brand-text text-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-tight"
                >
                  Upload First Product
                </button>
              </div>
            ) : catalogViewMode === "list" ? (
              <div className="bg-brand-surface border border-brand-text/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-text/10 bg-brand-text/5 text-[9px] uppercase tracking-wider font-bold text-brand-text/70">
                        <th className="p-4">Object</th>
                        <th className="p-4">SKU / Collection</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Inventory</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-text/10 text-xs">
                      {existingProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-brand-text/[0.02] transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <img 
                              src={prod.thumbnailImage || prod.images?.[0] || PRESET_IMAGES[0].url} 
                              alt={prod.name} 
                              className="w-10 h-10 object-cover border border-brand-text/10 flex-shrink-0"
                            />
                            <div>
                              <p className="font-mono font-bold uppercase text-brand-text">{prod.name}</p>
                              <p className="text-[10px] text-brand-text/50 truncate max-w-xs">{prod.description}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-[10px]">{prod.sku}</p>
                            <p className="text-[9px] text-brand-accent uppercase tracking-tight">{prod.collectionName || "Be Symbolic"}</p>
                          </td>
                          <td className="p-4 uppercase text-[10px] font-bold">{prod.categoryId}</td>
                          <td className="p-4 font-bold">Rs. {prod.price?.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold ${prod.inventory < 10 ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-800"}`}>
                              {prod.inventory} units
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleAvailability(prod.id, Boolean(prod.availability))}
                              className={`text-[9px] font-bold uppercase tracking-tight px-2.5 py-1 rounded transition-colors ${prod.availability ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}
                            >
                              {prod.availability ? "Live" : "Draft"}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => startEditProduct(prod)}
                              className="px-2.5 py-1 bg-brand-text text-white text-[9px] font-bold uppercase tracking-tight hover:bg-neutral-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="px-2.5 py-1 bg-red-600 text-white text-[9px] font-bold uppercase tracking-tight hover:opacity-90"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {existingProducts.map(prod => (
                  <div 
                    key={prod.id} 
                    className="border border-brand-text/10 bg-brand-surface p-5 flex flex-col justify-between space-y-4 transition-all hover:border-brand-text/30"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square w-full bg-brand-bg overflow-hidden border border-brand-text/5">
                        <img 
                          src={prod.thumbnailImage || prod.images?.[0] || PRESET_IMAGES[0].url} 
                          alt={prod.name} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-2 left-2">
                          <span className="text-[8px] font-bold bg-brand-text text-white px-2 py-0.5 uppercase tracking-tight">
                            {prod.categoryId}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`text-[8px] font-bold px-2 py-0.5 uppercase tracking-tight ${prod.availability ? "bg-emerald-800 text-white" : "bg-neutral-600 text-white"}`}>
                            {prod.availability ? "Active" : "Draft"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-brand-accent uppercase tracking-tight">{prod.collectionName || "BE SYMBOLIC"}</p>
                        <h3 className="text-base font-mono font-black uppercase tracking-tight text-brand-text line-clamp-1">{prod.name}</h3>
                        <p className="text-xs font-bold text-brand-text mt-1">Rs. {prod.price?.toLocaleString()}</p>
                        <p className="text-[10px] text-brand-text/50 uppercase tracking-tight mt-0.5">SKU: {prod.sku} • Stock: {prod.inventory}</p>
                      </div>

                      <p className="text-xs text-brand-text/70 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-brand-text/10 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleAvailability(prod.id, Boolean(prod.availability))}
                        className={`text-[9px] font-bold uppercase tracking-tight px-3 py-1 border transition-colors ${prod.availability ? "border-brand-text/20 text-brand-text hover:border-brand-text" : "border-emerald-700 text-emerald-800 bg-emerald-50"}`}
                      >
                        {prod.availability ? "Set to Draft" : "Make Live"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditProduct(prod)}
                          className="p-1.5 text-brand-text/60 hover:text-brand-text border border-brand-text/10 hover:border-brand-text rounded transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-red-600/70 hover:text-red-700 border border-red-200 hover:border-red-400 rounded transition-colors"
                          title="Delete Product"
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
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
            {/* Quick Templates Bar */}
            <div className="mb-10 p-5 bg-brand-surface border border-brand-text/10 rounded-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-brand-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-brand-accent">Quick Editorial Templates</span>
                  </div>
                  <p className="text-xs text-brand-text/70">
                    Instantly load authentic specifications, philosophy copy, and size variations:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate("tshirt")}
                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight border border-brand-text/20 hover:border-brand-text hover:bg-brand-text hover:text-white transition-all"
                  >
                    + T-Shirt Template
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("mug")}
                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight border border-brand-text/20 hover:border-brand-text hover:bg-brand-text hover:text-white transition-all"
                  >
                    + Ceramic Mug Template
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("cap")}
                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight border border-brand-text/20 hover:border-brand-text hover:bg-brand-text hover:text-white transition-all"
                  >
                    + Archival Cap Template
                  </button>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight border border-red-300 text-red-600 hover:bg-red-50 transition-all"
                    >
                      Clear / New Form
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Form & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Form Column */}
              <form id="owner-product-form" onSubmit={handleSubmit} className="lg:col-span-7 space-y-12">
                
                {/* Prominent Publish Callout Banner */}
                <div className="bg-brand-surface border-2 border-brand-accent p-6 flex items-center justify-between shadow-sm rounded-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-tight text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded">Ready to Release?</span>
                    <h4 className="text-base font-mono font-black uppercase tracking-tight text-brand-text">Publish Object to Live Storefront</h4>
                    <p className="text-xs text-brand-text/60">Instantly deploy this product to the customer catalog with all specifications.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-brand-text text-white px-8 py-3.5 text-xs font-bold uppercase tracking-tight hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 shrink-0"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> {editingProductId ? "Update Product" : "Publish Product Now"}
                      </>
                    )}
                  </button>
                </div>

                {/* 1. Identity & Classification */}
                <div className="space-y-6 border-b border-brand-text/10 pb-10">
                  <div className="border-b border-brand-text/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-text text-white text-[10px] font-bold flex items-center justify-center">1</span>
                      <h3 className="text-xs font-bold uppercase tracking-tight text-brand-text">Identity & Classification</h3>
                    </div>
                    <span className="text-[9px] text-brand-text/50 uppercase tracking-tight">Core Metadata</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                        Product Name *
                      </label>
                      <input 
                        type="text"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder="e.g. Seek Wisdom Minimalist Tee"
                        required
                        className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Collection / Ethos Line
                        </label>
                        <select
                          value={collectionName}
                          onChange={e => setCollectionName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        >
                          <option value="Be Symbolic">Be Symbolic (Core Ethos)</option>
                          <option value="Seek Wisdom">Seek Wisdom (The Reader)</option>
                          <option value="Find Clarity">Find Clarity (The Thinker)</option>
                          <option value="The Seeker">The Seeker (Archival)</option>
                          <option value="Adab & Reflection">Adab & Reflection</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Category *
                        </label>
                        <select
                          value={categoryId}
                          onChange={e => handleCategoryChange(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} ({cat.label})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          SKU *
                        </label>
                        <input 
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="TWL-TSH-001"
                          required
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm font-mono focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Base Price (Rs.) *
                        </label>
                        <input 
                          type="number"
                          value={price}
                          onChange={e => setPrice(Number(e.target.value))}
                          min="0"
                          step="10"
                          required
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Inventory Count *
                        </label>
                        <input 
                          type="number"
                          value={inventory}
                          onChange={e => setInventory(Number(e.target.value))}
                          min="0"
                          required
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Stock Status */}
                    <div className="pt-2 flex items-center justify-between p-4 bg-brand-surface border border-brand-text/10">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-tight">Publication Status</span>
                        <p className="text-[11px] text-brand-text/60">
                          {availability ? "Product will be immediately available for customers to order." : "Product will be stored as draft (hidden from public storefront)."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvailability(!availability)}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-tight transition-colors ${availability ? "bg-brand-text text-white" : "border border-brand-text/20 text-brand-text/60"}`}
                      >
                        {availability ? "Active (Live)" : "Draft (Hidden)"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Editorial Philosophy */}
                <div className="space-y-6 border-b border-brand-text/10 pb-10">
                  <div className="border-b border-brand-text/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-text text-white text-[10px] font-bold flex items-center justify-center">2</span>
                      <h3 className="text-xs font-bold uppercase tracking-tight text-brand-text">Editorial Philosophy & Story</h3>
                    </div>
                    <span className="text-[9px] text-brand-text/50 uppercase tracking-tight">The Soul of the Object</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                        Symbolic Tagline / Micro-Manifesto
                      </label>
                      <input 
                        type="text"
                        value={symbolicTagline}
                        onChange={e => setSymbolicTagline(e.target.value)}
                        placeholder="e.g. A symbol of reflective culture."
                        className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent">
                          Editorial Description *
                        </label>
                        <span className="text-[10px] text-brand-text/40">{description.length} characters</span>
                      </div>
                      <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe the intellectual, symbolic, and aesthetic context of this piece. Explain how it relates to reading, reflection, or knowledge..."
                        required
                        className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Media & Photography */}
                <div className="space-y-6 border-b border-brand-text/10 pb-10">
                  <div className="border-b border-brand-text/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-text text-white text-[10px] font-bold flex items-center justify-center">3</span>
                      <h3 className="text-xs font-bold uppercase tracking-tight text-brand-text">Product Photography & Visuals</h3>
                    </div>
                    <span className="text-[9px] text-brand-text/50 uppercase tracking-tight">{images.length} Image(s) Selected</span>
                  </div>

                  <div className="space-y-5">
                    {/* Presets Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                        Quick Select SYMBOLIC Photography
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
                            className={`group relative aspect-square border overflow-hidden p-1 transition-all ${images[0] === img.url ? "border-brand-text ring-1 ring-brand-text" : "border-brand-text/15 hover:border-brand-text/50"}`}
                          >
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-brand-text/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold uppercase tracking-tight p-1 text-center">
                              {images[0] === img.url ? "Primary Cover" : "Select Photo"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Local File Upload Box */}
                    <div className="p-6 border-2 border-dashed border-brand-text/20 hover:border-brand-text/50 transition-colors text-center space-y-3 bg-white">
                      <ImageIcon size={28} className="mx-auto text-brand-text/40" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight">Upload Images from Computer</p>
                        <p className="text-[11px] text-brand-text/50 mt-0.5">
                          Supports PNG, JPG, WEBP. Files are loaded instantaneously into the store.
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-text text-white text-[10px] font-bold uppercase tracking-tight cursor-pointer hover:bg-neutral-800 transition-colors"
                      >
                        <Upload size={12} /> Choose Image Files
                      </label>
                    </div>

                    {/* Or URL input */}
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={customImageUrl}
                        onChange={e => setCustomImageUrl(e.target.value)}
                        placeholder="Or paste external image URL (https://...)"
                        className="flex-grow px-4 py-2.5 bg-white border border-brand-text/15 text-xs focus:border-brand-text focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-4 py-2.5 border border-brand-text text-brand-text text-[10px] font-bold uppercase tracking-tight hover:bg-brand-text hover:text-white transition-colors"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Selected Images List */}
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-brand-accent">
                          Attached Imagery (First image is primary card cover):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {images.map((imgUrl, i) => (
                            <div key={i} className="relative aspect-square border border-brand-text/15 bg-neutral-100 group overflow-hidden">
                              <img src={imgUrl} alt={`Product view ${i + 1}`} className="w-full h-full object-cover" />
                              {i === 0 && (
                                <span className="absolute top-1 left-1 bg-brand-text text-white text-[8px] font-bold uppercase tracking-tight px-1.5 py-0.5">
                                  Primary
                                </span>
                              )}
                              {(thumbnailImage === imgUrl || (!thumbnailImage && i === 0)) && (
                                <span className="absolute top-1 right-1 bg-brand-accent text-white text-[8px] font-bold uppercase tracking-tight px-1.5 py-0.5">
                                  Thumbnail
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity p-2 text-white">
                                {thumbnailImage !== imgUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setThumbnailImage(imgUrl)}
                                    className="text-[8px] font-bold uppercase tracking-tight px-2 py-1 bg-brand-accent text-white"
                                  >
                                    Tag Thumbnail
                                  </button>
                                )}
                                {i !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(i)}
                                    className="text-[8px] font-bold uppercase tracking-tight px-2 py-1 bg-white text-brand-text"
                                  >
                                    Set Primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(i)}
                                  className="text-[8px] font-bold uppercase tracking-tight px-2 py-1 bg-red-600 text-white"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Materiality & Physical Specifications */}
                <div className="space-y-6 border-b border-brand-text/10 pb-10">
                  <div className="border-b border-brand-text/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-text text-white text-[10px] font-bold flex items-center justify-center">4</span>
                      <h3 className="text-xs font-bold uppercase tracking-tight text-brand-text">Materiality & Physical Attributes</h3>
                    </div>
                    <span className="text-[9px] text-brand-text/50 uppercase tracking-tight">Tactile Specifications</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Material Composition
                        </label>
                        <input 
                          type="text"
                          value={material}
                          onChange={e => setMaterial(e.target.value)}
                          placeholder="e.g. 100% Organic Heavyweight Cotton"
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Colorway / Glaze Finish
                        </label>
                        <input 
                          type="text"
                          value={color}
                          onChange={e => setColor(e.target.value)}
                          placeholder="e.g. Matte Charcoal / Washed Navy"
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Capacity (Drinkware)
                        </label>
                        <input 
                          type="text"
                          value={capacity}
                          onChange={e => setCapacity(e.target.value)}
                          placeholder="330ml"
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Dimensions / Fit
                        </label>
                        <input 
                          type="text"
                          value={dimensions}
                          onChange={e => setDimensions(e.target.value)}
                          placeholder="9.5cm x 8.2cm"
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                          Weight / Density
                        </label>
                        <input 
                          type="text"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          placeholder="320g / 240 GSM"
                          className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-tight text-brand-accent mb-2">
                        Care Instructions
                      </label>
                      <input 
                        type="text"
                        value={careInstructions}
                        onChange={e => setCareInstructions(e.target.value)}
                        placeholder="e.g. Hand wash recommended to preserve matte glaze. Microwave safe."
                        className="w-full px-4 py-3 bg-white border border-brand-text/15 text-sm focus:border-brand-text focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Variant Architecture */}
                <div className="space-y-6 border-b border-brand-text/10 pb-10">
                  <div className="border-b border-brand-text/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-text text-white text-[10px] font-bold flex items-center justify-center">5</span>
                      <h3 className="text-xs font-bold uppercase tracking-tight text-brand-text">Variants (Sizes, Colors, Options)</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-brand-text/50 uppercase tracking-tight">
                        {hasVariants ? `${variants.length} Variants Active` : "No Variants (Single Item)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!hasVariants && variants.length === 0) {
                            generateSizeVariants();
                          } else {
                            setHasVariants(!hasVariants);
                          }
                        }}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-tight border transition-colors ${hasVariants ? "bg-brand-text text-white border-brand-text" : "border-brand-text/20 text-brand-text/70"}`}
                      >
                        {hasVariants ? "Enabled" : "Enable Variants"}
                      </button>
                    </div>
                  </div>

                  {hasVariants && (
                    <div className="space-y-5 bg-brand-surface p-5 border border-brand-text/10">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-text/10 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-tight text-brand-accent">Quick Generators:</span>
                          <button
                            type="button"
                            onClick={generateSizeVariants}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-tight bg-white border border-brand-text/15 hover:border-brand-text"
                          >
                            + Sizes (S-XXL)
                          </button>
                          <button
                            type="button"
                            onClick={generateColorVariants}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-tight bg-white border border-brand-text/15 hover:border-brand-text"
                          >
                            + 3 Colorways
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={addEmptyVariant}
                          className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-tight bg-brand-text text-white hover:bg-neutral-800"
                        >
                          <Plus size={11} /> Add Variant Row
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-brand-text/15 text-[9px] font-bold uppercase tracking-tight text-brand-text/60">
                              <th className="pb-2">Option Name</th>
                              <th className="pb-2">Value</th>
                              <th className="pb-2">SKU</th>
                              <th className="pb-2">Price (Rs.)</th>
                              <th className="pb-2">Stock</th>
                              <th className="pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-text/5">
                            {variants.map((v, idx) => (
                              <tr key={v.id || idx}>
                                <td className="py-2 pr-2">
                                  <input 
                                    type="text" 
                                    value={v.option1Name || "Size"}
                                    onChange={e => updateVariant(idx, "option1Name", e.target.value)}
                                    placeholder="Size"
                                    className="w-24 px-2 py-1 bg-white border border-brand-text/15 text-xs"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <input 
                                    type="text" 
                                    value={v.option1Value || ""}
                                    onChange={e => updateVariant(idx, "option1Value", e.target.value)}
                                    placeholder="M"
                                    className="w-20 px-2 py-1 bg-white border border-brand-text/15 text-xs font-bold"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <input 
                                    type="text" 
                                    value={v.sku}
                                    onChange={e => updateVariant(idx, "sku", e.target.value)}
                                    placeholder="SKU"
                                    className="w-32 px-2 py-1 bg-white border border-brand-text/15 text-xs font-mono"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <input 
                                    type="number" 
                                    value={v.price}
                                    onChange={e => updateVariant(idx, "price", Number(e.target.value))}
                                    className="w-24 px-2 py-1 bg-white border border-brand-text/15 text-xs"
                                  />
                                </td>
                                <td className="py-2 pr-2">
                                  <input 
                                    type="number" 
                                    value={v.inventoryQuantity}
                                    onChange={e => updateVariant(idx, "inventoryQuantity", Number(e.target.value))}
                                    className="w-16 px-2 py-1 bg-white border border-brand-text/15 text-xs"
                                  />
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeVariant(idx)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remove variant"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Action Controls */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 py-4 text-[10px] font-bold uppercase tracking-tight border border-brand-text/20 text-brand-text/70 hover:border-brand-text hover:text-brand-text transition-colors"
                  >
                    Reset Form
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto flex-grow bg-brand-text text-white px-10 py-4 text-[10px] font-bold uppercase tracking-tight hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Saving to Cloud...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> {editingProductId ? "Update Store Object" : "Publish Object to Store"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Live Interactive Storefront Preview Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="sticky top-28 space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-text/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-brand-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-brand-accent">
                        Live Storefront Preview
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-brand-text/5 p-0.5 rounded border border-brand-text/10">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("card")}
                        className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-tight rounded ${previewMode === "card" ? "bg-brand-text text-white" : "text-brand-text/60"}`}
                      >
                        Card View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("detail")}
                        className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-tight rounded ${previewMode === "detail" ? "bg-brand-text text-white" : "text-brand-text/60"}`}
                      >
                        Detail View
                      </button>
                    </div>
                  </div>

                  {previewMode === "card" ? (
                    /* Product Card Preview */
                    <div className="p-6 bg-brand-surface border border-brand-text/15 space-y-4">
                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-40 block">
                        Customer Grid Representation
                      </span>

                      <div className="bg-brand-bg border border-brand-text/10 p-2 space-y-3">
                        <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                          <img 
                            src={images[0] || PRESET_IMAGES[0].url} 
                            alt={name || "Product preview"}
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[8px] tracking-tight font-bold bg-brand-text px-2 py-1 text-white uppercase">
                              {selectedCategoryObj?.label || "OBJECT"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 px-2 pb-2">
                          <p className="text-[9px] font-bold tracking-tight text-brand-accent uppercase">
                            {collectionName || "BE SYMBOLIC"}
                          </p>
                          <div className="flex justify-between items-baseline border-t border-brand-text/10 pt-2.5">
                            <h4 className="text-base font-medium text-brand-text">
                              {name || "Untitled Object"}
                            </h4>
                            <p className="text-xs font-bold text-brand-text opacity-60 uppercase tracking-tight">
                              Rs. {(price || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex justify-between items-center opacity-40 text-[9px] uppercase tracking-tight">
                            <span>{sku || "TWL-PREVIEW"}</span>
                            <span>Be Symbolic</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-brand-text/60 space-y-1 bg-white p-3 border border-brand-text/10">
                        <div className="flex justify-between">
                          <span className="font-bold uppercase tracking-tight">Category:</span>
                          <span>{selectedCategoryObj?.name || categoryId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold uppercase tracking-tight">Stock:</span>
                          <span>{inventory} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold uppercase tracking-tight">Status:</span>
                          <span className={availability ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                            {availability ? "Live on Store" : "Draft (Hidden)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Detail Modal Preview */
                    <div className="p-6 bg-brand-surface border border-brand-text/15 space-y-5 max-h-[600px] overflow-y-auto">
                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-40 block">
                        Customer Modal / Page Preview
                      </span>

                      <div className="border-b border-brand-text/10 pb-4">
                        <p className="text-[9px] tracking-tight font-bold text-brand-accent uppercase mb-2">
                          {selectedCategoryObj?.label || "OBJECT"} / {collectionName || "BE SYMBOLIC"}
                        </p>
                        <h3 className="text-2xl font-mono font-black uppercase tracking-tight text-brand-text">
                          {name || "Untitled Object"}
                        </h3>
                        <p className="text-lg font-mono font-bold text-brand-text opacity-70 tracking-tight mt-1">
                          Rs. {(price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-4 text-xs leading-relaxed text-brand-text/80">
                        <p>{description || "Editorial description will appear here."}</p>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-tight text-brand-accent">
                          "{symbolicTagline || "A symbol of reflective culture."}"
                        </p>
                      </div>

                      {/* Variants Preview */}
                      {hasVariants && variants.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-brand-text/10">
                          <p className="text-[9px] font-bold uppercase tracking-tight text-brand-accent">
                            {variants[0].option1Name || "Options"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {variants.map((v, idx) => (
                              <span 
                                key={idx} 
                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-tight border border-brand-text bg-brand-text text-white"
                              >
                                {v.option1Value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-brand-text/10 text-[10px]">
                        <div>
                          <span className="font-bold text-brand-accent uppercase tracking-tight block">Material</span>
                          <span className="font-medium text-brand-text">{material || "Specified upon request"}</span>
                        </div>
                        <div>
                          <span className="font-bold text-brand-accent uppercase tracking-tight block">Color / Finish</span>
                          <span className="font-medium text-brand-text">{color || "Standard"}</span>
                        </div>
                        {capacity && (
                          <div>
                            <span className="font-bold text-brand-accent uppercase tracking-tight block">Capacity</span>
                            <span className="font-medium text-brand-text">{capacity}</span>
                          </div>
                        )}
                        {dimensions && (
                          <div>
                            <span className="font-bold text-brand-accent uppercase tracking-tight block">Dimensions</span>
                            <span className="font-medium text-brand-text">{dimensions}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <div className="w-full bg-brand-text text-white py-3 text-[10px] font-bold uppercase tracking-tight text-center">
                          Add to Bag (Customer View)
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
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-text/20 p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 text-brand-text">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-mono text-xl font-black uppercase tracking-tight">Remove Product</h3>
                <p className="text-sm text-brand-text/80 leading-relaxed">
                  Are you certain you want to permanently remove <strong className="text-brand-text font-bold">"{productToDelete.name}"</strong> from the store catalog?
                </p>
                <p className="text-xs text-red-600 font-medium">This will delete the item and its variants from Firestore.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-text/10">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-tight text-brand-text/70 hover:text-brand-text border border-brand-text/20 hover:border-brand-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold uppercase tracking-tight bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all disabled:opacity-50 shadow-md"
              >
                {isDeletingProduct ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Yes, Remove Product
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
