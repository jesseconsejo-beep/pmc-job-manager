// Server-side reads of the company schedule (schedule_events) for other
// pages, e.g. the Today view. Runs with the caller's session, so RLS decides
// what comes back. Client components import lib/schedule-shared instead.

import { addDays, diffDays, todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleEvent } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type UpcomingEvent = ScheduleEvent & {
  /** Display name for Who: the profile's current name, else the stored text. */
  who_name: string | null;
  /** Days from today (org timezone) to the start; negative while it is already running. */
  days_until: number;
};

/**
 * Events that start within the next `days` days, plus any already running
 * (a vacation that began last week and ends after today), soonest first.
 * Dates are compared against today in the org timezone.
 */
export async function upcomingEvents(days = 14, client?: Client): Promise<UpcomingEvent[]> {
  const supabase = client ?? (await createClient());
  const org = await getOrg();
  const today = todayInZone(org.timezone);
  const horizon = addDays(today, Math.max(0, Math.floor(days)));

  const { data, error } = await supabase
    .from("schedule_events")
    .select("*")
    .lte("start_date", horizon)
    .or(`end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`)
    .order("start_date")
    .order("created_at");
  if (error || !data) return [];

  const ids = [...new Set(data.map((e) => e.who_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: people } = await supabase.from("profiles").select("id, name, email").in("id", ids);
    for (const p of people ?? []) names.set(p.id, p.name?.trim() || p.email.split("@")[0] || p.email);
  }

  return data
    .filter((e) => (e.end_date && e.end_date > e.start_date ? e.end_date : e.start_date) >= today)
    .map((e) => ({
      ...e,
      who_name: (e.who_id ? names.get(e.who_id) : null) ?? e.who_text ?? null,
      days_until: diffDays(today, e.start_date),
    }));
}
