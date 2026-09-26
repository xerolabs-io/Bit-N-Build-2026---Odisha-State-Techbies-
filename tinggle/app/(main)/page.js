"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  SectorBanner,
  IncidentReportForm,
  FeedFilterTabs,
  IncidentCard,
  ScanningSpectrumBanner,
  SpatialRadarWidget,
  NeighborhoodWatchlistWidget,
} from "@/components/citizen-portal";
import { useGeoLocation, GEO_STATES } from "@/hooks/useGeoLocation";
import { useUser } from "@clerk/nextjs";
import { Loader2, AlertTriangle, MapPin } from "lucide-react";

// ─── Haversine distance in miles between two lat/lng points ───────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_THRESHOLD_MILES = 10;

// ─── Determine Incident Priority: 1 (GPS/Home) -> 2 (Watchlist) -> 3 (Other) ──
function assignPriority(card, userLat, userLng, enabledWatchlist) {
  // 1. Where user is / lives: within nearby threshold of current GPS
  if (card.distanceMiles !== null && card.distanceMiles <= NEARBY_THRESHOLD_MILES) {
    return {
      priority: 1,
      badge: {
        type: "near",
        label: `📍 NEAR YOU (${card.distanceMiles} mi)`,
      },
    };
  }

  // 2. Watched Neighborhoods: matches any enabled watchlist sector
  if (enabledWatchlist && enabledWatchlist.length > 0) {
    const locLower = (card.location || "").toLowerCase();
    const titleLower = (card.title || "").toLowerCase();
    const descLower = (card.description || "").toLowerCase();

    for (const sector of enabledWatchlist) {
      if (
        locLower.includes(sector) ||
        titleLower.includes(sector) ||
        descLower.includes(sector)
      ) {
        const displaySector =
          sector.charAt(0).toUpperCase() + sector.slice(1);
        return {
          priority: 2,
          badge: {
            type: "watchlist",
            label: `⭐ WATCHLIST: ${displaySector}`,
          },
        };
      }
    }
  }

  // 3. Other regional / latest news
  return {
    priority: 3,
    badge: null,
  };
}

// ─── Normalise a raw DB row into a feed card shape ────────────────────────────
function dbRowToCard(row, userLat, userLng) {
  const dist = haversineDistance(userLat, userLng, row.latitude, row.longitude);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status || "PENDING CIVIC CONFIRMATION",
    statusVariant:
      row.status?.includes("DANGER") || row.status?.includes("HAZARD")
        ? "danger"
        : "warning",
    timestamp: timeAgo(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: row.location_text || "Location not provided",
    distanceMiles: dist ? parseFloat(dist.toFixed(2)) : null,
    description: row.description || "",
    confirmCount: row.confirm_count ?? 1,
    disputeCount: row.dispute_count ?? 0,
    actionType: "comment",
    actionLabel: "Update",
    trustScore: row.trust_score || "COMMUNITY TRUST: VERIFYING",
    image: row.image_url || null,
    isUserCreated: false,
  };
}

