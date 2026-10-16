"use client";

// The Phase 1 NotesList, for both RFIs (kind "rfi") and change orders (kind "co"):
// Issued / Action Needed / Complete tabs, an editor, status buttons on each card.
// Server actions come in as props so each route keeps its own table logic.

import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  Pencil,
  Ruler,
  Trash2,
  TriangleAlert,
  User,
  type LucideIcon,
} from "lucide-react";
import { ErrorNote, Label } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { Person } from "@/lib/people";
import {
  KIND_PREFIX,
  RFI_TEMPLATES,
  STATUS_META,
  blankInput,
  cleanNoteInput,
  displayNumber,
  formatDays,
  formatMoney,
  nextNumber,
  noteToInput,
  sameNumber,
  type NoteInput,
  type NoteKind,
  type NoteRow,
  type RfiTemplate,
} from "@/lib/rfis";
import { RFI_STATUSES, type RfiStatus } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op =
  | { type: "add"; note: NoteRow }
  | { type: "update"; id: string; patch: Partial<NoteRow> }
  | { type: "delete"; id: string };

function reducer(items: NoteRow[], op: Op): NoteRow[] {
  switch (op.type) {
    case "add":
      return [op.note, ...items];
    case "update":
      return items.map((n) => (n.id === op.id ? { ...n, ...op.patch } : n));
    case "delete":
      return items.filter((n) => n.id !== op.id);
  }
}

type Editor = { mode: "new" } | { mode: "edit"; id: string } | null;

const isTemp = (id: string) => id.startsWith("temp-");

const TAB_ICON: Record<RfiStatus, LucideIcon> = { issued: Clock, action: TriangleAlert, complete: CircleCheck };

export type RfiNotesListProps = {
  kind: NoteKind;
  jobId: string;
  items: NoteRow[];
  people: Person[];
  /** Today in the org timezone (YYYY-MM-DD): the default issue date. */
  today: string;
  initialTab: RfiStatus;
  createAction: (jobId: string, input: NoteInput) => Promise<ActionResult>;
  updateAction: (jobId: string, id: string, input: NoteInput) => Promise<ActionResult>;
  statusAction: (jobId: string, id: string, status: RfiStatus) => Promise<ActionResult>;
  deleteAction: (jobId: string, id: string) => Promise<ActionResult>;
};

