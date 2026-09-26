"use client";

import React, { useState } from "react";
import {
  Flame, Shield, Timer, BadgeCheck, Radio, AlertTriangle, SlidersHorizontal
} from "lucide-react";

export default function AdminTelemetryBanner({ onToggleAdvisory, onToggleEmergencyBanner }) {
  const [advisoryOpen, setAdvisoryOpen] = useState(false);

  const handleAdvisory = () => {
    setAdvisoryOpen((p) => !p);
    onToggleAdvisory?.();
  };

  return (
    <>
      <section className="w-full bg-[#111724]/95 border-b border-white/5 px-4 md:px-8 py-4 shadow-lg backdrop-blur-sm">
        <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {[
              { label: "CRITICAL THREAT", value: "07", sub: "Active Code Red", icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", pulse: true },
              { label: "DISPATCHED UNITS", value: null, sub: null, icon: Shield, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
              { label: "TRIAGE LATENCY", value: "1.4m", sub: "Median Target", icon: Timer, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
              { label: "TELEMETRY SCORE", value: "91.4%", sub: "Direct Corroborated", icon: BadgeCheck, color: "text-zinc-300", bg: "bg-white/5 border-white/10" },
            ].map((m, i) => (
              <div key={i} className="bg-[#161e2e] border border-white/10 px-4 py-3 rounded-xl shadow-sm flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[11px] text-zinc-400 uppercase flex items-center gap-1.5">
                    {m.pulse && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                    {m.label}
                  </span>
                  {i === 1 ? (
                    <div className="flex items-baseline gap-2 mt-0.5 font-mono text-xs font-semibold">
                      <span className="text-sky-400">FD: 14</span>
                      <span className="text-blue-300">PD: 22</span>
                      <span className="text-teal-400">EMS: 8</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-xl md:text-2xl font-bold font-heading ${m.color === "text-zinc-300" ? "text-white" : m.color}`}>{m.value}</span>
                      <span className="text-xs text-zinc-400 font-mono">{m.sub}</span>
                    </div>
                  )}
                </div>
                <div className={`w-9 h-9 rounded-lg ${m.bg} border flex items-center justify-center shrink-0`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleAdvisory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-black font-mono text-xs font-bold tracking-wider hover:bg-amber-400 transition-all shadow-lg cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Broadcast City Advisory</span>
            </button>
            <button
              onClick={onToggleEmergencyBanner}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161e2e] hover:bg-[#202a3f] text-zinc-200 hover:text-white border border-white/10 text-xs font-mono tracking-wider transition-colors cursor-pointer shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Emergency Web Banner</span>
            </button>
            <button className="p-2.5 rounded-xl bg-[#161e2e] hover:bg-[#202a3f] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Advisory Drawer */}
      {advisoryOpen && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-8 py-2.5 text-amber-300">
          <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-amber-400">LIVE METROPOLITAN BANNER ACTIVE:</span>
              <span className="text-xs text-zinc-100">Midtown Manhattan Sector 04 under Shelter-In-Place recommendation. Industrial haze dispersal active.</span>
            </div>
            <button onClick={() => setAdvisoryOpen(false)} className="text-zinc-400 hover:text-white text-lg leading-none cursor-pointer">✕</button>
          </div>
        </div>
      )}
    </>
  );
}
