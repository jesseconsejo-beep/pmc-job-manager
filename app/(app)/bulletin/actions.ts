"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { requireMemberWithRole, type Member } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { BulletinPost } from "@/lib/types";
import { cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

/*
 * Bulletin board (bulletin_posts). RLS lets any active member read and write;
 * the app adds the board's rules on top: anyone active may post, only admins
 * pin/unpin or archive/unarchive, and a post is edited or deleted by its
 * author or an admin. The author is always the signed-in viewer.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh() {
  revalidatePath("/bulletin");
  revalidatePath("/");
}

function displayName(member: Member): string {
  return member.profile.name?.trim() || member.email.split("@")[0] || member.email;
}

function canEdit(member: Member, post: Pick<BulletinPost, "author_id">): boolean {
  return member.admin || (post.author_id !== null && post.author_id === member.userId);
}

async function loadPost(supabase: Client, id: string): Promise<BulletinPost | null> {
  const { data } = await supabase.from("bulletin_posts").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export type PostInput = { title: string; body: string; pinned?: boolean };

export async function addPost(input: PostInput): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!input || typeof input !== "object") return fail("Missing post details.");
  const title = cleanText(input.title, 200);
  if (!title) return fail("Give the post a title.");
  const pinned = input.pinned === true && member.admin;

  const supabase = await createClient();
  const { error } = await supabase.from("bulletin_posts").insert({
    title,
    body: cleanText(input.body, 5000),
    author_id: member.userId,
    author_name: displayName(member),
    pinned,
  });
  if (error) return fail(`Could not post: ${error.message}`);
  await logActivity(supabase, { type: "bulletin", description: `${pinned ? "Pinned post" : "Posted"}: ${title}` });
  refresh();
  return ok();
}

export async function updatePost(id: string, input: PostInput): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown post.");
  if (!input || typeof input !== "object") return fail("Missing post details.");
  const title = cleanText(input.title, 200);
  if (!title) return fail("The post needs a title.");

  const supabase = await createClient();
  const current = await loadPost(supabase, id);
  if (!current) return fail("That post no longer exists.");
  if (!canEdit(member, current)) return fail("Only the author or an admin can edit this post.");

  const { data, error } = await supabase
    .from("bulletin_posts")
    .update({ title, body: cleanText(input.body, 5000) })
    .eq("id", id)
    .select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data || data.length === 0) return fail("The post was not saved. Reload and try again.");
  await logActivity(supabase, { type: "bulletin", description: `Post edited: ${title}` });
  refresh();
  return ok();
}

async function setFlag(id: string, flag: "pinned" | "archived", value: boolean): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!member.admin) return fail(flag === "pinned" ? "Only an admin can pin posts." : "Only an admin can archive posts.");
  if (!isUuid(id)) return fail("Unknown post.");

  const supabase = await createClient();
  const current = await loadPost(supabase, id);
  if (!current) return fail("That post no longer exists.");
  if (current[flag] === value) {
    refresh();
    return ok();
  }
  const patch = flag === "pinned" ? { pinned: value } : { archived: value };
  const { data, error } = await supabase.from("bulletin_posts").update(patch).eq("id", id).select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data || data.length === 0) return fail("The post was not changed. Reload and try again.");

  const verb = flag === "pinned" ? (value ? "Pinned" : "Unpinned") : value ? "Archived" : "Unarchived";
  await logActivity(supabase, { type: "bulletin", description: `${verb}: ${current.title}` });
  refresh();
  return ok();
}

export async function setPinned(id: string, pinned: boolean): Promise<ActionResult> {
  return setFlag(id, "pinned", pinned === true);
}

export async function setArchived(id: string, archived: boolean): Promise<ActionResult> {
  return setFlag(id, "archived", archived === true);
}

export async function deletePost(id: string): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown post.");
  const supabase = await createClient();
  const current = await loadPost(supabase, id);
  if (!current) {
    refresh();
    return ok();
  }
  if (!canEdit(member, current)) return fail("Only the author or an admin can delete this post.");

  const { data, error } = await supabase.from("bulletin_posts").delete().eq("id", id).select("id");
  if (error) return fail(`Could not delete: ${error.message}`);
  if (data && data.length > 0) {
    await logActivity(supabase, { type: "bulletin", description: `Post removed: ${current.title}` });
  }
  refresh();
  return ok();
}
