import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import { findUserByEmail } from "@/lib/users.lib";

// ─── GET /api/auth/me?email=... ────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email query parameter is required." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found in database." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        reputation: user.reputation ?? 50,
        is_admin: Boolean(user.is_admin || user.admin),
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ─── POST /api/auth/me ─────────────────────────────────────────────────────
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

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found in database." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        reputation: user.reputation ?? 3,
        is_admin: Boolean(user.is_admin || user.admin),
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
