"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { BarChart3, BookOpen, Check, Pencil } from "lucide-react";
import { saveProgress, setCategoryEnabled, type ProgressChange, type ProgressKind } from "./actions";
import { ErrorNote } from "@/components/ui";
import { computeJobProgress, normalizeProgressEntry } from "@/lib/progress";
import type { ProgressCategory, ProgressEntry, ProgressMap } from "@/lib/types";

type Values = Record<string, ProgressEntry>;

/** "key|kind" -> value for slider moves not yet sent to the server. */
type Drafts = Record<string, number>;

const draftKey = (key: string, kind: ProgressKind) => `${key}|${kind}`;

function parseDraftKey(k: string): { key: string; kind: ProgressKind } {
  const i = k.lastIndexOf("|");
  return { key: k.slice(0, i), kind: k.slice(i + 1) === "labour" ? "labour" : "material" };
}

function applyChanges(values: Values, changes: ProgressChange[]): Values {
  const next = { ...values };
  for (const c of changes) next[c.key] = { ...(next[c.key] ?? { material: 0, labour: 0 }), [c.kind]: c.value };
  return next;
}

function applyToggle(enabled: string[], op: { key: string; on: boolean }): string[] {
  return op.on ? (enabled.includes(op.key) ? enabled : [...enabled, op.key]) : enabled.filter((k) => k !== op.key);
}

/** code_refs is jsonb: keep only well-formed {ref, text} lines. */
function codeRefsOf(cat: ProgressCategory): { ref: string; text: string }[] {
  if (!Array.isArray(cat.code_refs)) return [];
  return cat.code_refs.filter(
    (r): r is { ref: string; text: string } => !!r && typeof r.ref === "string" && typeof r.text === "string",
  );
}

/** Send soon after a release; the longer wait covers a drag whose release event never arrives. */
const RELEASE_DELAY = 350;
const IDLE_DELAY = 1500;

/**
 * Progress Report (Phase 1 ProgressView): Material and Labour sliders per
 * enabled category, saved to jobs.progress on release (debounced), an overall
 * card computed by lib/progress, a manager-only category panel, and the code
 * reference for each category behind a tap.
 */
