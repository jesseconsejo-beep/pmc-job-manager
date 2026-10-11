"use server";

import { revalidatePath } from "next/cache";
import { siteOrigin } from "@/lib/origin";
import { requireAdmin, requireSuper } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanText, fail, formString, isUuid, ok, type ActionResult } from "@/lib/validate";

/*
 * People management. Every write goes through the caller's own session
 * first, so RLS and the profile/invite triggers (0002, 0005) decide what is
 * allowed; their error text is returned verbatim. The service-role client is
 * used only for the two things a session cannot do: send an auth invite and
 * delete an auth user.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function done() {
  revalidatePath("/crew");
  revalidatePath("/", "layout");
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------- Roles and activation ----------

export async function changeRole(userId: string, role: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!isUuid(userId)) return fail("Unknown person.");
  if (!me.catalog.some((r) => r.key === role)) return fail("Pick a role from the list.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", userId).select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("That change was not allowed, or the person no longer exists.");
  done();
  return ok();
}

export async function setActive(userId: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(userId)) return fail("Unknown person.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ active }).eq("id", userId).select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("That change was not allowed, or the person no longer exists.");
  done();
  return ok();
}

// ---------- Invites ----------

async function sendAuthInvite(email: string, name: string | null): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const origin = await siteOrigin();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: name ? { name } : undefined,
      redirectTo: `${origin}/auth/confirm`,
    });
    return error ? error.message : null;
  } catch (e) {
    return message(e);
  }
}

export type InviteState = {
  ok: boolean;
  error: string | null;
  sentTo: string | null;
  /** Echoed back on failure so the form keeps what was typed. */
  values: { email: string; name: string; role: string } | null;
};

/**
 * 1. Insert the invites row with the admin's own session (RLS proves they are
 *    an admin; the trigger refuses roles above their tier).
 * 2. Ask Supabase Auth to email the invite. Creating the auth user fires
 *    handle_new_user, which activates the profile with the invited role.
 * If step 2 fails, the row from step 1 is removed so nothing is left half-done.
 */
export async function inviteMember(_prev: InviteState, form: FormData): Promise<InviteState> {
  const me = await requireAdmin();
  const email = formString(form, "email").trim().toLowerCase().slice(0, 320);
  const name = cleanText(formString(form, "name"), 120);
  const role = formString(form, "role");
  const failed = (error: string): InviteState => ({
    ok: false,
    error,
    sentTo: null,
    values: { email, name: name ?? "", role },
  });

  if (!EMAIL.test(email)) return failed("Enter a valid email address.");
  if (!name) return failed("Enter their name.");
  if (!me.catalog.some((r) => r.key === role)) return failed("Pick a role from the list.");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
  if (existing && existing.length > 0) return failed("That address already has an account. Find them in the list above.");

  const { data: inv, error: insErr } = await supabase
    .from("invites")
    .insert({ email, name, role })
    .select("id")
    .single();
  if (insErr || !inv) {
    if (insErr?.code === "23505") return failed("There is already a pending invite for that address.");
    return failed(insErr?.message ?? "Could not record the invite.");
  }

  const sendErr = await sendAuthInvite(email, name);
  if (sendErr) {
    const { error: delErr } = await supabase.from("invites").delete().eq("id", inv.id);
    const cleanup = delErr ? ` (The invite record could not be removed: ${delErr.message})` : "";
    revalidatePath("/crew");
    return failed(`The invite email was not sent: ${sendErr}${cleanup}`);
  }

  done();
  return { ok: true, error: null, sentTo: email, values: null };
}

/** Send the email again. Also pushes the expiry out, or the signup trigger would park them. */
export async function resendInvite(inviteId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(inviteId)) return fail("Unknown invite.");

  const supabase = await createClient();
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("invites")
    .update({ expires_at: expires })
    .eq("id", inviteId)
    .is("accepted_at", null)
    .select("email, name")
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("That invite is no longer pending.");

  const sendErr = await sendAuthInvite(data.email, data.name);
  if (sendErr) return fail(`The invite email was not sent: ${sendErr}`);
  done();
  return ok();
}

export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(inviteId)) return fail("Unknown invite.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("invites").delete().eq("id", inviteId).select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("That invite was already gone.");
  revalidatePath("/crew");
  return ok();
}

// ---------- Delete account (owners / developers) ----------

/**
 * Permanently removes a login. Only for people with no history: anyone with
 * timesheets or activity is deactivated instead, so the records keep a name.
 * The auth user is deleted with the service-role client and the profile
 * cascades; the last-owner trigger (0005) still has the final say.
 */
export async function deleteAccount(userId: string, typedEmail: string): Promise<ActionResult> {
  const me = await requireSuper();
  if (!isUuid(userId)) return fail("Unknown person.");
  if (userId === me.userId) return fail("You cannot delete your own account.");

  const supabase = await createClient();
  const { data: target, error: readErr } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!target) return fail("That person no longer exists.");
  if (typedEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return fail("Type their email exactly to confirm.");
  }

  const [sheets, activity] = await Promise.all([
    supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("employee_id", userId),
    supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (sheets.error) return fail(sheets.error.message);
  if (activity.error) return fail(activity.error.message);
  if ((sheets.count ?? 0) > 0 || (activity.count ?? 0) > 0) {
    return fail(`${target.email} has history (timesheets or activity); deactivate instead.`);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return fail(message(e));
  }

  // 0006: the invite row cascades with the profile; other soft references clear.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    if (/database error/i.test(error.message)) {
      return fail(
        `Could not delete ${target.email}: the account is still linked to records (jobs, tasks, photos and the like), ` +
          `or it is the last active owner or developer. Deactivate instead. (${error.message})`,
      );
    }
    return fail(error.message);
  }
  done();
  return ok();
}
