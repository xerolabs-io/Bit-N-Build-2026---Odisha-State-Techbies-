"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Clock,
  Users,
  Compass,
  BellRing,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Radio,
  ExternalLink,
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

export default function HeroIncidentDossier({
  incident,
  onUpdateIncident,
  onEscalate,
}) {
  const [updating, setUpdating] = useState(false);
  const [evacSent, setEvacSent] = useState(false);

  if (!incident) {
    return (
      <article className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h3 className="text-lg font-bold text-white font-heading">
          No Active Incident Selected
        </h3>
        <p className="text-sm text-zinc-400 max-w-md">
          Select an incident from the operational queue below to load its full
          tactical dossier and telemetry feeds.
        </p>
      </article>
    );
  }

  const handleStatusChange = async (newStatus, newTrust) => {
    if (!onUpdateIncident) return;
    setUpdating(true);
    try {
      await onUpdateIncident(incident.id, {
        status: newStatus,
        trust_score: newTrust || incident.trust_score,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleEvac = () => {
    setEvacSent(true);
    setTimeout(() => setEvacSent(false), 4000);
  };

  const isResolved = incident.status === "RESOLVED & CONTAINED";
  const isVerified = incident.status === "OFFICIALLY VERIFIED";
  const isCodeRed = incident.status === "ESCALATED CODE RED";

  return (
    <article className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header Strip */}
      <div className="bg-[#182236] border-b border-white/10 px-5 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`px-3 py-1 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isCodeRed
                ? "bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse"
                : isVerified
                ? "bg-teal-500/20 border border-teal-500/50 text-teal-300"
                : isResolved
                ? "bg-zinc-700/50 border border-zinc-600 text-zinc-300"
                : "bg-amber-500/20 border border-amber-500/40 text-amber-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCodeRed
                  ? "bg-red-500"
                  : isVerified
                  ? "bg-teal-400"
                  : isResolved
                  ? "bg-zinc-400"
                  : "bg-amber-400"
              }`}
            />
            {incident.status || "REPORTED INCIDENT"}
          </span>
          <span className="font-mono text-xs md:text-sm text-zinc-200 font-bold">
            #{incident.id}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            • CATEGORY: <strong className="text-amber-400">{incident.category || "GENERAL"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Reported: {formatElapsed(incident.created_at)}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-teal-400 font-semibold">
            <Users className="w-3.5 h-3.5" />
            {incident.reporter_email
              ? `OP: ${incident.reporter_email}`
              : "ANONYMOUS DISPATCH"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Incident Details */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-heading leading-tight">
                {incident.title}
              </h2>
              <p className="text-sm md:text-base text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap">
                {incident.description ||
                  "Citizen-reported incident verified through the emergency dispatch ledger."}
              </p>
            </div>

            {/* Real Telemetry Grid */}
            <div className="grid grid-cols-3 gap-3 bg-[#0b101c] border border-white/5 p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                  COMMUNITY VOTES
                </span>
                <span className="text-base md:text-xl font-bold font-heading text-emerald-400">
                  ▲ {incident.confirm_count ?? 1} Upvotes
                </span>
                <span className={`font-mono text-[11px] font-semibold ${
                  (incident.dispute_count || 0) > 0 ? "text-rose-400" : "text-zinc-400"
                }`}>
                  🚩 {incident.dispute_count ?? 0} Flagged Fake
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                  CONFIDENCE SCORE
                </span>
                <span className="text-base md:text-xl font-bold font-heading text-amber-400 truncate">
                  {incident.trust_score || "COMMUNITY: 92%"}
                </span>
                <span className="font-mono text-[11px] text-teal-400">
                  Corroborated
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-[10px] md:text-xs text-zinc-400 uppercase tracking-wider">
                  DISPATCH PROTOCOL
                </span>
                <span className="text-base md:text-xl font-bold font-heading text-sky-400 truncate">
                  {isCodeRed
                    ? "TIER 1 INTER-AGENCY"
                    : isVerified
                    ? "COMMUNITY VERIFIED"
                    : "ACTIVE CIVIC TRIAGE"}
                </span>
                <span className="font-mono text-[11px] text-zinc-400">
                  DEFCON Sector Link
                </span>
              </div>
            </div>

            {/* Coordinates & Location Strip */}
            <div className="flex items-center justify-between text-xs md:text-sm text-zinc-300 bg-[#0b101c] border border-white/5 px-4 py-3 rounded-xl flex-wrap gap-2">
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-mono font-semibold text-white">
                  {incident.latitude && incident.longitude
                    ? `${Number(incident.latitude).toFixed(4)}° N, ${Number(incident.longitude).toFixed(4)}° E`
                    : "Coordinates Pending GPS Lock"}
                </span>
                <span className="text-zinc-400 hidden sm:inline truncate max-w-md">
                  — {incident.location_text || "Sector Perimeter"}
                </span>
              </div>
              <span className="font-mono text-xs text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 uppercase font-semibold">
                SECTOR PERIMETER ACTIVE
              </span>
            </div>
          </div>

          {/* Right: Uploaded Evidence or Live Surveillance Simulation */}
          <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
            {incident.image_url ? (
              <div className="relative w-full h-52 rounded-xl overflow-hidden bg-black/60 border border-white/10 group">
                <Image
                  src={incident.image_url}
                  alt={incident.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="320px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  CITIZEN EVIDENCE PHOTO
                </div>
                <a
                  href={incident.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-mono text-zinc-200 bg-black/80 hover:bg-black px-2 py-1 rounded border border-white/10 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Full View
                </a>
              </div>
            ) : (
              <div className="relative w-full h-52 rounded-xl overflow-hidden bg-[#080d17] border border-white/10 flex flex-col items-center justify-center p-4 text-center">
                <Flame className="w-10 h-10 text-amber-400/80 mb-2" />
                <span className="font-mono text-xs text-zinc-300 font-bold uppercase">
                  NO DIRECT SATELLITE PHOTO UPLOADED
                </span>
                <span className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  Telemetry generated from corroborative field sensors and verified reporter coordinates.
                </span>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  SPECTRAL SENSOR READY
                </div>
              </div>
            )}

            {/* Toxicity / Environmental Reading */}
            <div className="bg-[#0b101c] border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-zinc-400 uppercase">
                  ENVIRONMENTAL INDEX
                </span>
                <span className="text-base font-bold text-amber-400 font-heading">
                  {isCodeRed ? "ELEVATED HAZARD" : "NORMAL NOMINAL"}
                </span>
              </div>
              <svg
                className="w-24 h-8 text-amber-400 overflow-visible"
                fill="none"
                viewBox="0 0 100 30"
              >
                <path
                  d="M0 25 L20 22 L40 26 L60 12 L80 16 L100 4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <circle cx="100" cy="4" fill="currentColor" r="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Action Drawer */}
        <div className="bg-[#182236] -mx-5 md:-mx-6 -mb-5 md:-mb-6 p-4 md:p-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Evac Broadcast */}
            <button
              onClick={handleEvac}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-mono tracking-wider flex items-center gap-1.5 font-bold hover:bg-amber-400 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <BellRing className="w-4 h-4" />
              {evacSent ? "Public Evac Dispatched!" : "Push Public Evac Alert"}
            </button>

            {/* Escalate Code Red */}
            <button
              disabled={updating || isCodeRed}
              onClick={() =>
                handleStatusChange(
                  "ESCALATED CODE RED",
                  "CRITICAL MULTI-AGENCY TIER 1"
                )
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                isCodeRed
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-[#202c44] hover:bg-red-500/20 text-zinc-200 hover:text-red-300 border-white/10"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-red-400" />
              {isCodeRed ? "Escalated: Code Red" : "Escalate Code Red"}
            </button>

            {/* Officially Verify */}
            <button
              disabled={updating || isVerified}
              onClick={() =>
                handleStatusChange(
                  "OFFICIALLY VERIFIED",
                  "COMMUNITY TRUST: 99% VERIFIED"
                )
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                isVerified
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                  : "bg-[#202c44] hover:bg-teal-500/20 text-zinc-200 hover:text-teal-300 border-white/10"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              {isVerified ? "Verified on Ledger" : "Verify & Publish Wire"}
            </button>
          </div>

          {/* Contain / Resolve Button */}
          <button
            disabled={updating || isResolved}
            onClick={() => handleStatusChange("RESOLVED & CONTAINED")}
            className={`px-4 py-2 rounded-xl font-mono text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              isResolved
                ? "bg-teal-500 text-black font-bold"
                : "bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-black border border-teal-500/40"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isResolved ? "Incident Contained & Closed" : "Mark Contained & Closed"}
          </button>
        </div>
      </div>
    </article>
  );
}
