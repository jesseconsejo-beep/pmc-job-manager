import Link from "next/link";
import { Calendar, Pin, User } from "lucide-react";
import { EmptyNote, EmptyState, Page, SectionHeader, StatBlock } from "@/components/ui";
import { TaskRow, type TaskRowData } from "@/components/TaskRow";
import { pinnedPosts, recentPosts } from "@/lib/bulletin";
import { dueBucket, formatDate, formatTimestamp, hourInZone, longDayLabel, relativeTime, todayInZone } from "@/lib/dates";
import { deliveriesToWatch } from "@/lib/materials";
import { getOrg } from "@/lib/org";
import { loadPeople, nameMap } from "@/lib/people";
import { computeJobProgress } from "@/lib/progress";
import { displayNumber } from "@/lib/rfis";
import { upcomingEvents } from "@/lib/schedule";
import { dateRangeLabel, dayLabel, EVENT_TYPE_META } from "@/lib/schedule-shared";
import { firstName, requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { flattenTasks } from "@/lib/tasks";

export const metadata = { title: "Today" };

const WEEK_PREVIEW = 5;
const EVENT_PREVIEW = 4;
const RFI_PREVIEW = 5;
const SCHEDULE_DAYS = 14;
const ACTIVITY_PREVIEW = 8;
/** Read a few extra so rows on archived or hidden jobs can be dropped and still fill the list. */
const ACTIVITY_FETCH = 30;

/** First `n` characters of a post body, with an ellipsis when cut. */
function clip(text: string | null, n: number): string | null {
  const t = text?.trim();
  if (!t) return null;
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}

export default async function TodayPage() {
  const viewer = await requireMember();
  const org = await getOrg();
  const supabase = await createClient();
  const today = todayInZone(org.timezone);

  const [jobsRes, tasksRes, catsRes, people, pinned, latest, events, ordersRes, rfisRes, activityRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, job_name, status, progress, enabled_categories, created_at")
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("*"),
    supabase.from("progress_categories").select("key").eq("active", true).order("sort"),
    loadPeople(supabase),
    pinnedPosts(3, supabase),
    recentPosts(2, supabase),
    upcomingEvents(SCHEDULE_DAYS, supabase),
    // Only orders expected today or earlier can be due or overdue.
    supabase
      .from("material_orders")
      .select("id, job_id, supplier, expected_date, items")
      .lte("expected_date", today),
    supabase
      .from("rfis")
      .select("id, job_id, rfi_number, subject, created_at")
      .eq("status", "action")
      .order("created_at", { ascending: false }),
    // Job activity only: rows without a job (service calls, company-wide) are not shown here.
    supabase
      .from("activity_log")
      .select("id, job_id, description, user_name, occurred_at")
      .not("job_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(ACTIVITY_FETCH),
  ]);

  const jobs = jobsRes.data ?? [];
  const activeJobs = jobs.filter((j) => j.status === "active");
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const names = nameMap(people);
  const categories = catsRes.data ?? [];

  const overdue: TaskRowData[] = [];
  const dueToday: TaskRowData[] = [];
  const thisWeek: TaskRowData[] = [];

  for (const t of flattenTasks(tasksRes.data ?? [])) {
    if (t.done || !t.dueDate || !t.jobId) continue;
    const job = jobById.get(t.jobId);
    if (!job) continue; // archived job, or not visible
    const row: TaskRowData = {
      id: t.id,
      href: `/jobs/${t.jobId}/tasks`,
      text: t.text,
      dueDate: t.dueDate,
      jobName: job.job_name,
      assignee: t.assigneeId ? names.get(t.assigneeId) ?? null : null,
      checklist: t.checklist,
    };
    const bucket = dueBucket(t.dueDate, today);
    if (bucket === "overdue") overdue.push(row);
    else if (bucket === "today") dueToday.push(row);
    else if (bucket === "week") thisWeek.push(row);
  }
  const byDue = (a: TaskRowData, b: TaskRowData) => a.dueDate.localeCompare(b.dueDate);
  overdue.sort(byDue);
  thisWeek.sort(byDue);

  // Deliveries and RFIs only count on jobs the viewer can see that are not archived.
  const deliveries = deliveriesToWatch(ordersRes.data ?? [], today).filter((d) => jobById.has(d.jobId));
  const lateDeliveries = deliveries.filter((d) => d.overdue).length;
  const actionRfis = (rfisRes.data ?? []).filter((r) => r.job_id && jobById.has(r.job_id));
  const recentActivity = (activityRes.data ?? [])
    .filter((a) => a.job_id && jobById.has(a.job_id))
    .slice(0, ACTIVITY_PREVIEW);
  const now = new Date();

  const hour = hourInZone(org.timezone);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = firstName(viewer);

  return (
    <Page narrow>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-semibold uppercase tracking-wider">
          {greeting}
          {name && `, ${name}`}
        </h1>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-dim">{longDayLabel(today)}</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatBlock value={activeJobs.length} label="Active jobs" color="var(--color-primary)" />
        <StatBlock
          value={overdue.length}
          label="Overdue"
          color={overdue.length ? "var(--color-danger)" : "var(--color-dim)"}
        />
        <StatBlock
          value={dueToday.length}
          label="Due today"
          color={dueToday.length ? "var(--color-warn)" : "var(--color-dim)"}
        />
        <StatBlock
          value={thisWeek.length}
          label="This week"
          color={thisWeek.length ? "var(--color-primary)" : "var(--color-dim)"}
        />
        <StatBlock
          value={deliveries.length}
          label="Deliveries"
          color={
            lateDeliveries ? "var(--color-danger)" : deliveries.length ? "var(--color-warn)" : "var(--color-dim)"
          }
        />
        <StatBlock
          value={actionRfis.length}
          label="RFI action"
          color={actionRfis.length ? "var(--color-warn)" : "var(--color-dim)"}
        />
      </div>

      {pinned.length > 0 && (
        <section className="mb-5 grid gap-1.5" aria-label="Pinned posts">
          {pinned.map((p) => {
            const body = clip(p.body, 140);
            return (
              <Link
                key={p.id}
                href="/bulletin"
                className="flex items-start gap-2.5 border border-brand bg-surface p-3 hover:border-line-2"
                style={{ borderLeftWidth: 4 }}
              >
                <span className="flex size-6 shrink-0 items-center justify-center bg-brand text-bg" aria-hidden>
                  <Pin size={13} strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="break-words font-display text-[13px] font-bold tracking-wide">{p.title}</div>
                  {body && <div className="mt-1 break-words text-xs leading-snug text-dim">{body}</div>}
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-faint">
                    Pinned · {relativeTime(p.created_at, org.timezone)}
                    {p.author_name && ` · ${p.author_name}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {events.length > 0 && (
        <section className="mb-5">
          <SectionHeader title="Upcoming" count={events.length} color="var(--color-secondary)" />
          <div className="grid gap-1.5">
            {events.slice(0, EVENT_PREVIEW).map((e) => {
              const meta = EVENT_TYPE_META[e.event_type] ?? EVENT_TYPE_META.event;
              const label = dayLabel(e, today);
              return (
                <Link
                  key={e.id}
                  href="/schedule"
                  className="flex min-h-11 items-center justify-between gap-2.5 border border-line bg-surface p-2.5 hover:border-line-2"
                  style={{ borderLeft: `4px solid ${meta.color}` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-[13px] font-semibold">{e.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-dim">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} className="shrink-0" aria-hidden />
                        {dateRangeLabel(e.start_date, e.end_date)}
                      </span>
                      {e.who_name && (
                        <span className="flex items-center gap-1">
                          <User size={10} className="shrink-0" aria-hidden />
                          {e.who_name}
                        </span>
                      )}
                      <span className="font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.short}
                      </span>
                    </div>
                  </div>
                  {label && (
                    <div className="whitespace-nowrap text-[10px] font-bold tracking-wider" style={{ color: meta.color }}>
                      {label}
                    </div>
                  )}
                </Link>
              );
            })}
            {events.length > EVENT_PREVIEW && (
              <Link href="/schedule" className="p-1.5 text-center text-[11px] text-dim hover:text-ink">
                + {events.length - EVENT_PREVIEW} more on the schedule
              </Link>
            )}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="mb-5">
          <SectionHeader title="Latest from bulletin" count={latest.length} color="var(--color-primary)" />
          <div className="grid gap-1.5">
            {latest.map((p) => {
              const body = clip(p.body, 120);
              return (
                <Link
                  key={p.id}
                  href="/bulletin"
                  className="block border border-line bg-surface p-2.5 hover:border-line-2"
                  style={{ borderLeft: "4px solid var(--color-primary)" }}
                >
                  <div className="break-words text-[13px] font-semibold">{p.title}</div>
                  {body && <div className="mt-0.5 break-words text-[11px] text-dim">{body}</div>}
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-faint">
                    {relativeTime(p.created_at, org.timezone)}
                    {p.author_name && ` · ${p.author_name}`}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet">
          <Link
            href="/jobs?new=1"
            className="mt-3 inline-flex min-h-11 items-center bg-brand px-5 font-display text-[13px] font-bold uppercase tracking-[1.5px] text-bg"
          >
            + Create first job
          </Link>
        </EmptyState>
      ) : (
        <>
          <section className="mb-5">
            <SectionHeader title="Overdue tasks" count={overdue.length} color="var(--color-danger)" />
            {overdue.length === 0 ? (
              <EmptyNote>Nothing overdue. Nice work.</EmptyNote>
            ) : (
              <div className="grid gap-1.5">
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} urgency="overdue" />
                ))}
              </div>
            )}
          </section>

          <section className="mb-5">
            <SectionHeader title="Due today" count={dueToday.length} color="var(--color-warn)" />
            {dueToday.length === 0 ? (
              <EmptyNote>No tasks due today</EmptyNote>
            ) : (
              <div className="grid gap-1.5">
                {dueToday.map((t) => (
                  <TaskRow key={t.id} task={t} urgency="today" />
                ))}
              </div>
            )}
          </section>

          {deliveries.length > 0 && (
            <section className="mb-5">
              <SectionHeader title="Deliveries to watch" count={deliveries.length} color="var(--color-primary)" />
              <div className="grid gap-1.5">
                {deliveries.map((d) => {
                  const c = d.overdue ? "var(--color-danger)" : "var(--color-warn)";
                  return (
                    <Link
                      key={d.id}
                      href={`/jobs/${d.jobId}/materials`}
                      className="flex min-h-11 items-center justify-between gap-2.5 border border-line bg-surface p-2.5 hover:border-line-2"
                      style={{ borderLeft: `4px solid ${c}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[13px] font-semibold">
                          {d.qty && <span className="mr-1.5 text-brand">{d.qty}</span>}
                          {d.summary}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-dim">
                          {d.supplier} · {jobById.get(d.jobId)?.job_name}
                        </div>
                      </div>
                      <div className="whitespace-nowrap text-right text-[10px] font-bold tracking-wider" style={{ color: c }}>
                        {d.overdue ? "OVERDUE" : "TODAY"}
                        {d.overdue && (
                          <div className="font-normal text-dim">
                            {formatDate(d.expected, { month: "short", day: "numeric" }).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-5">
            <SectionHeader title="Due this week" count={thisWeek.length} color="var(--color-primary)" />
            {thisWeek.length === 0 ? (
              <EmptyNote>Nothing this week</EmptyNote>
            ) : (
              <div className="grid gap-1.5">
                {thisWeek.slice(0, WEEK_PREVIEW).map((t) => (
                  <TaskRow key={t.id} task={t} urgency="week" />
                ))}
                {thisWeek.length > WEEK_PREVIEW && (
                  <div className="p-1.5 text-center text-[11px] text-dim">
                    + {thisWeek.length - WEEK_PREVIEW} more this week
                  </div>
                )}
              </div>
            )}
          </section>

          {actionRfis.length > 0 && (
            <section className="mb-5">
              <SectionHeader title="RFIs needing action" count={actionRfis.length} color="var(--color-warn)" />
              <div className="grid gap-1.5">
                {actionRfis.slice(0, RFI_PREVIEW).map((r) => (
                  <Link
                    key={r.id}
                    href={`/jobs/${r.job_id}/rfis?tab=action`}
                    className="block min-h-11 border border-line bg-surface p-2.5 hover:border-line-2"
                    style={{ borderLeft: "4px solid var(--color-warn)" }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 text-[10px] font-bold tracking-wider text-brand">
                        {displayNumber("rfi", r.rfi_number)}
                      </span>
                      <span className="min-w-0 break-words text-[13px] font-semibold">{r.subject}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-dim">{r.job_id && jobById.get(r.job_id)?.job_name}</div>
                  </Link>
                ))}
                {actionRfis.length > RFI_PREVIEW && (
                  <div className="p-1.5 text-center text-[11px] text-dim">
                    + {actionRfis.length - RFI_PREVIEW} more needing action
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mb-5">
            <SectionHeader title="Jobs" count={jobs.length} color="var(--color-secondary)" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {jobs.slice(0, 6).map((j) => {
                const { overall } = computeJobProgress(j, categories);
                return (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="border border-line bg-surface p-3 hover:border-brand">
                    <div className="truncate text-[9px] font-semibold tracking-[1.5px] text-brand">
                      #{j.job_number || "—"}
                    </div>
                    <div className="mt-0.5 break-words font-display text-sm font-semibold leading-tight">{j.job_name}</div>
                    <div className="mt-2 h-[3px] bg-bg">
                      <div className="h-full bg-brand" style={{ width: `${overall}%` }} />
                    </div>
                    <div className="mt-1 text-[9px] tracking-wider text-dim">{overall}% COMPLETE</div>
                  </Link>
                );
              })}
            </div>
          </section>

          {recentActivity.length > 0 && (
            <section className="mb-5">
              <SectionHeader title="Recent activity" count={recentActivity.length} color="var(--color-secondary)" />
              <div className="grid gap-1">
                {recentActivity.map((a) => (
                  <Link
                    key={a.id}
                    href={`/jobs/${a.job_id}/activity`}
                    className="flex min-h-11 justify-between gap-2.5 border border-line bg-surface px-2.5 py-2 hover:border-line-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-xs">{a.description}</div>
                      <div className="mt-0.5 truncate text-[10px] text-dim">
                        {a.job_id && jobById.get(a.job_id)?.job_name}
                        {a.user_name && ` · ${a.user_name}`}
                      </div>
                    </div>
                    <time
                      dateTime={a.occurred_at}
                      title={formatTimestamp(a.occurred_at, org.timezone)}
                      className="whitespace-nowrap text-right text-[10px] text-faint"
                    >
                      {relativeTime(a.occurred_at, org.timezone, now)}
                    </time>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Page>
  );
}
