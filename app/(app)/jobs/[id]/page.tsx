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
  href?: string;
  count?: string;
};

export default async function JobPage({ params }: Params) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [jobRes, contactsRes, tasksRes, activityRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase.from("contacts").select("id, name, role, phone, email").eq("job_id", id).order("created_at"),
    supabase.from("tasks").select("*").eq("job_id", id),
    supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("job_id", id),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  const open = taskCounts(tasksRes.data ?? []).open;
  const activityCount = activityRes.count ?? 0;

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
    { id: "ifcs", label: "IFCs", icon: FileText, color: "var(--color-secondary)", href: `/jobs/${id}/ifcs` },
    { id: "shop-drawings", label: "Shop Drawings", icon: FileText, color: "var(--color-secondary)", href: `/jobs/${id}/shop-drawings` },
    { id: "rfis", label: "RFIs", icon: CircleAlert, color: "var(--color-warn)", href: `/jobs/${id}/rfis` },
    { id: "change-orders", label: "Change Orders", icon: ClipboardList, color: "var(--color-warn)", href: `/jobs/${id}/change-orders` },
    { id: "tools", label: "Tools", icon: Wrench, color: "var(--color-ink)", href: `/jobs/${id}/tools` },
    { id: "photos", label: "Photos", icon: Camera, color: "var(--color-secondary)", href: `/jobs/${id}/photos` },
    { id: "materials", label: "Material Orders", icon: Package, color: "var(--color-ink)", href: `/jobs/${id}/materials` },
    { id: "progress", label: "Progress Report", icon: BarChart3, color: "var(--color-primary)", href: `/jobs/${id}/progress` },
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
          const body = (
            <>
              <Icon size={22} className="mb-2.5" style={{ color: f.href ? f.color : "var(--color-faint)" }} />
              <div className="font-display text-sm font-semibold uppercase tracking-wider">{f.label}</div>
              <div className="mt-1 text-[10px] tracking-wider text-dim">{f.href ? (f.count ?? "") : "COMING SOON"}</div>
            </>
          );
          return f.href ? (
            <Link
              key={f.id}
              href={f.href}
              className="block min-h-[104px] border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand"
            >
              {body}
            </Link>
          ) : (
            <div
              key={f.id}
              aria-disabled="true"
              className="min-h-[104px] border border-dashed border-line bg-surface p-4 text-faint opacity-60"
            >
              {body}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
