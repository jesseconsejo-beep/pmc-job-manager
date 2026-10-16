// Reference library: category labels and small pure helpers shared by the
// library pages, their client components and the server actions.
//
// Files live in the private 'library' bucket at <category>/<uuid>.pdf. Members
// may read; only admins may upload or delete (storage RLS, 0002). Pages open a
// file through /library/open/<doc id>, which signs a short-lived URL.

import { BookOpen, FileText, Hammer, HardHat, Wrench, type LucideIcon } from "lucide-react";
import { LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/types";

export const LIBRARY_BUCKET = "library";

/** Upload cap; Supabase's default per-file limit is 50 MB. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export type CategoryMeta = {
  key: LibraryCategory;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  titlePlaceholder: string;
  publisherPlaceholder: string;
};

/** Labels can name the company and the region; neither is hardcoded. */
export type LibraryContext = { companyShort: string; bc: boolean };

export function categoryMeta(key: LibraryCategory, ctx: LibraryContext): CategoryMeta {
  const company = ctx.companyShort.trim() || "Company";
  switch (key) {
    case "codes":
      return {
        key,
        label: "Codes",
        desc: ctx.bc ? "BC Plumbing Code, BCBC Books I/II, ASHRAE, SMACNA" : "Plumbing, building and gas codes, ASHRAE, SMACNA",
        icon: BookOpen,
        color: "var(--color-primary)",
        titlePlaceholder: ctx.bc ? "BC Plumbing Code 2024" : "Plumbing Code 2024",
        publisherPlaceholder: ctx.bc ? "Province of BC" : "Publisher",
      };
    case "manuals":
      return {
        key,
        label: "Product Manuals",
        desc: "Viega, Uponor, Bradford White, RIDGID, Milwaukee",
        icon: Wrench,
        color: "var(--color-secondary)",
        titlePlaceholder: "ProPress installation guide",
        publisherPlaceholder: "Viega",
      };
    case "specs":
      return {
        key,
        label: "Spec Sheets",
        desc: "Manufacturer cut sheets and submittals",
        icon: FileText,
        color: "var(--color-ink)",
        titlePlaceholder: "Document title",
        publisherPlaceholder: "Manufacturer",
      };
    case "pmc_standards":
      return {
        key,
        label: `${company} Standards`,
        desc: "Internal SOPs, scope language, install standards",
        icon: Hammer,
        color: "var(--color-primary)",
        titlePlaceholder: "Install standard: copper",
        publisherPlaceholder: company,
      };
    case "safety":
      return {
        key,
        label: ctx.bc ? "Safety / WorkSafeBC" : "Safety",
        desc: "JSAs, SDS sheets, COR docs, safety bulletins",
        icon: HardHat,
        color: "var(--color-warn)",
        titlePlaceholder: "Document title",
        publisherPlaceholder: ctx.bc ? "WorkSafeBC" : "Publisher",
      };
  }
}

export function libraryCategories(ctx: LibraryContext): CategoryMeta[] {
  return LIBRARY_CATEGORIES.map((key) => categoryMeta(key, ctx));
}

export function isLibraryCategory(v: unknown): v is LibraryCategory {
  return typeof v === "string" && (LIBRARY_CATEGORIES as readonly string[]).includes(v);
}

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Storage key for a new upload. */
export function libraryPath(category: LibraryCategory, uuid: string): string {
  return `${category}/${uuid}.pdf`;
}

/** True for <category>/<uuid>.pdf in exactly this category. */
export function isLibraryPath(path: unknown, category: LibraryCategory): path is string {
  return typeof path === "string" && new RegExp(`^${category}/${UUID_RE}\\.pdf$`, "i").test(path);
}

/** "DWV, venting , slope" -> ["DWV", "venting", "slope"] */
export function splitTags(tags: string | null | undefined): string[] {
  return (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** An http(s) URL safe to put in an href, or null. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Is this file acceptable as a library PDF? Returns an error message or null. */
export function pdfProblem(file: { name: string; type: string; size: number }): string | null {
  const looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksPdf) return "Only PDF files can be uploaded.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_PDF_BYTES) return "That PDF is over 50 MB. Link to it instead.";
  return null;
}
