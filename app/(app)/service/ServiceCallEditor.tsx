"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, List, Plus, X } from "lucide-react";
import { createServiceCall, updateServiceCall, type ServiceCallInput, type WorkEntryInput } from "./actions";
import { ErrorNote, Label } from "@/components/ui";
import type { Person } from "@/lib/people";
import { entriesOf, formatHours, newId, SERVICE_STATUS_COLOR, SERVICE_STATUS_LABEL } from "@/lib/service";
import { SERVICE_STATUSES, type ServiceCall, type ServiceStatus } from "@/lib/types";

type DraftEntry = WorkEntryInput & { custom: boolean };
type Draft = Omit<ServiceCallInput, "work_entries"> & { work_entries: DraftEntry[] };

const CUSTOM = "__custom";

function blankEntry(date: string): DraftEntry {
  return { id: newId(), date, worker_id: "", worker_name: "", hours: "", material_source: "", parking: "", notes: "", custom: false };
}

function draftFrom(call: ServiceCall | null, suggestedCode: string, today: string, hasCrew: boolean): Draft {
  if (!call) {
    return {
      service_code: suggestedCode,
      scheduled_date: today,
      customer_name: "",
      company_name: "",
      customer_phone: "",
      customer_po: "",
      project_name: "",
      address: "",
      work_report: "",
      total_cost: "",
      status: "upcoming",
      work_entries: [{ ...blankEntry(""), custom: !hasCrew }],
    };
  }
  const entries: DraftEntry[] = entriesOf(call).map((e) => ({
    id: e.id,
    date: e.date ?? "",
    worker_id: e.worker_id ?? "",
    worker_name: e.worker_name ?? "",
    hours: formatHours(e.hours),
    material_source: e.material_source ?? "",
    parking: e.parking ?? "",
    notes: e.notes ?? "",
    custom: !e.worker_id && (!!e.worker_name || !hasCrew),
  }));
  return {
    service_code: call.service_code ?? "",
    scheduled_date: call.scheduled_date ?? "",
    customer_name: call.customer_name ?? "",
    company_name: call.company_name ?? "",
    customer_phone: call.customer_phone ?? "",
    customer_po: call.customer_po ?? "",
    project_name: call.project_name ?? "",
    address: call.address ?? "",
    work_report: call.work_report ?? "",
    total_cost: call.total_cost === null || call.total_cost === undefined ? "" : String(call.total_cost),
    status: call.status,
    work_entries: entries.length > 0 ? entries : [{ ...blankEntry(""), custom: !hasCrew }],
  };
}

function toInput(d: Draft): ServiceCallInput {
  return {
    ...d,
    work_entries: d.work_entries.map((e) => ({
      id: e.id,
      date: e.date,
      worker_id: e.custom ? "" : e.worker_id,
      worker_name: e.worker_name,
      hours: e.hours,
      material_source: e.material_source,
      parking: e.parking,
      notes: e.notes,
    })),
  };
}

/**
 * Phase 1 ServiceCallEditor: customer & project, status, work report, the
 * multi-visit log, and the total. Create mode suggests the next service code.
 */
