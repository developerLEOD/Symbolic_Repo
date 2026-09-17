import { useState, useEffect, useRef } from "react";

// Global pointer tracking supporting touch, pointerdown, and click on all devices
let globalClick = { 
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 200, 
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 200 
};

if (typeof window !== "undefined") {
  const recordPoint = (clientX: number, clientY: number) => {
    if (clientX > 0 || clientY > 0) {
      globalClick = { x: clientX, y: clientY };
    }
  };

  window.addEventListener(
    "pointerdown", 
    (e) => recordPoint(e.clientX, e.clientY), 
    { passive: true, capture: true }
  );
  window.addEventListener(
    "touchstart", 
    (e) => {
      if (e.touches && e.touches[0]) {
        recordPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, 
    { passive: true, capture: true }
  );
  window.addEventListener(
    "mousedown", 
    (e) => recordPoint(e.clientX, e.clientY), 
    { passive: true, capture: true }
  );
}

function getGridSetup() {
  if (typeof window === "undefined") {
    return { cols: 8, rows: 8 };
  }
  const w = window.innerWidth;
  if (w < 640) {
    // Mobile: 6 columns x 10 rows (yields lively 2x2, 2x1, 1x2, 3x1, 1x1 mosaic blocks)
    return { cols: 6, rows: 10 };
  } else if (w < 1024) {
    // Tablet: 8 columns x 8 rows
    return { cols: 8, rows: 8 };
  } else {
    // Desktop: 12 columns x 8 rows
    return { cols: 12, rows: 8 };
  }
}

interface TileRect {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  delayIn: number;
  delayOut: number;
}

function generateRandomTiles(
  cols: number,
  rows: number,
  clickX: number,
  clickY: number,
  screenW: number,
  screenH: number,
  propagationTime: number
): TileRect[] {
  const occupied: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  
  // Diverse assortment of dimensions [width, height] in grid units
  const sizeOptions = [
    [2, 2], [2, 2],
    [2, 1], [2, 1], [2, 1],
    [1, 2], [1, 2], [1, 2],
    [3, 1], [3, 1],
    [1, 3],
    [3, 2],
    [2, 3],
    [1, 1]
  ];

  const cellWidth = screenW / cols;
  const cellHeight = screenH / rows;

  interface RawTile {
    id: string;
    col: number;
    row: number;
    colSpan: number;
    rowSpan: number;
    dist: number;
  }

  const rawTiles: RawTile[] = [];
  let maxDist = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue;

      // Randomize candidate sizes
      const candidates = [...sizeOptions].sort(() => Math.random() - 0.5);

      let chosenW = 1;
      let chosenH = 1;

      for (const [w, h] of candidates) {
        if (c + w <= cols && r + h <= rows) {
          let canFit = true;
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              if (occupied[r + dy][c + dx]) {
                canFit = false;
                break;
              }
            }
            if (!canFit) break;
          }
          if (canFit) {
            chosenW = w;
            chosenH = h;
            break;
          }
        }
      }

      // Mark cells occupied
      for (let dy = 0; dy < chosenH; dy++) {
        for (let dx = 0; dx < chosenW; dx++) {
          occupied[r + dy][c + dx] = true;
        }
      }

      // Calculate spatial center of this tile
      const centerX = (c + chosenW / 2) * cellWidth;
      const centerY = (r + chosenH / 2) * cellHeight;
      const dist = Math.sqrt(Math.pow(centerX - clickX, 2) + Math.pow(centerY - clickY, 2));
      if (dist > maxDist) maxDist = dist;

      rawTiles.push({
        id: `tile-${c}-${r}-${chosenW}x${chosenH}`,
        col: c,
        row: r,
        colSpan: chosenW,
        rowSpan: chosenH,
        dist
      });
    }
  }

  return rawTiles.map((t) => {
    const norm = maxDist > 0 ? t.dist / maxDist : 0;
    return {
      id: t.id,
      col: t.col,
      row: t.row,
      colSpan: t.colSpan,
      rowSpan: t.rowSpan,
      delayIn: Number((norm * propagationTime).toFixed(3)),
      delayOut: Number(((1 - norm) * (propagationTime * 0.7)).toFixed(3))
    };
  });
}

