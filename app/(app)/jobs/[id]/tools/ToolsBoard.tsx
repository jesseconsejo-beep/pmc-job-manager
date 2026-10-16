"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, Pencil, Trash2, Undo2, Wrench } from "lucide-react";
import { addTool, deleteTool, markOnSite, markPickedUp, updateTool, type ToolPatch } from "./actions";
import { EmptyNote, ErrorNote, Label, SectionHeader, StatBlock } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { Person } from "@/lib/people";
import { splitTools, whoLabel, type PersonInput } from "@/lib/tools";
import type { Tool } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op = { type: "add"; tool: Tool } | { type: "update"; id: string; patch: Partial<Tool> } | { type: "delete"; id: string };

function reducer(tools: Tool[], op: Op): Tool[] {
  switch (op.type) {
    case "add":
      return [...tools, op.tool];
    case "update":
      return tools.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t));
    case "delete":
      return tools.filter((t) => t.id !== op.id);
  }
}

type Run = (op: Op | null, call: () => Promise<ActionResult>) => void;

const isTemp = (id: string) => id.startsWith("temp-");

/** "Oct 16", with the year only when it is not this year. */
function shortDate(iso: string, today: string): string {
  return formatDate(
    iso,
    iso.slice(0, 4) === today.slice(0, 4) ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
}

// ---------- person picker (profile dropdown with a typed-name fallback) ----------

type Choice = { id: string; text: string; other: boolean };
const NOBODY: Choice = { id: "", text: "", other: false };
const OTHER = "__other__";

function pickFrom(id: string | null, text: string | null): Choice {
  if (id) return { id, text: "", other: false };
  if (text) return { id: "", text, other: true };
  return NOBODY;
}

function toInput(p: Choice): PersonInput {
  return p.other ? { id: "", text: p.text.trim() } : { id: p.id, text: "" };
}

function hasPerson(p: Choice): boolean {
  return p.other ? p.text.trim().length > 0 : p.id.length > 0;
}

/** Optimistic columns for a pick (the server makes the same choice). */
function pickColumns(p: Choice): { id: string | null; text: string | null } {
  return p.other ? { id: null, text: p.text.trim() || null } : { id: p.id || null, text: null };
}

function PersonPicker({
  value,
  onChange,
  people,
  label,
  placeholder,
  className = "",
}: {
  value: Choice;
  onChange: (p: Choice) => void;
  people: Person[];
  label: string;
  placeholder: string;
  className?: string;
}) {
  // Active crew, plus whoever is already on the row even if they have since left.
  const options = people.filter((p) => p.active || p.id === value.id);
  return (
    <div className={`grid min-w-0 gap-1.5 ${className}`}>
      <select
        value={value.other ? OTHER : value.id}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === OTHER ? { id: "", text: value.text, other: true } : { id: v, text: "", other: false });
        }}
        aria-label={label}
        className="input"
      >
        <option value="">{placeholder}</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value={OTHER}>Someone else (type a name)…</option>
      </select>
      {value.other && (
        <input
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder="Their name"
          aria-label={`${label}: name`}
          maxLength={100}
          autoFocus
          className="input"
        />
      )}
    </div>
  );
}

// ---------- board ----------

