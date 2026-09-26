"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserButton, SignInButton, Show, useUser } from "@clerk/nextjs";
import { Bell, Search, ShieldAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
    const { user, isSignedIn, isLoaded } = useUser();
    const [isAdmin, setIsAdmin] = useState(false);

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

                {/* Center Section: Minimal Search Box */}
                <div className="hidden sm:flex flex-1 max-w-md mx-2 sm:mx-6">
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 focus:border-zinc-400/50 rounded-full py-1.5 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all duration-200"
                        />
                        {/* <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/10 rounded border border-white/10 pointer-events-none">
              ⌘K
            </kbd> */}
                    </div>
                </div>

                {/* Right Section: Admin Button, Notification Icon & Clerk UserButton */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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