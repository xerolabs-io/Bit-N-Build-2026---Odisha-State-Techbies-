import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      emergencyType = "General",
      latitude,
      longitude,
      locationText,
      details,
      reporterEmail,
      reporterName,
    } = body;

    // Generate unique SOS incident ID
    const incidentId = `SOS-${Math.floor(10000 + Math.random() * 90000)}`;

    let category = "Other";
    let typeEmoji = "🚨";
    if (emergencyType === "Medical") {
      category = "Medical";
      typeEmoji = "🚑";
    } else if (emergencyType === "Fire") {
      category = "Fire";
      typeEmoji = "🔥";
    } else if (emergencyType === "Crime") {
      category = "Crime";
      typeEmoji = "🚨";
    } else if (emergencyType === "Disaster") {
      category = "Flood";
      typeEmoji = "🌊";
    }

    const title = `${typeEmoji} SOS EMERGENCY: ${emergencyType.toUpperCase()} ALERT`;
    const description = `CRITICAL CITIZEN SOS TRIGGERED by ${
      reporterName || reporterEmail || "Citizen"
    }. Immediate emergency response required at coordinates (${latitude || "Unknown"}, ${
      longitude || "Unknown"
    }). ${details || "Emergency panic beacon triggered. Dispatching local authorities and nearby eyewitnesses."}`;

    const location_text =
      locationText ||
      (latitude && longitude
        ? `GPS Beacon: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        : "Location coordinates broadcasting...");

    // Insert SOS incident into Supabase
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        id: incidentId,
        title,
        description,
        category,
        status: "CRITICAL SOS · IMMEDIATE DISPATCH",
        location_text,
        latitude: latitude || null,
        longitude: longitude || null,
        confirm_count: 1,
        dispute_count: 0,
        trust_score: "100% (CRITICAL SOS BEACON)",
        reporter_email: reporterEmail || null,
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ SOS broadcast insert error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("🚨 SOS EMERGENCY BROADCAST ACTIVATED:", incidentId);

    return NextResponse.json({
      success: true,
      message: "SOS Emergency Alert actively broadcasting to authorities and nearby citizens.",
      data: {
        incidentId: data.id,
        status: data.status,
        emergencyType,
        location: location_text,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        url: `/incident/${data.id}`,
      },
    });
  } catch (err) {
    console.error("❌ /api/sos/broadcast error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
