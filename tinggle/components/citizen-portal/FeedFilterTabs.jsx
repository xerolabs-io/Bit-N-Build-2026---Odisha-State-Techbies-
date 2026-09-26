"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

export const FILTER_OPTIONS = [
  { id: "all", label: "ALL ISSUES" },
  { id: "watchlist", label: "MY WATCHLIST" },
  { id: "near", label: "NEAR ME" },
  { id: "unverified", label: "NEEDS VOTES" },
  { id: "transit", label: "TRANSIT" },
  { id: "resolved", label: "RESOLVED" },
];

export default function FeedFilterTabs({ activeFilter, onSelectFilter, totalCount = 0, onRefresh, isRefreshing = false }) {
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
        {totalCount > 0 && (
          <span className="text-xs text-amber-400/90 font-mono font-medium">
            ({totalCount})
          </span>
        )}
      </div>

      {/* Filter Tabs + Refresh */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {FILTER_OPTIONS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${isActive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold shadow-sm"
                  : "bg-[#141b29] hover:bg-[#1f283c] text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Refresh button — flush with filter chips */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh feed"
            className="ml-1 p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283c] border border-transparent hover:border-white/10 text-zinc-500 hover:text-zinc-200 transition-all disabled:opacity-40 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}
