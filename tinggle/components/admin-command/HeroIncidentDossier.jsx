"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Clock, Users, Compass, BellRing, ArrowRightLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function HeroIncidentDossier() {
  const [contained, setContained] = useState(false);
  const [evacSent, setEvacSent] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const handleEvac = () => {
    setEvacSent(true);
    setTimeout(() => setEvacSent(false), 3000);
  };

  return (
    <article className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header Strip */}
      <div className="bg-[#182236] border-b border-white/10 px-5 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            LEVEL 3 CRITICAL
          </span>
          <span className="font-mono text-xs text-zinc-300 font-semibold">CODE #EMG-9042-WEST</span>
          <span className="font-mono text-xs text-zinc-500">• Sector 04 MIDTOWN WEST</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5" /> Elapsed: 18m 42s
          </span>
          <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
            <Users className="w-3.5 h-3.5" /> FDNY / HAZMAT ON-SCENE
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left details */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-heading leading-tight">
                4-Alarm Chemical Haze &amp; Storage Blaze on 8th Ave
              </h2>
              <p className="text-sm text-zinc-300/90 mt-2 leading-relaxed">
                Midtown commercial warehouse distribution cellar. Multi-agency HazMat level II response deployed. Structural breach suspected on sub-level 2. Continuous particulate readings elevated.
              </p>
            </div>

            {/* Telemetry Pills */}
            <div className="grid grid-cols-3 gap-3 bg-[#0b101c] border border-white/5 p-3.5 rounded-xl">
              {[
                { label: "CITIZEN DISPATCHES", value: "418 Reports", sub: "98.2% Geo-Matched", subColor: "text-teal-400" },
                { label: "RESPONSE FORCE", value: "14 Units", sub: "Battalion 6, Eng 54", subColor: "text-zinc-400", valColor: "text-amber-400" },
                { label: "CASUALTY ESTIMATE", value: "0 Confirmed", sub: "3 Triage Cleared", subColor: "text-sky-400" },
              ].map((m, i) => (
                <div key={i} className="flex flex-col">
                  <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">{m.label}</span>
                  <span className={`text-base md:text-lg font-bold font-heading ${m.valColor || "text-white"}`}>{m.value}</span>
                  <span className={`font-mono text-[11px] ${m.subColor}`}>{m.sub}</span>
                </div>
              ))}
            </div>

            {/* Geo coords */}
            <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#0b101c] border border-white/5 px-4 py-2.5 rounded-xl flex-wrap gap-2">
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-mono text-zinc-200 font-semibold">40.7589° N, 73.9851° W</span>
                <span className="text-zinc-500 hidden sm:inline">— W 44th St &amp; 8th Avenue Intersection</span>
              </div>
              <span className="font-mono text-[11px] text-amber-400 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 uppercase font-semibold">
                PERIMETER: 300M
              </span>
            </div>
          </div>

          {/* Right: CCTV + sensor */}
          <div className="w-full md:w-64 lg:w-72 flex flex-col gap-3 shrink-0">
            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black/60 border border-white/10 group">
              <Image
                src="/stitch/admin/cctv_1.jpg"
                alt="Live Drone Surveillance Feed"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="288px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-mono text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                DRONE D-09 LIVE
              </div>
              <div className="absolute bottom-2 right-2.5 text-[10px] font-mono text-zinc-300 bg-black/75 px-1.5 py-0.5 rounded">
                FPS: 30 • 1080p
              </div>
            </div>

            <div className="bg-[#0b101c] border border-white/5 p-3 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-zinc-400 uppercase">AIR TOXICITY PPM</span>
                <span className="text-base font-bold text-amber-400 font-heading">142.8 μg</span>
              </div>
              <svg className="w-24 h-8 text-amber-400 overflow-visible" fill="none" viewBox="0 0 100 30">
                <path d="M0 25 L20 22 L40 26 L60 12 L80 16 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                <circle cx="100" cy="4" fill="currentColor" r="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Action Drawer */}
        <div className="bg-[#182236] -mx-5 md:-mx-6 -mb-5 md:-mb-6 p-4 md:p-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleEvac}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-mono tracking-wider flex items-center gap-1.5 font-bold hover:bg-amber-400 transition-all cursor-pointer shadow-lg"
            >
              <BellRing className="w-3.5 h-3.5" />
              {evacSent ? "Evac Broadcast Sent!" : "Push Public Evac Alert"}
            </button>
            <button className="px-3.5 py-2 rounded-xl bg-[#202c44] hover:bg-[#2a3a5a] text-zinc-200 text-xs font-mono tracking-wider flex items-center gap-1.5 transition-colors border border-white/5 cursor-pointer">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
              Reassign Field Units (14)
            </button>
            <button
              onClick={() => setEscalated(true)}
              className="px-3.5 py-2 rounded-xl bg-[#202c44] hover:bg-[#2a3a5a] text-zinc-200 text-xs font-mono tracking-wider flex items-center gap-1.5 transition-colors border border-white/5 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              {escalated ? "Escalated to Mayoral Ops" : "Escalate to Mayoral Brief"}
            </button>
          </div>
          <button
            onClick={() => setContained(true)}
            className={`px-4 py-2 rounded-xl font-mono text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              contained ? "bg-teal-500 text-black font-bold" : "bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-black border border-teal-500/40"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {contained ? "Perimeter Contained" : "Mark Perimeter Contained"}
          </button>
        </div>
      </div>
    </article>
  );
}
