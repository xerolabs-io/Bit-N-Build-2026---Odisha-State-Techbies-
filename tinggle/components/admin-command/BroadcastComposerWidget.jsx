"use client";

import React, { useState } from "react";
import { Megaphone, Send, CheckCircle2 } from "lucide-react";

export default function BroadcastComposerWidget() {
  const [radius, setRadius] = useState("Sector 04 Midtown (300m Excl. Zone)");
  const [copy, setCopy] = useState("BUGLE EMERGENCY DESK: Commercial hazard on 8th Ave btwn 43/45 St. Keep windows sealed. Shelter in place Midtown Sector 4.");
  const [dispatched, setDispatched] = useState(false);

  const handleDispatch = () => {
    setDispatched(true);
    setTimeout(() => setDispatched(false), 3500);
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col">
      <div className="bg-[#182236] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-sm md:text-base text-white font-bold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-400" />
          Broadcast Composer
        </span>
        <span className="font-mono text-xs text-zinc-400">WEA Direct Feed</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">TARGETED RADIUS</label>
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full bg-[#0b101c] border border-white/10 text-zinc-100 px-3 py-2 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option>Sector 04 Midtown (300m Excl. Zone)</option>
            <option>Borough of Manhattan Wide</option>
            <option>All Five Boroughs (Emergency Only)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">PUSH COPY PREVIEW</label>
          <textarea
            rows={3}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            className="w-full bg-[#0b101c] border border-white/10 text-zinc-100 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
          <span>Chars: {copy.length}/160</span>
          <span className="text-teal-400">Tone: Authoritative / Calm</span>
        </div>

        <button
          onClick={handleDispatch}
          disabled={dispatched}
          className={`w-full py-2.5 rounded-xl font-mono text-xs tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            dispatched
              ? "bg-teal-500 text-black"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {dispatched ? (
            <><CheckCircle2 className="w-4 h-4" /><span>Advisory Dispatched to 148,000 Nodes</span></>
          ) : (
            <><Send className="w-4 h-4" /><span>Dispatch Wireless Emergency Alert (WEA)</span></>
          )}
        </button>
      </div>
    </div>
  );
}
