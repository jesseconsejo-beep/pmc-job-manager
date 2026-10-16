"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { formatDate } from "@/lib/dates";
import { bcStatHolidays, EVENT_TYPE_META, holidayPresent, isBC, typeHasWho } from "@/lib/schedule-shared";
import { requireMember, requireMemberWithRole, type Member } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_EVENT_TYPES, type ScheduleEvent, type ScheduleEventType } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

/*
 * Company schedule (schedule_events). RLS lets any active member read and
 * write every row; the app adds one rule on top: an event is changed or
 * removed only by the person who added it or by an admin. The bulk BC
 * stat-holiday helper is for admins.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

export type EventInput = {
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  /** Profile id from the crew picker, or "" */
  who_id: string;
  /** Free-text name when the person has no profile, or "" */
  who_text: string;
  notes: string;
};

type CleanEvent = Pick<ScheduleEvent, "title" | "event_type" | "start_date" | "end_date" | "who_id" | "who_text" | "notes">;

function isEventType(v: unknown): v is ScheduleEventType {
  return typeof v === "string" && (SCHEDULE_EVENT_TYPES as readonly string[]).includes(v);
}

async function clean(supabase: Client, input: EventInput): Promise<CleanEvent | string> {
  if (!input || typeof input !== "object") return "Missing event details.";
  const title = cleanText(input.title, 200);
  if (!title) return "Give the event a title.";
  if (!isEventType(input.event_type)) return "Pick a type.";
  const start = cleanDate(input.start_date);
  if (!start) return "Pick a start date.";
  const endRaw = cleanDate(input.end_date);
  if (input.end_date?.trim() && !endRaw) return "The end date is not a valid date.";
  if (endRaw && endRaw < start) return "The end date is before the start date.";
  const end = endRaw && endRaw > start ? endRaw : null;

  let whoId: string | null = null;
  let whoText: string | null = null;
  if (typeHasWho(input.event_type)) {
    if (isUuid(input.who_id)) {
      const { data } = await supabase.from("profiles").select("id, name, email").eq("id", input.who_id).maybeSingle();
      if (!data) return "That person is not on the crew list.";
      whoId = data.id;
      // Keep the name as text too, so the event still reads right if the profile is removed.
      whoText = data.name?.trim() || data.email.split("@")[0] || data.email;
    } else {
      whoText = cleanText(input.who_text, 120);
    }
  }

  return {
    title,
    event_type: input.event_type,
    start_date: start,
    end_date: end,
    who_id: whoId,
    who_text: whoText,
    notes: cleanText(input.notes, 2000),
  };
}

function when(start: string, end: string | null): string {
  const s = formatDate(start, { month: "short", day: "numeric", year: "numeric" });
  return end ? `${s} → ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}` : s;
}

function canChange(member: Member, event: Pick<ScheduleEvent, "created_by">): boolean {
  return member.admin || (event.created_by !== null && event.created_by === member.userId);
}

export async function addEvent(input: EventInput): Promise<ActionResult> {
  const viewer = await requireMember();
  const supabase = await createClient();
  const row = await clean(supabase, input);
  if (typeof row === "string") return fail(row);

  const { error } = await supabase.from("schedule_events").insert({ ...row, created_by: viewer.userId });
  if (error) return fail(`Could not add the event: ${error.message}`);
  await logActivity(supabase, {
    type: "schedule",
    description: `${EVENT_TYPE_META[row.event_type].short} added: ${row.title} (${when(row.start_date, row.end_date)})`,
  });
  refresh();
  return ok();
}

export async function updateEvent(id: string, input: EventInput): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown event.");
  const supabase = await createClient();
  const { data: current } = await supabase.from("schedule_events").select("*").eq("id", id).maybeSingle();
  if (!current) return fail("That event no longer exists.");
  if (!canChange(member, current)) return fail("Only the person who added this event, or an admin, can change it.");

  const row = await clean(supabase, input);
  if (typeof row === "string") return fail(row);
  const { data, error } = await supabase.from("schedule_events").update(row).eq("id", id).select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data || data.length === 0) return fail("The event was not saved. Reload and try again.");

  const moved = row.start_date !== current.start_date || row.end_date !== current.end_date;
  await logActivity(supabase, {
    type: "schedule",
    description: moved
      ? `Event moved: ${row.title} (${when(row.start_date, row.end_date)})`
      : `Event updated: ${row.title}`,
  });
  refresh();
  return ok();
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown event.");
  const supabase = await createClient();
  const { data: current } = await supabase.from("schedule_events").select("*").eq("id", id).maybeSingle();
  if (!current) {
    refresh();
    return ok();
  }
  if (!canChange(member, current)) return fail("Only the person who added this event, or an admin, can delete it.");

  const { data, error } = await supabase.from("schedule_events").delete().eq("id", id).select("id");
  if (error) return fail(`Could not delete: ${error.message}`);
  if (data && data.length > 0) {
    await logActivity(supabase, {
      type: "schedule",
      description: `Event removed: ${current.title} (${when(current.start_date, current.end_date)})`,
    });
  }
  refresh();
  return ok();
}

/**
 * Adds the BC statutory holidays for a year (all of them, or only `keys`),
 * skipping any already on the schedule. Dates are computed here, never taken
 * from the browser. Admins only, and only when org_settings.region is BC.
 */
export async function addStatHolidays(year: number, keys?: string[]): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!member.admin) return fail("Only an admin can add the stat holidays.");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail("Pick a year.");

  const supabase = await createClient();
  const { data: settings } = await supabase.from("org_settings").select("region").limit(1).maybeSingle();
  if (!isBC(settings?.region)) return fail("The stat-holiday helper only knows BC holidays.");

  let wanted = bcStatHolidays(year);
  if (Array.isArray(keys)) {
    const set = new Set(keys.filter((k) => typeof k === "string"));
    wanted = wanted.filter((h) => set.has(h.key));
  }
  if (wanted.length === 0) return fail("Nothing to add.");

  const { data: existing, error: readErr } = await supabase
    .from("schedule_events")
    .select("title, event_type, start_date")
    .eq("event_type", "holiday")
    .gte("start_date", `${year}-01-01`)
    .lte("start_date", `${year}-12-31`);
  if (readErr) return fail(`Could not check the schedule: ${readErr.message}`);

  const missing = wanted.filter((h) => !holidayPresent(h, existing ?? []));
  if (missing.length === 0) {
    refresh();
    return ok();
  }

  const { error } = await supabase.from("schedule_events").insert(
    missing.map((h) => ({
      title: h.title,
      event_type: "holiday" as const,
      start_date: h.date,
      created_by: member.userId,
    })),
  );
  if (error) return fail(`Could not add the holidays: ${error.message}`);

  await logActivity(supabase, {
    type: "schedule",
    description:
      missing.length === 1
        ? `Stat holiday added: ${missing[0].title} (${when(missing[0].date, null)})`
        : `${missing.length} BC stat holidays added for ${year}`,
    metadata: { year, holidays: missing.map((h) => h.key) },
  });
  refresh();
  return ok();
}
