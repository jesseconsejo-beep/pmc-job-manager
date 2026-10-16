import { notFound } from "next/navigation";
import { JobFilesList } from "@/components/JobFilesList";
import { BackLink, Page } from "@/components/ui";
import { FILE_FOLDER, type FolderFileType } from "@/lib/job-files";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

/**
 * Server half of the IFC and Shop Drawing folders (Phase 1 FilesList):
 * loads the job and its job_files of one type with the viewer's session
 * (RLS decides), then hands them to the shared client list.
 */
export async function JobFilesFolder({ jobId, fileType }: { jobId: string; fileType: FolderFileType }) {
  await requireMember();
  if (!isUuid(jobId)) notFound();

  const supabase = await createClient();
  const [jobRes, filesRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", jobId).maybeSingle(),
    supabase
      .from("job_files")
      .select("id, file_type, name, revision, date_issued, storage_path, external_url, notes, uploaded_at")
      .eq("job_id", jobId)
      .eq("file_type", fileType)
      .order("uploaded_at", { ascending: false }),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  return (
    <Page narrow>
      <BackLink href={`/jobs/${jobId}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">{FILE_FOLDER[fileType].title}</h1>
      {filesRes.error ? (
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load drawings: {filesRes.error.message}
        </div>
      ) : (
        <JobFilesList jobId={jobId} fileType={fileType} files={filesRes.data ?? []} />
      )}
    </Page>
  );
}
