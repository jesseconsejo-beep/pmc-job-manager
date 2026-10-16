"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isLibraryCategory, isLibraryPath, LIBRARY_BUCKET, safeHref } from "@/lib/library";
import { requireMemberWithRole, type Member } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { LibraryCategory, LibraryDoc } from "@/lib/types";
import { cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

/*
 * Reference library (library_docs + the private 'library' bucket).
 * RLS: any active member may read and write library_docs; only admins may
 * upload or delete files in the bucket. The app follows that: anyone active
 * adds link documents; a document is edited or removed by whoever added it or
 * by an admin; anything that attaches, replaces or deletes a PDF is admin-only
 * (so a row never points at a file nobody can clean up).
 */

type Client = Awaited<ReturnType<typeof createClient>>;

function refresh(category: LibraryCategory) {
  revalidatePath("/library");
  revalidatePath(`/library/${category}`);
}

export type DocInput = {
  title: string;
  edition: string;
  publisher: string;
  external_url: string;
  tags: string;
  notes: string;
};

/** What to do with the PDF on save. */
export type FileChange = { kind: "keep" } | { kind: "remove" } | { kind: "new"; path: string };

type CleanDoc = Pick<LibraryDoc, "title" | "edition" | "publisher" | "external_url" | "tags" | "notes">;

function clean(input: DocInput): CleanDoc | string {
  if (!input || typeof input !== "object") return "Missing document details.";
  const title = cleanText(input.title, 300);
  if (!title) return "Give the document a title.";
  const rawUrl = cleanText(input.external_url, 2000);
  const url = rawUrl ? safeHref(rawUrl) : null;
  if (rawUrl && !url) return "The link must start with http:// or https://";
  const tags = cleanText(input.tags, 500);
  return {
    title,
    edition: cleanText(input.edition, 100),
    publisher: cleanText(input.publisher, 200),
    external_url: url,
    // Normalise "a ,b,, c" to "a, b, c".
    tags: tags
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(", ") || null
      : null,
    notes: cleanText(input.notes, 4000),
  };
}

/** The uploaded object really exists (members can list the bucket). */
async function objectExists(supabase: Client, path: string): Promise<boolean> {
  const slash = path.indexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).list(folder, { search: name, limit: 5 });
  return !error && (data ?? []).some((o) => o.name === name);
}

async function removeObject(supabase: Client, path: string | null): Promise<void> {
  if (!path) return;
  // Best effort: a leftover file is harmless; the row no longer points at it.
  await supabase.storage.from(LIBRARY_BUCKET).remove([path]);
}

function canChange(member: Member, doc: Pick<LibraryDoc, "uploaded_by">): boolean {
  return member.admin || (doc.uploaded_by !== null && doc.uploaded_by === member.userId);
}

async function checkNewFile(supabase: Client, member: Member, category: LibraryCategory, path: unknown): Promise<string | null> {
  if (!member.admin) return "Only an admin can upload PDFs.";
  if (!isLibraryPath(path, category)) return "That upload does not belong to this category.";
  if (!(await objectExists(supabase, path))) return "The PDF did not finish uploading. Try again.";
  return null;
}

export async function addDoc(category: LibraryCategory, input: DocInput, filePath: string | null): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isLibraryCategory(category)) return fail("Unknown category.");
  const row = clean(input);
  if (typeof row === "string") return fail(row);

  const supabase = await createClient();
  if (filePath !== null) {
    const problem = await checkNewFile(supabase, member, category, filePath);
    if (problem) return fail(problem);
  }

  const { error } = await supabase.from("library_docs").insert({
    ...row,
    category,
    storage_path: filePath,
    uploaded_by: member.userId,
  });
  if (error) return fail(`Could not add the document: ${error.message}`);
  await logActivity(supabase, {
    type: "library",
    description: `Library: added ${row.title}${filePath ? " (PDF)" : ""}`,
    metadata: { category },
  });
  refresh(category);
  return ok();
}

export async function updateDoc(id: string, input: DocInput, change: FileChange): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown document.");
  const file: FileChange =
    change && (change.kind === "new" || change.kind === "remove") ? change : { kind: "keep" };
  const row = clean(input);
  if (typeof row === "string") return fail(row);

  const supabase = await createClient();
  const { data: current } = await supabase.from("library_docs").select("*").eq("id", id).maybeSingle();
  if (!current) return fail("That document no longer exists.");
  if (!canChange(member, current)) return fail("Only the person who added this document, or an admin, can change it.");

  let storagePath = current.storage_path;
  if (file.kind === "new") {
    const problem = await checkNewFile(supabase, member, current.category, file.path);
    if (problem) return fail(problem);
    storagePath = file.path;
  } else if (file.kind === "remove") {
    if (!member.admin) return fail("Only an admin can remove a PDF.");
    storagePath = null;
  }

  const { data, error } = await supabase
    .from("library_docs")
    .update({ ...row, storage_path: storagePath })
    .eq("id", id)
    .select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data || data.length === 0) return fail("The document was not saved. Reload and try again.");

  if (current.storage_path && current.storage_path !== storagePath) await removeObject(supabase, current.storage_path);

  const fileNote = file.kind === "new" ? (current.storage_path ? " (PDF replaced)" : " (PDF attached)") : file.kind === "remove" ? " (PDF removed)" : "";
  await logActivity(supabase, {
    type: "library",
    description: `Library: updated ${row.title}${fileNote}`,
    metadata: { category: current.category },
  });
  refresh(current.category);
  return ok();
}

export async function deleteDoc(id: string): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!isUuid(id)) return fail("Unknown document.");
  const supabase = await createClient();
  const { data: current } = await supabase.from("library_docs").select("*").eq("id", id).maybeSingle();
  if (!current) {
    revalidatePath("/library", "layout");
    return ok();
  }
  if (!canChange(member, current)) return fail("Only the person who added this document, or an admin, can delete it.");
  if (current.storage_path && !member.admin) return fail("Only an admin can delete a document with an uploaded PDF.");

  const { data, error } = await supabase.from("library_docs").delete().eq("id", id).select("id");
  if (error) return fail(`Could not delete: ${error.message}`);
  if (data && data.length > 0) {
    await removeObject(supabase, current.storage_path);
    await logActivity(supabase, {
      type: "library",
      description: `Library: removed ${current.title}`,
      metadata: { category: current.category },
    });
  }
  refresh(current.category);
  return ok();
}

/** Removes a file this admin just uploaded when saving the row failed (keeps the bucket tidy). */
export async function discardUpload(category: LibraryCategory, path: string): Promise<ActionResult> {
  const member = await requireMemberWithRole();
  if (!member.admin || !isLibraryCategory(category) || !isLibraryPath(path, category)) return ok();
  const supabase = await createClient();
  // Never remove a file that a document row still points at.
  const { data } = await supabase.from("library_docs").select("id").eq("storage_path", path).limit(1);
  if (!data || data.length === 0) await removeObject(supabase, path);
  return ok();
}
