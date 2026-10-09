import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { EmptyState, Page, PageTitle } from "@/components/ui";
import { todayInZone, yearOf } from "@/lib/dates";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/jobs";
import { getOrg } from "@/lib/org";
import { computeJobProgress } from "@/lib/progress";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { taskCounts } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { NewJobButton } from "./NewJobButton";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await requireMember();
  const { new: openNew } = await searchParams;
  const org = await getOrg();
  const supabase = await createClient();

  const [jobsRes, catsRes, tasksRes] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("progress_categories").select("key").eq("active", true).order("sort"),
    supabase.from("tasks").select("*"),
  ]);
  const jobs = jobsRes.data ?? [];
  const categories = catsRes.data ?? [];
  const tasksByJob = new Map<string, Task[]>();
  for (const t of tasksRes.data ?? []) {
    if (!t.job_id) continue;
    const list = tasksByJob.get(t.job_id) ?? [];
    list.push(t);
    tasksByJob.set(t.job_id, list);
  }

  const defaultNumber = `${org.jobNumberPrefix}${yearOf(todayInZone(org.timezone))}-`;

  return (
    <Page>
      <PageTitle
        title="Jobs"
        subtitle="Select a job to open ・ tap + to create"
        action={<NewJobButton defaultNumber={defaultNumber} openOnLoad={openNew === "1"} />}
      />

      {jobsRes.error && (
        <div className="mb-4 border border-danger p-3 text-xs text-danger">Could not load jobs: {jobsRes.error.message}</div>
      )}

      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet">Tap &ldquo;New job&rdquo; to start tracking.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const { overall } = computeJobProgress(job, categories);
            const counts = taskCounts(tasksByJob.get(job.id) ?? []);
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand"
              >
                <div className="h-[3px] bg-brand" style={{ width: `${overall}%` }} />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-semibold tracking-[1.5px] text-brand">
                        JOB #{job.job_number || "—"}
                      </div>
                      <div className="mt-0.5 break-words font-display text-lg font-semibold tracking-wide">{job.job_name}</div>
                    </div>
                    <span
                      className="shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: STATUS_COLOR[job.status], borderColor: STATUS_COLOR[job.status] }}
                    >
                      {STATUS_LABEL[job.status]}
                    </span>
                  </div>
                  {job.location && (
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-dim">
                      <MapPin size={11} className="shrink-0" /> <span className="truncate">{job.location}</span>
                    </div>
                  )}
                  {job.client && (
                    <div className="flex items-center gap-1.5 text-[11px] text-dim">
                      <Building2 size={11} className="shrink-0" /> <span className="truncate">{job.client}</span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-3 border-t border-line pt-3">
                    <div className="flex-1">
                      <div className="text-[9px] tracking-[1.5px] text-faint">PROGRESS</div>
                      <div className="font-display text-lg text-brand">{overall}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] tracking-[1.5px] text-faint">OPEN TASKS</div>
                      <div className={`font-display text-lg ${counts.open ? "text-warn" : "text-ink"}`}>{counts.open}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
