import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertCircle, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { soundManager } from "../lib/soundEffects";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
  notice?: string | null;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, notice, onSuccess }: AuthModalProps) {
  const { signInWithGoogle, formatAuthError } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Lock body scroll while modal is active
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        soundManager.playClick(0.08);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    soundManager.playClick(0.12);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[150] overflow-y-auto p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => {
          soundManager.playClick(0.08);
          onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-brand-bg/95 backdrop-blur-md border-2 sm:border-3 border-brand-text shadow-[8px_8px_0px_#050505] flex flex-col overflow-hidden my-auto"
        >
          {/* PINNED FIXED HEADER BAR: ALWAYS 100% VISIBLE AT THE TOP */}
          <div className="shrink-0 flex items-center justify-between border-b-2 border-brand-text px-4 py-3 sm:px-6 sm:py-3.5 bg-brand-bg select-none z-10 shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-brand-accent shadow-[1px_1px_0px_#050505]" />
              <span className="font-mono text-[11px] sm:text-xs font-black uppercase tracking-widest text-brand-text">
                SYMBOLIC // IDENTITY ACCESS
              </span>
            </div>
            <button 
              type="button"
              onClick={() => {
                soundManager.playClick(0.1);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-brand-text hover:bg-brand-text hover:text-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer group font-mono text-[10px] font-black uppercase select-none"
              title="Close Dialogue Box (Esc)"
              aria-label="Close dialog"
            >
              <span className="hidden sm:inline">CLOSE</span>
              <X size={15} className="text-brand-accent group-hover:text-brand-bg group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* DIALOG CONTENT BODY */}
          <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-5">
            {/* Context Notice (e.g. Mandatory Registration for Checkout) */}
            {notice && (
              <div className="p-3 bg-brand-accent/10 border-2 border-brand-accent text-brand-text flex items-start gap-2.5 font-mono shadow-[2px_2px_0px_#050505]">
                <ShieldCheck size={16} className="text-brand-accent shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <span className="font-black text-[10px] uppercase tracking-wider text-brand-accent block">
                    CUSTODY PROTOCOL NOTICE
                  </span>
                  <p className="text-[11px] font-bold uppercase leading-snug">
                    {notice}
                  </p>
                </div>
              </div>
            )}

            {/* Architectural Security Framing Description */}
            <div className="space-y-2 font-mono">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-surface border border-brand-text/30 text-[9.5px] font-bold uppercase tracking-wider text-brand-text/75">
                <Lock size={11} className="text-brand-accent" />
                <span>ZERO-CREDENTIAL AUTHENTICATION</span>
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-brand-text">
                ONE-CLICK VERIFIED SIGN IN
              </h3>
              <p className="text-[11.5px] text-brand-text/70 leading-relaxed font-mono">
                Symbolic uses verified Google Sign-In for cryptographic identity protection, artifact order tracking, and custody records. No passwords to remember or store.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border-2 border-red-500 text-red-600 flex items-start gap-2.5 font-mono text-xs font-bold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Google Sign In Action */}
            <div className="pt-1 space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-brand-surface hover:bg-brand-text hover:text-brand-bg text-brand-text border-2 border-brand-text font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[4px_4px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer disabled:opacity-50 select-none group"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? "AUTHENTICATING WITH GOOGLE..." : "CONTINUE WITH GOOGLE"}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick(0.08);
                    onClose();
                  }}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-text/60 hover:text-brand-text hover:underline cursor-pointer select-none"
                >
                  [ CANCEL & RETURN TO ARCHIVE ]
                </button>
              </div>
            </div>

            {/* Privacy / Security Notice */}
            <div className="pt-4 border-t border-brand-text/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-brand-text/60 select-none">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <ShieldCheck size={12} className="text-brand-accent" />
                FIREBASE GOOGLE AUTH
              </span>
              <span className="uppercase">OAUTH 2.0 // ZERO CREDENTIAL PRIVACY</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
