"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Megaphone,
  ShieldCheck,
  Car,
  Flame,
  Droplets,
  ShieldAlert,
  TrainTrack,
  UploadCloud,
  MapPin,
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Lock,
  LogIn,
} from "lucide-react";
import { useGeoLocation, GEO_STATES } from "@/hooks/useGeoLocation";
import { Button } from "@/components/ui/button";
import { useUser, SignInButton } from "@clerk/nextjs";

const CATEGORIES = [
  { id: "Traffic", label: "TRAFFIC", icon: Car, color: "text-amber-400", activeBg: "bg-amber-500 text-black font-semibold border-amber-400" },
  { id: "Fire", label: "FIRE / HAZARD", icon: Flame, color: "text-red-400", activeBg: "bg-red-500 text-white font-semibold border-red-400" },
  { id: "Utility", label: "UTILITY & WATER", icon: Droplets, color: "text-teal-400", activeBg: "bg-teal-500 text-black font-semibold border-teal-400" },
  { id: "Public Safety", label: "PUBLIC SAFETY", icon: ShieldAlert, color: "text-sky-400", activeBg: "bg-sky-500 text-black font-semibold border-sky-400" },
  { id: "Transit", label: "TRANSIT DELAYS", icon: TrainTrack, color: "text-amber-400", activeBg: "bg-amber-500 text-black font-semibold border-amber-400" },
];

const GPS_STATES = {
  IDLE: "idle",
  LOCATING: "locating",
  ACQUIRED: "acquired",
  ERROR: "error",
};

