"use client";

import React, { useState } from "react";
import { Layers, ArrowRight } from "lucide-react";

const QUEUE = [
  {
    id: "EMG-9039", tier: "TIER 2 INFRASTRUCTURE", tierColor: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    elapsed: "Active 34m", title: "BQE Overpass Structural Shift — Atlantic Ave Sector",
    desc: "Vibration sensors triggered at joint 4B. NY State DOT and Highway Patrol units establishing lane 1-2 closure.",
    deployed: "DOT 4 • NYHP 6", action: "Route Traffic", iconBg: "bg-amber-500/15 text-amber-400",
  },
  {
    id: "EMG-9035", tier: "TIER 2 TRANSIT GRID", tierColor: "text-sky-400 bg-sky-500/15 border-sky-500/30",
    elapsed: "Active 52m", title: "Subway Power Substation Trip at 14th St Union Square",
    desc: "L-Train and 4/5 express power loss on downtown bound tracks. 2 train sets held at station platforms. Evacuation in progress.",
    deployed: "MTA ERT 3 • EMS 2", action: "MTA Sync", iconBg: "bg-sky-500/15 text-sky-400",
  },
  {
    id: "EMG-9028", tier: "TIER 3 UTILITIES", tierColor: "text-teal-400 bg-teal-500/15 border-teal-500/30",
    elapsed: "Active 1h 14m", title: '36" Water Main Rupture on Canal & Hudson St',
    desc: "DEP crews on site isolating main gate valves. Basements along lower Canal receiving flood surge advisory.",
    deployed: "DEP 5 • NYPD 3", action: "DEP Valve Map", iconBg: "bg-teal-500/15 text-teal-400",
  },
];

export default function SecondaryIncidentQueue() {
  const [actioned, setActioned] = useState({});

  const handleAction = (id) => {
    setActioned((p) => ({ ...p, [id]: true }));
    setTimeout(() => setActioned((p) => ({ ...p, [id]: false })), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-bold text-white font-heading flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          Active Incident Queue in Sector Operations
        </h3>
        <span className="font-mono text-xs text-zinc-400">3 Queued for Moderation</span>
      </div>

      <div className="flex flex-col gap-3">
        {QUEUE.map((item) => (
          <div key={item.id} className="bg-[#141b2a] hover:bg-[#192235] border border-white/10 transition-colors p-4 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 border border-white/5`}>
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono text-zinc-300 font-semibold">#{item.id}</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${item.tierColor}`}>{item.tier}</span>
                  <span className="font-mono text-zinc-500 text-[11px]">{item.elapsed}</span>
                </div>
                <h4 className="text-sm md:text-base font-bold text-white font-heading truncate mt-1">{item.title}</h4>
                <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-xl">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <div className="text-right hidden sm:block mr-2 font-mono text-xs">
                <div className="text-[10px] text-zinc-500 uppercase">DEPLOYED</div>
                <div className="text-sky-400 font-semibold">{item.deployed}</div>
              </div>
              <button className="px-3.5 py-1.5 rounded-lg bg-[#1f283c] hover:bg-[#28354f] text-zinc-200 text-xs font-mono tracking-wider transition-colors border border-white/5 cursor-pointer">
                Inspect Dossier
              </button>
              <button
                onClick={() => handleAction(item.id)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black transition-all text-xs font-mono tracking-wider font-semibold border border-amber-500/30 cursor-pointer"
              >
                {actioned[item.id] ? "Active & Linked" : item.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
