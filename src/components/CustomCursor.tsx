import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
  isCircle: boolean;
}

interface HoverBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoverBounds, setHoverBounds] = useState<HoverBounds | null>(null);
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
        // 1. Check class names
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

        // 2. Check dataset attributes
        if (curr.dataset?.bg === "orange" || curr.dataset?.accent === "orange") {
          return true;
        }

        // 3. Check computed background color
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
              // Check if color is in the vibrant orange / red-orange range (e.g. #ff4500 rgb(255, 69, 0))
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

    const isProductPreviewElement = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      return Boolean(
        el.matches(
          "[data-preview-element], [data-preview-canvas], [data-product-card], .product-card, .artifact-card, .featured-product, [data-card]"
        ) ||
        ((el.classList.contains("aspect-[4/5]") || el.classList.contains("aspect-[3/4]")) &&
          Boolean(el.closest("[data-preview-element], [data-product-card], .product-card, .artifact-card, #catalog-section")))
      );
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

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      resetIdleTimer();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const overOrange = checkOrangeBackground(target);
      setIsOverOrange(overOrange);

      // 1. Direct action/control elements: buttons, links, inputs, selects, textareas, role="button", data-action, data-cursor.
      const directAction = target.closest(
        "button, a, input, select, textarea, [role='button'], [data-action], [data-cursor], [data-collection-filter], [data-view-mode]"
      ) as HTMLElement | null;

      if (directAction) {
        if (!isProductPreviewElement(directAction)) {
          const rect = directAction.getBoundingClientRect();
          const padding = 6;
          setHoverBounds({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
          setIsHovered(true);
          return;
        }
      }

      // 2. Check general clickable containers (.cursor-pointer)
      const clickableContainer = target.closest(".cursor-pointer") as HTMLElement | null;
      if (clickableContainer) {
        if (isProductPreviewElement(clickableContainer) || isProductPreviewElement(target)) {
          setHoverBounds(null);
          setIsHovered(false);
          return;
        }

        const rect = clickableContainer.getBoundingClientRect();
        if (rect.width <= 320 && rect.height <= 180) {
          const padding = 6;
          setHoverBounds({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
          setIsHovered(true);
          return;
        }
      }

      // 3. Default: free floating
      setHoverBounds(null);
      setIsHovered(false);
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

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    resetIdleTimer();

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
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

  const isSnapping = isHovered && hoverBounds !== null;
  const targetX = isSnapping ? hoverBounds.x : position.x;
  const targetY = isSnapping ? hoverBounds.y : position.y;
  
  // Standard dot size when free-floating
  const defaultSize = 10;
  const targetWidth = isSnapping ? hoverBounds.width : defaultSize;
  const targetHeight = isSnapping ? hoverBounds.height : defaultSize;

  // Scale animation for click / idle
  const scaleAnimation = isClicked
    ? 0.75
    : isIdle && !isHovered
    ? [0.85, 1.15, 0.85]
    : 1;

  const springTransition = {
    type: "spring",
    stiffness: 550,
    damping: 30,
    mass: 0.1,
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
            initial={{ opacity: 0.9, scale: 0.6, x: "-50%", y: "-50%" }}
            animate={{ opacity: 0, scale: 2.2, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute w-6 h-6 border-[1.5px] bg-transparent pointer-events-none"
          />
        ))}
      </AnimatePresence>

      {/* Main Cursor Frame: Snaps with 4 Corner Brackets on Hover, Clean Dot when Free-Floating */}
      <motion.div
        animate={{
          left: targetX,
          top: targetY,
          x: "-50%",
          y: "-50%",
          width: targetWidth,
          height: targetHeight,
          scale: scaleAnimation,
        }}
        transition={{
          left: springTransition,
          top: springTransition,
          width: springTransition,
          height: springTransition,
          scale: isIdle && !isHovered && !isClicked
            ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
            : springTransition,
        }}
        className="absolute pointer-events-none flex items-center justify-center bg-transparent"
      >
        {/* Free-Floating Dot: Square when orange/black background, Circle when on orange field */}
        <motion.div
          animate={{
            opacity: isSnapping ? 0 : 1,
            scale: isSnapping ? 0 : 1,
            borderRadius: isOverOrange ? "50%" : "0px",
            backgroundColor: isOverOrange ? "#ffffff" : "#ff4500",
          }}
          transition={{
            opacity: { duration: 0.12 },
            scale: { duration: 0.15 },
            borderRadius: { duration: 0.18, ease: "easeOut" },
            backgroundColor: { duration: 0.15, ease: "linear" },
          }}
          className="w-full h-full pointer-events-none"
        />

        {/* 4 Bounding Corner Brackets: Active only when snapping to hovered elements (always orange) */}
        {/* Top-Left Corner */}
        <motion.span
          animate={{
            opacity: isSnapping ? 1 : 0,
          }}
          transition={{ duration: 0.15 }}
          className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ff4500] pointer-events-none"
        />

        {/* Top-Right Corner */}
        <motion.span
          animate={{
            opacity: isSnapping ? 1 : 0,
          }}
          transition={{ duration: 0.15 }}
          className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ff4500] pointer-events-none"
        />

        {/* Bottom-Left Corner */}
        <motion.span
          animate={{
            opacity: isSnapping ? 1 : 0,
          }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ff4500] pointer-events-none"
        />

        {/* Bottom-Right Corner */}
        <motion.span
          animate={{
            opacity: isSnapping ? 1 : 0,
          }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ff4500] pointer-events-none"
        />
      </motion.div>
    </div>
  );
}
