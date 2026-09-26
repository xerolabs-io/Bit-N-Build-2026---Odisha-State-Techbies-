"use client";

import React from "react";
import { Navigation, Activity, ShieldAlert, Loader2, LocateFixed, MapPin } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useGeoLocation, GEO_STATES } from "@/hooks/useGeoLocation";

export default function SectorBanner({
  activeCount = 12,
  responseVelocity = "~4.2 min",
}) {
  const { user, isLoaded } = useUser();
  // Auto-fetch GPS on mount
  const { geoState, locationText } = useGeoLocation(true);

  // Friendly display name: firstName > fullName > username > "Citizen Reporter"
  const displayName =
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    user?.username ||
    "Citizen Reporter";

  return (
    <div className="w-full bg-[#111724]/90 border-b border-white/5 px-4 md:px-8 py-8 shadow-lg backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Titles & Sector Tag */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Real GPS location label */}
              <span className="font-mono text-xs flex items-center gap-1.5 tracking-wide">
                {geoState === GEO_STATES.LOCATING ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-amber-400">Acquiring your location...</span>
                  </>
                ) : geoState === GEO_STATES.ACQUIRED ? (
                  <>
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{locationText}</span>
                  </>
                ) : geoState === GEO_STATES.ERROR ? (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-red-400">{locationText}</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-zinc-400">Locating sector...</span>
                  </>
                )}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-heading">
              Welcome back,{" "}
              {!isLoaded ? (
                <span className="inline-block w-32 h-8 bg-white/10 rounded-lg animate-pulse align-middle" />
              ) : (
                <span className="text-amber-400 font-semibold">{displayName}</span>
              )}
            </h1>

            <p className="text-sm md:text-base text-zinc-400 max-w-2xl leading-relaxed">
              Real-time communal ledger powered by local eyewitnesses. Track infrastructure anomalies, public transit bottlenecks, and civic updates.
            </p>
          </div>

          {/* Right: Metrics Pills */}
          <div className="flex items-center gap-4 shrink-0 bg-[#161d2d] border border-white/10 px-5 py-3 rounded-xl shadow-md self-start lg:self-auto">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-medium">
                Local Active Alerts
              </span>
              <span className="text-xl md:text-2xl font-bold text-amber-400 font-heading">
                {activeCount} Incidents
              </span>
            </div>

            <div className="w-px h-9 bg-white/10" />

            <div
              className="flex flex-col"
              title="Average time from report submission to community verification or dispatch triage"
            >
              <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-medium">
                Response Velocity
              </span>
              <span className="text-xl md:text-2xl font-bold text-teal-400 font-heading">
                {responseVelocity}
              </span>
              <span className="text-[9px] font-mono text-zinc-500">
                Avg Triage Time
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
