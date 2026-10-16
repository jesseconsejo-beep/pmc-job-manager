"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import {
  STATUS_META,
  cleanNoteInput,
  formatDays,
  formatMoney,
  isRfiStatus,
  nextNumber,
  noteLabel,
  sameNumber,
  type NoteInput,
} from "@/lib/rfis";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ChangeOrder, RfiStatus } from "@/lib/types";
import { fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

/** Numbers already used on the job (optionally ignoring one row, for edits). */
async function numbersInUse(supabase: Client, jobId: string, exceptId?: string): Promise<string[] | { error: string }> {
  const { data, error } = await supabase.from("change_orders").select("id, co_number").eq("job_id", jobId);
  if (error) return { error: error.message };
  return (data ?? []).filter((r) => r.id !== exceptId).flatMap((r) => (r.co_number ? [r.co_number] : []));
}

/** " ($1,250.00, +3 days)" or "" when neither impact is set. */
function impactSuffix(cost: number | null, days: number | null): string {
  const parts = [cost !== null ? formatMoney(cost) : null, days !== null ? formatDays(days) : null].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

export async function createChangeOrder(jobId: string, input: NoteInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const clean = cleanNoteInput("co", input);
  if (!clean.ok) return fail(clean.error);
  const v = clean.value;

  const supabase = await createClient();
  const used = await numbersInUse(supabase, jobId);
  if ("error" in used) return fail(`Could not check CO numbers: ${used.error}`);
  let number = v.number;
  if (!number) {
    number = nextNumber("co", used);
  } else if (used.some((n) => sameNumber("co", n, number))) {
    return fail(`${number} is already used on this job. The next free number is ${nextNumber("co", used)}.`);
  }
  const date = v.date ?? todayInZone((await getOrg()).timezone);

  const { error } = await supabase.from("change_orders").insert({
    job_id: jobId,
    co_number: number,
    date_issued: date,
    subject: v.subject,
    drawing_ref: v.drawingRef,
    description: v.body,
    cost_impact: v.costImpact,
    schedule_impact_days: v.scheduleDays,
    impact: v.impact,
    status: "issued",
    created_by: viewer.userId,
  });
  if (error) return fail(`Could not add the change order: ${error.message}`);

  await logActivity(supabase, {
    jobId,
    type: "change_order",
    description: `Change order issued: ${noteLabel("co", number, v.subject)}${impactSuffix(v.costImpact, v.scheduleDays)}`,
    metadata: { co_number: number, cost_impact: v.costImpact, schedule_impact_days: v.scheduleDays },
  });
  refresh(jobId);
  return ok();
}

export async function updateChangeOrder(jobId: string, coId: string, input: NoteInput): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(coId)) return fail("Unknown change order.");
  const clean = cleanNoteInput("co", input);
  if (!clean.ok) return fail(clean.error);
  const v = clean.value;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("change_orders")
    .select("*")
    .eq("id", coId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!current) return fail("That change order no longer exists.");

  if (v.number && !sameNumber("co", v.number, current.co_number)) {
    const used = await numbersInUse(supabase, jobId, coId);
    if ("error" in used) return fail(`Could not check CO numbers: ${used.error}`);
    if (used.some((n) => sameNumber("co", n, v.number))) {
      return fail(`${v.number} is already used on this job. The next free number is ${nextNumber("co", used)}.`);
    }
  }

  const update: Partial<ChangeOrder> = {
    co_number: v.number,
    // Clearing the date keeps the one it had; a change order always has an issue date.
    date_issued: v.date ?? current.date_issued,
    subject: v.subject,
    drawing_ref: v.drawingRef,
    description: v.body,
    cost_impact: v.costImpact,
    schedule_impact_days: v.scheduleDays,
    impact: v.impact,
  };
  const { error } = await supabase.from("change_orders").update(update).eq("id", coId).eq("job_id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const before = current.cost_impact === null ? null : Number(current.cost_impact);
  const costChanged = before !== v.costImpact || current.schedule_impact_days !== v.scheduleDays;
  const label = noteLabel("co", v.number, v.subject);
  const description = costChanged
    ? `Change order impact updated: ${label}${impactSuffix(v.costImpact, v.scheduleDays) || " (cleared)"}`
    : `Change order updated: ${label}`;
  await logActivity(supabase, {
    jobId,
    type: "change_order",
    description,
    metadata: { co_number: v.number, cost_impact: v.costImpact, schedule_impact_days: v.scheduleDays },
  });
  refresh(jobId);
  return ok();
}

export async function setChangeOrderStatus(jobId: string, coId: string, status: RfiStatus): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(coId)) return fail("Unknown change order.");
  if (!isRfiStatus(status)) return fail("Unknown status.");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("change_orders")
    .select("co_number, subject, status")
    .eq("id", coId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!current) return fail("That change order no longer exists.");
  if (current.status === status) return ok();

  const { error } = await supabase.from("change_orders").update({ status }).eq("id", coId).eq("job_id", jobId);
  if (error) return fail(`Could not change the status: ${error.message}`);
  await logActivity(supabase, {
    jobId,
    type: "change_order",
    description: `Change order moved to ${STATUS_META[status].label}: ${noteLabel("co", current.co_number, current.subject)}`,
    metadata: { co_number: current.co_number, from: current.status, to: status },
  });
  refresh(jobId);
  return ok();
}

export async function deleteChangeOrder(jobId: string, coId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(coId)) return fail("Unknown change order.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_orders")
    .delete()
    .eq("id", coId)
    .eq("job_id", jobId)
    .select("co_number, subject");
  if (error) return fail(`Could not remove: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await logActivity(supabase, {
      jobId,
      type: "change_order",
      description: `Change order removed: ${noteLabel("co", removed.co_number, removed.subject)}`,
      metadata: { co_number: removed.co_number },
    });
  }
  refresh(jobId);
  return ok();
}
