"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { subitemsOf } from "@/lib/tasks";
import type { Subitem, Task } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

function cleanAssignee(v: unknown): string | null {
  return isUuid(v) ? v : null;
}

async function personName(supabase: Client, id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("name, email").eq("id", id).maybeSingle();
  return data ? data.name?.trim() || data.email : null;
}

async function loadTask(supabase: Client, jobId: string, taskId: string): Promise<Task | null> {
  const { data } = await supabase.from("tasks").select("*").eq("id", taskId).eq("job_id", jobId).maybeSingle();
  return data ?? null;
}

// ---------- top-level tasks and checklists ----------

export type NewTaskInput = { text: string; note: string; due_date: string; assignee_id: string };

export async function addTask(jobId: string, input: NewTaskInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const text = cleanText(input.text, 500);
  if (!text) return fail("Say what needs doing.");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    job_id: jobId,
    kind: "task",
    text,
    note: cleanText(input.note, 1000),
    due_date: cleanDate(input.due_date),
    assignee_id: cleanAssignee(input.assignee_id),
    created_by: viewer.userId,
  });
  if (error) return fail(`Could not add the task: ${error.message}`);
  await logActivity(supabase, { jobId, type: "task", description: `Task added: ${text}` });
  refresh(jobId);
  return ok();
}

export async function addChecklist(jobId: string, name: string): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const text = cleanText(name, 200);
  if (!text) return fail("Give the checklist a name.");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    job_id: jobId,
    kind: "folder",
    text,
    subitems: [],
    expanded: true,
    created_by: viewer.userId,
  });
  if (error) return fail(`Could not add the checklist: ${error.message}`);
  await logActivity(supabase, { jobId, type: "task", description: `List added: ${text}` });
  refresh(jobId);
  return ok();
}

export type TaskPatch = {
  text?: string;
  note?: string;
  due_date?: string;
  assignee_id?: string;
  done?: boolean;
};

export async function updateTask(jobId: string, taskId: string, patch: TaskPatch): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(taskId)) return fail("Unknown task.");
  const supabase = await createClient();
  const current = await loadTask(supabase, jobId, taskId);
  if (!current) return fail("That task no longer exists.");

  const update: Partial<Task> = {};
  if (patch.text !== undefined) {
    const text = cleanText(patch.text, current.kind === "folder" ? 200 : 500);
    if (!text) return fail(current.kind === "folder" ? "The checklist needs a name." : "The task needs some text.");
    update.text = text;
  }
  if (patch.note !== undefined) update.note = cleanText(patch.note, 1000);
  if (patch.due_date !== undefined) update.due_date = cleanDate(patch.due_date);
  if (patch.assignee_id !== undefined) update.assignee_id = cleanAssignee(patch.assignee_id);
  if (patch.done !== undefined && current.kind === "task") {
    update.done = patch.done;
    update.completed_at = patch.done ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) return ok();

  const { error } = await supabase.from("tasks").update(update).eq("id", taskId).eq("job_id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const label = update.text ?? current.text;
  let description: string;
  if (update.done !== undefined && update.done !== current.done) {
    description = update.done ? `Completed: ${label}` : `Reopened: ${label}`;
  } else if (current.kind === "folder" && update.text && update.text !== current.text) {
    description = `Checklist renamed: ${update.text}`;
  } else if (patch.assignee_id !== undefined && Object.keys(update).length === 1) {
    const who = await personName(supabase, update.assignee_id ?? null);
    description = who ? `Assigned to ${who}: ${label}` : `Unassigned: ${label}`;
  } else {
    description = `Task updated: ${label}`;
  }
  await logActivity(supabase, { jobId, type: "task", description });
  refresh(jobId);
  return ok();
}

