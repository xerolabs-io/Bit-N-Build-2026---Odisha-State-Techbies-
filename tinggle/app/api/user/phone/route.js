import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";
import { validatePhoneNumber } from "@/lib/phone-validation.lib";

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
      return NextResponse.json({ success: true, phone: null, phone_verified: false });
    }

    // Check metadata in watchlist array first (has verification status)
    let metaPhone = null;
    let isVerified = false;
    if (Array.isArray(user.watchlist)) {
      const meta = user.watchlist.find((w) => w?.id === "meta_phone");
      if (meta?.phone) {
        metaPhone = meta.phone;
        isVerified = Boolean(meta.phone_verified);
      }
    }

    const resolvedPhone = user.phone || metaPhone || null;

    return NextResponse.json({
      success: true,
      phone: resolvedPhone,
      phone_verified: isVerified,
    });
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

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.error },
        { status: 400 }
      );
    }

    const cleanPhone = phoneValidation.cleanPhone;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try updating native column 'phone'
    const { error: nativeError } = await supabase
      .from("users")
      .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
      .eq("email", normalizedEmail);

    // 2. Also sync to watchlist metadata
    try {
      const { data: user } = await supabase
        .from("users")
        .select("watchlist")
        .eq("email", normalizedEmail)
        .single();

      let currentWatchlist = Array.isArray(user?.watchlist)
        ? user.watchlist.filter((item) => item?.id !== "meta_phone")
        : [];

      currentWatchlist.push({
        id: "meta_phone",
        phone: cleanPhone,
        phone_verified: false, // direct save requires OTP verification for verified status
        updated_at: new Date().toISOString(),
      });

      await supabase
        .from("users")
        .update({ watchlist: currentWatchlist, updated_at: new Date().toISOString() })
        .eq("email", normalizedEmail);
    } catch (metaErr) {
      console.warn("Watchlist metadata sync notice:", metaErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Phone number updated successfully.",
      phone: cleanPhone,
      phone_verified: false,
    });
  } catch (err) {
    console.error("POST /api/user/phone error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
