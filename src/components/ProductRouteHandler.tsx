import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductDetail from "./ProductDetail";
import { Product, CartItem } from "../types";
import { fetchProductBySlugOrId, deleteProductAndVariants } from "../lib/productService";
import { useAuth } from "../lib/AuthContext";
import { AnimatePresence } from "motion/react";

interface ProductRouteHandlerProps {
  onAddToCart: (item: CartItem) => void;
  onOpenLedger: () => void;
  onEditProduct?: (id: string) => void;
  onProductDeleted?: () => void;
}

export default function ProductRouteHandler({
  onAddToCart,
  onOpenLedger,
  onEditProduct,
  onProductDeleted
}: ProductRouteHandlerProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(false);

    fetchProductBySlugOrId(id)
      .then((p) => {
        if (!isMounted) return;
        if (p) {
          setProduct(p);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error("Error loading product route:", err);
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleClose = () => {
    // Navigate back to artefacts directory or previous location
    navigate("/artefacts");
  };

  const handleDelete = async (prodId: string, name: string) => {
    try {
      await deleteProductAndVariants(prodId);
      if (onProductDeleted) onProductDeleted();
      navigate("/artefacts");
    } catch (err) {
      console.error("Failed to remove product from route:", err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg/95 flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 border-2 border-brand-text border-t-brand-accent animate-spin mb-4" />
        <div className="text-xs font-black uppercase tracking-widest text-brand-text">
          RETRIEVING ARTEFACT RECORD // {id}
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-mono space-y-4">
        <div className="text-sm font-black uppercase tracking-widest text-brand-accent border-2 border-brand-text p-3 bg-brand-surface shadow-[4px_4px_0px_#050505]">
          ARTEFACT NOT LOCATED IN ARCHIVE
        </div>
        <p className="text-xs text-brand-text/70 max-w-md uppercase">
          The requested identifier [{id}] could not be resolved against current registered specimens.
        </p>
        <button
          type="button"
          onClick={() => navigate("/artefacts")}
          className="px-4 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-black text-xs uppercase border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
        >
          RETURN TO DIRECTORY
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <ProductDetail
        product={product}
        categoryLabel={product.category ? product.category.toUpperCase() : "ARTEFACT"}
        onClose={handleClose}
        onAddToCart={onAddToCart}
        onOpenLedger={onOpenLedger}
        onEditProduct={isOwner && onEditProduct ? () => onEditProduct(product.id) : undefined}
        onDeleteProduct={isOwner ? handleDelete : undefined}
      />
    </AnimatePresence>
  );
}
