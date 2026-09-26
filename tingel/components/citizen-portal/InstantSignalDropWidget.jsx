"use client";

import React, { useState } from "react";
import { Zap, Mic, Camera, StopCircle, CheckCircle2 } from "lucide-react";

export default function InstantSignalDropWidget({ onQuickDrop }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSuccess, setRecordingSuccess] = useState(false);

  const handleVoiceDispatch = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordingSuccess(true);
      if (onQuickDrop) {
        onQuickDrop({
          id: `VOX-${Math.floor(1000 + Math.random() * 9000)}`,
          title: "Eyewitness Voice Memo Transcribed",
          category: "Utility",
          description: "Rapid audio memo uploaded via Instant Signal Drop. Auto-categorized and queued for verification.",
          status: "AUDIO PENDING VERIFICATION",
          statusVariant: "warning",
          timestamp: "Just now",
          location: "Tribeca Corridor",
          confirmCount: 1,
          disputeCount: 0,
          image: "/stitch/issue_1.jpg",
          thumbnailBadge: { text: "Voice Note Attached", icon: "camera" },
          trustScore: "COMMUNITY TRUST: PROCESSING",
          isUserCreated: true,
        });
      }
      setTimeout(() => setRecordingSuccess(false), 3000);
    } else {
      setIsRecording(true);
    }
  };

  const handleQuickLens = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onQuickDrop) {
            onQuickDrop({
              id: `SNAP-${Math.floor(1000 + Math.random() * 9000)}`,
              title: "Quick Lens Photo Dispatch",
              category: "Traffic",
              description: "Photographic proof captured via Instant Signal Drop camera shortcut.",
              status: "PHOTO CONFIRMED",
              statusVariant: "transit",
              timestamp: "Just now",
              location: "Midtown West",
              confirmCount: 2,
              disputeCount: 0,
              image: reader.result,
              thumbnailBadge: { text: "Direct Lens Snapshot", icon: "camera" },
              trustScore: "COMMUNITY TRUST: 92%",
              isUserCreated: true,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
        <Zap className="w-4 h-4 text-teal-400" />
        Instant Signal Drop
      </span>

      <p className="text-xs text-zinc-400 leading-relaxed">
        Moving through an area quickly? Drop an audio memo or single snap. Editorial algorithms will categorize.
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Voice Dispatch */}
        <button
          type="button"
          onClick={handleVoiceDispatch}
          className={`p-3 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 border cursor-pointer ${
            isRecording
              ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
              : "bg-[#0b101c] hover:bg-[#182236] border-white/5 text-zinc-300 hover:text-white"
          }`}
        >
          {isRecording ? (
            <StopCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Mic className="w-5 h-5 text-amber-400" />
          )}
          <span className="font-mono text-xs font-semibold">
            {isRecording ? "Stop & Dispatch" : "Voice Dispatch"}
          </span>
        </button>

        {/* Quick Lens */}
        <button
          type="button"
          onClick={handleQuickLens}
          className="p-3 bg-[#0b101c] hover:bg-[#182236] rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 border border-white/5 text-zinc-300 hover:text-white cursor-pointer"
        >
          <Camera className="w-5 h-5 text-sky-400" />
          <span className="font-mono text-xs font-semibold">Quick Lens</span>
        </button>
      </div>

      {recordingSuccess && (
        <div className="bg-teal-500/20 border border-teal-500/30 text-teal-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Audio dispatch logged to ledger!</span>
        </div>
      )}
    </div>
  );
}
