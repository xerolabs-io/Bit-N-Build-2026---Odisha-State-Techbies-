"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export default function UserSync() {
  const { isSignedIn, user, isLoaded } = useUser();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    if (hasSyncedRef.current) return;

    async function syncToDatabase() {
      try {
        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress;

        const displayName =
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.username ||
          email?.split("@")[0];

        const apiKey =
          process.env.NEXT_PUBLIC_API_KEY || "tinggle-api-key-1";

        console.log("🔄 Initiating Supabase sync for:", email);

        const response = await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            email,
            display_name: displayName,
            is_google: true,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          hasSyncedRef.current = true;
          console.log("✅ Successfully saved to Supabase users table:", data.data);
        } else {
          console.error("❌ Failed to save user to Supabase:", data.error);
        }
      } catch (err) {
        console.error("❌ Network/Sync error during user sync:", err.message);
      }
    }

    syncToDatabase();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
