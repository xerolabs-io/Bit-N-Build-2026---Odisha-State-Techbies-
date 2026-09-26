"use client";

import React, { useState } from "react";
import { Radio, Loader2, CheckCircle2 } from "lucide-react";

export default function ScanningSpectrumBanner() {
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveLoaded, setArchiveLoaded] = useState(false);

  const handleLoadArchive = () => {
    setLoadingArchive(true);
    setTimeout(() => {
      setLoadingArchive(false);
      setArchiveLoaded(true);
      setTimeout(() => setArchiveLoaded(false), 3000);
    }, 800);
  };

  return (
    <div className="p-4 md:p-5 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <div className="text-sm md:text-base text-white font-bold font-heading flex items-center gap-2">
            <span>Scanning Civic Spectrum...</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="text-xs text-zinc-400">
            Continuous automated crawl across 41 public city feeds, emergency dispatchers, and amateur radio bands.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLoadArchive}
        disabled={loadingArchive}
        className="px-4 py-2 bg-[#1c2436] hover:bg-[#253046] text-zinc-200 hover:text-white font-mono text-xs tracking-wider rounded-xl transition-all border border-white/5 shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        {loadingArchive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {archiveLoaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        <span>{loadingArchive ? "SCANNING..." : archiveLoaded ? "ARCHIVE SYNCED" : "LOAD ARCHIVE"}</span>
      </button>
    </div>
  );
}
