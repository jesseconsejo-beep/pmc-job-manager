import Link from "next/link";
import { EmptyNote, EmptyState, Page, SectionHeader, StatBlock } from "@/components/ui";
import { TaskRow, type TaskRowData } from "@/components/TaskRow";
import { dueBucket, hourInZone, longDayLabel, todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople, nameMap } from "@/lib/people";
import { computeJobProgress } from "@/lib/progress";
import { firstName, requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { flattenTasks } from "@/lib/tasks";

export const metadata = { title: "Today" };

const WEEK_PREVIEW = 5;

export default async function TodayPage() {
  const viewer = await requireMember();
  const org = await getOrg();
  const supabase = await createClient();

  const [jobsRes, tasksRes, catsRes, people] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, job_name, status, progress, enabled_categories, created_at")
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("*"),
    supabase.from("progress_categories").select("key").eq("active", true).order("sort"),
    loadPeople(supabase),
  ]);

  const jobs = jobsRes.data ?? [];
  const activeJobs = jobs.filter((j) => j.status === "active");
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const names = nameMap(people);
  const categories = catsRes.data ?? [];

  const today = todayInZone(org.timezone);
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

      <div className="mb-6 grid grid-cols-4 gap-2">
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
      </div>

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
        </>
      )}
    </Page>
  );
}
