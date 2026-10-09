import { isIsoDate } from "@/lib/dates";

export type ActionResult = { ok: true; error?: undefined } | { ok: false; error: string };

/** A fresh success result (fresh object so React state updates are observed). */
export function ok(): ActionResult {
  return { ok: true };
}
export function fail(error: string): ActionResult {
  return { ok: false, error };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/** Trimmed string, or null when blank. Caps length so a paste cannot bloat a row. */
export function cleanText(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** YYYY-MM-DD or null; anything else is treated as "not set". */
export function cleanDate(v: unknown): string | null {
  return typeof v === "string" && isIsoDate(v.trim()) ? v.trim() : null;
}

export function formString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
