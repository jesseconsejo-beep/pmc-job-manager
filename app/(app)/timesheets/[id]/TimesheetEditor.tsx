"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FocusEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Plus, Printer, Send, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { deleteTimesheet, removeRow, saveNotes, saveRow, setApproval, submitTimesheet } from "../actions";
import { ErrorNote, Label } from "@/components/ui";
import { formatTimestamp, longDayLabel } from "@/lib/dates";
import {
  HOUR_KINDS,
  HOUR_LABEL,
  HOUR_TITLE,
  MAX_DAY_HOURS,
  blankRow,
  cellTotal,
  dayTotal,
  fmtHours,
  kindTotal,
  round2,
  rowTotal,
  sheetDays,
  shortDay,
  weekTotal,
  type HourKind,
  type JobOption,
  type SheetDay,
} from "@/lib/timesheets";
import type { HourCell, TimesheetRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- draft rows (strings while typing, numbers when saved) ----------

type DraftCell = Record<HourKind, string>;
type DraftRow = { id: string; job_code: string; job_name: string; hours: DraftCell[] };

const toText = (n: number | null) => (n === null ? "" : String(n));

function toDraft(r: TimesheetRow): DraftRow {
  return {
    id: r.id,
    job_code: r.job_code ?? "",
    job_name: r.job_name ?? "",
    hours: r.hours.map((c) => ({ reg: toText(c.reg), ot: toText(c.ot), dt: toText(c.dt) })),
  };
}

/** "" -> null, a number 0-24 -> rounded value, anything else -> undefined (invalid). */
function parseHour(s: string): number | null | undefined {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > MAX_DAY_HOURS) return undefined;
  const r = round2(n);
  return r === 0 ? null : r;
}

function toRow(d: DraftRow): { row: TimesheetRow; invalid: boolean } {
  let invalid = false;
  const hours = d.hours.map((c): HourCell => {
    const parsed = { reg: parseHour(c.reg), ot: parseHour(c.ot), dt: parseHour(c.dt) };
    if (parsed.reg === undefined || parsed.ot === undefined || parsed.dt === undefined) invalid = true;
    return { reg: parsed.reg ?? null, ot: parsed.ot ?? null, dt: parsed.dt ?? null };
  });
  return {
    row: { id: d.id, job_code: d.job_code || null, job_name: d.job_code && d.job_name ? d.job_name : null, hours },
    invalid,
  };
}

const hasContent = (d: DraftRow) => Boolean(d.job_code) || d.hours.some((c) => c.reg || c.ot || c.dt);

const INVALID_MSG = `Hours must be numbers from 0 to ${MAX_DAY_HOURS}.`;

// ---------- props ----------

export type EditorSheet = {
  id: string;
  employeeName: string;
  week1Ending: string;
  week2Ending: string;
  approved: boolean;
  approvedAt: string | null;
  approverName: string | null;
  submittedAt: string | null;
  notes: string;
  rows: TimesheetRow[];
};

type Props = {
  sheet: EditorSheet;
  options: JobOption[];
  today: string;
  timezone: string;
  canEdit: boolean;
  canApprove: boolean;
  ownSheetApprover: boolean;
  canDelete: boolean;
  isOwn: boolean;
  letterhead: { companyName: string; legalName: string | null; logoUrl: string | null };
};

const STAMP: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };

