"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map,
  Layers,
  Wifi,
  RefreshCw,
  Globe,
  Plus,
  Minus,
  LocateFixed,
  Navigation,
  Compass,
} from "lucide-react";

// ── Fix Leaflet default icon path issue with webpack ─────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Citizen Incident Category → emoji + color ────────────────────────────────
const CATEGORY_STYLE = {
  Crime: { emoji: "🚨", color: "#f97316" },
  Fire: { emoji: "🔥", color: "#ef4444" },
  Accident: { emoji: "🚗", color: "#f59e0b" },
  Medical: { emoji: "🏥", color: "#ec4899" },
  Suspicious: { emoji: "👁️", color: "#a78bfa" },
  Vandalism: { emoji: "🪟", color: "#fb923c" },
  Traffic: { emoji: "🚦", color: "#facc15" },
  Transit: { emoji: "🚌", color: "#60a5fa" },
  Flood: { emoji: "🌊", color: "#38bdf8" },
  Earthquake: { emoji: "🌍", color: "#eab308" },
  Other: { emoji: "📍", color: "#94a3b8" },
};

function getCategoryStyle(category) {
  return CATEGORY_STYLE[category] || CATEGORY_STYLE["Other"];
}

// ── Trust tier → accent color ─────────────────────────────────────────────────
function getTierColor(trustScore, status) {
  const st = (status || "").toUpperCase();
  if (st.includes("DISINFORMATION") || st.includes("FAKE")) return "#ef4444";
  if (st.includes("RESOLVED") || st.includes("DISPATCH")) return "#22c55e";

  const match = (trustScore || "").match(/(\d+)%/);
  const score = match ? parseInt(match[1], 10) : null;
  if (score !== null) {
    if (score >= 80) return "#22c55e";
    if (score >= 55) return "#38bdf8";
    if (score >= 30) return "#f59e0b";
  }
  return "#a1a1aa";
}

function getTierLabel(trustScore, status) {
  const st = (status || "").toUpperCase();
  if (st.includes("DISINFORMATION") || st.includes("FAKE")) return "DEBUNKED";
  if (st.includes("RESOLVED") || st.includes("DISPATCH")) return "RESOLVED";
  const match = (trustScore || "").match(/(\d+)%/);
  const score = match ? parseInt(match[1], 10) : null;
  if (score !== null) {
    if (score >= 80) return "HIGH TRUST";
    if (score >= 55) return "VERIFIED";
    if (score >= 30) return "REVIEWING";
  }
  return "UNVERIFIED";
}

// ── Citizen Incident Marker ──────────────────────────────────────────────────
function makeIncidentIcon(category, tierColor, isNew) {
  const { emoji } = getCategoryStyle(category);
  const pulse = isNew
    ? `<div style="
        position:absolute;inset:-10px;border-radius:50%;
        background:${tierColor}40;
        animation:tPulse 1.5s ease-out infinite;
      "></div>`
    : "";

  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -48],
    html: `
      <div style="position:relative;width:44px;height:44px;">
        ${pulse}
        <div style="
          width:44px;height:44px;border-radius:50%;
          background:#0d131e;
          border:3px solid ${tierColor};
          box-shadow:0 0 14px ${tierColor}99, 0 3px 10px rgba(0,0,0,0.8);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;line-height:1;
        ">${emoji}</div>
      </div>`,
  });
}

