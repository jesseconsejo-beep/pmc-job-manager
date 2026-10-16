import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople } from "@/lib/people";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { ToolsBoard } from "./ToolsBoard";

export const metadata = { title: "Tools" };

export default async function JobToolsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, toolsRes, people] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", id).maybeSingle(),
    supabase.from("tools").select("*").eq("job_id", id).order("created_at"),
    loadPeople(supabase),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${job.id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">Tools checklist</h1>
      {toolsRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load tools: {toolsRes.error.message}</div>
      ) : (
        <ToolsBoard jobId={job.id} tools={toolsRes.data ?? []} people={people} today={todayInZone(org.timezone)} />
      )}
    </Page>
  );
}
