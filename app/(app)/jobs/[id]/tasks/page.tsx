import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople } from "@/lib/people";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { TasksBoard } from "./TasksBoard";

export const metadata = { title: "Tasks" };

export default async function JobTasksPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, tasksRes, people] = await Promise.all([
    supabase.from("jobs").select("id, job_name, job_number").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    loadPeople(supabase),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">Job tasks</h1>
      {tasksRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load tasks: {tasksRes.error.message}</div>
      ) : (
        <TasksBoard
          jobId={id}
          tasks={tasksRes.data ?? []}
          people={people}
          today={todayInZone(org.timezone)}
          timezone={org.timezone}
        />
      )}
    </Page>
  );
}
