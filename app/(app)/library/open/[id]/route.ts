import { NextResponse, type NextRequest } from "next/server";
import { LIBRARY_BUCKET } from "@/lib/library";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

/** Seconds a signed link stays valid: long enough to open, short enough not to share around. */
const SIGNED_URL_TTL = 300;

/**
 * GET /library/open/<doc id>: signs a short-lived URL for the document's PDF
 * (private 'library' bucket) and redirects to it. The caller's session does
 * the signing, so storage RLS (active members only) is the lock. Linked from
 * the category page with target=_blank, so a fresh URL is minted per tap.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", request.url));
  if (!viewer.profile?.active) return NextResponse.redirect(new URL("/pending", request.url));

  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("library_docs")
    .select("category, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const back = new URL(`/library/${doc.category}?error=open`, request.url);
  if (!doc.storage_path) return NextResponse.redirect(back);

  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(doc.storage_path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return NextResponse.redirect(back);

  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
