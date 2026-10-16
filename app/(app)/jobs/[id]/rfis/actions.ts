"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import {
  STATUS_META,
  cleanNoteInput,
  isRfiStatus,
  nextNumber,
  noteLabel,
  sameNumber,
  type NoteInput,
} from "@/lib/rfis";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Rfi, RfiStatus } from "@/lib/types";
import { fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

async function personName(supabase: Client, id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("name, email").eq("id", id).maybeSingle();
  return data ? data.name?.trim() || data.email : null;
}

/** Numbers already used on the job (optionally ignoring one row, for edits). */
async function numbersInUse(supabase: Client, jobId: string, exceptId?: string): Promise<string[] | { error: string }> {
  const { data, error } = await supabase.from("rfis").select("id, rfi_number").eq("job_id", jobId);
  if (error) return { error: error.message };
  return (data ?? []).filter((r) => r.id !== exceptId).flatMap((r) => (r.rfi_number ? [r.rfi_number] : []));
}

export async function createRfi(jobId: string, input: NoteInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const clean = cleanNoteInput("rfi", input);
  if (!clean.ok) return fail(clean.error);
  const v = clean.value;

  const supabase = await createClient();
  const used = await numbersInUse(supabase, jobId);
  if ("error" in used) return fail(`Could not check RFI numbers: ${used.error}`);
  let number = v.number;
  if (!number) {
    number = nextNumber("rfi", used);
  } else if (used.some((n) => sameNumber("rfi", n, number))) {
    return fail(`${number} is already used on this job. The next free number is ${nextNumber("rfi", used)}.`);
  }
  const date = v.date ?? todayInZone((await getOrg()).timezone);

  const { error } = await supabase.from("rfis").insert({
    job_id: jobId,
    rfi_number: number,
    date_issued: date,
    subject: v.subject,
    drawing_ref: v.drawingRef,
    question: v.body,
    response: v.response,
    impact: v.impact,
    assigned_to: v.assigneeId,
    status: "issued",
    created_by: viewer.userId,
  });
  if (error) return fail(`Could not add the RFI: ${error.message}`);

  const who = await personName(supabase, v.assigneeId);
  await logActivity(supabase, {
    jobId,
    type: "rfi",
    description: `RFI issued: ${noteLabel("rfi", number, v.subject)}${who ? ` (assigned to ${who})` : ""}`,
    metadata: { rfi_number: number },
  });
  refresh(jobId);
  return ok();
}

export async function updateRfi(jobId: string, rfiId: string, input: NoteInput): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(rfiId)) return fail("Unknown RFI.");
  const clean = cleanNoteInput("rfi", input);
  if (!clean.ok) return fail(clean.error);
  const v = clean.value;

  const supabase = await createClient();
  const { data: current } = await supabase.from("rfis").select("*").eq("id", rfiId).eq("job_id", jobId).maybeSingle();
  if (!current) return fail("That RFI no longer exists.");

  if (v.number && !sameNumber("rfi", v.number, current.rfi_number)) {
    const used = await numbersInUse(supabase, jobId, rfiId);
    if ("error" in used) return fail(`Could not check RFI numbers: ${used.error}`);
    if (used.some((n) => sameNumber("rfi", n, v.number))) {
      return fail(`${v.number} is already used on this job. The next free number is ${nextNumber("rfi", used)}.`);
    }
  }

  const update: Partial<Rfi> = {
    rfi_number: v.number,
    // Clearing the date keeps the one it had; an RFI always has an issue date.
    date_issued: v.date ?? current.date_issued,
    subject: v.subject,
    drawing_ref: v.drawingRef,
    question: v.body,
    response: v.response,
    impact: v.impact,
    assigned_to: v.assigneeId,
  };
  const { error } = await supabase.from("rfis").update(update).eq("id", rfiId).eq("job_id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const label = noteLabel("rfi", v.number, v.subject);
  let description: string;
  if (v.response && !current.response) {
    description = `RFI response logged: ${label}`;
  } else if (v.assigneeId !== current.assigned_to) {
    const who = await personName(supabase, v.assigneeId);
    description = who ? `RFI assigned to ${who}: ${label}` : `RFI unassigned: ${label}`;
  } else {
    description = `RFI updated: ${label}`;
  }
  await logActivity(supabase, { jobId, type: "rfi", description, metadata: { rfi_number: v.number } });
  refresh(jobId);
  return ok();
}

export async function setRfiStatus(jobId: string, rfiId: string, status: RfiStatus): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(rfiId)) return fail("Unknown RFI.");
  if (!isRfiStatus(status)) return fail("Unknown status.");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("rfis")
    .select("rfi_number, subject, status")
    .eq("id", rfiId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!current) return fail("That RFI no longer exists.");
  if (current.status === status) return ok();

  const { error } = await supabase.from("rfis").update({ status }).eq("id", rfiId).eq("job_id", jobId);
  if (error) return fail(`Could not change the status: ${error.message}`);
  await logActivity(supabase, {
    jobId,
    type: "rfi",
    description: `RFI moved to ${STATUS_META[status].label}: ${noteLabel("rfi", current.rfi_number, current.subject)}`,
    metadata: { rfi_number: current.rfi_number, from: current.status, to: status },
  });
  refresh(jobId);
  return ok();
}

export async function deleteRfi(jobId: string, rfiId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(rfiId)) return fail("Unknown RFI.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rfis")
    .delete()
    .eq("id", rfiId)
    .eq("job_id", jobId)
    .select("rfi_number, subject");
  if (error) return fail(`Could not remove: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await logActivity(supabase, {
      jobId,
      type: "rfi",
      description: `RFI removed: ${noteLabel("rfi", removed.rfi_number, removed.subject)}`,
      metadata: { rfi_number: removed.rfi_number },
    });
  }
  refresh(jobId);
  return ok();
}
