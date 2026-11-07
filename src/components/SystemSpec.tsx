/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldCheck, Compass, Sliders, Zap } from "lucide-react";

export default function SystemSpec() {
  return (
    <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto font-mono select-none">
      <div className="bg-brand-surface border-2 border-brand-text p-6 sm:p-10 shadow-[6px_6px_0px_#050505] space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-brand-text pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent text-white text-[9.5px] font-black uppercase tracking-widest border border-brand-text shadow-[2px_2px_0px_#050505]">
              <span className="w-2 h-2 bg-white animate-pulse" />
              <span>SYSTEM SPECIFICATION // ATELIER MANDATE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-brand-text">
              THE MANIFESTO OF MATERIAL INTEGRITY
            </h2>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-text/70 bg-brand-bg px-3 py-1.5 border border-brand-text">
            STATUS: 100% SECURE & OPERATIONAL
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] space-y-3">
            <div className="flex items-center gap-2 text-brand-accent">
              <ShieldCheck size={20} />
              <span className="font-black text-xs uppercase tracking-wider">01. SOVEREIGN TEXTILES</span>
            </div>
            <p className="text-[11px] uppercase leading-relaxed text-brand-text/80">
              Heavyweight combed cotton and stoneware vessels forged without compromise. Every artifact is a physical statement of endurance.
            </p>
          </div>

          <div className="p-5 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] space-y-3">
            <div className="flex items-center gap-2 text-brand-accent">
              <Compass size={20} />
              <span className="font-black text-xs uppercase tracking-wider">02. UNCOMPROMISED GAZE</span>
            </div>
            <p className="text-[11px] uppercase leading-relaxed text-brand-text/80">
              Designed for public posture and dignified restraint. No telemetry, no logs, absolute privacy for every custodian.
            </p>
          </div>

          <div className="p-5 bg-brand-bg border-2 border-brand-text shadow-[3px_3px_0px_#050505] space-y-3">
            <div className="flex items-center gap-2 text-brand-accent">
              <Zap size={20} />
              <span className="font-black text-xs uppercase tracking-wider">03. DIRECT TRANSMISSION</span>
            </div>
            <p className="text-[11px] uppercase leading-relaxed text-brand-text/80">
              Direct-to-artifact dispatch across canonical lines. Acquired with clear purpose, worn with steadfast conviction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
