"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { todayInZone, yearOf } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import {
  entriesOf,
  escapeLike,
  isYearCode,
  sameEntries,
  SERVICE_STATUS_LABEL,
  serviceFingerprint,
  suggestServiceCode,
} from "@/lib/service";
import { requireMember, requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_STATUSES, type ServiceCall, type ServiceStatus, type WorkEntry } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

const MAX_ENTRIES = 100;
const MAX_HOURS_PER_VISIT = 24;
const MAX_COST = 10_000_000;

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/service");
  if (id) revalidatePath(`/service/${id}`);
}

/** "S2026-049 — Dishwasher hose", for activity lines. */
function callLabel(c: Pick<ServiceCall, "service_code" | "project_name" | "customer_name">): string {
  const name = c.project_name || c.customer_name;
  if (c.service_code && name) return `${c.service_code} — ${name}`;
  return c.service_code || name || "untitled call";
}

// ---------- input cleaning ----------

/** What the editor sends. Every value is untrusted and re-checked here. */
export type WorkEntryInput = {
  id: string;
  date: string;
  worker_id: string;
  worker_name: string;
  hours: string;
  material_source: string;
  parking: string;
  notes: string;
};

export type ServiceCallInput = {
  service_code: string;
  scheduled_date: string;
  customer_name: string;
  company_name: string;
  customer_phone: string;
  customer_po: string;
  project_name: string;
  address: string;
  work_report: string;
  total_cost: string;
  status: string;
  work_entries: WorkEntryInput[];
};

type CleanCall = Pick<
  ServiceCall,
  | "service_code"
  | "scheduled_date"
  | "customer_name"
  | "company_name"
  | "customer_phone"
  | "customer_po"
  | "project_name"
  | "address"
  | "work_report"
  | "total_cost"
  | "status"
  | "work_entries"
>;

/** "$1,250.50" / "1250.5" -> 1250.5; "" -> null; junk -> undefined. */
function parseAmount(v: unknown, max: number): number | null | undefined {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 100) / 100 : undefined;
  if (typeof v !== "string") return null;
  const t = v.replace(/[$,\s]/g, "");
  if (!t) return null;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return Math.round(n * 100) / 100;
}

const ENTRY_ID = /^[\w-]{1,64}$/;

function isBlankEntry(e: WorkEntry): boolean {
  return !e.worker_id && !e.worker_name && e.hours === null && !e.material_source && !e.parking && !e.notes;
}

async function cleanEntries(supabase: Client, raw: unknown): Promise<WorkEntry[] | string> {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAX_ENTRIES) return `Too many visits (limit ${MAX_ENTRIES}).`;

  const ids = raw
    .map((r) => (r && typeof r === "object" ? (r as Partial<WorkEntryInput>).worker_id : null))
    .filter(isUuid);
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, name, email").in("id", [...new Set(ids)]);
    for (const p of data ?? []) names.set(p.id, p.name?.trim() || p.email.split("@")[0] || p.email);
  }

  const out: WorkEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = (raw[i] && typeof raw[i] === "object" ? raw[i] : {}) as Partial<WorkEntryInput>;
    const hours = parseAmount(r.hours, MAX_HOURS_PER_VISIT);
    if (hours === undefined) return `Hours on visit #${i + 1} must be a number from 0 to ${MAX_HOURS_PER_VISIT}.`;
    const workerId = isUuid(r.worker_id) && names.has(r.worker_id) ? r.worker_id : null;
    const entry: WorkEntry = {
      id: typeof r.id === "string" && ENTRY_ID.test(r.id) && !r.id.startsWith("row-") ? r.id : crypto.randomUUID(),
      date: cleanDate(r.date),
      worker_id: workerId,
      // A linked worker keeps a snapshot of their name for print and history.
      worker_name: workerId ? (names.get(workerId) ?? null) : cleanText(r.worker_name, 100),
      hours,
      material_source: cleanText(r.material_source, 300),
      parking: cleanText(r.parking, 50),
      notes: cleanText(r.notes, 500),
    };
    if (!isBlankEntry(entry)) out.push(entry);
  }
  return out;
}

async function cleanCall(supabase: Client, input: ServiceCallInput): Promise<CleanCall | string> {
  if (!input || typeof input !== "object") return "Nothing to save.";
  const status = input.status as ServiceStatus;
  if (!SERVICE_STATUSES.includes(status)) return "Pick a valid status.";
  const total = parseAmount(input.total_cost, MAX_COST);
  if (total === undefined) return "Total cost must be a dollar amount, e.g. 150.00.";
  const entries = await cleanEntries(supabase, input.work_entries);
  if (typeof entries === "string") return entries;

  const call: CleanCall = {
    service_code: cleanText(input.service_code, 50),
    scheduled_date: cleanDate(input.scheduled_date),
    customer_name: cleanText(input.customer_name, 200),
    company_name: cleanText(input.company_name, 200),
    customer_phone: cleanText(input.customer_phone, 50),
    customer_po: cleanText(input.customer_po, 100),
    project_name: cleanText(input.project_name, 200),
    address: cleanText(input.address, 300),
    work_report: cleanText(input.work_report, 10_000),
    total_cost: total,
    status,
    work_entries: entries,
  };
  if (!call.service_code && !call.project_name && !call.customer_name && !call.company_name) {
    return "Add a service code, project name or customer before saving.";
  }
  return call;
}

