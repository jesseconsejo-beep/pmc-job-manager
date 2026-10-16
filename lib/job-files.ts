// Shared, side-effect-free helpers for the IFC and Shop Drawing folders
// (job_files rows). Safe to import from client and server code.

import type { JobFile } from "@/lib/types";

/** The two folders that list job_files. ('other' exists in the schema but has no folder yet.) */
export type FolderFileType = Extract<JobFile["file_type"], "ifc" | "shop_drawing">;
export const FOLDER_FILE_TYPES: readonly FolderFileType[] = ["ifc", "shop_drawing"];

export function isFolderFileType(v: unknown): v is FolderFileType {
  return v === "ifc" || v === "shop_drawing";
}

/** Labels per folder (Phase 1 FilesList fileType="IFC" / "SHOP"). */
export const FILE_FOLDER: Record<
  FolderFileType,
  { title: string; noun: string; plural: string; addLabel: string; empty: string }
> = {
  ifc: {
    title: "IFC Drawings",
    noun: "IFC",
    plural: "IFC drawings",
    addLabel: "Add IFC",
    empty: "No IFC drawings yet",
  },
  shop_drawing: {
    title: "Shop Drawings",
    noun: "Shop drawing",
    plural: "shop drawings",
    addLabel: "Add shop drawing",
    empty: "No shop drawings yet",
  },
};

/** Private bucket for drawings; objects live at job/<job_id>/<uuid>.pdf. */
export const JOB_FILES_BUCKET = "job-files";

/** Matches Supabase's default per-file upload limit. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** How long a signed link to a stored PDF stays valid. */
export const SIGNED_URL_SECONDS = 10 * 60;

/** The row's columns the folder screens use. */
export type JobFileRow = Pick<
  JobFile,
  "id" | "file_type" | "name" | "revision" | "date_issued" | "storage_path" | "external_url" | "notes" | "uploaded_at"
>;

/** A v4 uuid; falls back to getRandomValues where randomUUID is missing (non-HTTPS dev). */
export function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Storage path for a new upload to this job. */
export function newJobFilePath(jobId: string): string {
  return `job/${jobId}/${newUuid()}.pdf`;
}

const PATH = /^job\/([0-9a-f-]{36})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

/** True only for job/<jobId>/<uuid>.pdf, so a row can never point at another job's file. */
export function isJobFilePath(jobId: string, path: unknown): path is string {
  if (typeof path !== "string") return false;
  const m = PATH.exec(path);
  return !!m && m[1].toLowerCase() === jobId.toLowerCase();
}

/** A PDF by MIME type or, when the browser gives none, by extension. */
export function isPdf(file: Pick<File, "type" | "name">): boolean {
  return file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
}

/**
 * http(s) link or null. Bare hosts ("dropbox.com/...") get https:// added;
 * anything else (javascript:, data:, mailto:) is rejected.
 */
export function cleanLink(v: unknown): { url: string | null; error?: string } {
  if (typeof v !== "string") return { url: null };
  const raw = v.trim();
  if (!raw) return { url: null };
  if (raw.length > 2000) return { url: null, error: "That link is too long." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { url: null, error: "Links must start with https://" };
    }
    if (!u.hostname.includes(".")) return { url: null, error: "That does not look like a web link." };
    return { url: u.toString() };
  } catch {
    return { url: null, error: "That does not look like a web link." };
  }
}

/** Short host for display, e.g. "dropbox.com". */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
