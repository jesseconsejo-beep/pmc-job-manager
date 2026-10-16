"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  Calendar,
  Check,
  ChevronRight,
  House,
  PartyPopper,
  Pencil,
  Plus,
  Trash2,
  TreePalm,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { addEvent, addStatHolidays, deleteEvent, updateEvent, type EventInput } from "./actions";
import { ErrorNote, Label } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { Person } from "@/lib/people";
import {
  bcStatHolidays,
  dateRangeLabel,
  dayLabel,
  eventDays,
  EVENT_TYPE_META,
  groupByMonth,
  holidayPresent,
  holidayYears,
  isUpcoming,
  typeHasWho,
} from "@/lib/schedule-shared";
import { SCHEDULE_EVENT_TYPES, type ScheduleEvent, type ScheduleEventType } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

const TYPE_ICON: Record<ScheduleEventType, LucideIcon> = {
  holiday: PartyPopper,
  vacation: TreePalm,
  dayoff: House,
  event: Wrench,
};

// ---------- optimistic state ----------

type Op =
  | { type: "add"; events: ScheduleEvent[] }
  | { type: "update"; id: string; patch: Partial<ScheduleEvent> }
  | { type: "delete"; id: string };

function reducer(events: ScheduleEvent[], op: Op): ScheduleEvent[] {
  switch (op.type) {
    case "add":
      return [...events, ...op.events];
    case "update":
      return events.map((e) => (e.id === op.id ? { ...e, ...op.patch } : e));
    case "delete":
      return events.filter((e) => e.id !== op.id);
  }
}

type Run = (op: Op | null, call: () => Promise<ActionResult>, onFail?: () => void) => void;

const isTemp = (id: string) => id.startsWith("temp-");

function tempEvent(fields: Partial<ScheduleEvent>, userId: string): ScheduleEvent {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    event_type: "event",
    start_date: "",
    end_date: null,
    who_id: null,
    who_text: null,
    notes: null,
    created_by: userId,
    created_at: new Date().toISOString(),
    ...fields,
  };
}

// ---------- form draft ----------

/** who: "" (nobody), "p:<profile id>", or "other" (free text in who_text). */
type Draft = {
  title: string;
  event_type: ScheduleEventType;
  start_date: string;
  end_date: string;
  who: string;
  who_text: string;
  notes: string;
};

function blankDraft(today: string): Draft {
  return { title: "", event_type: "event", start_date: today, end_date: "", who: "", who_text: "", notes: "" };
}

function draftOf(e: ScheduleEvent): Draft {
  return {
    title: e.title,
    event_type: e.event_type,
    start_date: e.start_date,
    end_date: e.end_date ?? "",
    who: e.who_id ? `p:${e.who_id}` : e.who_text ? "other" : "",
    who_text: e.who_id ? "" : (e.who_text ?? ""),
    notes: e.notes ?? "",
  };
}

function inputOf(d: Draft): EventInput {
  return {
    title: d.title,
    event_type: d.event_type,
    start_date: d.start_date,
    end_date: d.end_date,
    who_id: d.who.startsWith("p:") ? d.who.slice(2) : "",
    who_text: d.who === "other" ? d.who_text : "",
    notes: d.notes,
  };
}

/** What the row should look like straight away, before the server answers. */
function fieldsOf(d: Draft, names: Map<string, string>): Partial<ScheduleEvent> {
  const hasWho = typeHasWho(d.event_type);
  const whoId = hasWho && d.who.startsWith("p:") ? d.who.slice(2) : null;
  return {
    title: d.title.trim(),
    event_type: d.event_type,
    start_date: d.start_date,
    end_date: d.end_date && d.end_date > d.start_date ? d.end_date : null,
    who_id: whoId,
    who_text: whoId ? (names.get(whoId) ?? null) : hasWho && d.who === "other" ? d.who_text.trim() || null : null,
    notes: d.notes.trim() || null,
  };
}

// ---------- board ----------

type Filter = "upcoming" | "past" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