export default function IncidentReportForm({ onSubmit }) {
  const { user, isSignedIn, isLoaded } = useUser();

  // Form state
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [activeCategory, setActiveCategory] = useState("Traffic");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // ─── GPS via shared hook (autoFetch=true → fetches on mount automatically) ─
  const { geoState: gpsState, locationText, coords, acquire: handleAcquireLocation } = useGeoLocation(true);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fileInputRef = useRef(null);

  // ─── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ─── Clear form ────────────────────────────────────────────────────────────
  const handleClear = () => {
    setHeadline("");
    setDescription("");
    setImagePreview(null);
    setImageFile(null);
    setIsAnonymous(false);
    setActiveCategory("Traffic");
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Submit to API → Supabase ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Strict Auth Verification
    if (!isSignedIn || !user) {
      setSubmitError("Authentication required: You must be signed in to broadcast a citizen report.");
      return;
    }

    if (!headline.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
      const userEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress;

      if (!userEmail) {
        throw new Error("Unable to identify authenticated user email. Please sign in again.");
      }

      const payload = {
        title: headline.trim(),
        description: description.trim() ||
          `Citizen-reported ${activeCategory} incident. Community verifications initiated.`,
        category: activeCategory,
        location_text: locationText !== "Tap ACQUIRE to lock GPS" ? locationText : null,
        latitude: coords.lat,
        longitude: coords.lng,
        image_url: imagePreview || null, // base64 preview stored as data URL
        is_anonymous: isAnonymous,
        reporter_email: userEmail,
      };

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit report.");
      }

      // Build a feed card object from the saved DB row
      const saved = result.data;
      const newFeedCard = {
        id: saved.id,
        title: saved.title,
        category: saved.category,
        status: saved.status,
        statusVariant: "warning",
        timestamp: "Just now",
        location: saved.location_text || "Location not set",
        distanceMiles: null,
        description: saved.description,
        confirmCount: saved.confirm_count,
        disputeCount: saved.dispute_count,
        actionType: "comment",
        actionLabel: "Update",
        trustScore: saved.trust_score,
        image: saved.image_url || "/stitch/issue_1.jpg",
        isUserCreated: true,
      };

      if (onSubmit) onSubmit(newFeedCard);
      handleClear();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error("Submit error:", err.message);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // GPS button label & colour
  const gpsLabel = {
    [GEO_STATES.IDLE]: "ACQUIRE",
    [GEO_STATES.LOCATING]: "LOCKING...",
    [GEO_STATES.ACQUIRED]: "RE-LOCK",
    [GEO_STATES.ERROR]: "RETRY",
  }[gpsState];

  const gpsTextColor = {
    [GEO_STATES.IDLE]: "text-sky-400",
    [GEO_STATES.LOCATING]: "text-amber-400",
    [GEO_STATES.ACQUIRED]: "text-emerald-400",
    [GEO_STATES.ERROR]: "text-red-400",
  }[gpsState];

  return (
    <div className="bg-[#151c2a] border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      <form className="relative z-10 flex flex-col gap-5" onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white font-heading">
              Broadcast a Community Incident
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Reporter</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In Required</span>
              </div>
            )}
          </div>
        </div>

        {/* Unauthenticated Security Banner */}
        {!isSignedIn && isLoaded && (
          <div className="bg-gradient-to-r from-amber-500/15 via-[#161e2e] to-sky-500/15 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-300 font-heading text-sm">
                  Sign In Required to File Incident Reports
                </span>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                  Only authenticated citizens can upload incident reports to maintain community trust and eliminate false alarms.
                </p>
              </div>
            </div>

            <SignInButton mode="modal">
              <button
                type="button"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In with Account
              </button>
            </SignInButton>
          </div>
        )}

        {/* Input Fields & Media Upload */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          {/* Left inputs */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Headline */}
            <div>
              <label htmlFor="headline-input" className="block text-xs uppercase font-mono text-zinc-400 mb-1.5">
                Incident Headline *
              </label>
              <input
                id="headline-input"
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="What is happening right now? (e.g. Gas odor, water main break)"
                className="w-full bg-[#0a0f19] text-white text-sm px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 placeholder:text-zinc-500 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="desc-input" className="block text-xs uppercase font-mono text-zinc-400 mb-1.5">
                Additional Details <span className="text-zinc-600">(optional)</span>
              </label>
              <textarea
                id="desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you saw, heard, or experienced..."
                rows={2}
                className="w-full bg-[#0a0f19] text-white text-sm px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 placeholder:text-zinc-500 transition-all resize-none"
              />
            </div>

            {/* Category Chips */}
            <div>
              <span className="text-xs uppercase font-mono text-zinc-400 block mb-2 tracking-wide">
                Select Category Protocol
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 border ${
                        isActive
                          ? cat.activeBg
                          : "bg-[#1c2436] hover:bg-[#253046] text-zinc-300 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-current" : cat.color}`} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Upload & GPS */}
          <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
            {/* Media Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0b101c] border border-dashed border-white/15 hover:border-amber-400/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all hover:bg-[#111726] group relative overflow-hidden min-h-[92px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {imagePreview ? (
                <div className="relative w-full h-20 rounded-lg overflow-hidden">
                  <Image src={imagePreview} alt="Uploaded preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 rounded-full text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-zinc-400 group-hover:text-amber-400 group-hover:scale-110 transition-all" />
                  <span className="text-xs font-semibold text-zinc-200">Attach Photographic Proof</span>
                  <span className="text-[11px] text-zinc-500">Tap to upload · Max 5MB</span>
                </>
              )}
            </div>

            {/* GPS Telemetry — Real browser geolocation */}
            <div className="flex items-center justify-between gap-2 bg-[#0b101c] border border-white/10 px-3 py-2.5 rounded-xl">
              <div className={`flex items-center gap-1.5 font-mono text-xs truncate ${gpsTextColor}`}>
                {gpsState === GPS_STATES.LOCATING ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : gpsState === GPS_STATES.ACQUIRED ? (
                  <LocateFixed className="w-4 h-4 shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span className="truncate">{locationText}</span>
              </div>
              <button
                type="button"
                onClick={handleAcquireLocation}
                disabled={gpsState === GEO_STATES.LOCATING}
                className={`px-2.5 py-1 rounded font-mono text-[11px] shrink-0 transition-colors uppercase font-semibold disabled:opacity-50 flex items-center gap-1
                  ${gpsState === GEO_STATES.ACQUIRED
                    ? "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black"
                    : gpsState === GEO_STATES.ERROR
                    ? "bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white"
                    : "bg-[#20293d] hover:bg-amber-500 text-sky-400 hover:text-black"
                  }`}
              >
                {gpsLabel}
              </button>
            </div>

            {/* Show coordinates if acquired */}
            {coords.lat && (
              <p className="text-[10px] text-zinc-600 font-mono px-1">
                {coords.lat.toFixed(6)}°N · {coords.lng.toFixed(6)}°E
              </p>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 hover:text-zinc-300 text-xs">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0a0f19] border-white/20 cursor-pointer accent-amber-500"
            />
            <span>Protect ID: Submit with Masked Public Alias</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 text-xs font-medium transition-colors"
            >
              Clear
            </button>
            {isSignedIn ? (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !headline.trim()}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? "Broadcasting..." : "Submit Incident Report"}
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  Sign In to Submit Report
                </Button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* Success banner */}
        {submitSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Incident saved to database & dispatched to local feed. Community notified!</span>
          </div>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="ml-auto text-red-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
