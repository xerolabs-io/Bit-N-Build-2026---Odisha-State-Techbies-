"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdminTelemetryBanner,
  HeroIncidentDossier,
  IncidentFilterBar,
  SecondaryIncidentQueue,
  EditorialModerationDesk,
  ActiveThreatSectorMap,
  InterAgencyStatusWidget,
  BroadcastComposerWidget,
} from "@/components/admin-command";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AdminDashboardClient({ operatorName = "Operator" }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // ─── Fetch Incidents from Database ─────────────────────────────────────────
  const fetchIncidents = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetch("/api/incidents?limit=60");
      if (!res.ok) {
        throw new Error(`Failed to query database ledger (${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setIncidents(json.data);
        setFetchError(null);

        // Select first incident by default if none selected or current no longer exists
        setSelectedIncidentId((prev) => {
          if (prev && json.data.some((i) => i.id === prev)) {
            return prev;
          }
          return json.data[0]?.id || null;
        });
      }
    } catch (err) {
      console.error("Admin incident fetch error:", err);
      if (!isSilent) setFetchError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and 8s auto-refresh
  useEffect(() => {
    fetchIncidents(false);

    const interval = setInterval(() => {
      fetchIncidents(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Selected incident object
  const selectedIncident = useMemo(() => {
    return (
      incidents.find((i) => i.id === selectedIncidentId) ||
      incidents[0] ||
      null
    );
  }, [incidents, selectedIncidentId]);

  // ─── Filtered Incidents for Secondary Queue ────────────────────────────────
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "hazard") {
        return (
          inc.category === "Fire" ||
          inc.category === "Hazard" ||
          inc.status === "ESCALATED CODE RED"
        );
      }
      if (activeFilter === "traffic") {
        return inc.category === "Traffic" || inc.category === "Transit";
      }
      if (activeFilter === "pending") {
        return (
          !inc.status ||
          inc.status === "PENDING CIVIC CONFIRMATION" ||
          inc.status === "REPORTED"
        );
      }
      if (activeFilter === "verified") {
        return (
          inc.status === "OFFICIALLY VERIFIED" ||
          (inc.confirm_count ?? 0) >= 2
        );
      }
      return true;
    });
  }, [incidents, activeFilter]);

  // ─── Pending Incidents for Moderation Desk ─────────────────────────────────
  const pendingIncidents = useMemo(() => {
    return incidents.filter(
      (inc) =>
        !inc.status ||
        inc.status === "PENDING CIVIC CONFIRMATION" ||
        inc.status === "REPORTED"
    );
  }, [incidents]);

  // ─── Admin Action: Update Incident in Database (PATCH) ─────────────────────
  const handleUpdateIncident = async (id, updatePayload) => {
    try {
      // Optimistic local update
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatePayload } : item
        )
      );

      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatePayload }),
      });

      if (!res.ok) {
        throw new Error("Failed to update incident on Supabase ledger");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setIncidents((prev) =>
          prev.map((item) => (item.id === id ? json.data : item))
        );
      }
    } catch (err) {
      console.error("Error updating incident:", err);
      // Re-fetch to synchronize state
      fetchIncidents(true);
    }
  };

  // ─── Admin Action: Reject / Discard Incident ──────────────────────────────
  const handleRejectIncident = async (id) => {
    try {
      // Optimistic update
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "DEBUNKED RUMOR" } : item
        )
      );

      await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "DEBUNKED RUMOR",
          trust_score: "FLAGGED NOISE / DEBUNKED",
        }),
      });
    } catch (err) {
      console.error("Error rejecting incident:", err);
      fetchIncidents(true);
    }
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="font-mono text-sm text-zinc-400">
          Connecting to Emergency Command Database...
        </p>
      </div>
    );
  }

  if (fetchError && incidents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <h3 className="text-white font-bold text-base font-heading">
            Telemetry Feed Disconnected
          </h3>
          <p className="text-xs text-red-300 font-mono">{fetchError}</p>
          <button
            onClick={() => fetchIncidents(false)}
            className="mt-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Re-establish Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 1. Live Admin Telemetry Banner */}
      <AdminTelemetryBanner
        incidents={incidents}
        onRefresh={() => fetchIncidents(false)}
        refreshing={refreshing}
      />

      {/* Main Command Dashboard */}
      <div className="max-w-[1720px] mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* 2. Hero Incident Dossier (Selected Real Incident) */}
        <HeroIncidentDossier
          incident={selectedIncident}
          onUpdateIncident={handleUpdateIncident}
        />

        {/* 3. Tier Filter Bar */}
        <IncidentFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          incidents={incidents}
          onRefresh={() => fetchIncidents(false)}
          refreshing={refreshing}
        />

        {/* 4. Two-Column Command Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left: Incident Queue + Editorial Moderation Desk (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            {/* Secondary Incident Queue with Real Incidents */}
            <SecondaryIncidentQueue
              incidents={filteredIncidents}
              selectedId={selectedIncidentId}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
              onUpdateIncident={handleUpdateIncident}
            />

            {/* Editorial Moderation Desk with Real Pending Citizen Reports */}
            <EditorialModerationDesk
              pendingIncidents={pendingIncidents}
              onApproveIncident={(id) =>
                handleUpdateIncident(id, {
                  status: "OFFICIALLY VERIFIED",
                  trust_score: "VERIFIED HIGH-CONFIDENCE",
                })
              }
              onRejectIncident={handleRejectIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
            />
          </div>

          {/* Right: Tactical Intelligence Sidebar (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Interactive Leaflet Tactical Map with Real Incident Pins */}
            <ActiveThreatSectorMap
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncidentId(inc.id)}
            />

            {/* Live Inter-Agency Readiness Status */}
            <InterAgencyStatusWidget />

            {/* Emergency Wireless Alert Broadcast Composer */}
            <BroadcastComposerWidget selectedIncident={selectedIncident} />
          </div>
        </div>
      </div>
    </>
  );
}
