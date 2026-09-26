import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client for Realtime subscriptions.
 * Uses NEXT_PUBLIC_ prefixed env vars so they are available client-side.
 * Keep this separate from the server-side db.lib.js client.
 */
const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabaseBrowser;
