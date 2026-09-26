"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ActiveThreatSectorMap from "./ActiveThreatSectorMap";
import {
  Flame,
  Shield,
  Siren,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Send,
  RotateCcw,
  Layers,
  ChevronRight,
  ShieldAlert,
  Loader2,
  User,
} from "lucide-react";

function formatElapsed(dateString) {
  if (!dateString) return "Just now";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

const CATEGORY_COLORS = {
  Fire: "bg-red-500/20 text-red-300 border-red-500/40",
  Hazard: "bg-red-500/20 text-red-300 border-red-500/40",
  Traffic: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Transit: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Utility: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  Infrastructure: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  "Public Safety": "bg-sky-500/20 text-sky-300 border-sky-500/40",
};

export default function AdminDashboardClient({ operatorName = "Operator" }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "solved"
  const [selectedUnitType, setSelectedUnitType] = useState("Fire & HazMat Squad");
  const [dispatches, setDispatches] = useState({}); // { [incidentId]: unitString }
  const [actionLoading, setActionLoading] = useState(false);
  const [imageModal, setImageModal] = useState(null);

  // ─── Fetch Incidents from Database ─────────────────────────────────────────
  const fetchIncidents = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch("/api/incidents?limit=100");
      if (!res.ok) {
        throw new Error(`Database ledger offline (${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setIncidents(json.data);
        setFetchError(null);

        // Keep or set active selection
        setSelectedIncidentId((prev) => {
          if (prev && json.data.some((i) => i.id === prev)) {
            return prev;
          }
          // Default to first active (unresolved) incident
          const firstActive = json.data.find(
            (i) => i.status !== "RESOLVED & CONTAINED" && i.status !== "SOLVED"
          );
          return firstActive?.id || json.data[0]?.id || null;
        });
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
      if (!isSilent) setFetchError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents(false);
    const interval = setInterval(() => fetchIncidents(true), 10000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // ─── Separate Active Incidents vs Solved Incidents ─────────────────────────
  const isIncidentClosed = useCallback((status) => {
    if (!status) return false;
    const s = String(status).toUpperCase();
    return (
      s === "RESOLVED & CONTAINED" ||
      s === "SOLVED" ||
      s.includes("FAKE") ||
      s.includes("DISINFORMATION") ||
      s.includes("DEBUNKED") ||
      s.includes("HOAX")
    );
  }, []);

  const activeIncidents = useMemo(() => {
    return incidents.filter((i) => !isIncidentClosed(i.status));
  }, [incidents, isIncidentClosed]);

  const solvedIncidents = useMemo(() => {
    return incidents.filter((i) => isIncidentClosed(i.status));
  }, [incidents, isIncidentClosed]);

  // Currently focused incident
  const currentIncident = useMemo(() => {
    if (activeTab === "solved") {
      return (
        solvedIncidents.find((i) => i.id === selectedIncidentId) ||
        solvedIncidents[0] ||
        null
      );
    }
    return (
      activeIncidents.find((i) => i.id === selectedIncidentId) ||
      activeIncidents[0] ||
      null
    );
  }, [activeTab, activeIncidents, solvedIncidents, selectedIncidentId]);

  // ─── API Update (PATCH) ───────────────────────────────────────────────────
  const handleUpdateIncident = async (id, updatePayload) => {
    try {
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatePayload } : item
        )
      );

      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({ id, ...updatePayload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save to database");
      }
    } catch (err) {
      console.error("Error updating incident:", err);
      alert(`Action error: ${err.message}`);
      fetchIncidents(true);
    }
  };

  // ─── Action: Dispatch Help (Updates DB & Takes Next Issue) ────────────────
  const handleDispatchHelp = async () => {
    if (!currentIncident) return;
    setActionLoading(true);
    const incidentToDispatch = currentIncident;
    const squadName = selectedUnitType;

    try {
      // 1. Send update to Supabase DB: mark as resolved & contained with dispatched unit
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          id: incidentToDispatch.id,
          status: "RESOLVED & CONTAINED",
          trust_score: `${squadName.toUpperCase()} DISPATCHED`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update incident in database");
      }

      // 2. Database update succeeded! Update local state
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentToDispatch.id
            ? {
                ...item,
                status: "RESOLVED & CONTAINED",
                trust_score: `${squadName.toUpperCase()} DISPATCHED`,
              }
            : item
        )
      );

      setDispatches((prev) => ({
        ...prev,
        [incidentToDispatch.id]: `${squadName} Dispatched`,
      }));

      // 3. Automatically advance to take the next issue from active queue
      const remaining = activeIncidents.filter((i) => i.id !== incidentToDispatch.id);
      if (remaining.length > 0) {
        setSelectedIncidentId(remaining[0].id);
      } else {
        setSelectedIncidentId(null);
      }
    } catch (err) {
      console.error("Error dispatching help:", err);
      alert(`Dispatch Error: ${err.message}`);
      fetchIncidents(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Action: Flag as Fake / Disinformation / Hoax ─────────────────────────
  const handleFlagFake = async (reason = "FLAGGED AS FAKE BY HQ") => {
    if (!currentIncident) return;
    const confirmAction = window.confirm(
      `Are you sure you want to flag incident #${currentIncident.id} ("${currentIncident.title}") as Fake / Disinformation?\n\nThis will revoke credibility, lock public voting, and archive it from the active queue.`
    );
    if (!confirmAction) return;

    setActionLoading(true);
    const incidentToFlag = currentIncident;

    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          id: incidentToFlag.id,
          status: "FLAGGED DISINFORMATION",
          trust_score: reason,
          dispute_count: (incidentToFlag.dispute_count || 0) + 10,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to flag incident in database");
      }

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentToFlag.id
            ? {
                ...item,
                status: "FLAGGED DISINFORMATION",
                trust_score: reason,
                dispute_count: (incidentToFlag.dispute_count || 0) + 10,
              }
            : item
        )
      );

      // Automatically advance to take next issue from active queue
      const remaining = activeIncidents.filter((i) => i.id !== incidentToFlag.id);
      if (remaining.length > 0) {
        setSelectedIncidentId(remaining[0].id);
      } else {
        setSelectedIncidentId(null);
      }
    } catch (err) {
      console.error("Error flagging incident:", err);
      alert(`Flag Error: ${err.message}`);
      fetchIncidents(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Action: Reopen Solved Incident ───────────────────────────────────────
  const handleReopenIncident = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          id,
          status: "PENDING CIVIC CONFIRMATION",
          trust_score: "RE-OPENED CIVIC DISPATCH",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to re-open incident");
      }

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "PENDING CIVIC CONFIRMATION",
                trust_score: "RE-OPENED CIVIC DISPATCH",
              }
            : item
        )
      );
      setSelectedIncidentId(id);
      setActiveTab("active");
    } catch (err) {
      console.error("Error reopening incident:", err);
      alert(`Reopen Error: ${err.message}`);
      fetchIncidents(true);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="font-mono text-sm text-zinc-400">
          Connecting to Emergency Command Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0a0f1d] text-zinc-100">
      {/* ─── Top Operational Bar (Zero Extra Scroll) ───────────────────────── */}
      <div className="shrink-0 bg-[#0e1526] border-b border-white/10 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 font-mono text-xs md:text-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            <Siren className="w-4 h-4" />
            <span>Active Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "active"
                  ? "bg-black text-amber-300"
                  : "bg-red-500/30 text-red-300"
              }`}
            >
              {activeIncidents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("solved")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "solved"
                ? "bg-teal-500 text-black shadow-md shadow-teal-500/20"
                : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Solved Ledger</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "solved"
                  ? "bg-black text-teal-300"
                  : "bg-teal-500/20 text-teal-300"
              }`}
            >
              {solvedIncidents.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="hidden sm:flex items-center gap-2 text-xs md:text-sm font-medium text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            REALTIME LEDGER
          </span>
          <button
            onClick={() => fetchIncidents(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs md:text-sm font-semibold transition-colors cursor-pointer border border-white/10"
            title="Refresh database records"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-teal-400 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {/* ─── Main Cockpit Grid (Fills remaining height, no window scroll) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 overflow-hidden">
        {/* ── LEFT & CENTER: Primary Incident Cockpit (8 of 12 cols) ──────── */}
        <div className="lg:col-span-8 flex flex-col min-h-0 h-full overflow-hidden">
          {currentIncident ? (
            <Card className="flex flex-col h-full bg-[#111828]/95 border-white/10 shadow-2xl overflow-hidden rounded-xl">
              {/* Header: Title, Description, and Badges (First Sight) */}
              <CardHeader className="shrink-0 p-4 pb-3 border-b border-white/10 bg-[#162035]/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge
                      className={`font-mono text-xs md:text-sm font-bold uppercase px-3 py-1 border ${
                        CATEGORY_COLORS[currentIncident.category] ||
                        "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {currentIncident.category || "GENERAL ALERT"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs md:text-sm font-bold text-zinc-100 border-white/20 bg-white/5 px-2.5 py-1"
                    >
                      #{currentIncident.id}
                    </Badge>
                    <span className="font-mono text-xs md:text-sm text-zinc-300 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {formatElapsed(currentIncident.created_at)}
                    </span>
                    {currentIncident.reporter_email && (
                      <span className="hidden md:inline font-mono text-xs md:text-sm text-zinc-400">
                        • Op:{" "}
                        <strong className="text-zinc-200">
                          {currentIncident.reporter_email}
                        </strong>
                      </span>
                    )}
                  </div>

                  {(dispatches[currentIncident.id] ||
                    (currentIncident.trust_score &&
                      currentIncident.trust_score.includes("DISPATCHED"))) && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs md:text-sm font-bold">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      {dispatches[currentIncident.id] || currentIncident.trust_score} (En Route)
                    </span>
                  )}

                  {currentIncident.status &&
                    (currentIncident.status.includes("FLAGGED") ||
                      currentIncident.status.includes("FAKE") ||
                      currentIncident.status.includes("DEBUNKED")) && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs md:text-sm font-bold">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      FLAGGED DISINFORMATION / HOAX
                    </span>
                  )}
                </div>

                {/* Prominent Title */}
                <CardTitle className="text-xl md:text-2xl font-bold font-heading text-white leading-tight">
                  {currentIncident.title}
                </CardTitle>

                {/* Description */}
                <CardDescription className="text-sm md:text-base text-zinc-200 line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {currentIncident.description ||
                    "Citizen incident report filed through the emergency civic trust pipeline."}
                </CardDescription>

                {/* Location & Coordinates strip */}
                <div className="flex items-center justify-between text-xs md:text-sm text-zinc-200 bg-[#0c1220] border border-white/10 px-3.5 py-2 rounded-lg flex-wrap gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate font-semibold text-zinc-100 text-xs md:text-sm">
                      {currentIncident.location_text || "Sector Perimeter"}
                    </span>
                    {currentIncident.latitude && (
                      <span className="font-mono text-xs text-zinc-400 hidden sm:inline font-medium">
                        ({Number(currentIncident.latitude).toFixed(4)}° N,{" "}
                        {Number(currentIncident.longitude).toFixed(4)}° E)
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs md:text-sm text-teal-400 font-bold">
                    ✓ {currentIncident.confirm_count ?? 1} Citizen Corroborations
                  </span>
                </div>
              </CardHeader>

              {/* Content: Side-by-Side Image and Map on First Sight */}
              <CardContent className="flex-1 min-h-0 p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-hidden">
                {/* 1. Evidence Image View */}
                <div className="flex flex-col h-full min-h-[190px] rounded-xl overflow-hidden border border-white/10 bg-[#080d17] relative group">
                  {currentIncident.image_url ? (
                    <>
                      <div className="relative w-full h-full">
                        <Image
                          src={currentIncident.image_url}
                          alt={currentIncident.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-3 py-1 rounded-md text-xs font-mono text-teal-300 border border-teal-500/40 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_4px_#2dd4bf]" />
                          CITIZEN EVIDENCE PHOTO
                        </div>
                        <button
                          onClick={() => setImageModal(currentIncident.image_url)}
                          className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/85 hover:bg-black px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-200 hover:text-white border border-white/15 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Full View
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2.5">
                      <Flame className="w-9 h-9 text-amber-400/80" />
                      <span className="font-mono text-xs md:text-sm text-zinc-200 font-bold uppercase">
                        NO CAMERA UPLOAD ATTACHED
                      </span>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        Incident geo-located from reporter GPS coordinates and sensor signal corridor.
                      </p>
                      <span className="mt-1 font-mono text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded font-semibold">
                        SIGNAL TELEMETRY LOCKED
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Interactive Map View (Satellite & Street - Tactical dark removed) */}
                <div className="flex flex-col h-full min-h-[190px] rounded-xl overflow-hidden border border-white/10 bg-[#080d17] relative">
                  <ActiveThreatSectorMap
                    incidents={incidents}
                    selectedIncident={currentIncident}
                    compact={true}
                    className="w-full h-full"
                  />
                </div>
              </CardContent>

              {/* Footer: Dispatch Help Action (Replaces Mark Solved & Next) */}
              <CardFooter className="shrink-0 p-3.5 border-t border-white/10 bg-[#162035]/80 flex flex-wrap items-center justify-between gap-3">
                {/* Left: Squad Selection */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2 bg-[#0b101c] border border-white/15 rounded-lg p-1.5 shadow-sm">
                    <Siren className="w-4 h-4 text-amber-400 ml-1 shrink-0" />
                    <span className="text-xs font-mono text-zinc-400 font-semibold pl-1 hidden sm:inline">DISPATCH SQUAD:</span>
                    <select
                      value={selectedUnitType}
                      onChange={(e) => setSelectedUnitType(e.target.value)}
                      className="bg-transparent text-zinc-100 text-xs md:text-sm font-mono font-semibold focus:outline-none pr-2 cursor-pointer"
                    >
                      <option className="bg-[#111828] text-white">
                        🚒 Fire &amp; HazMat Squad
                      </option>
                      <option className="bg-[#111828] text-white">
                        🚓 Police Tactical Unit
                      </option>
                      <option className="bg-[#111828] text-white">
                        🚑 EMS Ambulance Triage
                      </option>
                      <option className="bg-[#111828] text-white">
                        🚨 Rapid Inter-Agency Taskforce
                      </option>
                    </select>
                  </div>
                </div>

                {/* Right: Functional Dispatch Help and Flag as Fake buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === "active" ? (
                    <>
                      <Button
                        onClick={() => handleFlagFake("FLAGGED AS FAKE BY HQ")}
                        disabled={actionLoading}
                        className="h-10 px-3.5 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-300 border border-red-500/40 font-mono text-xs md:text-sm font-bold tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50 transition-colors"
                        title="Mark report as fake news / disinformation and archive from active queue"
                      >
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <span>Flag as Fake</span>
                      </Button>

                      <Button
                        onClick={handleDispatchHelp}
                        disabled={actionLoading}
                        className="h-10 px-5 bg-teal-500 hover:bg-teal-400 text-black font-mono text-xs md:text-sm font-extrabold tracking-wider flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Dispatching &amp; Syncing DB...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Dispatch Help</span>
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleReopenIncident(currentIncident.id)}
                      disabled={actionLoading}
                      className="h-10 px-4 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/40 font-mono text-xs md:text-sm font-bold tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-open Incident</span>
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full bg-[#111828] border-white/10 p-8 text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-teal-400" />
              <CardTitle className="text-xl md:text-2xl font-bold font-heading text-white">
                All Active Threats Solved &amp; Contained
              </CardTitle>
              <CardDescription className="text-sm md:text-base text-zinc-300 max-w-md">
                There are no pending emergencies in the active queue. You can review past resolutions in the Solved Ledger.
              </CardDescription>
              <Button
                onClick={() => setActiveTab("solved")}
                className="mt-2 bg-teal-500 text-black font-bold font-mono text-xs md:text-sm px-4 py-2"
              >
                Inspect Solved Archive ({solvedIncidents.length})
              </Button>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN: Queue / Solved Archive (4 of 12 cols) ─────────── */}
        <div className="lg:col-span-4 flex flex-col min-h-0 h-full overflow-hidden">
          <Card className="flex flex-col h-full bg-[#111828]/95 border-white/10 shadow-xl overflow-hidden rounded-xl">
            {/* Header */}
            <CardHeader className="shrink-0 p-3.5 border-b border-white/10 bg-[#162035]/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base font-bold font-mono uppercase text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  {activeTab === "active"
                    ? `Active Queue (${activeIncidents.length})`
                    : `Solved Archive (${solvedIncidents.length})`}
                </CardTitle>
                <span className="font-mono text-xs text-zinc-400 font-semibold">
                  {activeTab === "active" ? "Awaiting Action" : "Contained in DB"}
                </span>
              </div>
            </CardHeader>

            {/* Scrollable list inside (zero window scrollbar) */}
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5 scrollbar-none">
              {(activeTab === "active" ? activeIncidents : solvedIncidents).length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center justify-center h-full gap-2 text-zinc-400 text-xs md:text-sm font-mono">
                  <ShieldAlert className="w-8 h-8 text-zinc-500" />
                  <span>No incidents in this view.</span>
                </div>
              ) : (
                (activeTab === "active" ? activeIncidents : solvedIncidents).map((item) => {
                  const isSelected = item.id === currentIncident?.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIncidentId(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? "bg-[#1d2942] border-amber-500/60 ring-1 ring-amber-500/30 shadow-md"
                          : "bg-[#0d1424] hover:bg-[#151f33] border-white/5"
                      }`}
                    >
                      {/* Image Thumbnail or Icon */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0 relative flex items-center justify-center">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        ) : (
                          <Flame className="w-6 h-6 text-amber-400/80" />
                        )}
                      </div>

                      {/* Content details with larger typography */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-xs font-bold text-amber-400 truncate flex items-center gap-1.5">
                            #{item.id} • {item.category?.toUpperCase() || "ALERT"}
                            {item.status &&
                              (item.status.includes("FLAGGED") ||
                                item.status.includes("FAKE") ||
                                item.status.includes("DEBUNKED")) && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/25 text-red-300 border border-red-500/40">
                                  HOAX
                                </span>
                              )}
                          </span>
                          <span className="font-mono text-xs text-zinc-400 shrink-0">
                            {formatElapsed(item.created_at)}
                          </span>
                        </div>

                        <div className="text-sm md:text-base font-bold text-white truncate font-heading">
                          {item.title}
                        </div>

                        <div className="text-xs text-zinc-300 truncate font-medium mt-0.5">
                          📍 {item.location_text || "Sector Area"}
                        </div>
                      </div>

                      {/* Right Indicator */}
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected ? "text-amber-400 translate-x-0.5" : "text-zinc-500"
                        }`}
                      />
                    </div>
                  );
                })
              )}
            </CardContent>

            {/* Footer Summary with larger typography */}
            <CardFooter className="shrink-0 p-3 border-t border-white/10 bg-[#0e1526] flex items-center justify-between font-mono text-xs md:text-sm text-zinc-300">
              <span>SHIFT OPERATOR: <strong className="text-white">{operatorName}</strong></span>
              <span className="text-teal-400 font-bold">
                {activeIncidents.length} OPEN / {solvedIncidents.length} RESOLVED
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ─── Image Fullscreen Preview Modal ───────────────────────────────── */}
      {imageModal && (
        <div
          onClick={() => setImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full h-full flex flex-col items-center justify-center">
            <Image
              src={imageModal}
              alt="Citizen Evidence"
              fill
              className="object-contain"
              unoptimized
            />
            <button
              onClick={() => setImageModal(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full px-3 py-1 font-mono text-xs cursor-pointer"
            >
              ✕ Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
