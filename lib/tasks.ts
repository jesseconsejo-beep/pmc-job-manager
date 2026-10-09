import type { Subitem, Task } from "@/lib/types";

/** A top-level task or a checklist subitem, flattened for dashboards. */
export type FlatTask = {
  id: string;
  taskId: string;
  jobId: string | null;
  text: string;
  dueDate: string | null;
  assigneeId: string | null;
  done: boolean;
  checklist: string | null;
};

export function subitemsOf(task: Pick<Task, "subitems">): Subitem[] {
  return Array.isArray(task.subitems) ? task.subitems : [];
}

/** Top-level tasks plus every subitem of every checklist (Phase 1 TodayView). */
export function flattenTasks(tasks: Task[]): FlatTask[] {
  const out: FlatTask[] = [];
  for (const t of tasks) {
    if (t.kind === "folder") {
      for (const s of subitemsOf(t)) {
        out.push({
          id: `${t.id}:${s.id}`,
          taskId: t.id,
          jobId: t.job_id,
          text: s.text,
          dueDate: s.due_date ?? null,
          assigneeId: s.assignee_id ?? null,
          done: s.done === true,
          checklist: t.text,
        });
      }
    } else {
      out.push({
        id: t.id,
        taskId: t.id,
        jobId: t.job_id,
        text: t.text,
        dueDate: t.due_date,
        assigneeId: t.assignee_id,
        done: t.done,
        checklist: null,
      });
    }
  }
  return out;
}

/** Open item counts for a job's tasks (top-level + subitems). */
export function taskCounts(tasks: Task[]): { open: number; done: number; all: number } {
  const flat = flattenTasks(tasks);
  const done = flat.filter((t) => t.done).length;
  return { open: flat.length - done, done, all: flat.length };
}

/** Display name for a profile id, given a lookup map. */
export function nameFor(id: string | null, names: Map<string, string>): string | null {
  if (!id) return null;
  return names.get(id) ?? null;
}