export function ScheduleBoard({
  events,
  people,
  today,
  userId,
  admin,
  bcHolidays,
}: {
  events: ScheduleEvent[];
  people: Person[];
  today: string;
  userId: string;
  admin: boolean;
  /** Show the BC stat-holiday helper (region is BC and the viewer is an admin). */
  bcHolidays: boolean;
}) {
  const [items, apply] = useOptimistic(events, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [addDraft, setAddDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);

  const names = new Map(people.map((p) => [p.id, p.name]));
  const crew = people.filter((p) => p.active);

  const run: Run = (op, call, onFail) => {
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

  const upcoming = items.filter((e) => isUpcoming(e, today));
  const past = items.filter((e) => !isUpcoming(e, today));
  const counts: Record<Filter, number> = { upcoming: upcoming.length, past: past.length, all: items.length };

  const byStart = (a: ScheduleEvent, b: ScheduleEvent) =>
    a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at);
  const list =
    filter === "upcoming"
      ? [...upcoming].sort(byStart)
      : filter === "past"
        ? [...past].sort((a, b) => byStart(b, a))
        : [...items].sort(byStart);
  const groups = groupByMonth(list);

  const canChange = (e: ScheduleEvent) => admin || e.created_by === userId;

  const submitNew = (d: Draft) => {
    setAddDraft(null);
    run({ type: "add", events: [tempEvent(fieldsOf(d, names), userId)] }, () => addEvent(inputOf(d)), () => setAddDraft(d));
  };

  const submitEdit = (e: ScheduleEvent, d: Draft) => {
    setEditing(null);
    run({ type: "update", id: e.id, patch: fieldsOf(d, names) }, () => updateEvent(e.id, inputOf(d)), () =>
      setEditing({ id: e.id, draft: d }),
    );
  };

  const remove = (e: ScheduleEvent) => {
    if (!window.confirm(`Delete "${e.title}"?`)) return;
    run({ type: "delete", id: e.id }, () => deleteEvent(e.id));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Calendar size={28} className="shrink-0 text-steel" />
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold uppercase tracking-[1.5px]">Company schedule</h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-dim">
              Holidays · Time off · Company events · {counts.upcoming} upcoming
            </p>
          </div>
        </div>
        {!addDraft && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setAddDraft(blankDraft(today));
            }}
            className="flex min-h-11 items-center gap-1.5 bg-steel px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
          >
            <Plus size={14} strokeWidth={3} /> Add event
          </button>
        )}
      </div>

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

      <ErrorNote message={error} />

      {addDraft && (
        <div className="mb-4 border-2 border-steel bg-surface p-4">
          <div className="mb-3 font-display text-sm uppercase tracking-[1.5px] text-steel">New event</div>
          <EventForm
            initial={addDraft}
            crew={crew}
            names={names}
            submitLabel="Save event"
            onSubmit={submitNew}
            onCancel={() => setAddDraft(null)}
          />
        </div>
      )}

      {list.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <Calendar size={32} className="mx-auto mb-2" />
          <div className="text-xs">No {filter === "all" ? "" : filter} events</div>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mb-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="h-px flex-1 bg-line" />
              <h2 className="font-display text-[11px] font-semibold tracking-[1.5px] text-brand">{g.label}</h2>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid gap-1.5">
              {g.items.map((e) =>
                editing?.id === e.id ? (
                  <div
                    key={e.id}
                    className="border border-line bg-surface p-3"
                    style={{ borderLeft: `4px solid ${EVENT_TYPE_META[e.event_type].color}` }}
                  >
                    <EventForm
                      initial={editing.draft}
                      crew={crew}
                      names={names}
                      submitLabel="Save"
                      onSubmit={(d) => submitEdit(e, d)}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <EventCard
                    key={e.id}
                    event={e}
                    today={today}
                    who={(e.who_id ? names.get(e.who_id) : null) ?? e.who_text}
                    canChange={canChange(e)}
                    onEdit={() => {
                      setAddDraft(null);
                      setEditing({ id: e.id, draft: draftOf(e) });
                    }}
                    onDelete={() => remove(e)}
                  />
                ),
              )}
            </div>
          </section>
        ))
      )}

      {bcHolidays && <HolidayHelper events={items} today={today} userId={userId} run={run} />}
    </>
  );
}

// ---------- one event ----------