export function RfiNotesList({
  kind,
  jobId,
  items: rows,
  people,
  today,
  initialTab,
  createAction,
  updateAction,
  statusAction,
  deleteAction,
}: RfiNotesListProps) {
  const [items, apply] = useOptimistic(rows, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<RfiStatus>(initialTab);
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState<NoteInput>(() => blankInput("", today));
  const [showTemplates, setShowTemplates] = useState(false);

  // Read by failure callbacks, so a failed save never clobbers an editor opened since.
  const editorRef = useRef<Editor>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const names = new Map(people.map((p) => [p.id, p.name]));
  const noun = kind === "rfi" ? "RFI" : "Change Order";

  const run = (op: Op | null, call: () => Promise<ActionResult>, onFail?: () => void) => {
    setError(null);
    startTransition(async () => {
      if (op) apply(op);
      const r = await call();
      if (!r.ok) {
        setError(r.error);
        onFail?.();
      }
    });
  };

  const openNew = (template?: RfiTemplate) => {
    const base = blankInput(nextNumber(kind, items.map((n) => n.number)), today);
    setDraft(template ? { ...base, subject: template.subject, body: template.question } : base);
    setEditor({ mode: "new" });
    setShowTemplates(false);
    setError(null);
  };

  const openEdit = (n: NoteRow) => {
    setDraft(noteToInput(n));
    setEditor({ mode: "edit", id: n.id });
    setShowTemplates(false);
    setError(null);
  };

  /** Fill subject + question from a template; into the open new-RFI editor, or a fresh one. */
  const applyTemplate = (t: RfiTemplate) => {
    if (editor?.mode !== "new") {
      openNew(t);
      return;
    }
    const typed = draft.subject.trim() || draft.body.trim();
    const same = draft.subject === t.subject && draft.body === t.question;
    if (typed && !same && !window.confirm("Replace the subject and question with this template?")) return;
    setDraft((d) => ({ ...d, subject: t.subject, body: t.question }));
    setShowTemplates(false);
  };

  const save = () => {
    const current = editor;
    if (!current) return;
    const clean = cleanNoteInput(kind, draft);
    if (!clean.ok) {
      setError(clean.error);
      return;
    }
    const v = clean.value;
    const existing = current.mode === "edit" ? items.find((n) => n.id === current.id) : undefined;
    if (current.mode === "edit" && !existing) {
      setError(`That ${noun.toLowerCase()} no longer exists.`);
      setEditor(null);
      return;
    }

    // Same duplicate rule as the server, checked here so the editor stays open.
    const numberChanged = !existing || !sameNumber(kind, v.number, existing.number);
    if (v.number && numberChanged && items.some((n) => n.id !== existing?.id && sameNumber(kind, n.number, v.number))) {
      setError(`${v.number} is already used on this job. The next free number is ${nextNumber(kind, items.map((n) => n.number))}.`);
      return;
    }

    const input = draft;
    const reopen = () => {
      if (editorRef.current) return;
      setDraft(input);
      setEditor(current);
    };
    const fields: Partial<NoteRow> = {
      number: v.number,
      subject: v.subject,
      drawingRef: v.drawingRef,
      body: v.body,
      response: v.response,
      impact: v.impact,
      assigneeId: v.assigneeId,
      costImpact: v.costImpact,
      scheduleDays: v.scheduleDays,
    };

    setEditor(null);
    if (current.mode === "new") {
      const note: NoteRow = {
        id: `temp-${Date.now()}`,
        number: v.number ?? nextNumber(kind, items.map((n) => n.number)),
        date: v.date ?? today,
        subject: v.subject,
        drawingRef: v.drawingRef,
        body: v.body,
        response: v.response,
        impact: v.impact,
        status: "issued",
        assigneeId: v.assigneeId,
        costImpact: v.costImpact,
        scheduleDays: v.scheduleDays,
        createdAt: new Date().toISOString(),
      };
      setTab("issued");
      run({ type: "add", note }, () => createAction(jobId, input), reopen);
    } else {
      const id = current.id;
      run(
        { type: "update", id, patch: { ...fields, date: v.date ?? existing?.date ?? null } },
        () => updateAction(jobId, id, input),
        reopen,
      );
    }
  };

  const setStatus = (n: NoteRow, status: RfiStatus) => {
    if (n.status === status) return;
    run({ type: "update", id: n.id, patch: { status } }, () => statusAction(jobId, n.id, status));
  };

  const remove = (n: NoteRow) => {
    if (!window.confirm(`Delete ${displayNumber(kind, n.number)} "${n.subject}"?`)) return;
    if (editor?.mode === "edit" && editor.id === n.id) setEditor(null);
    run({ type: "delete", id: n.id }, () => deleteAction(jobId, n.id));
  };

  const filtered = items.filter((n) => n.status === tab);
  const editorProps = {
    kind,
    draft,
    setDraft,
    people,
    onSave: save,
    onCancel: () => setEditor(null),
  };

  return (
    <>
      <div className="mb-4 flex border-b border-line">
        {RFI_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const Icon = TAB_ICON[s];
          const active = tab === s;
          const count = items.filter((n) => n.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              aria-pressed={active}
              className="-mb-px flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 border-b-2 px-1.5 py-1.5 font-display text-[11px] font-semibold uppercase leading-tight tracking-[1.5px] sm:flex-none sm:flex-row sm:gap-2 sm:px-[18px] sm:text-xs"
              style={{ color: active ? meta.color : "var(--color-dim)", borderBottomColor: active ? meta.color : "transparent" }}
            >
              <span className="flex items-center gap-1.5 text-center">
                <Icon size={14} className="hidden shrink-0 min-[420px]:block" /> {meta.label}
              </span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (editor?.mode === "new" ? setEditor(null) : openNew())}
          aria-expanded={editor?.mode === "new"}
          className="min-h-11 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
        >
          + New {noun}
        </button>
        {kind === "rfi" && (
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            aria-expanded={showTemplates}
            className="flex min-h-11 items-center gap-2 border border-line bg-surface-2 px-4 font-display text-xs uppercase tracking-[1.5px] text-ink hover:border-brand"
          >
            <ClipboardList size={14} /> Use template
          </button>
        )}
      </div>

      {showTemplates && kind === "rfi" && <TemplatePicker onPick={applyTemplate} />}

      <ErrorNote message={error} />

      {editor?.mode === "new" && (
        <div className="mb-4">
          <NoteEditor {...editorProps} isNew onTemplate={kind === "rfi" ? applyTemplate : undefined} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <FileText size={28} className="mx-auto mb-2" />
          <div className="text-xs">No items in {STATUS_META[tab].label.toLowerCase()}</div>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((n) =>
            editor?.mode === "edit" && editor.id === n.id ? (
              <NoteEditor key={n.id} {...editorProps} isNew={false} />
            ) : (
              <NoteCard
                key={n.id}
                kind={kind}
                note={n}
                names={names}
                onEdit={() => openEdit(n)}
                onDelete={() => remove(n)}
                onStatus={(s) => setStatus(n, s)}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

// ---------- templates ----------

function TemplatePicker({ onPick }: { onPick: (t: RfiTemplate) => void }) {
  return (
    <div className="mb-4 border border-steel bg-surface p-3.5">
      <div className="mb-2.5 text-[11px] tracking-[1.5px] text-steel">RFI TEMPLATES — TAP TO USE</div>
      <div className="grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {RFI_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="min-h-11 border border-line bg-bg p-2.5 text-left hover:border-brand"
          >
            <div className="text-xs font-semibold">{t.title}</div>
            <div className="mt-1 text-[10px] text-dim">{t.subject}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- editor ----------

function NoteEditor({
  kind,
  draft,
  setDraft,
  people,
  isNew,
  onSave,
  onCancel,
  onTemplate,
}: {
  kind: NoteKind;
  draft: NoteInput;
  setDraft: (update: (d: NoteInput) => NoteInput) => void;
  people: Person[];
  isNew: boolean;
  onSave: () => void;
  onCancel: () => void;
  onTemplate?: (t: RfiTemplate) => void;
}) {
  const id = useId();
  const set = (key: keyof NoteInput) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const prefix = KIND_PREFIX[kind];

  // Active crew, plus the current assignee even if they have since been deactivated,
  // so saving never silently drops an assignment.
  const assignees = people.filter((p) => p.active || p.id === draft.assigneeId);
  const unknownAssignee = draft.assigneeId && !people.some((p) => p.id === draft.assigneeId);

  return (
    <form
      className="border border-brand bg-surface p-3.5 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      {onTemplate && isNew && (
        <div className="mb-3">
          <Label htmlFor={`${id}-template`}>Start from template</Label>
          <select
            id={`${id}-template`}
            value=""
            onChange={(e) => {
              const t = RFI_TEMPLATES.find((x) => x.id === e.target.value);
              if (t) onTemplate(t);
            }}
            className="input"
          >
            <option value="">— Blank RFI —</option>
            {RFI_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3">
        <Field id={`${id}-number`} label={`${prefix} #`}>
          <input
            id={`${id}-number`}
            value={draft.number}
            onChange={(e) => set("number")(e.target.value)}
            placeholder={`${prefix}-001`}
            autoCapitalize="characters"
            className="input"
          />
        </Field>
        <Field id={`${id}-date`} label="Date">
          <input
            id={`${id}-date`}
            type="date"
            value={draft.date}
            onChange={(e) => set("date")(e.target.value)}
            className="input"
          />
        </Field>
        <Field id={`${id}-drawing`} label="Drawing Ref" wide="sm">
          <input
            id={`${id}-drawing`}
            value={draft.drawingRef}
            onChange={(e) => set("drawingRef")(e.target.value)}
            placeholder="M-101"
            autoCapitalize="characters"
            className="input"
          />
        </Field>
        <Field id={`${id}-subject`} label="Subject" wide="all">
          <input
            id={`${id}-subject`}
            value={draft.subject}
            onChange={(e) => set("subject")(e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field id={`${id}-body`} label={kind === "rfi" ? "Question" : "Description of Change"} wide="all">
          <textarea
            id={`${id}-body`}
            value={draft.body}
            onChange={(e) => set("body")(e.target.value)}
            rows={kind === "rfi" ? 4 : 3}
            className="input resize-y"
          />
        </Field>
        {kind === "rfi" && (
          <Field id={`${id}-response`} label="Response" wide="all">
            <textarea
              id={`${id}-response`}
              value={draft.response}
              onChange={(e) => set("response")(e.target.value)}
              rows={3}
              placeholder="Answer from the engineer, architect or GC..."
              className="input resize-y"
            />
          </Field>
        )}
        <Field id={`${id}-impact`} label="Impact / Notes" wide="all">
          <textarea
            id={`${id}-impact`}
            value={draft.impact}
            onChange={(e) => set("impact")(e.target.value)}
            rows={2}
            placeholder="Schedule, cost, scope impact..."
            className="input resize-y"
          />
        </Field>
        {kind === "co" && (
          <>
            <Field id={`${id}-cost`} label="Cost Impact ($)">
              <input
                id={`${id}-cost`}
                value={draft.costImpact}
                onChange={(e) => set("costImpact")(e.target.value)}
                placeholder="1250 or -500"
                className="input"
              />
            </Field>
            <Field id={`${id}-days`} label="Schedule Impact (days)">
              <input
                id={`${id}-days`}
                value={draft.scheduleDays}
                onChange={(e) => set("scheduleDays")(e.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>
          </>
        )}
        {kind === "rfi" && (
          <Field id={`${id}-assignee`} label="Assigned To" wide="sm">
            <select
              id={`${id}-assignee`}
              value={draft.assigneeId}
              onChange={(e) => set("assigneeId")(e.target.value)}
              className="input"
            >
              <option value="">— Unassigned —</option>
              {assignees.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.active ? p.name : `${p.name} (inactive)`}
                </option>
              ))}
              {unknownAssignee && <option value={draft.assigneeId}>Former crew member</option>}
            </select>
          </Field>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={!draft.subject.trim()}
          className="min-h-11 flex-1 bg-brand px-5 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50 sm:flex-none"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 border border-line px-5 font-display text-xs uppercase tracking-[1.5px] text-dim"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  wide,
  children,
}: {
  id: string;
  label: string;
  /** "all": full row; "sm": full row on phones, one column from sm up. */
  wide?: "all" | "sm";
  children: ReactNode;
}) {
  const span = wide === "all" ? "col-span-full" : wide === "sm" ? "col-span-2 sm:col-span-1" : "";
  // Bottom-aligned so a label that wraps on a phone does not push its input out of line.
  return (
    <div className={`flex min-w-0 flex-col justify-end ${span}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// ---------- a card ----------

function NoteCard({
  kind,
  note,
  names,
  onEdit,
  onDelete,
  onStatus,
}: {
  kind: NoteKind;
  note: NoteRow;
  names: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: RfiStatus) => void;
}) {
  const meta = STATUS_META[note.status];
  const temp = isTemp(note.id);
  const who = note.assigneeId ? (names.get(note.assigneeId) ?? "Former crew member") : null;
  const number = displayNumber(kind, note.number);

  return (
    <div
      className={`border border-line bg-surface p-3.5 ${temp ? "animate-pulse" : ""}`}
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-[11px] font-semibold tracking-[1.5px] text-brand">{number}</span>
            {note.date && <span className="text-[10px] text-dim">{formatDate(note.date)}</span>}
            {note.drawingRef && (
              <span className="flex min-w-0 items-center gap-1 text-[10px] text-dim">
                <Ruler size={10} className="shrink-0" />
                <span className="break-all">{note.drawingRef}</span>
              </span>
            )}
          </div>
          <div className="mt-1 break-words text-sm font-semibold">{note.subject}</div>
          {kind === "rfi" && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-dim">
              <User size={10} className="shrink-0" />
              {who ?? <span className="italic text-faint">Unassigned</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label={`Edit ${number}`} onClick={onEdit} disabled={temp}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label={`Delete ${number}`} onClick={onDelete} disabled={temp} danger>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {note.body && <div className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{note.body}</div>}

      {kind === "rfi" && note.response && (
        <div className="mt-2 border-l-2 border-steel bg-bg p-2">
          <div className="mb-0.5 text-[9px] uppercase tracking-[1.5px] text-steel">Response</div>
          <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{note.response}</div>
        </div>
      )}

      {note.impact && (
        <div className="mt-2 flex gap-1.5 border-l-2 border-warn bg-bg p-2 text-[11px] text-warn">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          <span className="min-w-0 whitespace-pre-wrap break-words">{note.impact}</span>
        </div>
      )}

      {kind === "co" && (note.costImpact !== null || note.scheduleDays !== null) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
          {note.costImpact !== null && (
            <span>
              <span className="text-[9px] uppercase tracking-[1.5px]">Cost </span>
              <span className="font-semibold text-ink">{formatMoney(note.costImpact)}</span>
            </span>
          )}
          {note.scheduleDays !== null && (
            <span className="flex items-center gap-1">
              <CalendarClock size={11} className="shrink-0" />
              <span className="font-semibold text-ink">{formatDays(note.scheduleDays)}</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-line pt-2.5">
        {RFI_STATUSES.map((s) => {
          const m = STATUS_META[s];
          const active = note.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatus(s)}
              disabled={temp}
              aria-pressed={active}
              className="min-h-11 border px-1 font-display text-[10px] font-semibold uppercase leading-tight tracking-[1px] disabled:opacity-40"
              style={
                active
                  ? { background: m.color, borderColor: m.color, color: "var(--color-bg)" }
                  : { borderColor: "var(--color-line)", color: "var(--color-dim)" }
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center border border-line-2 disabled:opacity-40 ${
        danger ? "text-faint hover:border-danger hover:text-danger" : "text-dim hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
