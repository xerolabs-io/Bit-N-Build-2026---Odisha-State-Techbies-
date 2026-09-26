"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, SignInButton, Show, useUser } from "@clerk/nextjs";
import {
  Bell,
  Search,
  ShieldAlert,
  User,
  AlertOctagon,
  X,
  Loader2,
  Ambulance,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchContainerRef = useRef(null);
    const allIncidentsRef = useRef(null);

    // Fetch all incidents once for fast fuzzy suggestions
    const fetchIncidentsForSearch = useCallback(async () => {
        if (allIncidentsRef.current) return allIncidentsRef.current;
        try {
            const res = await fetch("/api/incidents?limit=100");
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    allIncidentsRef.current = json.data;
                    return json.data;
                }
            }
        } catch (e) {
            console.warn("Could not prefetch incidents for search:", e.message);
        }
        return [];
    }, []);

    // Filter suggestions as user types
    useEffect(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        let isCurrent = true;
        setIsSearching(true);
        const timer = setTimeout(async () => {
            const list = await fetchIncidentsForSearch();
            if (!isCurrent) return;

            const filtered = list.filter((item) => {
                const title = (item.title || "").toLowerCase();
                const desc = (item.description || "").toLowerCase();
                const cat = (item.category || "").toLowerCase();
                const loc = (item.location_text || "").toLowerCase();
                const id = (item.id || "").toLowerCase();
                return (
                    title.includes(q) ||
                    desc.includes(q) ||
                    cat.includes(q) ||
                    loc.includes(q) ||
                    id.includes(q)
                );
            });

            setSuggestions(filtered.slice(0, 5));
            setShowDropdown(true);
            setIsSearching(false);
        }, 180);

        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [searchQuery, fetchIncidentsForSearch]);

    // Click outside to dismiss suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setShowDropdown(false);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    const handleSelectSuggestion = (incidentId) => {
        setShowDropdown(false);
        setSearchQuery("");
        router.push(`/incident/${incidentId}`);
    };

    useEffect(() => {
        let isMounted = true;

        async function fetchAdminStatus() {
            if (!isSignedIn || !user) {
                if (isMounted) setIsAdmin(false);
                return;
            }

            const email =
                user.primaryEmailAddress?.emailAddress ||
                user.emailAddresses?.[0]?.emailAddress;

            if (!email) {
                if (isMounted) setIsAdmin(false);
                return;
            }

            try {
                const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (isMounted) {
                        setIsAdmin(Boolean(json?.data?.is_admin));
                    }
                } else {
                    if (isMounted) setIsAdmin(false);
                }
            } catch (err) {
                console.error("Error fetching admin status:", err);
                if (isMounted) setIsAdmin(false);
            }
        }

        if (isLoaded) {
            fetchAdminStatus();
        }
    }, [isLoaded, isSignedIn, user]);
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 px-4 md:px-8 py-3 text-white backdrop-blur-md" style={{ background: "linear-gradient(135deg, #000000 0%, #111111 30%, #1a1a1a 60%, #0d131e 100%)" }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                {/* Left Section: Logo */}
                <div className="flex items-center shrink-0">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image
                            src="/logo.svg"
                            alt="Logo"
                            width={140}
                            height={42}
                            className="h-9 w-auto object-contain transition-opacity group-hover:opacity-90"
                            priority
                        />
                    </Link>
                </div>

                {/* Center Section: Interactive Search Box with Auto-complete */}
                <div ref={searchContainerRef} className="flex-1 max-w-md mx-2 sm:mx-6 relative">
                    <form onSubmit={handleSearchSubmit} className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (searchQuery.trim() && suggestions.length > 0) {
                                    setShowDropdown(true);
                                }
                            }}
                            placeholder="Search incidents, categories, locations..."
                            className="w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 focus:border-amber-400/60 rounded-full py-1.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all duration-200"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setShowDropdown(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                                title="Clear"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </form>

                    {/* Auto-complete Suggestions Dropdown */}
                    {showDropdown && searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e1422] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="p-2 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-3">
                                <span>SUGGESTED INCIDENTS</span>
                                {isSearching ? (
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Searching...</span>
                                    </span>
                                ) : (
                                    <span>{suggestions.length} match{suggestions.length !== 1 ? "es" : ""}</span>
                                )}
                            </div>

                            {suggestions.length > 0 ? (
                                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                                    {suggestions.map((item) => {
                                        const isDispatched =
                                            String(item.status || "").toUpperCase().includes("DISPATCH") ||
                                            String(item.status || "").toUpperCase().includes("EN ROUTE");
                                        const isResolved =
                                            String(item.status || "").toUpperCase().includes("RESOLVED") ||
                                            String(item.status || "").toUpperCase().includes("CONTAINED");
                                        const isHoax =
                                            String(item.status || "").toUpperCase().includes("FAKE") ||
                                            String(item.status || "").toUpperCase().includes("HOAX") ||
                                            String(item.status || "").toUpperCase().includes("DISINFORMATION");

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(item.id)}
                                                className="w-full text-left p-3 hover:bg-white/5 transition-colors flex items-start gap-3 cursor-pointer group"
                                            >
                                                <div className="p-2 rounded-xl bg-white/5 text-zinc-300 group-hover:text-amber-400 shrink-0 mt-0.5">
                                                    {isDispatched ? (
                                                        <Ambulance className="w-4 h-4 text-emerald-400 animate-pulse" />
                                                    ) : isHoax ? (
                                                        <ShieldAlert className="w-4 h-4 text-red-400" />
                                                    ) : (
                                                        <Search className="w-4 h-4" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            {item.category || "Alert"}
                                                        </span>
                                                        {isDispatched && (
                                                            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                                                🚑 HELP DISPATCHED
                                                            </span>
                                                        )}
                                                        {isResolved && (
                                                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                                ✓ RESOLVED
                                                            </span>
                                                        )}
                                                        {isHoax && (
                                                            <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                                                FLAGGED HOAX
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate mt-1">
                                                        {item.title}
                                                    </h4>

                                                    {item.location_text && (
                                                        <p className="text-[11px] text-zinc-400 font-mono truncate flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3 shrink-0 text-zinc-500" />
                                                            <span>{item.location_text}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : !isSearching ? (
                                <div className="p-4 text-center text-xs text-zinc-400 font-mono">
                                    No live incidents matching &quot;{searchQuery}&quot;
                                </div>
                            ) : null}

                            {/* View All Search Results Footer */}
                            <button
                                type="button"
                                onClick={handleSearchSubmit}
                                className="w-full p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border-t border-white/5 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <span>See all results for &quot;{searchQuery}&quot;</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Section: SOS Button, Admin Button, Notification Icon & Clerk UserButton */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Emergency SOS Button */}
                    <button
                        type="button"
                        id="header-sos-btn"
                        disabled={isAdmin}
                        onClick={() => {
                            if (isAdmin) return;
                            if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("tinggle:open-sos"));
                            }
                        }}
                        className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-black tracking-wider transition-all border ${
                            isAdmin
                                ? "bg-zinc-800/80 text-zinc-500 border-zinc-700/60 cursor-not-allowed opacity-60 shadow-none"
                                : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/60 hover:scale-105 active:scale-95 border-red-400/50 cursor-pointer animate-pulse"
                        }`}
                        title={isAdmin ? "Emergency SOS is disabled for Admin accounts" : "Trigger Emergency SOS Panic Alert"}
                    >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>SOS HELP</span>
                        {isAdmin && <span className="text-[10px] text-zinc-400 font-normal font-sans">(Disabled)</span>}
                    </button>

                    {/* Admin Dashboard Button - visible only to verified Admins */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            id="header-admin-btn"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 hover:from-amber-500/30 hover:via-orange-500/30 hover:to-red-500/30 text-amber-300 hover:text-amber-100 border border-amber-500/40 text-xs font-bold tracking-wide transition-all shadow-md shadow-amber-950/30 hover:scale-105 active:scale-95 group"
                        >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors animate-pulse" />
                            <span>Admin</span>
                        </Link>
                    )}

                    {/* Notification Button */}
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="relative p-2 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer"
                    >
                        <Bell className="w-5 h-5" />
                        {/* Notification Badge Dot */}
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-black" />
                    </button>

                    {/* User Button from Clerk */}
                    <div className="flex items-center">
                        <Show when="signed-in">
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8 rounded-full ring-1 ring-white/20",
                                    },
                                }}
                            >
                                <UserButton.MenuItems>
                                    <UserButton.Link
                                        label="Citizen Profile"
                                        labelIcon={<User className="w-4 h-4 text-amber-400" />}
                                        href="/profile"
                                    />
                                    {isAdmin && (
                                        <UserButton.Link
                                            label="Admin Command"
                                            labelIcon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
                                            href="/admin"
                                        />
                                    )}
                                </UserButton.MenuItems>
                            </UserButton>
                        </Show>
                        <Show when="signed-out">
                            <SignInButton mode="modal">
                                <Button
                                    variant="primary"
                                    className="rounded-full px-5 py-2 text-xs font-bold tracking-wide shadow-md shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5">
                                    Sign In
                                </Button>
                            </SignInButton>
                        </Show>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;