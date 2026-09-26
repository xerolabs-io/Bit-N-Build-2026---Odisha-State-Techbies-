"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  AlertOctagon,
  X,
  PhoneCall,
  Volume2,
  VolumeX,
  Share2,
  MapPin,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Flame,
  Ambulance,
  Radio,
  ExternalLink,
} from "lucide-react";

// Emergency presets
const EMERGENCY_TYPES = [
  {
    id: "Medical",
    label: "Medical",
    desc: "Heart attack, severe injury, trauma, unconscious",
    icon: Ambulance,
    color: "#ef4444",
    dialNumber: "108",
  },
  {
    id: "Crime",
    label: "Crime / Threat",
    desc: "Assault, robbery, stalker, active threat",
    icon: ShieldAlert,
    color: "#3b82f6",
    dialNumber: "100",
  },
  {
    id: "Fire",
    label: "Fire / Explosion",
    desc: "Trapped in blaze, gas leak, hazardous explosion",
    icon: Flame,
    color: "#f97316",
    dialNumber: "101",
  },
  {
    id: "Disaster",
    label: "Disaster / Calamity",
    desc: "Trapped in flood, building collapse, earthquake",
    icon: Radio,
    color: "#a855f7",
    dialNumber: "112",
  },
];

export default function EmergencySosModal() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("Medical");
  const [countdown, setCountdown] = useState(null); // null or number (3, 2, 1)
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeSos, setActiveSos] = useState(null); // data from broadcast
  const [isResolving, setIsResolving] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");

  const countdownTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  const userName = user?.fullName || user?.username || "Citizen";

  // Listen for global custom event from Header button or external triggers
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("tinggle:open-sos", handleOpen);
    return () => window.removeEventListener("tinggle:open-sos", handleOpen);
  }, []);

  // Fetch GPS coordinates whenever modal opens
  useEffect(() => {
    if (isOpen && !coords && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
          });
          setLocating(false);
        },
        (err) => {
          console.warn("Geolocation warning in SOS:", err.message);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isOpen, coords]);

  // Clean up siren and timer on unmount or close
  const stopSiren = useCallback(() => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setSirenPlaying(false);
  }, []);

  const toggleSiren = () => {
    if (sirenPlaying) {
      stopSiren();
    } else {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscillatorRef.current = osc;
        setSirenPlaying(true);

        // Siren frequency alternation (750Hz <-> 1050Hz)
        let high = false;
        sirenIntervalRef.current = setInterval(() => {
          if (!oscillatorRef.current || !audioContextRef.current) return;
          const targetFreq = high ? 750 : 1050;
          oscillatorRef.current.frequency.setValueAtTime(
            targetFreq,
            audioContextRef.current.currentTime
          );
          high = !high;
        }, 350);
      } catch (e) {
        console.warn("Web Audio API not permitted:", e.message);
      }
    }
  };

  const handleClose = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    stopSiren();
    setIsOpen(false);
  };

  // Perform SOS broadcast via backend
  const executeSosBroadcast = useCallback(async () => {
    setIsBroadcasting(true);
    setCountdown(null);
    try {
      const res = await fetch("/api/sos/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyType: selectedType,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          locationText: coords
            ? `GPS Coordinates: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${coords.accuracy}m)`
            : "Location Broadcasting via Network...",
          details: note || undefined,
          reporterEmail: userEmail || "anonymous-sos@tinggle.network",
          reporterName: userName,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveSos(json.data);
      } else {
        throw new Error(json.error || "Failed to broadcast SOS.");
      }
    } catch (err) {
      console.error("SOS broadcast error:", err.message);
      alert(`SOS Alert encountered an issue: ${err.message}. Please dial 112 immediately!`);
    } finally {
      setIsBroadcasting(false);
    }
  }, [selectedType, coords, note, userEmail, userName]);

  // Start 3-second countdown before broadcasting
  const startCountdown = () => {
    setCountdown(3);
    let count = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        executeSosBroadcast();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  // Resolve active SOS
  const handleResolveSos = async () => {
    if (!activeSos?.incidentId) return;
    setIsResolving(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";
      await fetch("/api/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          id: activeSos.incidentId,
          status: "RESOLVED",
        }),
      });
      stopSiren();
      setActiveSos(null);
      handleClose();
    } catch (e) {
      console.error("Failed to resolve SOS:", e.message);
    } finally {
      setIsResolving(false);
    }
  };

  // WhatsApp location share URL
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🚨 EMERGENCY SOS ALERT!\nI need immediate help for a ${selectedType} emergency!\nMy Current Location: https://maps.google.com/?q=${
      coords?.lat || 20.2961
    },${coords?.lng || 85.8245}\nDispatched via Tinggle Emergency Network.`
  )}`;

  return (
    <>
      {/* ── Persistent Floating SOS Panic Button (Bottom-Right) ─────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Trigger Emergency SOS Panic Beacon"
        className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono font-black text-sm tracking-wider shadow-2xl shadow-red-600/60 border-2 border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
      >
        <div className="relative flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
        </div>
        <span className="font-extrabold uppercase">SOS HELP</span>
      </button>

      {/* ── Emergency SOS Modal Overlay ─────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0e1422] border-2 border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-red-950/80 flex flex-col gap-5 overflow-hidden">
            {/* Top red alert stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <AlertOctagon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white font-heading tracking-wide uppercase flex items-center gap-2">
                    <span>CIVIC EMERGENCY SOS</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    Instant authority dispatch & nearby eyewitness broadcast
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── ACTIVE SOS STATE (Once dispatched) ─────────────────────── */}
            {activeSos ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 flex flex-col gap-2 text-center items-center">
                  <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-xl font-bold animate-pulse shadow-lg shadow-red-500/50">
                    🚨
                  </div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    EMERGENCY BEACON ACTIVE
                  </h3>
                  <p className="text-xs text-red-300 font-mono">
                    Incident ID: <span className="font-bold">{activeSos.incidentId}</span> · Dispatched to Command HQ & Local Eyewitnesses
                  </p>
                </div>

                {/* GPS Location Details */}
                <div className="p-3 bg-[#151c2e] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono text-zinc-300">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{activeSos.location}</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${activeSos.latitude || 20.2961},${activeSos.longitude || 85.8245}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline shrink-0 ml-2"
                  >
                    Maps ↗
                  </a>
                </div>

                {/* Speed Dials */}
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="tel:112"
                    className="p-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>DIAL 112 (POLICE/GEN)</span>
                  </a>
                  <a
                    href="tel:108"
                    className="p-3 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Ambulance className="w-4 h-4" />
                    <span>DIAL 108 (AMBULANCE)</span>
                  </a>
                </div>

                {/* WhatsApp Location Share & Siren */}
                <div className="flex items-center gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Location on WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={toggleSiren}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                      sirenPlaying
                        ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
                    }`}
                  >
                    {sirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{sirenPlaying ? "SILENCE SIREN" : "PLAY SIREN"}</span>
                  </button>
                </div>

                {/* Resolve SOS */}
                <button
                  type="button"
                  onClick={handleResolveSos}
                  disabled={isResolving}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isResolving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>I AM SAFE NOW (RESOLVE & CLOSE SOS)</span>
                </button>
              </div>
            ) : countdown !== null ? (
              /* ── 3-SECOND COUNTDOWN STATE ─────────────────────────────── */
              <div className="flex flex-col items-center justify-center py-6 gap-5 text-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                  <div className="w-24 h-24 rounded-full bg-red-600 text-white font-mono font-black text-4xl flex items-center justify-center shadow-xl shadow-red-600/60">
                    {countdown}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    BROADCASTING {selectedType.toUpperCase()} SOS...
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Press Cancel below if this was an accidental tap.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={cancelCountdown}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold rounded-xl border border-white/10 transition-colors"
                  >
                    CANCEL (STOP SOS)
                  </button>
                  <button
                    type="button"
                    onClick={executeSosBroadcast}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    DISPATCH NOW (0s)
                  </button>
                </div>
              </div>
            ) : (
              /* ── SELECT CATEGORY & TRIGGER STATE ──────────────────────── */
              <div className="flex flex-col gap-4">
                {/* 4 Emergency Quick-Picks */}
                <div className="grid grid-cols-2 gap-2.5">
                  {EMERGENCY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-500/20 border-red-500 shadow-md shadow-red-950"
                            : "bg-[#141b2a] hover:bg-[#1a2336] border-white/10 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="w-5 h-5 text-red-400" />
                          <span className="text-[10px] font-mono text-zinc-500">
                            {type.dialNumber}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white font-heading">
                          {type.label}
                        </span>
                        <span className="text-[11px] text-zinc-400 leading-tight">
                          {type.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Note / Details */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional details (e.g. 2nd floor, bleeding, armed)..."
                  className="w-full bg-[#141b2a] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-red-500/60 font-mono"
                />

                {/* GPS Status Indicator */}
                <div className="flex items-center justify-between p-2.5 bg-[#0a0f1d] border border-white/5 rounded-xl text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {locating
                        ? "Acquiring live GPS beacon..."
                        : coords
                        ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${coords.accuracy}m)`
                        : "Location access pending"}
                    </span>
                  </div>
                  {coords && <span className="text-emerald-400">● LOCKED</span>}
                </div>

                {/* Audio Siren Toggle & Hotline Row */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={toggleSiren}
                    className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                      sirenPlaying
                        ? "bg-amber-500 text-black border-amber-400 animate-pulse"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
                    }`}
                  >
                    {sirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{sirenPlaying ? "STOP SIREN" : "TEST SIREN BEACON"}</span>
                  </button>

                  <a
                    href="tel:112"
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                    <span>CALL 112</span>
                  </a>
                </div>

                {/* Main SOS Trigger Button */}
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={isBroadcasting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-mono font-black text-sm tracking-widest shadow-xl shadow-red-600/40 border border-red-400/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                  <span>START EMERGENCY SOS BROADCAST</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
