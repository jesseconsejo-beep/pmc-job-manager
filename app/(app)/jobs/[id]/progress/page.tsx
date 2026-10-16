import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { ProgressView } from "./ProgressView";

export const metadata = { title: "Progress Report" };

export default async function JobProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMemberWithRole();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [jobRes, catsRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name, enabled_categories, progress").eq("id", id).maybeSingle(),
    // Same catalog slice the jobs list feeds computeJobProgress, so the numbers agree.
    supabase.from("progress_categories").select("*").eq("active", true).order("sort"),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">Progress report</h1>
      {catsRes.error ? (
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load the progress categories: {catsRes.error.message}
        </div>
      ) : (
        <ProgressView
          jobId={id}
          categories={catsRes.data ?? []}
          enabledCategories={job.enabled_categories}
          progress={job.progress}
          canManage={member.admin}
        />
      )}
    </Page>
  );
}
