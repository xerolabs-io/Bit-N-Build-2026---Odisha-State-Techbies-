"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ArrowBigUp,
  MessageSquare,
  Share2,
  Camera,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  User,
  Sparkles,
  ExternalLink,
  Flame,
  X,
  Maximize2,
  ImageIcon,
} from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useGeoLocation, GEO_STATES } from "@/hooks/useGeoLocation";
import { calculateCredibility, isLocalVoter } from "@/lib/credibility.lib";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function IncidentDetailView({ initialIncident }) {
  const [incident, setIncident] = useState(initialIncident);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const [copiedShare, setCopiedShare] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // Comment Image Attachment
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [commentImageFile, setCommentImageFile] = useState(null);
  const commentFileInputRef = useRef(null);

  // Clerk Auth
  const { user, isSignedIn } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  const userName = user?.fullName || user?.firstName || "Citizen Reporter";

  // GPS for proximity calculations
  const { coords: userCoords } = useGeoLocation(true);

  // Check if current user is author of the incident
  const isAuthor = useMemo(() => {
    if (!userEmail || !incident?.reporter_email) return false;
    return (
      userEmail.toLowerCase().trim() ===
      incident.reporter_email.toLowerCase().trim()
    );
  }, [userEmail, incident]);

  // Check if voter is physically local (within 6km)
  const isLocalUser = useMemo(() => {
    return isLocalVoter(
      userCoords?.lat,
      userCoords?.lng,
      incident?.latitude,
      incident?.longitude
    );
  }, [userCoords, incident]);

  // ── Vote State: sync from DB (cross-device, cross-browser, incognito-safe) ──
  const [hasVoted, setHasVoted] = useState(false);
  const [myVoteType, setMyVoteType] = useState(null); // "upvote" | "dispute" | null
  const [isVoting, setIsVoting] = useState(false);
  const [voteNotice, setVoteNotice] = useState(null);

  useEffect(() => {
    // 1. Fast pre-load from localStorage (prevents flash on page load)
    if (typeof window !== "undefined" && incident?.id) {
      const stored = localStorage.getItem(`tinggle_upvoted_${incident.id}`);
      if (stored) setHasVoted(true);
    }

    // 2. Authoritative check from DB (overrides localStorage if out of sync)
    if (!incident?.id || !userEmail) return;
    const checkVoteStatus = async () => {
      try {
        const res = await fetch(
          `/api/incidents/${incident.id}/vote?email=${encodeURIComponent(userEmail)}`
        );
        const json = await res.json();
        if (json.success) {
          setHasVoted(json.hasVoted);
          setMyVoteType(json.voteType);
          // Keep localStorage in sync with server truth
          if (json.hasVoted && typeof window !== "undefined") {
            localStorage.setItem(`tinggle_upvoted_${incident.id}`, "true");
          } else if (!json.hasVoted && typeof window !== "undefined") {
            localStorage.removeItem(`tinggle_upvoted_${incident.id}`);
          }
        }
      } catch {
        // Non-critical — localStorage fallback stays active
      }
    };
    checkVoteStatus();
  }, [incident?.id, userEmail]);

  // Live Credibility Score Calculation (uses real server counts)
  const credibility = useMemo(() => {
    return calculateCredibility({
      upvoteCount: incident?.confirm_count || 0,
      localUpvoteCount: 0, // server tracks real local votes; frontend shows aggregate only
      hasPhoto: Boolean(incident?.image_url),
      status: incident?.status || "",
      disputeCount: incident?.dispute_count || 0,
    });
  }, [incident]);

  // ─── Fetch Comments ────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    if (!incident?.id) return;
    try {
      const res = await fetch(`/api/incidents/${incident.id}/comments`);
      const json = await res.json();
      if (json.success && Array.isArray(json.comments)) {
        setComments(json.comments);
      }
    } catch (err) {
      console.error("Fetch comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [incident?.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ─── Upvote Handler ────────────────────────────────────────────────────────
  const handleUpvote = async () => {
    if (!isSignedIn) {
      setVoteNotice("Sign in to upvote this incident.");
      setTimeout(() => setVoteNotice(null), 3500);
      return;
    }
    if (isAuthor) {
      setVoteNotice("You cannot upvote your own incident report.");
      setTimeout(() => setVoteNotice(null), 3500);
      return;
    }
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    setVoteNotice(null);

    // Optimistic UI update
    const prevIncident = incident;
    setIncident((prev) => ({
      ...prev,
      confirm_count: (prev.confirm_count || 0) + 1,
    }));
    setHasVoted(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`tinggle_upvoted_${incident.id}`, "true");
    }

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

      // Server says already voted — sync UI to reflect that
      if (json.alreadyVoted) {
        setHasVoted(true);
        setIncident(prevIncident);
        setVoteNotice(json.error || "You have already voted on this incident.");
        setTimeout(() => setVoteNotice(null), 4000);
        return;
      }

      if (!res.ok || !json.success) {
        // Roll back optimistic update on real errors
        setIncident(prevIncident);
        setHasVoted(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(`tinggle_upvoted_${incident.id}`);
        }
        throw new Error(json.error || "Failed to register upvote");
      }

      // Sync with real server counts
      if (json.data) {
        setIncident(json.data);
      }
      setVoteNotice(json.message);
      setTimeout(() => setVoteNotice(null), 4000);
    } catch (err) {
      console.error("Upvote error:", err.message);
      setVoteNotice(err.message);
      setTimeout(() => setVoteNotice(null), 4000);
    } finally {
      setIsVoting(false);
    }
  };

  // ─── Comment Image Attachment Handlers ─────────────────────────────────────
  const handleCommentImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCommentError("Attached image must be under 5MB.");
      return;
    }
    setCommentImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCommentImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCommentImage = () => {
    setCommentImagePreview(null);
    setCommentImageFile(null);
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = "";
    }
  };

  // ─── Submit Comment / Extra Details ────────────────────────────────────────
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: userName,
          authorEmail: userEmail,
          content: commentText.trim(),
          isLocal: isLocalUser,
          extraDetails: extraDetails.trim() || null,
          imageUrl: commentImagePreview || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to post comment.");
      }

      setComments((prev) => [...prev, json.comment]);
      setCommentText("");
      setExtraDetails("");
      handleRemoveCommentImage();
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 3000);
    } catch (err) {
      console.error("Comment submit error:", err.message);
      setCommentError(err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <div className="shrink-0 z-40 w-full bg-[#080e19]/95 border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between backdrop-blur-xl shadow-lg sticky top-0">
        <Link
          href="/"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-100 hover:text-white text-xs md:text-sm font-mono font-semibold transition-all border border-white/10 shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Feed</span>
        </Link>

        <div className="flex items-center gap-3">
          <Badge
            className={`font-mono text-xs font-bold uppercase px-3 py-1 border ${credibility.badgeColor}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {credibility.tier}
          </Badge>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-mono transition-colors border border-white/10 cursor-pointer"
            title="Copy shareable link"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {copiedShare ? "Link Copied!" : "Share Alert"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Main Incident Content Cockpit ──────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Incident Header Card */}
        <section className="bg-[#121929] border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold uppercase">
                {incident.category || "INCIDENT PROTOCOL"}
              </span>
              <span className="font-mono text-xs text-zinc-400 font-semibold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                #{incident.id}
              </span>
              <span className="px-3 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono text-xs font-semibold uppercase">
                {incident.status || "ACTIVE CIVIC REPORT"}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Reported {new Date(incident.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Debunked / Fake News Alert Banner */}
          {credibility.isDebunked && (
            <div className="bg-red-500/20 border-2 border-red-500/60 text-red-200 p-4 rounded-xl flex items-start gap-3 shadow-xl">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold uppercase tracking-wider text-red-300 block font-mono">
                  🚨 OFFICIAL NOTICE: FLAGGED AS FAKE / DISINFORMATION BY EMERGENCY HQ
                </strong>
                <p className="text-xs text-red-300/90 mt-1 leading-relaxed">
                  This report has been investigated by municipal authorities and confirmed to be false or a false alarm. Civic credibility has been revoked (0%).
                </p>
              </div>
            </div>
          )}

          {/* Prominent Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white font-heading leading-tight">
            {incident.title}
          </h1>

          {/* Full Description */}
          <p className="text-base md:text-lg text-zinc-200 leading-relaxed">
            {incident.description ||
              "Citizen incident report filed through the community emergency trust pipeline."}
          </p>

          {/* Reporter & Location Meta Strip */}
          <div className="bg-[#0b101d] border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-mono text-zinc-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Reporter:{" "}
                <strong className="text-zinc-100">
                  {incident.is_anonymous
                    ? "Masked Citizen Alias"
                    : incident.reporter_name || incident.reporter_email?.split("@")[0] || "Verified Citizen"}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{incident.location_text || "Sector Perimeter"}</span>
              {incident.latitude && (
                <span className="text-zinc-500 hidden sm:inline">
                  ({Number(incident.latitude).toFixed(4)}°N,{" "}
                  {Number(incident.longitude).toFixed(4)}°E)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Two-Column Grid: Visual Evidence & Credibility Engine ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Evidence Photo & Upvote Action */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Photographic Proof Card */}
            <div className="bg-[#121929] border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-400" />
                  Photographic Evidence
                </span>
                {incident.image_url ? (
                  <span className="text-emerald-400 font-semibold">
                    ✓ Verified Citizen Attachment
                  </span>
                ) : (
                  <span className="text-zinc-500">No photo uploaded</span>
                )}
              </div>

              {incident.image_url ? (
                <div
                  onClick={() =>
                    setModalImage({
                      src: incident.image_url,
                      alt: incident.title,
                      title: incident.title,
                      subtitle: `Primary Evidence • ${incident.category || "Alert"}`,
                    })
                  }
                  className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden cursor-pointer group bg-black/50 border border-white/10"
                >
                  <Image
                    src={incident.image_url}
                    alt={incident.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 right-3 bg-black/80 hover:bg-black px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-1.5 border border-white/20">
                    <ExternalLink className="w-3.5 h-3.5" /> Full Zoom
                  </div>
                </div>
              ) : (
                <div className="h-44 rounded-xl bg-[#0b101d] border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
                  <Flame className="w-8 h-8 text-amber-400/40" />
                  <span>No photographic proof attached to this report.</span>
                </div>
              )}
            </div>

            {/* Upvote & Corroboration Action Card */}
            <div className="bg-[#121929] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-base md:text-lg font-bold text-white font-heading">
                    Civic Corroboration &amp; Upvoting
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Upvoting directly increases the incident&apos;s credibility rating across the city.
                  </p>
                </div>

                {isLocalUser && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    Local Resident Detected
                  </span>
                )}
              </div>

              {/* Upvote Button with Feedback */}
              <div className="flex items-center gap-3 flex-wrap">
                {credibility?.isDebunked ? (
                  <Button
                    disabled
                    className="h-11 px-6 bg-red-500/10 text-red-400 font-mono font-bold text-sm tracking-wider cursor-not-allowed border border-red-500/30 opacity-80 flex items-center gap-2"
                  >
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <span>Voting Locked · Flagged as Disinformation</span>
                  </Button>
                ) : isAuthor ? (
                  <Button
                    disabled
                    className="h-11 px-6 bg-white/5 text-zinc-400 font-mono font-bold text-sm tracking-wider cursor-not-allowed border border-white/10 opacity-75"
                  >
                    <ArrowBigUp className="w-5 h-5 text-zinc-500" />
                    <span>▲ Upvote ({incident.confirm_count || 1}) · Your Report</span>
                  </Button>
                ) : hasVoted ? (
                  <Button
                    disabled
                    className="h-11 px-6 bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-mono font-bold text-sm tracking-wider shadow-lg flex items-center gap-2 cursor-default"
                  >
                    <ArrowBigUp className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                    <span>▲ Upvoted ({incident.confirm_count || 1})</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpvote}
                    disabled={isVoting}
                    variant="primary"
                    className="h-11 px-6 font-mono font-bold text-sm tracking-wider flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                  >
                    {isVoting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowBigUp className="w-5 h-5" />
                    )}
                    <span>▲ Upvote Report ({incident.confirm_count || 1})</span>
                  </Button>
                )}

                <span className="text-xs font-mono text-zinc-400">
                  {incident.confirm_count || 1} Citizen Corroborations Recorded
                </span>
              </div>

              {voteNotice && (
                <div className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{voteNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Credibility Engine Breakdown */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#121929] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-xs font-bold uppercase text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Civic Credibility Engine
                </span>
                <span className="font-mono text-sm font-extrabold text-teal-400">
                  {credibility.score}%
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-[#0a0f19] border border-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-sky-400 to-teal-400 transition-all duration-700"
                    style={{ width: `${credibility.score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>UNVERIFIED (0%)</span>
                  <span>TIER: {credibility.tier}</span>
                  <span>HIGH TRUST (100%)</span>
                </div>
              </div>

              {/* Credibility Logic Explanations */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Credibility Factor Breakdown:
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  {credibility.explanation.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-[#0b101d] border border-white/5 p-2 rounded-lg text-zinc-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Local Proximity Corroboration Badge */}
              <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-xl text-xs font-mono text-sky-300 flex items-start gap-2">
                <Navigation className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Proximity Logic:</strong> Upvotes submitted from citizens within the immediate radius of the incident receive a <strong>+15% local corroboration multiplier</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Community Discussion & Extra Details Section ─────────────────── */}
        <section className="bg-[#121929] border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-sky-400" />
              <h2 className="text-xl md:text-2xl font-bold text-white font-heading">
                Citizen Discussion &amp; Situation Updates ({comments.length})
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              Community Ledger
            </span>
          </div>

          {/* Comment Submission Form */}
          <form onSubmit={handlePostComment} className="space-y-3.5">
            <div>
              <label className="block text-xs uppercase font-mono text-zinc-400 mb-1.5">
                Post an Update or First-Hand Observation
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share live situation updates, road closures, or first-hand details..."
                rows={3}
                required
                className="w-full bg-[#0a0f19] text-white text-sm md:text-base px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 placeholder:text-zinc-500 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-mono text-zinc-400 mb-1.5">
                Extra Details / Alternate Routes <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="e.g. Detour via West Side Bypass; EMS on scene"
                className="w-full bg-[#0a0f19] text-white text-sm md:text-base px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 placeholder:text-zinc-500 transition-all"
              />
            </div>

            {/* Photo Attachment for Situation Update */}
            <div>
              <input
                ref={commentFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCommentImageChange}
                className="hidden"
              />

              {commentImagePreview ? (
                <div className="flex items-center gap-3 p-2.5 bg-[#0a0f19] border border-amber-400/40 rounded-xl max-w-md">
                  <div
                    onClick={() =>
                      setModalImage({
                        src: commentImagePreview,
                        alt: "Attached photo preview",
                        title: "Attachment Preview",
                        subtitle: commentImageFile?.name || "Photo Evidence",
                      })
                    }
                    className="relative w-14 h-14 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0 cursor-pointer group"
                    title="Click to zoom in"
                  >
                    <Image
                      src={commentImagePreview}
                      alt="Attachment preview"
                      fill
                      className="object-cover group-hover:scale-110 transition-transform"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Photo Evidence Attached
                    </span>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                      {commentImageFile?.name || "evidence_photo.jpg"} ({((commentImageFile?.size || 0) / 1024).toFixed(0)} KB)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveCommentImage}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-colors cursor-pointer border border-white/5"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => commentFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/15 hover:border-amber-400/50 text-zinc-300 hover:text-amber-300 font-mono text-xs transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Attach Photographic Evidence / Situation Photo (Optional)</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                <span>Posting as: <strong className="text-zinc-200">{userName}</strong></span>
                {isLocalUser && (
                  <span className="text-emerald-400 font-semibold">📍 Local Resident</span>
                )}
              </div>

              {isSignedIn ? (
                <Button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  variant="primary"
                  className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Post Situation Update</span>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button
                    type="button"
                    variant="primary"
                    className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Sign In to Post Updates</span>
                  </Button>
                </SignInButton>
              )}
            </div>

            {commentSuccess && (
              <div className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Your situation update has been appended to the community ledger!</span>
              </div>
            )}

            {commentError && (
              <div className="text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{commentError}</span>
              </div>
            )}
          </form>

          {/* Comments List Feed */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            {loadingComments ? (
              <div className="p-8 text-center flex items-center justify-center gap-2 text-zinc-400 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Syncing community discussion...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center bg-[#0b101d] rounded-xl border border-dashed border-white/10 text-zinc-400 font-mono text-xs space-y-1">
                <p>No community updates posted yet.</p>
                <p className="text-zinc-600">Be the first to provide first-hand verification or road conditions.</p>
              </div>
            ) : (
              comments.map((c) => {
                if (c.image_url) {
                  return (
                    <div
                      key={c.id}
                      className="bg-[#0b101d] border border-white/10 rounded-2xl p-4 md:p-5 hover:border-white/20 transition-all shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-5 items-start">
                        {/* Left: Attached Image */}
                        <div
                          onClick={() =>
                            setModalImage({
                              src: c.image_url,
                              alt: `Attached proof by ${c.author_name}`,
                              title: `Visual Evidence by ${c.author_name}`,
                              subtitle: `Recorded on ${new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} at ${new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                            })
                          }
                          className="relative w-full sm:w-48 md:w-60 h-48 sm:h-36 md:h-44 rounded-xl overflow-hidden cursor-pointer group bg-black/50 border border-white/15 hover:border-amber-400/60 shrink-0 transition-all shadow-md"
                          title="Click to view high-resolution photo"
                        >
                          <Image
                            src={c.image_url}
                            alt="Comment visual proof"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono text-zinc-200 flex items-center gap-1.5 border border-white/20 shadow-md">
                            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Photo</span>
                          </div>
                        </div>

                        {/* Right: Author, Text, and Extra Details */}
                        <div className="flex-1 min-w-0 space-y-2.5 w-full">
                          {/* Author Header */}
                          <div className="flex items-center justify-between gap-2 text-xs md:text-sm font-mono text-zinc-400 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-sm md:text-base font-bold text-white font-heading">
                                {c.author_name}
                              </strong>
                              {c.is_local && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                                  📍 LOCAL RESIDENT
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 text-xs md:text-sm text-zinc-400">
                              {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Comment Content (Increased Size) */}
                          <p className="text-base md:text-lg text-zinc-100 leading-relaxed font-sans font-medium">
                            {c.content}
                          </p>

                          {/* Extra Details (Increased Size) */}
                          {c.extra_details && (
                            <div className="text-xs md:text-sm font-mono bg-white/5 border border-white/10 p-3 rounded-xl text-amber-300/95 leading-relaxed">
                              ℹ️ <strong className="text-amber-200 text-sm">Extra Details:</strong> {c.extra_details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className="bg-[#0b101d] border border-white/10 rounded-2xl p-4 md:p-5 space-y-2.5 hover:border-white/20 transition-all shadow-lg"
                  >
                    {/* Author Header */}
                    <div className="flex items-center justify-between gap-2 text-xs md:text-sm font-mono text-zinc-400 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm md:text-base font-bold text-white font-heading">
                          {c.author_name}
                        </strong>
                        {c.is_local && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                            📍 LOCAL RESIDENT
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs md:text-sm text-zinc-400">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Comment Content (Increased Size) */}
                    <p className="text-base md:text-lg text-zinc-100 leading-relaxed font-sans font-medium">
                      {c.content}
                    </p>

                    {/* Extra Details (Increased Size) */}
                    {c.extra_details && (
                      <div className="text-xs md:text-sm font-mono bg-white/5 border border-white/10 p-3 rounded-xl text-amber-300/95 leading-relaxed">
                        ℹ️ <strong className="text-amber-200">Extra Details:</strong> {c.extra_details}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* ── Universal Image Zoom Lightbox Modal ────────────────────────────── */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-[#0b101d] border border-white/20 rounded-2xl overflow-hidden shadow-2xl cursor-default"
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/10 shrink-0">
              <div className="min-w-0 pr-4">
                <h4 className="text-sm md:text-base font-bold text-white truncate font-heading">
                  {modalImage.title || "Visual Evidence"}
                </h4>
                {modalImage.subtitle && (
                  <p className="text-xs text-zinc-400 font-mono truncate">
                    {modalImage.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={modalImage.src}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors"
                  title="Open original in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setModalImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Viewport */}
            <div className="relative w-full h-[60vh] md:h-[72vh] bg-black/95 flex items-center justify-center">
              <Image
                src={modalImage.src}
                alt={modalImage.alt || "Visual Evidence"}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
