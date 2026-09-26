import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Incident not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("GET /api/incidents/[id] error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
