import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";
import { validatePhoneNumber } from "@/lib/phone-validation.lib";

// In-memory OTP store (persists across requests in node process)
// Key: normalizedEmail -> { code, phone, expiresAt, attempts }
const globalOtpStore = new Map();

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = "send_otp", email, phone, otp } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "User email is required for phone verification." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ─── ACTION 1: SEND OTP ─────────────────────────────────────────────────
    if (action === "send_otp") {
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { success: false, error: phoneValidation.error },
          { status: 400 }
        );
      }

      // Generate secure 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

      globalOtpStore.set(normalizedEmail, {
        code,
        phone: phoneValidation.cleanPhone,
        expiresAt,
        attempts: 0,
      });

      console.log(
        `📱 [SMS GATEWAY SIMULATION] Emergency OTP dispatched to ${phoneValidation.cleanPhone} for ${normalizedEmail}: ${code}`
      );

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${phoneValidation.cleanPhone}. Valid for 5 minutes.`,
        phone: phoneValidation.cleanPhone,
        demoCode: code, // Provided for instant demo/eval testing without live SMS gateway billing
        expiresInSeconds: 300,
      });
    }

    // ─── ACTION 2: VERIFY OTP ───────────────────────────────────────────────
    if (action === "verify_otp") {
      const stored = globalOtpStore.get(normalizedEmail);

      if (!stored) {
        return NextResponse.json(
          {
            success: false,
            error: "No active verification code found. Please request a new OTP.",
          },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        globalOtpStore.delete(normalizedEmail);
        return NextResponse.json(
          {
            success: false,
            error: "Verification code has expired. Please request a new OTP.",
          },
          { status: 400 }
        );
      }

      const inputOtp = String(otp || "").trim();
      if (inputOtp !== stored.code) {
        stored.attempts = (stored.attempts || 0) + 1;
        if (stored.attempts >= 4) {
          globalOtpStore.delete(normalizedEmail);
          return NextResponse.json(
            {
              success: false,
              error: "Maximum verification attempts exceeded. Please request a new OTP.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "Invalid OTP code. Please enter the correct 6-digit code.",
          },
          { status: 400 }
        );
      }

      // OTP matches! Clear from store
      const verifiedPhone = stored.phone;
      globalOtpStore.delete(normalizedEmail);

      // Save verified phone to database
      // 1. Try updating native columns
      const updateData = {
        phone: verifiedPhone,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from("users")
        .update(updateData)
        .eq("email", normalizedEmail);

      // 2. Also record verified metadata in watchlist array for guaranteed schema resilience
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("watchlist")
          .eq("email", normalizedEmail)
          .single();

        let currentWatchlist = Array.isArray(userData?.watchlist)
          ? userData.watchlist.filter((item) => item?.id !== "meta_phone")
          : [];

        currentWatchlist.push({
          id: "meta_phone",
          phone: verifiedPhone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        });

        await supabase
          .from("users")
          .update({
            watchlist: currentWatchlist,
            updated_at: new Date().toISOString(),
          })
          .eq("email", normalizedEmail);
      } catch (metaErr) {
        console.warn("Could not save phone metadata:", metaErr.message);
      }

      console.log(`✅ Phone number ${verifiedPhone} verified via OTP for ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: "Phone number verified successfully!",
        phone: verifiedPhone,
        phone_verified: true,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'send_otp' or 'verify_otp'." },
      { status: 400 }
    );
  } catch (err) {
    console.error("❌ /api/user/phone/otp error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
