import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import ProductDetail from "./ProductDetail";
import ArtifactDetail from "./ArtifactDetail";
import { Product, CartItem, Artifact, Specimen } from "../types";
import { fetchProductBySlugOrId, deleteProductAndVariants } from "../lib/productService";
import { 
  fetchArtifactById, 
  fetchSpecimensByArtifactId, 
  fetchArtifactsWithSpecimens,
  deleteArtifactCascade
} from "../lib/artifactService";
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
  const [searchParams] = useSearchParams();
  const querySpecimenId = searchParams.get("specimen") || searchParams.get("specimenId") || undefined;
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [initialSpecimenId, setInitialSpecimenId] = useState<string | undefined>(querySpecimenId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (querySpecimenId) {
      setInitialSpecimenId(querySpecimenId);
    }
  }, [querySpecimenId]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(false);

    const resolveEntity = async () => {
      try {
        // 1. Try resolving as Artifact
        const foundArtifact = await fetchArtifactById(id);
        if (foundArtifact && isMounted) {
          const childSpecs = await fetchSpecimensByArtifactId(foundArtifact.id);
          if (isMounted) {
            setArtifact(foundArtifact);
            setSpecimens(childSpecs);
            setLoading(false);
            return;
          }
        }

        // 2. Try resolving against all artifacts (slug, name, artifactId match)
        const allArtifactsWithSpecs = await fetchArtifactsWithSpecimens();
        const cleanId = id.toLowerCase().trim();
        const matchedArtifact = allArtifactsWithSpecs.find(item => 
          item.id.toLowerCase() === cleanId ||
          item.artifactId.toLowerCase() === cleanId ||
          item.name.toLowerCase() === cleanId ||
          item.name.toLowerCase().replace(/\s+/g, "-") === cleanId
        );

        if (matchedArtifact && isMounted) {
          setArtifact(matchedArtifact);
          setSpecimens(matchedArtifact.specimens);
          setLoading(false);
          return;
        }

        // 3. Try checking if id matches a specimen directly
        for (const item of allArtifactsWithSpecs) {
          const matchedSpecimen = item.specimens.find(s => 
            s.id.toLowerCase() === cleanId ||
            s.sku.toLowerCase() === cleanId
          );
          if (matchedSpecimen && isMounted) {
            setArtifact(item);
            setSpecimens(item.specimens);
            setInitialSpecimenId(matchedSpecimen.id);
            setLoading(false);
            return;
          }
        }

        // 4. Fallback: try legacy Product resolver
        const legacyProd = await fetchProductBySlugOrId(id);
        if (legacyProd && isMounted) {
          setProduct(legacyProd);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading route entity:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    resolveEntity();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleClose = () => {
    navigate("/");
  };

  const handleDeleteArtifact = async (artId: string, name: string) => {
    try {
      await deleteArtifactCascade(artId);
      if (onProductDeleted) onProductDeleted();
      navigate("/");
    } catch (err) {
      console.error("Failed to delete artifact:", err);
    }
  };

  const handleDeleteLegacyProduct = async (prodId: string, name: string) => {
    try {
      await deleteProductAndVariants(prodId);
      if (onProductDeleted) onProductDeleted();
      navigate("/");
    } catch (err) {
      console.error("Failed to remove product from route:", err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-brand-bg px-4 py-8 sm:py-12 select-none font-mono">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#050505_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="h-4 sm:h-8 w-full shrink-0" />

        <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center my-auto">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-5 shrink-0 overflow-hidden bg-brand-surface flex items-center justify-center border-2 sm:border-[3px] border-brand-text shadow-[6px_6px_0px_#050505]">
            <img 
              src="/Logo_NoName.jpg" 
              alt="SYMBOLIC" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-3.5"
            />
          </div>

          <div className="text-center flex flex-col items-center">
            <div className="inline-flex flex-col items-end leading-none">
              <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-black tracking-tight uppercase text-brand-text leading-none">
                SYMBOLIC
              </span>
              <span className="text-sm sm:text-base md:text-lg font-mono font-black italic tracking-normal text-brand-accent uppercase leading-none mt-0.5">
                MUSLIMS
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-widest text-brand-text/50 uppercase mt-2 font-semibold">
              RETRIEVING ARTIFACT DOSSIER // {id?.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center pb-2 sm:pb-4 shrink-0">
          <div className="w-56 sm:w-64 h-2 bg-brand-surface border-2 border-brand-text overflow-hidden shadow-[3px_3px_0px_#050505] mb-3">
            <div className="h-full bg-brand-accent animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>

          <div className="flex flex-col items-center text-center space-y-1 w-full">
            <p className="text-[11px] sm:text-xs font-mono font-black tracking-[0.16em] uppercase text-brand-text leading-tight">
              RESOLVING ARTIFACT & SPECIMENS
            </p>
            <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-brand-accent font-bold uppercase leading-tight">
              PREPARING TACTILE ARCHIVE DOSSIER
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!artifact && !product)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-mono space-y-4">
        <div className="text-sm font-black uppercase tracking-widest text-brand-accent border-2 border-brand-text p-3 bg-brand-surface shadow-[4px_4px_0px_#050505]">
          ARTIFACT NOT LOCATED IN ARCHIVE
        </div>
        <p className="text-xs text-brand-text/70 max-w-md uppercase">
          The requested identifier [{id}] could not be resolved against current registered artifacts or specimens.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white font-black text-xs uppercase border-2 border-brand-text shadow-[2px_2px_0px_#050505] cursor-pointer"
        >
          RETURN TO ARCHIVE
        </button>
      </div>
    );
  }

  // If we resolved an Artifact and its Specimens, display ArtifactDetail
  if (artifact) {
    return (
      <AnimatePresence>
        <ArtifactDetail
          artifact={artifact}
          specimens={specimens}
          initialSpecimenId={initialSpecimenId}
          onClose={handleClose}
          onAddToCart={onAddToCart}
          onOpenLedger={onOpenLedger}
          onEditArtifact={isOwner && onEditProduct ? () => onEditProduct(artifact.id) : undefined}
          onDeleteArtifact={isOwner ? handleDeleteArtifact : undefined}
        />
      </AnimatePresence>
    );
  }

  // Otherwise, fallback to legacy ProductDetail
  return (
    <AnimatePresence>
      <ProductDetail
        product={product!}
        categoryLabel={product!.category ? product!.category.toUpperCase() : "ARTIFACT"}
        onClose={handleClose}
        onAddToCart={onAddToCart}
        onOpenLedger={onOpenLedger}
        onEditProduct={isOwner && onEditProduct ? () => onEditProduct(product!.id) : undefined}
        onDeleteProduct={isOwner ? handleDeleteLegacyProduct : undefined}
      />
    </AnimatePresence>
  );
}
