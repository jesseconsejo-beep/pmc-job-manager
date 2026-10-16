"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, X } from "lucide-react";
import { createTimesheet } from "./actions";
import { ErrorNote, Label } from "@/components/ui";
import type { Person } from "@/lib/people";
import { NO_PERIOD_MESSAGE, periodRange, shortDay, type Periods } from "@/lib/timesheets";

type Props = {
  periods: Periods;
  /** week2_ending -> id of the viewer's own sheets, so the buttons can say "Open". */
  mineByPeriod: Record<string, string>;
  admin: boolean;
  me: string;
  people: Person[];
  /** Owner/developer: may set the pay period in Company settings. */
  canSetPeriod: boolean;
  variant?: "header" | "empty";
};

/** "+ NEW TIMESHEET": pick the current or previous pay period (managers: and whose sheet). */
export function NewTimesheetButton(props: Props) {
  const [open, setOpen] = useState(false);
  const header = (props.variant ?? "header") === "header";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          header
            ? "clip-cta flex min-h-11 shrink-0 items-center gap-2 bg-brand px-4 font-display text-[13px] font-bold uppercase tracking-[1.5px] text-bg"
            : "flex min-h-11 items-center gap-2 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
        }
      >
        <Plus size={16} strokeWidth={3} /> {header ? "New timesheet" : "Start first timesheet"}
      </button>
      {open && <NewTimesheetModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewTimesheetModal({
  periods,
  mineByPeriod,
  admin,
  me,
  people,
  canSetPeriod,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(me);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = (which: "current" | "previous") => {
    setError(null);
    startTransition(async () => {
      const r = await createTimesheet(which, employee === me ? null : employee);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/timesheets/${r.id}`);
    });
  };

  const options =
    periods.source === "anchor"
      ? [
          { which: "current" as const, title: "Current period", end: periods.current },
          { which: "previous" as const, title: "Previous period", end: periods.previous },
        ]
      : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ts-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md border-2 border-brand bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-ts-title" className="font-display text-xl uppercase tracking-[1.5px]">
            New timesheet
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center text-ink">
            <X size={20} />
          </button>
        </div>

        <ErrorNote message={error} />

        {options.length === 0 && (
          <div role="status" className="border border-line-2 bg-bg p-3">
            <p className="text-xs leading-relaxed text-dim">{NO_PERIOD_MESSAGE}</p>
            {canSetPeriod && (
              <Link
                href="/settings"
                className="mt-2 inline-flex min-h-11 items-center font-display text-[11px] font-bold uppercase tracking-[1.5px] text-brand"
              >
                Open Company settings <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}

        {options.length > 0 && admin && people.length > 0 && (
          <div className="mb-4">
            <Label htmlFor="ts-employee">Employee</Label>
            <select
              id="ts-employee"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="input"
            >
              {!people.some((p) => p.id === me) && <option value={me}>Me</option>}
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === me ? " (me)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-2">
          {options.map((o) => {
            const exists = employee === me && Boolean(mineByPeriod[o.end]);
            return (
              <button
                key={o.which}
                type="button"
                disabled={pending}
                onClick={() => (exists ? router.push(`/timesheets/${mineByPeriod[o.end]}`) : start(o.which))}
                className="flex min-h-14 w-full items-center justify-between gap-3 border border-line-2 bg-bg px-3 py-2 text-left hover:border-brand disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold uppercase tracking-[1.5px]">
                    {o.title} · ends {shortDay(o.end)}
                  </span>
                  <span className="block text-[11px] text-dim">{periodRange(o.end)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 font-display text-[11px] font-bold uppercase tracking-[1.5px] text-brand">
                  {exists ? "Open" : pending ? "…" : "Start"} <ChevronRight size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One tap: start (or open) the viewer's sheet for the current period. */
export function StartPeriodButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await createTimesheet("current", null);
            if (!r.ok) setError(r.error);
            else router.push(`/timesheets/${r.id}`);
          });
        }}
        className="flex min-h-11 items-center gap-2 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
      >
        <Plus size={14} strokeWidth={3} /> {pending ? "Starting…" : "Start this sheet"}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-[11px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
