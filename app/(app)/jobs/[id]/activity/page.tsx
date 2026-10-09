import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { BackLink, Page } from "@/components/ui";
import { addDays, dateInZone, formatDate, formatTimestamp, relativeTime, todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLog } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 200;

const TYPE_COLORS: Record<string, string> = {
  job_created: "var(--color-ok)",
  task: "var(--color-primary)",
  contact: "var(--color-secondary)",
  rfi: "var(--color-warn)",
  co: "var(--color-warn)",
  photo: "var(--color-secondary)",
  progress: "var(--color-primary)",
  update: "var(--color-dim)",
};

export default async function JobActivityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, logRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", id).maybeSingle(),
    supabase
      .from("activity_log")
      .select("*")
      .eq("job_id", id)
      .order("occurred_at", { ascending: false })
      .limit(PAGE_SIZE),
  ]);
  const job = jobRes.data;
  if (!job) notFound();
  const entries = logRes.data ?? [];

  // Group by calendar day in the org timezone, newest day first.
  const groups: { day: string; items: ActivityLog[] }[] = [];
  for (const e of entries) {
    const day = dateInZone(e.occurred_at, org.timezone);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  const today = todayInZone(org.timezone);
  const yesterday = addDays(today, -1);
  const now = new Date();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-2 font-display text-2xl uppercase tracking-[1.5px]">Activity feed</h1>
      <p className="mb-4 text-[11px] text-dim">Every change to this job is logged here with who made it.</p>

      {logRes.error && (
        <div className="mb-4 border border-danger p-3 text-xs text-danger">Could not load activity: {logRes.error.message}</div>
      )}

      {entries.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <Activity size={32} className="mx-auto mb-2" />
          <div className="text-xs">No activity yet</div>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.day} className="mb-5">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="h-px flex-1 bg-line" />
              <h2 className="font-display text-[10px] uppercase tracking-[1.5px] text-dim">
                {g.day === today
                  ? "Today"
                  : g.day === yesterday
                    ? "Yesterday"
                    : formatDate(g.day, { weekday: "short", month: "short", day: "numeric" })}
              </h2>
              <div className="h-px flex-1 bg-line" />
            </div>
            <ul className="grid gap-1">
              {g.items.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between gap-2.5 border border-line bg-surface px-2.5 py-2"
                  style={{ borderLeft: `3px solid ${TYPE_COLORS[a.event_type] ?? "var(--color-dim)"}` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-xs">{a.description}</div>
                    <div className="mt-0.5 text-[10px] text-dim">{a.user_name ?? "System"}</div>
                  </div>
                  <time
                    dateTime={a.occurred_at}
                    title={formatTimestamp(a.occurred_at, org.timezone)}
                    className="whitespace-nowrap text-right text-[10px] text-faint"
                  >
                    {relativeTime(a.occurred_at, org.timezone, now)}
                    <span className="block">{formatTimestamp(a.occurred_at, org.timezone, { hour: "numeric", minute: "2-digit" })}</span>
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {entries.length === PAGE_SIZE && (
        <p className="text-center text-[11px] text-dim">Showing the latest {PAGE_SIZE} entries.</p>
      )}
    </Page>
  );
}