export function TileOverlay({ 
  isActive, 
  onCover,
  onComplete,
  destinationName
}: { 
  isActive: boolean;
  onCover?: () => void;
  onComplete?: () => void;
  destinationName: string;
}) {
  const [grid, setGrid] = useState(getGridSetup);
  const [phase, setPhase] = useState<"idle" | "in" | "covered" | "out">("idle");
  const [tiles, setTiles] = useState<TileRect[]>([]);

  const onCoverRef = useRef(onCover);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCoverRef.current = onCover;
    onCompleteRef.current = onComplete;
  });

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Keep grid responsive to resize or orientation changes
  useEffect(() => {
    const handleResize = () => setGrid(getGridSetup());
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Main transition orchestration
  useEffect(() => {
    if (isActive) {
      clearAllTimers();

      const { cols, rows } = grid;
      const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

      // Timing constants (in seconds) - snappy and fluid
      const PROPAGATION_TIME = 0.22; 
      const TILE_DURATION = 0.20;
      const inDurationMs = (PROPAGATION_TIME + TILE_DURATION) * 1000;
      const holdDurationMs = 40; // minimal pause before reversing
      const outDurationMs = (PROPAGATION_TIME * 0.7 + TILE_DURATION) * 1000;

      const randomTiles = generateRandomTiles(
        cols,
        rows,
        globalClick.x,
        globalClick.y,
        screenW,
        screenH,
        PROPAGATION_TIME
      );

      setTiles(randomTiles);
      setPhase("in");

      // Stage 1: All tiles complete entering -> full screen cover -> invoke onCover
      const t1 = setTimeout(() => {
        setPhase("covered");
        if (onCoverRef.current) {
          onCoverRef.current();
        }

        // Stage 2: Hold covered momentarily -> animate out
        const t2 = setTimeout(() => {
          setPhase("out");

          // Stage 3: All tiles complete exiting -> return to idle
          const t3 = setTimeout(() => {
            setPhase("idle");
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          }, outDurationMs);
          timersRef.current.push(t3);
        }, holdDurationMs);
        timersRef.current.push(t2);
      }, inDurationMs);
      timersRef.current.push(t1);
    }
  }, [isActive, grid]);

  if (phase === "idle") return null;

  const isEntering = phase === "in";
  const isCovered = phase === "covered";
  const isExiting = phase === "out";

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ 
        zIndex: 9999,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        backgroundColor: "transparent",
        isolation: "isolate"
      }}
    >
      {/* Inline styles for guaranteed GPU-accelerated 120 FPS CSS animations */}
      <style>{`
        @keyframes brutalistTileSnapIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          65% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1.01);
            opacity: 1;
          }
        }

        @keyframes brutalistTileSnapOut {
          0% {
            transform: scale(1.01);
            opacity: 1;
          }
          30% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }

        @keyframes brutalistStampIn {
          0% {
            transform: scale(0.92) translateY(12px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes brutalistStampOut {
          0% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          100% {
            transform: scale(1.04) translateY(-8px);
            opacity: 0;
          }
        }
      `}</style>

      {/* Structural Architectural Tile Grid Container */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ 
          display: "grid",
          gridTemplateColumns: `repeat(${grid.cols}, ${(100 / grid.cols).toFixed(4)}%)`,
          gridTemplateRows: `repeat(${grid.rows}, ${(100 / grid.rows).toFixed(4)}%)`,
          width: "100%",
          height: "100%",
          gap: "0px",
          padding: "0px",
          backgroundColor: "transparent",
          zIndex: 10,
          boxSizing: "border-box"
        }}
      >
        {tiles.map((tile) => {
          let tileAnimation = "none";
          let tileTransform = "scale(0)";
          let tileOpacity = 0;

          if (isEntering) {
            tileAnimation = `brutalistTileSnapIn 0.20s cubic-bezier(0.16, 1, 0.3, 1) ${tile.delayIn}s both`;
          } else if (isCovered) {
            tileTransform = "scale(1.01)";
            tileOpacity = 1;
          } else if (isExiting) {
            tileAnimation = `brutalistTileSnapOut 0.18s cubic-bezier(0.7, 0, 0.2, 1) ${tile.delayOut}s both`;
          }

          return (
            <div
              key={tile.id}
              className="relative bg-brand-accent select-none overflow-hidden"
              style={{
                gridColumn: `${tile.col + 1} / span ${tile.colSpan}`,
                gridRow: `${tile.row + 1} / span ${tile.rowSpan}`,
                width: "100%",
                height: "100%",
                zIndex: 15,
                transformOrigin: "center center",
                willChange: "transform, opacity",
                boxSizing: "border-box",
                animation: tileAnimation,
                transform: tileAnimation === "none" ? tileTransform : undefined,
                opacity: tileAnimation === "none" ? tileOpacity : undefined
              }}
            />
          );
        })}
      </div>
      
      {/* Destination typography stamp */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
        style={{ 
          zIndex: 30,
          animation: isEntering
            ? `brutalistStampIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) 0.10s both`
            : isExiting
            ? `brutalistStampOut 0.14s cubic-bezier(0.7, 0, 0.2, 1) both`
            : undefined,
          opacity: isCovered ? 1 : undefined,
          transform: isCovered ? "scale(1) translateY(0)" : undefined
        }}
      >
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter uppercase text-center px-4 leading-none">
          {destinationName}
        </h1>
      </div>
    </div>
  );
}

export function formatRouteName(pathname: string): string {
  if (pathname === "/") return "HOME";
  if (pathname === "/artifacts") return "ALL ARTIFACTS";
  if (pathname.startsWith("/artifacts/")) {
    const cat = pathname.replace("/artifacts/", "").replace(/-/g, " ").toUpperCase();
    return cat || "ARTIFACTS";
  }
  if (pathname.startsWith("/artifact/")) return "SPECIFICATION";
  if (pathname.startsWith("/acquisitions/") || pathname.endsWith("/acquire")) return "ACQUISITION PROTOCOL";
  if (pathname.startsWith("/collection/")) {
    const col = pathname.replace("/collection/", "").replace(/-/g, " ").toUpperCase();
    return col || "COLLECTION";
  }
  if (pathname === "/about") return "ABOUT SYMBOLIC";
  if (pathname === "/manifesto" || pathname === "/why-merchandise") return "THE PHILOSOPHY";
  return pathname.replace("/", "").replace(/-/g, " ").toUpperCase() || "SYMBOLIC";
}
