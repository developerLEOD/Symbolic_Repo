import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, X, ArrowRight, Sparkles, Users } from "lucide-react";
import { ReferralSettings } from "../types";
import { getFriendDiscountPercentage } from "../lib/referralService";
import { soundManager } from "../lib/soundEffects";

interface ReferralNotificationProps {
  settings: ReferralSettings | null;
  onOpenReferral: () => void;
  isHomepage: boolean;
}

const STORAGE_KEY = "sym_referral_notif_dismissed";

export default function ReferralNotification({
  settings,
  onOpenReferral,
  isHomepage
}: ReferralNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if referral program is active and user is on homepage
    if (!settings?.isEnabled || !isHomepage) {
      setIsVisible(false);
      return;
    }

    // Check if already shown or dismissed in this specific browser tab session
    const hasShownInThisTab = typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "true";
    if (hasShownInThisTab) {
      setIsVisible(false);
      return;
    }

    // Smooth delay before popping in on the homepage in a new tab
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(STORAGE_KEY, "true");
        } catch {}
      }
      try {
        soundManager.playToggle(0.04);
      } catch {
        // audio context silent fallback
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [settings?.isEnabled, isHomepage]);

  const handleDismiss = () => {
    soundManager.playClick(0.1);
    setIsVisible(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // storage fallback
      }
    }
  };

  const handleAction = () => {
    soundManager.playClick(0.14);
    setIsVisible(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // storage fallback
      }
    }
    onOpenReferral();
  };

  if (!settings?.isEnabled) return null;

  const friendDiscount = getFriendDiscountPercentage(settings);
  const referrerReward = settings.referrerRewardPercentage ?? 20;
  const minOrders = settings.minimumReferrals ?? 2;
  const minVisits = settings.minimumVisits ?? 35;
  const headline = settings.headline || "REFER A FRIEND!";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          role="complementary"
          aria-label="Refer a Friend Notification"
          className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-[45] max-w-sm sm:max-w-md w-auto bg-brand-surface border-2 sm:border-[2.5px] border-brand-text shadow-[6px_6px_0px_#050505] font-mono text-brand-text overflow-hidden select-none"
        >
          {/* Top Banner Accent Line */}
          <div className="h-1 bg-brand-accent w-full" />

          <div className="p-3.5 sm:p-4 space-y-3">
            {/* Header / Sub-badge + Close Button */}
            <div className="flex items-center justify-between gap-2 border-b border-brand-text/15 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-accent animate-pulse shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 border border-brand-accent/30">
                  EXCLUSIVE PRIVILEGE
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-brand-text/60 hover:text-brand-text hover:bg-brand-text/10 p-1 border border-transparent hover:border-brand-text/20 transition-all cursor-pointer"
                title="Dismiss (Esc)"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>

            {/* Title & Gift Badge */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-brand-accent text-white flex items-center justify-center border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                <Gift size={20} className="animate-bounce" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h3 className="font-mono text-base sm:text-lg font-black uppercase tracking-tight text-brand-text leading-tight">
                  {headline}
                </h3>
                <p className="text-[10px] sm:text-[11px] font-sans text-brand-text/80 leading-snug">
                  Give friends <strong className="text-brand-accent font-mono font-black">{friendDiscount}% OFF</strong>. Unlock <strong className="text-brand-accent font-mono font-black">{referrerReward}% OFF</strong> for yourself when <strong className="underline decoration-brand-accent decoration-2">{minOrders} friends order</strong> <span className="font-bold text-brand-accent">OR</span> <strong className="underline decoration-brand-accent decoration-2">{minVisits} visitors</strong> browse through your link.
                </p>
              </div>
            </div>

            {/* Micro dual-milestone indicator */}
            <div className="bg-brand-bg border border-brand-text/25 px-2.5 py-1.5 flex items-center justify-between text-[8px] sm:text-[8.5px] uppercase font-bold text-brand-text/75">
              <span className="flex items-center gap-1.5">
                <Users size={11} className="text-brand-accent shrink-0" />
                <span>{minOrders} Orders <span className="text-brand-accent">OR</span> {minVisits} Visits</span>
              </span>
              <span className="font-black text-brand-accent">
                = {referrerReward}% OFF REWARD
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAction}
                className="flex-1 bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white py-2 px-3 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-2 border-brand-text shadow-[2px_2px_0px_#050505] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <span>GET REFERRAL LINK</span>
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-2 text-[10px] font-mono font-bold uppercase text-brand-text/60 hover:text-brand-text hover:bg-brand-text/5 border border-brand-text/30 transition-all cursor-pointer"
              >
                LATER
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
