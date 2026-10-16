// Company schedule: pure helpers shared by the server page, the client board
// and the Today view. No Supabase here, so client components can import it.
//
// All dates are plain YYYY-MM-DD strings compared as strings or through
// lib/dates (pure calendar maths); "today" always comes from the org timezone.

import { addDays, dayNumber, diffDays, formatDate } from "@/lib/dates";
import type { ScheduleEvent, ScheduleEventType } from "@/lib/types";

export type EventTypeMeta = { label: string; short: string; color: string };

/** Labels and colours from the Phase 1 ScheduleView. */
export const EVENT_TYPE_META: Record<ScheduleEventType, EventTypeMeta> = {
  holiday: { label: "Stat Holiday", short: "Holiday", color: "var(--color-ok)" },
  vacation: { label: "Vacation / Time Off", short: "Vacation", color: "var(--color-secondary)" },
  dayoff: { label: "Day Off", short: "Day off", color: "var(--color-warn)" },
  event: { label: "Company Event", short: "Event", color: "var(--color-primary)" },
};

/** The types that name a person (the Who field). */
export function typeHasWho(type: ScheduleEventType): boolean {
  return type !== "holiday";
}

/** Last day of an event: its end date when set and not before the start, else the start. */
export function eventEnd(e: Pick<ScheduleEvent, "start_date" | "end_date">): string {
  return e.end_date && e.end_date > e.start_date ? e.end_date : e.start_date;
}

/** Still to come or happening now (ends today or later). */
export function isUpcoming(e: Pick<ScheduleEvent, "start_date" | "end_date">, today: string): boolean {
  return eventEnd(e) >= today;
}

/** Number of calendar days an event covers (1 for a single day). */
export function eventDays(e: Pick<ScheduleEvent, "start_date" | "end_date">): number {
  return diffDays(e.start_date, eventEnd(e)) + 1;
}

/** "TODAY" / "TOMORROW" / "IN 5D" / "ON NOW" / "3D AGO", or "" when far off. */
export function dayLabel(e: Pick<ScheduleEvent, "start_date" | "end_date">, today: string): string {
  const end = eventEnd(e);
  if (e.start_date < today && end >= today) return "ON NOW";
  const until = diffDays(today, e.start_date);
  if (until === 0) return "TODAY";
  if (until === 1) return "TOMORROW";
  if (until > 1 && until <= 14) return `IN ${until}D`;
  const ago = diffDays(end, today);
  if (ago >= 1 && ago <= 7) return `${ago}D AGO`;
  return "";
}

/** "Thu, Dec 24 → Sat, Jan 2, 2027" (the end's year is shown when it differs from the start's). */
export function dateRangeLabel(start: string, end: string | null): string {
  const short: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const first = formatDate(start, short);
  if (!end || end <= start) return first;
  const sameYear = end.slice(0, 4) === start.slice(0, 4);
  return `${first} → ${formatDate(end, sameYear ? short : { ...short, year: "numeric" })}`;
}

/** YYYY-MM month key of a date string. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** "OCTOBER 2026" for a YYYY-MM key. */
export function monthLabel(key: string): string {
  return formatDate(`${key}-01`, { month: "long", year: "numeric" }).toUpperCase();
}

export type MonthGroup<T> = { key: string; label: string; items: T[] };

/** Groups events (already sorted) by the month they start in, keeping the given order. */
export function groupByMonth<T extends Pick<ScheduleEvent, "start_date">>(events: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const e of events) {
    const key = monthKey(e.start_date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: monthLabel(key), items: [e] });
  }
  return groups;
}

// ---------- statutory holidays ----------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 0 = Sunday ... 6 = Saturday (1970-01-01 was a Thursday). */
export function weekday(isoDate: string): number {
  return (((dayNumber(isoDate) + 4) % 7) + 7) % 7;
}

/** The nth (1-based) given weekday of a month, e.g. the 3rd Monday of February. */
function nthWeekday(year: number, month: number, dow: number, n: number): string {
  const first = iso(year, month, 1);
  return addDays(first, ((dow - weekday(first) + 7) % 7) + 7 * (n - 1));
}

/** The last Monday strictly before a date (Victoria Day: the Monday before May 25). */
function mondayBefore(year: number, month: number, day: number): string {
  const target = iso(year, month, day);
  const back = (weekday(target) + 6) % 7 || 7;
  return addDays(target, -back);
}

/** Western (Gregorian) Easter Sunday: the anonymous Meeus/Jones/Butcher algorithm. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

export type StatHoliday = { key: string; title: string; date: string };

/** True when org_settings.region means British Columbia. */
export function isBC(region: string | null | undefined): boolean {
  return /^\s*(bc|b\.c\.|british columbia)\s*$/i.test(region ?? "");
}

/** Years the holiday helper offers: this year and the next two. */
export function holidayYears(today: string): number[] {
  const y = Number(today.slice(0, 4));
  return [y, y + 1, y + 2];
}

/**
 * The 11 BC statutory holidays (Employment Standards Act) for a year, in date order.
 * Canada Day moves to July 2 when July 1 is a Sunday (Holidays Act).
 */
export function bcStatHolidays(year: number): StatHoliday[] {
  const july1 = iso(year, 7, 1);
  const canadaSunday = weekday(july1) === 0;
  const list: StatHoliday[] = [
    { key: "new_year", title: "New Year's Day", date: iso(year, 1, 1) },
    { key: "family_day", title: "Family Day", date: nthWeekday(year, 2, 1, 3) },
    { key: "good_friday", title: "Good Friday", date: addDays(easterSunday(year), -2) },
    { key: "victoria_day", title: "Victoria Day", date: mondayBefore(year, 5, 25) },
    {
      key: "canada_day",
      title: canadaSunday ? "Canada Day (observed)" : "Canada Day",
      date: canadaSunday ? iso(year, 7, 2) : july1,
    },
    { key: "bc_day", title: "BC Day", date: nthWeekday(year, 8, 1, 1) },
    { key: "labour_day", title: "Labour Day", date: nthWeekday(year, 9, 1, 1) },
    { key: "truth_reconciliation", title: "National Day for Truth and Reconciliation", date: iso(year, 9, 30) },
    { key: "thanksgiving", title: "Thanksgiving", date: nthWeekday(year, 10, 1, 2) },
    { key: "remembrance_day", title: "Remembrance Day", date: iso(year, 11, 11) },
    { key: "christmas", title: "Christmas Day", date: iso(year, 12, 25) },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Is this holiday already on the schedule? A holiday-type event on the same
 * date counts, and so does one with the same title in the same year (a
 * hand-entered holiday on a slightly different date is not added twice).
 */
export function holidayPresent(
  h: StatHoliday,
  events: readonly Pick<ScheduleEvent, "title" | "event_type" | "start_date">[],
): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(observed\)/g, "")
      .replace(/[^a-z]/g, "");
  const title = norm(h.title);
  const year = h.date.slice(0, 4);
  return events.some(
    (e) =>
      e.event_type === "holiday" &&
      (e.start_date === h.date || (e.start_date.slice(0, 4) === year && norm(e.title) === title)),
  );
}
