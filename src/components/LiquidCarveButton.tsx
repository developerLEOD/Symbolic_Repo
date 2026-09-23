import React, { useState } from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { soundManager } from "../lib/soundEffects";

interface LiquidCarveButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark" | "outline";
  className?: string;
  disableSound?: boolean;
}

export default function LiquidCarveButton({
  children,
  variant = "primary",
  className = "",
  onClick,
  onMouseEnter,
  disabled,
  disableSound = false,
  type = "button",
  ...props
}: LiquidCarveButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Brutalist tactile variants with stark borders, hard offset shadows, crisp hover/press
  const variantStyles = {
    primary: "bg-brand-text text-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-accent hover:border-brand-text hover:text-white hover:shadow-[6px_6px_0px_#050505] active:shadow-[1px_1px_0px_#050505]",
    dark: "bg-brand-text text-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-accent hover:border-brand-text hover:text-white hover:shadow-[6px_6px_0px_#050505] active:shadow-[1px_1px_0px_#050505]",
    secondary: "bg-brand-surface text-brand-text border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-text hover:text-brand-bg hover:shadow-[6px_6px_0px_#050505] active:shadow-[1px_1px_0px_#050505]",
    outline: "bg-transparent text-brand-text border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-text hover:text-brand-bg hover:shadow-[6px_6px_0px_#050505] active:shadow-[1px_1px_0px_#050505]"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !disableSound) {
      soundManager.playClick(0.16);
    }
    if (onClick) {
      onClick(e);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !disableSound) {
      soundManager.playHover(0.04);
    }
    setIsHovered(true);
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2.5, transition: { type: "spring", stiffness: 500, damping: 17 } }}
      whileTap={{ scale: 0.965, y: 0.5, transition: { type: "spring", stiffness: 650, damping: 14 } }}
      className={`relative px-7 py-3.5 rounded-none font-mono text-[11px] uppercase tracking-widest font-black transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden group ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Corner crosshairs micro-interaction */}
      <motion.span 
        animate={{ rotate: isHovered ? 90 : 0, scale: isHovered ? 1.25 : 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className="absolute top-0.5 left-1 text-[8px] font-mono select-none opacity-40 group-hover:opacity-100 transition-opacity"
      >
        +
      </motion.span>
      <motion.span 
        animate={{ rotate: isHovered ? -90 : 0, scale: isHovered ? 1.25 : 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className="absolute top-0.5 right-1 text-[8px] font-mono select-none opacity-40 group-hover:opacity-100 transition-opacity"
      >
        +
      </motion.span>

      {/* Diagonal scanline glint sweep on hover */}
      <motion.span
        initial={{ x: "-130%", skewX: -25 }}
        animate={{ x: isHovered ? "230%" : "-130%", skewX: -25 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-y-0 w-1/3 bg-white/25 pointer-events-none z-0"
      />

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

