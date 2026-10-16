import Link from "next/link";
import { redirect } from "next/navigation";
import { Hammer, Plus } from "lucide-react";
import { Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { entriesOf, totalHours } from "@/lib/service";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_STATUSES, type ServiceStatus } from "@/lib/types";
import { ServiceList, type ServiceCard, type ServiceFilter } from "./ServiceList";

export const metadata = { title: "Service" };

export default async function ServicePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; status?: string }>;
}) {
  await requireMember();
  const { new: openNew, status } = await searchParams;
  if (openNew === "1") redirect("/service/new");

  const org = await getOrg();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  const cards: ServiceCard[] = (data ?? []).map((c) => ({
    id: c.id,
    service_code: c.service_code,
    project_name: c.project_name,
    customer_name: c.customer_name,
    company_name: c.company_name,
    address: c.address,
    scheduled_date: c.scheduled_date,
    status: c.status,
    hours: totalHours(entriesOf(c)),
    created_at: c.created_at,
  }));

  const count = (s: ServiceStatus) => cards.filter((c) => c.status === s).length;
  const initialFilter: ServiceFilter = SERVICE_STATUSES.includes(status as ServiceStatus) ? (status as ServiceStatus) : "all";

  return (
    <Page>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Hammer size={28} className="hidden shrink-0 text-warn min-[420px]:block" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold uppercase tracking-[2px]">Service Calls</h1>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-dim">
              {count("upcoming")} upcoming · {count("in_progress")} in progress · {count("complete")} complete
            </p>
          </div>
        </div>
        <Link
          href="/service/new"
          className="clip-cta flex min-h-11 shrink-0 items-center gap-2 bg-brand px-4 font-display text-[13px] font-bold uppercase tracking-[1.5px] text-bg"
        >
          <Plus size={16} strokeWidth={3} /> New call
        </Link>
      </div>

      {error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load service calls: {error.message}</div>
      ) : (
        <ServiceList calls={cards} initialFilter={initialFilter} today={todayInZone(org.timezone)} />
      )}
    </Page>
  );
}
