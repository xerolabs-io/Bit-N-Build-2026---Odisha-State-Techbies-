"use client";

import React, { useState } from "react";
import { Bookmark, Plus, Bell, Check, X } from "lucide-react";

export default function NeighborhoodWatchlistWidget() {
  const [sectors, setSectors] = useState([
    {
      id: 1,
      name: "Home: East Village",
      statusText: "2 alerts within 800m",
      dotColor: "bg-red-500",
      enabled: true,
    },
    {
      id: 2,
      name: "Office: Financial District",
      statusText: "All corridors nominal",
      dotColor: "bg-teal-400",
      enabled: true,
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");

  const toggleSector = (id) => {
    setSectors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleAddSector = (e) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;

    setSectors((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newSectorName.trim(),
        statusText: "Monitoring grid active",
        dotColor: "bg-teal-400",
        enabled: true,
      },
    ]);
    setNewSectorName("");
    setIsAdding(false);
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          My Neighborhood Watchlist
        </span>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-sky-400 hover:text-sky-300 font-mono text-[11px] font-semibold hover:underline flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          ADD SECTOR
        </button>
      </div>

      {/* Add Sector Form */}
      {isAdding && (
        <form onSubmit={handleAddSector} className="flex items-center gap-2 bg-[#090e18] p-2 rounded-xl border border-white/10 animate-in fade-in">
          <input
            type="text"
            placeholder="e.g. Gym: Soho Broadway"
            value={newSectorName}
            onChange={(e) => setNewSectorName(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white px-2 py-1 outline-none font-sans"
            autoFocus
          />
          <button
            type="submit"
            className="p-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Watchlist Sectors */}
      <div className="space-y-2">
        {sectors.map((sector) => (
          <div
            key={sector.id}
            className="p-3 bg-[#0b101c] border border-white/5 rounded-xl flex items-center justify-between gap-3 transition-colors hover:bg-[#101726]"
          >
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{sector.name}</span>
                <span className={`w-2 h-2 rounded-full ${sector.dotColor}`}></span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {sector.statusText}
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={sector.enabled}
                onChange={() => toggleSector(sector.id)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#1c2438] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
