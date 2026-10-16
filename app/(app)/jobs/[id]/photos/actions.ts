"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { isJobPhotoPath, isPolicyError, PHOTO_BUCKET, PHOTO_REFUSED } from "@/lib/photos";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Photo } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

const NOT_YOURS_EDIT = "Only the person who took this photo, or an owner or manager, can change it.";
const NOT_YOURS_DELETE = "Only the person who took this photo, or an owner or manager, can delete it.";

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

function label(caption: string | null): string {
  return caption ? `"${caption}"` : "untitled";
}

// ---------- add (the browser has already uploaded the bytes) ----------

export type NewPhotoInput = { storagePath: string; caption: string; date: string };

/**
 * Records a photo the browser just uploaded to photos/job/<jobId>/<uuid>.<ext>.
 * The bytes go straight from the phone to Storage (never through this server);
 * this only writes the row, which is what makes the file visible (0002).
 */
export async function addPhoto(jobId: string, input: NewPhotoInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const job = jobId.toLowerCase();
  const path = typeof input?.storagePath === "string" ? input.storagePath : "";
  if (!isJobPhotoPath(path, job)) return fail("Unexpected photo file name.");
  const caption = cleanText(input.caption, 300);
  const org = await getOrg();

  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    job_id: job,
    storage_path: path,
    caption,
    date: cleanDate(input.date) ?? todayInZone(org.timezone),
    taken_by: viewer.userId,
  });
  if (error) {
    // Best effort only: Storage needs a linked row to let anyone (even an admin)
    // delete a file, so an unlinked upload usually stays behind, invisible.
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return fail(isPolicyError(error.message) ? PHOTO_REFUSED : `The photo uploaded but could not be saved: ${error.message}`);
  }

  await logActivity(supabase, { jobId: job, type: "photo", description: `Photo added: ${label(caption)}` });
  refresh(job);
  return ok();
}

// ---------- caption / date ----------

export type PhotoPatch = { caption?: string; date?: string };

export async function updatePhoto(jobId: string, photoId: string, patch: PhotoPatch): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(photoId)) return fail("Unknown photo.");
  const update: Partial<Photo> = {};
  if (patch.caption !== undefined) update.caption = cleanText(patch.caption, 300);
  if (patch.date !== undefined) {
    const d = cleanDate(patch.date);
    if (!d) return fail("Pick the date the photo was taken.");
    update.date = d;
  }
  if (Object.keys(update).length === 0) return ok();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .update(update)
    .eq("id", photoId)
    .eq("job_id", jobId)
    .select("caption");
  if (error) return fail(isPolicyError(error.message) ? NOT_YOURS_EDIT : `Could not save: ${error.message}`);
  // RLS hides rows it will not let you update, so "nothing changed" means "not yours" (or gone).
  const row = data?.[0];
  if (!row) return fail(NOT_YOURS_EDIT);

  await logActivity(supabase, { jobId, type: "photo", description: `Photo updated: ${label(row.caption)}` });
  refresh(jobId);
  return ok();
}

// ---------- delete ----------

/**
 * Removes the file, then the row. Storage's remove needs SELECT on the object,
 * and 0002 only grants that while a visible photos row points at the file, so
 * deleting the row first would strand the bytes for everyone, admins included.
 * A failure after the file is gone leaves a row with no image; retrying finishes it.
 */
export async function deletePhoto(jobId: string, photoId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(photoId)) return fail("Unknown photo.");
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path, caption")
    .eq("id", photoId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!photo) {
    // Already deleted (or never visible to you): nothing left to do.
    refresh(jobId);
    return ok();
  }

  // Storage refuses quietly (nothing removed, no error) when it is not yours;
  // the row delete below then reports it.
  const { error: fileErr } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  if (fileErr) {
    return fail(isPolicyError(fileErr.message) ? NOT_YOURS_DELETE : `Could not delete the photo file: ${fileErr.message}`);
  }

  const { data, error } = await supabase.from("photos").delete().eq("id", photoId).eq("job_id", jobId).select("id");
  if (error) return fail(`The file was deleted but the photo entry was not: ${error.message}. Try again.`);
  if (!data || data.length === 0) return fail(NOT_YOURS_DELETE);

  await logActivity(supabase, { jobId, type: "photo", description: `Photo deleted: ${label(photo.caption)}` });
  refresh(jobId);
  return ok();
}
