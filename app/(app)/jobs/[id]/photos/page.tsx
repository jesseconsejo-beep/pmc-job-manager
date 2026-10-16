import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople, nameMap } from "@/lib/people";
import { PHOTO_BUCKET, SIGNED_URL_TTL, type PhotoView } from "@/lib/photos";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { PhotosBoard } from "./PhotosBoard";

export const metadata = { title: "Photos" };

export default async function JobPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireMemberWithRole();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [jobRes, photosRes, people, assignedRes] = await Promise.all([
    supabase.from("jobs").select("id, job_name").eq("id", id).maybeSingle(),
    supabase
      .from("photos")
      .select("*")
      .eq("job_id", id)
      .order("date", { ascending: false, nullsFirst: false })
      .order("taken_at", { ascending: false }),
    loadPeople(supabase),
    supabase.from("job_assignments").select("job_id").eq("job_id", id).eq("user_id", viewer.userId).limit(1),
  ]);
  const job = jobRes.data;
  if (!job) notFound();

  const rows = photosRes.data ?? [];
  // The bucket is private: sign every thumbnail here, in one call, with the viewer's session.
  const urls = new Map<string, string>();
  let signError: string | null = null;
  if (rows.length > 0) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        rows.map((p) => p.storage_path),
        SIGNED_URL_TTL,
      );
    if (error) signError = error.message;
    for (const s of data ?? []) {
      if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
    }
  }

  const names = nameMap(people);
  const photos: PhotoView[] = rows.map((p) => ({
    ...p,
    url: urls.get(p.storage_path) ?? null,
    takenByName: p.taken_by ? (names.get(p.taken_by) ?? null) : null,
  }));

  return (
    <Page>
      <BackLink href={`/jobs/${job.id}`} label={job.job_name} />
      <h1 className="mb-4 font-display text-2xl uppercase tracking-[1.5px]">Photos</h1>
      {photosRes.error ? (
        <div className="border border-danger p-3 text-xs text-danger">Could not load photos: {photosRes.error.message}</div>
      ) : (
        <PhotosBoard
          jobId={job.id}
          photos={photos}
          viewerId={viewer.userId}
          admin={viewer.admin}
          assigned={(assignedRes.data?.length ?? 0) > 0}
          today={todayInZone(org.timezone)}
          timezone={org.timezone}
          signError={signError}
        />
      )}
    </Page>
  );
}
