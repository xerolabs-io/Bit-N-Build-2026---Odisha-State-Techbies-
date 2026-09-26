import React from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";
import { findUserByEmail } from "@/lib/users.lib";
import { AdminDashboardClient } from "@/components/admin-command";

export const metadata = {
  title: "Admin Command — Emergency Operations Terminal | Daily Bugle",
  description: "Secure admin dispatch terminal for real-time emergency operations monitoring.",
};

export default async function AdminCommandPage() {
  const { userId } = await auth();

  // If visitor is unauthenticated, trigger default Next.js 404 (stealth mode)
  if (!userId) {
    notFound();
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    notFound();
  }

  // Verify against Supabase users table
  const dbUser = await findUserByEmail(email);

  // If user does not exist in DB or is not an admin, trigger default Next.js 404
  if (!dbUser || !dbUser.is_admin) {
    notFound();
  }

  const operatorName =
    user?.fullName || dbUser.display_name || email || "Operator";

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#0d131e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">

      {/* Top Nav Strip with Increased Typography Size */}
      <div className="shrink-0 z-40 w-full bg-[#080e19]/95 border-b border-white/10 px-4 md:px-8 py-2.5 flex items-center justify-between backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <Terminal className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-mono text-sm md:text-base font-extrabold text-amber-400 tracking-wider uppercase">
            HEADQUATORS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs md:text-sm text-zinc-300 hidden md:block">
            Operator: <span className="text-white font-bold">{operatorName}</span>
          </span>
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-100 hover:text-white text-xs md:text-sm font-mono font-semibold transition-all border border-white/10 shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>
        </div>
      </div>

      {/* Main Admin Operations Dashboard fed with live real-time DB data */}
      <AdminDashboardClient operatorName={operatorName} />

      {/* Compact Bottom Footer Section (Zero Scrollbar) */}
      <footer className="shrink-0 border-t justify-center border-white/10 px-4 md:px-8 py-2 flex flex-col sm:flex-row items-center font-mono text-xs text-zinc-400 gap-3 bg-[#080e19]">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <span>DISPATCH BANDWIDTH: <strong className="text-teal-400 font-bold">98.4%</strong></span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span>ENCRYPTION: <strong className="text-amber-400 font-bold">AES-256 GCM</strong></span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span>LEDGER: <strong className="text-sky-400 font-bold">SUPABASE REALTIME</strong></span>
        </div>
      </footer>
    </div>
  );
}
