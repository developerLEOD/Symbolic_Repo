import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

let globalClick = { x: typeof window !== "undefined" ? window.innerWidth / 2 : 0, y: typeof window !== "undefined" ? window.innerHeight / 2 : 0 };
if (typeof window !== "undefined") {
  window.addEventListener("mousedown", (e) => {
    globalClick = { x: e.clientX, y: e.clientY };
  }, true);
}

export function TileOverlay({ 
  isActive, 
  onCover,
  destinationName
}: { 
  isActive: boolean;
  onCover: () => void;
  destinationName: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(8);
  const [phase, setPhase] = useState<"idle" | "in" | "covered" | "out">("idle");
  const [tiles, setTiles] = useState<{ id: string; delayIn: number; delayOut: number }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const isMobile = window.innerWidth < 640;
    const c = isMobile ? 5 : 8;
    const r = Math.ceil((window.innerHeight / window.innerWidth) * c);
    
    setCols(c);
    setRows(r);
  }, []);

  useEffect(() => {
    if (isActive && phase === "idle") {
      if (prefersReducedMotion) {
        setPhase("in");
        setTimeout(() => {
          setPhase("covered");
          onCover();
        }, 150);
        return;
      }

      const rectWidth = window.innerWidth / cols;
      const rectHeight = window.innerHeight / rows;
      
      const newTiles = [];
      let maxDist = 0;
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const centerX = (x + 0.5) * rectWidth;
          const centerY = (y + 0.5) * rectHeight;
          const dist = Math.sqrt(Math.pow(centerX - globalClick.x, 2) + Math.pow(centerY - globalClick.y, 2));
          if (dist > maxDist) maxDist = dist;
          newTiles.push({ id: `${x}-${y}`, x, y, dist });
        }
      }

      const PROPAGATION_TIME = 0.35; 

      const mappedTiles = newTiles.map(t => {
        const norm = maxDist > 0 ? t.dist / maxDist : 0;
        return {
          id: t.id,
          delayIn: norm * PROPAGATION_TIME,
          delayOut: (1 - norm) * PROPAGATION_TIME
        };
      });

      setTiles(mappedTiles);
      setPhase("in");

      setTimeout(() => {
        setPhase("covered");
        onCover();
      }, (PROPAGATION_TIME + 0.2) * 1000); 
    }
  }, [isActive, phase, cols, rows, onCover, prefersReducedMotion]);

  useEffect(() => {
    if (!isActive && phase === "covered") {
      setPhase("out");
      
      const waitTime = prefersReducedMotion ? 150 : (0.35 + 0.2) * 1000;
      setTimeout(() => {
        setPhase("idle");
      }, waitTime);
    }
  }, [isActive, phase, prefersReducedMotion]);

  if (phase === "idle") return null;

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-brand-accent">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
          {destinationName}
        </h1>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col">
      <div 
        className="absolute inset-0 grid"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)` 
        }}
      >
        {tiles.map((tile) => {
          const isVisible = phase === "in" || phase === "covered";
          return (
            <motion.div
              key={tile.id}
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ 
                scaleY: isVisible ? 1 : 0, 
                originY: isVisible ? 0 : 1 
              }}
              transition={{
                duration: 0.2,
                ease: [0.85, 0, 0.15, 1], 
                delay: isVisible ? tile.delayIn : tile.delayOut
              }}
              className="w-full h-full bg-brand-accent border-[0.5px] border-black/10"
            />
          );
        })}
      </div>
      
      <AnimatePresence>
        {(phase === "in" || phase === "covered") && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.1 }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter uppercase text-center px-4 leading-none">
              {destinationName}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function formatRouteName(pathname: string): string {
  if (pathname === "/") return "INDEX";
  if (pathname.startsWith("/artifacts/")) {
    return pathname.replace("/artifacts/", "").replace(/-/g, " ").toUpperCase();
  }
  if (pathname.startsWith("/artifact/")) return "SPECIFICATION";
  if (pathname.startsWith("/collection/")) {
    return pathname.replace("/collection/", "").replace(/-/g, " ").toUpperCase();
  }
  return pathname.replace("/", "").replace(/-/g, " ").toUpperCase();
}
