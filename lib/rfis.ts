// RFIs and change orders: shared shapes, numbering, parsing and templates.
// Pure (no server imports) so the client list and the server actions use the
// same rules.

import type { ChangeOrder, Rfi, RfiStatus } from "@/lib/types";
import { RFI_STATUSES } from "@/lib/types";
import { cleanDate, cleanText, isUuid } from "@/lib/validate";

export type NoteKind = "rfi" | "co";

/** Industry terms, not company settings: every contractor calls them RFI / CO. */
export const KIND_PREFIX: Record<NoteKind, string> = { rfi: "RFI", co: "CO" };
export const KIND_NOUN: Record<NoteKind, string> = { rfi: "RFI", co: "Change order" };

/** Tabs as in the Phase 1 NotesList: label, colour and the order they appear in. */
export const STATUS_META: Record<RfiStatus, { label: string; color: string }> = {
  issued: { label: "Issued", color: "var(--color-secondary)" },
  action: { label: "Action Needed", color: "var(--color-warn)" },
  complete: { label: "Complete", color: "var(--color-ok)" },
};

export function isRfiStatus(v: unknown): v is RfiStatus {
  return typeof v === "string" && (RFI_STATUSES as readonly string[]).includes(v);
}

// ---------- one normalised row for both tables ----------

/** An RFI or change order as the list shows it. Kind-specific fields are null on the other kind. */
export type NoteRow = {
  id: string;
  number: string | null;
  date: string | null;
  subject: string;
  drawingRef: string | null;
  /** rfis.question or change_orders.description */
  body: string | null;
  /** RFIs only (change_orders has no response column). */
  response: string | null;
  impact: string | null;
  status: RfiStatus;
  /** RFIs only. */
  assigneeId: string | null;
  /** Change orders only. */
  costImpact: number | null;
  /** Change orders only. */
  scheduleDays: number | null;
  createdAt: string;
};

export function rfiToNote(r: Rfi): NoteRow {
  return {
    id: r.id,
    number: r.rfi_number,
    date: r.date_issued,
    subject: r.subject,
    drawingRef: r.drawing_ref,
    body: r.question,
    response: r.response,
    impact: r.impact,
    status: isRfiStatus(r.status) ? r.status : "issued",
    assigneeId: r.assigned_to,
    costImpact: null,
    scheduleDays: null,
    createdAt: r.created_at,
  };
}

export function coToNote(c: ChangeOrder): NoteRow {
  return {
    id: c.id,
    number: c.co_number,
    date: c.date_issued,
    subject: c.subject,
    drawingRef: c.drawing_ref,
    body: c.description,
    response: null,
    impact: c.impact,
    status: isRfiStatus(c.status) ? c.status : "issued",
    assigneeId: null,
    // numeric comes back from PostgREST as a number, but be safe with strings.
    costImpact: c.cost_impact === null || c.cost_impact === undefined ? null : Number(c.cost_impact),
    scheduleDays: c.schedule_impact_days,
    createdAt: c.created_at,
  };
}

// ---------- editor input (all strings, straight from the form) ----------

export type NoteInput = {
  number: string;
  date: string;
  subject: string;
  drawingRef: string;
  body: string;
  response: string;
  impact: string;
  assigneeId: string;
  costImpact: string;
  scheduleDays: string;
};

export function blankInput(number: string, today: string): NoteInput {
  return {
    number,
    date: today,
    subject: "",
    drawingRef: "",
    body: "",
    response: "",
    impact: "",
    assigneeId: "",
    costImpact: "",
    scheduleDays: "",
  };
}

export function noteToInput(n: NoteRow): NoteInput {
  return {
    number: n.number ?? "",
    date: n.date ?? "",
    subject: n.subject,
    drawingRef: n.drawingRef ?? "",
    body: n.body ?? "",
    response: n.response ?? "",
    impact: n.impact ?? "",
    assigneeId: n.assigneeId ?? "",
    costImpact: n.costImpact === null ? "" : String(n.costImpact),
    scheduleDays: n.scheduleDays === null ? "" : String(n.scheduleDays),
  };
}

export type CleanNote = {
  number: string | null;
  date: string | null;
  subject: string;
  drawingRef: string | null;
  body: string | null;
  response: string | null;
  impact: string | null;
  assigneeId: string | null;
  costImpact: number | null;
  scheduleDays: number | null;
};

const MAX_MONEY = 1_000_000_000;
const MAX_DAYS = 3650;

/**
 * Dollar amount from what someone typed: "1250", "$1,250.50", "-500" or
 * "(500)" for a credit. Blank -> null; anything else -> undefined (invalid).
 */
export function parseMoney(v: string): number | null | undefined {
  let s = v.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  s = s.replace(/^\$/, "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(s)) return undefined;
  const n = Math.round(Number(s) * 100) / 100;
  if (!Number.isFinite(n) || n > MAX_MONEY) return undefined;
  return negative && n !== 0 ? -n : n;
}

/** Whole days (negative = time saved). Blank -> null; anything else -> undefined (invalid). */
export function parseDays(v: string): number | null | undefined {
  const s = v.trim().replace(/\s*days?$/i, "");
  if (!s) return null;
  if (!/^[+-]?\d+$/.test(s)) return undefined;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || Math.abs(n) > MAX_DAYS) return undefined;
  return n;
}

