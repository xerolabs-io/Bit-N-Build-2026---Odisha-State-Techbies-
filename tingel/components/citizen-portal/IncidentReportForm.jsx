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
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { id: "Traffic", label: "TRAFFIC", icon: Car, color: "text-amber-400", activeBg: "bg-amber-500 text-black font-semibold border-amber-400" },
  { id: "Fire", label: "FIRE / HAZARD", icon: Flame, color: "text-red-400", activeBg: "bg-red-500 text-white font-semibold border-red-400" },
  { id: "Utility", label: "UTILITY & WATER", icon: Droplets, color: "text-teal-400", activeBg: "bg-teal-500 text-black font-semibold border-teal-400" },
  { id: "Public Safety", label: "PUBLIC SAFETY", icon: ShieldAlert, color: "text-sky-400", activeBg: "bg-sky-500 text-black font-semibold border-sky-400" },
  { id: "Transit", label: "TRANSIT DELAYS", icon: TrainTrack, color: "text-amber-400", activeBg: "bg-amber-500 text-black font-semibold border-amber-400" },
];

export default function IncidentReportForm({ onSubmit }) {
  const [headline, setHeadline] = useState("");
  const [activeCategory, setActiveCategory] = useState("Traffic");
  const [locationText, setLocationText] = useState("GPS: Tribeca / Canal St Core");
  const [isLocating, setIsLocating] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleAcquireLocation = () => {
    setIsLocating(true);
    setLocationText("Locating GPS Satellites...");
    setTimeout(() => {
      setLocationText("GPS: 40.7182° N, 74.0020° W (Tribeca Core)");
      setIsLocating(false);
    }, 650);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setHeadline("");
    setImagePreview(null);
    setIsAnonymous(false);
    setActiveCategory("Traffic");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setIsSubmitting(true);

    const newReport = {
      id: `NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      title: headline,
      category: activeCategory,
      description: `Initial citizen broadcast categorized under ${activeCategory}. Community verifications initiated in your immediate vicinity.`,
      status: "PENDING CIVIC CONFIRMATION",
      statusVariant: "warning",
      timestamp: "Just now",
      location: locationText.replace("GPS: ", "").split("(")[1]?.replace(")", "") || "Tribeca Core",
      reporter: isAnonymous ? "Anonymous Citizen" : "Citizen Reporter",
      confirmCount: 1,
      disputeCount: 0,
      image: imagePreview || "/stitch/issue_1.jpg",
      badgeText: "Just Reported",
      trustScore: "COMMUNITY TRUST: VERIFYING",
      isUserCreated: true,
    };

    setTimeout(() => {
      if (onSubmit) onSubmit(newReport);
      handleClear();
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 3500);
    }, 400);
  };

  return (
    <div className="bg-[#151c2a] border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <form className="relative z-10 flex flex-col gap-5" onSubmit={handleSubmit}>
        {/* Form Top Title */}
        <div className="flex items-center justify-between pb-1 border-b border-white/5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white font-heading">
              Broadcast a Community Incident
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-teal-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>End-to-End Cryptographically Stamped</span>
          </div>
        </div>

        {/* Input Fields & Media Upload */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          {/* Left inputs */}
          <div className="flex-1 flex flex-col justify-between gap-4">
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
                placeholder="What is happening right now? (e.g. Gas odor, street blockage, water main break)"
                className="w-full bg-[#0a0f19] text-white text-sm md:text-base px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 placeholder:text-zinc-500 transition-all shadow-inner"
              />
            </div>

            {/* Protocol Category Chips */}
            <div>
              <span className="text-xs uppercase font-mono text-zinc-400 block mb-2 font-medium tracking-wide">
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

          {/* Right upload & location column */}
          <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
            {/* Media Upload Area */}
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
                <div className="relative w-full h-20 rounded-lg overflow-hidden group">
                  <Image
                    src={imagePreview}
                    alt="Uploaded preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
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
                  <span className="text-xs font-semibold text-zinc-200">
                    Attach Photographic Proof
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Tap to upload photo or drag & drop
                  </span>
                </>
              )}
            </div>

            {/* GPS Telemetry Pill */}
            <div className="flex items-center justify-between gap-2 bg-[#0b101c] border border-white/10 px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs truncate">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
              <button
                type="button"
                onClick={handleAcquireLocation}
                disabled={isLocating}
                className="px-2.5 py-1 rounded bg-[#20293d] hover:bg-amber-500 hover:text-black font-mono text-[11px] text-sky-400 shrink-0 transition-colors uppercase font-semibold disabled:opacity-50 flex items-center gap-1"
              >
                {isLocating && <Loader2 className="w-3 h-3 animate-spin" />}
                {isLocating ? "LOCKING..." : "ACQUIRE"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer controls: Anon Check & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 hover:text-zinc-300 text-xs">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0a0f19] border-white/20 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
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

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !headline.trim()}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? "Broadcasting..." : "Submit Incident Report"}
            </Button>
          </div>
        </div>

        {/* Success alert message */}
        {submittedSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Incident report dispatched to local ledger. Nearby reporters notified for verification!</span>
          </div>
        )}
      </form>
    </div>
  );
}