export function TimesheetEditor({
  sheet,
  options,
  today,
  timezone,
  canEdit,
  canApprove,
  ownSheetApprover,
  canDelete,
  isOwn,
  letterhead,
}: Props) {
  const router = useRouter();
  const editable = canEdit && !sheet.approved;
  const days = useMemo(() => sheetDays(sheet.week2Ending), [sheet.week2Ending]);

  // Rows live here; the ref mirrors them so async saves always read the latest.
  const [rows, setRowsState] = useState<DraftRow[]>(() => sheet.rows.map(toDraft));
  const rowsRef = useRef<DraftRow[]>(rows);
  const setRows = (fn: (prev: DraftRow[]) => DraftRow[]) => {
    const next = fn(rowsRef.current);
    rowsRef.current = next;
    setRowsState(next);
  };

  // Unsaved line ids, and a queue so saves reach the server one at a time, in order.
  const dirtyRef = useRef<Set<string>>(new Set());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [inFlight, setInFlight] = useState(0);
  const inFlightRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const [busy, startTransition] = useTransition();

  const [notes, setNotes] = useState(sheet.notes);
  const savedNotesRef = useRef(sheet.notes);

  const todayIdx = days.findIndex((d) => d.iso === today);
  const [day, setDay] = useState(todayIdx >= 0 ? todayIdx : 0);

  const syncDirty = () => setDirtyCount(dirtyRef.current.size);
  const markDirty = (id: string) => {
    dirtyRef.current.add(id);
    syncDirty();
  };

  const enqueue = (call: () => Promise<ActionResult>, onFail?: () => void): Promise<boolean> => {
    inFlightRef.current += 1;
    setInFlight(inFlightRef.current);
    const p = queueRef.current
      .then(call)
      .then(
        (r) => {
          if (!r.ok) {
            setError(r.error);
            onFail?.();
            // e.g. approved meanwhile: pull the current state so the lock shows.
            router.refresh();
            return false;
          }
          setSavedOnce(true);
          return true;
        },
        (e: unknown) => {
          setError(e instanceof Error ? e.message : "Could not reach the server. Check the connection and try again.");
          onFail?.();
          return false;
        },
      )
      .finally(() => {
        inFlightRef.current -= 1;
        setInFlight(inFlightRef.current);
      });
    queueRef.current = p;
    return p;
  };

  const flushRow = (id: string): Promise<boolean> => {
    if (!dirtyRef.current.has(id)) return Promise.resolve(true);
    const draft = rowsRef.current.find((r) => r.id === id);
    if (!draft) {
      dirtyRef.current.delete(id);
      syncDirty();
      return Promise.resolve(true);
    }
    const { row, invalid } = toRow(draft);
    if (invalid) {
      setError(INVALID_MSG);
      return Promise.resolve(false);
    }
    dirtyRef.current.delete(id);
    syncDirty();
    setError(null);
    return enqueue(() => saveRow(sheet.id, row), () => markDirty(id));
  };

  const flushNotes = (): Promise<boolean> => {
    if (notes === savedNotesRef.current) return Promise.resolve(true);
    const value = notes;
    const before = savedNotesRef.current;
    savedNotesRef.current = value;
    return enqueue(() => saveNotes(sheet.id, value), () => {
      savedNotesRef.current = before;
    });
  };

  const flushAll = async (): Promise<boolean> => {
    const results = await Promise.all([...dirtyRef.current].map(flushRow));
    const notesOk = await flushNotes();
    await queueRef.current;
    // An earlier save that failed puts its line back in dirtyRef.
    return results.every(Boolean) && notesOk && dirtyRef.current.size === 0;
  };

  // Last-chance saves: app switch / lock screen, and a warning before leaving with unsaved lines.
  const flushAllRef = useRef(flushAll);
  useEffect(() => {
    flushAllRef.current = flushAll;
  });
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushAllRef.current();
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size > 0 || inFlightRef.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, []);

  // ---------- edits ----------

  const setHour = (rowId: string, dayIdx: number, kind: HourKind, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, hours: r.hours.map((c, i) => (i === dayIdx ? { ...c, [kind]: value } : c)) } : r,
      ),
    );
    markDirty(rowId);
  };

  const setJob = (rowId: string, code: string) => {
    const opt = options.find((o) => o.code === code);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, job_code: code, job_name: code ? opt?.name ?? "" : "" } : r)));
    markDirty(rowId);
    void flushRow(rowId);
  };

  const addRow = () => {
    setRows((prev) => [...prev, toDraft(blankRow(crypto.randomUUID()))]);
  };

  const deleteRow = (rowId: string) => {
    const draft = rowsRef.current.find((r) => r.id === rowId);
    if (!draft) return;
    if (hasContent(draft) && !window.confirm("Remove this job line and its hours?")) return;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    dirtyRef.current.delete(rowId);
    syncDirty();
    setError(null);
    void enqueue(() => removeRow(sheet.id, rowId));
  };

  /** Save a line when focus leaves it (not on every keystroke or cell). */
  const onRowBlur = (rowId: string) => (e: FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !e.currentTarget.contains(next)) void flushRow(rowId);
  };

  // ---------- sheet actions ----------

  const parsed = useMemo(() => rows.map((r) => toRow(r).row), [rows]);
  const grand = round2(weekTotal(parsed, 1) + weekTotal(parsed, 2));

  const submit = () =>
    startTransition(async () => {
      setError(null);
      if (!(await flushAll())) return;
      if (grand === 0 && !window.confirm("This sheet has no hours. Submit it anyway?")) return;
      await enqueue(() => submitTimesheet(sheet.id));
    });

  const approve = (value: boolean) =>
    startTransition(async () => {
      setError(null);
      if (!value && !window.confirm("Un-approve this sheet? It becomes editable again.")) return;
      if (value && editable && !(await flushAll())) return;
      await enqueue(() => setApproval(sheet.id, value));
    });

  const remove = () =>
    startTransition(async () => {
      if (!window.confirm(`Delete ${sheet.employeeName}'s timesheet for the period ending ${shortDay(sheet.week2Ending)}?`)) return;
      setError(null);
      const r = await deleteTimesheet(sheet.id);
      if (!r.ok) setError(r.error);
      else router.push("/timesheets");
    });

  const saveState =
    inFlight > 0 ? "Saving…" : dirtyCount > 0 ? "Unsaved changes" : savedOnce ? "All changes saved" : null;

  return (
    <div className="ts-print-root">
      <StatusBanner
        sheet={sheet}
        timezone={timezone}
        editable={editable}
        canApprove={canApprove}
        isOwn={isOwn}
        saveState={editable ? saveState : null}
      />

      <ErrorNote message={error} />

      <Letterhead letterhead={letterhead} sheet={sheet} />

      {/* Full Excel-style grid: wide screens and print. */}
      <div className="mb-4 hidden border border-line bg-surface p-3 lg:block print:block print:border-0 print:p-0">
        {editable && (
          <div className="mb-2 text-[10px] uppercase tracking-[1.5px] text-dim print:hidden">
            Enter Reg / OT / DT hours per day · each line saves when you leave it
          </div>
        )}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[1040px] border-collapse text-[11px] print:min-w-0 print:text-[9px]">
            <thead>
              <tr className="bg-bg">
                <th className="min-w-[170px] border border-line p-1.5 text-left font-display tracking-wider text-brand print:min-w-0">
                  JOB CODE
                </th>
                {[1, 2].map((w) => (
                  <th key={w} colSpan={7} className="border border-line p-1.5 text-center font-display tracking-wider text-steel">
                    WEEK {w} — ENDING {shortDay(w === 1 ? sheet.week1Ending : sheet.week2Ending)}
                  </th>
                ))}
                <th className="border border-line p-1.5 text-center font-display tracking-wider text-brand">TOTAL</th>
                {editable && <th className="border border-line p-1 print:hidden" aria-label="Remove" />}
              </tr>
              <tr className="bg-bg">
                <th className="border border-line p-1" />
                {days.map((d) => (
                  <th
                    key={d.iso}
                    scope="col"
                    title={longDayLabel(d.iso)}
                    className={`min-w-[58px] border border-line p-1 text-center font-display print:min-w-0 ${
                      d.index === 6 || d.index === 13 ? "bg-surface-2" : ""
                    } ${d.iso === today ? "text-brand" : "text-ink"}`}
                  >
                    <div className="text-[11px]">{d.letter}</div>
                    <div className="text-[9px] text-dim">{d.dom}</div>
                  </th>
                ))}
                <th className="border border-line p-1" />
                {editable && <th className="border border-line p-1 print:hidden" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const row = parsed[ri];
                return (
                  <tr key={r.id} onBlur={editable ? onRowBlur(r.id) : undefined}>
                    <td className="border border-line p-1 align-top">
                      {editable ? (
                        <div className="print:hidden">
                          <JobSelect value={r.job_code} options={options} onChange={(code) => setJob(r.id, code)} compact />
                        </div>
                      ) : null}
                      <div className={editable ? "hidden print:block" : ""}>
                        <div className="font-semibold">{r.job_code || "—"}</div>
                      </div>
                      {r.job_name && <div className="mt-0.5 px-0.5 text-[9px] text-dim">{r.job_name}</div>}
                    </td>
                    {days.map((d) => (
                      <td
                        key={d.iso}
                        className={`border border-line p-0 align-top ${d.index === 6 || d.index === 13 ? "bg-surface-2" : ""}`}
                      >
                        {editable ? (
                          <>
                            <div className="grid gap-0.5 p-0.5 print:hidden">
                              {HOUR_KINDS.map((k) => (
                                <HourInput
                                  key={k}
                                  kind={k}
                                  value={r.hours[d.index][k]}
                                  onChange={(v) => setHour(r.id, d.index, k, v)}
                                  label={`${HOUR_TITLE[k]} hours, ${longDayLabel(d.iso)}, ${r.job_code || "no job"}`}
                                  compact
                                />
                              ))}
                            </div>
                            <div className="hidden print:block">
                              <HourDisplay cell={row.hours[d.index]} />
                            </div>
                          </>
                        ) : (
                          <HourDisplay cell={row.hours[d.index]} />
                        )}
                      </td>
                    ))}
                    <td className="border border-line bg-bg p-1.5 text-center font-display text-sm font-bold text-brand">
                      {fmtHours(rowTotal(row))}
                    </td>
                    {editable && (
                      <td className="border border-line p-0.5 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => deleteRow(r.id)}
                          aria-label={`Remove line ${r.job_code || ri + 1}`}
                          title="Remove line"
                          className="flex h-11 w-11 items-center justify-center text-faint hover:text-danger"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-bg">
                <td className="border border-line p-1.5 font-display text-xs font-bold tracking-wider text-brand">DAY TOTAL</td>
                {days.map((d) => {
                  const t = dayTotal(parsed, d.index);
                  return (
                    <td
                      key={d.iso}
                      className={`border border-line p-1.5 text-center font-display text-[13px] font-bold ${
                        d.index === 6 || d.index === 13 ? "bg-surface-2" : ""
                      } ${t > MAX_DAY_HOURS ? "text-danger" : t > 0 ? "text-ink" : "text-faint"}`}
                      title={t > MAX_DAY_HOURS ? `More than ${MAX_DAY_HOURS} hours in one day` : undefined}
                    >
                      {fmtHours(t)}
                    </td>
                  );
                })}
                <td className="border border-line bg-surface-2 p-1.5 text-center font-display text-lg font-bold text-brand">
                  {fmtHours(grand)}
                </td>
                {editable && <td className="border border-line print:hidden" />}
              </tr>
            </tbody>
          </table>
        </div>
        {editable && (
          <button
            type="button"
            onClick={addRow}
            className="mt-2.5 min-h-11 border border-dashed border-brand px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-brand print:hidden"
          >
            + Add job row
          </button>
        )}
      </div>

      {/* Phones and tablets: one day at a time, touch-sized. */}
      <DayView
        days={days}
        day={day}
        setDay={setDay}
        today={today}
        rows={rows}
        parsed={parsed}
        options={options}
        editable={editable}
        onRowBlur={onRowBlur}
        setHour={setHour}
        setJob={setJob}
        addRow={addRow}
        deleteRow={deleteRow}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6">
        <SummaryBlock label="Week 1" value={weekTotal(parsed, 1)} color="var(--color-ink)" />
        <SummaryBlock label="Week 2" value={weekTotal(parsed, 2)} color="var(--color-ink)" />
        <SummaryBlock label="Regular" value={kindTotal(parsed, "reg")} color="var(--color-secondary)" />
        <SummaryBlock label="Overtime" value={kindTotal(parsed, "ot")} color="var(--color-warn)" />
        <SummaryBlock label="Double time" value={kindTotal(parsed, "dt")} color="var(--color-danger)" />
        <SummaryBlock label="Grand total" value={grand} color="var(--color-primary)" />
      </div>

      <div className="mb-4 border border-line bg-surface p-3">
        <Label htmlFor="ts-notes">Notes</Label>
        {editable ? (
          <textarea
            id="ts-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void flushNotes()}
            rows={3}
            maxLength={2000}
            placeholder="Sick, vacation, special circumstances..."
            className="input resize-y print:hidden"
          />
        ) : null}
        <div className={`whitespace-pre-wrap break-words text-sm ${editable ? "hidden print:block" : ""}`}>
          {notes.trim() || <span className="italic text-faint">No notes</span>}
        </div>
      </div>

      {ownSheetApprover && !sheet.approved && (
        <p className="mb-3 text-[11px] text-dim print:hidden">Your own timesheet needs another manager to approve it.</p>
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {canDelete && (
          <ActionButton onClick={remove} disabled={busy} tone="danger" icon={<Trash2 size={14} />}>
            Delete
          </ActionButton>
        )}
        <div className="flex-1" />
        <ActionButton onClick={() => window.print()} tone="plain" icon={<Printer size={14} />}>
          Print
        </ActionButton>
        {editable && (
          <ActionButton onClick={submit} disabled={busy} tone={sheet.submittedAt ? "plain" : "brand"} icon={<Send size={14} />}>
            {sheet.submittedAt ? "Re-submit" : "Submit"}
          </ActionButton>
        )}
        {canApprove &&
          (sheet.approved ? (
            <ActionButton onClick={() => approve(false)} disabled={busy} tone="plain" icon={<Undo2 size={14} />}>
              Un-approve
            </ActionButton>
          ) : (
            <ActionButton onClick={() => approve(true)} disabled={busy} tone="ok" icon={<ShieldCheck size={14} />}>
              Approve
            </ActionButton>
          ))}
      </div>
    </div>
  );
}

// ---------- status ----------

function StatusBanner({
  sheet,
  timezone,
  editable,
  canApprove,
  isOwn,
  saveState,
}: {
  sheet: EditorSheet;
  timezone: string;
  editable: boolean;
  canApprove: boolean;
  isOwn: boolean;
  saveState: string | null;
}) {
  let color: string;
  let icon: ReactNode;
  let title: string;
  let detail: string;
  if (sheet.approved) {
    color = "var(--color-ok)";
    icon = <Lock size={16} />;
    title = `Approved by ${sheet.approverName ?? "a manager"}${
      sheet.approvedAt ? ` on ${formatTimestamp(sheet.approvedAt, timezone, STAMP)}` : ""
    }`;
    detail = canApprove
      ? "Locked. Un-approve it to make changes."
      : isOwn
        ? "This sheet is locked. Ask a manager if something needs to change."
        : "This sheet is locked.";
  } else if (sheet.submittedAt) {
    color = "var(--color-primary)";
    icon = <Send size={16} />;
    title = `Submitted ${formatTimestamp(sheet.submittedAt, timezone, STAMP)}`;
    detail =
      editable && isOwn ? "Waiting for approval. You can still make changes until it is approved." : "Waiting for approval.";
  } else {
    color = "var(--color-faint)";
    icon = <Check size={16} />;
    title = "Draft · not submitted yet";
    detail = editable && isOwn ? "Fill in your hours, then tap Submit." : "Not submitted by the employee yet.";
  }
  return (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-start justify-between gap-2 border border-line bg-surface px-3 py-2.5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 shrink-0" style={{ color }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold uppercase tracking-[1.2px]" style={{ color }}>
            {title}
          </div>
          <div className="mt-0.5 text-[11px] text-dim print:hidden">{detail}</div>
        </div>
      </div>
      {saveState && (
        <span
          aria-live="polite"
          className={`shrink-0 text-[10px] uppercase tracking-[1.5px] print:hidden ${
            saveState === "Unsaved changes" ? "text-warn" : "text-dim"
          }`}
        >
          {saveState}
        </span>
      )}
    </div>
  );
}

// ---------- letterhead (the PMC Excel header) ----------

function Letterhead({
  letterhead,
  sheet,
}: {
  letterhead: Props["letterhead"];
  sheet: EditorSheet;
}) {
  const company = (letterhead.legalName || letterhead.companyName).toUpperCase();
  return (
    <div className="mb-4 border border-line-2 bg-white p-4 text-[#1a1a1a]">
      <div className="mb-3 text-center font-serif text-[22px] font-bold">TIME SHEET</div>
      <div className="flex items-center gap-3 border-b border-[#ccc] pb-3">
        {letterhead.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
          <img src={letterhead.logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />
        )}
        <div className="min-w-0 flex-1 text-center text-[13px] font-bold">{company}</div>
        {letterhead.logoUrl && <div className="hidden w-14 shrink-0 sm:block" />}
      </div>
      <dl className="mt-2.5 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
        <div className="flex min-w-0 gap-2">
          <dt className="font-bold">NAME:</dt>
          <dd className="truncate">{sheet.employeeName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">WK 1 ENDING:</dt>
          <dd>{shortDay(sheet.week1Ending)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">WK 2 ENDING:</dt>
          <dd>{shortDay(sheet.week2Ending)}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---------- phone day view ----------

function DayView({
  days,
  day,
  setDay,
  today,
  rows,
  parsed,
  options,
  editable,
  onRowBlur,
  setHour,
  setJob,
  addRow,
  deleteRow,
}: {
  days: SheetDay[];
  day: number;
  setDay: (d: number) => void;
  today: string;
  rows: DraftRow[];
  parsed: TimesheetRow[];
  options: JobOption[];
  editable: boolean;
  onRowBlur: (rowId: string) => (e: FocusEvent<HTMLElement>) => void;
  setHour: (rowId: string, dayIdx: number, kind: HourKind, value: string) => void;
  setJob: (rowId: string, code: string) => void;
  addRow: () => void;
  deleteRow: (rowId: string) => void;
}) {
  const current = days[day] ?? days[0];
  const total = dayTotal(parsed, current.index);
  return (
    <div className="mb-4 lg:hidden print:hidden">
      {[1, 2].map((w) => (
        <div key={w} className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-steel">
            Week {w} · ends {shortDay(days[w === 1 ? 6 : 13].iso)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days
              .filter((d) => d.week === w)
              .map((d) => {
                const t = dayTotal(parsed, d.index);
                const active = d.index === current.index;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setDay(d.index)}
                    aria-pressed={active}
                    aria-label={`${longDayLabel(d.iso)}, ${fmtHours(t)} hours`}
                    className={`flex min-h-14 flex-col items-center justify-center border px-0.5 py-1 ${
                      active ? "border-brand bg-surface-2" : "border-line bg-surface"
                    }`}
                  >
                    <span className={`text-[10px] ${d.iso === today ? "font-bold text-brand" : "text-dim"}`}>{d.letter}</span>
                    <span className={`font-display text-base leading-tight ${active ? "text-brand" : "text-ink"}`}>{d.dom}</span>
                    <span
                      className={`text-[9px] ${t > MAX_DAY_HOURS ? "text-danger" : t > 0 ? "text-ink" : "text-faint"}`}
                    >
                      {t > 0 ? `${fmtHours(t)}h` : "·"}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <div className="mb-2 mt-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px]">
          {longDayLabel(current.iso)}
          {current.iso === today && <span className="ml-1.5 text-[10px] text-brand">· today</span>}
        </h2>
        <span className={`shrink-0 font-display text-lg font-bold ${total > MAX_DAY_HOURS ? "text-danger" : "text-brand"}`}>
          {fmtHours(total)}h
        </span>
      </div>

      {rows.length === 0 && (
        <div className="mb-2 border border-dashed border-line p-4 text-center text-xs italic text-faint">No job lines yet.</div>
      )}

      <div className="grid gap-2">
        {rows.map((r, ri) => {
          const row = parsed[ri];
          const cell = r.hours[current.index];
          return (
            <div
              key={r.id}
              onBlur={editable ? onRowBlur(r.id) : undefined}
              className="border border-line bg-surface p-2.5"
              style={{ borderLeft: `3px solid ${cellTotal(row.hours[current.index]) > 0 ? "var(--color-primary)" : "var(--color-line-2)"}` }}
            >
              <div className="mb-2 flex items-start gap-1.5">
                <div className="min-w-0 flex-1">
                  {editable ? (
                    <JobSelect value={r.job_code} options={options} onChange={(code) => setJob(r.id, code)} />
                  ) : (
                    <div className="py-1">
                      <div className="text-sm font-semibold">{r.job_code || "—"}</div>
                      {r.job_name && <div className="text-[11px] text-dim">{r.job_name}</div>}
                    </div>
                  )}
                </div>
                {editable && (
                  <button
                    type="button"
                    onClick={() => deleteRow(r.id)}
                    aria-label={`Remove line ${r.job_code || ri + 1}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {editable ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {HOUR_KINDS.map((k) => (
                    <label key={k} className="block">
                      <span className={`mb-0.5 block text-[10px] uppercase tracking-[1.5px] ${KIND_TEXT[k]}`}>{HOUR_LABEL[k]}</span>
                      <HourInput
                        kind={k}
                        value={cell[k]}
                        onChange={(v) => setHour(r.id, current.index, k, v)}
                        label={`${HOUR_TITLE[k]} hours, ${longDayLabel(current.iso)}, ${r.job_code || "no job"}`}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 text-xs">
                  {HOUR_KINDS.map((k) => (
                    <span key={k} className={KIND_TEXT[k]}>
                      {HOUR_LABEL[k]} {row.hours[current.index][k] === null ? "—" : fmtHours(row.hours[current.index][k])}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1.5 text-right text-[10px] uppercase tracking-[1.2px] text-dim">
                Line total {fmtHours(rowTotal(row))}h
              </div>
            </div>
          );
        })}
      </div>

      {editable && (
        <button
          type="button"
          onClick={addRow}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 border border-dashed border-brand font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-brand"
        >
          <Plus size={14} /> Add job row
        </button>
      )}
    </div>
  );
}

// ---------- small pieces ----------

const KIND_TEXT: Record<HourKind, string> = { reg: "text-steel", ot: "text-warn", dt: "text-danger" };
const KIND_BORDER: Record<HourKind, string> = { reg: "border-steel-dark", ot: "border-warn", dt: "border-danger" };

function HourInput({
  kind,
  value,
  onChange,
  label,
  compact = false,
}: {
  kind: HourKind;
  value: string;
  onChange: (v: string) => void;
  label: string;
  compact?: boolean;
}) {
  const bad = parseHour(value) === undefined;
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={compact ? (kind === "reg" ? "R" : HOUR_LABEL[kind].toUpperCase()) : "0"}
      aria-label={label}
      aria-invalid={bad || undefined}
      title={HOUR_TITLE[kind]}
      className={`w-full border bg-bg text-center font-mono text-base outline-none placeholder:text-faint focus:border-brand ${KIND_TEXT[kind]} ${
        bad ? "border-danger bg-danger/10" : KIND_BORDER[kind]
      } ${compact ? "h-8 px-0.5" : "min-h-11 px-2"}`}
    />
  );
}

function HourDisplay({ cell }: { cell: HourCell }) {
  const total = cellTotal(cell);
  if (total === 0) return <div className="p-1.5 text-center text-faint">—</div>;
  return (
    <div className="p-1 text-center">
      <div className="font-display text-sm font-bold">{fmtHours(total)}</div>
      {(cell.ot !== null || cell.dt !== null) && (
        <div className="mt-0.5 text-[8px] leading-tight">
          {cell.reg !== null && <span className="text-steel">R{fmtHours(cell.reg)} </span>}
          {cell.ot !== null && <span className="text-warn">OT{fmtHours(cell.ot)} </span>}
          {cell.dt !== null && <span className="text-danger">DT{fmtHours(cell.dt)}</span>}
        </div>
      )}
    </div>
  );
}

function JobSelect({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: string;
  options: JobOption[];
  onChange: (code: string) => void;
  compact?: boolean;
}) {
  const groups: { label: string; kind: JobOption["kind"] }[] = [
    { label: "Contract jobs", kind: "contract" },
    { label: "Service calls", kind: "service" },
    { label: "Other codes on this sheet", kind: "other" },
  ];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Job code"
      className={`input ${compact ? "!min-h-9 !py-1" : ""}`}
    >
      <option value="">— Select job —</option>
      {groups.map((g) => {
        const list = options.filter((o) => o.kind === g.kind);
        if (list.length === 0) return null;
        return (
          <optgroup key={g.kind} label={g.label}>
            {list.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

function SummaryBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-line bg-surface p-2.5 text-center">
      <div className="text-[9px] uppercase tracking-[1.5px] text-dim">{label}</div>
      <div className="mt-1 font-display text-[22px] font-bold leading-none" style={{ color }}>
        {fmtHours(value)}h
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  tone,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "brand" | "ok" | "plain" | "danger";
  icon: ReactNode;
  children: ReactNode;
}) {
  const cls = {
    brand: "border-brand bg-brand text-bg",
    ok: "border-ok bg-ok text-bg",
    plain: "border-line text-ink hover:border-brand",
    danger: "border-line text-danger hover:border-danger",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 items-center gap-1.5 border px-4 font-display text-xs font-bold uppercase tracking-[1.5px] disabled:opacity-50 ${cls}`}
    >
      {icon}
      {children}
    </button>
  );
}
