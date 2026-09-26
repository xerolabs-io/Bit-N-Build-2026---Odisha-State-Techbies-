"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ArrowBigUp,
  MessageSquare,
  ThumbsDown,
  RefreshCw,
  ExternalLink,
  Info,
  User,
  Activity,
  Radio,
  MapPin,
  ChevronRight,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Category Emoji Map ────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  Crime: "🚨",
  Fire: "🔥",
  Accident: "🚗",
  Medical: "🏥",
  Suspicious: "👁️",
  Vandalism: "🪟",
  Traffic: "🚦",
  Transit: "🚌",
  Flood: "🌊",
  Earthquake: "🌍",
  Other: "📍",
};

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "active" | "resolved" | "flagged"

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;

  const fetchProfile = useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load profile data.");
      }
      setProfileData(json);
    } catch (err) {
      console.error("Profile fetch error:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userEmail) {
      fetchProfile();
    }
  }, [isLoaded, isSignedIn, userEmail, fetchProfile]);

  // Filtered reports
  const incidents = profileData?.incidents || [];
  const filteredIncidents = useMemo(() => {
    switch (filterTab) {
      case "resolved":
        return incidents.filter((i) => i.status === "RESOLVED");
      case "flagged":
        return incidents.filter(
          (i) =>
            i.status?.includes("FAKE") ||
            i.status?.includes("DISINFORMATION") ||
            i.status?.includes("HOAX") ||
            (i.dispute_count > 0 && i.dispute_count >= i.confirm_count)
        );
      case "active":
        return incidents.filter((i) => i.status !== "RESOLVED");
      case "all":
      default:
        return incidents;
    }
  }, [incidents, filterTab]);

  // If auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0d131e] flex items-center justify-center text-zinc-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm">Connecting to Civic Ledger...</p>
        </div>
      </div>
    );
  }

  // If user is not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0d131e] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141b2a] border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-heading">Sign In Required</h2>
          <p className="text-sm text-zinc-400">
            Please authenticate to view your verified Citizen ID, credibility score, and dispatched reports.
          </p>
          <SignInButton mode="modal">
            <Button className="mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5">
              Authenticate with Citizen ID
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const cred = profileData?.credibility;
  const score = cred?.score ?? 50;
  const tierColor = cred?.tierColor || "#f59e0b";
  const tierBadge = cred?.tierBadge || "Active Citizen";
  const tier = cred?.tier || "ACTIVE CITIZEN";
  const breakdown = cred?.breakdown || {};
  const metrics = cred?.metrics || {};

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* ── Top Breadcrumb / Title ────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              CIVIC LEDGER
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              CITIZEN PROFILE
            </span>
          </div>

          <button
            type="button"
            onClick={fetchProfile}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            <span>{isLoading ? "SYNCING..." : "RECALCULATE SCORE"}</span>
          </button>
        </div>

        {/* ── Citizen ID Hero Card ─────────────────────────────────────────── */}
        <div className="p-6 md:p-8 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div
            className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ background: tierColor }}
          />

          {/* Left: User Avatar & Bio */}
          <div className="flex items-center gap-5 z-10">
            <div className="relative">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName || "User Avatar"}
                  width={80}
                  height={80}
                  className="rounded-2xl border-2 border-white/20 shadow-lg object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl font-bold font-mono">
                  {(user.fullName || userEmail)?.[0]?.toUpperCase()}
                </div>
              )}
              {profileData?.user?.isAdmin && (
                <div
                  className="absolute -bottom-1 -right-1 p-1 bg-red-600 text-white rounded-lg shadow-md"
                  title="Emergency Dispatch HQ Admin"
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white font-heading">
                  {user.fullName || user.username || userEmail.split("@")[0]}
                </h1>
                {profileData?.user?.isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wider">
                    HQ ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{userEmail}</p>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border"
                  style={{
                    backgroundColor: `${tierColor}15`,
                    borderColor: `${tierColor}40`,
                    color: tierColor,
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{tierBadge}</span>
                </div>

                <span className="text-xs text-zinc-500 font-mono">
                  CITIZEN ID #{profileData?.user?.id?.toString().padStart(5, "0") || "00001"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Credibility Score Meter */}
          <div className="flex items-center gap-6 w-full lg:w-auto bg-[#0a0f1d] border border-white/5 rounded-2xl p-4 md:px-6 z-10 justify-between lg:justify-end">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                CIVIC REPUTATION INDEX
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight" style={{ color: tierColor }}>
                  {score}
                </span>
                <span className="text-xs font-mono text-zinc-500">/ 100</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>{tier}</span>
              </span>
            </div>

            {/* Circular Gauge / Mini Bar */}
            <div className="w-16 h-16 rounded-full border-4 border-white/10 flex items-center justify-center relative shrink-0" style={{ borderColor: `${tierColor}30` }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-xs"
                style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
              >
                {score}%
              </div>
            </div>
          </div>
        </div>

        {/* ── Key Metrics Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Reports */}
          <div className="p-4 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col gap-1 shadow-md">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-mono uppercase tracking-wider">Reports Broadcast</span>
              <Radio className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {metrics.totalReports ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {metrics.resolvedReports ?? 0} confirmed resolved
            </div>
          </div>

          {/* Upvotes Received */}
          <div className="p-4 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col gap-1 shadow-md">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-mono uppercase tracking-wider">Corroborations</span>
              <ArrowBigUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              +{metrics.totalUpvotesReceived ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              Community eyewitness verifications
            </div>
          </div>

          {/* Disputes Received */}
          <div className="p-4 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col gap-1 shadow-md">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-mono uppercase tracking-wider">Disputes Logged</span>
              <ThumbsDown className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-red-400 mt-1">
              {metrics.totalDisputesReceived ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {metrics.fakeReports > 0 ? `${metrics.fakeReports} flagged disinformation` : "0 false alerts"}
            </div>
          </div>

          {/* Eyewitness Contributions */}
          <div className="p-4 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col gap-1 shadow-md">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-mono uppercase tracking-wider">Civic Participation</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {metrics.votesCast ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              Alerts corroborated by you
            </div>
          </div>
        </div>

        {/* ── Strict Credibility Algorithm Audit Matrix ─────────────────────── */}
        <div className="p-6 bg-[#141b2a] border border-white/10 rounded-2xl shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white font-heading">
                  Credibility Breakdown & Reputation Audit
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Strict deterministic algorithm computed directly from eyewitness consensus and containment records.
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {/* Base */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Base Citizen Trust</span>
                <span className="text-[11px] text-zinc-500 font-mono">Initial calibrated baseline</span>
              </div>
              <span className="font-mono font-bold text-sm text-zinc-300">
                +{breakdown.baseScore || 50}
              </span>
            </div>

            {/* Corroboration */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Community Upvotes</span>
                <span className="text-[11px] text-zinc-500 font-mono">+3 pts per upvote (max +15/post)</span>
              </div>
              <span className="font-mono font-bold text-sm text-emerald-400">
                +{breakdown.corroborationBonus || 0}
              </span>
            </div>

            {/* Resolution */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Verified & Resolved Alerts</span>
                <span className="text-[11px] text-zinc-500 font-mono">+15 resolved / +10 dispatched</span>
              </div>
              <span className="font-mono font-bold text-sm text-sky-400">
                +{breakdown.resolutionBonus || 0}
              </span>
            </div>

            {/* Eyewitness Activity */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Eyewitness Voting</span>
                <span className="text-[11px] text-zinc-500 font-mono">+1 pt per valid corroboration</span>
              </div>
              <span className="font-mono font-bold text-sm text-amber-400">
                +{breakdown.eyewitnessActivityBonus || 0}
              </span>
            </div>

            {/* Dispute Penalties */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Community Disputes</span>
                <span className="text-[11px] text-zinc-500 font-mono">-4 pts per dispute / net penalty</span>
              </div>
              <span className={`font-mono font-bold text-sm ${breakdown.disputePenalties > 0 ? "text-red-400" : "text-zinc-500"}`}>
                {breakdown.disputePenalties > 0 ? `-${breakdown.disputePenalties}` : "0"}
              </span>
            </div>

            {/* Disinformation Penalties */}
            <div className="p-3.5 bg-[#0a0f1d] border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-mono">Disinformation Deductions</span>
                <span className="text-[11px] text-zinc-500 font-mono">-35 pts per false/debunked report</span>
              </div>
              <span className={`font-mono font-bold text-sm ${breakdown.disinformationPenalties > 0 ? "text-red-400" : "text-zinc-500"}`}>
                {breakdown.disinformationPenalties > 0 ? `-${breakdown.disinformationPenalties}` : "0"}
              </span>
            </div>
          </div>
        </div>

        {/* ── User Dispatches & Reports Feed ───────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-white font-heading uppercase tracking-wide">
                Dispatches Filed by You
              </h2>
              <span className="text-xs font-mono text-amber-400 font-bold">
                ({filteredIncidents.length})
              </span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: "all", label: `ALL (${incidents.length})` },
                { id: "active", label: "ACTIVE" },
                { id: "resolved", label: "RESOLVED" },
                { id: "flagged", label: "FLAGGED" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    filterTab === tab.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold"
                      : "bg-[#141b2a] hover:bg-[#1f283c] text-zinc-400 hover:text-zinc-200 border border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents List */}
          {filteredIncidents.length === 0 ? (
            <div className="p-12 bg-[#141b2a] border border-white/10 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 font-mono">
                0
              </div>
              <h4 className="text-base font-bold text-white font-heading">
                No reports found in this category
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                Broadcast an eyewitness alert using the Incident Broadcast tool on the home ledger.
              </p>
              <Link href="/">
                <Button className="mt-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400">
                  Broadcast New Incident
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIncidents.map((inc) => {
                const categoryEmoji = CATEGORY_ICONS[inc.category] || "📍";
                const isResolved = inc.status === "RESOLVED";
                const isFlagged =
                  inc.status?.includes("FAKE") ||
                  inc.status?.includes("DISINFORMATION") ||
                  inc.status?.includes("HOAX");

                return (
                  <div
                    key={inc.id}
                    className="p-5 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 hover:border-white/20 transition-all shadow-md group"
                  >
                    <div>
                      {/* Top Row: Category + Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{categoryEmoji}</span>
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {inc.category}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isResolved
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : isFlagged
                              ? "bg-red-500/20 text-red-300 border-red-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {inc.status || "PENDING"}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 font-heading">
                        {inc.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {inc.description}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="flex flex-col gap-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-500 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="truncate max-w-[180px]">{inc.location_text || "Unknown sector"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold">
                            ▲ {inc.confirm_count ?? 0}
                          </span>
                          <span className="text-red-400 font-bold">
                            ▼ {inc.dispute_count ?? 0}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/incident/${inc.id}`}
                        className="w-full py-2 px-3 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center justify-between transition-colors border border-white/5"
                      >
                        <span>VIEW FULL REPORT & TIMELINE</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
