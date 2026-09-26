"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
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
  Phone,
  ShieldCheck,
  Check,
  Edit2,
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
  const { user, isLoaded } = useUser();
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

  // Phone verification state
  const [savedPhone, setSavedPhone] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [helpEnRoute, setHelpEnRoute] = useState(false);
  const [dispatchedUnit, setDispatchedUnit] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  const countdownTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const statusPollRef = useRef(null);

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  const userName = user?.fullName || user?.username || "Citizen";

  // Fetch saved phone number if logged in
  const fetchUserPhone = useCallback(async () => {
    if (!user || !userEmail) return;
    try {
      const res = await fetch(`/api/user/phone?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.phone) {
          setSavedPhone(json.phone);
          setPhoneInput(json.phone);
        }
      }
    } catch (e) {
      console.warn("Could not fetch user phone:", e.message);
    }
  }, [user, userEmail]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserPhone();
    }
  }, [isLoaded, user, fetchUserPhone]);

  // Check if current user is an Admin
  useEffect(() => {
    let isMounted = true;
    async function checkAdmin() {
      if (!userEmail) {
        if (isMounted) setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setIsAdmin(Boolean(json?.data?.is_admin));
          }
        }
      } catch (e) {
        if (isMounted) setIsAdmin(false);
      }
    }
    if (userEmail) {
      checkAdmin();
    }
    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  // Listen for global custom event from Header button or external triggers
  useEffect(() => {
    const handleOpen = () => {
      if (isAdmin) return; // Do not open for admin
      setIsOpen(true);
      fetchUserPhone();
    };
    window.addEventListener("tinggle:open-sos", handleOpen);
    return () => window.removeEventListener("tinggle:open-sos", handleOpen);
  }, [fetchUserPhone, isAdmin]);

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

  // Poll incident status when active SOS is broadcasting to detect when admin dispatches help
  useEffect(() => {
    if (!activeSos?.incidentId) {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/incidents/${activeSos.incidentId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          const s = String(json.data.status || "").toUpperCase();
          if (s.includes("EN ROUTE") || s.includes("DISPATCHED") || s.includes("HELP")) {
            setHelpEnRoute(true);
            setDispatchedUnit(json.data.trust_score || "Emergency Response Squad");
          }
        }
      } catch (err) {
        console.warn("Status poll error:", err.message);
      }
    };

    statusPollRef.current = setInterval(checkStatus, 3500);
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [activeSos?.incidentId]);

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
  const executeSosBroadcast = useCallback(async (phoneToUse) => {
    setIsBroadcasting(true);
    setCountdown(null);
    try {
      const finalPhone = phoneToUse || phoneInput || savedPhone;

      const res = await fetch("/api/sos/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyType: selectedType,
          contactPhone: finalPhone,
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
  }, [selectedType, coords, note, userEmail, userName, phoneInput, savedPhone]);

  // Validate phone and initiate SOS trigger
  const handleTriggerSos = async () => {
    setPhoneError("");
    const cleanDigits = phoneInput.replace(/[^\d+]/g, "");

    // Must have at least 10 digits
    if (!cleanDigits || cleanDigits.replace(/[^\d]/g, "").length < 10) {
      setPhoneError("Please enter a valid 10-digit emergency contact phone number.");
      return;
    }

    // If logged in and phone wasn't saved or changed, save to profile
    if (user && userEmail && cleanDigits !== savedPhone) {
      setIsSavingPhone(true);
      try {
        await fetch("/api/user/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, phone: cleanDigits }),
        });
        setSavedPhone(cleanDigits);
      } catch (err) {
        console.warn("Could not save phone to profile:", err.message);
      } finally {
        setIsSavingPhone(false);
      }
    }

    startCountdown(cleanDigits);
  };

  // Start 3-second countdown before broadcasting
  const startCountdown = (phone) => {
    setCountdown(3);
    let count = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        executeSosBroadcast(phone);
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

  // Resolve active SOS (Citizen confirms they are safe)
  const handleResolveSos = async () => {
    if (!activeSos?.incidentId) return;
    setIsResolving(true);
    try {
      const res = await fetch("/api/sos/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: activeSos.incidentId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to resolve SOS");
      }

      stopSiren();
      setActiveSos(null);
      setHelpEnRoute(false);
      setDispatchedUnit(null);
      handleClose();
      alert("✅ SOS Marked Resolved! Normal public broadcast removed. Glad you are safe!");
    } catch (e) {
      console.error("Failed to resolve SOS:", e.message);
      alert(`Could not resolve SOS: ${e.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  // WhatsApp location share URL
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🚨 EMERGENCY SOS ALERT!\nI need immediate help for a ${selectedType} emergency!\nMy Current Location: https://maps.google.com/?q=${
      coords?.lat || 20.2961
    },${coords?.lng || 85.8245}\nCaller Phone: ${phoneInput || savedPhone}\nDispatched via Tinggle Emergency Network.`
  )}`;

  return (
    <>
      {/* ── Persistent Floating SOS Panic Button (Bottom-Right) ─────────── */}
      {!pathname?.startsWith("/admin") && (
        <button
          type="button"
          disabled={isAdmin}
          onClick={() => {
            if (isAdmin) return;
            setIsOpen(true);
            fetchUserPhone();
          }}
          title={
            isAdmin
              ? "Emergency SOS Panic Beacon is disabled for Admin accounts"
              : "Trigger Emergency SOS Panic Beacon"
          }
          className={`fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-5 py-3.5 rounded-full font-mono font-black text-sm tracking-wider border-2 transition-all ${
            isAdmin
              ? "bg-zinc-800/90 text-zinc-500 border-zinc-700 cursor-not-allowed opacity-60 shadow-none"
              : "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl shadow-red-600/60 border-white/20 hover:scale-105 active:scale-95 cursor-pointer group"
          }`}
        >
          <div className="relative flex items-center justify-center">
            {!isAdmin && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            )}
            <AlertOctagon
              className={`w-5 h-5 ${isAdmin ? "text-zinc-500" : "text-white animate-pulse"}`}
            />
          </div>
          <span className="font-extrabold uppercase">
            {isAdmin ? "SOS HELP (DISABLED)" : "SOS HELP"}
          </span>
        </button>
      )}

      {/* ── Emergency SOS Modal Overlay ─────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0e1422] border-2 border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-red-950/80 flex flex-col gap-5 overflow-hidden max-h-[92vh] overflow-y-auto">
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
                    Priority #1 authority dispatch &amp; nearby eyewitness beacon
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
                {/* Dynamic Status Banner: Pending vs Help En Route */}
                {helpEnRoute ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/60 flex flex-col gap-2 text-center items-center shadow-lg shadow-emerald-950/50">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold animate-bounce shadow-lg shadow-emerald-500/50">
                      🚑
                    </div>
                    <h3 className="text-lg font-black text-white font-heading tracking-wide uppercase text-emerald-300">
                      HELP IS ARRIVING · EN ROUTE!
                    </h3>
                    <p className="text-xs text-emerald-200 font-mono">
                      Admin Command HQ has dispatched: <strong className="text-white underline">{dispatchedUnit || "Emergency Squad"}</strong>. Stay in a safe position!
                    </p>
                    <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full mt-1">
                      DISPATCH TELEMETRY ACTIVE
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 flex flex-col gap-2 text-center items-center">
                    <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-xl font-bold animate-pulse shadow-lg shadow-red-500/50">
                      🚨
                    </div>
                    <h3 className="text-lg font-bold text-white font-heading">
                      EMERGENCY BEACON ACTIVE (PRIORITY #1)
                    </h3>
                    <p className="text-xs text-red-300 font-mono">
                      Incident ID: <span className="font-bold">{activeSos.incidentId}</span> · Transmitted to Admin Command HQ &amp; Nearby Citizens
                    </p>
                    <p className="text-[11px] text-amber-300 font-mono animate-pulse">
                      ⏳ Awaiting emergency squad assignment from Admin...
                    </p>
                  </div>
                )}

                {/* Caller Phone & GPS Details */}
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-[#151c2e] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono text-zinc-300">
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Contact: <strong className="text-white">{activeSos.contactPhone}</strong></span>
                    </div>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      VERIFIED PHONE
                    </span>
                  </div>

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

                {/* Resolve SOS Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResolveSos}
                    disabled={isResolving}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl border border-emerald-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950"
                  >
                    {isResolving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                    <span>I AM SAFE NOW (MARK RESOLVED &amp; CLOSE SOS)</span>
                  </button>
                  <p className="text-[10px] text-zinc-400 font-mono text-center mt-1.5">
                    Clicking removes the alert from public view. Archived in Admin records.
                  </p>
                </div>
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
                    Contact: <strong className="text-emerald-400">{phoneInput || savedPhone}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-1">
                    Press Cancel below if this was an accidental tap.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={cancelCountdown}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    CANCEL (STOP SOS)
                  </button>
                  <button
                    type="button"
                    onClick={() => executeSosBroadcast(phoneInput || savedPhone)}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
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

                {/* ── REQUIRED PHONE NUMBER INPUT / VERIFIED CARD ──────────── */}
                <div className="p-3.5 rounded-2xl bg-[#141b2a] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>EMERGENCY CONTACT PHONE</span>
                      <span className="text-red-400 font-bold">*</span>
                    </span>

                    {savedPhone && !isEditingPhone && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="text-[11px] font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                    )}
                  </div>

                  {savedPhone && !isEditingPhone ? (
                    <div className="flex items-center justify-between bg-[#0e1422] p-2.5 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {savedPhone}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                        VERIFIED PROFILE PHONE
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => {
                            setPhoneInput(e.target.value);
                            setPhoneError("");
                          }}
                          placeholder="Enter 10-digit mobile number..."
                          className="flex-1 bg-[#0e1422] border border-white/15 focus:border-red-500 rounded-xl px-3 py-2 text-xs md:text-sm text-white font-mono placeholder:text-zinc-500 outline-none transition-colors"
                        />
                        {isEditingPhone && (
                          <button
                            type="button"
                            onClick={() => setIsEditingPhone(false)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 rounded-xl border border-white/10 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {user
                          ? "This phone will be saved to your profile and provided to Admin dispatchers."
                          : "Required so emergency dispatchers can contact you immediately."}
                      </p>
                    </div>
                  )}

                  {phoneError && (
                    <p className="text-xs font-mono text-red-400 flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  )}
                </div>

                {/* Optional Note / Details */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional details (e.g. 2nd floor, bleeding, trapped)..."
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
                    className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                  onClick={handleTriggerSos}
                  disabled={isBroadcasting || isSavingPhone}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-mono font-black text-sm tracking-widest shadow-xl shadow-red-600/40 border border-red-400/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                  <span>
                    {isBroadcasting
                      ? "BROADCASTING SOS BEACON..."
                      : "START EMERGENCY SOS BROADCAST"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
