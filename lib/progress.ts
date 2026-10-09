import type { Job, ProgressCategory, ProgressEntry } from "@/lib/types";

/** Legacy numbers count for both material and labour (Phase 1 normalizeProgressEntry). */
export function normalizeProgressEntry(v: unknown): ProgressEntry {
  if (typeof v === "number") return { material: v, labour: v };
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return {
      material: typeof o.material === "number" ? o.material : 0,
      labour: typeof o.labour === "number" ? o.labour : 0,
    };
  }
  return { material: 0, labour: 0 };
}

/**
 * Overall job progress, exactly as Phase 1 computeJobProgress: average the
 * enabled categories' material and labour %, round each, then average those.
 * An empty enabled list means "all categories" (legacy jobs).
 */
export function computeJobProgress(
  job: Pick<Job, "enabled_categories" | "progress">,
  categories: Pick<ProgressCategory, "key">[],
): { material: number; labour: number; overall: number } {
  const enabled =
    job.enabled_categories && job.enabled_categories.length > 0
      ? job.enabled_categories
      : categories.map((c) => c.key);
  const cats = categories.filter((c) => enabled.includes(c.key));
  if (cats.length === 0) return { material: 0, labour: 0, overall: 0 };
  const progress = job.progress ?? {};
  const matSum = cats.reduce((s, c) => s + normalizeProgressEntry(progress[c.key]).material, 0);
  const labSum = cats.reduce((s, c) => s + normalizeProgressEntry(progress[c.key]).labour, 0);
  const material = Math.round(matSum / cats.length);
  const labour = Math.round(labSum / cats.length);
  return { material, labour, overall: Math.round((material + labour) / 2) };
}
