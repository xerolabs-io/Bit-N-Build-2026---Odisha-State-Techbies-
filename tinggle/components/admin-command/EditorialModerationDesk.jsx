"use client";

import React, { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Trash2, MessageSquare } from "lucide-react";

const PENDING = [
  {
    id: "modCard1", type: "CITIZEN DISPATCH #7701", typeColor: "text-amber-400", age: "2m ago",
    text: `"Heavy sulfur odor leaking through subway grates at 42nd & Broadway. 3 people observed coughing on sidewalk."`,
    trust: "94/100", corroboration: "Pending", image: null,
    approveLabel: "Approve Wire", discardLabel: "Flag Noise",
  },
  {
    id: "modCard2", type: "PHOTO EVIDENCE WIRE #7702", typeColor: "text-sky-400", age: "5m ago",
    text: "Photo submission showing smoke plume rising from rear freight bay of 8th Ave warehouse.",
    trust: "88/100", corroboration: "Visual Match", image: "/stitch/admin/report_photo.jpg",
    approveLabel: "Attach to Lead", discardLabel: "Discard",
  },
];

export default function EditorialModerationDesk() {
  const [removed, setRemoved] = useState({});
  const [approved, setApproved] = useState({});

  const handleApprove = (id) => setApproved((p) => ({ ...p, [id]: true }));
  const handleDiscard = (id) => {
    setRemoved((p) => ({ ...p, [id]: true }));
  };

  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#182236] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-heading text-sm md:text-base text-white font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          Editorial Moderation Desk
        </span>
        <span className="font-mono text-xs text-amber-400 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
          4 PENDING WIRE
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {PENDING.map((item) => {
          if (removed[item.id]) return null;
          if (approved[item.id]) {
            return (
              <div key={item.id} className="py-3 text-center text-teal-400 font-mono text-xs font-bold">
                ✓ APPROVED & SYNCED TO PUBLIC WIRE
              </div>
            );
          }
          return (
            <div key={item.id} className="p-4 bg-[#0f1623] border border-white/5 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-bold flex items-center gap-1 ${item.typeColor}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {item.type}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">{item.age}</span>
              </div>
              <p className="font-sans text-xs text-zinc-200 leading-relaxed">{item.text}</p>
              {item.image && (
                <div className="relative w-full h-24 rounded-lg overflow-hidden bg-black/30">
                  <Image src={item.image} alt="Evidence" fill className="object-cover" sizes="400px" />
                </div>
              )}
              <div className="flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <span>Reporter Trust: <strong className="text-zinc-300">{item.trust}</strong></span>
                <span>• Corroboration: <strong className="text-zinc-300">{item.corroboration}</strong></span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="flex-1 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-black transition-colors font-mono text-[11px] font-bold tracking-wider cursor-pointer"
                >
                  {item.approveLabel}
                </button>
                <button
                  onClick={() => handleDiscard(item.id)}
                  className="flex-1 py-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors font-mono text-[11px] font-bold tracking-wider cursor-pointer"
                >
                  {item.discardLabel}
                </button>
                <button className="p-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-zinc-200 cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
