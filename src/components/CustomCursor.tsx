import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
  isCircle: boolean;
}

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isInteractive, setIsInteractive] = useState(false);
  const [isProductHovered, setIsProductHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isOverOrange, setIsOverOrange] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Enable custom cursor on desktop/fine pointer devices
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
      if (clientX < 0 || clientY < 0) return;
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!target) {
        setIsInteractive(false);
        setIsProductHovered(false);
        return;
      }

      const overOrange = checkOrangeBackground(target);
      setIsOverOrange(overOrange);

      const productCard = target.closest(
        "[data-product-card], .product-card, .artifact-card, .specimen-card, .featured-product, [data-featured-object], [data-preview-element], [data-preview-canvas]"
      );

      if (productCard) {
        setIsProductHovered(true);
        setIsInteractive(true);
        return;
      } else {
        setIsProductHovered(false);
      }

      const interactiveEl = target.closest(
        "button, a, input, select, textarea, [role='button'], [data-action], [data-cursor], [data-collection-filter], [data-view-mode], .cursor-pointer"
      );

      setIsInteractive(!!interactiveEl);
    };

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      resetIdleTimer();
      updateHoverAtPoint(e.clientX, e.clientY);
    };

    const onScrollOrShift = () => {
      updateHoverAtPoint(position.x, position.y);
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
    window.addEventListener("scroll", onScrollOrShift, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    resetIdleTimer();

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScrollOrShift);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [position.x, position.y]);

  useEffect(() => {
    if (bursts.length === 0) return;
    const timeout = setTimeout(() => {
      setBursts((prev) => prev.slice(1));
    }, 350);
    return () => clearTimeout(timeout);
  }, [bursts]);

  if (!isVisible) return null;

  // Responsive cursor dimensions based on context
  const cursorSize = isProductHovered ? 28 : isInteractive ? 18 : 10;

  // Scale animation for click / idle
  const scaleAnimation = isClicked
    ? 0.75
    : isIdle && !isInteractive
    ? [0.85, 1.15, 0.85]
    : 1;

  const springTransition = {
    type: "spring",
    stiffness: 1100,
    damping: 46,
    mass: 0.03,
  };

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

      {/* Main Cursor Frame: Strictly follows mouse coordinates with instant response */}
      <motion.div
        animate={{
          left: position.x,
          top: position.y,
          x: "-50%",
          y: "-50%",
          width: cursorSize,
          height: cursorSize,
          scale: scaleAnimation,
        }}
        transition={{
          left: springTransition,
          top: springTransition,
          width: { duration: 0.12, ease: "easeOut" },
          height: { duration: 0.12, ease: "easeOut" },
          scale: isIdle && !isInteractive && !isClicked
            ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
            : springTransition,
        }}
        className="absolute pointer-events-none flex items-center justify-center bg-transparent"
      >
        {/* Core Dot: Square on standard surfaces, Circle on orange backgrounds */}
        <motion.div
          animate={{
            scale: isProductHovered ? 0.6 : 1,
            borderRadius: isOverOrange ? "50%" : "0px",
            backgroundColor: isOverOrange ? "#ffffff" : "#ff4500",
          }}
          transition={{
            scale: { duration: 0.12 },
            borderRadius: { duration: 0.15, ease: "easeOut" },
            backgroundColor: { duration: 0.12, ease: "linear" },
          }}
          className="w-2.5 h-2.5 pointer-events-none"
        />

        {/* Framing brackets on product hover */}
        {isProductHovered && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`absolute inset-0 border border-brand-accent pointer-events-none ${
                isOverOrange ? "border-white" : "border-[#ff4500]"
              }`}
            />
            {/* Corner Crosshairs */}
            <div className={`absolute -top-1 -left-1 w-1.5 h-1.5 border-t-2 border-l-2 ${isOverOrange ? "border-white" : "border-[#ff4500]"}`} />
            <div className={`absolute -top-1 -right-1 w-1.5 h-1.5 border-t-2 border-r-2 ${isOverOrange ? "border-white" : "border-[#ff4500]"}`} />
            <div className={`absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b-2 border-l-2 ${isOverOrange ? "border-white" : "border-[#ff4500]"}`} />
            <div className={`absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b-2 border-r-2 ${isOverOrange ? "border-white" : "border-[#ff4500]"}`} />
          </>
        )}

        {/* Hover ring on general interactive elements */}
        {isInteractive && !isProductHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`absolute -inset-1 border border-dashed pointer-events-none ${
              isOverOrange ? "border-white/80" : "border-[#ff4500]/80"
            }`}
          />
        )}
      </motion.div>
    </div>
  );
}
