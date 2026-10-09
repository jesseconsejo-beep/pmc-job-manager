import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * Service-role client. BYPASSES RLS. Server-only, and only for the few jobs
 * that genuinely need it (sending invites). Nothing in this slice calls it.
 * Fails with a clear message when SUPABASE_SECRET_KEY is not configured, at
 * call time rather than import time, so the rest of the app keeps working.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is empty. Paste the secret key from Supabase > Settings > API Keys " +
        "into .env.local (and Vercel) to enable admin actions such as inviting users.",
    );
  }
  return createSupabaseClient<Database>(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
