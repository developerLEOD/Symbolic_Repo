import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
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
    document.body.classList.add("custom-cursor-active");

    const checkOrangeBackground = (el: HTMLElement | null): boolean => {
      let curr = el;
      while (curr && curr !== document.body) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        if (
          bg.includes("255, 69, 0") ||
          bg.includes("224, 64, 6") ||
          curr.classList.contains("bg-brand-accent") ||
          curr.classList.contains("bg-[#ff4500]") ||
          curr.classList.contains("bg-[#e04006]")
        ) {
          return true;
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

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      resetIdleTimer();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const overOrange = checkOrangeBackground(target);
      setIsOverOrange(overOrange);

      const interactiveEl = target.closest(
        "a, button, input, select, textarea, [role='button'], .cursor-pointer, [data-cursor]"
      ) as HTMLElement | null;

      if (interactiveEl) {
        const rect = interactiveEl.getBoundingClientRect();
        const padding = 6;
        
        // Clamp bounds to prevent overly massive framing if wrapper div is hovered
        const boundedWidth = Math.min(rect.width + padding * 2, 450);
        const boundedHeight = Math.min(rect.height + padding * 2, 280);

        setHoverBounds({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: boundedWidth,
          height: boundedHeight,
        });
        setIsHovered(true);
      } else {
        setHoverBounds(null);
        setIsHovered(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      resetIdleTimer();
      const currentColor = isOverOrange ? "#050505" : "#ff4500";
      const newBurst = { id: Date.now(), x: e.clientX, y: e.clientY, color: currentColor };
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
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isOverOrange]);

  useEffect(() => {
    if (bursts.length === 0) return;
    const timeout = setTimeout(() => {
      setBursts((prev) => prev.slice(1));
    }, 350);
    return () => clearTimeout(timeout);
  }, [bursts]);

  if (!isVisible) return null;

  const cursorColorClass = isOverOrange ? "border-[#050505]" : "border-[#ff4500]";
  const bgFillClass = isOverOrange ? "bg-[#050505]" : "bg-[#ff4500]";

  // Determine current position and size
  const targetX = isHovered && hoverBounds ? hoverBounds.x : position.x;
  const targetY = isHovered && hoverBounds ? hoverBounds.y : position.y;
  const targetWidth = isHovered && hoverBounds ? hoverBounds.width : 12;
  const targetHeight = isHovered && hoverBounds ? hoverBounds.height : 12;

  // Scale value: if idle and not hovering, pulse smoothly between 0.9 and 1.1
  const scaleAnimation = isClicked
    ? 0.75
    : isIdle && !isHovered
    ? [0.9, 1.1, 0.9]
    : 1;

  const scaleTransition = isIdle && !isHovered && !isClicked
    ? {
        repeat: Infinity,
        duration: 2.2,
        ease: "easeInOut",
      }
    : {
        type: "spring",
        stiffness: 520,
        damping: 28,
        mass: 0.1,
      };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* Click Burst Frame */}
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            style={{ left: b.x, top: b.y, borderColor: b.color }}
            initial={{ opacity: 1, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{ opacity: 0, scale: 1.8, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute w-8 h-8 border-2 bg-transparent pointer-events-none"
          />
        ))}
      </AnimatePresence>

      {/* Main Cursor Reticle Frame Snapping to Hovered Element Bounds */}
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
        transition={scaleTransition}
        className="absolute pointer-events-none flex items-center justify-center bg-transparent"
      >
        {/* Top-Left Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 10 : 6,
            height: isHovered ? 10 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute top-0 left-0 border-t-2 border-l-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Top-Right Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 10 : 6,
            height: isHovered ? 10 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute top-0 right-0 border-t-2 border-r-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Bottom-Left Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 10 : 6,
            height: isHovered ? 10 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute bottom-0 left-0 border-b-2 border-l-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Bottom-Right Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 10 : 6,
            height: isHovered ? 10 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute bottom-0 right-0 border-b-2 border-r-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Center Solid Fill - visible when not hovering, dissolves on hover */}
        <motion.div
          animate={{
            scale: isHovered ? 0 : 1,
            opacity: isHovered ? 0 : 1,
          }}
          transition={{ duration: 0.12, ease: "easeInOut" }}
          className={`w-full h-full transition-colors duration-150 ${bgFillClass}`}
        />
      </motion.div>
    </div>
  );
}
