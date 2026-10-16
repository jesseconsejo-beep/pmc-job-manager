import type { Photo } from "@/lib/types";

/** Private bucket; bytes are readable only where a visible photos row points at them (0002). */
export const PHOTO_BUCKET = "photos";

/** Signed thumbnail URLs live this long (seconds). Each page render signs fresh ones. */
export const SIGNED_URL_TTL = 60 * 60;

/** Content types the app stores, and the extension each gets. */
export const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** A photo row plus what the page needs to show it. */
export type PhotoView = Photo & { url: string | null; takenByName: string | null };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const JOB_PHOTO = new RegExp(`^job/(${UUID})/${UUID}\\.(jpg|png|webp|gif)$`);

/**
 * Storage path for a job photo: job/<job_id>/<uuid>.<ext>. Storage RLS reads
 * the second segment as the job id, so it must be the canonical lowercase uuid.
 */
export function jobPhotoPath(jobId: string, fileId: string, ext: string): string {
  return `job/${jobId.toLowerCase()}/${fileId.toLowerCase()}.${ext}`;
}

/** True when path is a well-formed photo path under this job's folder. */
export function isJobPhotoPath(path: string, jobId: string): boolean {
  const m = JOB_PHOTO.exec(path);
  return m !== null && m[1] === jobId.toLowerCase();
}

/** A v4 uuid; falls back to getRandomValues where randomUUID is missing (plain-http LAN testing). */
export function newFileId(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Storage and Postgres both say "row-level security" when a policy refuses. */
export function isPolicyError(message: string | null | undefined): boolean {
  return !!message && /row-level security|violates .*policy|permission denied/i.test(message);
}

/** The plain-words version of the photo upload policy refusal. */
export const PHOTO_REFUSED =
  "Upload refused: only crew assigned to this job, or an owner or manager, can add photos here. Ask a manager to add you to the job.";
