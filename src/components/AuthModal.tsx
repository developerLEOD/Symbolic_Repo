import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import LiquidCarveButton from "./LiquidCarveButton";
import { soundManager } from "../lib/soundEffects";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
  notice?: string | null;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, defaultTab = "signin", notice, onSuccess }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset, formatAuthError } = useAuth();
  
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setError(null);
      setResetSent(false);
      // Lock body scroll while modal is active
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, defaultTab]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "signin") {
        if (!email.trim() || !password) {
          throw new Error("Please enter both email and password.");
        }
        await signInWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else if (tab === "signup") {
        if (!email.trim() || !password) {
          throw new Error("Please provide an email and password.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters in length.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await signUpWithEmail(email, password, displayName);
        onSuccess?.();
        onClose();
      } else if (tab === "forgot") {
        if (!email.trim()) {
          throw new Error("Please enter your registered email address.");
        }
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
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
          className="relative w-full max-w-md bg-brand-bg/95 backdrop-blur-md border-2 sm:border-3 border-brand-text shadow-[8px_8px_0px_#050505] flex flex-col max-h-[min(90vh,760px)] sm:max-h-[min(88vh,800px)] overflow-hidden my-auto"
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

          {/* SCROLLABLE DIALOG CONTENT BODY */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 overscroll-contain">
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

            {/* Nav Tabs */}
            {tab !== "forgot" ? (
              <div className="grid grid-cols-2 gap-2 font-mono text-xs font-black uppercase">
                <button
                  type="button"
                  onClick={() => { 
                    soundManager.playToggle(0.06);
                    setTab("signin"); 
                    setError(null); 
                  }}
                  className={`py-2 px-3 text-center border-2 border-brand-text transition-all cursor-pointer select-none ${
                    tab === "signin"
                      ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                      : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                  }`}
                >
                  [ SIGN IN ]
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    soundManager.playToggle(0.06);
                    setTab("signup"); 
                    setError(null); 
                  }}
                  className={`py-2 px-3 text-center border-2 border-brand-text transition-all cursor-pointer select-none ${
                    tab === "signup"
                      ? "bg-brand-text text-brand-bg shadow-[2px_2px_0px_#050505]"
                      : "bg-brand-surface text-brand-text hover:bg-brand-text/10"
                  }`}
                >
                  [ CREATE ACCOUNT ]
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-brand-text/20 pb-2.5">
                <span className="font-mono text-xs font-black uppercase tracking-widest text-brand-accent">
                  [ ACCOUNT RECOVERY ]
                </span>
                <button
                  type="button"
                  onClick={() => { 
                    soundManager.playClick(0.08);
                    setTab("signin"); 
                    setError(null); 
                    setResetSent(false); 
                  }}
                  className="font-mono text-[10px] font-bold uppercase underline hover:text-brand-accent cursor-pointer"
                >
                  ← Return to Sign In
                </button>
              </div>
            )}

            {/* Quick Google Sign In */}
            {tab !== "forgot" && (
              <div className="space-y-3.5">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-brand-surface border-2 border-brand-text font-mono text-xs font-black uppercase tracking-wider text-brand-text hover:bg-brand-text hover:text-brand-bg transition-all shadow-[3px_3px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50 select-none"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>CONTINUE WITH GOOGLE</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-brand-text/30 w-full"></div>
                  <span className="bg-brand-bg px-3 font-mono text-[9px] font-bold uppercase tracking-widest text-brand-text/60">
                    OR WITH CREDENTIALS
                  </span>
                  <div className="border-t border-brand-text/30 w-full"></div>
                </div>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div className="p-3 bg-red-500/10 border-2 border-red-500 text-red-600 flex items-start gap-2.5 font-mono text-xs font-bold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="p-3 bg-green-500/10 border-2 border-green-600 text-green-700 flex items-start gap-2.5 font-mono text-xs font-bold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" />
                <div>
                  <p className="uppercase">Password reset link transmitted.</p>
                  <p className="text-[11px] font-normal mt-1 text-green-800">
                    Check your inbox for instructions to reset your access code.
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
              {tab === "signup" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                    FULL NAME / ALIAS
                  </label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2 text-xs uppercase font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                  EMAIL ADDRESS *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              {tab !== "forgot" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text">
                      PASSWORD *
                    </label>
                    {tab === "signin" && (
                      <button
                        type="button"
                        onClick={() => { 
                          soundManager.playClick(0.08);
                          setTab("forgot"); 
                          setError(null); 
                        }}
                        className="text-[9px] uppercase font-bold text-brand-accent hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              )}

              {tab === "signup" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-brand-text mb-1">
                    CONFIRM PASSWORD *
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/50" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-brand-surface border-2 border-brand-text pl-9 pr-3 py-2 text-xs font-bold text-brand-text focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              )}

              <div className="pt-1.5">
                <LiquidCarveButton
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-full py-3 text-xs font-mono font-black uppercase"
                >
                  {loading ? (
                    <span>TRANSMITTING...</span>
                  ) : tab === "signin" ? (
                    <span className="flex items-center justify-center gap-2">
                      AUTHENTICATE & ENTER <ArrowRight size={14} />
                    </span>
                  ) : tab === "signup" ? (
                    <span className="flex items-center justify-center gap-2">
                      INITIALIZE ACCOUNT <ArrowRight size={14} />
                    </span>
                  ) : (
                    <span>TRANSMIT RESET LINK</span>
                  )}
                </LiquidCarveButton>
              </div>
            </form>

            {/* Secondary Cancel & Return button */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick(0.08);
                  onClose();
                }}
                className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-brand-text/60 hover:text-brand-text hover:underline cursor-pointer select-none"
              >
                [ CANCEL & RETURN TO ARCHIVE ]
              </button>
            </div>

            {/* Privacy / Security Notice */}
            <div className="pt-3 border-t border-brand-text/20 flex items-center justify-between text-[9px] font-mono text-brand-text/60 select-none">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <ShieldCheck size={12} className="text-brand-accent" />
                FIREBASE SECURE AUTH
              </span>
              <span className="uppercase">END-TO-END VERIFIED</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
