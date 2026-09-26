import supabase from "@/lib/db.lib";
import bcrypt from "bcryptjs";

/**
 * Hash password securely
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || plainPassword === "google") return "google";
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
}

/**
 * Upsert or save a user into Supabase users table via HTTP API
 * - email: from Google/Clerk or user input
 * - display_name: full name from Google/Clerk or provided
 * - password_hash: "google" if OAuth login, else hashed password
 * - reputation: default 3
 */
export async function saveOrUpdateUser({
  email,
  displayName,
  password,
  isGoogleAuth = false,
  reputation = 50,
}) {
  if (!email) {
    throw new Error("Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const name = displayName?.trim() || normalizedEmail.split("@")[0];

  // password_hash: "google" for OAuth, hashed for email/pass
  let passwordHash = "google";
  if (!isGoogleAuth && password && password !== "google") {
    passwordHash = await hashPassword(password);
  }

  // Upsert via Supabase JS HTTP API — no TCP connection issues
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        email: normalizedEmail,
        display_name: name,
        password_hash: passwordHash,
        reputation: reputation ?? 3,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
        ignoreDuplicates: false,
      }
    )
    .select("*")
    .single();

  if (error) {
    console.error("❌ Supabase upsert error:", error.message, error.details);
    throw new Error(`Supabase Error: ${error.message}`);
  }

  console.log("✅ User saved/updated in Supabase:", data.email);
  return {
    success: true,
    source: "database",
    user: {
      ...data,
      is_admin: Boolean(data?.is_admin || data?.admin),
    },
  };
}

/**
 * Find user by email
 */
export async function findUserByEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found — not an error
    console.warn("DB findUser error:", error.message);
    return null;
  }

  return {
    ...data,
    is_admin: Boolean(data?.is_admin || data?.admin),
  };
}
