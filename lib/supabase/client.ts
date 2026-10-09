"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

/** Supabase client for client components (same cookie session as the server). */
export function createClient() {
  // Inlined at build time; must be referenced literally for Next to replace them.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL / publishable key missing. Check .env.local (see .env.example).");
  }
  return createBrowserClient<Database>(url, key);
}
