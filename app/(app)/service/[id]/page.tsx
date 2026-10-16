import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople, nameMap } from "@/lib/people";
import { serviceFingerprint } from "@/lib/service";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { ServiceCallScreen, type HistoryLine, type PhotoView } from "./ServiceCallScreen";

/** One read per request, shared by the title and the page. */
const loadCall = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("service_calls").select("*").eq("id", id).maybeSingle();
  return data ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const call = await loadCall(id);
  // The document title doubles as the file name when the work order is saved as PDF.
  return { title: call?.service_code ? `Work Order ${call.service_code}` : "Service call" };
}

// Paper work order: white page, black text, only the sheet (no app header, nav or controls).
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; color: #000 !important; }
  header, nav, [data-print="hide"] { display: none !important; }
  body > div { padding-bottom: 0 !important; min-height: 0 !important; }
  main { max-width: none !important; padding: 0 !important; }
  [data-print="sheet"] { border: 0 !important; margin: 0 !important; padding: 0 !important; }
  [data-print="sheet"], [data-print="sheet"] * {
    color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  [data-print="sheet"] [data-bar], [data-print="sheet"] [data-bar] * { color: #fff !important; }
  [data-print="sheet"] a { color: inherit !important; text-decoration: none !important; }
}
`;

export default async function ServiceCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const member = await requireMemberWithRole();
  const { id } = await params;
  const { edit } = await searchParams;
  const call = await loadCall(id);
  if (!call) notFound();

  const org = await getOrg();
  const supabase = await createClient();
  const [people, photosRes, legalRes, activityRes] = await Promise.all([
    loadPeople(supabase),
    supabase.from("photos").select("*").eq("service_call_id", id).order("taken_at", { ascending: false }),
    supabase.from("org_settings").select("legal_name").limit(1).maybeSingle(),
    supabase
      .from("activity_log")
      .select("id, description, user_name, occurred_at")
      .eq("service_call_id", id)
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);

  // Private bucket: short-lived signed links for the photos this viewer may see.
  const rows = photosRes.data ?? [];
  const urls = new Map<string, string>();
  if (rows.length > 0) {
    const { data } = await supabase.storage.from("photos").createSignedUrls(
      rows.map((p) => p.storage_path),
      60 * 60,
    );
    for (const s of data ?? []) if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
  }
  const names = nameMap(people);
  const photos: PhotoView[] = rows.map((p) => ({
    id: p.id,
    url: urls.get(p.storage_path) ?? null,
    caption: p.caption,
    date: p.date,
    takenBy: p.taken_by ? (names.get(p.taken_by) ?? null) : null,
    canChange: member.admin || p.taken_by === member.userId,
  }));
  const history: HistoryLine[] = (activityRes.data ?? []).map((a) => ({
    id: a.id,
    description: a.description,
    who: a.user_name,
    at: a.occurred_at,
  }));

  return (
    <Page narrow>
      {/* Constant CSS (no user data); set as raw HTML so selectors like ">" are not escaped. */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <ServiceCallScreen
        call={call}
        fingerprint={serviceFingerprint(call)}
        people={people}
        today={todayInZone(org.timezone)}
        timezone={org.timezone}
        admin={member.admin}
        company={{
          name: legalRes.data?.legal_name?.trim() || org.companyName,
          short: org.companyShort,
          logoUrl: org.logoUrl,
        }}
        photos={photos}
        photosError={photosRes.error?.message ?? null}
        // RLS shows a call's photos only to admins and to whoever created the call.
        photosLimited={!member.admin && call.created_by !== member.userId}
        history={history}
        startEditing={edit === "1"}
      />
    </Page>
  );
}
