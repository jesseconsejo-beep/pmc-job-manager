import Link from "next/link";
import { Clock } from "lucide-react";
import { TimesheetBadge } from "@/components/TimesheetBadge";
import { EmptyState, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople, type Person } from "@/lib/people";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_COLOR,
  fmtHours,
  loadSheetSettings,
  periodRange,
  resolvePeriods,
  sheetStatus,
  shortDay,
} from "@/lib/timesheets";
import type { Timesheet } from "@/lib/types";
import { isUuid } from "@/lib/validate";
import { CrewFilter, type StatusFilter } from "./CrewFilter";
import { NewTimesheetButton, StartPeriodButton } from "./NewTimesheetButton";

export const metadata = { title: "Timesheets" };

type ListRow = Pick<
  Timesheet,
  "id" | "employee_id" | "employee_name" | "week2_ending" | "total_hours" | "approved" | "approved_at" | "submitted_at"
>;

const LIST_COLUMNS = "id, employee_id, employee_name, week2_ending, total_hours, approved, approved_at, submitted_at";

function statusParam(v: string | undefined): StatusFilter {
  return v === "approved" || v === "unapproved" ? v : "all";
}

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; employee?: string; status?: string }>;
}) {
  const m = await requireMemberWithRole();
  const sp = await searchParams;
  const crewView = m.admin && sp.view === "crew";
  const employeeFilter = crewView && isUuid(sp.employee) ? sp.employee : "";
  const status = crewView ? statusParam(sp.status) : "all";

  const org = await getOrg();
  const supabase = await createClient();
  const settings = await loadSheetSettings(supabase);
  const today = todayInZone(org.timezone);

  let crewQuery = supabase.from("timesheets").select(LIST_COLUMNS);
  if (employeeFilter) crewQuery = crewQuery.eq("employee_id", employeeFilter);
  if (status === "approved") crewQuery = crewQuery.eq("approved", true);
  if (status === "unapproved") crewQuery = crewQuery.eq("approved", false);

  const [periods, mineRes, crewRes, people] = await Promise.all([
    resolvePeriods(supabase, today, settings),
    supabase
      .from("timesheets")
      .select(LIST_COLUMNS)
      .eq("employee_id", m.userId)
      .order("week2_ending", { ascending: false })
      .limit(200),
    crewView
      ? crewQuery.order("week2_ending", { ascending: false }).order("employee_name").limit(300)
      : Promise.resolve(null),
    m.admin ? loadPeople(supabase) : Promise.resolve([] as Person[]),
  ]);

  const mine: ListRow[] = mineRes.data ?? [];
  const list: ListRow[] = crewView ? (crewRes?.data ?? []) : mine;
  const loadError = crewView ? crewRes?.error?.message : mineRes.error?.message;
  const names = new Map(people.map((p) => [p.id, p.name]));
  const mineByPeriod: Record<string, string> = {};
  for (const t of mine) mineByPeriod[t.week2_ending] = t.id;
  const current = mine.find((t) => t.week2_ending === periods.current) ?? null;

  const cadence = settings.periodDays === 7 ? "Weekly" : "Bi-weekly";
  const newButtonProps = {
    periods,
    mineByPeriod,
    admin: m.admin,
    me: m.userId,
    people: people.filter((p) => p.active),
    weekStartDow: settings.weekStartDow,
  };

  return (
    <Page>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Clock size={28} className="shrink-0 text-brand" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold uppercase tracking-[2px]">Timesheets</h1>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-dim">
              {cadence} · {list.length} on file
            </p>
          </div>
        </div>
        <NewTimesheetButton {...newButtonProps} />
      </div>

      {m.admin && (
        <div className="mb-4 flex border-b border-line" role="tablist" aria-label="Whose timesheets">
          {[
            { id: "mine", label: "My sheets", href: "/timesheets" },
            { id: "crew", label: "All crew", href: "/timesheets?view=crew" },
          ].map((t) => {
            const active = (t.id === "crew") === crewView;
            return (
              <Link
                key={t.id}
                href={t.href}
                role="tab"
                aria-selected={active}
                className={`flex min-h-11 items-center border-b-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] ${
                  active ? "border-brand text-brand" : "border-transparent text-dim"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}

      {crewView && <CrewFilter people={people} employee={employeeFilter} status={status} />}

      {!crewView && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-3"
          style={{ borderLeft: `4px solid ${current ? STATUS_COLOR[sheetStatus(current)] : "var(--color-primary)"}` }}
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[1.5px] text-dim">This period</div>
            <div className="font-display text-base font-semibold uppercase tracking-wide">Ends {shortDay(periods.current)}</div>
            <div className="text-[11px] text-dim">{periodRange(periods.current)}</div>
          </div>
          {current ? (
            <Link
              href={`/timesheets/${current.id}`}
              className="flex min-h-11 items-center gap-3 border border-line-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] hover:border-brand"
            >
              <span className="text-brand">{fmtHours(current.total_hours)}h</span>
              <TimesheetBadge status={sheetStatus(current)} />
              <span>Open</span>
            </Link>
          ) : (
            <StartPeriodButton />
          )}
        </div>
      )}

      {loadError && (
        <div role="alert" className="mb-4 border border-danger p-3 text-xs text-danger">
          Could not load timesheets: {loadError}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={Clock} title={crewView ? "No timesheets match" : "No timesheets yet"}>
          {crewView ? (
            "Try another crew member or status."
          ) : (
            <div className="mt-3 flex justify-center">
              <NewTimesheetButton {...newButtonProps} variant="empty" />
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-2">
          {list.map((ts) => {
            const st = sheetStatus(ts);
            const who = (ts.employee_id && names.get(ts.employee_id)) || ts.employee_name?.trim() || "Unnamed";
            return (
              <Link
                key={ts.id}
                href={`/timesheets/${ts.id}`}
                className="block border border-line bg-surface p-3.5 hover:border-brand"
                style={{ borderLeft: `4px solid ${STATUS_COLOR[st]}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-semibold tracking-wide">
                      {crewView ? who : `Period ending ${shortDay(ts.week2_ending)}`}
                    </div>
                    <div className="mt-1 text-[11px] text-dim">
                      {crewView ? `Period ending ${shortDay(ts.week2_ending)} · ` : ""}
                      {periodRange(ts.week2_ending)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[22px] font-bold leading-none text-brand">{fmtHours(ts.total_hours)}h</div>
                    <div className="mt-1.5">
                      <TimesheetBadge status={st} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
