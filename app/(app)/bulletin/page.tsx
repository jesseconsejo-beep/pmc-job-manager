import { BackLink, Page } from "@/components/ui";
import { getOrg } from "@/lib/org";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { BulletinBoard } from "./BulletinBoard";

export const metadata = { title: "Bulletin Board" };

export default async function BulletinPage() {
  const member = await requireMemberWithRole();
  const org = await getOrg();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bulletin_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <Page narrow>
      <BackLink href="/" label="Today" />
      {error ? (
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load the bulletin board: {error.message}
        </div>
      ) : (
        <BulletinBoard
          posts={data ?? []}
          userId={member.userId}
          authorName={member.profile.name?.trim() || member.email.split("@")[0] || member.email}
          admin={member.admin}
          timezone={org.timezone}
          now={new Date().toISOString()}
        />
      )}
    </Page>
  );
}
