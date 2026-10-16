"use server";

// Server actions for the IFC and Shop Drawing folders (job_files).
// Shared by both folders, so they live here instead of a route's actions.ts.
// PDFs are uploaded by the browser straight to Storage; these actions only
// record the row, and remove a PDF from Storage once no row points at it.

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { FILE_FOLDER, JOB_FILES_BUCKET, cleanLink, isFolderFileType, isJobFilePath, type FolderFileType } from "@/lib/job-files";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { JobFile } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Where the file comes from:
 *  - "link": external_url (may be blank: a drawing logged before it is shared)
 *  - "pdf":  storage_path of a PDF the browser has just uploaded
 *  - "keep": leave the attached PDF as it is (edit only)
 */
export type JobFileSource = "link" | "pdf" | "keep";

export type JobFileInput = {
  name: string;
  revision: string;
  date_issued: string;
  notes: string;
  source: JobFileSource;
  external_url: string;
  storage_path: string;
};

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

function label(name: string, revision: string | null): string {
  return revision ? `${name} (${revision})` : name;
}

/** Remove a stored PDF unless another row still points at it. Best effort. */
async function removeIfUnused(supabase: Client, path: string | null): Promise<void> {
  if (!path) return;
  const { count, error } = await supabase
    .from("job_files")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", path);
  if (error || (count ?? 0) > 0) return;
  await supabase.storage.from(JOB_FILES_BUCKET).remove([path]);
}

type CleanFields = Pick<JobFile, "name" | "revision" | "date_issued" | "notes">;

const SOURCES: readonly JobFileSource[] = ["link", "pdf", "keep"];

function cleanFields(input: JobFileInput): CleanFields | string {
  if (!input || typeof input !== "object" || !SOURCES.includes(input.source)) return "That drawing is not valid.";
  const name = cleanText(input.name, 200);
  if (!name) return "Give the drawing a name or number.";
  return {
    name,
    revision: cleanText(input.revision, 50),
    date_issued: cleanDate(input.date_issued),
    notes: cleanText(input.notes, 2000),
  };
}

export async function addJobFile(jobId: string, fileType: FolderFileType, input: JobFileInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  if (!isFolderFileType(fileType)) return fail("Unknown folder.");
  const fields = cleanFields(input);
  if (typeof fields === "string") return fail(fields);

  let external_url: string | null = null;
  let storage_path: string | null = null;
  if (input.source === "pdf") {
    if (!isJobFilePath(jobId, input.storage_path)) return fail("The upload did not finish. Try again.");
    storage_path = input.storage_path;
  } else {
    const link = cleanLink(input.external_url);
    if (link.error) return fail(link.error);
    external_url = link.url;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("job_files").insert({
    job_id: jobId,
    file_type: fileType,
    ...fields,
    external_url,
    storage_path,
    uploaded_by: viewer.userId,
  });
  if (error) return fail(`Could not save the drawing: ${error.message}`);

  const how = storage_path ? " · PDF" : external_url ? " · link" : "";
  await logActivity(supabase, {
    jobId,
    type: "file",
    description: `${FILE_FOLDER[fileType].noun} added: ${label(fields.name, fields.revision)}${how}`,
    metadata: { file_type: fileType },
  });
  refresh(jobId);
  return ok();
}

export async function updateJobFile(
  jobId: string,
  fileType: FolderFileType,
  fileId: string,
  input: JobFileInput,
): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(fileId)) return fail("Unknown drawing.");
  if (!isFolderFileType(fileType)) return fail("Unknown folder.");
  const fields = cleanFields(input);
  if (typeof fields === "string") return fail(fields);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("job_files")
    .select("id, name, revision, date_issued, notes, storage_path, external_url")
    .eq("id", fileId)
    .eq("job_id", jobId)
    .eq("file_type", fileType)
    .maybeSingle();
  if (!current) return fail("That drawing no longer exists.");

  let external_url: string | null = current.external_url;
  let storage_path: string | null = current.storage_path;
  if (input.source === "keep") {
    if (!current.storage_path) return fail("Choose a PDF to upload, or paste a link.");
    external_url = null;
  } else if (input.source === "pdf") {
    if (!isJobFilePath(jobId, input.storage_path)) return fail("The upload did not finish. Try again.");
    storage_path = input.storage_path;
    external_url = null;
  } else {
    const link = cleanLink(input.external_url);
    if (link.error) return fail(link.error);
    external_url = link.url;
    storage_path = null;
  }

  const unchanged =
    fields.name === current.name &&
    fields.revision === current.revision &&
    fields.date_issued === current.date_issued &&
    fields.notes === current.notes &&
    external_url === current.external_url &&
    storage_path === current.storage_path;
  if (unchanged) return ok();

  const { data: saved, error } = await supabase
    .from("job_files")
    .update({ ...fields, external_url, storage_path })
    .eq("id", fileId)
    .eq("job_id", jobId)
    .eq("file_type", fileType)
    .select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!saved || saved.length === 0) return fail("Could not save: that drawing was removed or you cannot edit it.");

  const replacedPdf = current.storage_path !== storage_path;
  if (replacedPdf) await removeIfUnused(supabase, current.storage_path);

  const noun = FILE_FOLDER[fileType].noun;
  let what = "updated";
  if (replacedPdf && storage_path) what = current.storage_path ? "PDF replaced" : "PDF attached";
  else if (replacedPdf && !storage_path) what = external_url ? "switched to a link" : "PDF removed";
  await logActivity(supabase, {
    jobId,
    type: "file",
    description: `${noun} ${what}: ${label(fields.name, fields.revision)}`,
    metadata: { file_type: fileType },
  });
  refresh(jobId);
  return ok();
}

export async function deleteJobFile(jobId: string, fileType: FolderFileType, fileId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(fileId)) return fail("Unknown drawing.");
  if (!isFolderFileType(fileType)) return fail("Unknown folder.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_files")
    .delete()
    .eq("id", fileId)
    .eq("job_id", jobId)
    .eq("file_type", fileType)
    .select("name, revision, storage_path");
  if (error) return fail(`Could not remove: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await removeIfUnused(supabase, removed.storage_path);
    await logActivity(supabase, {
      jobId,
      type: "file",
      description: `${FILE_FOLDER[fileType].noun} removed: ${label(removed.name, removed.revision)}`,
      metadata: { file_type: fileType },
    });
  }
  refresh(jobId);
  return ok();
}
