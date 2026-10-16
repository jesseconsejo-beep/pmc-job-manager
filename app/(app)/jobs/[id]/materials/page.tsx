import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { MaterialsBoard } from "./MaterialsBoard";

export const metadata = { title: "Material Orders" };

export default async function JobMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, ordersRes, settingsRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name, job_number, location").eq("id", id).maybeSingle(),
    supabase.from("material_orders").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    supabase.from("org_settings").select("orders_from_email").limit(1).maybeSingle(),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  // Orders go out from the company's orders address; without one, from the viewer.
  const senderEmail = settingsRes.data?.orders_from_email?.trim() || viewer.email || null;

  return (
    <Page narrow>
      <BackLink href={`/jobs/${id}`} label={job.job_name} />
      <h1 className="mb-1 font-display text-2xl uppercase tracking-[1.5px]">Material orders</h1>
      <p className="mb-4 text-[11px] uppercase tracking-wider text-dim">
        {[job.job_number ? `#${job.job_number}` : null, job.job_name].filter(Boolean).join(" · ")}
      </p>
      {ordersRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load orders: {ordersRes.error.message}</div>
      ) : (
        <MaterialsBoard
          jobId={id}
          job={{ name: job.job_name, number: job.job_number, location: job.location }}
          orders={ordersRes.data ?? []}
          today={todayInZone(org.timezone)}
          timezone={org.timezone}
          sender={{
            name: viewer.profile.name?.trim() || null,
            email: senderEmail,
            company: org.companyName,
          }}
        />
      )}
    </Page>
  );
}