/** Service codes are unique in practice; refuse a duplicate and offer the next free one. */
async function codeClash(supabase: Client, code: string | null, exceptId: string | null): Promise<string | null> {
  if (!code) return null;
  let q = supabase.from("service_calls").select("id").ilike("service_code", escapeLike(code)).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  if (error) return `Could not check the service code: ${error.message}`;
  if (!data || data.length === 0) return null;

  const org = await getOrg();
  const year = yearOf(todayInZone(org.timezone));
  const next = await suggestServiceCode(supabase, org.serviceNumberPrefix, year);
  return isYearCode(org.serviceNumberPrefix, year, code)
    ? `${code} is already used by another call. The next free number is ${next}.`
    : `${code} is already used by another call. Pick a different code.`;
}

// ---------- create / update ----------

export async function createServiceCall(input: ServiceCallInput): Promise<ActionResult> {
  const viewer = await requireMember();
  const supabase = await createClient();
  const call = await cleanCall(supabase, input);
  if (typeof call === "string") return fail(call);
  const clash = await codeClash(supabase, call.service_code, null);
  if (clash) return fail(clash);

  const { data, error } = await supabase
    .from("service_calls")
    .insert({
      ...call,
      completed_at: call.status === "complete" ? new Date().toISOString() : null,
      created_by: viewer.userId,
    })
    .select("id")
    .single();
  if (error || !data) return fail(`Could not create the service call: ${error?.message ?? "no row returned"}`);

  await logActivity(supabase, {
    serviceCallId: data.id,
    type: "service",
    description: `Service call created: ${callLabel(call)}`,
  });
  refresh(data.id);
  redirect(`/service/${data.id}`);
}

const FIELD_LABELS: Record<Exclude<keyof CleanCall, "work_entries">, string> = {
  service_code: "service code",
  scheduled_date: "date",
  customer_name: "customer",
  company_name: "company",
  customer_phone: "phone",
  customer_po: "customer PO",
  project_name: "project",
  address: "address",
  work_report: "work report",
  total_cost: "total",
  status: "status",
};

export async function updateServiceCall(id: string, input: ServiceCallInput, fingerprint: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(id)) return fail("Unknown service call.");
  const supabase = await createClient();

  const { data: before, error: readErr } = await supabase.from("service_calls").select("*").eq("id", id).maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!before) return fail("That service call no longer exists.");
  if (typeof fingerprint !== "string" || fingerprint !== serviceFingerprint(before)) {
    return fail("Someone else saved this call while you were editing. Copy anything you need, cancel, and open it again.");
  }

  const call = await cleanCall(supabase, input);
  if (typeof call === "string") return fail(call);
  if ((call.service_code ?? "").toLowerCase() !== (before.service_code ?? "").toLowerCase()) {
    const clash = await codeClash(supabase, call.service_code, id);
    if (clash) return fail(clash);
  }

  const changed = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter((k) => {
    const a = before[k] ?? null;
    const b = call[k] ?? null;
    return k === "total_cost" ? (a === null ? null : Number(a)) !== b : a !== b;
  });
  const entriesChanged = !sameEntries(entriesOf(before), call.work_entries);
  if (changed.length === 0 && !entriesChanged) return ok();

  const completed_at =
    call.status === "complete" ? (before.status === "complete" ? before.completed_at : new Date().toISOString()) : null;

  const { data: saved, error } = await supabase
    .from("service_calls")
    .update({ ...call, completed_at })
    .eq("id", id)
    .select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!saved || saved.length === 0) return fail("That service call no longer exists.");

  const labels = changed.map((k) => FIELD_LABELS[k]);
  if (entriesChanged) labels.push("visits");
  const description =
    changed.length === 1 && changed[0] === "status" && !entriesChanged
      ? `Status changed to ${SERVICE_STATUS_LABEL[call.status]}: ${callLabel(call)}`
      : `Work order updated (${labels.join(", ")}): ${callLabel(call)}`;
  await logActivity(supabase, {
    serviceCallId: id,
    type: "service",
    description,
    metadata: { fields: changed, visits_changed: entriesChanged },
  });
  refresh(id);
  return ok();
}

export async function setServiceStatus(id: string, status: ServiceStatus): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(id)) return fail("Unknown service call.");
  if (!SERVICE_STATUSES.includes(status)) return fail("Pick a valid status.");
  const supabase = await createClient();

  const { data: before, error: readErr } = await supabase
    .from("service_calls")
    .select("status, completed_at, service_code, project_name, customer_name")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!before) return fail("That service call no longer exists.");
  if (before.status === status) return ok();

  const completed_at = status === "complete" ? (before.completed_at ?? new Date().toISOString()) : null;
  const { error } = await supabase.from("service_calls").update({ status, completed_at }).eq("id", id);
  if (error) return fail(`Could not change the status: ${error.message}`);

  await logActivity(supabase, {
    serviceCallId: id,
    type: "service",
    description: `Status changed to ${SERVICE_STATUS_LABEL[status]}: ${callLabel(before)}`,
    metadata: { from: before.status, to: status },
  });
  refresh(id);
  return ok();
}

