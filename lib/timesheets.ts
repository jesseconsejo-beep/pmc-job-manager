// Timesheet helpers shared by the list, the editor and the server actions.
// Pure functions only, plus loaders that take the caller's Supabase client,
// so this module is safe to import from client components.

import { addDays, dayNumber, formatDate, isIsoDate } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";
import type { HourCell, Job, ServiceCall, Timesheet, TimesheetRow } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Two weeks, first day of week 1 first (matches PMC's Excel sheet). */
export const SHEET_DAYS = 14;
/** Most hours one cell (one job line, one day) may hold. */
export const MAX_DAY_HOURS = 24;

export type HourKind = keyof HourCell;
export const HOUR_KINDS: readonly HourKind[] = ["reg", "ot", "dt"];
export const HOUR_LABEL: Record<HourKind, string> = { reg: "Reg", ot: "OT", dt: "DT" };
export const HOUR_TITLE: Record<HourKind, string> = { reg: "Regular", ot: "Overtime", dt: "Double time" };

// ---------- rows ----------

export function blankCell(): HourCell {
  return { reg: null, ot: null, dt: null };
}

export function blankRow(id: string): TimesheetRow {
  return { id, job_code: null, job_name: null, hours: Array.from({ length: SHEET_DAYS }, blankCell) };
}

/** Round to 2 decimals so 0.1 + 0.2 never shows up as 0.30000000000000004. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v !== 0 ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) && n !== 0 ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * timesheets.rows as stored (jsonb) -> well-formed rows: every row has an id
 * and exactly 14 cells. Defensive, because jsonb can hold anything.
 */
export function normalizeRows(raw: unknown): TimesheetRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r, i) => {
      const cells = Array.isArray(r.hours) ? r.hours : [];
      const hours = Array.from({ length: SHEET_DAYS }, (_, d): HourCell => {
        const c = cells[d];
        if (typeof c !== "object" || c === null) return blankCell();
        const cell = c as Record<string, unknown>;
        return { reg: num(cell.reg), ot: num(cell.ot), dt: num(cell.dt) };
      });
      return {
        id: str(r.id) ?? `row-${i}`,
        job_code: str(r.job_code),
        job_name: str(r.job_name),
        hours,
      };
    });
}

// ---------- totals ----------

export function cellTotal(c: HourCell): number {
  return (c.reg ?? 0) + (c.ot ?? 0) + (c.dt ?? 0);
}

export function rowTotal(r: TimesheetRow): number {
  return round2(r.hours.reduce((s, c) => s + cellTotal(c), 0));
}

export function dayTotal(rows: readonly TimesheetRow[], day: number): number {
  return round2(rows.reduce((s, r) => s + (r.hours[day] ? cellTotal(r.hours[day]) : 0), 0));
}

/** Week 1 = days 0-6, week 2 = days 7-13. */
export function weekTotal(rows: readonly TimesheetRow[], week: 1 | 2): number {
  const from = week === 1 ? 0 : 7;
  let s = 0;
  for (let d = from; d < from + 7; d++) s += dayTotal(rows, d);
  return round2(s);
}

export function kindTotal(rows: readonly TimesheetRow[], kind: HourKind): number {
  return round2(rows.reduce((s, r) => s + r.hours.reduce((s2, c) => s2 + (c[kind] ?? 0), 0), 0));
}

export type SheetTotals = Pick<Timesheet, "total_hours" | "total_reg" | "total_ot" | "total_dt">;

/** The four total columns, always computed from the rows (never trusted from a client). */
export function sheetTotals(rows: readonly TimesheetRow[]): SheetTotals {
  const total_reg = kindTotal(rows, "reg");
  const total_ot = kindTotal(rows, "ot");
  const total_dt = kindTotal(rows, "dt");
  return { total_reg, total_ot, total_dt, total_hours: round2(total_reg + total_ot + total_dt) };
}

/** "8", "7.5", "7.25"; 0 shows as "0". */
export function fmtHours(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v === 0) return "0";
  return v.toFixed(2).replace(/\.?0+$/, "");
}

// ---------- validation (server actions) ----------

