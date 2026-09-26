"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  ArrowBigUp,
  MessageSquare,
  Share2,
  Camera,
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Ambulance,
  AlertOctagon,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { calculateCredibility, isLocalVoter } from "@/lib/credibility.lib";

export default function IncidentCard({ incident, onVote }) {
  const router = useRouter();
  const [confirmCount, setConfirmCount] = useState(incident.confirmCount ?? incident.confirm_count ?? 1);
  const [disputeCount, setDisputeCount] = useState(incident.disputeCount ?? incident.dispute_count ?? 0);
  const [userVoted, setUserVoted] = useState(false);
  const [userDisputed, setUserDisputed] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [voteNotice, setVoteNotice] = useState(null);
  const [copiedAlert, setCopiedAlert] = useState(false);

  // Clerk Auth to identify current citizen
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;

  // Check if current user authored this report (Prevent self-upvoting)
  const isOwnReport = useMemo(() => {
    if (!userEmail || !incident.reporterEmail) return false;
    return (
      userEmail.toLowerCase().trim() ===
      incident.reporterEmail.toLowerCase().trim()
    );
  }, [userEmail, incident.reporterEmail]);

  // Check user GPS proximity for local corroboration
  const { coords: userCoords } = useGeoLocation();
  const isLocal = useMemo(() => {
    return isLocalVoter(
      userCoords?.lat,
      userCoords?.lng,
      incident.latitude,
      incident.longitude
    );
  }, [userCoords, incident.latitude, incident.longitude]);

  // Check localStorage for prior votes & disputes on mount
  useEffect(() => {
    if (typeof window !== "undefined" && incident.id) {
      const storedUpvote = localStorage.getItem(`tinggle_upvoted_${incident.id}`);
      if (storedUpvote) setUserVoted(true);
      const storedDispute = localStorage.getItem(`tinggle_disputed_${incident.id}`);
      if (storedDispute) setUserDisputed(true);
    }
  }, [incident.id]);

  // Dynamic Credibility Calculation
  const cred = useMemo(() => {
    return calculateCredibility({
      upvoteCount: confirmCount,
      localUpvoteCount: isLocal && userVoted ? 1 : 0,
      hasPhoto: Boolean(incident.image),
      status: incident.status,
      disputeCount: disputeCount,
    });
  }, [confirmCount, isLocal, userVoted, incident.image, incident.status, disputeCount]);

  // ─── Upvote Handler ────────────────────────────────────────────────────────
  const handleUpvote = async (e) => {
    e.stopPropagation();

    // Guard: Debunked / Fake News
    if (cred.isDebunked) {
      setVoteNotice("Voting is locked: Officially flagged as disinformation / fake.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    if (!userEmail) {
      setVoteNotice("Sign in to upvote this incident report.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    // 1. Self-upvote guard
    if (isOwnReport) {
      setVoteNotice("You cannot upvote your own incident report.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    if (userVoted || isVoting || userDisputed) return;

    setIsVoting(true);
    setVoteNotice(null);

    // Optimistic update
    const nextCount = confirmCount + 1;
    setConfirmCount(nextCount);
    setUserVoted(true);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tinggle_upvoted_${incident.id}`, "true");
    }

    if (onVote) onVote(incident.id, "upvote");

    try {
      const res = await fetch(`/api/incidents/${incident.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng,
          voteType: "upvote",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to register upvote.");
      }

      if (json.data?.confirm_count) {
        setConfirmCount(json.data.confirm_count);
      }
      if (json.isLocal) {
        setVoteNotice("📍 Local Corroboration applied! +15% Credibility bonus.");
        setTimeout(() => setVoteNotice(null), 3500);
      }
    } catch (err) {
      console.error("Upvote error:", err.message);
      setVoteNotice(err.message);
      setTimeout(() => setVoteNotice(null), 3500);
    } finally {
      setIsVoting(false);
    }
  };

  // ─── Report Fake / Dispute Handler ─────────────────────────────────────────
  const handleReportFake = async (e) => {
    e.stopPropagation();

    if (cred.isDebunked) {
      setVoteNotice("Already confirmed and flagged as fake by Emergency Command HQ.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    if (!userEmail) {
      setVoteNotice("Sign in to flag or dispute an incident.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    if (isOwnReport) {
      setVoteNotice("You cannot flag your own incident report.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    if (userDisputed || userVoted || isDisputing) {
      setVoteNotice("You have already submitted your evaluation for this report.");
      setTimeout(() => setVoteNotice(null), 3000);
      return;
    }

    const confirmFlag = window.confirm(
      `Flag incident #${incident.id} ("${incident.title}") as fake news / false report?\n\nThis will lower its community trust score and warn other citizens.`
    );
    if (!confirmFlag) return;

    setIsDisputing(true);
    setVoteNotice(null);

    // Optimistic dispute increment
    const nextDispute = disputeCount + 1;
    setDisputeCount(nextDispute);
    setUserDisputed(true);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tinggle_disputed_${incident.id}`, "true");
    }

    if (onVote) onVote(incident.id, "dispute");

    try {
      const res = await fetch(`/api/incidents/${incident.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng,
          voteType: "dispute",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to flag report.");
      }

      if (json.data?.dispute_count !== undefined) {
        setDisputeCount(json.data.dispute_count);
      }
      setVoteNotice("🚩 Report flagged as fake. Credibility rating decreased.");
      setTimeout(() => setVoteNotice(null), 4000);
    } catch (err) {
      console.error("Dispute error:", err.message);
      setVoteNotice(err.message);
      setTimeout(() => setVoteNotice(null), 3500);
    } finally {
      setIsDisputing(false);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/incident/${incident.id}`;
      navigator.clipboard?.writeText(shareUrl);
      setCopiedAlert(true);
      setTimeout(() => setCopiedAlert(false), 2000);
    }
  };

  // Status color styles
  const getStatusBadge = () => {
    const s = String(incident.status || "").toUpperCase();
    if (s.includes("DISPATCH") || s.includes("EN ROUTE")) {
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold animate-pulse";
    }
    if (s.includes("RESOLVED") || s.includes("CONTAINED")) {
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    }
    if (s.includes("FAKE") || s.includes("HOAX") || s.includes("DISINFORMATION") || s.includes("DEBUNKED")) {
      return "bg-red-500/20 text-red-400 border border-red-500/40 font-bold";
    }
    switch (incident.statusVariant) {
      case "danger":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "transit":
        return "bg-sky-500/20 text-sky-400 border border-sky-500/30";
      case "resolved":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      default:
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    }
  };

  const handleCardClick = (e) => {
    // Ignore clicks that originate from buttons or links to prevent conflicting actions
    if (e.target.closest("button") || e.target.closest("a")) return;
    router.push(`/incident/${incident.id}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`cursor-pointer bg-[#141b2a] hover:bg-[#182132] border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300 relative overflow-hidden group hover:border-amber-500/40 hover:shadow-2xl ${
        incident.isUserCreated
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-white/10"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* Media Thumbnail Container — Links to Detail Page */}
        {incident.image && (
          <Link
            href={`/incident/${incident.id}`}
            className="w-full md:w-48 h-40 md:h-36 shrink-0 rounded-xl overflow-hidden relative shadow-md bg-black/40 block group/thumb"
          >
            <Image
              src={incident.image}
              alt={incident.title}
              fill
              className="object-cover group-hover/thumb:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 192px"
              unoptimized
            />

            {/* Thumbnail Overlay Badge */}
            {incident.thumbnailBadge && (
              <span
                className={`absolute ${
                  incident.thumbnailBadge.position || "bottom-2 left-2"
                } ${
                  incident.thumbnailBadge.variant === "danger"
                    ? "bg-red-600/90 text-white"
                    : "bg-black/75 backdrop-blur-md text-teal-300 border border-teal-500/30"
                } px-2 py-0.5 rounded-md text-[11px] font-mono tracking-wide flex items-center gap-1 shadow-sm font-medium`}
              >
                {incident.thumbnailBadge.icon === "camera" && (
                  <Camera className="w-3 h-3 text-teal-300" />
                )}
                {incident.thumbnailBadge.icon === "zap" && (
                  <Zap className="w-3 h-3 text-yellow-300" />
                )}
                {incident.thumbnailBadge.text}
              </span>
            )}
          </Link>
        )}

        {/* Content Details */}
        <div className="flex-1 flex flex-col justify-between gap-2.5 min-w-0">
          <div>
            {/* Top metadata row */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold uppercase tracking-wider ${getStatusBadge()}`}
                >
                  {incident.status}
                </span>

                {incident.priorityBadge && (
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-wide flex items-center gap-1 ${
                      incident.priorityBadge.type === "near"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {incident.priorityBadge.label}
                  </span>
                )}

                {/* Dispute / Fake Badge (visible to all users) */}
                {disputeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-wide flex items-center gap-1 bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                    <ShieldAlert className="w-3 h-3 text-red-400" />
                    <span>{disputeCount} FLAGGED FAKE</span>
                  </span>
                )}

                <span className="font-mono text-xs text-teal-400 font-medium">
                  #{incident.id}
                </span>
              </div>

              <div className="text-zinc-400 text-xs flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>
                  {incident.timestamp} • {incident.location}
                </span>
              </div>
            </div>

            {/* Title — Links to Incident Page */}
            <Link href={`/incident/${incident.id}`} className="block">
              <h3 className="text-base md:text-lg font-bold text-white font-heading mt-1.5 leading-snug group-hover:text-amber-300 transition-colors">
                {incident.title}
              </h3>
            </Link>

            {/* Description */}
            <p className="text-sm text-zinc-300/90 mt-1 leading-relaxed line-clamp-2 md:line-clamp-3">
              {incident.description}
            </p>

            {/* Emergency SOS Status Alert for Citizens */}
            {(incident.id?.startsWith("SOS-") || incident.category === "SOS" || incident.title?.includes("SOS")) && (
              <div className="mt-2.5">
                {incident.status?.includes("EN ROUTE") || incident.status?.includes("DISPATCHED") ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between text-xs font-mono text-emerald-300 gap-2">
                    <div className="flex items-center gap-2">
                      <Ambulance className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                      <span>
                        🚑 <strong>HELP IS ARRIVING / EN ROUTE!</strong> Emergency responders dispatched by Command HQ.
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-bold shrink-0">
                      DISPATCHED
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-between text-xs font-mono text-red-300 gap-2">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                      <span>
                        🚨 <strong>CRITICAL EMERGENCY SOS:</strong> Authorities notified. Nearby eyewitnesses stay vigilant.
                      </span>
                    </div>
                    <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 font-bold shrink-0">
                      PRIORITY #1
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Help Dispatched Alert for Regular Issues */}
            {!(incident.id?.startsWith("SOS-") || incident.category === "SOS" || incident.title?.includes("SOS")) &&
              (String(incident.status || "").toUpperCase().includes("DISPATCH") ||
                String(incident.status || "").toUpperCase().includes("EN ROUTE") ||
                String(incident.status || "").toUpperCase().includes("HELP")) && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between text-xs font-mono text-emerald-300 gap-2 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Ambulance className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
                    <span>
                      🚑 <strong>HELP DISPATCHED · SQUAD EN ROUTE!</strong> Admin Command HQ dispatched municipal assistance.
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/25 px-2 py-0.5 rounded border border-emerald-500/40 font-bold text-white uppercase shrink-0">
                    {incident.trustScore && !incident.trustScore.includes("COMMUNITY") && !incident.trustScore.includes("CIVIC")
                      ? incident.trustScore
                      : "HELP EN ROUTE"}
                  </span>
                </div>
            )}

            {/* Community Dispute Warning Strip (visible to all users if disputes exist) */}
            {disputeCount > 0 && (
              <div className="mt-2.5 p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-200 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    ⚠️ <strong>COMMUNITY DISPUTE:</strong> {disputeCount} citizen{disputeCount > 1 ? "s" : ""} flagged this report as suspected fake.
                  </span>
                </div>
                <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40 text-red-300 font-bold shrink-0">
                  -{Math.min(60, disputeCount * 20)}% TRUST PENALTY
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Upvote Button */}
              {cred.isDebunked ? (
                <button
                  type="button"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-red-500/15 text-red-300 border border-red-500/40 cursor-not-allowed opacity-80"
                  title="This incident has been officially flagged as fake / disinformation"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Flagged Fake ({confirmCount})</span>
                </button>
              ) : isOwnReport ? (
                <button
                  type="button"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed opacity-75"
                  title="You cannot upvote your own incident report"
                >
                  <ArrowBigUp className="w-4 h-4 text-zinc-500" />
                  <span>▲ Upvote ({confirmCount}) · Your Report</span>
                </button>
              ) : userVoted ? (
                <button
                  type="button"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm cursor-default"
                >
                  <ArrowBigUp className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  <span>▲ Upvoted ({confirmCount})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUpvote}
                  disabled={isVoting || userDisputed}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-[#0b101c] hover:bg-emerald-500/20 text-emerald-400 border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Upvote this civic alert to increase its credibility"
                >
                  <ArrowBigUp className="w-4 h-4" />
                  <span>▲ Upvote ({confirmCount})</span>
                </button>
              )}

              {/* ── Option for users to Report/Flag if the news is fake (Beside Upvote) ── */}
              {userDisputed ? (
                <button
                  type="button"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-red-600/30 text-red-300 border border-red-500/50 shadow-sm cursor-default"
                  title="You have flagged this alert as fake"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>🚩 Flagged Fake ({disputeCount})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReportFake}
                  disabled={isDisputing || isVoting || cred.isDebunked}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 bg-[#0b101c] hover:bg-red-500/20 text-red-400 border border-white/10 hover:border-red-500/40 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Report if this news is fake or false information"
                >
                  {isDisputing ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )}
                  <span>🚩 Flag as Fake ({disputeCount})</span>
                </button>
              )}

              {/* Dedicated Incident Page Link (Replaced old Update button) */}
              <Link
                href={`/incident/${incident.id}`}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500 hover:text-black text-sky-300 font-mono text-xs tracking-wider flex items-center gap-1.5 border border-sky-500/30 transition-all cursor-pointer font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Details &amp; Discussion →</span>
              </Link>

              {/* Share Alert */}
              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-[#0b101c] hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Copy share link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              {copiedAlert && (
                <span className="text-[10px] font-mono text-teal-400 animate-in fade-in">
                  Link Copied!
                </span>
              )}
            </div>

            {/* Credibility System Badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${cred.badgeColor}`}
                title={`Credibility: ${cred.score}% based on upvotes & proximity`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{cred.score}% Trust · {cred.tier}</span>
              </span>
            </div>
          </div>

          {/* Local Proximity Corroboration Toast/Notice */}
          {voteNotice && (
            <div className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 p-2 rounded-xl flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{voteNotice}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
