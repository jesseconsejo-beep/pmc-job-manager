import type { JobStatus } from "@/lib/types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  archived: "Archived",
};

export const STATUS_COLOR: Record<JobStatus, string> = {
  active: "var(--color-primary)",
  on_hold: "var(--color-warn)",
  complete: "var(--color-ok)",
  archived: "var(--color-faint)",
};

/** Universal maps link: Apple Maps on iPhone, Google Maps elsewhere. */
export function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/** tel: href with spaces and punctuation other than + removed. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
