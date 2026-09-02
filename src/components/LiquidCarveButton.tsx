import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface LiquidCarveButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark" | "outline";
  className?: string;
}

export default function LiquidCarveButton({
  children,
  variant = "primary",
  className = "",
  onClick,
  disabled,
  type = "button",
  ...props
}: LiquidCarveButtonProps) {
  // Brutalist tactile variants with stark borders, hard offset shadows, crisp hover/press
  const variantStyles = {
    primary: "bg-brand-text text-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-accent hover:border-brand-text hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#050505] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    dark: "bg-brand-text text-brand-bg border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-accent hover:border-brand-text hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#050505] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    secondary: "bg-brand-surface text-brand-text border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-text hover:text-brand-bg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#050505] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    outline: "bg-transparent text-brand-text border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:bg-brand-text hover:text-brand-bg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#050505] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative px-7 py-3.5 rounded-none font-mono text-[11px] uppercase tracking-widest font-black transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