export function ProgressView({
  jobId,
  categories,
  enabledCategories,
  progress,
  canManage,
}: {
  jobId: string;
  categories: ProgressCategory[];
  enabledCategories: string[] | null;
  progress: ProgressMap | null;
  canManage: boolean;
}) {
  // An empty list means every category (legacy jobs), exactly as lib/progress reads it.
  const serverEnabled =
    enabledCategories && enabledCategories.length > 0 ? enabledCategories : categories.map((c) => c.key);
  const serverValues: Values = Object.fromEntries(
    categories.map((c) => [c.key, normalizeProgressEntry(progress?.[c.key])]),
  );

  const [enabled, applyEnabled] = useOptimistic(serverEnabled, applyToggle);
  const [values, applyValues] = useOptimistic(serverValues, applyChanges);
  const [isPending, startTransition] = useTransition();
  const [drafts, setDraftsState] = useState<Drafts>({});
  const draftsRef = useRef<Drafts>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const setDrafts = (next: Drafts) => {
    draftsRef.current = next;
    setDraftsState(next);
  };

  const valueOf = (key: string, kind: ProgressKind): number =>
    drafts[draftKey(key, kind)] ?? values[key]?.[kind] ?? 0;

  const takeChanges = (): ProgressChange[] => {
    const pending = draftsRef.current;
    return Object.entries(pending).map(([k, value]) => ({ ...parseDraftKey(k), value }));
  };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = takeChanges();
    if (changes.length === 0) return;
    startTransition(async () => {
      applyValues(changes);
      // Drop what is being sent; a move made while this save is in flight stays a draft.
      const rest = { ...draftsRef.current };
      for (const c of changes) if (rest[draftKey(c.key, c.kind)] === c.value) delete rest[draftKey(c.key, c.kind)];
      setDrafts(rest);
      const r = await saveProgress(jobId, changes);
      if (!r.ok) setError(r.error);
    });
  };

  const schedule = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, ms);
  };

  // Leaving the page (or the app going to the background) sends whatever is still waiting.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    const pending = draftsRef;
    const pendingTimer = timer;
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      const left = Object.entries(pending.current).map(([k, value]) => ({ ...parseDraftKey(k), value }));
      if (left.length > 0) void saveProgress(jobId, left);
    };
  }, [jobId]);

  const move = (key: string, kind: ProgressKind, value: number) => {
    setError(null);
    setTouched(true);
    setDrafts({ ...draftsRef.current, [draftKey(key, kind)]: value });
    schedule(IDLE_DELAY);
  };

  const release = () => {
    if (Object.keys(draftsRef.current).length > 0) schedule(RELEASE_DELAY);
  };

  const toggle = (key: string) => {
    const on = !enabled.includes(key);
    if (!on && categories.filter((c) => enabled.includes(c.key)).length <= 1) {
      setError("Keep at least one category on this job.");
      return;
    }
    setError(null);
    startTransition(async () => {
      applyEnabled({ key, on });
      const r = await setCategoryEnabled(jobId, key, on);
      if (!r.ok) setError(r.error);
    });
  };

  const active = categories.filter((c) => enabled.includes(c.key));
  const displayProgress: ProgressMap = Object.fromEntries(
    categories.map((c) => [c.key, { material: valueOf(c.key, "material"), labour: valueOf(c.key, "labour") }]),
  );
  const overall = computeJobProgress({ enabled_categories: enabled, progress: displayProgress }, categories);
  const saving = isPending || Object.keys(drafts).length > 0;

  if (categories.length === 0) {
    return (
      <div className="border-2 border-dashed border-line p-10 text-center text-faint">
        <BarChart3 size={32} className="mx-auto mb-2" />
        <div className="text-xs">No progress categories are set up for this company yet.</div>
      </div>
    );
  }

  return (
    <>
      {/* Overall progress card */}
      <section className="mb-4 border border-brand bg-surface p-4 sm:p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold tracking-[2px] text-brand">OVERALL PROGRESS</h2>
          <div className="text-[10px] tracking-wider text-dim">
            {active.length} OF {categories.length} CATEGORIES ACTIVE
          </div>
        </div>
        <OverallBar label="MATERIAL" value={overall.material} color="var(--color-secondary)" />
        <OverallBar label="LABOUR" value={overall.labour} color="var(--color-primary)" />
        <OverallBar label="OVERALL" value={overall.overall} color="var(--color-ink)" />
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] tracking-[1.5px] text-dim">
          {active.length} ACTIVE ·{" "}
          {saving ? (
            <span className="text-brand">SAVING…</span>
          ) : error ? (
            <span className="text-danger">NOT SAVED</span>
          ) : touched ? (
            <span className="text-ok">✓ SAVED</span>
          ) : (
            "SLIDE TO ADJUST"
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setManaging(!managing)}
            aria-expanded={managing}
            className={`flex min-h-11 items-center gap-1.5 border px-3.5 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
              managing ? "border-brand bg-brand text-bg" : "border-line bg-surface-2 text-ink hover:border-brand"
            }`}
          >
            {managing ? (
              <>
                <Check size={13} /> Done
              </>
            ) : (
              <>
                <Pencil size={13} /> Manage categories
              </>
            )}
          </button>
        )}
      </div>

      <ErrorNote message={error} />

      {canManage && managing && (
        <section className="mb-4 border-2 border-brand bg-surface p-3.5">
          <h2 className="mb-1.5 font-display text-[13px] uppercase tracking-[1.5px] text-brand">▸ Categories for this job</h2>
          <p className="mb-3 text-[11px] leading-snug text-dim">
            Turn off categories that don&apos;t apply to this job (e.g. no AC, no demolition). Best done before work
            starts. Progress is kept if you turn one back on.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {categories.map((cat) => {
              const on = enabled.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(cat.key)}
                  className={`flex min-h-11 items-center gap-2.5 border-[1.5px] px-3 py-2 text-left text-xs ${
                    on ? "border-brand bg-bg text-ink" : "border-line bg-transparent text-faint"
                  }`}
                >
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border-[1.5px] ${
                      on ? "border-brand bg-brand" : "border-line-2"
                    }`}
                  >
                    {on && <Check size={11} strokeWidth={3} className="text-bg" />}
                  </span>
                  {cat.icon && (
                    <span aria-hidden className={`w-5 shrink-0 text-center text-sm ${on ? "text-brand" : "text-faint"}`}>
                      {cat.icon}
                    </span>
                  )}
                  <span className="flex-1">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {active.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <BarChart3 size={32} className="mx-auto mb-2" />
          <div className="text-xs">
            No categories enabled{canManage ? " — tap MANAGE CATEGORIES to add some" : ""}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {active.map((cat) => {
            const material = valueOf(cat.key, "material");
            const labour = valueOf(cat.key, "labour");
            const avg = Math.round((material + labour) / 2);
            const refs = codeRefsOf(cat);
            const codeOpen = openCode === cat.key;
            const avgColor = avg === 100 ? "var(--color-ok)" : avg > 0 ? "var(--color-primary)" : "var(--color-dim)";
            return (
              <section key={cat.key} className="border border-line bg-surface p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {cat.icon && (
                      <span aria-hidden className="w-5 shrink-0 text-center text-lg text-brand">
                        {cat.icon}
                      </span>
                    )}
                    <h3 className="font-display text-[15px] font-semibold uppercase tracking-wider">{cat.label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="border px-2 py-0.5 font-display text-[13px] font-bold tracking-wider"
                      style={{ color: avgColor, borderColor: avg > 0 ? avgColor : "var(--color-line)" }}
                    >
                      AVG {avg}%
                    </span>
                    {refs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpenCode(codeOpen ? null : cat.key)}
                        aria-expanded={codeOpen}
                        aria-label={`${cat.label} code reference`}
                        className={`flex min-h-11 items-center gap-1 border border-steel px-3 font-display text-[11px] tracking-wider ${
                          codeOpen ? "bg-steel text-bg" : "bg-surface-2 text-steel"
                        }`}
                      >
                        <BookOpen size={13} /> CODE
                      </button>
                    )}
                  </div>
                </div>

                <SliderRow
                  label="MATERIAL"
                  name={`${cat.label} material`}
                  value={material}
                  color="var(--color-secondary)"
                  onChange={(v) => move(cat.key, "material", v)}
                  onRelease={release}
                />
                <SliderRow
                  label="LABOUR"
                  name={`${cat.label} labour`}
                  value={labour}
                  color="var(--color-primary)"
                  onChange={(v) => move(cat.key, "labour", v)}
                  onRelease={release}
                />

                {codeOpen && refs.length > 0 && (
                  <div className="mt-3 border border-steel bg-bg p-3.5">
                    {cat.code_title && <div className="mb-1 text-[10px] tracking-[1.5px] text-steel">{cat.code_title}</div>}
                    <div className="mb-2.5 font-display text-sm uppercase">{cat.label} reference</div>
                    <div className="grid gap-2">
                      {refs.map((r, i) => (
                        <div key={`${r.ref}-${i}`} className="border-l-2 border-steel-dark pl-3">
                          <div className="text-[10px] font-semibold tracking-wider text-brand">{r.ref}</div>
                          <div className="mt-0.5 text-xs leading-relaxed text-ink">{r.text}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 text-[10px] italic text-faint">
                      Reference only — verify against current AHJ and project specs.
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Phase 1 SliderRow: label left, value right, full-width 0-100 slider in steps of 5, bar under it. */
function SliderRow({
  label,
  name,
  value,
  color,
  onChange,
  onRelease,
}: {
  label: string;
  name: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  onRelease: () => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold tracking-[1.5px]" style={{ color }}>
          {label}
        </div>
        <div className="min-w-11 text-right font-display text-base font-bold" style={{ color }}>
          {value}%
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-label={name}
        aria-valuetext={`${value}%`}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onRelease}
        onTouchEnd={onRelease}
        onKeyUp={onRelease}
        onBlur={onRelease}
        className="block h-11 w-full cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="relative h-1 bg-bg">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${value}%`, background: value === 100 ? "var(--color-ok)" : color }}
        />
      </div>
    </div>
  );
}

/** Phase 1 OverallBar for the summary card. */
function OverallBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[11px] font-bold tracking-[2px]" style={{ color }}>
          {label}
        </div>
        <div className="font-display text-[26px] font-bold leading-none" style={{ color }}>
          {value}%
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${label.toLowerCase()} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="relative h-2 bg-bg"
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${value}%`, background: value === 100 ? "var(--color-ok)" : color }}
        />
      </div>
    </div>
  );
}
