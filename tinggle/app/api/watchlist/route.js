import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import supabase from "@/lib/db.lib";

// ─── GET /api/watchlist?email=user@example.com ─────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email query param is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user's watchlist from Supabase users table
    const { data, error } = await supabase
      .from("users")
      .select("watchlist")
      .eq("email", normalizedEmail)
      .single();

    if (error) {
      // If column doesn't exist yet, return empty array gracefully without failing
      if (error.code === "PGRST204" || error.message?.includes("watchlist")) {
        console.warn("⚠️ Watchlist column not yet added to users table in Supabase.");
        return NextResponse.json({
          success: true,
          watchlist: [],
          notice: "Column not yet in DB, run add_watchlist_column.sql in Supabase.",
        });
      }
      return NextResponse.json({ success: true, watchlist: [] });
    }

    const watchlist = Array.isArray(data?.watchlist) ? data.watchlist : [];
    return NextResponse.json({ success: true, watchlist });
  } catch (err) {
    console.error("GET /api/watchlist error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ─── POST /api/watchlist ───────────────────────────────────────────────────
// Body: { email: string, watchlist: Array<{ id, name, enabled }> }
export async function POST(req) {
  try {
    // 1. Validate API Key if present
    const isValidKey = await validateApiKey(req);
    // If an API key was sent and failed, check if header present
    const hasHeader = req.headers.get("x-api-key") || req.headers.get("Authorization");
    if (hasHeader && !isValidKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid API key." },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const { email, watchlist } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(watchlist)) {
      return NextResponse.json(
        { success: false, error: "Watchlist must be an array." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Save to Supabase users table
    const { data, error } = await supabase
      .from("users")
      .update({
        watchlist,
        updated_at: new Date().toISOString(),
      })
      .eq("email", normalizedEmail)
      .select("id, email, watchlist");

    if (error) {
      console.warn("Supabase watchlist update notice:", error.message);
      // Graceful fallback response if column not created yet
      return NextResponse.json({
        success: true,
        watchlist,
        dbSaved: false,
        notice: "Column watchlist pending in DB. Run add_watchlist_column.sql in Supabase.",
      });
    }

    let resultData = data;
    if (!data || data.length === 0) {
      const { data: upsertData } = await supabase
        .from("users")
        .upsert(
          {
            email: normalizedEmail,
            display_name: normalizedEmail.split("@")[0],
            password_hash: "google",
            reputation: 3,
            watchlist,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .select("id, email, watchlist");
      resultData = upsertData;
    }

    return NextResponse.json({
      success: true,
      dbSaved: true,
      watchlist,
      data: resultData,
    });
  } catch (err) {
    console.error("POST /api/watchlist error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
