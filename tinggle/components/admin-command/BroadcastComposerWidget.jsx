"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, Send, CheckCircle2, Zap } from "lucide-react";

export default function BroadcastComposerWidget({ selectedIncident = null }) {
  const [radius, setRadius] = useState("Sector 04 Metro (300m Excl. Zone)");
  const [copy, setCopy] = useState(
    "BUGLE EMERGENCY DESK: Active civic hazard detected. Sector emergency perimeter established. Exercise extreme caution."
  );
  const [dispatched, setDispatched] = useState(false);

  // Auto-update sample copy when incident changes
  useEffect(() => {
    if (selectedIncident) {
      const loc =
        selectedIncident.location_text ||
        `${Number(selectedIncident.latitude || 0).toFixed(3)}°N, ${Number(selectedIncident.longitude || 0).toFixed(3)}°E`;
      setCopy(
        `BUGLE DISPATCH: ${selectedIncident.category?.toUpperCase() || "HAZARD"} reported near ${loc}. "${selectedIncident.title}". Keep clear of perimeter.`
      );
      setRadius(`Incident #${selectedIncident.id} Perimeter (500m Excl. Zone)`);
    }
  }, [selectedIncident]);

  const handleDispatch = () => {
    setDispatched(true);
    setTimeout(() => setDispatched(false), 3500);
  };

  const handleAutoFill = () => {
    if (!selectedIncident) return;
    const loc =
      selectedIncident.location_text ||
      `${Number(selectedIncident.latitude || 0).toFixed(3)}°N, ${Number(selectedIncident.longitude || 0).toFixed(3)}°E`;
    setCopy(
      `BUGLE ADVISORY: ${selectedIncident.category?.toUpperCase() || "ALERT"} at ${loc}. ${selectedIncident.title}. Authorities on scene.`
    );
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col">
      <div className="bg-[#182236] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-sm md:text-base text-white font-bold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-400" />
          Broadcast Composer
        </span>
        <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          WEA Live Direct
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {selectedIncident && (
          <button
            onClick={handleAutoFill}
            className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Sync with Incident #{selectedIncident.id}</span>
          </button>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            TARGETED BROADCAST RADIUS
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full bg-[#0b101c] border border-white/10 text-zinc-100 px-3 py-2 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {selectedIncident && (
              <option>Incident #{selectedIncident.id} Perimeter (500m Excl. Zone)</option>
            )}
            <option>Sector 04 Metro (300m Excl. Zone)</option>
            <option>Metropolitan Central District</option>
            <option>City-Wide Multi-Sector Broadcast</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            PUSH COPY PREVIEW
          </label>
          <textarea
            rows={3}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            className="w-full bg-[#0b101c] border border-white/10 text-zinc-100 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
          <span>Chars: {copy.length}/160</span>
          <span className="text-teal-400 font-semibold">Tone: Authoritative / Calm</span>
        </div>

        <button
          onClick={handleDispatch}
          disabled={dispatched}
          className={`w-full py-2.5 rounded-xl font-mono text-xs tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
            dispatched
              ? "bg-teal-500 text-black font-extrabold"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {dispatched ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Advisory Dispatched to 148,000 Terminals</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Dispatch Wireless Emergency Alert (WEA)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
