"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Calendar, Check, ChevronRight, Folder, ListChecks, Pencil, Trash2, User, X } from "lucide-react";
import {
  addChecklist,
  addSubitem,
  addTask,
  deleteTask,
  removeSubitem,
  updateSubitem,
  updateTask,
  type SubitemPatch,
  type TaskPatch,
} from "./actions";
import { ErrorNote } from "@/components/ui";
import { diffDays, formatDate, formatTimestamp } from "@/lib/dates";
import type { Person } from "@/lib/people";
import { subitemsOf } from "@/lib/tasks";
import type { Subitem, Task } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op =
  | { type: "add"; task: Task }
  | { type: "update"; id: string; patch: Partial<Task> }
  | { type: "delete"; id: string }
  | { type: "addSub"; id: string; sub: Subitem }
  | { type: "updateSub"; id: string; subId: string; patch: Partial<Subitem> }
  | { type: "removeSub"; id: string; subId: string };

function reducer(tasks: Task[], op: Op): Task[] {
  switch (op.type) {
    case "add":
      return [op.task, ...tasks];
    case "update":
      return tasks.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t));
    case "delete":
      return tasks.filter((t) => t.id !== op.id);
    case "addSub":
      return tasks.map((t) => (t.id === op.id ? { ...t, subitems: [...subitemsOf(t), op.sub] } : t));
    case "updateSub":
      return tasks.map((t) =>
        t.id === op.id
          ? { ...t, subitems: subitemsOf(t).map((s) => (s.id === op.subId ? { ...s, ...op.patch } : s)) }
          : t,
      );
    case "removeSub":
      return tasks.map((t) =>
        t.id === op.id ? { ...t, subitems: subitemsOf(t).filter((s) => s.id !== op.subId) } : t,
      );
  }
}

type Run = (op: Op | null, call: () => Promise<ActionResult>) => void;

const isTemp = (id: string) => id.startsWith("temp-");
const nowIso = () => new Date().toISOString();

// ---------- urgency (Phase 1 getUrgency, against today in the org timezone) ----------

type Urgency = { color: string; label: string };

function urgencyOf(done: boolean, due: string | null, today: string): Urgency {
  if (done) return { color: "var(--color-ok)", label: "DONE" };
  if (!due) return { color: "var(--color-secondary)", label: "" };
  const diff = diffDays(today, due);
  if (diff < 0) return { color: "var(--color-danger)", label: `OVERDUE ${Math.abs(diff)}D` };
  if (diff === 0) return { color: "var(--color-warn)", label: "TODAY" };
  if (diff <= 2) return { color: "var(--color-warn)", label: `${diff}D` };
  if (diff <= 7) return { color: "var(--color-primary)", label: `${diff}D` };
  return { color: "var(--color-secondary)", label: shortDate(due) };
}

function shortDate(iso: string): string {
  return formatDate(iso, { month: "short", day: "numeric" }).toUpperCase();
}

// ---------- board ----------

type Filter = "open" | "done" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

