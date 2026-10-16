"use server";

import { revalidatePath } from "next/cache";
import { addDays, todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { requireMember, requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  blankRow,
  cleanRow,
  isRowId,
  NO_PERIOD_MESSAGE,
  normalizeRows,
  resolvePeriods,
  sheetTotals,
} from "@/lib/timesheets";
import type { Timesheet, TimesheetRow } from "@/lib/types";
import { cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

// Timesheet events are deliberately NOT written to activity_log: every active
// member can read that table (activity_member_read), and whose sheet exists,
// when it was submitted and whether it was approved is private per employee.
// The sheet row itself carries the history (submitted_at, approved_by,
// approved_at), and only the employee and managers can read it.

type Client = Awaited<ReturnType<typeof createClient>>;
type SheetHead = Pick<Timesheet, "id" | "approved" | "rows">;

function refresh(id?: string) {
  revalidatePath("/timesheets");
  if (id) revalidatePath(`/timesheets/${id}`);
}

async function loadHead(supabase: Client, id: string): Promise<SheetHead | null> {
  const { data } = await supabase
    .from("timesheets")
    .select("id, approved, rows")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

const LOCKED = "This timesheet is approved and locked. Un-approve it first to make changes.";
const NOT_SAVED = "Not saved: you can no longer change this timesheet.";

/**
 * Write rows + the four totals (always recomputed here). An empty result means
 * RLS filtered the row out (e.g. it was approved meanwhile), so say so.
 */
async function writeRows(supabase: Client, id: string, rows: TimesheetRow[]): Promise<string | null> {
  const { data, error } = await supabase
    .from("timesheets")
    .update({ rows, ...sheetTotals(rows) })
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  if (!data || data.length === 0) return NOT_SAVED;
  return null;
}

// ---------- create ----------

export type CreateResult = { ok: true; id: string; existed: boolean } | { ok: false; error: string };

/**
 * Start a sheet for the current or previous pay period. The period is worked
 * out here (never taken from the browser). If the sheet already exists, its id
 * comes back so the caller can open it. Managers may start one for anyone.
 * No sheet is created until the company has a pay-period anchor: a guessed
 * period would overlap the next one and lock once the anchor is set.
 */
export async function createTimesheet(which: unknown, employeeId: unknown): Promise<CreateResult> {
  const m = await requireMemberWithRole();
  if (which !== "current" && which !== "previous") return { ok: false, error: "Pick a pay period." };

  const supabase = await createClient();
  const org = await getOrg();
  const periods = await resolvePeriods(supabase, todayInZone(org.timezone));
  if (periods.source !== "anchor") return { ok: false, error: NO_PERIOD_MESSAGE };
  const week2 = which === "previous" ? periods.previous : periods.current;

  let forId = m.userId;
  let forName = m.profile.name?.trim() || m.email;
  if (isUuid(employeeId) && employeeId !== m.userId) {
    if (!m.admin) return { ok: false, error: "Only managers can start a timesheet for someone else." };
    const { data: person } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", employeeId)
      .maybeSingle();
    if (!person) return { ok: false, error: "That crew member could not be found." };
    forId = person.id;
    forName = person.name?.trim() || person.email;
  }

  const { data: existing } = await supabase
    .from("timesheets")
    .select("id")
    .eq("employee_id", forId)
    .eq("week2_ending", week2)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id, existed: true };

  const rows = [blankRow(crypto.randomUUID())];
  const { data, error } = await supabase
    .from("timesheets")
    .insert({
      employee_id: forId,
      employee_name: forName,
      week1_ending: addDays(week2, -7),
      week2_ending: week2,
      rows,
      ...sheetTotals(rows),
      approved: false,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "The timesheet was not created." };

  refresh();
  return { ok: true, id: data.id, existed: false };
}

// ---------- rows (saved one line at a time, on blur) ----------

/**
 * Save one job line. Re-reads the freshest rows and replaces (or appends) only
 * this line, so a manager and the employee editing different lines do not
 * clobber each other.
 */
export async function saveRow(sheetId: unknown, row: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId)) return fail("Unknown timesheet.");
  const clean = cleanRow(row);
  if (typeof clean === "string") return fail(clean);

  const supabase = await createClient();
  const sheet = await loadHead(supabase, sheetId);
  if (!sheet) return fail("That timesheet no longer exists.");
  if (sheet.approved) return fail(LOCKED);

  const rows = normalizeRows(sheet.rows);
  const idx = rows.findIndex((r) => r.id === clean.id);
  const next = idx >= 0 ? rows.map((r, i) => (i === idx ? clean : r)) : [...rows, clean];
  const err = await writeRows(supabase, sheetId, next);
  if (err) return fail(err);

  refresh();
  return ok();
}

export async function removeRow(sheetId: unknown, rowId: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId) || !isRowId(rowId)) return fail("Unknown timesheet line.");

  const supabase = await createClient();
  const sheet = await loadHead(supabase, sheetId);
  if (!sheet) return fail("That timesheet no longer exists.");
  if (sheet.approved) return fail(LOCKED);

  const rows = normalizeRows(sheet.rows);
  const next = rows.filter((r) => r.id !== rowId);
  if (next.length === rows.length) return ok(); // never saved; nothing to remove
  const err = await writeRows(supabase, sheetId, next);
  if (err) return fail(err);

  refresh();
  return ok();
}

// ---------- notes, submit ----------

export async function saveNotes(sheetId: unknown, notes: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId)) return fail("Unknown timesheet.");
  const supabase = await createClient();
  const sheet = await loadHead(supabase, sheetId);
  if (!sheet) return fail("That timesheet no longer exists.");
  if (sheet.approved) return fail(LOCKED);

  const { data, error } = await supabase
    .from("timesheets")
    .update({ notes: cleanText(notes, 2000) })
    .eq("id", sheetId)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail(NOT_SAVED);

  refresh(sheetId);
  return ok();
}

/** Mark the sheet as handed in (submitted_at = now). Submitting again re-stamps it. */
export async function submitTimesheet(sheetId: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId)) return fail("Unknown timesheet.");
  const supabase = await createClient();
  const sheet = await loadHead(supabase, sheetId);
  if (!sheet) return fail("That timesheet no longer exists.");
  if (sheet.approved) return fail(LOCKED);

  const { data, error } = await supabase
    .from("timesheets")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", sheetId)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail(NOT_SAVED);

  refresh(sheetId);
  return ok();
}

// ---------- approval (managers) ----------

/**
 * Approve or un-approve. The database is the lock: it stamps the real
 * approver, refuses self-approval and refuses non-approvers, and those
 * messages come back verbatim.
 */
export async function setApproval(sheetId: unknown, approve: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId) || typeof approve !== "boolean") return fail("Unknown timesheet.");
  const supabase = await createClient();
  const sheet = await loadHead(supabase, sheetId);
  if (!sheet) return fail("That timesheet no longer exists.");
  if (sheet.approved === approve) return ok();

  const { data, error } = await supabase
    .from("timesheets")
    .update({ approved: approve })
    .eq("id", sheetId)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Not saved: only managers can approve timesheets.");

  refresh(sheetId);
  return ok();
}

/** Managers only (RLS timesheets_admin_delete). */
export async function deleteTimesheet(sheetId: unknown): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(sheetId)) return fail("Unknown timesheet.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .delete()
    .eq("id", sheetId)
    .select("id");
  if (error) return fail(error.message);
  if (!data?.[0]) return fail("Not deleted: only managers can delete timesheets.");

  refresh();
  return ok();
}
