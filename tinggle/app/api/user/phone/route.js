import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";

// Normalize and validate phone numbers
function cleanPhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits.length >= 10 ? digits : null;
}

// ── GET /api/user/phone?email=... ─────────────────────────────────────────────
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

    // 1. Try fetching user record
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error || !user) {
      return NextResponse.json({ success: true, phone: null });
    }

    // 2. Check native phone column first
    if (user.phone) {
      return NextResponse.json({ success: true, phone: user.phone });
    }

    // 3. Fallback: check metadata in watchlist array
    if (Array.isArray(user.watchlist)) {
      const meta = user.watchlist.find((w) => w?.id === "meta_phone");
      if (meta?.phone) {
        return NextResponse.json({ success: true, phone: meta.phone });
      }
    }

    return NextResponse.json({ success: true, phone: null });
  } catch (err) {
    console.error("GET /api/user/phone error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST /api/user/phone ────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, phone } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "User email is required." },
        { status: 400 }
      );
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number with at least 10 digits." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try updating native column 'phone'
    const { error: nativeError } = await supabase
      .from("users")
      .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
      .eq("email", normalizedEmail);

    if (!nativeError) {
      return NextResponse.json({
        success: true,
        message: "Phone number updated successfully.",
        phone: cleanPhone,
      });
    }

    // 2. Fallback: update via metadata in 'watchlist' array
    const { data: user } = await supabase
      .from("users")
      .select("watchlist")
      .eq("email", normalizedEmail)
      .single();

    const currentWatchlist = Array.isArray(user?.watchlist)
      ? user.watchlist.filter((w) => w?.id !== "meta_phone")
      : [];

    currentWatchlist.push({ id: "meta_phone", phone: cleanPhone, updatedAt: new Date().toISOString() });

    const { error: metaError } = await supabase
      .from("users")
      .update({ watchlist: currentWatchlist, updated_at: new Date().toISOString() })
      .eq("email", normalizedEmail);

    if (metaError) {
      throw new Error(metaError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Phone number saved to user profile.",
      phone: cleanPhone,
    });
  } catch (err) {
    console.error("POST /api/user/phone error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