/** One hour value from a client: blank -> null; else 0-24, rounded to 2 decimals. */
function cleanHour(v: unknown): number | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > MAX_DAY_HOURS) return "invalid";
  const r = round2(n);
  return r === 0 ? null : r;
}

const ROW_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isRowId(v: unknown): v is string {
  return typeof v === "string" && ROW_ID.test(v);
}

/** A row from a client, checked and normalised; a string is the reason it was refused. */
export function cleanRow(input: unknown): TimesheetRow | string {
  if (typeof input !== "object" || input === null) return "That line could not be read.";
  const r = input as Record<string, unknown>;
  if (!isRowId(r.id)) return "That line could not be read.";
  const cells = Array.isArray(r.hours) ? r.hours : [];
  if (cells.length > SHEET_DAYS) return "A timesheet line has 14 days.";
  const hours: HourCell[] = [];
  for (let d = 0; d < SHEET_DAYS; d++) {
    const c = cells[d];
    if (c === undefined || c === null) {
      hours.push(blankCell());
      continue;
    }
    if (typeof c !== "object") return "That line could not be read.";
    const cell = c as Record<string, unknown>;
    const reg = cleanHour(cell.reg);
    const ot = cleanHour(cell.ot);
    const dt = cleanHour(cell.dt);
    if (reg === "invalid" || ot === "invalid" || dt === "invalid") {
      return `Hours must be numbers from 0 to ${MAX_DAY_HOURS}.`;
    }
    const next = { reg, ot, dt };
    if (cellTotal(next) > MAX_DAY_HOURS) return `One line cannot hold more than ${MAX_DAY_HOURS} hours in a day.`;
    hours.push(next);
  }
  const code = typeof r.job_code === "string" ? r.job_code.trim().slice(0, 80) : "";
  const name = typeof r.job_name === "string" ? r.job_name.trim().slice(0, 200) : "";
  return { id: r.id, job_code: code || null, job_name: code && name ? name : null, hours };
}

// ---------- the 14 days ----------

export type SheetDay = {
  index: number;
  iso: string;
  week: 1 | 2;
  /** S M T W T F S */
  letter: string;
  /** Day of month, "17". */
  dom: string;
  weekday: number;
};

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** 0 = Sunday ... 6 = Saturday, from the calendar date itself (1970-01-01 was a Thursday). */
export function weekdayOf(iso: string): number {
  return (((dayNumber(iso) + 4) % 7) + 7) % 7;
}

/** The 14 dates a sheet covers: week2_ending - 13 ... week2_ending. Labels come from the real dates. */
export function sheetDays(week2Ending: string): SheetDay[] {
  const first = addDays(week2Ending, -(SHEET_DAYS - 1));
  return Array.from({ length: SHEET_DAYS }, (_, i) => {
    const iso = addDays(first, i);
    const weekday = weekdayOf(iso);
    return { index: i, iso, week: i < 7 ? 1 : 2, letter: LETTERS[weekday], dom: String(Number(iso.slice(8, 10))), weekday };
  });
}

/**
 * The last day of a week that starts on weekStartDow (0 = Sunday), on or after
 * today. With the default week start (Sunday) this is the Saturday on or after today.
 */
export function weekEndOnOrAfter(today: string, weekStartDow: number): string {
  const endDow = (((weekStartDow + 6) % 7) + 7) % 7;
  return addDays(today, (endDow - weekdayOf(today) + 7) % 7);
}

/** "SAT OCT 17" */
export function shortDay(iso: string): string {
  return formatDate(iso, { weekday: "short", month: "short", day: "numeric" }).replace(/,/g, "").toUpperCase();
}

/** "Oct 4 – Oct 17, 2026" for a sheet ending on week2Ending. */
export function periodRange(week2Ending: string): string {
  if (!isIsoDate(week2Ending)) return week2Ending;
  const start = addDays(week2Ending, -(SHEET_DAYS - 1));
  return `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(week2Ending)}`;
}

// ---------- status ----------

export type SheetStatus = "approved" | "submitted" | "draft";

export function sheetStatus(ts: Pick<Timesheet, "approved" | "submitted_at">): SheetStatus {
  if (ts.approved) return "approved";
  if (ts.submitted_at) return "submitted";
  return "draft";
}

