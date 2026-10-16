import { STATUS_COLOR, STATUS_LABEL, type SheetStatus } from "@/lib/timesheets";

/** Approved / Submitted / Draft tag, as in the Phase 1 timesheet list. */
export function TimesheetBadge({ status }: { status: SheetStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-block whitespace-nowrap border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ color, borderColor: color }}
    >
      {status === "approved" ? "✓ " : ""}
      {STATUS_LABEL[status]}
    </span>
  );
}
