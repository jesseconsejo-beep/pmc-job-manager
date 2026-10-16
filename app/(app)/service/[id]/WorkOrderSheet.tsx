import type { ReactNode } from "react";
import { formatDate, formatTimestamp } from "@/lib/dates";
import { mapsUrl, telHref } from "@/lib/jobs";
import { entriesOf, formatHours, formatMoney, SERVICE_STATUS_LABEL, totalHours, workerLabel } from "@/lib/service";
import type { ServiceCall, WorkEntry } from "@/lib/types";

export type SheetCompany = { name: string; short: string; logoUrl: string | null };

const INK = "#1a1a1a";
const BAR = "var(--color-secondary)";

/**
 * The work order laid out like the company's paper form (Phase 1
 * ServiceCallView): letterhead, customer block, the Work Report table and the
 * total. White paper on screen; the page's print stylesheet prints only this.
 */
export function WorkOrderSheet({
  call,
  names,
  company,
  timezone,
}: {
  call: ServiceCall;
  names: Map<string, string>;
  company: SheetCompany;
  timezone: string;
}) {
  const entries = entriesOf(call);
  const hours = totalHours(entries);
  const date = call.scheduled_date ? formatDate(call.scheduled_date) : null;

  return (
    <article
      data-print="sheet"
      aria-label="Work order"
      className="mb-4 border border-line-2 bg-white p-4 sm:p-5"
      style={{ color: INK }}
    >
      <div
        data-bar
        className="mb-3.5 px-4 py-3 text-center font-display text-[22px] font-bold tracking-[2px] text-white"
        style={{ background: BAR }}
      >
        WORK ORDER
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[110px_1fr] print:grid-cols-[110px_1fr]">
        <div className="flex items-center gap-3 sm:block print:block">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
            <img src={company.logoUrl} alt={company.short} className="h-auto w-16 shrink-0 sm:w-full print:w-full" />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center font-display text-lg font-bold text-white sm:h-[110px] sm:w-full print:h-[110px] print:w-full"
              style={{ background: BAR }}
            >
              {company.short.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 break-words font-display text-[13px] font-bold tracking-[1px] sm:hidden print:hidden">
            {company.name.toUpperCase()}
          </div>
        </div>

        <div className="min-w-0 text-xs leading-[1.7]">
          <div className="mb-2 hidden font-display text-[13px] font-bold tracking-[1px] sm:block print:block">
            {company.name.toUpperCase()}
          </div>
          <Line label="Attention" value={call.customer_name} />
          <Line label="Company" value={call.company_name} />
          <Line label="Date" value={date} />
          <Line label="P.O #" value={call.service_code} empty="S—" />
          <div className="mt-1.5" />
          <Line label="Project Name" value={call.project_name} />
          <Line label="Customer Name" value={call.customer_name} />
          <Line
            label="Customer #"
            value={call.customer_phone}
            render={(v) => (
              <a href={telHref(v)} className="underline decoration-dotted underline-offset-2">
                {v}
              </a>
            )}
          />
          <Line
            label="Project Address"
            value={call.address}
            render={(v) => (
              <a href={mapsUrl(v)} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">
                {v}
              </a>
            )}
          />
          {call.customer_po && <Line label="Customer PO" value={call.customer_po} />}
        </div>
      </div>

      {/* Tablet, desktop and paper: the form's table. */}
      <table className="mt-5 hidden w-full table-fixed border-collapse border border-[#ccc] sm:table print:table">
        <colgroup>
          <col style={{ width: "46%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr data-bar className="text-left text-[11px] font-bold text-white" style={{ background: BAR }}>
            <th className="px-2.5 py-1.5">Work Report</th>
            <th className="border-l border-white/50 px-2 py-1.5">Date</th>
            <th className="border-l border-white/50 px-2 py-1.5">Manpower</th>
            <th className="border-l border-white/50 px-2 py-1.5 text-right">Hours</th>
            <th className="border-l border-white/50 px-2 py-1.5">Materials/Supplier</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="h-[200px] whitespace-pre-wrap break-words border-r border-[#ccc] p-2.5 align-top text-xs">
              <Report text={call.work_report} />
            </td>
            <td colSpan={4} className="p-0 align-top">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "24.07%" }} />
                  <col style={{ width: "31.48%" }} />
                  <col style={{ width: "14.81%" }} />
                  <col style={{ width: "29.64%" }} />
                </colgroup>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-dotted border-[#ddd] text-[11px]">
                      <td className="break-words border-r border-[#ccc] px-2 py-1 align-top">{e.date ? formatDate(e.date) : ""}</td>
                      <td className="break-words border-r border-[#ccc] px-2 py-1 align-top">{workerLabel(e, names)}</td>
                      <td className="border-r border-[#ccc] px-2 py-1 text-right align-top">{formatHours(e.hours)}</td>
                      <td className="break-words px-2 py-1 align-top">
                        <Materials entry={e} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="border-t border-[#ccc] bg-[#f5f5f5] px-2.5 py-1.5 text-xs font-bold">
              <Total cost={call.total_cost} hours={hours} />
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Phone: the same content stacked, since five columns do not fit. */}
      <div className="mt-5 border border-[#ccc] sm:hidden print:hidden">
        <div className="px-2.5 py-1.5 text-[11px] font-bold text-white" style={{ background: BAR }}>
          Work Report
        </div>
        <div className="min-h-20 whitespace-pre-wrap break-words p-2.5 text-xs">
          <Report text={call.work_report} />
        </div>
        <div className="px-2.5 py-1.5 text-[11px] font-bold text-white" style={{ background: BAR }}>
          Date · Manpower · Hours · Materials
        </div>
        {entries.length === 0 ? (
          <div className="p-2.5 text-[11px] italic text-[#999]">No visits logged yet</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="border-b border-dotted border-[#ddd] px-2.5 py-2 text-[11px] last:border-0">
              <div className="flex justify-between gap-2 font-bold">
                <span className="min-w-0 break-words">
                  {[e.date ? formatDate(e.date) : null, workerLabel(e, names)].filter(Boolean).join(" · ") || "—"}
                </span>
                {e.hours !== null && <span className="shrink-0">{formatHours(e.hours)}h</span>}
              </div>
              <div className="mt-0.5 break-words">
                <Materials entry={e} />
              </div>
            </div>
          ))
        )}
        <div className="border-t border-[#ccc] bg-[#f5f5f5] px-2.5 py-1.5 text-xs font-bold">
          <Total cost={call.total_cost} hours={hours} />
        </div>
      </div>

      <div className="mt-3.5 text-[11px] text-[#666]">
        Status: <strong style={{ color: INK }}>{SERVICE_STATUS_LABEL[call.status].toUpperCase()}</strong>
        {call.status === "complete" && call.completed_at && (
          <span> · completed {formatTimestamp(call.completed_at, timezone, { month: "short", day: "numeric", year: "numeric" })}</span>
        )}
      </div>
    </article>
  );
}

function Line({
  label,
  value,
  empty = "—",
  render,
}: {
  label: string;
  value: string | null;
  empty?: string;
  render?: (v: string) => ReactNode;
}) {
  return (
    <div className="break-words">
      {label}: <strong>{value ? (render ? render(value) : value) : empty}</strong>
    </div>
  );
}

function Report({ text }: { text: string | null }) {
  return text ? <>{text}</> : <span className="italic text-[#999]">No work report yet</span>;
}

function Materials({ entry: e }: { entry: WorkEntry }) {
  return (
    <>
      {e.material_source}
      {e.parking && <span className="block text-[#555]">Parking {e.parking}</span>}
      {e.notes && <span className="block italic text-[#777]">{e.notes}</span>}
    </>
  );
}

function Total({ cost, hours }: { cost: number | null; hours: number }) {
  return (
    <>
      Total: {formatMoney(cost)}
      {hours > 0 && <span className="ml-3 font-normal text-[#666]">· {formatHours(hours)} hours</span>}
    </>
  );
}
