import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import { findUserByEmail } from "@/lib/users.lib";

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
        email: user.email,
        display_name: user.display_name,
        reputation: user.reputation ?? 3,
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
