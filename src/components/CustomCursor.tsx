import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
  isCircle: boolean;
}

interface BoundaryTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [boundaryTarget, setBoundaryTarget] = useState<BoundaryTarget | null>(null);
  const [isClicked, setIsClicked] = useState(false);
  const [isOverOrange, setIsOverOrange] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointRef = useRef({ x: -100, y: -100 });
  const activeElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Enable custom cursor on desktop / fine pointer devices
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mediaQuery.matches) return;

    setIsVisible(true);
    document.documentElement.classList.add("custom-cursor-active");
    document.body.classList.add("custom-cursor-active");

    const checkOrangeBackground = (el: HTMLElement | null): boolean => {
      let curr = el;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        const classStr = curr.className || "";
        if (typeof classStr === "string") {
          if (
            classStr.includes("bg-brand-accent") ||
            classStr.includes("bg-[#ff4500]") ||
            classStr.includes("bg-[#e04006]") ||
            classStr.includes("bg-[#ea580c]") ||
            classStr.includes("bg-[#f97316]") ||
            classStr.includes("bg-orange-")
          ) {
            return true;
          }
        }

        if (curr.dataset?.bg === "orange" || curr.dataset?.accent === "orange") {
          return true;
        }

        const style = window.getComputedStyle(curr);
        const bg = style.backgroundColor;
        if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (match) {
            const r = parseInt(match[1], 10);
            const g = parseInt(match[2], 10);
            const b = parseInt(match[3], 10);
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

            if (a > 0.2) {
              if (
                (r > 190 && g >= 25 && g <= 150 && b <= 75) ||
                (r > 215 && g >= 40 && g <= 170 && b <= 90)
              ) {
                return true;
              }
            }
          }
        }

        curr = curr.parentElement;
      }
      return false;
    };

    const resetIdleTimer = () => {
      setIsIdle(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 2000);
    };

    const updateHoverAtPoint = (clientX: number, clientY: number) => {
      lastPointRef.current = { x: clientX, y: clientY };
      if (clientX < 0 || clientY < 0) return;
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!target) {
        setBoundaryTarget(null);
        activeElementRef.current = null;
        return;
      }

      const overOrange = checkOrangeBackground(target);
      setIsOverOrange(overOrange);

      // Identify element to expand the cursor boundaries to:
      // 1. Button or interactive action element
      // 2. Artifact card, Specimen card, or Product card
      // 3. Featured object or preview canvas
      const buttonEl = target.closest("button, a, [role='button'], [data-cursor-expand='true']") as HTMLElement | null;
      const cardEl = target.closest(
        ".artifact-card, [data-artifact-card='true'], [data-product-card='true'], .specimen-card, .featured-product, [data-featured-object], [data-preview-canvas]"
      ) as HTMLElement | null;

      const elementToExpand = buttonEl || cardEl;

      if (elementToExpand && elementToExpand.isConnected) {
        activeElementRef.current = elementToExpand;
        const rect = elementToExpand.getBoundingClientRect();
        if (rect.width > 8 && rect.height > 8) {
          setBoundaryTarget({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: Math.round(rect.width + 12),
            height: Math.round(rect.height + 12),
          });
          return;
        }
      }

      activeElementRef.current = null;
      setBoundaryTarget(null);
    };

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      resetIdleTimer();
      updateHoverAtPoint(e.clientX, e.clientY);
    };

    const onScrollOrShift = () => {
      if (activeElementRef.current && activeElementRef.current.isConnected) {
        const rect = activeElementRef.current.getBoundingClientRect();
        setBoundaryTarget({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: Math.round(rect.width + 12),
          height: Math.round(rect.height + 12),
        });
      } else {
        updateHoverAtPoint(lastPointRef.current.x, lastPointRef.current.y);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      resetIdleTimer();
      const target = e.target as HTMLElement | null;
      const overOrange = checkOrangeBackground(target);
      const currentColor = overOrange ? "#ffffff" : "#ff4500";
      const newBurst: ClickBurst = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        color: currentColor,
        isCircle: overOrange,
      };
      setBursts((prev) => [...prev.slice(-2), newBurst]);
    };

    const onMouseUp = () => {
      setIsClicked(false);
      resetIdleTimer();
    };

    const onMouseLeave = () => {
      setIsVisible(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };

    const onMouseEnter = () => {
      setIsVisible(true);
      resetIdleTimer();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll", onScrollOrShift, { passive: true, capture: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    resetIdleTimer();

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScrollOrShift, { capture: true } as EventListenerOptions);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (bursts.length === 0) return;
    const timeout = setTimeout(() => {
      setBursts((prev) => prev.slice(1));
    }, 350);
    return () => clearTimeout(timeout);
  }, [bursts]);

  if (!isVisible) return null;

  const cornerColorClass = isOverOrange ? "border-white text-white" : "border-[#ff4500] text-[#ff4500]";
  const dashedColorClass = isOverOrange ? "border-white/60 outline-white/30" : "border-[#ff4500]/60 outline-[#ff4500]/30";

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* Click Ripple / Burst */}
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            style={{
              left: b.x,
              top: b.y,
              borderColor: b.color,
              borderRadius: b.isCircle ? "50%" : "0px",
            }}
            initial={{ opacity: 0.95, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{ opacity: 0, scale: 2.4, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-6 h-6 border-2 bg-transparent pointer-events-none"
          />
        ))}
      </AnimatePresence>

      {/* EXPANDED BOUNDARY CORNERS FRAME: Expands directly to the boundary corners of the hovered element */}
      <motion.div
        animate={{
          left: boundaryTarget ? boundaryTarget.x : position.x,
          top: boundaryTarget ? boundaryTarget.y : position.y,
          width: boundaryTarget ? boundaryTarget.width : 22,
          height: boundaryTarget ? boundaryTarget.height : 22,
          opacity: boundaryTarget ? 1 : 0,
          scale: isClicked ? 0.985 : 1,
        }}
        transition={{
          left: { type: "spring", stiffness: 480, damping: 28, mass: 0.12 },
          top: { type: "spring", stiffness: 480, damping: 28, mass: 0.12 },
          width: { type: "spring", stiffness: 440, damping: 26, mass: 0.14 },
          height: { type: "spring", stiffness: 440, damping: 26, mass: 0.14 },
          opacity: { duration: 0.14 },
        }}
        className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9998]"
      >
        {/* Outer dashed border frame with outline offset around the entire element */}
        <div
          className={`absolute inset-0 border border-dashed outline outline-1 outline-offset-1 pointer-events-none ${dashedColorClass}`}
        />

        {/* 4 Precise Corner Outline Borders (brackets) at the element's boundaries */}
        <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 pointer-events-none ${cornerColorClass}`} />
        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 pointer-events-none ${cornerColorClass}`} />
        <div className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 pointer-events-none ${cornerColorClass}`} />
        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 pointer-events-none ${cornerColorClass}`} />

        {/* 4 Technical Corner Crosshair Reticles (+) at the element's boundaries */}
        <span className={`absolute -top-3.5 -left-3.5 font-mono text-[10px] font-black leading-none pointer-events-none select-none ${cornerColorClass}`}>
          +
        </span>
        <span className={`absolute -top-3.5 -right-3.5 font-mono text-[10px] font-black leading-none pointer-events-none select-none ${cornerColorClass}`}>
          +
        </span>
        <span className={`absolute -bottom-3.5 -left-3.5 font-mono text-[10px] font-black leading-none pointer-events-none select-none ${cornerColorClass}`}>
          +
        </span>
        <span className={`absolute -bottom-3.5 -right-3.5 font-mono text-[10px] font-black leading-none pointer-events-none select-none ${cornerColorClass}`}>
          +
        </span>
      </motion.div>

      {/* MOUSE POINTER CORE DOT: Always tracks cursor position accurately with zero lag */}
      <motion.div
        style={{
          left: position.x,
          top: position.y,
        }}
        animate={{
          scale: isClicked ? 0.75 : boundaryTarget ? 0.8 : isIdle ? [0.85, 1.15, 0.85] : 1,
          borderRadius: isOverOrange ? "50%" : "0px",
          backgroundColor: isOverOrange ? "#ffffff" : "#ff4500",
        }}
        transition={{
          scale: isIdle && !boundaryTarget && !isClicked
            ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
            : { duration: 0.1 },
          borderRadius: { duration: 0.12 },
          backgroundColor: { duration: 0.1 },
        }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none z-[9999]"
      />
    </div>
  );
}
