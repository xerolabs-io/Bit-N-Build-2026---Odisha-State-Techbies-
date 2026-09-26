import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { incidentId } = body;

    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required to mark SOS resolved." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("incidents")
      .update({
        status: "RESOLVED",
        trust_score: "RESOLVED BY CALLER · CITIZEN SAFE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", incidentId)
      .select("*")
      .single();

    if (error) {
      console.error("❌ SOS resolve DB error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("🛡️ SOS MARKED RESOLVED BY CALLER:", incidentId);
    return NextResponse.json({
      success: true,
      message: "SOS alert resolved. Normal public broadcast retracted, archived in Admin Ledger.",
      data,
    });
  } catch (err) {
    console.error("❌ /api/sos/resolve error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
