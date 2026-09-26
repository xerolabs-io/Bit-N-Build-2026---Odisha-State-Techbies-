"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Satellite,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  AlertTriangle,
  Loader2,
  Navigation2,
} from "lucide-react";

const MAP_TILES = {
  tactical: {
    name: "Tactical Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
    attribution: "© CartoDB Dark Matter",
  },
  satellite: {
    name: "Orbital Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: ["a", "b", "c"],
    maxZoom: 19,
    attribution: "© Esri World Imagery",
  },
};

const CATEGORY_COLORS = {
  Fire: "#ef4444",
  Hazard: "#ef4444",
  Traffic: "#f59e0b",
  Transit: "#f59e0b",
  Utility: "#14b8a6",
  Infrastructure: "#06b6d4",
  "Public Safety": "#38bdf8",
  Crime: "#a855f7",
};

export default function ActiveThreatSectorMap({
  incidents = [],
  selectedIncident = null,
  onSelectIncident = null,
}) {
  const containerRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const markerGroupRef = useRef(null);
  const activeMarkerRef = useRef(null);

  const [mapStyle, setMapStyle] = useState("tactical");
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  // Filter incidents that have valid coordinates
  const geoIncidents = React.useMemo(() => {
    return incidents.filter(
      (inc) =>
        inc &&
        typeof inc.latitude === "number" &&
        typeof inc.longitude === "number" &&
        !isNaN(inc.latitude) &&
        !isNaN(inc.longitude)
    );
  }, [incidents]);

  // ─── 1. Initialize Leaflet Map safely ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initMap() {
      try {
        if (!containerRef.current) return;

        const L = (await import("leaflet")).default;
        if (!mounted || !containerRef.current) return;

        if (containerRef.current._leaflet_id) {
          containerRef.current._leaflet_id = null;
        }
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        // Center on selected incident or first geo-incident or default
        const initLat =
          selectedIncident?.latitude || geoIncidents[0]?.latitude || 20.2961;
        const initLng =
          selectedIncident?.longitude || geoIncidents[0]?.longitude || 85.8245;

        const map = L.map(containerRef.current, {
          center: [initLat, initLng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
        });

        // Set tile layer
        const config = MAP_TILES[mapStyle] || MAP_TILES.tactical;
        tileLayerRef.current = L.tileLayer(config.url, {
          maxZoom: config.maxZoom || 19,
          subdomains: config.subdomains || ["a", "b", "c"],
        }).addTo(map);

        markerGroupRef.current = L.layerGroup().addTo(map);
        mapInstance.current = map;

        setTimeout(() => {
          if (mounted && mapInstance.current) {
            mapInstance.current.invalidateSize();
            setMapReady(true);
          }
        }, 150);
      } catch (err) {
        console.error("Map initialization failed:", err);
        if (mounted) setError("Tactical map feed unavailable");
      }
    }

    initMap();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Run once on mount

  // ─── 2. Switch Tile Layer (Tactical Dark vs Satellite) ─────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const config = MAP_TILES[mapStyle] || MAP_TILES.tactical;

      if (tileLayerRef.current) {
        mapInstance.current.removeLayer(tileLayerRef.current);
      }

      tileLayerRef.current = L.tileLayer(config.url, {
        maxZoom: config.maxZoom || 19,
        subdomains: config.subdomains || ["a", "b", "c"],
      }).addTo(mapInstance.current);

      mapInstance.current.invalidateSize();
    })();
  }, [mapStyle, mapReady]);

  // ─── 3. Render Incident Markers ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !markerGroupRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      markerGroupRef.current.clearLayers();

      geoIncidents.forEach((inc) => {
        const color = CATEGORY_COLORS[inc.category] || "#f59e0b";
        const isSelected = selectedIncident?.id === inc.id;

        const pinHtml = `
          <div style="position:relative;width:${isSelected ? "32px" : "24px"};height:${isSelected ? "32px" : "24px"};display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color}44;animation:pulse 1.8s infinite;"></div>
            ${
              isSelected
                ? `<div style="position:absolute;width:140%;height:140%;border-radius:50%;border:2px dashed #f59e0b;animation:spin 6s linear infinite;"></div>`
                : ""
            }
            <div style="width:${isSelected ? "14px" : "10px"};height:${isSelected ? "14px" : "10px"};background:${isSelected ? "#ffffff" : color};border:2px solid ${color};border-radius:50%;box-shadow:0 0 12px ${color};z-index:2;position:relative;"></div>
          </div>
          <style>
            @keyframes pulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(2.2);opacity:0}}
            @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          </style>`;

        const pinIcon = L.divIcon({
          className: "",
          html: pinHtml,
          iconSize: isSelected ? [32, 32] : [24, 24],
          iconAnchor: isSelected ? [16, 16] : [12, 12],
        });

        const marker = L.marker([inc.latitude, inc.longitude], {
          icon: pinIcon,
          zIndexOffset: isSelected ? 1000 : 500,
        }).addTo(markerGroupRef.current);

        // Tactical popup
        const popupContent = `
          <div style="background:#0b111e;color:#f1f5f9;padding:10px 12px;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid rgba(255,255,255,0.15);min-width:200px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${inc.category || "INCIDENT"}</span>
              <span style="font-size:9px;color:#94a3b8;background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:4px;">#${inc.id}</span>
            </div>
            <div style="font-size:12px;font-weight:700;color:#ffffff;margin-bottom:4px;font-family:sans-serif;line-height:1.3;">${inc.title}</div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">📍 ${inc.location_text || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}</div>
            <div style="font-size:10px;color:#38bdf8;font-weight:600;">Status: ${inc.status || "REPORTED"}</div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 260 });

        marker.on("click", () => {
          if (onSelectIncident) {
            onSelectIncident(inc);
          }
        });

        if (isSelected) {
          activeMarkerRef.current = marker;
        }
      });
    })();
  }, [mapReady, geoIncidents, selectedIncident, onSelectIncident]);

  // ─── 4. Fly to selected incident ──────────────────────────────────────────
  useEffect(() => {
    if (
      !mapReady ||
      !mapInstance.current ||
      !selectedIncident?.latitude ||
      !selectedIncident?.longitude
    )
      return;

    mapInstance.current.flyTo(
      [selectedIncident.latitude, selectedIncident.longitude],
      14,
      { animate: true, duration: 1.2 }
    );
  }, [selectedIncident, mapReady]);

  // ─── Map Controls ─────────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!mapInstance.current) return;
    if (
      selectedIncident &&
      selectedIncident.latitude &&
      selectedIncident.longitude
    ) {
      mapInstance.current.setView(
        [selectedIncident.latitude, selectedIncident.longitude],
        14,
        { animate: true }
      );
    } else if (geoIncidents.length > 0) {
      import("leaflet").then(({ default: L }) => {
        const bounds = L.latLngBounds(
          geoIncidents.map((i) => [i.latitude, i.longitude])
        );
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      });
    }
  }, [selectedIncident, geoIncidents]);

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();

  return (
    <div className="bg-[#141b2a] border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg flex flex-col gap-3 overflow-hidden">
      {/* Map Header */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
        <span className="flex items-center gap-2 uppercase tracking-wider font-semibold text-zinc-200">
          <Satellite className="w-4 h-4 text-sky-400" />
          <span>Active Threat Sector Visualizer</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>{geoIncidents.length} NODES TRACKED</span>
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-72 md:h-80 rounded-xl overflow-hidden relative border border-white/10 bg-[#080d17]">
        {/* Leaflet canvas container */}
        <div ref={containerRef} className="w-full h-full z-0" />

        {/* Loading overlay */}
        {!mapReady && !error && (
          <div className="absolute inset-0 bg-[#080d17]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="font-mono text-xs text-zinc-400">
              Synchronizing Tactical Sector Telemetry...
            </span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-[#080d17]/90 z-10 flex flex-col items-center justify-center gap-2 text-center p-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="font-mono text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* Tactical Overlay: Active Sector Callout */}
        <div className="absolute top-3 left-3 z-[400] bg-[#080d17]/90 border border-amber-500/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-xs flex items-center gap-2 shadow-lg pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-zinc-200 font-bold">
            {selectedIncident
              ? `SECTOR HOTSPOT: ${selectedIncident.id}`
              : "METROPOLITAN SURVEILLANCE GRID"}
          </span>
        </div>

        {/* Tactical Crosshair center reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[400] opacity-40">
          <Crosshair className="w-10 h-10 text-amber-400" />
        </div>

        {/* Map Control Buttons */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
          {/* Tile Switcher */}
          <button
            onClick={() =>
              setMapStyle((s) => (s === "tactical" ? "satellite" : "tactical"))
            }
            title={`Switch to ${mapStyle === "tactical" ? "Orbital Satellite" : "Tactical Dark"}`}
            className="p-2 rounded-lg bg-[#080d17]/90 hover:bg-[#1a2333] border border-white/20 text-zinc-300 hover:text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
          </button>
          {/* Recenter */}
          <button
            onClick={handleRecenter}
            title="Recenter on active incident"
            className="p-2 rounded-lg bg-[#080d17]/90 hover:bg-[#1a2333] border border-white/20 text-zinc-300 hover:text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <Navigation2 className="w-4 h-4 text-sky-400" />
          </button>
          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 rounded-lg bg-[#080d17]/90 hover:bg-[#1a2333] border border-white/20 text-zinc-300 hover:text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 rounded-lg bg-[#080d17]/90 hover:bg-[#1a2333] border border-white/20 text-zinc-300 hover:text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Strip */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] bg-[#080d17]/90 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-[11px] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 truncate">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-300 truncate">
              {selectedIncident?.location_text ||
                (selectedIncident?.latitude
                  ? `${selectedIncident.latitude.toFixed(4)}° N, ${selectedIncident.longitude.toFixed(4)}° E`
                  : "All Active Sectors Synced")}
            </span>
          </div>
          <span className="text-teal-400 font-bold shrink-0 ml-2">
            FEED: {mapStyle === "tactical" ? "VECTOR TACTICAL" : "ORBITAL ESRI"}
          </span>
        </div>
      </div>
    </div>
  );
}
