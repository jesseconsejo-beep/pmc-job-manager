import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing for the links in Supabase auth emails. The templates point here:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite   (or recovery)
 * Verifying the token hash signs the person in (session cookie), then an
 * invite or reset goes on to choose a password.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeRaw = request.nextUrl.searchParams.get("type");
  const type = TYPES.find((t) => t === typeRaw);

  if (!tokenHash || !type) redirect("/login?error=link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/login?error=link");

  redirect(type === "invite" || type === "recovery" ? "/set-password" : "/");
}