export function TasksBoard({
  jobId,
  tasks,
  people,
  today,
  timezone,
}: {
  jobId: string;
  tasks: Task[];
  people: Person[];
  today: string;
  timezone: string;
}) {
  const [items, apply] = useOptimistic(tasks, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  const names = new Map(people.map((p) => [p.id, p.name]));
  const crew = people.filter((p) => p.active);

  const run: Run = (op, call) => {
    setError(null);
    startTransition(async () => {
      if (op) apply(op);
      const r = await call();
      if (!r.ok) setError(r.error);
    });
  };

  // Counts across top-level tasks and every checklist line.
  const topTasks = items.filter((t) => t.kind === "task");
  const subs = items.filter((t) => t.kind === "folder").flatMap(subitemsOf);
  const counts: Record<Filter, number> = {
    open: topTasks.filter((t) => !t.done).length + subs.filter((s) => !s.done).length,
    done: topTasks.filter((t) => t.done).length + subs.filter((s) => s.done).length,
    all: topTasks.length + subs.length,
  };

  const visible = items
    .filter((t) => {
      if (t.kind === "folder") {
        if (filter === "all") return true;
        const lines = subitemsOf(t);
        return lines.length === 0 || lines.some((s) => (filter === "open" ? !s.done : s.done));
      }
      if (filter === "open") return !t.done;
      if (filter === "done") return t.done;
      return true;
    })
    .sort((a, b) => {
      // Checklists first, then tasks: open before done, dated before undated, soonest first.
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      if (a.kind === "task") {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && !b.due_date) return -1;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      }
      return 0;
    });

  return (
    <>
      <div className="mb-4 flex border-b border-line">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`min-h-11 border-b-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] ${
                active ? "border-brand text-brand" : "border-transparent text-dim"
              }`}
            >
              {f.label} <span className="text-[10px] opacity-60">({counts[f.id]})</span>
            </button>
          );
        })}
      </div>

      <AddBar jobId={jobId} crew={crew} run={run} />
      <ErrorNote message={error} />

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <ListChecks size={32} className="mx-auto mb-2" />
          <div className="text-xs">No {filter === "all" ? "" : filter} items</div>
        </div>
      ) : (
        <div className="grid gap-1.5">
          {visible.map((t) =>
            t.kind === "folder" ? (
              <ChecklistFolder
                key={t.id}
                jobId={jobId}
                folder={t}
                filter={filter}
                today={today}
                names={names}
                crew={crew}
                run={run}
              />
            ) : (
              <TaskItem key={t.id} jobId={jobId} task={t} today={today} timezone={timezone} names={names} crew={crew} run={run} />
            ),
          )}
        </div>
      )}
    </>
  );
}

// ---------- add bar ----------

function AddBar({ jobId, crew, run }: { jobId: string; crew: Person[]; run: Run }) {
  const [kind, setKind] = useState<"task" | "folder">("task");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const base: Task = {
      id: `temp-${Date.now()}`,
      job_id: jobId,
      kind,
      text: t,
      note: null,
      due_date: null,
      assignee_id: null,
      done: false,
      completed_at: null,
      subitems: [],
      expanded: true,
      created_by: null,
      created_at: nowIso(),
    };
    if (kind === "folder") {
      run({ type: "add", task: base }, () => addChecklist(jobId, t));
    } else {
      const input = { text: t, note, due_date: due, assignee_id: assignee };
      run(
        { type: "add", task: { ...base, note: note.trim() || null, due_date: due || null, assignee_id: assignee || null } },
        () => addTask(jobId, input),
      );
    }
    setText("");
    setNote("");
    setDue("");
    setAssignee("");
  };

  return (
    <div className="mb-4 border border-line bg-surface p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(
          [
            { id: "task", label: "Task", hint: "with note + due date", icon: ListChecks },
            { id: "folder", label: "Checklist", hint: "group of subtasks", icon: Folder },
          ] as const
        ).map((k) => {
          const Icon = k.icon;
          const active = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={active}
              className={`flex min-h-11 items-center gap-1.5 border-[1.5px] px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
                active ? "border-brand bg-brand text-bg" : "border-line bg-bg text-ink"
              }`}
            >
              <Icon size={14} /> {k.label}
              <span className="hidden text-[9px] font-normal normal-case opacity-70 sm:inline">· {k.hint}</span>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === "folder" ? "Checklist name (e.g. Pre-pour, Inspection)..." : "What needs doing?"}
          aria-label={kind === "folder" ? "Checklist name" : "Task"}
          className="input mb-2"
        />
        {kind === "task" ? (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Short note (optional)..."
              aria-label="Note"
              className="input mb-1.5"
            />
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[1fr_1fr_auto]">
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="input" />
              <AssigneeSelect value={assignee} onChange={setAssignee} crew={crew} />
              <button
                type="submit"
                disabled={!text.trim()}
                className="col-span-2 min-h-11 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50 sm:col-span-1"
              >
                Add
              </button>
            </div>
          </>
        ) : (
          <button
            type="submit"
            disabled={!text.trim()}
            className="min-h-11 w-full bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
          >
            + Add checklist
          </button>
        )}
      </form>
    </div>
  );
}