export function ServiceCallEditor({
  call,
  fingerprint = "",
  suggestedCode = "",
  people,
  today,
  onDone,
}: {
  call: ServiceCall | null;
  fingerprint?: string;
  suggestedCode?: string;
  people: Person[];
  today: string;
  /** Edit mode: leave the editor (after a save or a cancel). Create mode goes back to the list. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const crew = useMemo(() => people.filter((p) => p.active), [people]);
  const names = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const [initial] = useState(() => draftFrom(call, suggestedCode, today, crew.length > 0));
  // The state this edit started from; the server refuses the save if the call changed since.
  const [baseFingerprint] = useState(fingerprint);
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);

  // A save can be triggered from any field (Go on the iPhone keyboard); bring the error into view.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  // Warn before a reload or tab close throws away typed work.
  useEffect(() => {
    if (!dirty || saving) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty, saving]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setEntry = (id: string, patch: Partial<DraftEntry>) =>
    setDraft((d) => ({ ...d, work_entries: d.work_entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const addEntry = () =>
    setDraft((d) => ({ ...d, work_entries: [...d.work_entries, { ...blankEntry(today), custom: crew.length === 0 }] }));
  const removeEntry = (id: string) =>
    setDraft((d) => ({ ...d, work_entries: d.work_entries.filter((e) => e.id !== id) }));

  const hours = draft.work_entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);

  const leave = () => {
    if (dirty && !window.confirm("Discard your changes?")) return;
    if (onDone) onDone();
    else router.push("/service");
  };

  const save = () => {
    setError(null);
    startSaving(async () => {
      const input = toInput(draft);
      // Create redirects to the new call on success; update returns and we leave edit mode.
      const r = call ? await updateServiceCall(call.id, input, baseFingerprint) : await createServiceCall(input);
      if (r && !r.ok) {
        setError(r.error);
        return;
      }
      if (call) onDone?.();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className={saving ? "pointer-events-none opacity-70" : undefined}
    >
      <button
        type="button"
        onClick={leave}
        className="mb-4 inline-flex min-h-11 items-center gap-2 border border-line bg-surface-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] text-ink hover:border-brand hover:text-brand"
      >
        <ChevronLeft size={18} strokeWidth={2.5} /> Cancel
      </button>
      <h1 className="mb-4 font-display text-[22px] font-bold uppercase tracking-[1.5px]">
        {call ? "Edit work order" : "New service call"}
      </h1>

      <Section title="Customer & project">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Service code (P.O #)" id="sc-code" hint={call ? undefined : "Next number for this year. Change it if you need to."}>
            <input
              id="sc-code"
              value={draft.service_code}
              onChange={(e) => set("service_code", e.target.value)}
              placeholder={suggestedCode || "S2026-048"}
              autoCapitalize="characters"
              className="input"
            />
          </Field>
          <Field label="Scheduled date" id="sc-date">
            <input
              id="sc-date"
              type="date"
              value={draft.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Customer name" id="sc-customer">
            <input
              id="sc-customer"
              value={draft.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder="Suzanne Solven"
              autoComplete="off"
              className="input"
            />
          </Field>
          <Field label="Company" id="sc-company">
            <input
              id="sc-company"
              value={draft.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Home owner"
              autoComplete="off"
              className="input"
            />
          </Field>
          <Field label="Customer phone" id="sc-phone">
            <input
              id="sc-phone"
              type="tel"
              value={draft.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="+1 (604) ..."
              autoComplete="off"
              className="input"
            />
          </Field>
          <Field label="Customer PO (their #)" id="sc-po">
            <input
              id="sc-po"
              value={draft.customer_po}
              onChange={(e) => set("customer_po", e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Project name" id="sc-project">
              <input
                id="sc-project"
                value={draft.project_name}
                onChange={(e) => set("project_name", e.target.value)}
                placeholder="Dishwasher hose"
                className="input"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Project address" id="sc-address">
              <input
                id="sc-address"
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="2578 Camberley Crt."
                autoComplete="off"
                className="input"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Status">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="Status">
          {SERVICE_STATUSES.map((s) => (
            <StatusButton key={s} status={s} active={draft.status === s} onClick={() => set("status", s)} />
          ))}
        </div>
      </Section>

      <Section title="Work report">
        <Field label="Description of work" id="sc-report">
          <textarea
            id="sc-report"
            rows={5}
            value={draft.work_report}
            onChange={(e) => set("work_report", e.target.value)}
            placeholder="Removed old dishwasher hose that had leaked onto tile under dishwasher. Replaced with new dishwasher hose."
            className="input resize-y"
          />
        </Field>
      </Section>

      <Section
        title="Dates, workers, hours, materials"
        aside={
          <span className="text-[11px] text-dim">
            Total: <span className="font-bold text-brand">{formatHours(hours)}h</span>
          </span>
        }
      >
        <div className="grid gap-2">
          {draft.work_entries.map((e, i) => (
            <div key={e.id} className="border border-line bg-bg p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[9px] tracking-[1.5px] text-dim">VISIT #{i + 1}</div>
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  disabled={draft.work_entries.length === 1}
                  aria-label={`Remove visit ${i + 1}`}
                  title="Remove visit"
                  className="-mr-1.5 flex h-11 w-11 items-center justify-center text-danger disabled:text-faint"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[150px_1fr_90px] lg:grid-cols-[150px_1.2fr_90px_1.5fr_110px]">
                <Field label="Date" id={`${e.id}-date`}>
                  <input
                    id={`${e.id}-date`}
                    type="date"
                    value={e.date}
                    onChange={(ev) => setEntry(e.id, { date: ev.target.value })}
                    className="input"
                  />
                </Field>
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <WorkerField entry={e} crew={crew} names={names} onChange={(patch) => setEntry(e.id, patch)} />
                </div>
                <div className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
                  <Field label="Hours" id={`${e.id}-hours`}>
                    <input
                      id={`${e.id}-hours`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={24}
                      step={0.25}
                      value={e.hours}
                      onChange={(ev) => setEntry(e.id, { hours: ev.target.value })}
                      placeholder="1"
                      className="input"
                    />
                  </Field>
                </div>
                <div className="col-span-2 sm:col-span-2 lg:col-span-1">
                  <Field label="Materials" id={`${e.id}-mat`}>
                    <input
                      id={`${e.id}-mat`}
                      value={e.material_source}
                      onChange={(ev) => setEntry(e.id, { material_source: ev.target.value })}
                      placeholder="Van stock: hose / Andrew Sheret - May 27"
                      className="input"
                    />
                  </Field>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Field label="Parking" id={`${e.id}-park`}>
                    <input
                      id={`${e.id}-park`}
                      value={e.parking}
                      onChange={(ev) => setEntry(e.id, { parking: ev.target.value })}
                      placeholder="$8.50"
                      className="input"
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-2">
                <Field label="Notes" id={`${e.id}-notes`}>
                  <input
                    id={`${e.id}-notes`}
                    value={e.notes}
                    onChange={(ev) => setEntry(e.id, { notes: ev.target.value })}
                    placeholder="Additional notes..."
                    className="input"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-1.5 border border-dashed border-brand font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-brand"
        >
          <Plus size={14} strokeWidth={3} /> Add another visit / day
        </button>
        <p className="mt-2 text-[10px] text-faint">Visits with no worker, hours, materials, parking or notes are left out when you save.</p>
      </Section>

      <Section title="Total">
        <Field label="Total cost ($)" id="sc-total">
          <input
            id="sc-total"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={draft.total_cost}
            onChange={(e) => set("total_cost", e.target.value)}
            placeholder="50.00"
            className="input sm:max-w-xs"
          />
        </Field>
      </Section>

      <div ref={errorRef}>
        <ErrorNote message={error} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={leave}
          className="min-h-12 border border-line px-5 font-display text-xs uppercase tracking-[1.5px] text-dim hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="min-h-12 bg-brand px-5 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
        >
          {saving ? "Saving…" : call ? "Save changes" : "Create work order"}
        </button>
      </div>
    </form>
  );
}

// ---------- pieces ----------

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4 border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-[13px] uppercase tracking-[1.5px] text-brand">▸ {title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-faint">{hint}</p>}
    </div>
  );
}

export function StatusButton({ status, active, onClick, disabled }: { status: ServiceStatus; active: boolean; onClick: () => void; disabled?: boolean }) {
  const color = status === "cancelled" ? "var(--color-dim)" : SERVICE_STATUS_COLOR[status];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="min-h-11 border-[1.5px] px-3 font-display text-[11px] font-bold uppercase tracking-[1.5px] disabled:opacity-50"
      style={{ borderColor: color, background: active ? color : "transparent", color: active ? "var(--color-bg)" : color }}
    >
      {SERVICE_STATUS_LABEL[status]}
    </button>
  );
}

function WorkerField({
  entry: e,
  crew,
  names,
  onChange,
}: {
  entry: DraftEntry;
  crew: Person[];
  names: Map<string, string>;
  onChange: (patch: Partial<DraftEntry>) => void;
}) {
  const id = `${e.id}-worker`;
  if (e.custom) {
    return (
      <Field label="Worker" id={id}>
        <div className="flex gap-1.5">
          <input
            id={id}
            value={e.worker_name}
            onChange={(ev) => onChange({ worker_name: ev.target.value })}
            placeholder="Name"
            className="input"
          />
          {crew.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ custom: false, worker_id: "", worker_name: "" })}
              aria-label="Pick from the crew list"
              title="Pick from the crew list"
              className="flex min-h-11 w-11 shrink-0 items-center justify-center border border-line text-dim hover:border-brand"
            >
              <List size={16} />
            </button>
          )}
        </div>
      </Field>
    );
  }
  // A linked worker who has since been deactivated still shows as an option.
  const linkedInactive = e.worker_id && !crew.some((p) => p.id === e.worker_id);
  return (
    <Field label="Worker" id={id}>
      <select
        id={id}
        value={e.worker_id}
        onChange={(ev) => {
          const v = ev.target.value;
          if (v === CUSTOM) onChange({ custom: true, worker_id: "", worker_name: "" });
          else onChange({ worker_id: v, worker_name: v ? (names.get(v) ?? "") : "" });
        }}
        className="input"
      >
        <option value="">— Select —</option>
        {crew.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {linkedInactive && (
          <option value={e.worker_id}>{names.get(e.worker_id) || e.worker_name || "Former crew"} (inactive)</option>
        )}
        <option value={CUSTOM}>+ Type a name</option>
      </select>
    </Field>
  );
}
