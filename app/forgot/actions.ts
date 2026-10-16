"use server";

import { siteOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = { sent: boolean; error: string | null; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a reset link. Always reports the same outcome so the page never
 * reveals whether an address has an account. Only an unusable address is
 * reported back (that says nothing about accounts).
 */
export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  if (!EMAIL.test(email)) return { sent: false, error: "Enter a valid email address.", email };

  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?type=recovery` });
  } catch {
    // Same answer either way (rate limits, unknown address, mail errors).
  }
  return { sent: true, error: null, email };
}
