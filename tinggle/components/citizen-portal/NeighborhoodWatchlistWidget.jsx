"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  Plus,
  Check,
  X,
  Trash2,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Search,
  Compass,
} from "lucide-react";

export default function NeighborhoodWatchlistWidget({
  watchlist = [],
  incidents = [],
  onWatchlistChange,
  isSaving = false,
  isLoading = false,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const formRef = useRef(null);

  // Auto-suggestion fetch with 280ms debounce
  useEffect(() => {
    const query = newSectorName.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setShowDropdown(data.suggestions.length > 0);
        }
      } catch (err) {
        console.warn("Location suggestion error:", err.message);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [newSectorName]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (formRef.current && !formRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count incidents matching a sector name
  const countAlertsForSector = (sectorName) => {
    if (!sectorName) return 0;
    const term = sectorName.toLowerCase().trim();
    return incidents.filter((inc) => {
      const loc = (inc.location || inc.location_text || "").toLowerCase();
      const title = (inc.title || "").toLowerCase();
      const desc = (inc.description || "").toLowerCase();
      return loc.includes(term) || title.includes(term) || desc.includes(term);
    }).length;
  };

  // Toggle sector enabled/disabled
  const handleToggle = (id) => {
    const updated = watchlist.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    if (onWatchlistChange) onWatchlistChange(updated);
  };

  // Delete a sector
  const handleDelete = (id) => {
    const updated = watchlist.filter((s) => s.id !== id);
    if (onWatchlistChange) onWatchlistChange(updated);
  };

  // Add new sector with specific name
  const addSectorDirectly = (nameToAdd) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;

    // Check duplicate
    if (watchlist.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewSectorName("");
      setSuggestions([]);
      setShowDropdown(false);
      setIsAdding(false);
      return;
    }

    const newSector = {
      id: "sec-" + Date.now(),
      name: trimmed,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...watchlist, newSector];
    if (onWatchlistChange) onWatchlistChange(updated);

    setNewSectorName("");
    setSuggestions([]);
    setShowDropdown(false);
    setIsAdding(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0 && showDropdown) {
      // Pick first suggestion if available or input
      addSectorDirectly(suggestions[0].name);
    } else {
      addSectorDirectly(newSectorName);
    }
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-200 font-semibold">
            Neighborhood Watchlist
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="font-mono text-[10px] text-zinc-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              Saving...
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsAdding(!isAdding);
              setNewSectorName("");
              setSuggestions([]);
              setShowDropdown(false);
            }}
            className="text-sky-400 hover:text-sky-300 font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD SECTOR
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 leading-snug">
        Add sectors, cities, or neighborhoods to prioritize their alerts in your feed right after your current location.
      </p>

      {/* Add Sector Form with Auto-Suggestions */}
      {isAdding && (
        <div ref={formRef} className="relative z-30">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 bg-[#090e18] p-2 rounded-xl border border-sky-500/30 shadow-lg animate-in fade-in"
          >
            <div className="flex items-center pl-1 text-zinc-400">
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 text-sky-400" />
              )}
            </div>

            <input
              type="text"
              placeholder="Type city or area (e.g. Bhubaneswar, Saheed Nagar...)"
              value={newSectorName}
              onChange={(e) => {
                setNewSectorName(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              className="flex-1 bg-transparent text-xs text-white px-1 py-1 outline-none font-sans placeholder:text-zinc-500"
              autoFocus
            />

            <button
              type="submit"
              disabled={!newSectorName.trim()}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewSectorName("");
                setSuggestions([]);
                setShowDropdown(false);
              }}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Floating Auto-suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f172a] border border-sky-500/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-1 z-50">
              <div className="px-3 py-1.5 bg-sky-500/10 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400" />
                  Suggestions (Free OpenStreetMap)
                </span>
                <span className="text-zinc-500">Click to add</span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addSectorDirectly(item.name)}
                    className="w-full text-left px-3 py-2 hover:bg-sky-500/15 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white group-hover:text-amber-300 truncate">
                        {item.name}
                      </div>
                      {item.secondary && (
                        <div className="text-[10px] text-zinc-400 truncate">
                          {item.secondary}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watchlist Sectors */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="p-4 bg-[#0b101c]/60 border border-white/5 rounded-xl text-center flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-xs text-zinc-400 font-mono">
              Loading watched sectors...
            </span>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-4 bg-[#0b101c]/70 border border-dashed border-white/10 rounded-xl text-center flex flex-col items-center gap-1.5">
            <MapPin className="w-5 h-5 text-zinc-500" />
            <span className="text-xs text-zinc-300 font-mono font-medium">
              No watched sectors yet
            </span>
            <span className="text-[10px] text-zinc-400">
              Click &quot;ADD SECTOR&quot; to follow news in other neighborhoods.
            </span>
          </div>
        ) : (
          watchlist.map((sector) => {
            const alertCount = countAlertsForSector(sector.name);
            return (
              <div
                key={sector.id}
                className={`p-3 bg-[#0b101c] border rounded-xl flex items-center justify-between gap-3 transition-colors ${
                  sector.enabled
                    ? "border-white/10 hover:border-white/20 hover:bg-[#101726]"
                    : "border-white/5 opacity-60 hover:opacity-80"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="truncate">{sector.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        !sector.enabled
                          ? "bg-zinc-600"
                          : alertCount > 0
                          ? "bg-amber-400 animate-pulse"
                          : "bg-emerald-400"
                      }`}
                    />
                  </div>

                  <div className="text-[11px] font-mono mt-0.5 flex items-center gap-1.5">
                    {!sector.enabled ? (
                      <span className="text-zinc-500">Monitoring paused</span>
                    ) : alertCount > 0 ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {alertCount} alert{alertCount > 1 ? "s" : ""} active
                      </span>
                    ) : (
                      <span className="text-emerald-400/90 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        All corridors nominal
                      </span>
                    )}
                  </div>
                </div>

                {/* Right controls: Toggle switch & Delete */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sector.enabled}
                      onChange={() => handleToggle(sector.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1c2438] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>

                  <button
                    onClick={() => handleDelete(sector.id)}
                    title="Remove sector"
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer sync badge */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
        <span>Active Watched: {watchlist.filter((s) => s.enabled).length}</span>
        <span className="text-zinc-400">Auto-saved to database</span>
      </div>
    </div>
  );
}