// ── Natural Calamity Markers (Flood, Cyclone, Wildfire, Earthquake, Volcano) ──
function makeCalamityIcon(calamity) {
  const type = calamity.type;
  let color = "#38bdf8";
  let emoji = "🌊";
  let glowColor = "rgba(56,189,248,0.55)";

  if (type === "flood") {
    color = "#38bdf8";
    emoji = "🌊";
    glowColor = "rgba(56,189,248,0.6)";
  } else if (type === "cyclone") {
    color = "#a855f7";
    emoji = "🌀";
    glowColor = "rgba(168,85,247,0.6)";
  } else if (type === "wildfire") {
    color = "#f97316";
    emoji = "🔥";
    glowColor = "rgba(249,115,22,0.6)";
  } else if (type === "volcano") {
    color = "#ef4444";
    emoji = "🌋";
    glowColor = "rgba(239,68,68,0.6)";
  } else if (type === "earthquake") {
    color = "#eab308";
    emoji = "🌍";
    glowColor = "rgba(234,179,8,0.6)";
  } else if (type === "drought") {
    color = "#d97706";
    emoji = "🌾";
    glowColor = "rgba(217,119,6,0.6)";
  }

  // Size scaled for magnitude or alert level
  let size = 36;
  if (calamity.magnitude) {
    size = Math.max(30, Math.min(52, Math.round(calamity.magnitude * 7)));
  } else if (calamity.level === "Red") {
    size = 42;
  } else if (calamity.level === "Orange") {
    size = 38;
  }

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:${glowColor};
          animation:tPulse 2s ease-out infinite;
        "></div>
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:#0a0f1d;
          border:2.5px solid ${color};
          box-shadow:0 0 16px ${color}aa, 0 3px 10px rgba(0,0,0,0.85);
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(size * 0.44)}px;line-height:1;
        ">${emoji}</div>
      </div>`,
  });
}

// ── User location dot marker ───────────────────────────────────────────────────
function makeUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:rgba(56,189,248,0.25);
          animation:tPulse 2s ease-out infinite;
        "></div>
        <div style="
          width:20px;height:20px;border-radius:50%;
          background:#38bdf8;
          border:3px solid white;
          box-shadow:0 0 12px #38bdf888;
        "></div>
      </div>`,
  });
}

// ── Fit map bounds to markers ─────────────────────────────────────────────────
function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length === 0 || fitted.current) return;
    try {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
      fitted.current = true;
    } catch {
      /* ignore invalid bounds */
    }
  }, [points.length]); // eslint-disable-line
  return null;
}

// ── Custom Map Controls: zoom + locate + reset bounds ─────────────────────────
function MapControls({ userLat, userLng, allPoints }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  const resetView = () => {
    if (allPoints && allPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
      } catch {
        map.setView([20.5937, 78.9629], 5);
      }
    } else {
      map.setView([20.5937, 78.9629], 5);
    }
  };

  const locateUser = () => {
    setLocError(false);
    if (userLat && userLng) {
      map.flyTo([userLat, userLng], 14, { animate: true, duration: 1.2 });
      return;
    }
    if (!navigator.geolocation) {
      setLocError(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, {
          animate: true,
          duration: 1.2,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const btnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0a0f1d",
    color: "#a1a1aa",
    fontSize: 18,
    transition: "all 0.15s",
    outline: "none",
    padding: 0,
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 12,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Zoom In */}
      <button
        onClick={zoomIn}
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#18202f";
          e.currentTarget.style.color = "#f4f4f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0a0f1d";
          e.currentTarget.style.color = "#a1a1aa";
        }}
        title="Zoom in"
      >
        <Plus size={16} />
      </button>

      {/* Zoom Out */}
      <button
        onClick={zoomOut}
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#18202f";
          e.currentTarget.style.color = "#f4f4f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0a0f1d";
          e.currentTarget.style.color = "#a1a1aa";
        }}
        title="Zoom out"
      >
        <Minus size={16} />
      </button>

      {/* Fit All Markers */}
      <button
        onClick={resetView}
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#18202f";
          e.currentTarget.style.color = "#f4f4f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0a0f1d";
          e.currentTarget.style.color = "#a1a1aa";
        }}
        title="Fit all disasters to screen"
      >
        <Compass size={16} />
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />

      {/* Locate Me */}
      <button
        onClick={locateUser}
        style={{
          ...btnBase,
          background: locError ? "#ef444420" : "#0a0f1d",
          color: locError ? "#ef4444" : locating ? "#38bdf8" : "#a1a1aa",
          border: locError ? "1px solid #ef444455" : btnBase.border,
          animation: locating ? "locPulse 1s ease-in-out infinite" : "none",
        }}
        onMouseEnter={(e) => {
          if (!locError) {
            e.currentTarget.style.background = "#18202f";
            e.currentTarget.style.color = "#38bdf8";
          }
        }}
        onMouseLeave={(e) => {
          if (!locError) {
            e.currentTarget.style.background = "#0a0f1d";
            e.currentTarget.style.color = "#a1a1aa";
          }
        }}
        title={locError ? "Location unavailable" : "Fly to my location"}
      >
        {locating ? <Navigation size={15} /> : <LocateFixed size={15} />}
      </button>
    </div>
  );
}

