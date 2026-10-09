// Calendar-date helpers that respect the org timezone.
//
// Rules:
//  - A "date" (due_date, start_date, ...) is a plain YYYY-MM-DD string. Compare
//    them as strings or via dayNumber(); never through a local Date.
//  - "Today" is always computed in the org timezone, never with
//    toISOString().slice(0, 10) (that is UTC and flips at 5pm in Vancouver).
//  - Timestamps (created_at, occurred_at) are formatted with the org timezone.

export const DEFAULT_TIMEZONE = "America/Vancouver";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Returns tz if the runtime knows it, otherwise the default. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Year/month/day/hour of an instant as seen in tz. */
function partsInZone(instant: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(fmt.formatToParts(instant).find((p) => p.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

/** YYYY-MM-DD for the calendar day an instant falls on in tz. */
export function dateInZone(instant: Date | string, tz: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const { year, month, day } = partsInZone(d, tz);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today's date (YYYY-MM-DD) in the org timezone. */
export function todayInZone(tz: string, now: Date = new Date()): string {
  return dateInZone(now, tz);
}

/** Current hour (0-23) in tz. */
export function hourInZone(tz: string, now: Date = new Date()): number {
  return partsInZone(now, tz).hour;
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** Days since 1970-01-01 for a YYYY-MM-DD string (pure calendar maths). */
export function dayNumber(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000);
}

/** b - a in whole days. */
export function diffDays(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(iso: string, days: number): string {
  const t = new Date((dayNumber(iso) + days) * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Year of a YYYY-MM-DD string. */
export function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

export type DueBucket = "overdue" | "today" | "week" | "later";

/** Bucket a due date relative to today: overdue / today / within 7 days / later. */
export function dueBucket(due: string, today: string): DueBucket {
  const diff = diffDays(today, due);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

/** Format a YYYY-MM-DD date for display without any timezone shift. */
export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  if (!isIsoDate(iso)) return iso ?? "";
  return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: "UTC" }).format(
    new Date(dayNumber(iso) * 86_400_000),
  );
}

/** Format a timestamp in the org timezone. */
export function formatTimestamp(
  ts: string | Date,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: safeTimeZone(tz) }).format(d);
}

/** Long label for a day, e.g. "THURSDAY, OCTOBER 9". */
export function longDayLabel(iso: string): string {
  return formatDate(iso, { weekday: "long", month: "long", day: "numeric" });
}

/** Short relative time ("now", "5m", "3h", "2d", else "Oct 3") like the Phase 1 feed. */
export function relativeTime(ts: string | Date, tz: string, now: Date = new Date()): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTimestamp(d, tz, { month: "short", day: "numeric" });
}

/** Urgency label used on task rows (matches the Phase 1 getUrgency). */
export function urgencyLabel(due: string, today: string): string {
  const diff = diffDays(today, due);
  if (diff < 0) return `OVERDUE ${Math.abs(diff)}D`;
  if (diff === 0) return "TODAY";
  if (diff <= 7) return `${diff}D`;
  return formatDate(due, { month: "short", day: "numeric" }).toUpperCase();
}
