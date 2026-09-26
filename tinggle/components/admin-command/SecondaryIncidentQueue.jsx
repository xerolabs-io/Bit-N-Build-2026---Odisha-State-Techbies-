"use client";

import React, { useState } from "react";
import { Layers, ArrowRight, ShieldCheck, CheckCircle2, Clock } from "lucide-react";

function formatElapsed(dateString) {
  if (!dateString) return "Just now";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

const CATEGORY_STYLES = {
  Fire: "text-red-400 bg-red-500/15 border-red-500/30",
  Hazard: "text-red-400 bg-red-500/15 border-red-500/30",
  Traffic: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  Transit: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  Utility: "text-teal-400 bg-teal-500/15 border-teal-500/30",
  Infrastructure: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  "Public Safety": "text-sky-400 bg-sky-500/15 border-sky-500/30",
};

export default function SecondaryIncidentQueue({
  incidents = [],
  selectedId = null,
  onSelectIncident = null,
  onUpdateIncident = null,
}) {
  const [actionLoading, setActionLoading] = useState({});

  const handleQuickVerify = async (e, inc) => {
    e.stopPropagation();
    if (!onUpdateIncident) return;
    setActionLoading((p) => ({ ...p, [inc.id]: true }));
    try {
      await onUpdateIncident(inc.id, {
        status: "OFFICIALLY VERIFIED",
        trust_score: "VERIFIED HIGH-CONFIDENCE",
      });
    } finally {
      setActionLoading((p) => ({ ...p, [inc.id]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-bold text-white font-heading flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          Active Incident Queue in Sector Operations
        </h3>
        <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
          {incidents.length} Synced on Wire
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="p-8 bg-[#141b2a] border border-white/10 rounded-xl text-center flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-400 font-mono">
            No incidents found in this filter sector.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((item) => {
            const isSelected = selectedId === item.id;
            const catStyle =
              CATEGORY_STYLES[item.category] ||
              "text-amber-400 bg-amber-500/15 border-amber-500/30";
            const isVerified = item.status === "OFFICIALLY VERIFIED";

            return (
              <div
                key={item.id}
                onClick={() => onSelectIncident?.(item)}
                className={`bg-[#141b2a] hover:bg-[#192235] border transition-all p-4 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                  isSelected
                    ? "border-amber-500/60 ring-1 ring-amber-500/30 bg-[#162136]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                      isSelected
                        ? "bg-amber-500 text-black font-bold"
                        : "bg-white/5 text-zinc-300"
                    }`}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-zinc-200 font-bold">
                        #{item.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${catStyle}`}
                      >
                        {item.category?.toUpperCase() || "ALERT"}
                      </span>
                      <span className="font-mono text-zinc-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {formatElapsed(item.created_at)}
                      </span>
                      {isVerified && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20">
                          VERIFIED
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm md:text-base font-bold text-white font-heading truncate mt-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-xl">
                      {item.location_text
                        ? `📍 ${item.location_text} — `
                        : ""}
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
                  <div className="text-right hidden sm:block mr-2 font-mono text-xs">
                    <div className="text-[10px] text-zinc-500 uppercase">
                      CONFIRMED
                    </div>
                    <div className="text-teal-400 font-semibold">
                      {item.confirm_count ?? 1} Reports
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIncident?.(item);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-black font-bold border-amber-400"
                        : "bg-[#1f283c] hover:bg-[#28354f] text-zinc-200 border-white/5"
                    }`}
                  >
                    {isSelected ? "Inspecting" : "Inspect Dossier"}
                  </button>

                  {!isVerified && (
                    <button
                      disabled={actionLoading[item.id]}
                      onClick={(e) => handleQuickVerify(e, item)}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-black transition-all text-xs font-mono tracking-wider font-semibold border border-teal-500/30 cursor-pointer"
                    >
                      {actionLoading[item.id] ? "Verifying..." : "Verify Wire"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
