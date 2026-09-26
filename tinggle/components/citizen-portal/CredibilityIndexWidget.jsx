"use client";

import React from "react";
import { BadgeCheck, Award, TrendingUp } from "lucide-react";

export default function CredibilityIndexWidget({
  tier = "TIER 3",
  veracity = "94.8%",
  confirmedRatio = "18 / 19",
  progressPercent = 82,
  nextMilestone = "Tier 4 Dispatcher",
  reportsRemaining = 2,
}) {
  return (
    <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-teal-400" />
          Citizen Credibility Index
        </span>
        <span className="px-2 py-0.5 bg-teal-500/15 border border-teal-500/30 text-teal-400 rounded-md font-mono text-[11px] font-semibold">
          {tier}
        </span>
      </div>

      {/* Metrics Split Card */}
      <div className="bg-[#0b101c] border border-white/5 p-3.5 rounded-xl flex items-center justify-between gap-4">
        <div>
          <div className="text-xl md:text-2xl font-bold text-amber-400 font-heading">
            {veracity}
          </div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            COMMUNITY VERACITY RATING
          </div>
        </div>

        <div className="w-px h-8 bg-white/10"></div>

        <div className="text-right">
          <div className="text-xl md:text-2xl font-bold text-white font-heading">
            {confirmedRatio}
          </div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            CONFIRMED REPORTS
          </div>
        </div>
      </div>

      {/* Progress & Milestone */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1 text-zinc-300">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Next Milestone: {nextMilestone}
          </span>
          <span className="text-teal-400">{reportsRemaining} Reports Remaining</span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-[#090d17] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
