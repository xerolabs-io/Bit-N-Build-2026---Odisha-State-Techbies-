"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Clock,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CornerUpRight,
  Share2,
  Camera,
  Zap,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function IncidentCard({
  incident,
  onVote,
}) {
  const [userVoted, setUserVoted] = useState(null); // 'confirm' | 'dispute' | null
  const [confirmCount, setConfirmCount] = useState(incident.confirmCount || 0);
  const [disputeCount, setDisputeCount] = useState(incident.disputeCount || 0);
  const [copiedAlert, setCopiedAlert] = useState(false);

  const handleConfirm = () => {
    if (userVoted === "confirm") return;
    if (userVoted === "dispute") {
      setDisputeCount((c) => Math.max(0, c - 1));
    }
    setConfirmCount((c) => c + 1);
    setUserVoted("confirm");
    if (onVote) onVote(incident.id, "confirm");
  };

  const handleDispute = () => {
    if (userVoted === "dispute") return;
    if (userVoted === "confirm") {
      setConfirmCount((c) => Math.max(0, c - 1));
    }
    setDisputeCount((c) => c + 1);
    setUserVoted("dispute");
    if (onVote) onVote(incident.id, "dispute");
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `[Citizen Alert] ${incident.title} at ${incident.location} (#${incident.id})`
    );
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2000);
  };

  // Status color styles
  const getStatusBadge = () => {
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

  return (
    <article
      className={`bg-[#141b2a] hover:bg-[#182132] border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300 relative overflow-hidden group ${
        incident.isUserCreated
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-white/10"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* Media Thumbnail Container */}
        {incident.image && (
          <div className="w-full md:w-48 h-40 md:h-36 shrink-0 rounded-xl overflow-hidden relative shadow-md bg-black/40">
            <Image
              src={incident.image}
              alt={incident.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 192px"
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
          </div>
        )}

        {/* Content Details */}
        <div className="flex-1 flex flex-col justify-between gap-2.5">
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

            {/* Title */}
            <h3 className="text-base md:text-lg font-bold text-white font-heading mt-1.5 leading-snug group-hover:text-amber-300 transition-colors">
              {incident.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-zinc-300/90 mt-1 leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Confirm Vote */}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  userVoted === "confirm"
                    ? "bg-teal-500/25 text-teal-300 border border-teal-500/40"
                    : "bg-[#0b101c] hover:bg-[#1a2336] text-teal-400 border border-white/5"
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Confirm ({confirmCount})</span>
              </button>

              {/* Dispute Vote */}
              <button
                type="button"
                onClick={handleDispute}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  userVoted === "dispute"
                    ? "bg-red-500/25 text-red-300 border border-red-500/40"
                    : "bg-[#0b101c] hover:bg-[#1a2336] text-zinc-400 hover:text-red-400 border border-white/5"
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Dispute ({disputeCount})</span>
              </button>

              {/* Contextual Action (Comment / Detour / Broadcast) */}
              <button
                type="button"
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg bg-[#0b101c] hover:bg-[#1a2336] text-zinc-300 hover:text-white font-mono text-xs tracking-wider flex items-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
              >
                {incident.actionType === "detour" ? (
                  <>
                    <CornerUpRight className="w-3.5 h-3.5 text-sky-400" />
                    <span>{incident.actionLabel || "Detour Feed (7)"}</span>
                  </>
                ) : incident.actionType === "broadcast" ? (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedAlert ? "Copied!" : "Broadcast Safety Alert"}</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    <span>{copiedAlert ? "Copied!" : "Update (19)"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Trust Meter / Authority badge */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-amber-400 tracking-wider">
                {incident.trustScore}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
