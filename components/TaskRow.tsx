import Link from "next/link";
import { formatDate } from "@/lib/dates";

export type Urgency = "overdue" | "today" | "week";

const COLORS: Record<Urgency, string> = {
  overdue: "var(--color-danger)",
  today: "var(--color-warn)",
  week: "var(--color-primary)",
};

export type TaskRowData = {
  id: string;
  href: string;
  text: string;
  dueDate: string;
  jobName: string;
  assignee: string | null;
  checklist: string | null;
};

/** Phase 1 TaskRow: coloured left edge, job + assignee line, due date on the right. */
export function TaskRow({ task, urgency }: { task: TaskRowData; urgency: Urgency }) {
  const c = COLORS[urgency];
  return (
    <Link
      href={task.href}
      className="flex min-h-11 items-center justify-between gap-2.5 border border-line bg-surface p-2.5 hover:border-line-2"
      style={{ borderLeft: `4px solid ${c}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="break-words text-[13px] font-semibold">{task.text}</div>
        <div className="mt-0.5 truncate text-[10px] text-dim">
          {task.jobName}
          {task.checklist && ` · ${task.checklist}`}
          {task.assignee && ` · ${task.assignee}`}
        </div>
      </div>
      <div className="whitespace-nowrap text-[10px] font-bold tracking-wider" style={{ color: c }}>
        {formatDate(task.dueDate, { month: "short", day: "numeric" }).toUpperCase()}
      </div>
    </Link>
  );
}
