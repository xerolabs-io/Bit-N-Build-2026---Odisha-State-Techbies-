"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  X,
  MapPin,
  Clock,
  ArrowBigUp,
  ShieldCheck,
  ShieldAlert,
  Ambulance,
  Car,
  Flame,
  Droplets,
  TrainTrack,
  Radio,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { calculateCredibility } from "@/lib/credibility.lib";

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: Filter },
  { id: "Traffic", label: "Traffic", icon: Car },
  { id: "Fire", label: "Fire / Hazard", icon: Flame },
  { id: "Utility", label: "Utility & Water", icon: Droplets },
  { id: "Public Safety", label: "Public Safety", icon: ShieldAlert },
  { id: "Transit", label: "Transit", icon: TrainTrack },
  { id: "Medical", label: "Medical", icon: Ambulance },
  { id: "Disaster", label: "Disaster / SOS", icon: Radio },
];

const STATUS_FILTERS = [
  { id: "all", label: "All Statuses" },
  { id: "active", label: "🚨 Active / Pending" },
  { id: "dispatched", label: "🚑 Help Dispatched" },
  { id: "resolved", label: "✓ Solved / Contained" },
  { id: "hoax", label: "🚩 Flagged Hoax" },
];

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance (Active First)" },
  { id: "newest", label: "Newest First" },
  { id: "credibility", label: "Highest Trust / Credibility" },
  { id: "upvotes", label: "Most Corroborated / Upvotes" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  const { coords: userCoords } = useGeoLocation();

  // Sync state if URL query param changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Fetch incidents ledger
  useEffect(() => {
    let isMounted = true;
    async function loadIncidents() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/incidents?limit=150");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setIncidents(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load search incidents:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadIncidents();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  // Filter & Sort Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = incidents.filter((item) => {
      // 1. Text Query Filter
      if (q) {
        const title = (item.title || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        const loc = (item.location_text || "").toLowerCase();
        const id = (item.id || "").toLowerCase();
        const trust = (item.trust_score || "").toLowerCase();
        const matchesQuery =
          title.includes(q) ||
          desc.includes(q) ||
          cat.includes(q) ||
          loc.includes(q) ||
          id.includes(q) ||
          trust.includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "all") {
        const c = (item.category || "").toLowerCase();
        if (categoryFilter === "Disaster") {
          if (!c.includes("disaster") && !c.includes("sos") && !item.id?.startsWith("SOS-")) {
            return false;
          }
        } else if (c !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== "all") {
        const s = String(item.status || "").toUpperCase();
        if (statusFilter === "dispatched") {
          if (!s.includes("DISPATCH") && !s.includes("EN ROUTE") && !s.includes("HELP")) {
            return false;
          }
        } else if (statusFilter === "resolved") {
          if (!s.includes("RESOLVED") && !s.includes("CONTAINED") && !s.includes("SOLVED")) {
            return false;
          }
        } else if (statusFilter === "hoax") {
          if (!s.includes("FAKE") && !s.includes("HOAX") && !s.includes("DISINFORMATION") && !s.includes("DEBUNKED")) {
            return false;
          }
        } else if (statusFilter === "active") {
          if (
            s.includes("RESOLVED") ||
            s.includes("CONTAINED") ||
            s.includes("SOLVED") ||
            s.includes("FAKE") ||
            s.includes("HOAX") ||
            s.includes("DISINFORMATION")
          ) {
            return false;
          }
        }
      }

      return true;
    });

    // 4. Sorting Logic
    list.sort((a, b) => {
      const isClosedOrHoaxA = (() => {
        const s = String(a.status || "").toUpperCase();
        return (
          s.includes("RESOLVED") ||
          s.includes("CONTAINED") ||
          s.includes("SOLVED") ||
          s.includes("FAKE") ||
          s.includes("HOAX") ||
          s.includes("DISINFORMATION") ||
          s.includes("DEBUNKED")
        );
      })();

      const isClosedOrHoaxB = (() => {
        const s = String(b.status || "").toUpperCase();
        return (
          s.includes("RESOLVED") ||
          s.includes("CONTAINED") ||
          s.includes("SOLVED") ||
          s.includes("FAKE") ||
          s.includes("HOAX") ||
          s.includes("DISINFORMATION") ||
          s.includes("DEBUNKED")
        );
      })();

      if (sortBy === "relevance") {
        // Active news first, solved/hoax at the bottom
        if (isClosedOrHoaxA !== isClosedOrHoaxB) {
          return isClosedOrHoaxA ? 1 : -1;
        }
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      }

      if (sortBy === "newest") {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      }

      if (sortBy === "upvotes") {
        return (b.confirm_count || 0) - (a.confirm_count || 0);
      }

      if (sortBy === "credibility") {
        const credA = calculateCredibility({
          upvoteCount: a.confirm_count || 0,
          status: a.status,
          disputeCount: a.dispute_count || 0,
          hasPhoto: Boolean(a.image_url),
        }).score;
        const credB = calculateCredibility({
          upvoteCount: b.confirm_count || 0,
          status: b.status,
          disputeCount: b.dispute_count || 0,
          hasPhoto: Boolean(b.image_url),
        }).score;
        return credB - credA;
      }

      return 0;
    });

    return list;
  }, [incidents, query, categoryFilter, statusFilter, sortBy]);

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("relevance");
    setQuery("");
    router.push("/search");
  };

  const hasActiveFilters =
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "relevance" ||
    Boolean(query);

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* ── Top Breadcrumbs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">
            CIVIC FEED
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-amber-400 font-bold uppercase tracking-wider">
            SEARCH &amp; ARCHIVES
          </span>
        </div>

        {/* ── Header Search Hero ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-wide uppercase flex items-center gap-3">
            <span>DISPATCH &amp; INCIDENT ARCHIVE SEARCH</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 font-mono">
            Search verified community alerts, municipal squad dispatches, emergency SOS calls, and eyewitness verifications.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-3xl mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, location (e.g. Nayapalli), category, or ID (#INC-12345)..."
              className="w-full bg-[#141b2a] hover:bg-[#182132] focus:bg-[#161f30] border-2 border-white/10 focus:border-amber-400 rounded-2xl py-3.5 pl-12 pr-28 text-sm md:text-base text-white placeholder:text-zinc-500 outline-none transition-all shadow-xl shadow-black/40 font-mono"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-20 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              SEARCH
            </button>
          </form>
        </div>

        {/* ── Filter Controls Bar ─────────────────────────────────────────── */}
        <div className="p-4 md:p-5 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col gap-4 shadow-lg">
          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-[#0a0f1d] hover:bg-white/5 text-zinc-300 border-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-Filters: Status & Sorting */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {STATUS_FILTERS.map((s) => {
                const isSelected = statusFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-white/15 text-white font-bold border border-white/20"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown & Clear */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="flex items-center gap-2 bg-[#0a0f1d] px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#141b2a] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  title="Reset all filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Search Results Count & Notice ───────────────────────────────── */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <div>
            Showing <strong className="text-white">{results.length}</strong> incident{results.length !== 1 ? "s" : ""}
            {query && (
              <span>
                {" "}for &ldquo;<strong className="text-amber-400">{query}</strong>&rdquo;
              </span>
            )}
          </div>
          <span className="text-zinc-500">
            Active alerts prioritized over resolved archives
          </span>
        </div>

        {/* ── Results Feed List ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span>Searching civic ledger archives...</span>
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-4">
            {results.map((item) => {
              const isDispatched =
                String(item.status || "").toUpperCase().includes("DISPATCH") ||
                String(item.status || "").toUpperCase().includes("EN ROUTE") ||
                String(item.status || "").toUpperCase().includes("HELP");

              const isResolved =
                String(item.status || "").toUpperCase().includes("RESOLVED") ||
                String(item.status || "").toUpperCase().includes("CONTAINED");

              const isHoax =
                String(item.status || "").toUpperCase().includes("FAKE") ||
                String(item.status || "").toUpperCase().includes("HOAX") ||
                String(item.status || "").toUpperCase().includes("DISINFORMATION");

              const cred = calculateCredibility({
                upvoteCount: item.confirm_count || 0,
                status: item.status,
                disputeCount: item.dispute_count || 0,
                hasPhoto: Boolean(item.image_url),
              });

              return (
                <Link
                  key={item.id}
                  href={`/incident/${item.id}`}
                  className="p-5 bg-[#141b2a] hover:bg-[#182132] border border-white/10 hover:border-amber-400/40 rounded-2xl shadow-lg transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Thumbnail if present */}
                    {item.image_url && (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden relative shrink-0 border border-white/10 bg-black/40">
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {/* Badge row */}
                      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                        <span className="font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {item.category || "Alert"}
                        </span>

                        {isDispatched && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 animate-pulse">
                            <Ambulance className="w-3.5 h-3.5 text-emerald-400" />
                            <span>HELP DISPATCHED</span>
                          </span>
                        )}

                        {isResolved && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            ✓ RESOLVED &amp; CONTAINED
                          </span>
                        )}

                        {isHoax && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                            🚩 FLAGGED HOAX
                          </span>
                        )}

                        <span className="text-zinc-500 text-[11px]">#{item.id}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base md:text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs md:text-sm text-zinc-300/80 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Location & Time */}
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-0.5 flex-wrap">
                        {item.location_text && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{item.location_text}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side credibility score & upvote metric */}
                  <div className="flex items-center gap-4 self-end md:self-center shrink-0 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-xs text-zinc-400">Trust:</span>
                        <span
                          className={`text-sm font-black ${
                            cred.score >= 70
                              ? "text-emerald-400"
                              : cred.score >= 40
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {cred.score}%
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                        <ArrowBigUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{item.confirm_count || 0} upvotes</span>
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center text-zinc-400 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 md:p-16 rounded-3xl bg-[#141b2a] border border-white/10 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                No Incidents Found
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 font-mono mt-1 max-w-md">
                No civic alerts match your search query or selected filter criteria. Try adjusting your search term or resetting filters.
              </p>
            </div>

            {/* Quick search shortcut pills */}
            <div className="flex items-center gap-2 flex-wrap justify-center mt-2">
              <span className="text-xs font-mono text-zinc-500">Popular Searches:</span>
              {["Traffic", "Fire", "Water leak", "Disaster", "Medical"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-amber-300 border border-white/10 cursor-pointer transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-xs font-mono text-zinc-400">Loading search engine...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
