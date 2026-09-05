/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Percent, 
  Award, 
  DollarSign, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle, 
  Share2, 
  Tag, 
  FileText,
  Calculator,
  ExternalLink,
  Flame,
  ArrowRight,
  Globe
} from "lucide-react";
import { ReferralSettings, ReferralRecord } from "../types";
import { 
  getReferralSettings, 
  updateReferralSettings, 
  getReferralRecords, 
  DEFAULT_REFERRAL_SETTINGS,
  getFriendDiscountPercentage
} from "../lib/referralService";
import { useAuth } from "../lib/AuthContext";

interface OwnerReferralManagerProps {
  onNotify: (type: "success" | "error", message: string) => void;
}

export default function OwnerReferralManager({ onNotify }: OwnerReferralManagerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReferralSettings>(DEFAULT_REFERRAL_SETTINGS);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Live simulation calculator
  const [simCartSubtotal, setSimCartSubtotal] = useState<number>(3500);

  useEffect(() => {
    loadSettings();
    loadRecords();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getReferralSettings();
      setSettings(data);
    } catch (err) {
      console.error("Error loading referral settings:", err);
      onNotify("error", "Failed to fetch referral settings.");
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    setLoadingRecords(true);
    try {
      const list = await getReferralRecords(50);
      setRecords(list);
    } catch (err) {
      console.error("Error loading referral records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateReferralSettings(settings, user?.email || "owner");
      setSettings(updated);
      onNotify("success", "Referral discount parameters successfully saved to Firestore.");
    } catch (err: any) {
      console.error("Error saving referral settings:", err);
      onNotify("error", err?.message || "Failed to update referral parameters.");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: "standard" | "generous" | "conservative") => {
    if (preset === "standard") {
      setSettings(prev => ({
        ...prev,
        isEnabled: true,
        discountPercentage: 0,
        minimumReferrals: 2,
        minimumVisits: 35,
        referrerRewardPercentage: 20,
        minimumOrderAmount: 1000,
        maxDiscountCap: 3000
      }));
      onNotify("success", "Applied Standard (2 Orders OR 35 Visits → 20% Referrer / 10% Friend) preset.");
    } else if (preset === "generous") {
      setSettings(prev => ({
        ...prev,
        isEnabled: true,
        discountPercentage: 0,
        minimumReferrals: 1,
        minimumVisits: 20,
        referrerRewardPercentage: 25,
        minimumOrderAmount: 800,
        maxDiscountCap: 5000
      }));
      onNotify("success", "Applied Generous (1 Order OR 20 Visits → 25% Referrer / 12% Friend) preset.");
    } else if (preset === "conservative") {
      setSettings(prev => ({
        ...prev,
        isEnabled: true,
        discountPercentage: 0,
        minimumReferrals: 3,
        minimumVisits: 50,
        referrerRewardPercentage: 15,
        minimumOrderAmount: 1500,
        maxDiscountCap: 2000
      }));
      onNotify("success", "Applied Conservative (3 Orders OR 50 Visits → 15% Referrer / 7% Friend) preset.");
    }
  };

  // Compute live simulated discount for Referrer with unlocked status
  const simRawDiscount = Math.round((simCartSubtotal * settings.referrerRewardPercentage) / 100);
  const simCappedDiscount = settings.maxDiscountCap > 0 
    ? Math.min(simRawDiscount, settings.maxDiscountCap) 
    : simRawDiscount;
  const isSimEligible = settings.isEnabled && (settings.minimumOrderAmount === 0 || simCartSubtotal >= settings.minimumOrderAmount);
  const simFinalDiscount = isSimEligible ? simCappedDiscount : 0;
  const simFinalTotal = Math.max(0, simCartSubtotal - simFinalDiscount + 500); // 500 shipping

  // Aggregate stats
  const totalDiscountGranted = records.reduce((acc, r) => acc + (r.discountApplied || 0), 0);
  const totalOrderVolume = records.reduce((acc, r) => acc + (r.orderTotal || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 font-mono">
        <RefreshCw size={24} className="animate-spin text-brand-accent" />
        <span className="text-xs font-black uppercase tracking-widest text-brand-text/70">
          INITIALIZING REFERRAL ENGINE...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 font-mono">
      {/* Top Banner & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-brand-text pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-brand-accent bg-brand-accent/10 px-2.5 py-0.5 border border-brand-accent/30">
              OWNER PRIVILEGE // STUDIO
            </span>
            <span className="text-[10px] text-brand-text/60 uppercase">FIRESTORE SETTINGS REGISTRY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-brand-text flex items-center gap-2.5">
            <Users size={22} className="text-brand-accent" />
            <span>FRIEND REFERRAL DISCOUNT LOGIC</span>
          </h2>
          <p className="text-xs text-brand-text/70 max-w-2xl mt-1 normal-case font-sans">
            Configure friend-to-friend acquisition incentives. Set qualification thresholds, referee discount percentages, and reward parameters stored directly in cloud Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1.5 border-2 border-brand-text flex items-center gap-2 shadow-[2px_2px_0px_#050505] text-[10px] font-black uppercase ${
            settings.isEnabled ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${settings.isEnabled ? "bg-white animate-pulse" : "bg-zinc-500"}`} />
            {settings.isEnabled ? "PROGRAM LIVE & ACTIVE" : "PROGRAM SUSPENDED"}
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-brand-accent text-white px-5 py-2 text-xs font-black uppercase tracking-wider border-2 border-brand-text shadow-[3px_3px_0px_#050505] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>SAVING TO FIRESTORE...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>SAVE PARAMETERS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analytics High-Level Stat Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505]">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Total Redemptions</span>
          <div className="text-2xl font-black mt-1 text-brand-text">{records.length}</div>
          <span className="text-[8px] text-brand-accent font-bold mt-0.5 block uppercase">Friend orders applied</span>
        </div>

        <div className="p-4 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505]">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Total Discounts Granted</span>
          <div className="text-2xl font-black mt-1 text-brand-text">Rs. {totalDiscountGranted.toLocaleString()}</div>
          <span className="text-[8px] opacity-60 mt-0.5 block uppercase">Customer savings</span>
        </div>

        <div className="p-4 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505]">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Friend Discount</span>
          <div className="text-2xl font-black mt-1 text-brand-accent">{getFriendDiscountPercentage(settings)}% OFF</div>
          <span className="text-[8px] opacity-60 mt-0.5 block uppercase">Half of Referrer Reward</span>
        </div>

        <div className="p-4 bg-brand-surface border-2 border-brand-text shadow-[3px_3px_0px_#050505]">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 block">Unlock Goal (OR)</span>
          <div className="text-lg sm:text-xl font-black mt-1 text-brand-text">{settings.minimumReferrals} Orders <span className="text-xs text-[#ff5500]">OR</span> {settings.minimumVisits ?? 35} Visits</div>
          <span className="text-[8px] text-emerald-600 font-bold mt-0.5 block uppercase">Unlocks {settings.referrerRewardPercentage}% reward</span>
        </div>
      </div>

      {/* Main Grid: Parameters Form (Left) & Simulator + Presets (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Section 1: Activation & Master Controls */}
            <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-brand-accent" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">PROGRAM ACTIVATION</h3>
                </div>
                <span className="text-[9px] font-bold uppercase text-brand-text/50">// STATE TOGGLE</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-brand-bg border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
                <div className="pr-4">
                  <div className="text-xs font-black uppercase text-brand-text">Enable Referral System</div>
                  <div className="text-[10px] text-brand-text/70 normal-case font-sans mt-0.5">
                    When active, customers can enter referral codes at checkout and earn reward percentages on account.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-zinc-300 peer-focus:outline-none border-2 border-brand-text peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-brand-text after:border after:h-4 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-text/70 mb-2 block">
                  FAST PRESETS (CLICK TO POPULATE):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("standard")}
                    className="p-2 border-2 border-brand-text bg-white hover:bg-brand-text hover:text-brand-bg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all text-center shadow-[1px_1px_0px_#050505] cursor-pointer"
                  >
                    STANDARD (2 Friends → 20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("generous")}
                    className="p-2 border-2 border-brand-text bg-white hover:bg-brand-text hover:text-brand-bg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all text-center shadow-[1px_1px_0px_#050505] cursor-pointer"
                  >
                    FAST (1 Friend → 25%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("conservative")}
                    className="p-2 border-2 border-brand-text bg-white hover:bg-brand-text hover:text-brand-bg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all text-center shadow-[1px_1px_0px_#050505] cursor-pointer"
                  >
                    HIGH (3 Friends → 15%)
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Percentage & Qualification Parameters */}
            <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-brand-accent" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">DISCOUNT & THRESHOLD VALUES</h3>
                </div>
                <span className="text-[9px] font-bold uppercase text-brand-text/50">// CORE LOGIC</span>
              </div>

              {/* Referrer Reward Percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black uppercase tracking-wider">
                    1. Referrer Reward Privilege Percentage
                  </label>
                  <span className="text-xs font-black text-[#ff5500]">{settings.referrerRewardPercentage}% OFF</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={settings.referrerRewardPercentage}
                    onChange={(e) => setSettings({ ...settings, referrerRewardPercentage: Number(e.target.value) })}
                    className="w-full accent-[#ff5500] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={settings.referrerRewardPercentage}
                    onChange={(e) => setSettings({ ...settings, referrerRewardPercentage: Math.max(1, Number(e.target.value)) })}
                    className="w-20 p-2 text-xs font-black border-2 border-brand-text bg-brand-bg text-right shadow-[2px_2px_0px_#050505]"
                  />
                </div>
                <p className="text-[10px] text-brand-text/60 font-sans">
                  The discount granted to the referrer once they satisfy either qualification milestone below.
                </p>
              </div>

              {/* Friend Discount Percentage (Reverted to Half) */}
              <div className="space-y-2 pt-2 border-t border-brand-text/10">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black uppercase tracking-wider">
                    2. Referred Friend Discount Rate
                  </label>
                  <span className="text-xs font-black text-brand-accent">{getFriendDiscountPercentage(settings)}% OFF (HALF OF REFERRER)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={settings.discountPercentage || 0}
                    onChange={(e) => setSettings({ ...settings, discountPercentage: Number(e.target.value) })}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.discountPercentage || 0}
                    onChange={(e) => setSettings({ ...settings, discountPercentage: Math.max(0, Number(e.target.value)) })}
                    className="w-20 p-2 text-xs font-black border-2 border-brand-text bg-brand-bg text-right shadow-[2px_2px_0px_#050505]"
                  />
                </div>
                <p className="text-[10px] text-brand-text/60 font-sans">
                  Friends receive half of the referrer discount ({Math.max(1, Math.floor(settings.referrerRewardPercentage / 2))}%). If manually set &gt; 0 above, that custom value applies.
                </p>
              </div>

              {/* DUAL UNLOCK OR HEADER */}
              <div className="p-3 bg-brand-bg border-2 border-brand-text text-center font-mono">
                <span className="text-[10px] font-black uppercase text-[#ff5500] tracking-widest block">
                  DUAL QUALIFICATION LOGIC: GOAL A [OR] GOAL B
                </span>
                <span className="text-[9px] text-brand-text/70 block mt-0.5">
                  The customer earns their reward as soon as EITHER threshold is achieved!
                </span>
              </div>

              {/* Goal A: Minimum Completed Friend Orders */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={13} className="text-[#ff5500]" />
                    <span>Goal A: Minimum Friend Checkout Orders</span>
                  </label>
                  <span className="text-xs font-black text-brand-text">{settings.minimumReferrals} ORDER(S)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.minimumReferrals}
                    onChange={(e) => setSettings({ ...settings, minimumReferrals: Number(e.target.value) })}
                    className="w-full accent-[#ff5500] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.minimumReferrals}
                    onChange={(e) => setSettings({ ...settings, minimumReferrals: Math.max(1, Number(e.target.value)) })}
                    className="w-20 p-2 text-xs font-black border-2 border-brand-text bg-brand-bg text-right shadow-[2px_2px_0px_#050505]"
                  />
                </div>
                <p className="text-[10px] text-brand-text/60 font-sans">
                  How many friend checkout orders must be placed using the referrer's code to unlock the discount.
                </p>
              </div>

              {/* Goal B: Minimum Website Unique Visits */}
              <div className="space-y-2 pt-2 border-t border-brand-text/10">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={13} className="text-brand-accent" />
                    <span>Goal B: Minimum Website Unique Visits</span>
                  </label>
                  <span className="text-xs font-black text-brand-accent">{settings.minimumVisits ?? 35} VISIT(S)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.minimumVisits ?? 35}
                    onChange={(e) => setSettings({ ...settings, minimumVisits: Number(e.target.value) })}
                    className="w-full accent-brand-accent cursor-pointer"
                  />
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={settings.minimumVisits ?? 35}
                    onChange={(e) => setSettings({ ...settings, minimumVisits: Math.max(1, Number(e.target.value)) })}
                    className="w-20 p-2 text-xs font-black border-2 border-brand-text bg-brand-bg text-right shadow-[2px_2px_0px_#050505]"
                  />
                </div>
                <p className="text-[10px] text-brand-text/60 font-sans">
                  Higher traffic milestone (e.g. 30 to 40 visits). If this many unique visitors browse the site through the member's referral link, reward unlocks even if no friend purchased yet!
                </p>
              </div>
            </div>

            {/* Section 3: Financial Safety Constraints */}
            <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-accent" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">ORDER CAPS & QUALIFIERS</h3>
                </div>
                <span className="text-[9px] font-bold uppercase text-brand-text/50">// MARGIN PROTECTION</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Minimum Cart Subtotal */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider block">
                    Min. Order Subtotal (Rs.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-brand-text/50">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={settings.minimumOrderAmount}
                      onChange={(e) => setSettings({ ...settings, minimumOrderAmount: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-10 pr-3 py-2 text-xs font-bold border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]"
                      placeholder="0 (no minimum)"
                    />
                  </div>
                  <span className="text-[9px] text-brand-text/60 block font-sans">
                    0 = applies to any cart. E.g. Rs. 1,000 ensures cart viability.
                  </span>
                </div>

                {/* Maximum Discount Ceiling */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider block">
                    Max Discount Cap (Rs.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-brand-text/50">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={settings.maxDiscountCap}
                      onChange={(e) => setSettings({ ...settings, maxDiscountCap: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-10 pr-3 py-2 text-xs font-bold border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]"
                      placeholder="0 (uncapped)"
                    />
                  </div>
                  <span className="text-[9px] text-brand-text/60 block font-sans">
                    Caps maximum deduction per order (e.g. Rs. 3,000 cap).
                  </span>
                </div>
              </div>

              {/* Referral Code Prefix */}
              <div className="space-y-1.5 pt-2 border-t border-brand-text/10">
                <label className="text-[11px] font-black uppercase tracking-wider block">
                  Generated Referral Code Prefix
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={settings.referralCodePrefix}
                    onChange={(e) => setSettings({ ...settings, referralCodePrefix: e.target.value.toUpperCase() })}
                    className="w-32 px-3 py-2 text-xs font-black uppercase border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]"
                  />
                  <span className="text-[10px] text-brand-text/70 font-sans">
                    Sample Member Code: <strong className="font-mono text-brand-accent">{settings.referralCodePrefix || "SYM"}-MEMBER-7A4B</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Public Editorial Messaging */}
            <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-4">
              <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-brand-accent" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">STOREFRONT EDITORIAL COPY</h3>
                </div>
                <span className="text-[9px] font-bold uppercase text-brand-text/50">// CUSTOMER MANIFESTO</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider block">
                  Banner Headline
                </label>
                <input
                  type="text"
                  value={settings.headline || ""}
                  onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
                  placeholder="THE CIRCLE // FRIEND REFERRAL PRIVILEGE"
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider block">
                  Customer Description / Policy Terms
                </label>
                <textarea
                  rows={3}
                  value={settings.description || ""}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Terms explaining how the referral program works to customers..."
                  className="w-full p-3 text-xs font-sans border-2 border-brand-text bg-brand-bg shadow-[2px_2px_0px_#050505]"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-accent text-white py-4 text-xs font-black uppercase tracking-widest border-2 border-brand-text shadow-[4px_4px_0px_#050505] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>SAVING REFERRAL PARAMETERS...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>DEPLOY REFERRAL PARAMETERS TO FIRESTORE</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Interactive Sandbox & Audit Log (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Discount Calculator Simulator */}
          <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-brand-accent" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">LIVE LOGIC SIMULATOR</h3>
              </div>
              <span className="text-[9px] font-bold uppercase text-brand-accent">// REAL-TIME</span>
            </div>

            <p className="text-[11px] text-brand-text/70 font-sans">
              Test how an incoming customer order calculates with your current parameter values:
            </p>

            <div className="space-y-3 bg-brand-bg p-4 border-2 border-brand-text shadow-[2px_2px_0px_#050505]">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase opacity-60">Simulated Cart Subtotal:</span>
                <span className="font-black font-mono">Rs. {simCartSubtotal.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="15000"
                step="250"
                value={simCartSubtotal}
                onChange={(e) => setSimCartSubtotal(Number(e.target.value))}
                className="w-full accent-brand-text cursor-pointer"
              />

              <div className="pt-3 border-t border-brand-text/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-70">Cart Subtotal</span>
                  <span className="font-bold">Rs. {simCartSubtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[#ff5500]">
                  <span>Referrer Reward Mode ({settings.referrerRewardPercentage}%)</span>
                  <span className="font-black">
                    {isSimEligible ? `-Rs. ${simFinalDiscount.toLocaleString()}` : "Not Eligible"}
                  </span>
                </div>

                <div className="flex justify-between text-brand-accent">
                  <span>Friend Checkout Mode ({getFriendDiscountPercentage(settings)}%)</span>
                  <span className="font-black">
                    {isSimEligible 
                      ? `-Rs. ${Math.min(
                          settings.maxDiscountCap > 0 ? settings.maxDiscountCap : Infinity,
                          Math.round((simCartSubtotal * getFriendDiscountPercentage(settings)) / 100)
                        ).toLocaleString()}` 
                      : "Not Eligible"}
                  </span>
                </div>

                {settings.maxDiscountCap > 0 && simRawDiscount > settings.maxDiscountCap && isSimEligible && (
                  <div className="text-[9px] text-amber-700 font-bold uppercase">
                    // Capped by Max Cap of Rs. {settings.maxDiscountCap.toLocaleString()} (was Rs. {simRawDiscount.toLocaleString()})
                  </div>
                )}

                {settings.minimumOrderAmount > 0 && simCartSubtotal < settings.minimumOrderAmount && (
                  <div className="text-[9px] text-red-600 font-bold uppercase">
                    // Ineligible: Below minimum subtotal of Rs. {settings.minimumOrderAmount.toLocaleString()}
                  </div>
                )}

                <div className="flex justify-between opacity-70">
                  <span>Standard Shipping</span>
                  <span>Rs. 500</span>
                </div>

                <div className="flex justify-between pt-2 border-t-2 border-brand-text text-sm font-black uppercase text-brand-text">
                  <span>Referrer Total Due</span>
                  <span className="font-mono">Rs. {simFinalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-brand-accent/5 border border-brand-accent/30 text-[10px] text-brand-text/80 space-y-1">
              <strong className="block uppercase text-brand-accent font-black">Qualification Protocol & OR Conditions:</strong>
              <div>• Self-referral is strictly blocked at checkout (cannot use own code).</div>
              <div>• Friends receive half of the referrer discount ({getFriendDiscountPercentage(settings)}% OFF) immediately.</div>
              <div>• Referrer unlocks their {settings.referrerRewardPercentage}% privilege when reaching EITHER:</div>
              <div className="pl-3 font-bold text-[#ff5500]">1. Goal A: {settings.minimumReferrals} successful friend checkout orders, OR</div>
              <div className="pl-3 font-bold text-[#ff5500]">2. Goal B: {settings.minimumVisits ?? 35} unique website visits via referral link.</div>
            </div>
          </div>

          {/* Recent Referral Redemptions */}
          <div className="p-5 sm:p-6 bg-brand-surface border-2 border-brand-text shadow-[4px_4px_0px_#050505] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-brand-text pb-3">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-brand-accent" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  RECENT REDEMPTIONS ({records.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={loadRecords}
                disabled={loadingRecords}
                className="p-1 hover:bg-brand-text/10 text-brand-text cursor-pointer"
                title="Refresh Redemptions"
              >
                <RefreshCw size={12} className={loadingRecords ? "animate-spin" : ""} />
              </button>
            </div>

            {records.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-brand-text/20 p-4 space-y-2">
                <Users size={24} className="mx-auto opacity-30" />
                <div className="text-xs font-bold uppercase opacity-60">No Referral Redemptions Yet</div>
                <p className="text-[10px] text-brand-text/60 font-sans">
                  When customers use friend referral codes at checkout, redemptions will log here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-brand-bg border border-brand-text/20 shadow-[1px_1px_0px_#050505] space-y-1 text-xs"
                  >
                    <div className="flex justify-between items-baseline font-black">
                      <span className="text-brand-accent uppercase">{rec.referrerCode}</span>
                      <span className="text-emerald-700 font-bold">-Rs. {rec.discountApplied?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-brand-text/70">
                      <span className="truncate max-w-[160px]">{rec.refereeEmail}</span>
                      <span className="opacity-50 font-mono">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
