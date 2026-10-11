"use server";

import { revalidatePath } from "next/cache";
import { safeTimeZone } from "@/lib/dates";
import { requireSuper } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { OrgSettings } from "@/lib/types";
import { cleanDate, cleanText, fail, formString, ok, type ActionResult } from "@/lib/validate";

/*
 * Company settings (org_settings, one row). Owners and developers only; the
 * org_settings_super_update policy (0005; owner-only before it) is the lock.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREFIX = /^[A-Za-z0-9-]{0,8}$/;
const LOGO_PATH = /^logo\/\d{10,16}\.(png|jpg|webp|gif)$/;

type Editable = Omit<OrgSettings, "id" | "updated_at" | "updated_by" | "logo_path">;

function saved() {
  revalidatePath("/", "layout");
}

export async function updateSettings(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireSuper();

  const companyName = cleanText(formString(form, "company_name"), 120);
  const companyShort = cleanText(formString(form, "company_short"), 24);
  const colorPrimary = formString(form, "color_primary").trim();
  const colorSecondary = formString(form, "color_secondary").trim();
  const timezone = formString(form, "timezone").trim();
  const region = cleanText(formString(form, "region"), 40);
  const payDays = Number(formString(form, "pay_period_days"));
  const anchorRaw = formString(form, "pay_period_anchor_end").trim();
  const anchor = cleanDate(anchorRaw);
  const weekStart = Number(formString(form, "week_start_dow"));
  const jobPrefix = formString(form, "job_number_prefix").trim();
  const servicePrefix = formString(form, "service_number_prefix").trim();
  const assistantName = cleanText(formString(form, "assistant_name"), 40);
  const ordersEmail = cleanText(formString(form, "orders_from_email"), 320);

  if (!companyName) return fail("Company name is required.");
  if (!companyShort) return fail("Short name is required (it shows in the header).");
  if (!HEX.test(colorPrimary) || !HEX.test(colorSecondary)) return fail("Colours must be hex values like #f5c518.");
  if (!timezone || safeTimeZone(timezone) !== timezone) return fail("Pick a valid timezone.");
  if (!region) return fail("Region is required (for example BC).");
  if (payDays !== 7 && payDays !== 14) return fail("Pay period must be 7 or 14 days.");
  if (anchorRaw && !anchor) return fail("The pay-period end date is not a valid date.");
  if (!Number.isInteger(weekStart) || weekStart < 0 || weekStart > 6) return fail("Pick the day the week starts on.");
  if (!PREFIX.test(jobPrefix) || !PREFIX.test(servicePrefix)) {
    return fail("Number prefixes: up to 8 letters, digits or dashes.");
  }
  if (!assistantName) return fail("Give the assistant a name.");
  if (ordersEmail && !EMAIL.test(ordersEmail)) return fail("The orders-from address is not a valid email.");

  const patch: Editable = {
    company_name: companyName,
    company_short: companyShort,
    legal_name: cleanText(formString(form, "legal_name"), 200),
    color_primary: colorPrimary.toLowerCase(),
    color_secondary: colorSecondary.toLowerCase(),
    timezone,
    region,
    pay_period_days: payDays,
    pay_period_anchor_end: anchor,
    week_start_dow: weekStart,
    job_number_prefix: jobPrefix,
    service_number_prefix: servicePrefix,
    assistant_name: assistantName,
    orders_from_email: ordersEmail,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.from("org_settings").update(patch).eq("id", true).select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Settings were not saved: only an owner or developer can change them.");
  saved();
  return ok();
}

/** Points org_settings.logo_path at an object the browser just uploaded (or clears it). */
export async function setLogoPath(path: string | null): Promise<ActionResult> {
  await requireSuper();
  if (path !== null && !LOGO_PATH.test(path)) return fail("Unexpected logo file name.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("org_settings").update({ logo_path: path }).eq("id", true).select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("The logo was not saved: only an owner or developer can change it.");
  saved();
  return ok();
}
