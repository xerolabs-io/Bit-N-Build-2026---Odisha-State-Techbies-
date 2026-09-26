"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
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
                <div className="flex-1 max-w-md mx-2 sm:mx-6">
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

                {/* Right Section: Notification Icon & Clerk UserButton */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                            />
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