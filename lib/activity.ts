import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * event_type values written by this app (activity_log.event_type is free text).
 * No "timesheet": every active member can read activity_log, and timesheet
 * events (whose sheet, submitted, approved) are private per employee.
 */
export type ActivityType =
  | "job_created" | "update" | "contact" | "task"
  | "rfi" | "change_order" | "material" | "tool" | "photo" | "file" | "progress"
  | "service" | "schedule" | "bulletin" | "library";

/**
 * Append one activity_log row. The database stamps user_id, user_name and
 * occurred_at itself (stamp_activity_actor), so the client cannot forge them.
 * Returns an error message, or null on success.
 */
export async function logActivity(
  supabase: Client,
  entry: {
    jobId?: string | null;
    serviceCallId?: string | null;
    type: ActivityType;
    description: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  const { error } = await supabase.from("activity_log").insert({
    job_id: entry.jobId ?? null,
    service_call_id: entry.serviceCallId ?? null,
    event_type: entry.type,
    description: entry.description.slice(0, 500),
    metadata: entry.metadata ?? null,
  });
  return error ? error.message : null;
}
