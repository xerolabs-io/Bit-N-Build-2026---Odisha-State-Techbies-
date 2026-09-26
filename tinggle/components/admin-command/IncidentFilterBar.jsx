"use client";

import React, { useState } from "react";

const TIERS = [
  { key: "tier1", label: "TIER 1: HAZARD (3)", color: "bg-amber-500 text-black" },
  { key: "tier2", label: "TIER 2: INFRASTRUCTURE (5)", color: "bg-[#202c44] text-zinc-400" },
  { key: "tier3", label: "TIER 3: TRANSIT (12)", color: "bg-[#202c44] text-zinc-400" },
];

export default function IncidentFilterBar() {
  const [active, setActive] = useState("tier1");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111724] border border-white/5 p-3 rounded-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px] text-zinc-500 px-1 uppercase">FILTER TIER:</span>
        {TIERS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer ${
              active === t.key ? t.color : "bg-[#1a2235] text-zinc-500 hover:text-zinc-300 border border-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-zinc-500">AUTO-REFRESH: 4s</span>
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      </div>
    </div>
  );
}