// ── Unified Disasters Hook (UN GDACS + USGS + NASA EONET) ────────────────────
function useDisasters() {
  const [disasters, setDisasters] = useState([]);
  const [counts, setCounts] = useState({
    flood: 0,
    cyclone: 0,
    wildfire: 0,
    earthquake: 0,
    volcano: 0,
    drought: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/disasters${force ? "?refresh=true" : ""}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDisasters(json.data);
        if (json.counts) setCounts(json.counts);
      }
    } catch (e) {
      console.warn("Disasters fetch failed:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { disasters, counts, loading, refetch: () => fetch_(true) };
}

// ── Legend Config ─────────────────────────────────────────────────────────────
const TIER_LEGEND = [
  { color: "#22c55e", label: "High Trust / Corroborated (80%+)" },
  { color: "#38bdf8", label: "Verified Community Alert (55–79%)" },
  { color: "#f59e0b", label: "Under Community Review (30–54%)" },
  { color: "#a1a1aa", label: "Low Corroboration / Unverified" },
  { color: "#ef4444", label: "Debunked / Flagged Disinformation" },
];

const CALAMITY_LEGEND = [
  { icon: "🌊", label: "Floods & Inundations (UN GDACS / EC)", color: "#38bdf8" },
  { icon: "🌀", label: "Tropical Cyclones & Storms (NASA / NOAA)", color: "#a855f7" },
  { icon: "🔥", label: "Wildfires & Forest Fires (NASA FIRMS)", color: "#f97316" },
  { icon: "🌍", label: "Earthquakes (USGS Real-Time Seismic)", color: "#eab308" },
  { icon: "🌋", label: "Volcanoes (Active Eruptions & Plumes)", color: "#ef4444" },
  { icon: "🌾", label: "Severe Droughts (UN Alert System)", color: "#d97706" },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function LiveIncidentMap({
  incidents = [],
  realtimeActive = false,
  userLat = null,
  userLng = null,
}) {
  const [showLegend, setShowLegend] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "incidents" | "flood" | "cyclone" | "wildfire" | "earthquake" | "volcano"
  const [showDisasters, setShowDisasters] = useState(true);

  const { disasters, counts, loading: disastersLoading, refetch: refetchDisasters } =
    useDisasters();

  const now = Date.now();

  // Geo-tagged incidents only
  const mappedIncidents = useMemo(
    () => incidents.filter((i) => i.latitude && i.longitude),
    [incidents]
  );

  // Filtered disasters based on activeFilter
  const filteredDisasters = useMemo(() => {
    if (!showDisasters) return [];
    if (activeFilter === "incidents") return [];
    if (activeFilter === "all") return disasters;
    return disasters.filter((d) => d.type === activeFilter);
  }, [disasters, activeFilter, showDisasters]);

  // Filtered incidents based on activeFilter
  const visibleIncidents = useMemo(() => {
    if (activeFilter !== "all" && activeFilter !== "incidents") return [];
    return mappedIncidents;
  }, [mappedIncidents, activeFilter]);

  // Points for FitBounds
  const allPoints = useMemo(() => {
    const pts = visibleIncidents.map((i) => [i.latitude, i.longitude]);
    filteredDisasters.forEach((d) => pts.push([d.lat, d.lng]));
    return pts;
  }, [visibleIncidents, filteredDisasters]);

  const defaultCenter = [20.5937, 78.9629]; // India / Global viewpoint

  return (
    <div className="w-full flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#0d131e] shadow-2xl">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1d] border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Map className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 tracking-wide font-heading">
                GLOBAL DISASTER & INCIDENT RADAR
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                LIVE SATELLITE + CIVIC
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              {mappedIncidents.length} civic report{mappedIncidents.length !== 1 ? "s" : ""} ·{" "}
              {counts.total} active natural calamit{counts.total !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Calamities Layer Toggle */}
          <button
            type="button"
            onClick={() => setShowDisasters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
              showDisasters
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
            }`}
            title="Toggle live natural disaster layers"
          >
            <span>🛰️</span>
            <span>
              {disastersLoading
                ? "SYNCING..."
                : `CALAMITIES ${showDisasters ? "ON" : "OFF"}`}
            </span>
          </button>

          {/* Realtime Supabase badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
              realtimeActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">
              {realtimeActive ? "LIVE FEED" : "CONNECTING"}
            </span>
          </div>

          {/* Legend toggle */}
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Toggle Map Legend"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Calamity Filter Chips Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[#090d16] border-b border-white/5 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline">
          LAYERS:
        </span>

        {/* All Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "all"
              ? "bg-white/20 text-white border border-white/30 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🌐 ALL ({mappedIncidents.length + (showDisasters ? counts.total : 0)})
        </button>

        {/* Incidents Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("incidents")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "incidents"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🚨 INCIDENTS ({mappedIncidents.length})
        </button>

        {/* Floods Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("flood")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "flood"
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🌊 FLOODS ({counts.flood})
        </button>

        {/* Cyclones Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("cyclone")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "cyclone"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🌀 CYCLONES ({counts.cyclone})
        </button>

        {/* Wildfires Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("wildfire")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "wildfire"
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🔥 WILDFIRES ({counts.wildfire})
        </button>

        {/* Earthquakes Layer */}
        <button
          type="button"
          onClick={() => setActiveFilter("earthquake")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
            activeFilter === "earthquake"
              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold"
              : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
          }`}
        >
          🌍 QUAKES ({counts.earthquake})
        </button>

        {/* Volcanoes Layer */}
        {counts.volcano > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter("volcano")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
              activeFilter === "volcano"
                ? "bg-red-500/20 text-red-400 border border-red-500/40 font-bold"
                : "bg-[#141b2a] hover:bg-[#1c2436] text-zinc-400 border border-white/5"
            }`}
          >
            🌋 VOLCANOES ({counts.volcano})
          </button>
        )}
      </div>

      {/* ── Legend Drawer ───────────────────────────────────────────────────── */}
      {showLegend && (
        <div className="px-5 py-4 bg-[#0d131e] border-b border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Natural Calamities Legend */}
            <div>
              <p className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span>🛰️ Natural Disasters (Real-time Global Feeds)</span>
              </p>
              {CALAMITY_LEGEND.map((c) => (
                <div key={c.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-base leading-none">{c.icon}</span>
                  <span className="text-xs text-zinc-300">{c.label}</span>
                </div>
              ))}
              <p className="text-[11px] text-zinc-500 font-mono mt-2">
                Sources: UN GDACS · USGS Earthquake Hazards · NASA EONET · Free Public Domain
              </p>
            </div>

            {/* Citizen Incident Trust Legend */}
            <div>
              <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-2">
                🏛️ Civic Incident Trust Tiers
              </p>
              {TIER_LEGEND.map((t) => (
                <div key={t.label} className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: t.color, boxShadow: `0 0 6px ${t.color}99` }}
                  />
                  <span className="text-xs text-zinc-400">{t.label}</span>
                </div>
              ))}
              <p className="text-[11px] text-zinc-500 font-mono mt-2">
                ✦ Pulsing halos = Live updates detected in current session
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Map Canvas ──────────────────────────────────────────────────────── */}
      <div style={{ height: 520 }} className="relative">
        <style>{`
          .leaflet-container { background: #0d131e !important; font-family: system-ui, sans-serif; }
          .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(88%) saturate(0.75); }
          .leaflet-control-attribution { background:rgba(10,15,29,0.85)!important; color:#52525b!important; font-size:9px!important; }
          .leaflet-attribution-flag { display:none!important; }
          .tinggle-popup .leaflet-popup-content-wrapper {
            background:#0d131e; border:1px solid rgba(255,255,255,0.12);
            border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.85); padding:0;
          }
          .tinggle-popup .leaflet-popup-content { margin:0; }
          .tinggle-popup .leaflet-popup-tip { background:#0d131e; }
          @keyframes tPulse {
            0%   { transform:scale(1);   opacity:0.75; }
            100% { transform:scale(2.6); opacity:0;    }
          }
          @keyframes locPulse {
            0%, 100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.5; transform:scale(0.92); }
          }
        `}</style>

        <MapContainer
          center={defaultCenter}
          zoom={5}
          style={{ width: "100%", height: "100%", zIndex: 0 }}
          zoomControl={false}
          attributionControl={true}
        >
          {/* OpenStreetMap dark tiles */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | NASA &middot; GDACS &middot; USGS'
            subdomains="abc"
            maxZoom={19}
          />

          {/* Auto-fit bounds on load */}
          {allPoints.length > 0 && <FitBounds points={allPoints} />}

          {/* Custom zoom + locate + reset controls */}
          <MapControls userLat={userLat} userLng={userLng} allPoints={allPoints} />

          {/* User Location Blue Dot */}
          {userLat && userLng && (
            <Marker position={[userLat, userLng]} icon={makeUserIcon()} zIndexOffset={2000}>
              <Popup className="tinggle-popup" minWidth={180}>
                <div style={{ padding: "12px", color: "#e4e4e7", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>📍</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#38bdf8" }}>
                    You are here
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                    Your current GPS location
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ── Citizen Incidents Markers ──────────────────────────────────── */}
          {visibleIncidents.map((inc) => {
            const tierColor = getTierColor(inc.trustScore, inc.status);
            const tierLabel = getTierLabel(inc.trustScore, inc.status);
            const catStyle = getCategoryStyle(inc.category);
            const isNew = inc.createdAt
              ? now - new Date(inc.createdAt).getTime() < 60_000
              : false;
            const score = (inc.trustScore || "").match(/(\d+)%/)?.[1];

            return (
              <Marker
                key={inc.id}
                position={[inc.latitude, inc.longitude]}
                icon={makeIncidentIcon(inc.category, tierColor, isNew)}
              >
                <Popup className="tinggle-popup" minWidth={270} maxWidth={300}>
                  <div style={{ padding: "14px", color: "#e4e4e7" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{catStyle.emoji}</span>
                      <div>
                        <div
                          style={{
                            display: "inline-block",
                            background: `${tierColor}20`,
                            color: tierColor,
                            border: `1px solid ${tierColor}55`,
                            borderRadius: 6,
                            padding: "1px 7px",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {tierLabel}
                        </div>
                        <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>
                          {inc.category || "Civic Incident"}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#f4f4f5",
                        lineHeight: 1.4,
                        marginBottom: 4,
                      }}
                    >
                      {inc.title || "Untitled Incident"}
                    </div>

                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>
                      ⏱ {inc.timestamp || ""}
                      {inc.distanceMiles ? ` · 📍 ${inc.distanceMiles} mi away` : ""}
                    </div>

                    {inc.location && (
                      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>
                        🗺 {inc.location}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: 11,
                        color: "#71717a",
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      {(inc.description || "").slice(0, 110)}
                      {(inc.description?.length || 0) > 110 ? "…" : ""}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        fontSize: 11,
                        color: "#a1a1aa",
                        marginBottom: 10,
                      }}
                    >
                      <span>▲ {inc.confirmCount ?? 0} upvotes</span>
                      {score && <span>· {score}% trust</span>}
                    </div>

                    <a
                      href={`/incident/${inc.id}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: tierColor,
                        color: "#000",
                        borderRadius: 8,
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      View Full Report →
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ── Natural Calamity Markers (Floods, Cyclones, Wildfires, Quakes, Volcanoes) ── */}
          {filteredDisasters.map((d) => (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={makeCalamityIcon(d)}>
              <Popup className="tinggle-popup" minWidth={270} maxWidth={320}>
                <div style={{ padding: "14px", color: "#e4e4e7" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 26 }}>{d.icon}</span>
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          background:
                            d.level === "Red"
                              ? "#ef444420"
                              : d.level === "Orange"
                              ? "#f59e0b20"
                              : "#38bdf820",
                          color:
                            d.level === "Red"
                              ? "#ef4444"
                              : d.level === "Orange"
                              ? "#f59e0b"
                              : "#38bdf8",
                          border: `1px solid ${
                            d.level === "Red"
                              ? "#ef444455"
                              : d.level === "Orange"
                              ? "#f59e0b55"
                              : "#38bdf855"
                          }`,
                          borderRadius: 6,
                          padding: "1px 7px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {d.category.toUpperCase()} ·{" "}
                        {d.severityText || `${d.level?.toUpperCase()} ALERT`}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#71717a",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>🛰️ Source:</span>
                        <span style={{ color: "#38bdf8", fontWeight: 600 }}>{d.source}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#f4f4f5",
                      lineHeight: 1.4,
                      marginBottom: 6,
                    }}
                  >
                    {d.title}
                  </div>

                  <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 6 }}>
                    ⏱ {d.time}
                  </div>

                  {d.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#71717a",
                        lineHeight: 1.5,
                        marginBottom: 10,
                      }}
                    >
                      {d.description}
                    </div>
                  )}

                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background:
                          d.level === "Red"
                            ? "#ef4444"
                            : d.type === "flood"
                            ? "#38bdf8"
                            : d.type === "cyclone"
                            ? "#a855f7"
                            : "#f59e0b",
                        color: d.type === "cyclone" ? "#ffffff" : "#000",
                        borderRadius: 8,
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Official {d.source} Bulletin ↗
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Empty state overlay */}
        {visibleIncidents.length === 0 && filteredDisasters.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[1000]">
            <Globe className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500 font-mono">No active events for this layer</p>
            <p className="text-xs text-zinc-600 mt-1">
              Select &quot;ALL&quot; to view active global disasters and civic reports
            </p>
          </div>
        )}
      </div>

      {/* ── Footer Stats & Sources ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0f1d] border-t border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1">
            <span>🚨</span> {mappedIncidents.length} Civic
          </span>
          <span className="flex items-center gap-1">
            <span>🌊</span> {counts.flood} Floods
          </span>
          <span className="flex items-center gap-1">
            <span>🌀</span> {counts.cyclone} Cyclones
          </span>
          <span className="flex items-center gap-1">
            <span>🔥</span> {counts.wildfire} Wildfires
          </span>
          <span className="flex items-center gap-1">
            <span>🌍</span> {counts.earthquake} Quakes
          </span>
          {counts.volcano > 0 && (
            <span className="flex items-center gap-1">
              <span>🌋</span> {counts.volcano} Volcanoes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refetchDisasters}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            disabled={disastersLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${disastersLoading ? "animate-spin" : ""}`} />
            <span>Sync Feeds</span>
          </button>
          <span className="text-xs font-mono text-zinc-600 hidden sm:inline">
            Free Open APIs · UN GDACS · USGS · NASA
          </span>
        </div>
      </div>
    </div>
  );
}