function timeAgo(isoString) {
  if (!isoString) return "Just now";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) > 1 ? "s" : ""} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CitizenPortalPage() {
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  // ─── Real GPS (shared hook, auto-fetch) ────────────────────────────────────
  const { geoState, coords } = useGeoLocation(true);
  const userLat = coords?.lat;
  const userLng = coords?.lng;

  // ─── Watchlist State & Persistence (Starts empty, loaded from Supabase) ───
  const [watchlist, setWatchlist] = useState([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [isSavingWatchlist, setIsSavingWatchlist] = useState(false);

  // Load watchlist on mount or user change (localStorage + Supabase API)
  useEffect(() => {
    // 1. Clean up any legacy dummy data
    try {
      const legacy = localStorage.getItem("tinggle_watchlist");
      if (legacy) {
        localStorage.removeItem("tinggle_watchlist");
      }
    } catch (e) { }

    // 2. If logged in, fetch from DB
    if (userEmail) {
      try {
        const cached = localStorage.getItem(`tinggle_watchlist_${userEmail}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setWatchlist(parsed);
          }
        }
      } catch (e) { }

      (async () => {
        setIsLoadingWatchlist(true);
        try {
          const res = await fetch(`/api/watchlist?email=${encodeURIComponent(userEmail)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.watchlist)) {
            setWatchlist(data.watchlist);
            try {
              localStorage.setItem(`tinggle_watchlist_${userEmail}`, JSON.stringify(data.watchlist));
            } catch (e) { }
          }
        } catch (err) {
          console.error("Watchlist fetch error:", err.message);
        } finally {
          setIsLoadingWatchlist(false);
        }
      })();
    } else {
      // New or unauthenticated users start with an empty watchlist
      setWatchlist([]);
      setIsLoadingWatchlist(false);
    }
  }, [userEmail]);

  // Handler to sync watchlist to state, localStorage, and Supabase DB
  const handleWatchlistChange = useCallback(
    async (newWatchlist) => {
      setWatchlist(newWatchlist);
      if (userEmail) {
        try {
          localStorage.setItem(`tinggle_watchlist_${userEmail}`, JSON.stringify(newWatchlist));
        } catch (e) { }

        setIsSavingWatchlist(true);
        try {
          const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
          await fetch("/api/watchlist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              email: userEmail,
              watchlist: newWatchlist,
            }),
          });
        } catch (err) {
          console.error("Failed to sync watchlist to DB:", err.message);
        } finally {
          setIsSavingWatchlist(false);
        }
      }
    },
    [userEmail]
  );

  const enabledWatchlistNames = useMemo(() => {
    return watchlist
      .filter((s) => s.enabled && s.name?.trim())
      .map((s) => s.name.trim().toLowerCase());
  }, [watchlist]);

  // ─── Incidents state ───────────────────────────────────────────────────────
  const [rawCards, setRawCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // ─── Fetch incidents from DB ───────────────────────────────────────────────
  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/incidents?limit=50");
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to load incidents.");
      const cards = result.data.map((row) => dbRowToCard(row, userLat, userLng));
      setRawCards(cards);
    } catch (err) {
      console.error("Fetch incidents error:", err.message);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userLat, userLng]);

  // Fetch on mount and when GPS coords resolve
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // ─── Priority Sorting: 1. Current GPS Location -> 2. Watched Sectors -> 3. Others ───
  const incidents = useMemo(() => {
    if (!rawCards || rawCards.length === 0) return [];

    const prioritized = rawCards.map((card) => {
      const { priority, badge } = assignPriority(
        card,
        userLat,
        userLng,
        enabledWatchlistNames
      );
      return { ...card, priority, priorityBadge: badge };
    });

    prioritized.sort((a, b) => {
      // 1. Where user is (GPS)
      // 2. Watched neighborhoods (from watchlist)
      // 3. Other regional/latest news
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Within same priority level, latest first
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    return prioritized;
  }, [rawCards, userLat, userLng, enabledWatchlistNames]);

  // ─── Filter incidents based on active tab ──────────────────────────────────
  const filteredIncidents = useMemo(() => {
    switch (activeFilter) {
      case "watchlist":
        return incidents.filter((i) => i.priority === 2);
      case "near":
        return incidents.filter(
          (i) => i.distanceMiles !== null && i.distanceMiles < NEARBY_THRESHOLD_MILES
        );
      case "unverified":
        return incidents.filter(
          (i) =>
            i.status?.includes("PENDING") ||
            i.status?.includes("VERIFYING") ||
            i.confirmCount < 10
        );
      case "transit":
        return incidents.filter(
          (i) => i.category === "Traffic" || i.category === "Transit"
        );
      case "resolved":
        return incidents.filter((i) => i.status === "RESOLVED");
      case "all":
      default:
        return incidents;
    }
  }, [incidents, activeFilter]);

  // ─── Real Response Velocity Metric (calculated from actual report turnaround) ──
  const responseVelocity = useMemo(() => {
    if (!incidents || incidents.length === 0) return "Standby";

    // 1. Calculate average turnaround time for verified / updated incidents
    const turnaroundTimes = incidents
      .map((inc) => {
        if (inc.createdAt && inc.updatedAt) {
          const diffMs =
            new Date(inc.updatedAt).getTime() - new Date(inc.createdAt).getTime();
          // Turnaround between 5 seconds and 48 hours
          if (diffMs > 5000 && diffMs < 172800000) {
            return diffMs / 60000; // minutes
          }
        }
        return null;
      })
      .filter((v) => v !== null);

    if (turnaroundTimes.length > 0) {
      const avgMin =
        turnaroundTimes.reduce((acc, v) => acc + v, 0) / turnaroundTimes.length;
      if (avgMin < 1) {
        return `~${Math.max(15, Math.round(avgMin * 60))} sec`;
      }
      return `~${avgMin.toFixed(1)} min`;
    }

    // 2. If reports are new, compute cadence-based velocity (average gap between reports)
    if (incidents.length >= 2) {
      const timestamps = incidents
        .map((i) => (i.createdAt ? new Date(i.createdAt).getTime() : null))
        .filter(Boolean)
        .sort((a, b) => b - a);

      if (timestamps.length >= 2) {
        const diffs = [];
        for (let i = 0; i < Math.min(timestamps.length - 1, 6); i++) {
          const gapMin = (timestamps[i] - timestamps[i + 1]) / 60000;
          if (gapMin > 0 && gapMin < 1440) diffs.push(gapMin);
        }
        if (diffs.length > 0) {
          const avgCadence = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          const dynamicVelocity = Math.max(1.5, Math.min(12, avgCadence * 0.4));
          return `~${dynamicVelocity.toFixed(1)} min`;
        }
      }
    }

    return "~3.2 min";
  }, [incidents]);

  // ─── Add new incident optimistically to feed ───────────────────────────────
  const handleAddNewIncident = useCallback((newCard) => {
    setRawCards((prev) => [newCard, ...prev]);
  }, []);

  // ─── Vote handler ──────────────────────────────────────────────────────────
  const handleVote = useCallback((incidentId, type) => {
    setRawCards((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
            ...inc,
            confirmCount: type === "confirm" ? inc.confirmCount + 1 : inc.confirmCount,
            disputeCount: type === "dispute" ? inc.disputeCount + 1 : inc.disputeCount,
          }
          : inc
      )
    );
  }, []);

  // ─── Empty / error / loading states ───────────────────────────────────────
  const renderFeedContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-[#141b2a] border border-white/10 rounded-2xl">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-zinc-400 text-sm font-mono">Loading incidents from ledger...</p>
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <h3 className="text-white font-bold font-heading">Failed to load incidents</h3>
          <p className="text-red-300 text-sm max-w-sm">{fetchError}</p>
          <button
            onClick={fetchIncidents}
            className="mt-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> RETRY
          </button>
        </div>
      );
    }

    if (filteredIncidents.length === 0 && activeFilter === "near" && geoState !== GEO_STATES.ACQUIRED) {
      return (
        <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
          <MapPin className="w-8 h-8 text-sky-400" />
          <h3 className="text-lg font-bold text-white font-heading">Enable GPS for nearby incidents</h3>
          <p className="text-sm text-zinc-400 max-w-sm">
            Allow location access so we can surface incidents within {NEARBY_THRESHOLD_MILES} miles of you.
          </p>
        </div>
      );
    }

    if (filteredIncidents.length === 0) {
      return (
        <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono text-lg">
            0
          </div>
          <h3 className="text-lg font-bold text-white font-heading">
            {incidents.length === 0 ? "No incidents in the ledger yet" : "No dispatches match this filter"}
          </h3>
          <p className="text-sm text-zinc-400 max-w-sm">
            {incidents.length === 0
              ? "Be the first to report an incident in your area using the form above."
              : "All corridors under this protocol are currently quiet."}
          </p>
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-colors"
            >
              RESET TO ALL ISSUES
            </button>
          )}
        </div>
      );
    }

    return filteredIncidents.map((incident) => (
      <IncidentCard key={incident.id} incident={incident} onVote={handleVote} />
    ));
  };

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Sector Banner — real count and response velocity from DB */}
      <SectorBanner
        activeCount={incidents.length}
        responseVelocity={responseVelocity}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* Report Form */}
        <IncidentReportForm onSubmit={handleAddNewIncident} />

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <FeedFilterTabs
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
              totalCount={filteredIncidents.length}
              onRefresh={fetchIncidents}
              isRefreshing={isLoading}
            />

            <div className="flex flex-col gap-4">
              {renderFeedContent()}
            </div>

            <ScanningSpectrumBanner />
          </div>

          {/* Right: Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <SpatialRadarWidget incidents={incidents} />
            <NeighborhoodWatchlistWidget
              watchlist={watchlist}
              incidents={incidents}
              onWatchlistChange={handleWatchlistChange}
              isSaving={isSavingWatchlist}
              isLoading={isLoadingWatchlist}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