/** Validate and normalise editor input. Kind-specific fields are dropped for the other kind. */
export function cleanNoteInput(
  kind: NoteKind,
  input: NoteInput,
): { ok: true; value: CleanNote } | { ok: false; error: string } {
  // Server actions take whatever the wire sends; never trust the shape.
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const subject = cleanText(input.subject, 300);
  if (!subject) return { ok: false, error: "Give it a subject." };

  let costImpact: number | null = null;
  let scheduleDays: number | null = null;
  if (kind === "co") {
    const money = parseMoney(str(input.costImpact));
    if (money === undefined) return { ok: false, error: "Cost impact must be a dollar amount, e.g. 1250 or -500." };
    const days = parseDays(str(input.scheduleDays));
    if (days === undefined) return { ok: false, error: "Schedule impact must be a whole number of days, e.g. 3 or -2." };
    costImpact = money;
    scheduleDays = days;
  }

  return {
    ok: true,
    value: {
      number: cleanText(input.number, 40),
      date: cleanDate(input.date),
      subject,
      drawingRef: cleanText(input.drawingRef, 200),
      body: cleanText(input.body, 5000),
      response: kind === "rfi" ? cleanText(input.response, 5000) : null,
      impact: cleanText(input.impact, 2000),
      assigneeId: kind === "rfi" && isUuid(input.assigneeId) ? input.assigneeId : null,
      costImpact,
      scheduleDays,
    },
  };
}

// ---------- numbering ----------

/** The sequence number inside "RFI-003", "003" or "CO #12" (first digit run), or null. */
export function sequenceOf(number: string | null | undefined): number | null {
  const m = number ? /\d+/.exec(number) : null;
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isSafeInteger(n) ? n : null;
}

/** Next number for the job: one past the highest in use, e.g. RFI-003 / CO-003. */
export function nextNumber(kind: NoteKind, existing: readonly (string | null | undefined)[]): string {
  let max = 0;
  for (const n of existing) {
    const seq = sequenceOf(n);
    if (seq !== null && seq > max) max = seq;
  }
  return `${KIND_PREFIX[kind]}-${String(max + 1).padStart(3, "0")}`;
}

function normaliseNumber(kind: NoteKind, n: string): string {
  return n
    .toUpperCase()
    .trim()
    .replace(new RegExp(`^${KIND_PREFIX[kind]}`), "")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^0+(?=\d)/, "");
}

/** "RFI-003", "rfi 3" and "003" are the same number. */
export function sameNumber(kind: NoteKind, a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normaliseNumber(kind, a) === normaliseNumber(kind, b);
}

/** "RFI-003" as typed when it already carries the prefix, else "RFI #3"; "RFI #—" when unset. */
export function displayNumber(kind: NoteKind, number: string | null | undefined): string {
  const prefix = KIND_PREFIX[kind];
  const n = number?.trim();
  if (!n) return `${prefix} #—`;
  return n.toUpperCase().startsWith(prefix) ? n : `${prefix} #${n}`;
}

/** Short label for activity lines: "RFI-003 · Sleeve through grid C beam". */
export function noteLabel(kind: NoteKind, number: string | null | undefined, subject: string): string {
  return `${displayNumber(kind, number)} · ${subject}`;
}

// ---------- display ----------

const MONEY = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function formatMoney(n: number): string {
  return MONEY.format(n);
}

export function formatDays(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} ${Math.abs(n) === 1 ? "day" : "days"}`;
}

// ---------- RFI templates ----------

export type RfiTemplate = { id: string; title: string; subject: string; question: string };

/**
 * The seven pre-loaded templates. The Phase 1 artifact rendered RFI_TEMPLATES
 * ({id, title, subject, question}) but never defined it, so these were written
 * fresh for a plumbing / HVAC sub. Brackets mark the blanks to fill in.
 */
export const RFI_TEMPLATES: readonly RfiTemplate[] = [
  {
    id: "conflict",
    title: "Drawing conflict",
    subject: "Conflict between drawings - confirm location",
    question:
      "Drawing [M-___] shows [item] at [location / elevation], but [A-___ / S-___] shows [conflicting condition]. Please confirm the correct location and elevation before we proceed with rough-in.",
  },
  {
    id: "penetration",
    title: "Structural penetration",
    subject: "Approval for penetration through structure",
    question:
      "We need to penetrate the [beam / slab / wall] at gridline [__] for a [size] [pipe / duct]. Please confirm the penetration is acceptable to the structural engineer and advise any sleeve, coring or reinforcement requirements.",
  },
  {
    id: "substitution",
    title: "Equipment substitution",
    subject: "Approval of equipment substitution",
    question:
      "The specified [equipment / model] has a lead time of [__] weeks. We propose [alternate make / model] (submittal attached), equal in capacity and performance. Please confirm the substitution is acceptable.",
  },
  {
    id: "missing-info",
    title: "Missing information",
    subject: "Missing information on drawings",
    question:
      "The drawings do not show [sizing / connection details / routing] for [system / item] at [location]. Please provide the missing information so we can proceed.",
  },
  {
    id: "clearance",
    title: "Ceiling space / clearance",
    subject: "Insufficient ceiling space for duct and pipe routing",
    question:
      "At [location / gridline] the space above the ceiling is [__] mm, which does not allow the [duct size] and [pipe] to be installed as drawn. Please advise on an alternate route, a ceiling height change or a revised duct size.",
  },
  {
    id: "existing",
    title: "Existing conditions",
    subject: "Existing conditions differ from drawings",
    question:
      "On site we found [describe existing condition] at [location], which differs from the drawings. Please advise how to proceed. This may affect scope, cost and schedule.",
  },
  {
    id: "code",
    title: "Spec vs code",
    subject: "Specification conflicts with code requirement",
    question:
      "Specification section [__] calls for [material / method], but [BC Plumbing Code / BC Building Code / CSA B149.1] article [__] requires [requirement]. Please confirm which governs.",
  },
];
