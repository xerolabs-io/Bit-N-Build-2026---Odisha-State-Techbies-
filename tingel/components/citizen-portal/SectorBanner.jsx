"use client";

import React from "react";
import { Navigation, Activity, ShieldAlert } from "lucide-react";

export default function SectorBanner({
  sectorName = "MIDTOWN & LOWER MANHATTAN (RADIUS: 3.5 MI)",
  activeCount = 12,
  responseVelocity = "~4.2 min",
}) {
  return (
    <div className="w-full bg-[#111724]/90 border-b border-white/5 px-4 md:px-8 py-8 shadow-lg backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Titles & Sector Tag */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs tracking-wider uppercase font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                SECTOR 04 MONITOR
              </span>
              <span className="font-mono text-xs text-zinc-400 flex items-center gap-1.5 tracking-wide">
                <Navigation className="w-3.5 h-3.5 text-teal-400" />
                {sectorName}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-heading">
              Welcome back, <span className="text-amber-400 font-semibold">Citizen Reporter</span>
            </h1>

            <p className="text-sm md:text-base text-zinc-400 max-w-2xl leading-relaxed">
              Real-time communal ledger powered by local eyewitnesses. Track infrastructure anomalies, public transit bottlenecks, and civic updates.
            </p>
          </div>

          {/* Right: Metrics Pills */}
          <div className="flex items-center gap-4 shrink-0 bg-[#161d2d] border border-white/10 px-5 py-3 rounded-xl shadow-md self-start lg:self-auto">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-medium">
                Local Active Alerts
              </span>
              <span className="text-xl md:text-2xl font-bold text-amber-400 font-heading">
                {activeCount} Incidents
              </span>
            </div>

            <div className="w-px h-9 bg-white/10"></div>

            <div className="flex flex-col">
              <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-medium">
                Response Velocity
              </span>
              <span className="text-xl md:text-2xl font-bold text-teal-400 font-heading">
                {responseVelocity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
