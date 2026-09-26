"use client";

import React from "react";
import Image from "next/image";
import { Satellite, Crosshair } from "lucide-react";

export default function ActiveThreatSectorMap() {
  return (
    <div className="bg-[#141b2a] border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-1.5 text-zinc-300 uppercase tracking-wider font-semibold">
          <Satellite className="w-4 h-4 text-sky-400" />
          Metropolitan Active Threat Sector Visualizer
        </span>
        <span className="text-amber-400 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="w-full h-56 rounded-xl overflow-hidden relative border border-white/10 group">
        <Image
          src="/stitch/admin/admin_map.jpg"
          alt="Metropolitan Threat Grid"
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-90"
          sizes="500px"
        />
        <div className="absolute inset-0 bg-[#080d17]/30 pointer-events-none" />
        <div className="absolute top-3.5 left-3.5 bg-[#080d17]/90 border border-amber-500/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-xs flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          SECTOR 04 HOTSPOT (8th Ave &amp; 44th St)
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Crosshair className="w-12 h-12 text-amber-400/60 animate-pulse" />
        </div>
        <div className="absolute bottom-3.5 right-3.5 bg-[#080d17]/90 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-xs flex items-center gap-4">
          <span className="text-amber-400 font-bold">14 Active Units Tracked</span>
          <span className="text-teal-400">Drone Link: LOCKED</span>
        </div>
      </div>
    </div>
  );
}