export const STATUS_LABEL: Record<SheetStatus, string> = {
  approved: "Approved",
  submitted: "Submitted",
  draft: "Draft",
};

export const STATUS_COLOR: Record<SheetStatus, string> = {
  approved: "var(--color-ok)",
  submitted: "var(--color-primary)",
  draft: "var(--color-faint)",
};

// ---------- job code options ----------

export type JobOptionKind = "contract" | "service" | "other";
export type JobOption = { code: string; label: string; name: string; kind: JobOptionKind };

/**
 * The job-code dropdown: contract jobs as "job_number — job_name", service
 * calls as "service_code — project/customer", plus any code already on the
 * sheet that is no longer in either list (so the select can still show it).
 */
export function buildJobOptions(
  jobs: readonly Pick<Job, "job_number" | "job_name">[],
  calls: readonly Pick<ServiceCall, "service_code" | "project_name" | "company_name" | "customer_name">[],
  rows: readonly TimesheetRow[],
): JobOption[] {
  const seen = new Set<string>();
  const out: JobOption[] = [];
  const push = (o: JobOption) => {
    if (!o.code || seen.has(o.code)) return;
    seen.add(o.code);
    out.push(o);
  };
  for (const j of jobs) {
    const number = j.job_number?.trim() || "";
    const name = j.job_name.trim();
    push({ code: number || name, label: number ? `${number} — ${name}` : name, name, kind: "contract" });
  }
  for (const s of calls) {
    const code = s.service_code?.trim() || "";
    const name = s.project_name?.trim() || s.company_name?.trim() || s.customer_name?.trim() || "Service";
    push({ code: code || name, label: code ? `${code} — ${name}` : name, name, kind: "service" });
  }
  for (const r of rows) {
    if (r.job_code && !seen.has(r.job_code)) {
      push({ code: r.job_code, label: r.job_name ? `${r.job_code} — ${r.job_name}` : r.job_code, name: r.job_name ?? "", kind: "other" });
    }
  }
  return out;
}

// ---------- settings + pay period (server side, caller's session) ----------

export type SheetSettings = {
  weekStartDow: number;
  periodDays: number;
  legalName: string | null;
};

const DEFAULT_SETTINGS: SheetSettings = { weekStartDow: 0, periodDays: 14, legalName: null };

/** The org_settings fields the timesheets need (RLS: any signed-in member may read). */
export async function loadSheetSettings(supabase: Client): Promise<SheetSettings> {
  const { data } = await supabase
    .from("org_settings")
    .select("week_start_dow, pay_period_days, legal_name")
    .limit(1)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  const dow = Number(data.week_start_dow);
  const days = Number(data.pay_period_days);
  return {
    weekStartDow: Number.isInteger(dow) && dow >= 0 && dow <= 6 ? dow : 0,
    periodDays: days === 7 || days === 14 ? days : 14,
    legalName: data.legal_name?.trim() || null,
  };
}

export type Periods = {
  /** week2_ending for the period containing today. */
  current: string;
  /** week2_ending for the period before it. */
  previous: string;
  /** "anchor" = org_settings.pay_period_anchor_end via pay_period_bounds(); "fallback" = no anchor set. */
  source: "anchor" | "fallback";
};

/**
 * Current and previous period ends. pay_period_bounds(d) is the one place the
 * database computes the period (zero rows until an anchor is set); only then
 * fall back to the week end on or after today.
 */
export async function resolvePeriods(supabase: Client, today: string, settings: SheetSettings): Promise<Periods> {
  const { data, error } = await supabase.rpc("pay_period_bounds", { d: today });
  const row = !error && Array.isArray(data) ? data[0] : undefined;
  if (row && isIsoDate(row.period_end) && isIsoDate(row.period_start)) {
    // The day before this period starts is the previous period's end.
    return { current: row.period_end, previous: addDays(row.period_start, -1), source: "anchor" };
  }
  const current = weekEndOnOrAfter(today, settings.weekStartDow);
  return { current, previous: addDays(current, -settings.periodDays), source: "fallback" };
}
