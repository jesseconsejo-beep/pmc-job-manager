"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetPasswordState = { error: string | null };

const MIN_PASSWORD = 10;

/** Sets the signed-in person's password (after an invite or a reset link). */
export async function setPassword(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (password.length > 128) return { error: "That password is too long (128 characters at most)." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?error=link");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Could not set the password: ${error.message}` };

  // The middleware sends a not-yet-active account on to /pending.
  redirect("/");
}
