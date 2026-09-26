import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";
import { validateSosSecurityPayload } from "@/lib/phone-validation.lib";

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
      deviceFingerprint,
      honeypot, // Invisible bot trap field
    } = body;

    // Extract client IP for anti-flood rate limiter
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // ── 1. Comprehensive Anti-Spam, Rate-Limit & Phone Security Shield ────────
    const securityCheck = validateSosSecurityPayload({
      contactPhone,
      latitude,
      longitude,
      clientIp,
      deviceFingerprint: deviceFingerprint || "device-session",
      honeypot,
    });

    if (!securityCheck.isAllowed) {
      const statusCode = securityCheck.shieldStatus === "RATE_LIMITED" ? 429 : 400;
      return NextResponse.json(
        {
          success: false,
          error: securityCheck.error,
          shieldStatus: securityCheck.shieldStatus,
          remainingSeconds: securityCheck.remainingSeconds,
        },
        { status: statusCode }
      );
    }

    const cleanPhone = securityCheck.cleanPhone;
    const isAnonymous = !reporterEmail || reporterEmail.includes("anonymous");

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
    const callerContactStr = `[EMERGENCY CALLER CONTACT: ${cleanPhone}]`;
    const authenticityTag = `[SHIELD: TELEMETRY VERIFIED · ANTI-SPAM PASSED]`;
    const description = `${callerContactStr} ${authenticityTag} CRITICAL CITIZEN SOS TRIGGERED by ${
      reporterName || (isAnonymous ? "Anonymous Citizen (Phone Verified)" : reporterEmail)
    }. Immediate emergency response required at coordinates (${latitude || "Unknown"}, ${
      longitude || "Unknown"
    }). ${details || "Emergency panic beacon triggered. Dispatching local authorities and nearby eyewitnesses."}`;

    const location_text =
      locationText ||
      (latitude && longitude
        ? `GPS Beacon: ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
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
      trust_score: isAnonymous
        ? "100% (ANONYMOUS SOS BEACON · SHIELD VERIFIED)"
        : "100% (VERIFIED CITIZEN SOS BEACON)",
      reporter_email: reporterEmail || (isAnonymous ? `anon-${incidentId.toLowerCase()}@tinggle.network` : null),
      is_anonymous: isAnonymous,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try inserting with contact_phone column first
    let insertedData = null;
    const { data: withPhone, error: phoneErr } = await supabase
      .from("incidents")
      .insert({ ...basePayload, contact_phone: cleanPhone })
      .select("*")
      .single();

    if (!phoneErr) {
      insertedData = withPhone;
    } else {
      // Fallback: insert basePayload
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

    console.log(
      `🚨 [SOS SECURITY CLEARED] Broadcast ${incidentId} activated from ${clientIp}. Caller: ${cleanPhone} (Anonymous: ${isAnonymous})`
    );

    return NextResponse.json({
      success: true,
      message: "SOS Emergency Alert actively broadcasting to authorities and nearby citizens.",
      data: {
        incidentId: insertedData.id,
        status: insertedData.status,
        emergencyType,
        contactPhone: cleanPhone,
        location: location_text,
        latitude: insertedData.latitude,
        longitude: insertedData.longitude,
        createdAt: insertedData.created_at,
        url: `/incident/${insertedData.id}`,
        shieldStatus: "SHIELD_VERIFIED",
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
