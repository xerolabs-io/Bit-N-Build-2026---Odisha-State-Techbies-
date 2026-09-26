"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  User,
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

export default function EditorialModerationDesk({
  pendingIncidents = [],
  onApproveIncident = null,
  onRejectIncident = null,
  onSelectIncident = null,
}) {
  const [loadingAction, setLoadingAction] = useState({});

  const handleApprove = async (id) => {
    if (!onApproveIncident) return;
    setLoadingAction((p) => ({ ...p, [id]: "approving" }));
    try {
      await onApproveIncident(id);
    } finally {
      setLoadingAction((p) => ({ ...p, [id]: null }));
    }
  };

  const handleReject = async (id) => {
    if (!onRejectIncident) return;
    setLoadingAction((p) => ({ ...p, [id]: "rejecting" }));
    try {
      await onRejectIncident(id);
    } finally {
      setLoadingAction((p) => ({ ...p, [id]: null }));
    }
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#182236] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-sm md:text-base text-white font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          Editorial Moderation Desk
        </span>
        <span className="font-mono text-xs text-amber-400 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-semibold">
          {pendingIncidents.length} PENDING REVIEW
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {pendingIncidents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-teal-400" />
            <p className="text-zinc-400 text-xs font-mono">
              All reported dispatches have been moderated and synchronized.
            </p>
          </div>
        ) : (
          pendingIncidents.slice(0, 5).map((item) => {
            const isLoading = Boolean(loadingAction[item.id]);

            return (
              <div
                key={item.id}
                className="p-4 bg-[#0f1623] border border-white/5 rounded-xl flex flex-col gap-3 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold flex items-center gap-1.5 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    DISPATCH #{item.id} • {item.category?.toUpperCase() || "REPORT"}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {formatElapsed(item.created_at)}
                  </span>
                </div>

                <h4 className="font-semibold text-white text-sm font-heading">
                  {item.title}
                </h4>

                <p className="font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>

                {item.image_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                    <Image
                      src={item.image_url}
                      alt="Citizen Evidence"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="400px"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-teal-300">
                      SUBMITTED EVIDENCE
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <User className="w-3 h-3 text-zinc-500" />
                    {item.reporter_email || "Anonymous Reporter"}
                  </span>
                  <span className="text-amber-400 font-semibold">
                    📍 {item.location_text || "Sector Map"}
                  </span>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    disabled={isLoading}
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-black transition-colors font-mono text-[11px] font-bold tracking-wider cursor-pointer border border-teal-500/30"
                  >
                    {loadingAction[item.id] === "approving"
                      ? "Approving..."
                      : "Approve Wire"}
                  </button>

                  <button
                    disabled={isLoading}
                    onClick={() => handleReject(item.id)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-zinc-400 hover:text-red-300 hover:bg-red-500/20 transition-colors font-mono text-[11px] font-bold tracking-wider cursor-pointer border border-red-500/20"
                  >
                    {loadingAction[item.id] === "rejecting"
                      ? "Flagging..."
                      : "Flag Rumor"}
                  </button>

                  <button
                    onClick={() => onSelectIncident?.(item)}
                    title="Inspect in Dossier"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
