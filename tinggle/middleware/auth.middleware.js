import supabase from "@/lib/db.lib";

/**
 * Validates the API key from request headers.
 * Checks Authorization: Bearer <key> or x-api-key header.
 * First checks env API_KEY (fast), then queries Supabase api_keys table.
 */
export async function validateApiKey(req) {
  try {
    const authHeader = req.headers.get("Authorization");
    const apiKey =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.headers.get("x-api-key");

    if (!apiKey) return false;

    // 1. Fast check against env API_KEY
    if (process.env.API_KEY && apiKey === process.env.API_KEY) {
      return true;
    }

    // 2. Check api_keys table in Supabase via HTTP
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id")
        .eq("key_value", apiKey)
        .limit(1)
        .single();

      if (!error && data) return true;
    } catch (dbErr) {
      console.warn("Notice: Supabase api_keys check skipped:", dbErr.message);
    }

    return false;
  } catch (error) {
    console.error(`API Key Validation Error: ${error.message}`);
    return false;
  }
}