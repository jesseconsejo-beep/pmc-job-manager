import type { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import type { ServiceCall, ServiceStatus, WorkEntry } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

// ---------- status ----------

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  complete: "Complete",
  cancelled: "Cancelled",
};

/** Phase 1 colours: upcoming steel, in progress orange, complete green; cancelled is greyed out. */
export const SERVICE_STATUS_COLOR: Record<ServiceStatus, string> = {
  upcoming: "var(--color-secondary)",
  in_progress: "var(--color-warn)",
  complete: "var(--color-ok)",
  cancelled: "var(--color-faint)",
};

/** Random v4 UUID; works on plain-http LAN testing where crypto.randomUUID is missing. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- work entries (service_calls.work_entries jsonb) ----------

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** The visit rows of a call, tolerant of older or hand-edited jsonb. */
export function entriesOf(call: Pick<ServiceCall, "work_entries">): WorkEntry[] {
  if (!Array.isArray(call.work_entries)) return [];
  return call.work_entries
    .filter((e): e is WorkEntry => typeof e === "object" && e !== null)
    .map((e, i) => ({
      id: str(e.id) ?? `row-${i}`,
      date: str(e.date),
      worker_id: str(e.worker_id),
      worker_name: str(e.worker_name),
      hours: num(e.hours),
      material_source: str(e.material_source),
      parking: str(e.parking),
      notes: str(e.notes),
    }));
}

export function totalHours(entries: WorkEntry[]): number {
  const sum = entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

/** "3", "2.5", "1.25": hours without trailing zeros. */
export function formatHours(h: number | null | undefined): string {
  if (h === null || h === undefined || !Number.isFinite(h)) return "";
  return String(Math.round(h * 100) / 100);
}

const MONEY = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(v: number | null | undefined): string {
  return `$${MONEY.format(typeof v === "number" && Number.isFinite(v) ? v : 0)}`;
}

/** Worker shown on a visit: the person's current name when linked, else the typed name. */
export function workerLabel(e: WorkEntry, names: Map<string, string>): string {
  return (e.worker_id ? names.get(e.worker_id) : null) ?? e.worker_name ?? "";
}

// ---------- service codes ----------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape LIKE wildcards so a prefix such as "S_" matches literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Next service code for the year: "<prefix><year>-<n>" with n one above the
 * highest already used (S2026-048 -> S2026-049). Keeps the width of the
 * highest existing number; the first call of a year is 001.
 */
function codePattern(prefix: string, year: string): RegExp {
  return new RegExp(`^${escapeRegex(prefix)}${escapeRegex(year)}-(\\d+)$`, "i");
}

/** True when code follows this year's numbering ("S2026-048" for prefix "S"). */
export function isYearCode(prefix: string, year: string, code: string): boolean {
  return codePattern(prefix, year).test(code.trim());
}

export function nextServiceCode(prefix: string, year: string, existing: (string | null)[]): string {
  const re = codePattern(prefix, year);
  let max = 0;
  let width = 3;
  for (const code of existing) {
    const m = code ? re.exec(code.trim()) : null;
    if (!m) continue;
    const n = Number(m[1]);
    if (n > max) {
      max = n;
      width = Math.max(m[1].length, 1);
    }
  }
  return `${prefix}${year}-${String(max + 1).padStart(width, "0")}`;
}

/** Suggested code for a new call, read with the caller's session (RLS applies). */
export async function suggestServiceCode(supabase: Client, prefix: string, year: string): Promise<string> {
  const { data } = await supabase
    .from("service_calls")
    .select("service_code")
    .ilike("service_code", `${escapeLike(`${prefix}${year}-`)}%`);
  return nextServiceCode(prefix, year, (data ?? []).map((r) => r.service_code));
}

// ---------- edit conflict check ----------

const FINGERPRINT_FIELDS = [
  "service_code",
  "customer_name",
  "company_name",
  "customer_phone",
  "customer_po",
  "address",
  "project_name",
  "scheduled_date",
  "status",
  "work_report",
  "total_cost",
] as const;

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** True when two visit lists hold the same rows in the same order. */
export function sameEntries(a: WorkEntry[], b: WorkEntry[]): boolean {
  return canonical(a) === canonical(b);
}

/**
 * A stable string for the editable state of a call. The editor sends back the
 * fingerprint it opened with; a mismatch means someone else saved in between.
 */
export function serviceFingerprint(call: ServiceCall): string {
  const fields: Record<string, unknown> = {};
  for (const k of FINGERPRINT_FIELDS) {
    const v = call[k];
    fields[k] = k === "total_cost" && v !== null ? Number(v) : v;
  }
  fields.work_entries = entriesOf(call);
  return hash53(canonical(fields));
}

/** cyrb53: a short, fast, non-cryptographic hash (change detection only). */
function hash53(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// ---------- work order text (email) ----------

export function workOrderSubject(call: ServiceCall, companyShort: string): string {
  const code = call.service_code ? ` ${call.service_code}` : "";
  return `Work Order${code} — ${call.project_name || call.company_name || call.customer_name || companyShort}`;
}

/** Plain-text work order for the mailto body (Phase 1 emailWorkOrder). */
export function workOrderText(call: ServiceCall, companyName: string, names: Map<string, string>): string {
  const entries = entriesOf(call);
  const hours = totalHours(entries);
  const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "—");
  const lines = [
    "WORK ORDER",
    companyName.toUpperCase(),
    "",
    `Service Code (P.O #): ${dash(call.service_code)}`,
    `Customer: ${dash(call.customer_name)}`,
    `Company: ${dash(call.company_name)}`,
    `Project: ${dash(call.project_name)}`,
    `Address: ${dash(call.address)}`,
    `Customer Phone: ${dash(call.customer_phone)}`,
    `Customer PO: ${dash(call.customer_po)}`,
    `Scheduled: ${call.scheduled_date ? formatDate(call.scheduled_date) : "—"}`,
    "",
    "WORK PERFORMED:",
    call.work_report?.trim() || "(no report yet)",
    "",
    "LOG:",
    ...(entries.length === 0
      ? ["(no visits logged)"]
      : entries.map((e) => {
          const parts = [
            e.date ? formatDate(e.date) : "?",
            workerLabel(e, names) || "?",
            `${formatHours(e.hours ?? 0)}h`,
          ];
          if (e.material_source) parts.push(e.material_source);
          if (e.parking) parts.push(`Parking ${e.parking}`);
          return parts.join(" — ") + (e.notes ? ` (${e.notes})` : "");
        })),
    "",
    `Total hours: ${formatHours(hours)}`,
    `Total: ${formatMoney(call.total_cost)}`,
    "",
    `Status: ${SERVICE_STATUS_LABEL[call.status].toUpperCase()}`,
  ];
  return lines.join("\r\n");
}

/** mailto: link with no recipient (the schema has no customer email). */
export function workOrderMailto(call: ServiceCall, companyName: string, companyShort: string, names: Map<string, string>): string {
  const subject = encodeURIComponent(workOrderSubject(call, companyShort));
  const body = encodeURIComponent(workOrderText(call, companyName, names));
  return `mailto:?subject=${subject}&body=${body}`;
}
