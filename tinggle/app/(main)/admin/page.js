import React from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";
import {
  AdminTelemetryBanner,
  HeroIncidentDossier,
  IncidentFilterBar,
  SecondaryIncidentQueue,
  EditorialModerationDesk,
  ActiveThreatSectorMap,
  InterAgencyStatusWidget,
  BroadcastComposerWidget,
} from "@/components/admin-command";

export const metadata = {
  title: "Admin Command — Emergency Operations Terminal | Daily Bugle",
  description: "Secure admin dispatch terminal for real-time emergency operations monitoring.",
};

export default async function AdminCommandPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const user = await currentUser();
  const operatorName =
    user?.primaryEmailAddress?.emailAddress || user?.fullName || "Operator";

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">

      {/* Sticky top nav strip */}
      <div className="sticky top-0 z-40 w-full bg-[#080e19]/95 border-b border-white/5 px-4 md:px-8 py-2 flex items-center justify-between backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-amber-400 tracking-widest uppercase">BUGLE HQ · DISPATCH OPS</span>
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            DEFCON 3 · SECTOR 4A
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-zinc-400 hidden md:block">
            Operator: <span className="text-zinc-200 font-semibold">{operatorName}</span>
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition-colors border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Portal
          </Link>
        </div>
      </div>

      {/* 1. Admin Telemetry Banner (client — includes advisory drawer) */}
      <AdminTelemetryBanner />

      {/* Main Command Dashboard */}
      <div className="max-w-[1720px] mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8 flex-1">

        {/* 2. Hero Incident Dossier */}
        <HeroIncidentDossier />

        {/* 3. Tier Filter Bar */}
        <IncidentFilterBar />

        {/* 4. Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* Left: Incident Queue + Moderation Desk (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <SecondaryIncidentQueue />
            <EditorialModerationDesk />
          </div>

          {/* Right: Intelligence Sidebar (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <ActiveThreatSectorMap />
            <InterAgencyStatusWidget />
            <BroadcastComposerWidget />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-8 py-3 flex items-center justify-between font-mono text-[11px] text-zinc-600">
        <span>BUGLE EMERGENCY OPERATIONS TERMINAL · v2.0</span>
        <span>DISPATCH BANDWIDTH: 94.2% · AUTO-REFRESH: 4s</span>
      </div>
    </div>
  );
}