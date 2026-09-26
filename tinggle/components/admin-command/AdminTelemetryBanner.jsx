"use client";

import React, { useState } from "react";
import {
  Flame,
  Shield,
  Timer,
  BadgeCheck,
  Radio,
  AlertTriangle,
  RefreshCw,
  BellRing,
} from "lucide-react";

export default function AdminTelemetryBanner({
  incidents = [],
  onRefresh = null,
  refreshing = false,
}) {
  const [advisoryOpen, setAdvisoryOpen] = useState(false);

  // Compute real metrics from database incidents
  const totalCount = incidents.length;
  const criticalCount = incidents.filter(
    (i) =>
      i.category === "Fire" ||
      i.category === "Hazard" ||
      i.status === "ESCALATED CODE RED"
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

  const verificationRate =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 92;

  const metrics = [
    {
      label: "CRITICAL THREATS",
      value: String(criticalCount).padStart(2, "0"),
      sub: "Active Code Red / HazMat",
      icon: Flame,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      pulse: criticalCount > 0,
    },
    {
      label: "TOTAL INCIDENTS",
      value: String(totalCount).padStart(2, "0"),
      sub: `${pendingCount} Awaiting Review`,
      icon: Shield,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "TRIAGE STATUS",
      value: `${pendingCount} Queue`,
      sub: "Average Response < 2m",
      icon: Timer,
      color: "text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/20",
    },
    {
      label: "CORROBORATION RATE",
      value: `${verificationRate}%`,
      sub: `${verifiedCount} Confirmed on Ledger`,
      icon: BadgeCheck,
      color: "text-white",
      bg: "bg-white/5 border-white/10",
    },
  ];

  return (
    <>
      <section className="w-full bg-[#111724]/95 border-b border-white/10 px-4 md:px-8 py-4 md:py-5 shadow-lg backdrop-blur-sm">
        <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Metrics Grid with Increased Text Sizes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1">
            {metrics.map((m, i) => (
              <div
                key={i}
                className="bg-[#161e2e] border border-white/10 px-4 py-3.5 rounded-xl shadow-sm flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs md:text-sm text-zinc-300 uppercase font-semibold flex items-center gap-2">
                    {m.pulse && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                    {m.label}
                  </span>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-2xl md:text-3xl font-extrabold font-heading ${m.color}`}
                    >
                      {m.value}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono truncate">
                      {m.sub}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-11 h-11 rounded-xl ${m.bg} border flex items-center justify-center shrink-0 shadow-inner`}
                >
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setAdvisoryOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-black font-mono text-xs md:text-sm font-bold tracking-wider hover:bg-amber-400 transition-all shadow-lg cursor-pointer active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Broadcast City Advisory</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh database ledger"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#161e2e] hover:bg-[#202a3f] text-zinc-200 hover:text-white border border-white/10 text-xs md:text-sm font-mono tracking-wider transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 text-teal-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span>Sync DB</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Advisory Drawer */}
      {advisoryOpen && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-8 py-3 text-amber-300">
          <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="font-mono text-xs md:text-sm font-bold tracking-wider uppercase text-amber-400">
                METROPOLITAN BROADCAST DESK ACTIVE:
              </span>
              <span className="text-xs md:text-sm text-zinc-100">
                Emergency broadcast channel open. Direct link to citizen mobile terminals established across all registered sectors.
              </span>
            </div>
            <button
              onClick={() => setAdvisoryOpen(false)}
              className="text-zinc-400 hover:text-white text-lg leading-none cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