export async function deleteTask(jobId: string, taskId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(taskId)) return fail("Unknown task.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("job_id", jobId)
    .select("text, kind");
  if (error) return fail(`Could not remove: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await logActivity(supabase, {
      jobId,
      type: "task",
      description: removed.kind === "folder" ? `Checklist removed: ${removed.text}` : `Removed: ${removed.text}`,
    });
  }
  refresh(jobId);
  return ok();
}

// ---------- checklist subitems (tasks.subitems jsonb) ----------
// Each change re-reads the row and edits the freshest array, so two people
// ticking different lines at the same moment rarely clobber each other.

async function writeSubitems(
  supabase: Client,
  jobId: string,
  taskId: string,
  edit: (items: Subitem[]) => Subitem[] | string,
): Promise<{ error: string } | { folder: Task; before: Subitem[]; after: Subitem[] }> {
  const folder = await loadTask(supabase, jobId, taskId);
  if (!folder || folder.kind !== "folder") return { error: "That checklist no longer exists." };
  const before = subitemsOf(folder);
  const after = edit(before);
  if (typeof after === "string") return { error: after };
  const { error } = await supabase.from("tasks").update({ subitems: after }).eq("id", taskId).eq("job_id", jobId);
  if (error) return { error: `Could not save: ${error.message}` };
  return { folder, before, after };
}

export async function addSubitem(jobId: string, taskId: string, text: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(taskId)) return fail("Unknown checklist.");
  const clean = cleanText(text, 500);
  if (!clean) return fail("Type the subtask first.");

  const supabase = await createClient();
  const sub: Subitem = {
    id: crypto.randomUUID(),
    text: clean,
    done: false,
    due_date: null,
    assignee_id: null,
    created_at: new Date().toISOString(),
  };
  const r = await writeSubitems(supabase, jobId, taskId, (items) => [...items, sub]);
  if ("error" in r) return fail(r.error);
  await logActivity(supabase, { jobId, type: "task", description: `Subtask added: ${clean} (${r.folder.text})` });
  refresh(jobId);
  return ok();
}

export type SubitemPatch = { text?: string; done?: boolean; due_date?: string; assignee_id?: string };

export async function updateSubitem(
  jobId: string,
  taskId: string,
  subId: string,
  patch: SubitemPatch,
): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(taskId) || typeof subId !== "string" || !subId) return fail("Unknown subtask.");

  const supabase = await createClient();
  let target: Subitem | null = null;
  let updated: Subitem | null = null;
  const r = await writeSubitems(supabase, jobId, taskId, (items) => {
    const idx = items.findIndex((s) => s.id === subId);
    if (idx < 0) return "That subtask no longer exists.";
    target = items[idx];
    const next: Subitem = { ...target };
    if (patch.text !== undefined) {
      const t = cleanText(patch.text, 500);
      if (!t) return "The subtask needs some text.";
      next.text = t;
    }
    if (patch.done !== undefined) {
      next.done = patch.done;
      next.completed_at = patch.done ? new Date().toISOString() : null;
    }
    if (patch.due_date !== undefined) next.due_date = cleanDate(patch.due_date);
    if (patch.assignee_id !== undefined) next.assignee_id = cleanAssignee(patch.assignee_id);
    updated = next;
    return items.map((s, i) => (i === idx ? next : s));
  });
  if ("error" in r) return fail(r.error);

  const before = target as Subitem | null;
  const after = updated as Subitem | null;
  if (before && after) {
    let description: string;
    if (patch.done !== undefined && before.done !== after.done) {
      description = after.done ? `Done: ${after.text}` : `Reopened: ${after.text}`;
    } else if (patch.due_date !== undefined) {
      description = after.due_date ? `Date set: ${after.text}` : `Date cleared: ${after.text}`;
    } else if (patch.assignee_id !== undefined) {
      const who = await personName(supabase, after.assignee_id);
      description = who ? `Assigned to ${who}: ${after.text}` : `Unassigned: ${after.text}`;
    } else {
      description = `Subtask updated: ${after.text}`;
    }
    await logActivity(supabase, { jobId, type: "task", description: `${description} (${r.folder.text})` });
  }
  refresh(jobId);
  return ok();
}

export async function removeSubitem(jobId: string, taskId: string, subId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(taskId) || typeof subId !== "string" || !subId) return fail("Unknown subtask.");
  const supabase = await createClient();
  let removed: string | null = null;
  const r = await writeSubitems(supabase, jobId, taskId, (items) => {
    removed = items.find((s) => s.id === subId)?.text ?? null;
    return items.filter((s) => s.id !== subId);
  });
  if ("error" in r) return fail(r.error);
  if (removed) {
    await logActivity(supabase, { jobId, type: "task", description: `Subtask removed: ${removed} (${r.folder.text})` });
  }
  refresh(jobId);
  return ok();
}
