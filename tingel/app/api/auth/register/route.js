import { NextResponse } from "next/server";
import { validateApiKey } from "@/middleware/auth.middleware";
import { saveOrUpdateUser } from "@/lib/users.lib";

// Reject non-POST requests
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
    const { email, display_name, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Both email and password are required." },
        { status: 400 }
      );
    }

    // 3. Save user with hashed password and reputation = 3
    const result = await saveOrUpdateUser({
      email,
      displayName: display_name,
      password,
      isGoogleAuth: false,
      reputation: 3, // default reputation = 3
    });

    return NextResponse.json({
      success: true,
      message: "User registered and stored in database successfully",
      data: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        reputation: result.user.reputation,
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/register:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
