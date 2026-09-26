import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import supabase from "@/lib/db.lib";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase fetch error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error("❌ /api/incidents GET error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    // 1. Auth check
    const isValid = await validateApiKey(req);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing API key." },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      category,
      location_text,
      latitude,
      longitude,
      image_url,
      is_anonymous,
      reporter_email,
    } = body;

    // 2. Strict Auth Check: Must be submitted by an authenticated reporter
    if (!reporter_email || typeof reporter_email !== "string" || !reporter_email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You must be signed in with a valid account to submit an incident report.",
        },
        { status: 401 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Incident title is required." },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { success: false, error: "Incident category is required." },
        { status: 400 }
      );
    }

    // 3. Generate unique ID
    const incidentId = `INC-${Math.floor(10000 + Math.random() * 90000)}`;

    // 4. Upsert into Supabase
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        id: incidentId,
        title: title.trim(),
        description: description?.trim() || `Citizen-reported ${category} incident. Community verifications initiated.`,
        category: category.trim(),
        status: "PENDING CIVIC CONFIRMATION",
        location_text: location_text || null,
        latitude: latitude || null,
        longitude: longitude || null,
        image_url: image_url || null,
        is_anonymous: Boolean(is_anonymous),
        reporter_email: is_anonymous ? null : (reporter_email || null),
        confirm_count: 1,
        dispute_count: 0,
        trust_score: "COMMUNITY TRUST: VERIFYING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Incident saved:", data.id);
    return NextResponse.json(
      { success: true, message: "Incident reported successfully.", data },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ /api/incidents POST error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, trust_score, confirm_count, dispute_count } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required." },
        { status: 400 }
      );
    }

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updatePayload.status = status;
    if (trust_score !== undefined) updatePayload.trust_score = trust_score;
    if (confirm_count !== undefined) updatePayload.confirm_count = confirm_count;
    if (dispute_count !== undefined) updatePayload.dispute_count = dispute_count;

    const { data, error } = await supabase
      .from("incidents")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("❌ Supabase update error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Incident successfully updated.",
      data,
    });
  } catch (err) {
    console.error("❌ /api/incidents PATCH error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required for deletion." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("incidents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Supabase delete error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Incident ${id} deleted successfully.`,
    });
  } catch (err) {
    console.error("❌ /api/incidents DELETE error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

