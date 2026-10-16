import { notFound } from "next/navigation";
import { RfiNotesList } from "@/components/RfiNotesList";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { coToNote, isRfiStatus } from "@/lib/rfis";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { createChangeOrder, deleteChangeOrder, setChangeOrderStatus, updateChangeOrder } from "./actions";

export const metadata = { title: "Change Orders" };

export default async function JobChangeOrdersPage({
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
  const [jobRes, coRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", id).maybeSingle(),
    supabase.from("change_orders").select("*").eq("job_id", id).order("created_at", { ascending: false }),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">Change Orders</h1>
      {coRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">
          Could not load change orders: {coRes.error.message}
        </div>
      ) : (
        <RfiNotesList
          kind="co"
          jobId={id}
          items={(coRes.data ?? []).map(coToNote)}
          people={[]}
          today={todayInZone(org.timezone)}
          initialTab={isRfiStatus(tab) ? tab : "issued"}
          createAction={createChangeOrder}
          updateAction={updateChangeOrder}
          statusAction={setChangeOrderStatus}
          deleteAction={deleteChangeOrder}
        />
      )}
    </Page>
  );
}
