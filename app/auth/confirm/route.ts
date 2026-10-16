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
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const typeRaw = params.get("type");
  const type = TYPES.find((t) => t === typeRaw);

  const supabase = await createClient();

  if (tokenHash && type) {
    // Custom templates: {{ .SiteURL }}/auth/confirm?token_hash=...&type=...
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) redirect("/login?error=link");
    redirect(type === "invite" || type === "recovery" ? "/set-password" : "/");
  }

  if (code) {
    // Default templates ({{ .ConfirmationURL }}): Supabase redirects here with a
    // one-time code; the exchange needs the cookie set when the email was requested.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect("/login?error=link");
    // Every email this app sends (invite, reset) ends in choosing a password.
    redirect(type === "signup" || type === "magiclink" || type === "email_change" || type === "email" ? "/" : "/set-password");
  }

  redirect("/login?error=link");
}
