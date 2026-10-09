"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUSES, type Job, type JobStatus, type ProgressMap } from "@/lib/types";
import { cleanDate, cleanText, fail, formString, isUuid, ok, type ActionResult } from "@/lib/validate";

function revalidateJob(jobId: string) {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

// ---------- Jobs ----------

export type NewJobState = { error: string | null };

export async function createJob(_prev: NewJobState, form: FormData): Promise<NewJobState> {
  const viewer = await requireMember();
  const jobName = cleanText(formString(form, "job_name"), 200);
  const jobNumber = cleanText(formString(form, "job_number"), 50);
  if (!jobName) return { error: "Give the job a name." };

  const supabase = await createClient();
  const { data: cats, error: catErr } = await supabase
    .from("progress_categories")
    .select("key, enabled_default")
    .eq("active", true)
    .order("sort");
  if (catErr) return { error: `Could not load progress categories: ${catErr.message}` };

  const categories = cats ?? [];
  const progress: ProgressMap = Object.fromEntries(categories.map((c) => [c.key, { material: 0, labour: 0 }]));
  const enabled = categories.filter((c) => c.enabled_default).map((c) => c.key);

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      job_name: jobName,
      job_number: jobNumber,
      status: "active",
      enabled_categories: enabled,
      progress,
      created_by: viewer.userId,
    })
    .select("id")
    .single();
  if (error || !job) return { error: `Could not create the job: ${error?.message ?? "no row returned"}` };

  await logActivity(supabase, { jobId: job.id, type: "job_created", description: `Job created: ${jobName}` });
  revalidateJob(job.id);
  redirect(`/jobs/${job.id}`);
}

const FIELD_LABELS = {
  job_name: "name",
  job_number: "job number",
  client: "client",
  location: "location",
  start_date: "start date",
  target_date: "target date",
  notes: "notes",
  status: "status",
} as const;

type EditableField = keyof typeof FIELD_LABELS;
type JobPatch = Pick<Job, EditableField>;

export async function updateJob(jobId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");

  const jobName = cleanText(formString(form, "job_name"), 200);
  if (!jobName) return fail("The job needs a name.");
  const statusRaw = formString(form, "status");
  if (!JOB_STATUSES.includes(statusRaw as JobStatus)) return fail("Pick a valid status.");

  const patch: JobPatch = {
    job_name: jobName,
    job_number: cleanText(formString(form, "job_number"), 50),
    client: cleanText(formString(form, "client"), 200),
    location: cleanText(formString(form, "location"), 300),
    start_date: cleanDate(formString(form, "start_date")),
    target_date: cleanDate(formString(form, "target_date")),
    notes: cleanText(formString(form, "notes"), 5000),
    status: statusRaw as JobStatus,
  };

  const supabase = await createClient();
  const { data: before, error: readErr } = await supabase
    .from("jobs")
    .select("job_name, job_number, client, location, start_date, target_date, notes, status")
    .eq("id", jobId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!before) return fail("That job no longer exists.");

  const changed = (Object.keys(FIELD_LABELS) as EditableField[]).filter((k) => (before[k] ?? null) !== (patch[k] ?? null));
  if (changed.length === 0) return ok();

  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const description =
    changed.length === 1 && changed[0] === "status"
      ? `Status changed to ${patch.status.replace("_", " ")}`
      : `Job details updated: ${changed.map((k) => FIELD_LABELS[k]).join(", ")}`;
  await logActivity(supabase, { jobId, type: "update", description, metadata: { fields: changed } });
  revalidateJob(jobId);
  return ok();
}

// ---------- Contacts ----------

function contactFields(form: FormData) {
  return {
    name: cleanText(formString(form, "name"), 200),
    role: cleanText(formString(form, "role"), 100),
    phone: cleanText(formString(form, "phone"), 50),
    email: cleanText(formString(form, "email"), 200),
  };
}

export async function addContact(jobId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const c = contactFields(form);
  if (!c.name) return fail("A contact needs a name.");

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({ ...c, name: c.name, job_id: jobId });
  if (error) return fail(`Could not add the contact: ${error.message}`);
  await logActivity(supabase, { jobId, type: "contact", description: `Contact added: ${c.name}` });
  revalidateJob(jobId);
  return ok();
}

export async function updateContact(
  jobId: string,
  contactId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(contactId)) return fail("Unknown contact.");
  const c = contactFields(form);
  if (!c.name) return fail("A contact needs a name.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update({ ...c, name: c.name })
    .eq("id", contactId)
    .eq("job_id", jobId)
    .select("id");
  if (error) return fail(`Could not save the contact: ${error.message}`);
  if (!data || data.length === 0) return fail("That contact no longer exists.");
  await logActivity(supabase, { jobId, type: "contact", description: `Contact updated: ${c.name}` });
  revalidateJob(jobId);
  return ok();
}

export async function deleteContact(jobId: string, contactId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(contactId)) return fail("Unknown contact.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("job_id", jobId)
    .select("name");
  if (error) return fail(`Could not remove the contact: ${error.message}`);
  const name = data?.[0]?.name;
  if (name) await logActivity(supabase, { jobId, type: "contact", description: `Contact removed: ${name}` });
  revalidateJob(jobId);
  return ok();
}
