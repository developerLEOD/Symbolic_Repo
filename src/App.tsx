/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Product, CartItem, Category } from "./types";
import Header from "./components/Header";
import Hero from "./components/Hero";
import FeaturedObject from "./components/FeaturedObject";
import SystemSpec from "./components/SystemSpec";
import Philosophy from "./components/Philosophy";
import ProductGrid from "./components/ProductGrid";
import ProductDetail from "./components/ProductDetail";
import WhyMerchandise from "./components/WhyMerchandise";
import Cart from "./components/Cart";
import Footer from "./components/Footer";
import OwnerProductManager from "./components/OwnerProductManager";
import CheckoutModal from "./components/CheckoutModal";
import AuthModal from "./components/AuthModal";
import UserProfileModal from "./components/UserProfileModal";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { fetchCategories, deleteProductAndVariants } from "./lib/productService";

function StorefrontApp() {
  const { user, isOwner } = useAuth();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showWhyMerchandise, setShowWhyMerchandise] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnerOpen, setIsOwnerOpen] = useState(false);
  const [ownerEditProductId, setOwnerEditProductId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"signin" | "signup">("signin");
  const [refreshKey, setRefreshKey] = useState(0);
  const [flagshipProduct, setFlagshipProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([
    { id: "t-shirts", name: "T-Shirts", description: "Heavyweight 400 GSM organic cotton silhouettes", label: "WEAR", order: 1 },
    { id: "caps", name: "Caps", description: "Structured 280 GSM cotton twill headwear", label: "CARRY", order: 2 },
    { id: "mugs", name: "Mugs", description: "High-fire ceramic stoneware vessels", label: "GATHER", order: 3 }
  ]);

  useEffect(() => {
    const init = async () => {
      try {
        const loadedCats = await fetchCategories();
        if (loadedCats.length > 0) {
          setCategories(loadedCats);
        }

        const prodsSnapshot = await getDocs(collection(db, "products"));
        const prods = prodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        const flagship = prods.find(p => p.productId === "SYM-TSH-001") || prods[0] || null;
        setFlagshipProduct(flagship);
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const savedCart = localStorage.getItem("twl_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to load cart", e);
      }
    }
  }, [refreshKey]);

  useEffect(() => {
    localStorage.setItem("twl_cart", JSON.stringify(cart));
  }, [cart]);

  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCategoryChange = (id: string | null) => {
    if (id === "why-merchandise" || id === "manifesto") {
      setShowWhyMerchandise(true);
      setActiveCategoryId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setShowWhyMerchandise(false);
    setActiveCategoryId(id);
    setSelectedProduct(null);

    // Smooth scroll to catalog section if filtering
    setTimeout(() => {
      const el = document.getElementById("catalog-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleProductPublished = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditProductFromDetail = (productId: string) => {
    setSelectedProduct(null);
    setOwnerEditProductId(productId);
    setIsOwnerOpen(true);
  };

  const handleDeleteProductFromDetail = async (productId: string, productName: string) => {
    try {
      await deleteProductAndVariants(productId);
      setSelectedProduct(null);
      handleProductPublished();
    } catch (err) {
      console.error("Failed to remove product:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-brand-bg">
        <div className="w-12 h-12 mb-4 shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 border-brand-text shadow-[4px_4px_0px_#050505] animate-pulse">
          <img 
            src="/Logo_NoName.jpg" 
            alt="SYMBOLIC" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-1"
          />
        </div>
        <h1 className="text-sm font-mono font-black tracking-[0.4em] uppercase text-brand-text mb-2">
          SYMBOLIC <sub className="text-[9px] tracking-normal font-normal opacity-80">Muslims</sub>
        </h1>
        <p className="text-[10px] tracking-[0.4em] font-bold text-brand-accent uppercase">LOADING CATALOG</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg font-mono text-brand-text selection:bg-brand-text selection:text-white">
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onCategoryClick={handleCategoryChange}
        onOwnerClick={isOwner ? () => setIsOwnerOpen(true) : undefined}
        onAuthClick={() => {
          if (user) {
            setIsProfileOpen(true);
          } else {
            setAuthDefaultTab("signin");
            setIsAuthOpen(true);
          }
        }}
      />

      <main>
        {showWhyMerchandise ? (
          <WhyMerchandise onBack={() => handleCategoryChange(null)} />
        ) : (
          <>
            {!activeCategoryId && (
              <Hero 
                onExplore={() => {
                  const el = document.getElementById("catalog-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }} 
                onWhy={() => handleCategoryChange("why-merchandise")} 
              />
            )}
            
            <ProductGrid 
              activeCategoryId={activeCategoryId} 
              onCategoryChange={handleCategoryChange}
              onProductClick={setSelectedProduct} 
              refreshKey={refreshKey}
              onCategoriesLoaded={cats => { if (cats.length > 0) setCategories(cats); }}
            />

            {!activeCategoryId && (
              <>
                {flagshipProduct && (
                  <FeaturedObject 
                    product={flagshipProduct}
                    onViewProduct={setSelectedProduct}
                    onAddToCart={handleAddToCart}
                  />
                )}

                <SystemSpec />

                <Philosophy 
                  onReadManifesto={() => handleCategoryChange("why-merchandise")} 
                />
              </>
            )}
          </>
        )}
      </main>

      <Footer 
        onCategoryClick={handleCategoryChange}
        onOwnerClick={isOwner ? () => setIsOwnerOpen(true) : undefined} 
        onCartClick={() => setIsCartOpen(true)}
      />

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetail 
            product={selectedProduct}
            categoryLabel={activeCategoryId === 'mugs' ? 'GATHER' : activeCategoryId === 't-shirts' ? 'WEAR' : 'CARRY'}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
            onEditProduct={isOwner ? handleEditProductFromDetail : undefined}
            onDeleteProduct={isOwner ? handleDeleteProductFromDetail : undefined}
          />
        )}
      </AnimatePresence>

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemove={handleRemoveFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        onClearCart={() => setCart([])}
        onOpenAuth={() => {
          setAuthDefaultTab("signin");
          setIsAuthOpen(true);
        }}
      />

      {/* Auth Modal (Sign In / Register / Reset) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab={authDefaultTab}
      />

      {/* User Profile & Past Orders Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenOwnerManager={isOwner ? () => setIsOwnerOpen(true) : undefined}
      />

      {/* Owner Product Manager Studio */}
      {isOwnerOpen && isOwner && (
        <OwnerProductManager 
          onClose={() => {
            setIsOwnerOpen(false);
            setOwnerEditProductId(null);
          }}
          onProductPublished={handleProductPublished}
          categories={categories}
          initialEditProductId={ownerEditProductId}
          onViewProductInStore={(catId) => {
            setIsOwnerOpen(false);
            setOwnerEditProductId(null);
            handleCategoryChange(catId);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontApp />
    </AuthProvider>
  );
}

