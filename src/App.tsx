/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import About from "./components/About";
import Cart from "./components/Cart";
import Footer from "./components/Footer";
import OwnerProductManager from "./components/OwnerProductManager";
import CheckoutModal from "./components/CheckoutModal";
import AuthModal from "./components/AuthModal";
import UserProfileModal from "./components/UserProfileModal";
import LoadingScreen from "./components/LoadingScreen";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { fetchCategories, deleteProductAndVariants, isProductLive, fetchProducts } from "./lib/productService";
import { trackReferralVisit, subscribeReferralSettings } from "./lib/referralService";

function StorefrontApp() {
  const { user, isOwner } = useAuth();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showWhyMerchandise, setShowWhyMerchandise] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnerOpen, setIsOwnerOpen] = useState(false);
  const [ownerEditProductId, setOwnerEditProductId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<"profile" | "orders" | "referral">("orders");
  const [authDefaultTab, setAuthDefaultTab] = useState<"signin" | "signup">("signin");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingOpenCheckoutAfterAuth, setPendingOpenCheckoutAfterAuth] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [flagshipProduct, setFlagshipProduct] = useState<Product | null>(null);
  const [referralWelcomeBanner, setReferralWelcomeBanner] = useState<{ code: string; referrerName?: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([
    { id: "wear", name: "Wear", description: "Daily armor of modesty and dignified public posture", label: "WEAR", order: 1 },
    { id: "carry", name: "Carry", description: "Instruments of transit and stewardship", label: "CARRY", order: 2 },
    { id: "headwear", name: "Headwear", description: "Crown of focus and gaze-restraint", label: "HEADWEAR", order: 3 },
    { id: "vessels", name: "Vessels", description: "Rituals of sustenance and contemplation", label: "VESSELS", order: 4 }
  ]);

  useEffect(() => {
    const init = async () => {
      try {
        const loadedCats = await fetchCategories();
        if (loadedCats.length > 0) {
          setCategories(loadedCats);
        }

        const prods = await fetchProducts();
        // Never show drafted or hidden products as statement pieces
        const liveProds = prods.filter(isProductLive);
        const flagship = liveProds.find(p => p.productId === "SYM-01" || p.productId === "SYM-TSH-001" || p.sku === "SYM-TSH-001") || liveProds[0] || null;
        setFlagshipProduct(flagship);
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const savedCart = localStorage.getItem("sym_cart") || localStorage.getItem("twl_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to load cart", e);
      }
    }
  }, [refreshKey]);

  useEffect(() => {
    localStorage.setItem("sym_cart", JSON.stringify(cart));
  }, [cart]);

  // Track inbound visits via referral link (?ref=CODE or ?referral=CODE) and monitor referral status
  useEffect(() => {
    const unsubscribe = subscribeReferralSettings((settings) => {
      if (!settings.isEnabled) {
        setReferralWelcomeBanner(null);
      }
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get("ref") || params.get("referral");
      if (refParam) {
        trackReferralVisit(refParam, user?.uid, user?.email).then(res => {
          if (res.success) {
            setReferralWelcomeBanner({
              code: refParam.toUpperCase(),
              referrerName: res.referrerName
            });
          }
        });
      }
    }

    return () => unsubscribe();
  }, [user?.uid, user?.email]);

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

  const handleUpdateCartItem = (oldId: string, updatedItem: CartItem) => {
    setCart(prev => {
      // If new item composite id matches an existing item other than oldId, merge quantity
      const existingIndex = prev.findIndex(i => i.id === updatedItem.id && i.id !== oldId);
      if (existingIndex > -1) {
        return prev
          .filter(i => i.id !== oldId)
          .map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + updatedItem.quantity } : item);
      }
      return prev.map(item => item.id === oldId ? updatedItem : item);
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCategoryChange = (id: string | null) => {
    if (id === "about") {
      setShowAbout(true);
      setShowWhyMerchandise(false);
      setActiveCategoryId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (id === "why-merchandise" || id === "manifesto") {
      setShowWhyMerchandise(true);
      setShowAbout(false);
      setActiveCategoryId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setShowAbout(false);
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
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-brand-bg font-mono text-brand-text selection:bg-brand-text selection:text-white">
      {referralWelcomeBanner && (
        <div className="bg-brand-surface text-brand-text px-4 py-2 font-mono text-[11px] flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-text shadow-[0_2px_0px_#050505] sticky top-0 z-[60]">
          <div className="flex items-center gap-2.5">
            <span className="font-black uppercase tracking-wider bg-brand-text text-brand-bg px-2 py-0.5 text-[9px] shrink-0">
              AFFILIATION LINKED
            </span>
            <span className="text-[11px] text-brand-text/90 uppercase tracking-wide">
              ACCREDITED BY <strong className="font-black text-brand-text">{referralWelcomeBanner.referrerName || "COLLEAGUE"}</strong> (KEY: <strong className="font-black text-brand-accent">{referralWelcomeBanner.code}</strong>) — PRIVILEGE LOGGED FOR DISPATCH.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => setReferralWelcomeBanner(null)} 
            className="text-brand-text hover:bg-brand-text hover:text-brand-bg text-[10px] font-black uppercase px-2 py-0.5 border border-brand-text transition-colors cursor-pointer shrink-0"
          >
            DISMISS [X]
          </button>
        </div>
      )}
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onCategoryClick={handleCategoryChange}
        onOwnerClick={isOwner ? () => setIsOwnerOpen(true) : undefined}
        onAuthClick={() => {
          if (user) {
            setProfileInitialTab("orders");
            setIsProfileOpen(true);
          } else {
            setAuthDefaultTab("signin");
            setIsAuthOpen(true);
          }
        }}
        onReferralClick={() => {
          if (user) {
            setProfileInitialTab("referral");
            setIsProfileOpen(true);
          } else {
            setAuthDefaultTab("signup");
            setIsAuthOpen(true);
          }
        }}
      />

      <main>
        {showAbout ? (
          <About 
            onBack={() => handleCategoryChange(null)}
            onWhyWeWear={() => handleCategoryChange("why-merchandise")}
          />
        ) : showWhyMerchandise ? (
          <WhyMerchandise 
            onBack={() => handleCategoryChange(null)} 
            onAbout={() => handleCategoryChange("about")}
          />
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
                {flagshipProduct && isProductLive(flagshipProduct) && (
                  <FeaturedObject 
                    product={flagshipProduct}
                    onViewProduct={setSelectedProduct}
                    onAddToCart={handleAddToCart}
                  />
                )}

                <SystemSpec />

                <Philosophy 
                  onReadManifesto={() => handleCategoryChange("why-merchandise")}
                  onReadAbout={() => handleCategoryChange("about")}
                />
              </>
            )}
          </>
        )}
      </main>

      <Footer 
        categories={categories}
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
            onOpenLedger={() => setIsCartOpen(true)}
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
        onUpdateItem={handleUpdateCartItem}
        onRemove={handleRemoveFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          if (!user) {
            setAuthDefaultTab("signup");
            setAuthNotice("REGISTRATION MANDATORY // In accordance with Symbolic studio protocol, all custodians must be registered to acquire physical artefacts.");
            setPendingOpenCheckoutAfterAuth(true);
            setIsAuthOpen(true);
          } else {
            setIsCheckoutOpen(true);
          }
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        onClearCart={() => setCart([])}
        onOpenAuth={(mode = "signup", customNotice) => {
          setAuthDefaultTab(mode);
          setAuthNotice(customNotice || "REGISTRATION MANDATORY // You must maintain a registered studio identity to finalize artefact custody.");
          setIsAuthOpen(true);
        }}
      />

      {/* Auth Modal (Sign In / Register / Reset) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthNotice(null);
        }}
        defaultTab={authDefaultTab}
        notice={authNotice}
        onSuccess={() => {
          if (pendingOpenCheckoutAfterAuth) {
            setIsCheckoutOpen(true);
            setPendingOpenCheckoutAfterAuth(false);
          }
        }}
      />

      {/* User Profile & Past Orders Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenOwnerManager={isOwner ? () => setIsOwnerOpen(true) : undefined}
        initialTab={profileInitialTab}
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

