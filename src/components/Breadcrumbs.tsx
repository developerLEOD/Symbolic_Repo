import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Compass, X, MapPin, ArrowUpLeft } from "lucide-react";
import { Category, Product } from "../types";
import { CANONICAL_CATEGORIES, CANONICAL_COLLECTIONS, fetchProductBySlugOrId, getCachedProducts } from "../lib/productService";
import { soundManager } from "../lib/soundEffects";

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent: boolean;
  code?: string;
  shortLabel?: string;
}

interface BreadcrumbsProps {
  categories?: Category[];
  currentProduct?: Product | null;
  className?: string;
}

export default function Breadcrumbs({
  categories = CANONICAL_CATEGORIES,
  currentProduct,
  className = "",
}: BreadcrumbsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [resolvedProduct, setResolvedProduct] = useState<Product | null>(currentProduct || null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverOpenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pathname = location.pathname;

  // Resolve product if on artifact route
  useEffect(() => {
    if (currentProduct) {
      setResolvedProduct(currentProduct);
      return;
    }

    const artifactMatch = pathname.match(/^\/artifact\/([^/]+)/);
    if (artifactMatch) {
      const artifactId = artifactMatch[1];
      const cachedList = getCachedProducts();
      const foundInCache = cachedList.find(
        (p) =>
          p.id === artifactId ||
          p.productId?.toLowerCase() === artifactId.toLowerCase() ||
          p.sku?.toLowerCase() === artifactId.toLowerCase()
      );

      if (foundInCache) {
        setResolvedProduct(foundInCache);
      } else {
        fetchProductBySlugOrId(artifactId).then((p) => {
          if (p) setResolvedProduct(p);
        });
      }
    } else {
      setResolvedProduct(null);
    }
  }, [pathname, currentProduct]);

  // Click outside listener to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hoverOpenTimerRef.current) clearTimeout(hoverOpenTimerRef.current);
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  // Collapse on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Build the hierarchical breadcrumbs array based on current route
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: "HOME",
        shortLabel: "ROOT",
        path: "/",
        isCurrent: pathname === "/",
      },
    ];

    if (pathname === "/") {
      return items;
    }

    // 1. Artifacts Directory & Category routes
    if (pathname.startsWith("/artifacts")) {
      const parts = pathname.split("/").filter(Boolean);
      const isArtifactsRoot = parts.length === 1;
      items.push({
        label: "ARTIFACTS",
        shortLabel: "INDEX",
        path: "/artifacts",
        isCurrent: isArtifactsRoot,
      });

      if (parts.length > 1) {
        const categoryId = parts[1].toLowerCase();
        const categoryObj = categories.find(
          (c) => c.id.toLowerCase() === categoryId || c.name.toLowerCase() === categoryId
        );
        const categoryLabel = categoryObj ? categoryObj.label || categoryObj.name.toUpperCase() : categoryId.toUpperCase();

        items.push({
          label: categoryLabel,
          shortLabel: categoryLabel.slice(0, 8),
          path: `/artifacts/${categoryId}`,
          isCurrent: true,
        });
      }
      return items;
    }

    // 2. Collection routes
    if (pathname.startsWith("/collection")) {
      const parts = pathname.split("/").filter(Boolean);
      items.push({
        label: "COLLECTIONS",
        shortLabel: "COLL",
        path: "/artifacts",
        isCurrent: parts.length === 1,
      });

      if (parts.length > 1) {
        const collectionId = parts[1].toLowerCase();
        const collectionObj = CANONICAL_COLLECTIONS.find(
          (c) => c.id.toLowerCase() === collectionId
        );
        const collectionLabel = collectionObj ? collectionObj.label : collectionId.replace(/-/g, " ").toUpperCase();

        items.push({
          label: collectionLabel,
          shortLabel: collectionLabel.slice(0, 9),
          path: `/collection/${collectionId}`,
          isCurrent: true,
        });
      }
      return items;
    }

    // 3. Artifact Specific Dossier (/artifact/:id)
    if (pathname.startsWith("/artifact/")) {
      const parts = pathname.split("/").filter(Boolean);
      const artifactId = parts[1];

      items.push({
        label: "ARTIFACTS",
        shortLabel: "INDEX",
        path: "/artifacts",
        isCurrent: false,
      });

      if (resolvedProduct) {
        const prodCat = resolvedProduct.category?.toLowerCase();
        if (prodCat) {
          const categoryObj = categories.find(
            (c) => c.id.toLowerCase() === prodCat || c.name.toLowerCase() === prodCat
          );
          const categoryLabel = categoryObj ? categoryObj.label || categoryObj.name.toUpperCase() : prodCat.toUpperCase();
          items.push({
            label: categoryLabel,
            shortLabel: categoryLabel.slice(0, 8),
            path: `/artifacts/${prodCat}`,
            isCurrent: false,
          });
        }

        const prodDisplayCode = resolvedProduct.productId || resolvedProduct.sku || "";
        const prodDisplayName = resolvedProduct.name ? resolvedProduct.name.toUpperCase() : "SPECIMEN";
        const label = prodDisplayCode ? `${prodDisplayCode} // ${prodDisplayName}` : prodDisplayName;

        items.push({
          label: label,
          shortLabel: prodDisplayCode || prodDisplayName.slice(0, 8),
          path: pathname,
          isCurrent: true,
          code: prodDisplayCode,
        });
      } else {
        items.push({
          label: `SPECIMEN [${artifactId.toUpperCase()}]`,
          shortLabel: `0x${artifactId.slice(0, 4).toUpperCase()}`,
          path: pathname,
          isCurrent: true,
        });
      }
      return items;
    }

    // 4. About route
    if (pathname.startsWith("/about")) {
      items.push({
        label: "ABOUT SYMBOLIC",
        shortLabel: "ABOUT",
        path: "/about",
        isCurrent: true,
      });
      return items;
    }

    // 5. Manifesto routes
    if (pathname.startsWith("/manifesto") || pathname.startsWith("/why-merchandise")) {
      items.push({
        label: "FOUNDATIONAL MANIFESTO",
        shortLabel: "MANIFESTO",
        path: "/manifesto",
        isCurrent: true,
      });
      return items;
    }

    // 6. Generic fallback
    const pathSegments = pathname.split("/").filter(Boolean);
    let accumulatedPath = "";
    pathSegments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      items.push({
        label: segment.replace(/-/g, " ").toUpperCase(),
        shortLabel: segment.slice(0, 8).toUpperCase(),
        path: accumulatedPath,
        isCurrent: isLast,
      });
    });

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
  const previousLevel = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  const handleNavigate = (path: string) => {
    soundManager.playClick(0.04);
    setIsOpen(false);
    navigate(path);
  };

  const handleMouseEnter = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    // Instant smooth expansion on hover
    hoverOpenTimerRef.current = setTimeout(() => {
      soundManager.playHover(0.02);
      setIsOpen(true);
    }, 40);
  };

  const handleMouseLeave = () => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    // Grace period before closing so user can smoothly interact with popout menu
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 400);
  };

  return (
    <nav
      id="corner-square-nav-trail"
      aria-label="Corner Square Breadcrumb Navigation"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-0 bottom-0 z-40 font-mono select-none ${className}`}
    >
      <div className="relative">
        {/* Equal 1:1 Square Brutalist Block Anchored Right in the Extreme Bottom-Left Corner */}
        <button
          type="button"
          onClick={() => {
            soundManager.playHover(0.02);
            setIsOpen((prev) => !prev);
          }}
          className={`origin-bottom-left transition-all duration-200 ease-out flex flex-col items-center justify-between p-1.5 bg-brand-surface border-t-2 border-r-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:shadow-[5px_5px_0px_#050505] cursor-pointer group hover:bg-brand-bg active:scale-95 ${
            isOpen
              ? "w-14 h-14 sm:w-16 sm:h-16 bg-brand-bg shadow-[5px_5px_0px_#050505] ring-1 ring-brand-text"
              : "w-11 h-11 sm:w-12 sm:h-12 hover:w-14 hover:h-14 sm:hover:w-16 sm:hover:h-16"
          }`}
          title="Tactical Location Matrix [Hover/Click to Expand]"
          aria-expanded={isOpen}
        >
          {/* Top Row: Mini Live Indicator Dot + Depth Level Index */}
          <div className="w-full flex items-center justify-between pointer-events-none transition-all duration-200">
            <span
              className={`transition-all duration-200 border border-brand-text ${
                isOpen || "group-hover:scale-125" ? "w-2 h-2" : "w-1.5 h-1.5"
              } ${
                isOpen ? "bg-[#ff4500] animate-pulse" : "bg-[#ff4500]"
              }`}
            />
            <span className="text-[7.5px] group-hover:text-[8.5px] font-black tracking-tight text-brand-text/60 transition-all duration-200">
              0{breadcrumbs.length}
            </span>
          </div>

          {/* Center: Truncated Tactical Node / Code */}
          <span className="text-[8px] sm:text-[8.5px] group-hover:text-[9.5px] sm:group-hover:text-[10px] font-black tracking-wider text-brand-text uppercase truncate max-w-full text-center leading-none transition-all duration-200">
            {currentCrumb?.shortLabel?.slice(0, 5) || currentCrumb?.code?.slice(0, 5) || currentCrumb?.label.slice(0, 5)}
          </span>

          {/* Bottom Row: Micro Grid Icon / Navigation Compass Marker */}
          <div className="w-full flex items-center justify-between text-[6.5px] group-hover:text-[7.5px] text-brand-text/40 font-black pointer-events-none transition-all duration-200">
            <span>LOC</span>
            <Compass size={9} className={`transition-transform duration-300 text-brand-text/60 group-hover:text-brand-text group-hover:scale-110 ${isOpen ? "rotate-180 text-[#ff4500]" : ""}`} />
          </div>
        </button>

        {/* Upward + Right Diagonal Popout Hierarchy Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 6, x: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6, x: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute left-0 bottom-full mb-1.5 w-[230px] sm:w-[270px] bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] p-2.5 z-50 pointer-events-auto"
            >
              {/* Header Plate */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-brand-text text-[7.5px] font-black uppercase tracking-widest text-brand-text">
                <div className="flex items-center gap-1.5">
                  <Compass size={10} className="text-[#ff4500]" />
                  <span>TRAIL // DEPTH 0{breadcrumbs.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-0.5 hover:bg-brand-text hover:text-brand-bg border border-transparent hover:border-brand-text transition-colors"
                >
                  <X size={9} />
                </button>
              </div>

              {/* Vertical Stepper List */}
              <div className="space-y-1 py-0.5 max-h-[220px] overflow-y-auto hide-scrollbar">
                {breadcrumbs.map((crumb, idx) => {
                  const isCurrent = idx === breadcrumbs.length - 1;
                  const stepNum = String(idx).padStart(2, "0");

                  return (
                    <div key={`${crumb.path}-${idx}`} className="relative flex items-center gap-1.5 group">
                      <span className="text-[7px] font-mono font-bold text-brand-text/50 shrink-0 w-4">
                        [{stepNum}]
                      </span>

                      {isCurrent ? (
                        <div className="flex-1 flex items-center justify-between px-2 py-1 bg-brand-bg text-brand-text font-black border border-brand-text shadow-[1.5px_1.5px_0px_#050505]">
                          <span className="text-[8.5px] tracking-wide truncate">{crumb.label}</span>
                          <span className="text-[6.5px] bg-[#ff4500] text-brand-surface font-black px-1 py-0.2 shrink-0 ml-1">
                            ACTIVE
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleNavigate(crumb.path)}
                          className="flex-1 flex items-center justify-between px-2 py-1 bg-brand-surface hover:bg-brand-bg text-brand-text border border-brand-text/50 hover:border-brand-text hover:shadow-[1.5px_1.5px_0px_#050505] transition-all text-left font-bold cursor-pointer group-hover:translate-x-0.5"
                        >
                          <span className="text-[8.5px] tracking-wide text-brand-text/80 group-hover:text-brand-text truncate">
                            {crumb.label}
                          </span>
                          <ChevronRight
                            size={10}
                            className="stroke-[2.5] text-brand-text/40 group-hover:text-brand-text shrink-0 ml-1"
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Jump Action Bar */}
              <div className="mt-2 pt-1.5 border-t border-brand-text/30 flex items-center justify-between text-[7.5px] font-bold text-brand-text/60">
                {previousLevel ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(previousLevel.path)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-bg hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black text-brand-text uppercase transition-colors"
                    title={`Ascend to ${previousLevel.label}`}
                  >
                    <ArrowUpLeft size={8} />
                    <span>[UP // STEP]</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    <MapPin size={8} className="text-[#ff4500]" />
                    <span>SYSTEM ROOT</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleNavigate("/")}
                  className="px-1.5 py-0.5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg border border-brand-text font-black uppercase text-brand-text text-[7px] transition-colors"
                >
                  ROOT [//]
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
