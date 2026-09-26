"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Map as MapIcon,
  Loader2,
  LocateFixed,
  AlertTriangle,
  Globe2,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { useGeoLocation, GEO_STATES } from "@/hooks/useGeoLocation";

// ─── Free Map Providers (Zero API Key & Zero Payment Required) ───────────────
const TILE_PROVIDERS = {
  satellite: {
    name: "Earth (Satellite)",
    label: "Google Earth Satellite View",
    icon: Globe2,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
    attribution: "© Esri Satellite",
  },
  street: {
    name: "Street Map",
    label: "OpenStreetMap",
    icon: Navigation,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
    attribution: "© OpenStreetMap",
  },
};

const CATEGORY_COLOR = {
  Traffic: "#f59e0b",
  Fire: "#ef4444",
  Utility: "#14b8a6",
  "Public Safety": "#38bdf8",
  Transit: "#f59e0b",
};

// ─── Leaflet Map (Client Side Only) ──────────────────────────────────────────
function LeafletMap({ userLat, userLng, incidents, mapMode }) {
  const containerRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarker = useRef(null);
  const incidentLayer = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // ── 1. Initialize Map instance safely ─────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!containerRef.current) return;

        const L = (await import("leaflet")).default;
        if (!active || !containerRef.current) return;

        // Prevent "Map container is already initialized" crash in React StrictMode
        if (containerRef.current._leaflet_id) {
          containerRef.current._leaflet_id = null;
        }
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        const initialLat = userLat || 20.5937;
        const initialLng = userLng || 78.9629;
        const initialZoom = userLat ? 14 : 5;

        const map = L.map(containerRef.current, {
          center: [initialLat, initialLng],
          zoom: initialZoom,
          zoomControl: false, // We'll render custom clean buttons
          attributionControl: false,
          scrollWheelZoom: true,
        });

        // Add selected tile layer
        const config = TILE_PROVIDERS[mapMode] || TILE_PROVIDERS.satellite;
        tileLayerRef.current = L.tileLayer(config.url, {
          maxZoom: config.maxZoom || 19,
          subdomains: config.subdomains || ["a", "b", "c"],
        }).addTo(map);

        // Add incident marker group
        incidentLayer.current = L.layerGroup().addTo(map);
        mapInstance.current = map;

        // Force resize recalculation to ensure tiles fill container
        setTimeout(() => {
          if (active && mapInstance.current) {
            mapInstance.current.invalidateSize();
          }
        }, 150);

        if (active) {
          setReady(true);
          setError(null);
        }
      } catch (err) {
        console.error("Leaflet init error:", err);
        if (active) setError(err.message || "Failed to load map.");
      }
    })();

    return () => {
      active = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        userMarker.current = null;
        incidentLayer.current = null;
        tileLayerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current._leaflet_id = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Switch Tile Layer dynamically (Earth Satellite vs Street) ──────────
  useEffect(() => {
    if (!ready || !mapInstance.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const config = TILE_PROVIDERS[mapMode] || TILE_PROVIDERS.satellite;

      if (tileLayerRef.current) {
        mapInstance.current.removeLayer(tileLayerRef.current);
      }

      tileLayerRef.current = L.tileLayer(config.url, {
        maxZoom: config.maxZoom || 19,
        subdomains: config.subdomains || ["a", "b", "c"],
      }).addTo(mapInstance.current);

      mapInstance.current.invalidateSize();
    })();
  }, [mapMode, ready]);

  // ── 3. Pan & update User GPS beacon ───────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current || !userLat || !userLng) return;

    (async () => {
      const L = (await import("leaflet")).default;
      mapInstance.current.setView([userLat, userLng], 14, { animate: true });

      const youHtml = `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(56,189,248,0.4);animation:radar-ping 1.6s ease-out infinite;"></div>
          <div style="width:12px;height:12px;background:#38bdf8;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(56,189,248,0.9);z-index:2;position:relative;"></div>
        </div>
        <style>
          @keyframes radar-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.6);opacity:0}}
        </style>`;

      const youIcon = L.divIcon({
        className: "",
        html: youHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (userMarker.current) {
        userMarker.current.setLatLng([userLat, userLng]);
      } else {
        userMarker.current = L.marker([userLat, userLng], {
          icon: youIcon,
          zIndexOffset: 1000,
        })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div style="background:#0f172a;color:#fff;padding:4px 8px;border-radius:6px;font-family:monospace;font-size:11px;">
              <span style="color:#38bdf8;font-weight:700;">📍 You are here</span>
            </div>
          `);
      }
    })();
  }, [ready, userLat, userLng]);

  // ── 4. Render Incidents onto Layer ────────────────────────────────────────
  useEffect(() => {
    if (!ready || !incidentLayer.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      incidentLayer.current.clearLayers();

      incidents.forEach((inc) => {
        if (!inc.latitude || !inc.longitude) return;
        const color = CATEGORY_COLOR[inc.category] || "#a78bfa";

        const pinHtml = `
          <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <div style="position:absolute;width:20px;height:20px;border-radius:50%;background:${color}44;animation:radar-ping 2s ease-out infinite;"></div>
            <div style="width:10px;height:10px;background:${color};border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 8px ${color};z-index:2;position:relative;"></div>
          </div>`;

        const pinIcon = L.divIcon({
          className: "",
          html: pinHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([inc.latitude, inc.longitude], { icon: pinIcon })
          .addTo(incidentLayer.current)
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:11px;min-width:170px;line-height:1.4;background:#0f172a;color:#fff;padding:6px;border-radius:6px;">
              <div style="color:${color};font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">${inc.category || "Incident"}</div>
              <div style="font-weight:600;font-size:12px;margin:2px 0;">${inc.title}</div>
              <div style="color:#94a3b8;font-size:10px;">${inc.location || inc.location_text || "Geo-tagged"}</div>
            </div>`,
            { maxWidth: 220 }
          );
      });
    })();
  }, [ready, incidents]);

  // Center on user handler
  const handleRecenter = () => {
    if (mapInstance.current && userLat && userLng) {
      mapInstance.current.setView([userLat, userLng], 15, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstance.current) mapInstance.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstance.current) mapInstance.current.zoomOut();
  };

  if (error) {
    return (
      <div className="w-full h-64 rounded-xl bg-[#0b101c] border border-red-500/30 flex flex-col items-center justify-center gap-2 text-center px-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
        <p className="text-xs font-mono text-red-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[11px] font-mono transition-colors"
        >
          Reload Widget
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/10 shadow-inner group">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Floating map controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
        {userLat && userLng && (
          <button
            onClick={handleRecenter}
            title="Recenter on my location"
            className="p-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-md border border-white/15 text-sky-400 hover:text-white hover:bg-sky-500/20 transition-all shadow-md"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col rounded-lg bg-zinc-900/80 backdrop-blur-md border border-white/15 overflow-hidden shadow-md">
          <button
            onClick={handleZoomIn}
            title="Zoom in"
            className="px-2 py-1 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom out"
            className="px-2 py-1 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            −
          </button>
        </div>
      </div>

      {/* Attribution stamp */}
      <div className="absolute bottom-1 right-2 z-10 text-[9px] font-mono text-white/50 bg-black/50 px-1.5 py-0.5 rounded pointer-events-none">
        {TILE_PROVIDERS[mapMode]?.attribution || "Free Map Data"}
      </div>

      {/* Loading state overlay */}
      {!ready && (
        <div className="absolute inset-0 z-20 bg-[#0d131e] flex flex-col items-center justify-center gap-2.5">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <span className="absolute inset-0 rounded-full border border-sky-400/30 animate-ping" />
          </div>
          <span className="text-xs font-mono text-zinc-400 tracking-wide">
            Loading {TILE_PROVIDERS[mapMode]?.name || "radar"} imagery...
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Public Widget Wrapper with Layer Switcher ──────────────────────────────
export default function SpatialRadarWidget({ incidents = [] }) {
  const { geoState, coords, locationText, acquire } = useGeoLocation(true);
  const [mapMode, setMapMode] = useState("satellite"); // Default to Google Earth Satellite view!

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-sky-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-200 font-semibold">
            Live Spatial Radar
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {geoState === GEO_STATES.LOCATING && (
            <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Locating...
            </span>
          )}
          {geoState === GEO_STATES.ACQUIRED && (
            <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              GPS Locked
            </span>
          )}
          {(geoState === GEO_STATES.IDLE || geoState === GEO_STATES.ERROR) && (
            <button
              onClick={acquire}
              className="font-mono text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20"
            >
              <LocateFixed className="w-3 h-3" /> Lock GPS
            </button>
          )}
        </div>
      </div>

      {/* Layer Mode Switcher Tabs (Earth / Dark / Street) */}
      <div className="flex items-center justify-between gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
        {Object.entries(TILE_PROVIDERS).map(([key, provider]) => {
          const Icon = provider.icon;
          const isSelected = mapMode === key;
          return (
            <button
              key={key}
              onClick={() => setMapMode(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all ${isSelected
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{provider.name}</span>
            </button>
          );
        })}
      </div>

      {/* Map Canvas */}
      <LeafletMap
        userLat={coords?.lat}
        userLng={coords?.lng}
        incidents={incidents}
        mapMode={mapMode}
      />

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1 border-t border-white/5">
        <span className="text-zinc-400 truncate max-w-[65%] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">
            {geoState === GEO_STATES.ACQUIRED
              ? locationText
              : geoState === GEO_STATES.LOCATING
                ? "Acquiring position..."
                : "GPS not acquired"}
          </span>
        </span>
        <span className="text-amber-400 shrink-0 text-[11px] font-medium">
          {incidents.filter((i) => i.latitude).length} pinned
        </span>
      </div>

      {/* No API key notice */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/[0.04]">
        <span>Imagery Provider: {TILE_PROVIDERS[mapMode]?.label}</span>
      </div>
    </div>
  );
}
