// Material orders: status, urgency, item parsing and the supplier email.
// Pure functions only, shared by the server page, the actions and the client UI.

import { diffDays, formatDate, isIsoDate } from "@/lib/dates";
import type { MaterialItem, MaterialOrder } from "@/lib/types";

// ---------- items (material_orders.items jsonb) ----------

/** Read a qty from stored jsonb (number, or a numeric string from older rows). */
function storedQty(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** One stored item, tolerating missing or loosely typed fields. */
function normalizeItem(raw: unknown, index: number): MaterialItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === "string" && r.id ? r.id : `item-${index}`,
    description: typeof r.description === "string" ? r.description : "",
    qty: storedQty(r.qty),
    unit: typeof r.unit === "string" && r.unit.trim() ? r.unit : null,
    received: r.received === true,
    received_at: typeof r.received_at === "string" ? r.received_at : null,
  };
}

/** The order's items, always an array of well-formed MaterialItems. */
export function itemsOf(order: Pick<MaterialOrder, "items">): MaterialItem[] {
  const raw: unknown = order.items;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeItem).filter((i): i is MaterialItem => i !== null);
}

export const MAX_QTY = 10_000_000;

/**
 * Parse a typed quantity. "" -> null (no qty); "12", "2.5", "1,000" -> number;
 * anything else (letters, negatives, fractions) -> undefined (invalid).
 */
export function parseQty(text: string): number | null | undefined {
  const t = text.trim().replace(/,/g, "");
  if (!t) return null;
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n <= MAX_QTY ? n : undefined;
}

/** Display form of a qty ("12", "2.5"); blank when not set. */
export function formatQty(qty: number | null): string {
  if (qty === null) return "";
  return Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 1000) / 1000);
}

/** "12 ea", "4", "ea" or "" */
export function qtyUnit(item: Pick<MaterialItem, "qty" | "unit">): string {
  return [formatQty(item.qty), item.unit?.trim() ?? ""].filter(Boolean).join(" ");
}

/**
 * A new random id (RFC 4122 v4). crypto.randomUUID only exists in secure
 * contexts, so fall back to getRandomValues (e.g. a phone hitting a LAN dev URL).
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------- status (derived from items) ----------

/** Open = nothing received yet, Partial = some, Complete = every item received. */
export type OrderStatus = "open" | "partial" | "complete";
export const ORDER_STATUSES: readonly OrderStatus[] = ["open", "partial", "complete"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Open",
  partial: "Partial",
  complete: "Complete",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  open: "var(--color-secondary)",
  partial: "var(--color-primary)",
  complete: "var(--color-ok)",
};

export function receivedCount(order: Pick<MaterialOrder, "items">): { received: number; total: number } {
  const items = itemsOf(order);
  return { received: items.filter((i) => i.received).length, total: items.length };
}

export function orderStatus(order: Pick<MaterialOrder, "items">): OrderStatus {
  const { received, total } = receivedCount(order);
  if (total > 0 && received === total) return "complete";
  if (received > 0) return "partial";
  return "open";
}

// ---------- expected-date urgency ----------

export type Urgency = { color: string; label: string; overdue: boolean };

/** Urgency of an expected delivery date against today (both org-timezone dates). */
export function expectedUrgency(expected: string | null, today: string): Urgency | null {
  if (!expected || !isIsoDate(expected)) return null;
  const d = diffDays(today, expected);
  if (d < 0) return { color: "var(--color-danger)", label: `OVERDUE ${-d}D`, overdue: true };
  if (d === 0) return { color: "var(--color-warn)", label: "ARRIVES TODAY", overdue: false };
  if (d <= 2) return { color: "var(--color-warn)", label: `${d}D LEFT`, overdue: false };
  if (d <= 7) return { color: "var(--color-primary)", label: `${d}D LEFT`, overdue: false };
  return { color: "var(--color-secondary)", label: `${d}D LEFT`, overdue: false };
}

/** True when the order still has items out and its expected date has passed. */
export function isOverdue(order: Pick<MaterialOrder, "items" | "expected_date">, today: string): boolean {
  return orderStatus(order) !== "complete" && expectedUrgency(order.expected_date, today)?.overdue === true;
}

