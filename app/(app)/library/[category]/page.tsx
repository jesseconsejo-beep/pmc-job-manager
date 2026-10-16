import { notFound } from "next/navigation";
import { BackLink, Page } from "@/components/ui";
import { categoryMeta, isLibraryCategory } from "@/lib/library";
import { getOrg } from "@/lib/org";
import { isBC } from "@/lib/schedule-shared";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LibraryShelf } from "./LibraryShelf";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isLibraryCategory(category)) return { title: "Library" };
  const org = await getOrg();
  return { title: categoryMeta(category, { companyShort: org.companyShort, bc: false }).label };
}

export default async function LibraryCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await requireMemberWithRole();
  const { category } = await params;
  if (!isLibraryCategory(category)) notFound();
  const sp = await searchParams;

  const org = await getOrg();
  const supabase = await createClient();
  const [docsRes, settingsRes] = await Promise.all([
    supabase.from("library_docs").select("*").eq("category", category).order("title"),
    supabase.from("org_settings").select("region").limit(1).maybeSingle(),
  ]);

  return (
    <Page narrow>
      <BackLink href="/library" label="Library" />
      {docsRes.error ? (
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load the documents: {docsRes.error.message}
        </div>
      ) : (
        <LibraryShelf
          category={category}
          docs={docsRes.data ?? []}
          userId={member.userId}
          admin={member.admin}
          companyShort={org.companyShort}
          bc={isBC(settingsRes.data?.region)}
          openError={sp.error === "open"}
        />
      )}
    </Page>
  );
}
