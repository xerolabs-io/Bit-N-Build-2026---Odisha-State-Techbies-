"use client";

import React from "react";
import { Radio } from "lucide-react";

export const FILTER_OPTIONS = [
  { id: "all", label: "ALL ISSUES" },
  { id: "near", label: "NEAR ME (< 1 MI)" },
  { id: "unverified", label: "NEEDS VOTES" },
  { id: "transit", label: "TRANSIT" },
  { id: "resolved", label: "RESOLVED TODAY" },
];

export default function FeedFilterTabs({ activeFilter, onSelectFilter, totalCount = 0 }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-white/5">
      {/* Title & Live Status */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase font-heading">
          Active Dispatches
        </h2>
        <span className="px-2 py-0.5 rounded-full bg-[#1e273a] text-zinc-400 text-[11px] font-mono border border-white/5">
          Live Sync
        </span>
        {totalCount > 0 && (
          <span className="text-xs text-amber-400/90 font-mono font-medium">
            ({totalCount})
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {FILTER_OPTIONS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold shadow-sm"
                  : "bg-[#141b29] hover:bg-[#1f283c] text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