// ---------- delete (admins; RLS enforces it too) ----------

export async function deleteServiceCall(id: string): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!member.admin) return fail("Only admins can delete service calls.");
  if (!isUuid(id)) return fail("Unknown service call.");
  const supabase = await createClient();

  const { data: photos } = await supabase.from("photos").select("id, storage_path").eq("service_call_id", id);
  const { data, error } = await supabase
    .from("service_calls")
    .delete()
    .eq("id", id)
    .select("service_code, project_name, customer_name");
  if (error) return fail(`Could not delete: ${error.message}`);
  const removed = data?.[0];
  if (!removed) return fail("Not deleted. Only admins can delete service calls, or it was already removed.");

  // photos.service_call_id has no foreign key, so clear the call's photos by hand.
  const paths = (photos ?? []).map((p) => p.storage_path).filter((p) => p.startsWith(`sc/${id}/`));
  if (paths.length > 0) await supabase.storage.from("photos").remove(paths);
  if ((photos ?? []).length > 0) await supabase.from("photos").delete().eq("service_call_id", id);

  // The call's own activity rows cascade away with it, so this line is not linked to it.
  await logActivity(supabase, {
    type: "service",
    description: `Service call deleted: ${callLabel(removed)}`,
    metadata: { service_call_id: id, photos_removed: paths.length },
  });
  refresh();
  redirect("/service");
}

// ---------- photos (rows in photos; bytes in bucket 'photos' under sc/<id>/) ----------

const PHOTO_PATH = /^sc\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

async function callLabelById(supabase: Client, id: string): Promise<string | null> {
  const { data } = await supabase
    .from("service_calls")
    .select("service_code, project_name, customer_name")
    .eq("id", id)
    .maybeSingle();
  return data ? callLabel(data) : null;
}

/** Records a photo the browser has already uploaded to sc/<id>/<uuid>.<ext>. */
export async function addServicePhoto(id: string, storagePath: string): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(id)) return fail("Unknown service call.");
  const m = typeof storagePath === "string" ? PHOTO_PATH.exec(storagePath) : null;
  if (!m || m[1].toLowerCase() !== id.toLowerCase()) return fail("That upload path is not for this call.");
  const supabase = await createClient();
  const label = await callLabelById(supabase, id);
  if (!label) return fail("That service call no longer exists.");

  const org = await getOrg();
  // No .select(): crew can add photos to any call but only read back photos on calls they created.
  const { error } = await supabase.from("photos").insert({
    service_call_id: id,
    job_id: null,
    storage_path: storagePath,
    date: todayInZone(org.timezone),
    taken_by: viewer.userId,
  });
  if (error) return fail(`Could not save the photo: ${error.message}`);
  await logActivity(supabase, { serviceCallId: id, type: "photo", description: `Photo added: ${label}` });
  refresh(id);
  return ok();
}

export async function updatePhotoCaption(id: string, photoId: string, caption: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(id) || !isUuid(photoId)) return fail("Unknown photo.");
  const supabase = await createClient();
  const clean = cleanText(caption, 200);
  const { data, error } = await supabase
    .from("photos")
    .update({ caption: clean })
    .eq("id", photoId)
    .eq("service_call_id", id)
    .select("id");
  if (error) return fail(`Could not save the caption: ${error.message}`);
  if (!data || data.length === 0) return fail("Only the person who took a photo, or an admin, can change it.");
  const label = (await callLabelById(supabase, id)) ?? "service call";
  await logActivity(supabase, {
    serviceCallId: id,
    type: "photo",
    description: clean ? `Photo caption set to "${clean}": ${label}` : `Photo caption cleared: ${label}`,
  });
  refresh(id);
  return ok();
}

export async function deleteServicePhoto(id: string, photoId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(id) || !isUuid(photoId)) return fail("Unknown photo.");
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("service_call_id", id)
    .maybeSingle();
  if (!photo) return fail("That photo no longer exists.");

  // Bytes first: the storage policy lets the uploader delete only while the row still points at the file.
  const { error: storageErr } = await supabase.storage.from("photos").remove([photo.storage_path]);
  if (storageErr) return fail(`Could not remove the file: ${storageErr.message}`);
  const { data, error } = await supabase.from("photos").delete().eq("id", photoId).eq("service_call_id", id).select("id");
  if (error) return fail(`Could not remove the photo: ${error.message}`);
  if (!data || data.length === 0) return fail("Only the person who took a photo, or an admin, can delete it.");

  const label = (await callLabelById(supabase, id)) ?? "service call";
  await logActivity(supabase, { serviceCallId: id, type: "photo", description: `Photo removed: ${label}` });
  refresh(id);
  return ok();
}