function EventCard({
  event: e,
  today,
  who,
  canChange,
  onEdit,
  onDelete,
}: {
  event: ScheduleEvent;
  today: string;
  who: string | null;
  canChange: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = EVENT_TYPE_META[e.event_type] ?? EVENT_TYPE_META.event;
  const Icon = TYPE_ICON[e.event_type] ?? Wrench;
  const label = dayLabel(e, today);
  const days = eventDays(e);
  const temp = isTemp(e.id);

  return (
    <div
      className={`border border-line bg-surface p-3 ${temp ? "animate-pulse" : ""}`}
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Icon size={15} className="shrink-0" style={{ color: meta.color }} aria-hidden />
            <span className="break-words font-display text-[15px] font-semibold tracking-wide">{e.title}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
            <span className="flex items-center gap-1">
              <Calendar size={11} className="shrink-0" /> {dateRangeLabel(e.start_date, e.end_date)}
              {days > 1 && <span className="text-faint">· {days} days</span>}
            </span>
            {who && (
              <span className="flex items-center gap-1">
                <User size={11} className="shrink-0" /> {who}
              </span>
            )}
          </div>
          {e.notes && <div className="mt-1.5 whitespace-pre-wrap break-words text-[11px] italic text-dim">{e.notes}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {label && (
            <span className="whitespace-nowrap text-[9px] font-bold tracking-wider" style={{ color: meta.color }}>
              {label}
            </span>
          )}
          {canChange && (
            <div className="flex gap-1">
              <IconButton label="Edit event" onClick={onEdit} disabled={temp}>
                <Pencil size={13} />
              </IconButton>
              <IconButton label="Delete event" onClick={onDelete} disabled={temp} danger>
                <Trash2 size={13} />
              </IconButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- add / edit form ----------

function EventForm({
  initial,
  crew,
  names,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  crew: Person[];
  names: Map<string, string>;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const ready = d.title.trim() !== "" && d.start_date !== "";

  const submit = () => {
    if (!ready) return;
    if (d.end_date && d.end_date < d.start_date) {
      setFormError("The end date is before the start date.");
      return;
    }
    setFormError(null);
    onSubmit(d);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-3"
    >
      <ErrorNote message={formError} />
      <div>
        <Label htmlFor="ev-title">Title *</Label>
        <input
          id="ev-title"
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Christmas Day, Mike vacation, Truck inspection..."
          className="input"
          maxLength={200}
        />
      </div>

      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Type">
          {SCHEDULE_EVENT_TYPES.map((t) => {
            const meta = EVENT_TYPE_META[t];
            const Icon = TYPE_ICON[t];
            const active = d.event_type === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ event_type: t })}
                className="flex min-h-11 items-center gap-1.5 border-[1.5px] px-2.5 text-left font-display text-[11px] font-semibold uppercase leading-tight tracking-[1px]"
                style={
                  active
                    ? { background: meta.color, borderColor: meta.color, color: "var(--color-bg)" }
                    : { borderColor: "var(--color-line)" }
                }
              >
                <Icon size={14} className="shrink-0" style={active ? undefined : { color: meta.color }} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <Label htmlFor="ev-start">Start date *</Label>
          <input
            id="ev-start"
            type="date"
            value={d.start_date}
            onChange={(e) => set({ start_date: e.target.value })}
            className="input"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="ev-end">End date</Label>
          <input
            id="ev-end"
            type="date"
            value={d.end_date}
            min={d.start_date || undefined}
            onChange={(e) => set({ end_date: e.target.value })}
            className="input"
          />
        </div>
      </div>

      {typeHasWho(d.event_type) && (
        <WhoField
          value={d.who}
          text={d.who_text}
          crew={crew}
          names={names}
          onChange={(who) => set({ who })}
          onText={(who_text) => set({ who_text })}
        />
      )}

      <div>
        <Label htmlFor="ev-notes">Notes</Label>
        <textarea
          id="ev-notes"
          value={d.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Optional details"
          rows={2}
          className="input resize-y"
          maxLength={2000}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="min-h-11 flex-1 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:bg-surface-2 disabled:text-faint sm:flex-none"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-dim"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function WhoField({
  value,
  text,
  crew,
  names,
  onChange,
  onText,
}: {
  value: string;
  text: string;
  crew: Person[];
  names: Map<string, string>;
  onChange: (v: string) => void;
  onText: (v: string) => void;
}) {
  // No crew profiles to pick from: just a name box (as in Phase 1).
  if (crew.length === 0 && !value.startsWith("p:")) {
    return (
      <div>
        <Label htmlFor="ev-who-text">Who</Label>
        <input
          id="ev-who-text"
          value={text}
          onChange={(e) => {
            onChange(e.target.value ? "other" : "");
            onText(e.target.value);
          }}
          placeholder="Employee name"
          className="input"
          maxLength={120}
        />
      </div>
    );
  }

  // Someone picked earlier who has since been deactivated stays selectable.
  const currentId = value.startsWith("p:") ? value.slice(2) : null;
  const inactiveCurrent = currentId && !crew.some((p) => p.id === currentId) ? currentId : null;

  return (
    <div>
      <Label htmlFor="ev-who">Who</Label>
      <select id="ev-who" value={value} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">— Select —</option>
        {crew.map((p) => (
          <option key={p.id} value={`p:${p.id}`}>
            {p.name}
          </option>
        ))}
        {inactiveCurrent && (
          <option value={`p:${inactiveCurrent}`}>{names.get(inactiveCurrent) ?? "Former crew member"} (inactive)</option>
        )}
        <option value="other">Someone else (type a name)…</option>
      </select>
      {value === "other" && (
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Name"
          aria-label="Who (name)"
          className="input mt-1.5"
          maxLength={120}
          autoFocus
        />
      )}
    </div>
  );
}

// ---------- BC stat holidays ----------

function HolidayHelper({
  events,
  today,
  userId,
  run,
}: {
  events: ScheduleEvent[];
  today: string;
  userId: string;
  run: Run;
}) {
  const years = holidayYears(today);
  // After Christmas, this year's list is all behind us: start on next year.
  const [year, setYear] = useState(() => (today > `${years[0]}-12-25` ? years[1] : years[0]));
  const [open, setOpen] = useState(() => !events.some((e) => e.event_type === "holiday" && e.start_date >= today));

  const list = bcStatHolidays(year).map((h) => ({ ...h, present: holidayPresent(h, events), past: h.date < today }));
  const toAdd = list.filter((h) => !h.present && !h.past);
  const addedCount = list.filter((h) => h.present).length;

  const add = (hs: typeof list) => {
    if (hs.length === 0) return;
    const temps = hs.map((h) => tempEvent({ title: h.title, event_type: "holiday", start_date: h.date }, userId));
    const keys = hs.map((h) => h.key);
    run({ type: "add", events: temps }, () => addStatHolidays(year, keys));
  };

  return (
    <section className="mt-6 border border-dashed border-line-2 bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left"
      >
        <ChevronRight size={16} className={`shrink-0 text-dim transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="flex-1 text-[11px] uppercase tracking-[1.5px] text-dim">Quick add: BC stat holidays</span>
        <span className="text-[10px] tracking-wider text-faint">
          {addedCount}/{list.length} in {year}
        </span>
      </button>

      {open && (
        <div className="border-t border-line p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                aria-pressed={year === y}
                className={`min-h-11 border px-4 font-display text-xs font-semibold tracking-[1.5px] ${
                  year === y ? "border-brand bg-brand text-bg" : "border-line text-ink"
                }`}
              >
                {y}
              </button>
            ))}
            {toAdd.length > 0 && (
              <button
                type="button"
                onClick={() => add(toAdd)}
                className="ml-auto flex min-h-11 items-center gap-1.5 bg-ok px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
              >
                <Plus size={14} strokeWidth={3} /> Add {toAdd.length === list.length ? "all" : toAdd.length}
              </button>
            )}
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {list.map((h) => (
              <button
                key={h.key}
                type="button"
                disabled={h.present}
                onClick={() => add([h])}
                aria-label={h.present ? `${h.title} is on the schedule` : `Add ${h.title}`}
                className={`flex min-h-11 items-center justify-between gap-2 border px-3 py-1.5 text-left ${
                  h.present ? "border-line opacity-60" : "border-line-2 hover:border-ok"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{h.title}</span>
                  <span className={`block text-[10px] ${h.past ? "text-faint" : "text-dim"}`}>
                    {formatDate(h.date, { weekday: "short", month: "short", day: "numeric" })}
                    {h.past && !h.present ? " · passed" : ""}
                  </span>
                </span>
                {h.present ? (
                  <Check size={16} className="shrink-0 text-ok" aria-hidden />
                ) : (
                  <Plus size={16} className="shrink-0 text-dim" aria-hidden />
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] italic text-faint">
            Dates follow the BC Employment Standards Act. When a holiday falls on someone&apos;s day off, check your
            agreement for the day in lieu.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------- small controls ----------

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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center border disabled:opacity-40 ${
        danger ? "border-line-2 text-faint hover:border-danger hover:text-danger" : "border-line-2 text-dim hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}
