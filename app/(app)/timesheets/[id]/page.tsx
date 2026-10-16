import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { buildJobOptions, loadSheetSettings, normalizeRows } from "@/lib/timesheets";
import { isUuid } from "@/lib/validate";
import { TimesheetEditor } from "./TimesheetEditor";

export const metadata = { title: "Timesheet" };

// Print: hide the app chrome, black on white, landscape. Scoped to this page
// because the tag only exists while the editor is rendered.
const PRINT_CSS = `
@media print {
  @page { size: landscape; margin: 10mm; }
  html, body { background: #fff !important; color: #000 !important; }
  header, nav[aria-label="Main"] { display: none !important; }
  .ts-print-root, .ts-print-root * {
    color: #000 !important;
    background: transparent !important;
    border-color: #888 !important;
    box-shadow: none !important;
  }
}
`;

function personName(p: { name: string | null; email: string } | null | undefined): string | null {
  if (!p) return null;
  return p.name?.trim() || p.email;
}

export default async function TimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await requireMemberWithRole();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [sheetRes, settings, jobsRes, callsRes] = await Promise.all([
    supabase.from("timesheets").select("*").eq("id", id).maybeSingle(),
    loadSheetSettings(supabase),
    supabase
      .from("jobs")
      .select("job_number, job_name")
      .in("status", ["active", "on_hold", "complete"])
      .order("job_number", { ascending: true, nullsFirst: false })
      .limit(500),
    supabase
      .from("service_calls")
      .select("service_code, project_name, company_name, customer_name")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  if (sheetRes.error) {
    return (
      <Page>
        <BackLink href="/timesheets" label="Timesheets" />
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load the timesheet: {sheetRes.error.message}
        </div>
      </Page>
    );
  }
  const sheet = sheetRes.data;
  if (!sheet) notFound();

  const ids = [sheet.employee_id, sheet.approved_by].filter((v): v is string => Boolean(v));
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, name, email").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows = normalizeRows(sheet.rows);
  const isOwn = sheet.employee_id === m.userId;
  const approver = m.catalog.find((r) => r.key === m.profile.role)?.can_approve_timesheets === true;
  const canEdit = !sheet.approved && (isOwn || m.admin);

  return (
    <Page>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="print:hidden">
        <BackLink href="/timesheets" label="Timesheets" />
      </div>
      <TimesheetEditor
        // Remount when approval flips, so the grid restarts from what the database holds.
        key={`${sheet.id}:${sheet.approved}`}
        sheet={{
          id: sheet.id,
          employeeName: personName(sheet.employee_id ? byId.get(sheet.employee_id) : null) ?? sheet.employee_name ?? "Unnamed",
          week1Ending: sheet.week1_ending,
          week2Ending: sheet.week2_ending,
          approved: sheet.approved,
          approvedAt: sheet.approved_at,
          approverName: personName(sheet.approved_by ? byId.get(sheet.approved_by) : null),
          submittedAt: sheet.submitted_at,
          notes: sheet.notes ?? "",
          rows,
        }}
        options={buildJobOptions(jobsRes.data ?? [], callsRes.data ?? [], rows)}
        today={todayInZone(org.timezone)}
        timezone={org.timezone}
        canEdit={canEdit}
        canApprove={approver && !isOwn}
        ownSheetApprover={approver && isOwn}
        canDelete={m.admin}
        isOwn={isOwn}
        letterhead={{
          companyName: org.companyName,
          legalName: settings.legalName,
          logoUrl: org.logoUrl,
        }}
      />
    </Page>
  );
}
