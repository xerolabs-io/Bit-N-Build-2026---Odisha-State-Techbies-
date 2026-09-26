"use client";

import React, { useState, useMemo } from "react";
import {
  SectorBanner,
  IncidentReportForm,
  FeedFilterTabs,
  IncidentCard,
  ScanningSpectrumBanner,
  SpatialRadarWidget,
  CredibilityIndexWidget,
  NeighborhoodWatchlistWidget,
  InstantSignalDropWidget,
} from "@/components/citizen-portal";

// Initial mock data sourced directly from the Stitch design specifications
const INITIAL_INCIDENTS = [
  {
    id: "UTL-8821",
    title: "Water Pressure Drop & Basement Flooding on Mulberry St",
    category: "Utility",
    status: "UNDER REVIEW",
    statusVariant: "warning",
    timestamp: "42 mins ago",
    location: "Mulberry & Hester St",
    distanceMiles: 0.4,
    description:
      "Major water main fracture detected near Mulberry sidewalk. Residential brownstones experiencing total basement submersion. ConEd & DEP crews present on site shutting down trunk valve.",
    confirmCount: 84,
    disputeCount: 3,
    actionType: "comment",
    actionLabel: "Update (19)",
    trustScore: "COMMUNITY TRUST: 96%",
    image: "/stitch/issue_1.jpg",
    thumbnailBadge: {
      text: "3 Eyewitness Clips",
      icon: "camera",
      position: "bottom-2 left-2",
    },
  },
  {
    id: "TRF-1049",
    title: "Traffic Gridlock & Broken Signal at 7th Ave & 34th St",
    category: "Traffic",
    status: "TRAFFIC HAZARD",
    statusVariant: "danger",
    timestamp: "18 mins ago",
    location: "7th Ave & 34th St",
    distanceMiles: 1.2,
    description:
      "Signal light stuck on all-red. Midtown south corridor backed up across 8 continuous blocks toward Penn Station. Citizens recommend immediate detour through 6th Ave or 8th Ave bypasses.",
    confirmCount: 142,
    disputeCount: 1,
    actionType: "detour",
    actionLabel: "Detour Feed (7)",
    trustScore: "95% AGREEMENT",
    image: "/stitch/issue_2.jpg",
    thumbnailBadge: {
      text: "+25m Delay",
      variant: "danger",
      position: "top-2 right-2",
    },
  },
  {
    id: "HAZ-0039",
    title: "Downed Power Lines Blocking Sidewalk after Gusts",
    category: "Fire",
    status: "HIGH DANGER",
    statusVariant: "danger",
    timestamp: "1 hr ago",
    location: "East 14th St & Ave B",
    distanceMiles: 0.8,
    description:
      "Live wire sparking against perimeter tree near community garden. Fire Engine Co. 5 perimeter tape active. Do not approach sidewalk. Pedestrian crossing rerouted.",
    confirmCount: 219,
    disputeCount: 0,
    actionType: "broadcast",
    actionLabel: "Broadcast Safety Alert",
    trustScore: "FDNY NOTIFIED",
    image: "/stitch/issue_3.jpg",
    thumbnailBadge: {
      text: "LIVE VOLTAGE",
      icon: "zap",
      variant: "danger",
      position: "top-2 left-2",
    },
  },
];

export default function CitizenPortalPage() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [activeFilter, setActiveFilter] = useState("all");

  // Filter incidents based on selected tab
  const filteredIncidents = useMemo(() => {
    switch (activeFilter) {
      case "near":
        return incidents.filter((item) => (item.distanceMiles || 0) < 1.0);
      case "unverified":
        return incidents.filter(
          (item) => item.status.includes("PENDING") || item.confirmCount < 100
        );
      case "transit":
        return incidents.filter(
          (item) => item.category === "Traffic" || item.category === "Transit"
        );
      case "resolved":
        return incidents.filter((item) => item.status === "RESOLVED TODAY");
      case "all":
      default:
        return incidents;
    }
  }, [incidents, activeFilter]);

  // Handler for adding a new incident report
  const handleAddNewIncident = (newIncident) => {
    setIncidents((prev) => [newIncident, ...prev]);
  };

  // Handler for incident voting
  const handleVote = (incidentId, type) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            confirmCount:
              type === "confirm" ? inc.confirmCount + 1 : inc.confirmCount,
            disputeCount:
              type === "dispute" ? inc.disputeCount + 1 : inc.disputeCount,
          };
        }
        return inc;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Top Sector Telemetry Banner */}
      <SectorBanner
        sectorName="MIDTOWN & LOWER MANHATTAN (RADIUS: 3.5 MI)"
        activeCount={incidents.length}
        responseVelocity="~4.2 min"
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* 2. Prominent Report Incident Intake Card */}
        <IncidentReportForm onSubmit={handleAddNewIncident} />

        {/* 3. Two-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dispatches Feed (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Filter Tabs Header */}
            <FeedFilterTabs
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
              totalCount={filteredIncidents.length}
            />

            {/* Incidents Feed List */}
            <div className="flex flex-col gap-4">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onVote={handleVote}
                  />
                ))
              ) : (
                <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono text-lg">
                    0
                  </div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    No active dispatches found for this filter
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-sm">
                    All corridors under this protocol are currently quiet or have completed verified response sweeps.
                  </p>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-colors"
                  >
                    RESET TO ALL ISSUES
                  </button>
                </div>
              )}
            </div>

            {/* Scanning Civic Spectrum Crawl Banner */}
            <ScanningSpectrumBanner />
          </div>

          {/* Right Column: Telemetry & Citizen Tools Sidebar (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Spatial Radar Mini-Map */}
            <SpatialRadarWidget />

            {/* Citizen Credibility Meter */}
            <CredibilityIndexWidget
              tier="TIER 3"
              veracity="94.8%"
              confirmedRatio="18 / 19"
              progressPercent={82}
              nextMilestone="Tier 4 Dispatcher"
              reportsRemaining={2}
            />

            {/* Neighborhood Watchlist */}
            <NeighborhoodWatchlistWidget />

            {/* Instant Signal Drop Shortcut */}
            <InstantSignalDropWidget onQuickDrop={handleAddNewIncident} />
          </div>
        </div>
      </div>
    </div>
  );
}

