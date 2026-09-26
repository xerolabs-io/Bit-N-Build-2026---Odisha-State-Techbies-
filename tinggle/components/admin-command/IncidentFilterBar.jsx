"use client";

import React from "react";
import { SlidersHorizontal, RefreshCw } from "lucide-react";

export default function IncidentFilterBar({
  activeFilter = "all",
  onFilterChange = null,
  incidents = [],
  onRefresh = null,
  refreshing = false,
}) {
  const allCount = incidents.length;
  const hazardCount = incidents.filter(
    (i) =>
      i.category === "Fire" ||
      i.category === "Hazard" ||
      i.status === "ESCALATED CODE RED"
  ).length;

  const trafficCount = incidents.filter(
    (i) => i.category === "Traffic" || i.category === "Transit"
  ).length;

  const pendingCount = incidents.filter(
    (i) =>
      !i.status ||
      i.status === "PENDING CIVIC CONFIRMATION" ||
      i.status === "REPORTED"
  ).length;

  const verifiedCount = incidents.filter(
    (i) => i.status === "OFFICIALLY VERIFIED" || (i.confirm_count ?? 0) >= 2
  ).length;

  const filterTabs = [
    { key: "all", label: `ALL INCIDENTS (${allCount})` },
    { key: "hazard", label: `HAZARDS & FIRE (${hazardCount})` },
    { key: "traffic", label: `TRAFFIC & TRANSIT (${trafficCount})` },
    { key: "pending", label: `PENDING REVIEW (${pendingCount})` },
    { key: "verified", label: `VERIFIED ALERTS (${verifiedCount})` },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111724] border border-white/10 p-3.5 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs text-zinc-400 px-1 uppercase font-semibold flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          FILTER SECTOR:
        </span>
        {filterTabs.map((t) => {
          const isActive = activeFilter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onFilterChange?.(t.key)}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 scale-[1.02]"
                  : "bg-[#1a2235] text-zinc-400 hover:text-zinc-200 hover:bg-[#222d44] border border-white/5"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-zinc-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          AUTO-REFRESH: 8s
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            title="Manual ledger refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-zinc-300 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