function AssigneeSelect({
  value,
  onChange,
  crew,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  crew: Person[];
  compact?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Assignee"
      className={`input ${compact ? "!min-h-9 !py-1 !text-sm" : ""}`}
    >
      <option value="">— Assignee —</option>
      {crew.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

// ---------- a top-level task ----------

function TaskItem({
  jobId,
  task,
  today,
  timezone,
  names,
  crew,
  run,
}: {
  jobId: string;
  task: Task;
  today: string;
  timezone: string;
  names: Map<string, string>;
  crew: Person[];
  run: Run;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [note, setNote] = useState(task.note ?? "");
  const [due, setDue] = useState(task.due_date ?? "");
  const [assignee, setAssignee] = useState(task.assignee_id ?? "");

  const u = urgencyOf(task.done, task.due_date, today);
  const temp = isTemp(task.id);
  const who = task.assignee_id ? names.get(task.assignee_id) : null;

  const toggle = () =>
    run({ type: "update", id: task.id, patch: { done: !task.done, completed_at: task.done ? null : nowIso() } }, () =>
      updateTask(jobId, task.id, { done: !task.done }),
    );

  const startEdit = () => {
    setText(task.text);
    setNote(task.note ?? "");
    setDue(task.due_date ?? "");
    setAssignee(task.assignee_id ?? "");
    setEditing(true);
  };

  const save = () => {
    if (!text.trim()) return;
    const patch: TaskPatch = { text, note, due_date: due, assignee_id: assignee };
    run(
      {
        type: "update",
        id: task.id,
        patch: { text: text.trim(), note: note.trim() || null, due_date: due || null, assignee_id: assignee || null },
      },
      () => updateTask(jobId, task.id, patch),
    );
    setEditing(false);
  };

  const remove = () => {
    if (!window.confirm(`Delete "${task.text}"?`)) return;
    run({ type: "delete", id: task.id }, () => deleteTask(jobId, task.id));
  };

  return (
    <div
      className={`border border-line bg-surface p-1.5 pr-2 ${task.done ? "opacity-55" : ""} ${temp ? "animate-pulse" : ""}`}
      style={{ borderLeft: `4px solid ${u.color}` }}
    >
      <div className="flex items-start gap-1">
        <CheckButton done={task.done} onClick={toggle} disabled={temp} label={task.text} />
        <div className="min-w-0 flex-1 py-2">
          {editing ? (
            <form
              className="grid gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Task" className="input" />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Short note..."
                aria-label="Note"
                className="input"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="input" />
                <AssigneeSelect value={assignee} onChange={setAssignee} crew={crew} />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="min-h-11 flex-1 bg-brand font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={`break-words text-sm font-semibold ${task.done ? "line-through" : ""}`}>{task.text}</div>
              {task.note && <div className="mt-0.5 break-words text-[11px] italic text-dim">{task.note}</div>}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-dim">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> Due {shortDate(task.due_date)}
                  </span>
                )}
                {who && (
                  <span className="flex items-center gap-1">
                    <User size={10} /> {who}
                  </span>
                )}
                {task.done && task.completed_at && (
                  <span className="text-ok">
                    ✓ {formatTimestamp(task.completed_at, timezone, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 items-start gap-1 py-1">
            {!task.done && u.label && (
              <span
                className="mt-1.5 hidden whitespace-nowrap border px-1.5 py-1 text-[9px] font-bold tracking-wider min-[400px]:inline-block"
                style={{ color: u.color, borderColor: u.color }}
              >
                {u.label}
              </span>
            )}
            <IconButton label="Edit task" onClick={startEdit} disabled={temp}>
              <Pencil size={13} />
            </IconButton>
            <IconButton label="Delete task" onClick={remove} disabled={temp} danger>
              <Trash2 size={13} />
            </IconButton>
          </div>
        )}
      </div>
      {!editing && !task.done && u.label && (
        <div className="ml-11 pb-1 text-[9px] font-bold tracking-wider min-[400px]:hidden" style={{ color: u.color }}>
          {u.label}
        </div>
      )}
    </div>
  );
}

// ---------- a checklist (folder) ----------

function ChecklistFolder({
  jobId,
  folder,
  filter,
  today,
  names,
  crew,
  run,
}: {
  jobId: string;
  folder: Task;
  filter: Filter;
  today: string;
  names: Map<string, string>;
  crew: Person[];
  run: Run;
}) {
  // Expand/collapse is a per-device view choice; it starts from the stored value.
  const [expanded, setExpanded] = useState(folder.expanded ?? true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.text);
  const [draft, setDraft] = useState("");
  const temp = isTemp(folder.id);

  const lines = subitemsOf(folder);
  const shown = lines.filter((s) => (filter === "open" ? !s.done : filter === "done" ? s.done : true));
  const doneCount = lines.filter((s) => s.done).length;
  const openCount = lines.length - doneCount;
  const pct = lines.length > 0 ? Math.round((doneCount / lines.length) * 100) : 0;

  const rename = () => {
    setRenaming(false);
    const name = newName.trim();
    if (!name || name === folder.text) return;
    run({ type: "update", id: folder.id, patch: { text: name } }, () => updateTask(jobId, folder.id, { text: name }));
  };

  const addLine = () => {
    const t = draft.trim();
    if (!t) return;
    const sub: Subitem = {
      id: `temp-${Date.now()}`,
      text: t,
      done: false,
      due_date: null,
      assignee_id: null,
      created_at: nowIso(),
    };
    run({ type: "addSub", id: folder.id, sub }, () => addSubitem(jobId, folder.id, t));
    setDraft("");
  };

  const patchLine = (s: Subitem, patch: SubitemPatch, optimistic: Partial<Subitem>) =>
    run({ type: "updateSub", id: folder.id, subId: s.id, patch: optimistic }, () =>
      updateSubitem(jobId, folder.id, s.id, patch),
    );

  const remove = () => {
    if (!window.confirm(`Delete checklist "${folder.text}" and all its items?`)) return;
    run({ type: "delete", id: folder.id }, () => deleteTask(jobId, folder.id));
  };

  return (
    <div className={`border border-line bg-surface ${temp ? "animate-pulse" : ""}`} style={{ borderLeft: "4px solid var(--color-secondary)" }}>
      <div className={`flex items-center gap-1.5 p-1.5 ${expanded ? "border-b border-line" : ""}`}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
          className="flex h-11 w-9 shrink-0 items-center justify-center text-dim"
        >
          <ChevronRight size={18} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        <Folder size={16} className="shrink-0 text-steel" />
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={rename}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") setRenaming(false);
              }}
              autoFocus
              aria-label="Checklist name"
              className="input !min-h-9 !py-1 font-display font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (temp) return;
                setNewName(folder.text);
                setRenaming(true);
              }}
              title="Tap to rename"
              className="block w-full truncate text-left font-display text-sm font-semibold tracking-wide"
            >
              {folder.text}
            </button>
          )}
          <div className="mt-0.5 text-[9px] tracking-wider text-dim">
            {openCount} OPEN · {doneCount} DONE {lines.length > 0 && `· ${pct}%`}
          </div>
        </div>
        {lines.length > 0 && (
          <div className="h-1 w-12 shrink-0 bg-bg">
            <div className="h-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--color-ok)" : "var(--color-primary)" }} />
          </div>
        )}
        <IconButton label="Delete checklist" onClick={remove} disabled={temp} danger>
          <Trash2 size={13} />
        </IconButton>
      </div>

      {expanded && (
        <div className="p-2.5">
          <form
            className="mb-2.5 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              addLine();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a subtask..."
              aria-label="New subtask"
              disabled={temp}
              className="input"
            />
            <button
              type="submit"
              disabled={!draft.trim() || temp}
              className="min-h-11 shrink-0 bg-steel px-4 font-display text-[11px] font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {shown.length === 0 ? (
            <div className="p-3 text-center text-[11px] italic text-faint">
              {lines.length === 0 ? "No items yet" : `No ${filter === "all" ? "" : filter} items`}
            </div>
          ) : (
            <div className="grid gap-1">
              {shown.map((s) => (
                <SubitemRow key={s.id} sub={s} today={today} names={names} crew={crew} onPatch={patchLine} onRemove={() =>
                  run({ type: "removeSub", id: folder.id, subId: s.id }, () => removeSubitem(jobId, folder.id, s.id))
                } />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubitemRow({
  sub: s,
  today,
  names,
  crew,
  onPatch,
  onRemove,
}: {
  sub: Subitem;
  today: string;
  names: Map<string, string>;
  crew: Person[];
  onPatch: (s: Subitem, patch: SubitemPatch, optimistic: Partial<Subitem>) => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = useState<"date" | "assignee" | null>(null);
  const u = urgencyOf(s.done, s.due_date, today);
  const temp = isTemp(s.id);
  const who = s.assignee_id ? names.get(s.assignee_id) : null;

  return (
    <div
      className={`px-1 py-0.5 ${s.done ? "bg-bg opacity-55" : ""} ${temp ? "animate-pulse" : ""}`}
      style={{ borderLeft: `2px solid ${u.color}` }}
    >
      <div className="flex items-center gap-1">
        <CheckButton
          small
          done={s.done}
          disabled={temp}
          label={s.text}
          onClick={() =>
            onPatch(s, { done: !s.done }, { done: !s.done, completed_at: s.done ? null : nowIso() })
          }
        />
        <div className="min-w-0 flex-1">
          <div className={`break-words text-[13px] ${s.done ? "line-through" : ""}`}>{s.text}</div>
          {(s.due_date || who) && (
            <div className="mt-px flex flex-wrap gap-x-2 text-[9px] text-dim">
              {s.due_date && (
                <span className="font-bold" style={{ color: u.color }}>
                  {shortDate(s.due_date)}
                  {u.label && u.label !== shortDate(s.due_date) && !s.done ? ` · ${u.label}` : ""}
                </span>
              )}
              {who && <span>{who}</span>}
            </div>
          )}
        </div>
        <IconButton
          label="Set due date"
          onClick={() => setPicking(picking === "date" ? null : "date")}
          disabled={temp}
          active={!!s.due_date}
          activeColor="var(--color-primary)"
        >
          <Calendar size={13} />
        </IconButton>
        <IconButton
          label="Assign"
          onClick={() => setPicking(picking === "assignee" ? null : "assignee")}
          disabled={temp}
          active={!!s.assignee_id}
          activeColor="var(--color-secondary)"
        >
          <User size={13} />
        </IconButton>
        <IconButton label="Remove subtask" onClick={onRemove} disabled={temp} danger>
          <X size={13} />
        </IconButton>
      </div>

      {picking === "date" && (
        <div className="mb-1 ml-10 mt-1 flex gap-1.5">
          <input
            type="date"
            defaultValue={s.due_date ?? ""}
            aria-label="Subtask due date"
            className="input !min-h-9 !py-1"
            onChange={(e) => {
              const v = e.target.value;
              onPatch(s, { due_date: v }, { due_date: v || null });
              setPicking(null);
            }}
          />
          {s.due_date && (
            <button
              type="button"
              onClick={() => {
                onPatch(s, { due_date: "" }, { due_date: null });
                setPicking(null);
              }}
              className="min-h-9 shrink-0 border border-line px-3 text-[11px] text-dim"
            >
              Clear
            </button>
          )}
        </div>
      )}
      {picking === "assignee" && (
        <div className="mb-1 ml-10 mt-1">
          <AssigneeSelect
            compact
            value={s.assignee_id ?? ""}
            crew={crew}
            onChange={(v) => {
              onPatch(s, { assignee_id: v }, { assignee_id: v || null });
              setPicking(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------- small controls ----------

function CheckButton({
  done,
  onClick,
  disabled,
  label,
  small = false,
}: {
  done: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  small?: boolean;
}) {
  const box = small ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      className="flex h-11 w-10 shrink-0 items-center justify-center"
    >
      <span
        className={`flex ${box} items-center justify-center border-2 ${done ? "border-ok bg-ok" : "border-line-2 bg-transparent"}`}
      >
        {done && <Check size={small ? 11 : 14} strokeWidth={3} className="text-bg" />}
      </span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  active = false,
  activeColor,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  activeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center border disabled:opacity-40 ${
        danger ? "border-line-2 text-faint hover:border-danger hover:text-danger" : "border-line-2 text-dim hover:border-brand"
      }`}
      style={active && activeColor ? { background: activeColor, borderColor: activeColor, color: "var(--color-bg)" } : undefined}
    >
      {children}
    </button>
  );
}