/** The chip on an order card (Phase 1 getOrderStatus), also its accent colour. */
export function orderBadge(
  order: Pick<MaterialOrder, "items" | "expected_date">,
  today: string,
): { label: string; color: string } {
  const { received, total } = receivedCount(order);
  if (total === 0) return { label: "EMPTY", color: "var(--color-faint)" };
  if (received === total) return { label: "COMPLETE", color: "var(--color-ok)" };
  const u = expectedUrgency(order.expected_date, today);
  if (received > 0) {
    return { label: `${received}/${total} REC'D`, color: u?.overdue ? "var(--color-danger)" : "var(--color-primary)" };
  }
  return u ? { label: u.label, color: u.color } : { label: "PENDING", color: "var(--color-secondary)" };
}

/** Outstanding orders: soonest expected first, undated last, then newest. Complete: newest first. */
export function compareOrders(a: MaterialOrder, b: MaterialOrder): number {
  const aDone = orderStatus(a) === "complete";
  const bDone = orderStatus(b) === "complete";
  if (!aDone && !bDone) {
    const ae = isIsoDate(a.expected_date) ? a.expected_date : null;
    const be = isIsoDate(b.expected_date) ? b.expected_date : null;
    if (ae && !be) return -1;
    if (!ae && be) return 1;
    if (ae && be && ae !== be) return ae.localeCompare(be);
  }
  return b.created_at.localeCompare(a.created_at);
}

// ---------- recipients ----------

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/;

/** Split "a@x.com, b@y.com" into valid and invalid addresses. */
export function parseRecipients(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    valid: parts.filter((p) => EMAIL.test(p)),
    invalid: parts.filter((p) => !EMAIL.test(p)),
  };
}

// ---------- the supplier email ----------

/** The job details an order email needs. */
export type OrderJob = { name: string; number: string | null; location: string | null };

/** Who the order comes from: the viewer, the company, and the orders address. */
export type OrderSender = { name: string | null; email: string | null; company: string };

export type OrderEmailInput = {
  supplier: string | null;
  poNumber: string | null;
  expectedDate: string | null;
  notes: string | null;
  items: MaterialItem[];
  jobName: string;
  jobNumber: string | null;
  /** Delivery address: the job's location. */
  deliverTo: string | null;
  senderName: string | null;
  companyName: string;
  senderEmail: string | null;
};

/** Plain-text items table with padded columns (lines up in monospace mail views). */
export function itemsTable(items: MaterialItem[]): string {
  const rows = items.map((it, i) => [String(i + 1), formatQty(it.qty), it.unit?.trim() ?? "", it.description.trim()]);
  const head = ["#", "QTY", "UNIT", "DESCRIPTION"];
  const width = [0, 1, 2].map((c) => Math.min(12, Math.max(head[c].length, ...rows.map((r) => r[c].length))));
  const line = (r: string[]) =>
    [r[0].padEnd(width[0]), r[1].padEnd(width[1]), r[2].padEnd(width[2]), r[3]].join("  ").trimEnd();
  const rule = ["-".repeat(width[0]), "-".repeat(width[1]), "-".repeat(width[2]), "-".repeat(11)].join("  ");
  return [line(head), rule, ...rows.map(line)].join("\n");
}

/** Subject and body of a ready-to-send order email. */
export function composeOrderEmail(o: OrderEmailInput): { subject: string; body: string } {
  const job = `${o.jobName}${o.jobNumber ? ` (Job #${o.jobNumber})` : ""}`;
  const subject = [
    `Material Order — ${o.jobName}${o.jobNumber ? ` (#${o.jobNumber})` : ""}`,
    o.poNumber ? `PO #${o.poNumber}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const details = [
    o.poNumber ? `PO #: ${o.poNumber}` : null,
    o.expectedDate && isIsoDate(o.expectedDate)
      ? `Required on site by: ${formatDate(o.expectedDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
      : null,
    o.deliverTo ? `Deliver to: ${o.deliverTo}` : null,
  ].filter((l): l is string => l !== null);

  const signature = [o.senderName, o.companyName, o.senderEmail].filter((l): l is string => !!l && !!l.trim());

  const blocks = [
    `Hi ${o.supplier?.trim() || "there"},`,
    `Please supply the following for ${job}:`,
    details.length ? details.join("\n") : null,
    itemsTable(o.items),
    o.notes?.trim() ? `Notes: ${o.notes.trim()}` : null,
    "Please confirm pricing and availability.",
    ["Thanks,", ...signature].join("\n"),
  ].filter((b): b is string => b !== null);

  return { subject, body: blocks.join("\n\n") };
}

/** mailto: link. Addresses are pre-validated, so they go in raw; CRLF line breaks per RFC 6068. */
export function mailtoHref(to: string[], subject: string, body: string): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));
  return `mailto:${to.join(",")}?subject=${enc(subject)}&body=${enc(body)}`;
}
