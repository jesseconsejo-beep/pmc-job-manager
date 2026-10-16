import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  BarChart3,
  Camera,
  ClipboardList,
  CircleAlert,
  FileText,
  ListChecks,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BackLink, Page } from "@/components/ui";
import { orderStatus } from "@/lib/materials";
import { computeJobProgress } from "@/lib/progress";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { taskCounts } from "@/lib/tasks";
import { isUuid } from "@/lib/validate";
import { Contacts } from "./Contacts";
import { JobHeader } from "./JobHeader";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Job" };
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("job_name").eq("id", id).maybeSingle();
  return { title: data?.job_name ?? "Job" };
}

type Folder = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  href: string;
  /** Short status line under the label; undefined when its count could not be loaded. */
  count?: string;
};

export default async function JobPage({ params }: Params) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  // One cheap query per table for the folder counts: a head-only count where a
  // filter is enough, a narrow column list where the count needs the rows.
  const [
    jobRes,
    contactsRes,
    tasksRes,
    activityRes,
    rfisRes,
    cosRes,
    ordersRes,
    toolsRes,
    photosRes,
    filesRes,
    catsRes,
  ] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase.from("contacts").select("id, name, role, phone, email").eq("job_id", id).order("created_at"),
    supabase.from("tasks").select("*").eq("job_id", id),
    supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("job_id", id),
    supabase.from("rfis").select("id", { count: "exact", head: true }).eq("job_id", id).neq("status", "complete"),
    supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .eq("job_id", id)
      .neq("status", "complete"),
    // Open = some item still to receive, and that lives in the items jsonb.
    supabase.from("material_orders").select("items").eq("job_id", id),
    supabase.from("tools").select("id", { count: "exact", head: true }).eq("job_id", id).eq("picked_up", false),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("job_id", id),
    supabase.from("job_files").select("file_type").eq("job_id", id),
    // Same catalog slice the jobs list and the progress page use, so the % agrees.
    supabase.from("progress_categories").select("key").eq("active", true).order("sort"),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  const open = taskCounts(tasksRes.data ?? []).open;
  const activityCount = activityRes.count ?? 0;

  // A count that failed to load shows nothing rather than a misleading 0.
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const counted = (res: { error: unknown; count: number | null }, label: (n: number) => string) =>
    res.error || res.count === null ? undefined : label(res.count);
  const filesOf = (type: "ifc" | "shop_drawing") =>
    filesRes.error
      ? undefined
      : plural((filesRes.data ?? []).filter((f) => f.file_type === type).length, "FILE", "FILES");
  const openOrders = ordersRes.error
    ? undefined
    : `${(ordersRes.data ?? []).filter((o) => orderStatus(o) !== "complete").length} OPEN`;
  const overall = catsRes.error ? undefined : `${computeJobProgress(job, catsRes.data ?? []).overall}% COMPLETE`;

  // Folder order follows the Phase 1 JobView. Each folder is its own route under /jobs/[id]/.
  const folders: Folder[] = [
    {
      id: "tasks",
      label: "Tasks",
      icon: ListChecks,
      color: "var(--color-primary)",
      href: `/jobs/${id}/tasks`,
      count: `${open} OPEN`,
    },
    {
      id: "ifcs",
      label: "IFCs",
      icon: FileText,
      color: "var(--color-secondary)",
      href: `/jobs/${id}/ifcs`,
      count: filesOf("ifc"),
    },
    {
      id: "shop-drawings",
      label: "Shop Drawings",
      icon: FileText,
      color: "var(--color-secondary)",
      href: `/jobs/${id}/shop-drawings`,
      count: filesOf("shop_drawing"),
    },
    {
      id: "rfis",
      label: "RFIs",
      icon: CircleAlert,
      color: "var(--color-warn)",
      href: `/jobs/${id}/rfis`,
      count: counted(rfisRes, (n) => `${n} OPEN`),
    },
    {
      id: "change-orders",
      label: "Change Orders",
      icon: ClipboardList,
      color: "var(--color-warn)",
      href: `/jobs/${id}/change-orders`,
      count: counted(cosRes, (n) => `${n} OPEN`),
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,
      color: "var(--color-ink)",
      href: `/jobs/${id}/tools`,
      count: counted(toolsRes, (n) => `${n} ON SITE`),
    },
    {
      id: "photos",
      label: "Photos",
      icon: Camera,
      color: "var(--color-secondary)",
      href: `/jobs/${id}/photos`,
      count: counted(photosRes, (n) => plural(n, "PHOTO", "PHOTOS")),
    },
    {
      id: "materials",
      label: "Material Orders",
      icon: Package,
      color: "var(--color-ink)",
      href: `/jobs/${id}/materials`,
      count: openOrders,
    },
    {
      id: "progress",
      label: "Progress Report",
      icon: BarChart3,
      color: "var(--color-primary)",
      href: `/jobs/${id}/progress`,
      count: overall,
    },
    {
      id: "activity",
      label: "Activity Feed",
      icon: Activity,
      color: "var(--color-secondary)",
      href: `/jobs/${id}/activity`,
      count: `${activityCount} ${activityCount === 1 ? "ITEM" : "ITEMS"}`,
    },
  ];

  return (
    <Page>
      <BackLink href="/jobs" label="All jobs" />
      <JobHeader job={job} />
      <Contacts jobId={job.id} jobName={job.job_name} contacts={contactsRes.data ?? []} />

      <h2 className="mb-3 text-[11px] tracking-[2px] text-dim">JOB FOLDERS</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {folders.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              href={f.href}
              className="block min-h-[104px] border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <Icon size={22} className="mb-2.5" style={{ color: f.color }} />
              <div className="font-display text-sm font-semibold uppercase tracking-wider">{f.label}</div>
              <div className="mt-1 text-[10px] tracking-wider text-dim">{f.count ?? ""}</div>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
