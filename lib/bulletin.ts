// Server-side reads of the bulletin board (bulletin_posts) for other pages,
// e.g. the Today view. Runs with the caller's session, so RLS decides what
// comes back (active members only).

import { createClient } from "@/lib/supabase/server";
import type { BulletinPost } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Pinned, not archived posts, newest first (Phase 1 Today shows 3). */
export async function pinnedPosts(limit = 3, client?: Client): Promise<BulletinPost[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("bulletin_posts")
    .select("*")
    .eq("pinned", true)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.floor(limit)));
  return error ? [] : (data ?? []);
}

/**
 * The latest posts that are neither pinned nor archived, newest first
 * (Phase 1 Today shows 2 under "Latest from bulletin"; pinned ones are shown
 * separately through pinnedPosts).
 */
export async function recentPosts(limit = 2, client?: Client): Promise<BulletinPost[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("bulletin_posts")
    .select("*")
    .eq("pinned", false)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.floor(limit)));
  return error ? [] : (data ?? []);
}
