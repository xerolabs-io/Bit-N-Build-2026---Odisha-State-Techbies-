import React from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShieldCheck, UserCheck, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const user = await currentUser();

  return (
    <div className="min-h-screen bg-[#0d131e] text-zinc-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-heading text-white">
                Admin Dispatch & Triage Console
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Protected Route · Authenticated Session Required
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Portal
          </Link>
        </div>

        <div className="bg-[#141b2a] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-300">
              Authenticated Admin:{" "}
              <strong className="text-white font-mono">
                {user?.primaryEmailAddress?.emailAddress || user?.fullName || "Operator"}
              </strong>
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Welcome to the Tinggle administrative dispatch layer. This route is guarded by both Next.js edge proxy middleware and server-side Clerk authentication checks.
          </p>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All systems nominal. Community triage protocol active.</span>
          </div>
        </div>
      </div>
    </div>
  );
}