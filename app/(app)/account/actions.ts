"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cleanText, fail, formString, ok, type ActionResult } from "@/lib/validate";

/** A member edits their own display name and phone (role/active/email are trigger-protected). */
export async function updateMyProfile(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await requireMember();
  const name = cleanText(formString(form, "name"), 120);
  const phone = cleanText(formString(form, "phone"), 50);
  if (!name) return fail("Enter your name; it is how the crew sees you.");
  if (phone && !/^[\d\s()+.\-x]{7,}$/i.test(phone)) return fail("That phone number has characters it should not.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name, phone })
    .eq("id", viewer.userId)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Your profile could not be updated.");

  revalidatePath("/", "layout");
  return ok();
}
