"use client";

import React from "react";
import { Flame, Shield, Building2, Activity } from "lucide-react";

const AGENCIES = [
  {
    name: "FDNY Operations", sub: "Channel 4 • 10-75 Active", icon: Flame, iconColor: "text-amber-400",
    status: "ACTIVE SCENE", statusColor: "text-amber-400 bg-amber-500/15",
  },
  {
    name: "NYPD Central Dispatch", sub: "SOD Tactical Link Live", icon: Shield, iconColor: "text-sky-400",
    status: "PATROL GRID", statusColor: "text-sky-400 bg-sky-500/15",
  },
  {
    name: "OEM Command Desk", sub: "Cadre Delta Assigned", icon: Building2, iconColor: "text-teal-400",
    status: "COORDINATED", statusColor: "text-teal-400 bg-teal-500/15",
  },
];

export default function InterAgencyStatusWidget() {
  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col">
      <div className="bg-[#182236] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-sm md:text-base text-white font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          Inter-Agency Status
        </span>
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">ONLINE 100%</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {AGENCIES.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-[#0f1623] border border-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <a.icon className={`w-5 h-5 ${a.iconColor} shrink-0`} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{a.name}</span>
                <span className="font-mono text-[11px] text-zinc-500">{a.sub}</span>
              </div>
            </div>
            <span className={`font-mono text-[11px] font-bold px-2 py-1 rounded-lg ${a.statusColor}`}>
              {a.status}
            </span>
          </div>
        ))}

        {/* Hospital capacity */}
        <div className="p-3 bg-[#0f1623] border border-white/5 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span className="text-amber-400">+</span>
              Bellevue &amp; Mt. Sinai Trauma Capacity
            </span>
            <span className="text-amber-400 font-bold">78% Utilized</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: "78%" }} />
          </div>
          <span className="font-mono text-[10px] text-zinc-500 text-right">14 Critical Beds Remaining</span>
        </div>
      </div>
    </div>
  );
}
