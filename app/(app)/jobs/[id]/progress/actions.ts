"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { normalizeProgressEntry } from "@/lib/progress";
import { requireMember, requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Job, ProgressEntry, ProgressMap } from "@/lib/types";
import { fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ProgressKind = keyof ProgressEntry;
export type ProgressChange = { key: string; kind: ProgressKind; value: number };

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

const KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/** Catalog keys -> labels (RLS: active members read the catalog). */
async function catalog(supabase: Client): Promise<{ labels: Map<string, string>; active: string[] } | string> {
  const { data, error } = await supabase.from("progress_categories").select("key, label, active, sort").order("sort");
  if (error) return `Could not load the categories: ${error.message}`;
  const rows = data ?? [];
  return {
    labels: new Map(rows.map((r) => [r.key, r.label])),
    active: rows.filter((r) => r.active).map((r) => r.key),
  };
}

type JobJson = Pick<Job, "progress" | "enabled_categories" | "updated_at">;

/**
 * Read-modify-write of jobs.progress / jobs.enabled_categories against the
 * freshest row. Each write is conditional on updated_at (bumped by the
 * jobs_set_updated_at trigger), so two phones saving different sliders at the
 * same moment do not erase each other: the loser re-reads and re-applies.
 * The last attempt writes unconditionally so a missing trigger cannot wedge it.
 * edit returns the patch, null for "nothing to change", or an error message.
 */
async function editJob(
  supabase: Client,
  jobId: string,
  edit: (job: JobJson) => Partial<Pick<Job, "progress" | "enabled_categories">> | null | string,
): Promise<{ error: string } | { changed: boolean }> {
  const attempts = 4;
  for (let i = 0; i < attempts; i++) {
    const { data: job, error: readErr } = await supabase
      .from("jobs")
      .select("progress, enabled_categories, updated_at")
      .eq("id", jobId)
      .maybeSingle();
    if (readErr) return { error: `Could not load the job: ${readErr.message}` };
    if (!job) return { error: "That job no longer exists." };
    const patch = edit(job);
    if (typeof patch === "string") return { error: patch };
    if (patch === null) return { changed: false };

    let q = supabase.from("jobs").update(patch).eq("id", jobId);
    if (i < attempts - 1) q = q.eq("updated_at", job.updated_at);
    const { data, error } = await q.select("id");
    if (error) return { error: `Could not save: ${error.message}` };
    if (data && data.length > 0) return { changed: true };
  }
  return { error: "Could not save. You may not have access to this job." };
}

/** Clamp to a whole 0-100 percentage, or null when it is not a number. */
function cleanPercent(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * Save slider moves: jobs.progress[key] = {material, labour}. Anyone active
 * may move sliders. Batches arrive debounced from the page; one activity row
 * per save, in the Phase 1 wording ("Domestic Water material → 45%").
 */
export async function saveProgress(jobId: string, changes: ProgressChange[]): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  if (!Array.isArray(changes) || changes.length === 0) return ok();
  if (changes.length > 100) return fail("Too many changes at once.");

  const clean: ProgressChange[] = [];
  for (const c of changes) {
    const value = cleanPercent(c?.value);
    if (!c || typeof c.key !== "string" || !KEY.test(c.key) || (c.kind !== "material" && c.kind !== "labour") || value === null) {
      return fail("That progress value is not valid.");
    }
    clean.push({ key: c.key, kind: c.kind, value });
  }

  const supabase = await createClient();
  const cat = await catalog(supabase);
  if (typeof cat === "string") return fail(cat);
  if (clean.some((c) => !cat.labels.has(c.key))) return fail("That category is not in the catalog.");

  let applied: ProgressChange[] = [];
  const r = await editJob(supabase, jobId, (job) => {
    const next: ProgressMap = { ...(job.progress ?? {}) };
    applied = [];
    for (const c of clean) {
      const entry = normalizeProgressEntry(next[c.key]);
      if (entry[c.kind] === c.value) continue;
      next[c.key] = { ...entry, [c.kind]: c.value };
      applied.push(c);
    }
    return applied.length > 0 ? { progress: next } : null;
  });
  if ("error" in r) return fail(r.error);
  if (!r.changed) return ok();

  // Latest value per category + kind, grouped by category, in the order moved.
  const byCat = new Map<string, Map<ProgressKind, number>>();
  for (const c of applied) {
    const m = byCat.get(c.key) ?? new Map<ProgressKind, number>();
    m.set(c.kind, c.value);
    byCat.set(c.key, m);
  }
  const description = [...byCat.entries()]
    .map(([key, m]) => `${cat.labels.get(key) ?? key} ${[...m.entries()].map(([k, v]) => `${k} → ${v}%`).join(", ")}`)
    .join("; ");
  await logActivity(supabase, {
    jobId,
    type: "progress",
    description,
    metadata: { changes: applied },
  });
  refresh(jobId);
  return ok();
}

/**
 * Turn one category on or off for this job (jobs.enabled_categories).
 * Managers and above only (role_catalog.is_admin). Progress for a category
 * that is turned off stays in jobs.progress, so turning it back on restores it.
 * An empty list means "all categories" (lib/progress), so the last one stays on.
 */
export async function setCategoryEnabled(jobId: string, key: string, on: boolean): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!member.admin) return fail("Only managers can change which categories apply to a job.");
  if (!isUuid(jobId) || typeof key !== "string" || !KEY.test(key) || typeof on !== "boolean") {
    return fail("Unknown category.");
  }

  const supabase = await createClient();
  const cat = await catalog(supabase);
  if (typeof cat === "string") return fail(cat);
  if (!cat.labels.has(key) || (on && !cat.active.includes(key))) return fail("That category is not in the catalog.");

  const r = await editJob(supabase, jobId, (job) => {
    const current = job.enabled_categories;
    const base = current && current.length > 0 ? current : cat.active;
    const set = new Set(base);
    if (set.has(key) === on) return null;
    if (on) set.add(key);
    else set.delete(key);
    if (!cat.active.some((k) => set.has(k))) return "Keep at least one category on this job.";
    // Catalog order first; keys no longer in the catalog are kept at the end.
    const order = [...cat.labels.keys()];
    const next = [...set].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
    });
    return { enabled_categories: next };
  });
  if ("error" in r) return fail(r.error);
  if (!r.changed) return ok();

  const label = cat.labels.get(key) ?? key;
  await logActivity(supabase, {
    jobId,
    type: "progress",
    description: on ? `${label} added to job` : `${label} removed from job`,
    metadata: { category: key, enabled: on },
  });
  refresh(jobId);
  return ok();
}
