import { notFound } from "next/navigation";
import { RfiNotesList } from "@/components/RfiNotesList";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople } from "@/lib/people";
import { isRfiStatus, rfiToNote } from "@/lib/rfis";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { createRfi, deleteRfi, setRfiStatus, updateRfi } from "./actions";

export const metadata = { title: "RFIs" };

export default async function JobRfisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { tab } = await searchParams;

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, rfiRes, people] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", id).maybeSingle(),
    supabase.from("rfis").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    loadPeople(supabase),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl tracking-[1.5px]">RFIs</h1>
      {rfiRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load RFIs: {rfiRes.error.message}</div>
      ) : (
        <RfiNotesList
          kind="rfi"
          jobId={id}
          items={(rfiRes.data ?? []).map(rfiToNote)}
          people={people}
          today={todayInZone(org.timezone)}
          initialTab={isRfiStatus(tab) ? tab : "issued"}
          createAction={createRfi}
          updateAction={updateRfi}
          statusAction={setRfiStatus}
          deleteAction={deleteRfi}
        />
      )}
    </Page>
  );
}
