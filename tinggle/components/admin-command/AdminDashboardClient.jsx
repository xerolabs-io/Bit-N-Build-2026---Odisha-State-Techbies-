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
  PhoneCall,
  AlertOctagon,
  Radio,
  Ambulance,
  History,
  ArrowBigUp,
  Flag,
  AlertTriangle,
  FileText,
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
  Medical: "bg-red-600/30 text-red-200 border-red-500/60",
  Crime: "bg-blue-600/30 text-blue-200 border-blue-500/60",
  Fire: "bg-orange-600/30 text-orange-200 border-orange-500/60",
  Hazard: "bg-red-500/20 text-red-300 border-red-500/40",
  Traffic: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Transit: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Utility: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  Infrastructure: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  "Public Safety": "bg-sky-500/20 text-sky-300 border-sky-500/40",
};

// Helper: check if incident is an SOS beacon
function isSosIncident(item) {
  if (!item) return false;
  return (
    item.id?.startsWith("SOS-") ||
    item.category === "SOS" ||
    item.title?.includes("SOS") ||
    item.status?.includes("SOS")
  );
}

// Helper: extract caller phone number from contact_phone or description metadata
function getCallerPhone(item) {
  if (!item) return null;
  if (item.contact_phone) return String(item.contact_phone).trim();
  if (item.phone) return String(item.phone).trim();
  if (item.reporter_phone) return String(item.reporter_phone).trim();
  if (item.description) {
    const match = item.description.match(/\[EMERGENCY CALLER CONTACT:\s*([^\]]+)\]/i);
    if (match && match[1]) return match[1].trim();
    const match2 = item.description.match(/(?:phone|contact|mobile|tel)[\s:]*([+]?[\d\s-]{10,15})/i);
    if (match2 && match2[1]) return match2[1].trim();
    const matchDigits = item.description.match(/\b([6-9]\d{9})\b/);
    if (matchDigits && matchDigits[1]) return matchDigits[1].trim();
  }
  return null;
}

