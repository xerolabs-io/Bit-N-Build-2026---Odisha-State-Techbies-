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
      contactPhone,
      details,
      reporterEmail,
      reporterName,
    } = body;

    // Validate phone number (must be at least 10 digits)
    const digits = String(contactPhone || "").replace(/[^\d+]/g, "");
    if (!digits || digits.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid phone number (at least 10 digits) is required for emergency SOS dispatch.",
        },
        { status: 400 }
      );
    }

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
    const callerContactStr = `[EMERGENCY CALLER CONTACT: ${digits}]`;
    const description = `${callerContactStr} CRITICAL CITIZEN SOS TRIGGERED by ${
      reporterName || reporterEmail || "Citizen"
    }. Immediate emergency response required at coordinates (${latitude || "Unknown"}, ${
      longitude || "Unknown"
    }). ${details || "Emergency panic beacon triggered. Dispatching local authorities and nearby eyewitnesses."}`;

    const location_text =
      locationText ||
      (latitude && longitude
        ? `GPS Beacon: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        : "Location coordinates broadcasting...");

    const basePayload = {
      id: incidentId,
      title,
      description,
      category,
      status: "CRITICAL SOS · PENDING DISPATCH",
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
    };

    // Try inserting with contact_phone column first
    let insertedData = null;
    const { data: withPhone, error: phoneErr } = await supabase
      .from("incidents")
      .insert({ ...basePayload, contact_phone: digits })
      .select("*")
      .single();

    if (!phoneErr) {
      insertedData = withPhone;
    } else {
      // Fallback: column might not exist yet in schema cache, insert basePayload
      const { data: withoutPhone, error: baseErr } = await supabase
        .from("incidents")
        .insert(basePayload)
        .select("*")
        .single();

      if (baseErr) {
        console.error("❌ SOS broadcast insert error:", baseErr.message);
        return NextResponse.json(
          { success: false, error: baseErr.message },
          { status: 500 }
        );
      }
      insertedData = withoutPhone;
    }

    console.log("🚨 SOS EMERGENCY BROADCAST ACTIVATED:", incidentId, "Caller:", digits);

    return NextResponse.json({
      success: true,
      message: "SOS Emergency Alert actively broadcasting to authorities and nearby citizens.",
      data: {
        incidentId: insertedData.id,
        status: insertedData.status,
        emergencyType,
        contactPhone: digits,
        location: location_text,
        latitude: insertedData.latitude,
        longitude: insertedData.longitude,
        createdAt: insertedData.created_at,
        url: `/incident/${insertedData.id}`,
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
