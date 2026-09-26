import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import { saveOrUpdateUser } from "@/lib/users.lib";

// Reject any non-POST methods explicitly
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Must be a POST request." },
    { status: 405 }
  );
}

export async function POST(req) {
  try {
    // 1. Mandatory Security: Check API Key first
    const isValidKey = await validateApiKey(req);
    if (!isValidKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Missing or invalid API key in Authorization or x-api-key header.",
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { email, display_name, displayName, is_google = true } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required to sync user." },
        { status: 400 }
      );
    }

    // 3. Upsert user into Supabase users table
    // email -> from Google/Clerk or input
    // display_name -> user full name
    // password_hash -> 'google' if Google login
    // reputation -> 50 by default (neutral baseline)
    const result = await saveOrUpdateUser({
      email,
      displayName: display_name || displayName,
      isGoogleAuth: Boolean(is_google),
      password: is_google ? "google" : undefined,
      reputation: 50, // default baseline reputation
    });

    return NextResponse.json({
      success: true,
      message: "User successfully synced to Supabase database",
      data: result.user,
    });
  } catch (error) {
    console.error("Error in /api/auth/sync-user:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