export default function AdminDashboardClient({ operatorName = "Operator" }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "sos" | "solved"
  const [sosSubTab, setSosSubTab] = useState("pending"); // "pending" | "enroute" | "history"
  const [selectedUnitType, setSelectedUnitType] = useState("Fire & HazMat Squad");
  const [dispatches, setDispatches] = useState({});
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
          // Default to first active (unresolved) incident with priority to SOS
          const pendingSos = json.data.find(
            (i) =>
              isSosIncident(i) &&
              i.status !== "RESOLVED" &&
              !i.status?.includes("CONTAINED")
          );
          if (pendingSos) return pendingSos.id;

          const firstActive = json.data.find(
            (i) => i.status !== "RESOLVED & CONTAINED" && i.status !== "SOLVED" && i.status !== "RESOLVED"
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
    const interval = setInterval(() => fetchIncidents(true), 6000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // ─── Categorization Functions ──────────────────────────────────────────────
  const isIncidentClosed = useCallback((status) => {
    if (!status) return false;
    const s = String(status).toUpperCase();
    return (
      s === "RESOLVED & CONTAINED" ||
      s === "SOLVED" ||
      s === "RESOLVED" ||
      s.includes("FAKE") ||
      s.includes("DISINFORMATION") ||
      s.includes("DEBUNKED") ||
      s.includes("HOAX")
    );
  }, []);

  // SOS Sub-Lists
  const pendingSosIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (!isSosIncident(i)) return false;
      const s = String(i.status || "").toUpperCase();
      return !isIncidentClosed(s) && !s.includes("EN ROUTE") && !s.includes("DISPATCHED");
    });
  }, [incidents, isIncidentClosed]);

  const enRouteSosIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (!isSosIncident(i)) return false;
      const s = String(i.status || "").toUpperCase();
      return !isIncidentClosed(s) && (s.includes("EN ROUTE") || s.includes("DISPATCHED"));
    });
  }, [incidents, isIncidentClosed]);

  const allSosIncidents = useMemo(() => {
    return incidents.filter(isSosIncident);
  }, [incidents]);

  // General Active Queue (SOS is sorted to Priority #1 at top)
  const activeIncidents = useMemo(() => {
    const list = incidents.filter((i) => !isIncidentClosed(i.status));
    return list.sort((a, b) => {
      const aIsSos = isSosIncident(a);
      const bIsSos = isSosIncident(b);
      // SOS alerts are Priority #1
      if (aIsSos && !bIsSos) return -1;
      if (!aIsSos && bIsSos) return 1;

      // Pending SOS before En Route SOS
      const aPending = aIsSos && !String(a.status).includes("EN ROUTE");
      const bPending = bIsSos && !String(b.status).includes("EN ROUTE");
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;

      // Then newest first
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [incidents, isIncidentClosed]);

  const solvedIncidents = useMemo(() => {
    return incidents.filter((i) => isIncidentClosed(i.status));
  }, [incidents, isIncidentClosed]);

  // Current list based on active tab and sub-tab
  const currentList = useMemo(() => {
    if (activeTab === "solved") return solvedIncidents;
    if (activeTab === "sos") {
      if (sosSubTab === "pending") return pendingSosIncidents;
      if (sosSubTab === "enroute") return enRouteSosIncidents;
      return allSosIncidents;
    }
    return activeIncidents;
  }, [
    activeTab,
    sosSubTab,
    activeIncidents,
    solvedIncidents,
    pendingSosIncidents,
    enRouteSosIncidents,
    allSosIncidents,
  ]);

  // Currently focused incident
  const currentIncident = useMemo(() => {
    const found = currentList.find((i) => i.id === selectedIncidentId);
    return found || currentList[0] || incidents.find((i) => i.id === selectedIncidentId) || null;
  }, [currentList, selectedIncidentId, incidents]);

  // ─── Action: Dispatch Help ─────────────────────────────────────────────────
  const handleDispatchHelp = async () => {
    if (!currentIncident) return;
    setActionLoading(true);
    const incidentToDispatch = currentIncident;
    const squadName = selectedUnitType;
    const isSos = isSosIncident(incidentToDispatch);

    // If SOS, set status to "HELP EN ROUTE · DISPATCHED" so caller & nearby citizens see help is arriving!
    const targetStatus = isSos
      ? "HELP EN ROUTE · DISPATCHED"
      : "RESOLVED & CONTAINED";
    const targetTrustScore = `${squadName.toUpperCase()} DISPATCHED`;

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          id: incidentToDispatch.id,
          status: targetStatus,
          trust_score: targetTrustScore,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update incident in database");
      }

      // Update local state
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentToDispatch.id
            ? {
                ...item,
                status: targetStatus,
                trust_score: targetTrustScore,
              }
            : item
        )
      );

      setDispatches((prev) => ({
        ...prev,
        [incidentToDispatch.id]: `${squadName} Dispatched`,
      }));

      // If in SOS view, switch to "enroute" sub-tab to show it transferred!
      if (isSos) {
        if (activeTab === "sos") {
          setSosSubTab("enroute");
        }
      }

      // Advance to next pending issue if available
      const remaining = currentList.filter((i) => i.id !== incidentToDispatch.id);
      if (remaining.length > 0) {
        setSelectedIncidentId(remaining[0].id);
      }
    } catch (err) {
      console.error("Error dispatching help:", err);
      alert(`Dispatch Error: ${err.message}`);
      fetchIncidents(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Action: Flag as Fake / Hoax ──────────────────────────────────────────
  const handleFlagFake = async (reason = "FLAGGED AS FAKE BY HQ") => {
    if (!currentIncident) return;
    const confirmAction = window.confirm(
      `Flag incident #${currentIncident.id} ("${currentIncident.title}") as Fake / Disinformation?\n\nThis will lock public voting and archive it.`
    );
    if (!confirmAction) return;

    setActionLoading(true);
    const incidentToFlag = currentIncident;

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
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

      const remaining = currentList.filter((i) => i.id !== incidentToFlag.id);
      if (remaining.length > 0) {
        setSelectedIncidentId(remaining[0].id);
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
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
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

  const isCurrentSos = isSosIncident(currentIncident);
  const callerPhone = getCallerPhone(currentIncident);
  const currentUpvotes = currentIncident?.confirm_count ?? currentIncident?.confirmCount ?? 1;
  const currentDisputes = currentIncident?.dispute_count ?? currentIncident?.disputeCount ?? 0;
  const isHelpAlreadyDispatched = useMemo(() => {
    if (!currentIncident?.status) return false;
    const s = String(currentIncident.status).toUpperCase();
    return s.includes("EN ROUTE") || s.includes("DISPATCHED");
  }, [currentIncident?.status]);

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
    <div className="flex-1 flex flex-col bg-[#0a0f1d] text-zinc-100">
      {/* ─── Top Operational Bar ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#0e1526] border-b border-white/10 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 font-mono text-xs md:text-sm flex-wrap">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Active Queue Tab */}
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
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {activeIncidents.length}
            </span>
          </button>

          {/* Dedicated SOS Dispatches Tab (Priority #1 Room) */}
          <button
            onClick={() => {
              setActiveTab("sos");
              // Focus first pending or first SOS
              if (pendingSosIncidents.length > 0) {
                setSosSubTab("pending");
                setSelectedIncidentId(pendingSosIncidents[0].id);
              } else if (enRouteSosIncidents.length > 0) {
                setSosSubTab("enroute");
                setSelectedIncidentId(enRouteSosIncidents[0].id);
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "sos"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400"
                : pendingSosIncidents.length > 0
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse"
                : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <span>🚨 SOS Dispatches</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === "sos"
                  ? "bg-white text-red-700"
                  : "bg-red-500 text-white"
              }`}
            >
              {pendingSosIncidents.length + enRouteSosIncidents.length}
            </span>
          </button>

          {/* Solved Ledger Tab */}
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

      {/* ─── Sub-bar when in SOS View: Transfer to Different Sections ─────── */}
      {activeTab === "sos" && (
        <div className="shrink-0 bg-[#12192c] border-b border-red-500/30 px-4 md:px-6 py-2 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold uppercase mr-1">SOS SECTIONS:</span>
            <button
              onClick={() => setSosSubTab("pending")}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                sosSubTab === "pending"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span>Pending Dispatch ({pendingSosIncidents.length})</span>
            </button>

            <button
              onClick={() => setSosSubTab("enroute")}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                sosSubTab === "enroute"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <Ambulance className="w-3.5 h-3.5 text-emerald-300" />
              <span>Active Rescues / En Route ({enRouteSosIncidents.length})</span>
            </button>

            <button
              onClick={() => setSosSubTab("history")}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                sosSubTab === "history"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <History className="w-3.5 h-3.5 text-teal-300" />
              <span>All SOS History ({allSosIncidents.length})</span>
            </button>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            SOS alerts are priority #1. Help is broadcast live to caller &amp; nearby citizens.
          </span>
        </div>
      )}

      {/* ─── Main Cockpit Grid ───────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3 md:p-3.5 min-h-[750px]">
        {/* ── LEFT & CENTER: Primary Incident Cockpit (8 of 12 cols) ──────── */}
        <div className="lg:col-span-8 flex flex-col min-h-[680px]">
          {currentIncident ? (
            <Card className="flex flex-col h-full bg-[#111828]/95 border-white/10 shadow-2xl rounded-xl">
              {/* Header: Badges, Title, Quick Location, Status (Pinned top, compact) */}
              <CardHeader className="shrink-0 p-3 md:p-3.5 pb-2.5 border-b border-white/10 bg-[#162035]/95 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority #1 SOS Badge or Category */}
                    {isCurrentSos ? (
                      <Badge className="font-mono text-xs font-black uppercase px-2.5 py-0.5 bg-red-600 text-white border border-red-400 animate-pulse shadow-md shadow-red-600/50 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>PRIORITY #1 SOS</span>
                      </Badge>
                    ) : (
                      <Badge
                        className={`font-mono text-xs font-bold uppercase px-2.5 py-0.5 border ${
                          CATEGORY_COLORS[currentIncident.category] ||
                          "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {currentIncident.category || "CIVIC ISSUE"}
                      </Badge>
                    )}

                    <Badge
                      variant="outline"
                      className="font-mono text-xs font-bold text-zinc-100 border-white/20 bg-white/5 px-2 py-0.5"
                    >
                      #{currentIncident.id}
                    </Badge>

                    <span className="font-mono text-xs text-zinc-300 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {formatElapsed(currentIncident.created_at)}
                    </span>

                    {/* Upvote Count Badge */}
                    <span
                      className="font-mono text-xs font-bold text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"
                      title="Citizen Upvotes / Corroborations"
                    >
                      <ArrowBigUp className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30" />
                      <span>{currentUpvotes} Upvote{currentUpvotes === 1 ? "" : "s"}</span>
                    </span>

                    {/* Flag as Fake Count Badge */}
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                        currentDisputes > 0
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-sm animate-pulse font-extrabold"
                          : "bg-white/5 text-zinc-400 border border-white/10"
                      }`}
                      title="Citizens who flagged this post as fake / hoax"
                    >
                      <Flag className="w-3 h-3 text-rose-400" />
                      <span>{currentDisputes} Flagged Fake</span>
                    </span>

                    {currentIncident.reporter_email && (
                      <span className="hidden xl:inline font-mono text-xs text-zinc-400">
                        • Caller: <strong className="text-zinc-200">{currentIncident.reporter_email}</strong>
                      </span>
                    )}
                  </div>

                  {/* Status Banner */}
                  {currentIncident.status &&
                    (currentIncident.status.includes("EN ROUTE") ||
                      currentIncident.status.includes("DISPATCHED")) && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold animate-pulse">
                        <Ambulance className="w-3.5 h-3.5 text-emerald-400" />
                        <span>HELP EN ROUTE</span>
                      </span>
                    )}

                  {currentIncident.status === "RESOLVED" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/50 text-teal-300 font-mono text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>RESOLVED</span>
                    </span>
                  )}
                </div>

                {/* Title & Quick Location Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg md:text-xl font-bold font-heading text-white leading-tight">
                    {currentIncident.title}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-[#0c1220] border border-white/10 px-2.5 py-1 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-semibold text-zinc-100 max-w-[200px] truncate">
                      {currentIncident.location_text || "Sector Perimeter"}
                    </span>
                    {currentIncident.latitude && (
                      <span className="font-mono text-[11px] text-zinc-400 hidden sm:inline">
                        ({Number(currentIncident.latitude).toFixed(3)}°N, {Number(currentIncident.longitude).toFixed(3)}°E)
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Content: Fluid & naturally sized */}
              <CardContent className="flex-1 p-3.5 md:p-4 space-y-3.5">
                {/* 1. Caller Phone Dial Banner (High Priority for SOS) */}
                {isCurrentSos && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-xl bg-linear-to-r from-red-950/90 via-[#181122] to-emerald-950/50 border border-red-500/60 shadow-lg gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/60 text-red-300 shrink-0">
                        <PhoneCall className="w-4 h-4 text-red-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black uppercase tracking-wider text-red-400">
                            SOS CALLER DIRECT LINE:
                          </span>
                          <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-mono font-bold border border-red-500/30">
                            LIVE BEACON
                          </span>
                        </div>
                        <div className="font-mono text-sm md:text-base font-black text-white tracking-wider">
                          {callerPhone || "Phone transmitted with beacon"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {callerPhone ? (
                        <>
                          <a
                            href={`tel:${callerPhone}`}
                            className="px-3 py-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 border border-emerald-400/30 cursor-pointer"
                            title="Direct call via mobile carrier"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>DIRECT CALL</span>
                          </a>

                          <a
                            href={`https://api.whatsapp.com/send?phone=${callerPhone.replace(/[^\d]/g, "")}&text=${encodeURIComponent(
                              `🚨 Tinggle Emergency Command HQ: We have received your SOS beacon (#${currentIncident.id}) and help has been dispatched.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                            title="Open WhatsApp chat with caller"
                          >
                            <span>WhatsApp</span>
                          </a>
                        </>
                      ) : (
                        <a
                          href="tel:112"
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>DIAL 112</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Citizen Disinformation Alert Callout when flagged as fake */}
                {currentDisputes > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                      <span>
                        <strong className="text-rose-300 font-bold">Citizen Disinformation Warning:</strong>{" "}
                        {currentDisputes} citizen{currentDisputes === 1 ? "" : "s"} flagged this report as fake news / hoax.
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-300 shrink-0 hidden sm:inline">
                      {currentUpvotes}▲ vs {currentDisputes}🚩
                    </span>
                  </div>
                )}

                {/* 3. Detailed Incident Dossier / Briefing */}
                <div className="p-3.5 rounded-xl bg-[#0c1322] border border-white/10 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
                        INCIDENT DOSSIER &amp; BRIEFING
                      </span>
                    </div>
                    {currentIncident.reporter_email && (
                      <span className="text-[11px] text-zinc-400">
                        Dispatched By: <strong className="text-zinc-200">{currentIncident.reporter_email}</strong>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {currentIncident.description ||
                      "Citizen emergency report filed through Tinggle Emergency Network."}
                  </p>
                </div>

                {/* 4. Side-by-Side Media & Map Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[220px] md:min-h-[260px]">
                  {/* Evidence Image View */}
                  <div className="flex flex-col h-full min-h-[200px] md:min-h-0 rounded-xl overflow-hidden border border-white/10 bg-[#080d17] relative group shadow-sm">
                    {currentIncident.image_url ? (
                      <div className="relative w-full h-full min-h-[200px]">
                        <Image
                          src={currentIncident.image_url}
                          alt={currentIncident.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2.5 py-0.5 rounded-md text-xs font-mono text-teal-300 border border-teal-500/40 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_4px_#2dd4bf]" />
                          CITIZEN EVIDENCE PHOTO
                        </div>
                        <button
                          onClick={() => setImageModal(currentIncident.image_url)}
                          className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/85 hover:bg-black px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-200 hover:text-white border border-white/15 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" /> Full View
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2">
                        {isCurrentSos ? (
                          <AlertOctagon className="w-8 h-8 text-red-500 animate-pulse" />
                        ) : (
                          <Flame className="w-8 h-8 text-amber-400/80" />
                        )}
                        <span className="font-mono text-xs text-zinc-200 font-bold uppercase">
                          {isCurrentSos ? "DIRECT SOS SATELLITE BEACON" : "NO PHOTO ATTACHED"}
                        </span>
                        <p className="text-xs text-zinc-400 max-w-xs">
                          {isCurrentSos
                            ? "Caller triggered instant emergency beacon. Direct GPS and carrier tower telemetry locked."
                            : "Incident geo-located from reporter GPS coordinates."}
                        </p>
                        <span className="mt-0.5 font-mono text-[11px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded font-semibold">
                          GPS LOCK ACTIVE
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Map View */}
                  <div className="flex flex-col h-full min-h-[200px] md:min-h-0 rounded-xl overflow-hidden border border-white/10 bg-[#080d17] relative shadow-sm">
                    <ActiveThreatSectorMap
                      incidents={incidents}
                      selectedIncident={currentIncident}
                      compact={true}
                      className="w-full h-full min-h-[200px]"
                    />
                  </div>
                </div>

                {/* 5. Telemetry & Community Ledger Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-[#0c1322] border border-white/10 p-3 rounded-xl text-xs font-mono shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      COMMUNITY SIGNALS
                    </span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ▲ {currentUpvotes} Upvote{currentUpvotes === 1 ? "" : "s"}
                    </span>
                    <span
                      className={`text-[11px] ${
                        currentDisputes > 0 ? "text-rose-400 font-bold" : "text-zinc-400"
                      }`}
                    >
                      🚩 {currentDisputes} Fake Report{currentDisputes === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      CONFIDENCE SCORE
                    </span>
                    <span className="text-amber-400 font-bold text-sm">
                      {currentIncident.trust_score || "COMMUNITY: 92%"}
                    </span>
                    <span className="text-[11px] text-teal-400 font-semibold">
                      Verified Ledger
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      SECTOR LOCATION
                    </span>
                    <span className="text-sky-300 font-bold text-xs truncate">
                      {currentIncident.latitude && currentIncident.longitude
                        ? `${Number(currentIncident.latitude).toFixed(4)}°N, ${Number(currentIncident.longitude).toFixed(4)}°E`
                        : "Pending GPS Lock"}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate">
                      {currentIncident.location_text || "Sector Perimeter"}
                    </span>
                  </div>
                </div>
              </CardContent>

              {/* Footer: Dispatch Help Action (Always Pinned & Accessible) */}
              <CardFooter className="shrink-0 p-2.5 md:p-3 border-t border-white/10 bg-[#162035]/95 flex flex-wrap items-center justify-between gap-2.5 z-10">
                {/* Left: Squad Selection */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-[#0b101d] border border-white/15 rounded-lg px-2.5 py-1.5 shadow-sm">
                    <Siren className="w-4 h-4 text-amber-400 ml-0.5 shrink-0" />
                    <span className="text-xs font-mono text-zinc-400 font-semibold hidden sm:inline">SQUAD:</span>
                    <select
                      value={selectedUnitType}
                      onChange={(e) => setSelectedUnitType(e.target.value)}
                      className="bg-transparent text-zinc-100 text-xs font-mono font-semibold focus:outline-none pr-1 cursor-pointer"
                    >
                      <option className="bg-[#111828] text-white">🚒 Fire &amp; HazMat Squad</option>
                      <option className="bg-[#111828] text-white">🚓 Police Tactical Unit</option>
                      <option className="bg-[#111828] text-white">🚑 EMS Ambulance Triage</option>
                      <option className="bg-[#111828] text-white">🚨 Rapid Taskforce</option>
                    </select>
                  </div>
                </div>

                {/* Right: Dispatch Help and Flag as Fake buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isIncidentClosed(currentIncident.status) ? (
                    <>
                      {/* Direct phone call shortcut right next to dispatch */}
                      {isCurrentSos && callerPhone && (
                        <a
                          href={`tel:${callerPhone}`}
                          className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 font-mono text-xs font-bold shadow-md transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
                          title="Call the SOS caller directly"
                        >
                          <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                          <span>Call: {callerPhone}</span>
                        </a>
                      )}

                      <Button
                        onClick={() => handleFlagFake("FLAGGED AS FAKE BY HQ")}
                        disabled={actionLoading}
                        className="h-9 px-3 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-300 border border-red-500/40 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50 transition-colors"
                        title="Mark report as fake news / hoax and archive"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        <span>Flag as Fake</span>
                      </Button>

                      {/* Send Help Button: Disabled after help is sent */}
                      {isHelpAlreadyDispatched ? (
                        <Button
                          disabled={true}
                          className="h-9 px-4 font-mono text-xs font-black tracking-wider flex items-center gap-2 bg-emerald-600/25 text-emerald-300 border-2 border-emerald-500/60 cursor-not-allowed opacity-90 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>HELP EN ROUTE</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={handleDispatchHelp}
                          disabled={actionLoading}
                          className={`h-9 px-4 font-mono text-xs font-black tracking-wider flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 ${
                            isCurrentSos
                              ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 animate-pulse"
                              : "bg-teal-500 hover:bg-teal-400 text-black"
                          }`}
                        >
                          {actionLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{isCurrentSos ? "SEND HELP" : "Dispatch Help"}</span>
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleReopenIncident(currentIncident.id)}
                      disabled={actionLoading}
                      className="h-9 px-3.5 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/40 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
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
                All Threats In This View Handled
              </CardTitle>
              <CardDescription className="text-sm md:text-base text-zinc-300 max-w-md">
                There are no pending alerts in this category. You can inspect other sections or archives.
              </CardDescription>
              <Button
                onClick={() => setActiveTab("active")}
                className="mt-2 bg-amber-500 text-black font-bold font-mono text-xs md:text-sm px-4 py-2"
              >
                Back to Active Queue ({activeIncidents.length})
              </Button>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN: Queue / SOS / Solved Archive (4 of 12 cols) ───── */}
        <div className="lg:col-span-4 flex flex-col min-h-[600px] lg:max-h-[850px]">
          <Card className="flex flex-col h-full bg-[#111828]/95 border-white/10 shadow-xl rounded-xl">
            {/* Header */}
            <CardHeader className="shrink-0 p-3.5 border-b border-white/10 bg-[#162035]/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base font-bold font-mono uppercase text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  {activeTab === "sos"
                    ? `SOS ${sosSubTab.toUpperCase()} (${currentList.length})`
                    : activeTab === "active"
                    ? `Active Queue (${activeIncidents.length})`
                    : `Solved Archive (${solvedIncidents.length})`}
                </CardTitle>
                <span className="font-mono text-xs text-zinc-400 font-semibold">
                  {activeTab === "sos"
                    ? "Priority Dispatch"
                    : activeTab === "active"
                    ? "Awaiting Action"
                    : "Contained in DB"}
                </span>
              </div>
            </CardHeader>

            {/* Scrollable list inside (Normal Scrollbar) */}
            <CardContent className="flex-1 min-h-[450px] overflow-y-auto p-2.5 space-y-2.5">
              {currentList.length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center justify-center h-full gap-2 text-zinc-400 text-xs md:text-sm font-mono">
                  <ShieldAlert className="w-8 h-8 text-zinc-500" />
                  <span>No incidents in this view.</span>
                </div>
              ) : (
                currentList.map((item) => {
                  const isSelected = item.id === currentIncident?.id;
                  const itemIsSos = isSosIncident(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIncidentId(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? itemIsSos
                            ? "bg-red-950/70 border-red-500 ring-2 ring-red-500/40 shadow-lg"
                            : "bg-[#1d2942] border-amber-500/60 ring-1 ring-amber-500/30 shadow-md"
                          : itemIsSos
                          ? "bg-red-950/30 hover:bg-red-950/50 border-red-500/40"
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
                        ) : itemIsSos ? (
                          <AlertOctagon className="w-7 h-7 text-red-400 animate-pulse" />
                        ) : (
                          <Flame className="w-6 h-6 text-amber-400/80" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-xs font-bold text-amber-400 truncate flex items-center gap-1.5">
                            {itemIsSos ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-black animate-pulse">
                                🚨 SOS
                              </span>
                            ) : null}
                            #{item.id}
                          </span>
                          <span className="font-mono text-xs text-zinc-400 shrink-0">
                            {formatElapsed(item.created_at)}
                          </span>
                        </div>

                        <div className="text-sm md:text-base font-bold text-white truncate font-heading">
                          {item.title}
                        </div>

                        <div className="text-xs text-zinc-300 truncate font-medium mt-0.5 flex items-center justify-between">
                          <span>📍 {item.location_text || "Sector Area"}</span>
                          {item.status && item.status.includes("EN ROUTE") && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">
                              EN ROUTE
                            </span>
                          )}
                        </div>

                        {/* Upvotes & Flagged as Fake counters for quick admin triage */}
                        <div className="flex items-center gap-2.5 text-[11px] font-mono mt-1 text-zinc-400">
                          <span
                            className="flex items-center gap-1 text-emerald-400 font-semibold"
                            title="Citizen Upvotes"
                          >
                            <ArrowBigUp className="w-3.5 h-3.5 fill-emerald-400/20" />
                            {item.confirm_count ?? item.confirmCount ?? 1}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              (item.dispute_count ?? item.disputeCount ?? 0) > 0
                                ? "text-rose-400 font-bold"
                                : "text-zinc-400"
                            }`}
                            title="Citizens Flagged as Fake"
                          >
                            <Flag className="w-3 h-3 text-rose-400" />
                            {item.dispute_count ?? item.disputeCount ?? 0} Fake
                          </span>
                          {item.trust_score && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="text-teal-400/80 truncate text-[10px]">
                                {item.trust_score}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Caller Phone Display in Sidebar */}
                        {itemIsSos && getCallerPhone(item) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 mt-1">
                            <PhoneCall className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{getCallerPhone(item)}</span>
                          </div>
                        )}
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

            {/* Footer Summary */}
            <CardFooter className="shrink-0 p-3 border-t border-white/10 bg-[#0e1526] flex items-center justify-between font-mono text-xs md:text-sm text-zinc-300">
              <span>OPERATOR: <strong className="text-white">{operatorName}</strong></span>
              <span className="text-teal-400 font-bold">
                {pendingSosIncidents.length} SOS PENDING / {enRouteSosIncidents.length} EN ROUTE
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