export function ToolsBoard({
  jobId,
  tools,
  people,
  today,
}: {
  jobId: string;
  tools: Tool[];
  people: Person[];
  today: string;
}) {
  const [items, apply] = useOptimistic(tools, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const names = new Map(people.map((p) => [p.id, p.name]));

  const run: Run = (op, call) => {
    setError(null);
    startTransition(async () => {
      if (op) apply(op);
      const r = await call();
      if (!r.ok) setError(r.error);
    });
  };

  const { onSite, pickedUp } = splitTools(items);
  const rowProps = { jobId, names, people, today, run };

  return (
    <>
      {items.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatBlock value={onSite.length} label="On site" color="var(--color-primary)" />
          <StatBlock value={pickedUp.length} label="Picked up" color="var(--color-dim)" />
          <StatBlock value={items.length} label="Total" color="var(--color-ink)" />
        </div>
      )}

      <AddForm jobId={jobId} people={people} today={today} run={run} />
      <ErrorNote message={error} />

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <Wrench size={32} className="mx-auto mb-2" />
          <div className="text-xs">No tools listed yet</div>
        </div>
      ) : (
        <>
          <section className="mb-6">
            <SectionHeader title="On site" count={onSite.length} color="var(--color-primary)" />
            {onSite.length === 0 ? (
              <EmptyNote>Nothing on site right now.</EmptyNote>
            ) : (
              <div className="grid gap-1.5">
                {onSite.map((t) => (
                  <ToolRow key={t.id} tool={t} {...rowProps} />
                ))}
              </div>
            )}
          </section>
          <section>
            <SectionHeader title="Picked up" count={pickedUp.length} color="var(--color-faint)" />
            {pickedUp.length === 0 ? (
              <EmptyNote>Nothing picked up yet.</EmptyNote>
            ) : (
              <div className="grid gap-1.5">
                {pickedUp.map((t) => (
                  <ToolRow key={t.id} tool={t} {...rowProps} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

// ---------- add form ----------

function AddForm({ jobId, people, today, run }: { jobId: string; people: Person[]; today: string; run: Run }) {
  const [name, setName] = useState("");
  const [by, setBy] = useState<Choice>(NOBODY);
  const [date, setDate] = useState(today);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const who = pickColumns(by);
    const temp: Tool = {
      id: `temp-${Date.now()}`,
      job_id: jobId,
      name: n,
      dropped_by_id: who.id,
      dropped_by_text: who.text,
      dropped_date: date || null,
      picked_up: false,
      picked_up_by_id: null,
      picked_up_by_text: null,
      picked_up_date: null,
      checked: false,
      created_at: new Date().toISOString(),
    };
    const input = { name: n, dropped_by: toInput(by), dropped_date: date };
    run({ type: "add", tool: temp }, () => addTool(jobId, input));
    setName("");
    setBy(NOBODY);
    setDate(today);
  };

  return (
    <form
      className="mb-5 border border-line bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <div className="grid grid-cols-2 items-start gap-1.5 sm:grid-cols-[2fr_1.5fr_1fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tool / equipment..."
          aria-label="Tool or equipment"
          maxLength={200}
          className="input col-span-2 sm:col-span-1"
        />
        <PersonPicker
          value={by}
          onChange={setBy}
          people={people}
          label="Dropped off by"
          placeholder="Dropped off by..."
          className="col-span-2 sm:col-span-1"
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Drop-off date" className="input min-w-0" />
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-11 bg-brand px-5 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="mt-1.5 text-[10px] text-faint">
        Tip: leave &quot;dropped off by&quot; blank if you don&apos;t know yet. You can edit it later.
      </div>
    </form>
  );
}

// ---------- one tool ----------

function ToolRow({
  jobId,
  tool,
  names,
  people,
  today,
  run,
}: {
  jobId: string;
  tool: Tool;
  names: Map<string, string>;
  people: Person[];
  today: string;
  run: Run;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "pickup">("view");
  const temp = isTemp(tool.id);
  const dropped = whoLabel(tool.dropped_by_id, tool.dropped_by_text, names);
  const picked = whoLabel(tool.picked_up_by_id, tool.picked_up_by_text, names);
  const accent = tool.picked_up ? "var(--color-faint)" : tool.checked ? "var(--color-ok)" : "var(--color-primary)";

  const toggleChecked = () =>
    run({ type: "update", id: tool.id, patch: { checked: !tool.checked } }, () =>
      updateTool(jobId, tool.id, { checked: !tool.checked }),
    );

  const backOnSite = () =>
    run(
      {
        type: "update",
        id: tool.id,
        patch: { picked_up: false, picked_up_by_id: null, picked_up_by_text: null, picked_up_date: null },
      },
      () => markOnSite(jobId, tool.id),
    );

  const pickUp = (by: Choice, date: string) => {
    const who = pickColumns(by);
    run(
      {
        type: "update",
        id: tool.id,
        patch: { picked_up: true, picked_up_by_id: who.id, picked_up_by_text: who.text, picked_up_date: date || today },
      },
      () => markPickedUp(jobId, tool.id, toInput(by), date),
    );
    setMode("view");
  };

  const save = (patch: ToolPatch, optimistic: Partial<Tool>) => {
    run({ type: "update", id: tool.id, patch: optimistic }, () => updateTool(jobId, tool.id, patch));
    setMode("view");
  };

  const remove = () => {
    if (!window.confirm(`Delete "${tool.name}" from this job's tools?`)) return;
    run({ type: "delete", id: tool.id }, () => deleteTool(jobId, tool.id));
  };

  return (
    <div className={`border border-line bg-surface p-1.5 pr-2 ${temp ? "animate-pulse" : ""}`} style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={toggleChecked}
          disabled={temp}
          role="checkbox"
          aria-checked={tool.checked}
          aria-label={`Verified on site: ${tool.name}`}
          title="Verified on site"
          className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
        >
          <span
            className={`flex h-[22px] w-[22px] items-center justify-center border-2 ${
              tool.checked ? "border-ok bg-ok" : "border-line-2 bg-transparent"
            }`}
          >
            {tool.checked && <Check size={14} strokeWidth={3} className="text-bg" />}
          </span>
        </button>

        <div className={`min-w-0 flex-1 py-2 ${tool.picked_up ? "opacity-60" : ""}`}>
          <div className={`break-words text-sm font-semibold ${tool.picked_up ? "line-through" : ""}`}>{tool.name}</div>
          <div className="mt-1 grid gap-0.5 text-[11px] text-dim">
            {dropped || tool.dropped_date ? (
              <span className="flex items-start gap-1.5">
                <ArrowDownToLine size={12} className="mt-0.5 shrink-0" />
                <span>
                  {dropped ? (
                    <>
                      <span className="text-ink">{dropped}</span> dropped off
                    </>
                  ) : (
                    "Dropped off"
                  )}
                  {tool.dropped_date && ` ${shortDate(tool.dropped_date, today)}`}
                </span>
              </span>
            ) : (
              <span className="italic text-faint">Drop-off info missing</span>
            )}
            {tool.picked_up && (
              <span className="flex items-start gap-1.5">
                <ArrowUpFromLine size={12} className="mt-0.5 shrink-0" />
                <span>
                  <span className="text-ink">{picked ?? "Someone"}</span> picked up
                  {tool.picked_up_date && ` ${shortDate(tool.picked_up_date, today)}`}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1 py-0.5">
          <IconButton label="Edit tool" onClick={() => setMode(mode === "edit" ? "view" : "edit")} disabled={temp} active={mode === "edit"}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete tool" onClick={remove} disabled={temp} danger>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {mode === "view" && (
        <div className="ml-11 pb-1">
          {tool.picked_up ? (
            <button
              type="button"
              onClick={backOnSite}
              disabled={temp}
              className="flex min-h-11 items-center gap-1.5 border border-line-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-dim hover:border-ok hover:text-ok disabled:opacity-40"
            >
              <Undo2 size={14} /> Back on site
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("pickup")}
              disabled={temp}
              className="flex min-h-11 items-center gap-1.5 border border-steel px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-steel hover:bg-steel hover:text-bg disabled:opacity-40"
            >
              <ArrowUpFromLine size={14} /> Picked up
            </button>
          )}
        </div>
      )}
      {mode === "pickup" && <PickupForm people={people} today={today} onConfirm={pickUp} onCancel={() => setMode("view")} />}
      {mode === "edit" && <EditForm tool={tool} people={people} onSave={save} onCancel={() => setMode("view")} />}
    </div>
  );
}

// ---------- picked-up form ----------

function PickupForm({
  people,
  today,
  onConfirm,
  onCancel,
}: {
  people: Person[];
  today: string;
  onConfirm: (by: Choice, date: string) => void;
  onCancel: () => void;
}) {
  const [by, setBy] = useState<Choice>(NOBODY);
  const [date, setDate] = useState(today);
  const ready = hasPerson(by);

  return (
    <form
      className="mx-1 mb-1.5 mt-1 grid gap-2 border border-line-2 bg-bg p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onConfirm(by, date);
      }}
    >
      <div className="text-[10px] uppercase tracking-[1.5px] text-dim">Who picked it up?</div>
      <div className="grid gap-1.5 sm:grid-cols-[1fr_11rem] sm:items-start">
        <PersonPicker value={by} onChange={setBy} people={people} label="Picked up by" placeholder="Picked up by..." />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Pick-up date" className="input" />
      </div>
      <FormButtons submitLabel="Mark picked up" disabled={!ready} onCancel={onCancel} />
    </form>
  );
}

// ---------- edit form ----------

function EditForm({
  tool,
  people,
  onSave,
  onCancel,
}: {
  tool: Tool;
  people: Person[];
  onSave: (patch: ToolPatch, optimistic: Partial<Tool>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tool.name);
  const [droppedBy, setDroppedBy] = useState<Choice>(pickFrom(tool.dropped_by_id, tool.dropped_by_text));
  const [droppedDate, setDroppedDate] = useState(tool.dropped_date ?? "");
  const [pickedBy, setPickedBy] = useState<Choice>(pickFrom(tool.picked_up_by_id, tool.picked_up_by_text));
  const [pickedDate, setPickedDate] = useState(tool.picked_up_date ?? "");

  const ready = name.trim().length > 0 && (!tool.picked_up || (hasPerson(pickedBy) && pickedDate.length > 0));

  const submit = () => {
    if (!ready) return;
    const dropped = pickColumns(droppedBy);
    const patch: ToolPatch = { name, dropped_by: toInput(droppedBy), dropped_date: droppedDate };
    const optimistic: Partial<Tool> = {
      name: name.trim(),
      dropped_by_id: dropped.id,
      dropped_by_text: dropped.text,
      dropped_date: droppedDate || null,
    };
    if (tool.picked_up) {
      const picked = pickColumns(pickedBy);
      patch.picked_up_by = toInput(pickedBy);
      patch.picked_up_date = pickedDate;
      Object.assign(optimistic, { picked_up_by_id: picked.id, picked_up_by_text: picked.text, picked_up_date: pickedDate });
    }
    onSave(patch, optimistic);
  };

  return (
    <form
      className="mx-1 mb-1.5 mt-1 grid gap-2 border border-line-2 bg-bg p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Tool name" htmlFor={`name-${tool.id}`}>
        <input id={`name-${tool.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className="input" />
      </Field>
      <div className="grid gap-2 sm:grid-cols-[1fr_11rem] sm:items-start">
        <Field label="Dropped off by">
          <PersonPicker value={droppedBy} onChange={setDroppedBy} people={people} label="Dropped off by" placeholder="Not known" />
        </Field>
        <Field label="Drop-off date" htmlFor={`dropped-${tool.id}`}>
          <input
            id={`dropped-${tool.id}`}
            type="date"
            value={droppedDate}
            onChange={(e) => setDroppedDate(e.target.value)}
            className="input"
          />
        </Field>
      </div>
      {tool.picked_up && (
        <div className="grid gap-2 sm:grid-cols-[1fr_11rem] sm:items-start">
          <Field label="Picked up by">
            <PersonPicker value={pickedBy} onChange={setPickedBy} people={people} label="Picked up by" placeholder="Choose..." />
          </Field>
          <Field label="Pick-up date" htmlFor={`picked-${tool.id}`}>
            <input
              id={`picked-${tool.id}`}
              type="date"
              value={pickedDate}
              onChange={(e) => setPickedDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
      )}
      <FormButtons submitLabel="Save" disabled={!ready} onCancel={onCancel} />
    </form>
  );
}

// ---------- small bits ----------

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function FormButtons({ submitLabel, disabled, onCancel }: { submitLabel: string; disabled: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="submit"
        disabled={disabled}
        className="min-h-11 flex-1 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
      >
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px]">
        Cancel
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`flex h-11 w-11 shrink-0 items-center justify-center border disabled:opacity-40 ${
        active
          ? "border-brand bg-brand text-bg"
          : danger
            ? "border-line-2 text-faint hover:border-danger hover:text-danger"
            : "border-line-2 text-dim hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}
