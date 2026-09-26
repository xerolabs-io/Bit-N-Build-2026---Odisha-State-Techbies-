"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Map, Navigation2, Compass, AlertCircle } from "lucide-react";

export default function SpatialRadarWidget() {
  const [activePin, setActivePin] = useState(null);

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-sm">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
          <Map className="w-4 h-4 text-sky-400" />
          Live Spatial Radar
        </span>
        <span className="font-mono text-[11px] text-teal-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
          Real-time GPS Sync
        </span>
      </div>

      {/* Radar Map Container */}
      <div className="w-full h-56 rounded-xl relative overflow-hidden shadow-inner border border-white/10 group">
        <Image
          src="/stitch/radar_map.jpg"
          alt="Manhattan Spatial Radar Map"
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-90"
        />

        {/* Ambient Dark Overlay & Radar Grid Circles */}
        <div className="absolute inset-0 bg-[#0d131e]/40 pointer-events-none"></div>

        {/* Radar Ring Concentrics */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border border-sky-500/20 animate-ping opacity-20"></div>
          <div className="w-32 h-32 rounded-full border border-teal-500/30"></div>
          <div className="w-16 h-16 rounded-full border border-teal-500/40"></div>
        </div>

        {/* Interactive Cluster Pin 1 (Mulberry - Amber) */}
        <div
          onClick={() => setActivePin(activePin === 1 ? null : 1)}
          className="absolute top-9 left-12 group/pin cursor-pointer z-10"
        >
          <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center animate-ping absolute opacity-70"></div>
          <div className="w-5 h-5 bg-amber-500 border-2 border-black rounded-full flex items-center justify-center relative shadow-lg">
            <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
          </div>

          {/* Hover / Click Popup */}
          <div className="absolute left-6 -top-2 bg-[#090e18]/95 backdrop-blur-md border border-amber-500/40 px-2.5 py-1.5 rounded-lg shadow-xl text-left w-36 pointer-events-none opacity-0 group-hover/pin:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono text-amber-400 block font-bold">#UTL-8821</span>
            <span className="text-[11px] text-white block truncate">Water Main Break</span>
          </div>
        </div>

        {/* Interactive Cluster Pin 2 (7th Ave - Red) */}
        <div
          onClick={() => setActivePin(activePin === 2 ? null : 2)}
          className="absolute bottom-12 right-14 group/pin cursor-pointer z-10"
        >
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-ping absolute opacity-70"></div>
          <div className="w-5 h-5 bg-red-500 border-2 border-black rounded-full flex items-center justify-center relative shadow-lg">
            <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
          </div>

          {/* Hover / Click Popup */}
          <div className="absolute right-6 -top-2 bg-[#090e18]/95 backdrop-blur-md border border-red-500/40 px-2.5 py-1.5 rounded-lg shadow-xl text-left w-36 pointer-events-none opacity-0 group-hover/pin:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono text-red-400 block font-bold">#TRF-1049</span>
            <span className="text-[11px] text-white block truncate">Traffic Gridlock</span>
          </div>
        </div>

        {/* "YOU ARE HERE" Center Beacon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#080d17]/90 border border-sky-500/40 backdrop-blur-md px-3 py-1 rounded-full text-white font-mono text-[11px] shadow-lg flex items-center gap-1.5 z-20">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span>YOU ARE HERE</span>
        </div>
      </div>

      {/* Footer Info & Explore Link */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1 border-t border-white/5">
        <span className="flex items-center gap-1 text-zinc-300">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          3 Critical Clusters
        </span>
        <button
          type="button"
          onClick={() => alert("Full interactive city grid view initiated.")}
          className="text-amber-400 hover:text-amber-300 hover:underline transition-colors cursor-pointer"
        >
          Full Interactive Grid →
        </button>
      </div>
    </div>
  );
}
