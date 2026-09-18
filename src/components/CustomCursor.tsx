import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
}

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isOverOrange, setIsOverOrange] = useState(false);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const [isVisible, setIsVisible] = useState(false);

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

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const overOrange = checkOrangeBackground(target);
      setIsOverOrange(overOrange);

      const interactiveEl = target.closest(
        "a, button, input, select, textarea, [role='button'], .cursor-pointer, [data-cursor]"
      ) as HTMLElement | null;

      if (interactiveEl) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      const currentColor = isOverOrange ? "#050505" : "#ff4500";
      const newBurst = { id: Date.now(), x: e.clientX, y: e.clientY, color: currentColor };
      setBursts((prev) => [...prev.slice(-2), newBurst]);
    };

    const onMouseUp = () => {
      setIsClicked(false);
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    const onMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
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

      {/* Main Cursor Container with Spring Motion */}
      <motion.div
        style={{
          left: position.x,
          top: position.y,
        }}
        animate={{
          x: "-50%",
          y: "-50%",
          width: isHovered ? 34 : 12,
          height: isHovered ? 34 : 12,
          rotate: isHovered ? 90 : 0,
          scale: isClicked ? 0.75 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 480,
          damping: 26,
          mass: 0.12,
        }}
        className="absolute pointer-events-none flex items-center justify-center bg-transparent"
      >
        {/* Top-Left Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 9 : 6,
            height: isHovered ? 9 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute top-0 left-0 border-t-2 border-l-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Top-Right Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 9 : 6,
            height: isHovered ? 9 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute top-0 right-0 border-t-2 border-r-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Bottom-Left Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 9 : 6,
            height: isHovered ? 9 : 6,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute bottom-0 left-0 border-b-2 border-l-2 transition-colors duration-150 ${cursorColorClass}`}
        />

        {/* Bottom-Right Corner Bracket */}
        <motion.span
          animate={{
            width: isHovered ? 9 : 6,
            height: isHovered ? 9 : 6,
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
