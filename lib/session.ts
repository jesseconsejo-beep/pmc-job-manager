import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string;
  profile: Profile | null;
};

/** The signed-in user (verified with Supabase Auth) and their profile, once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  return { userId: data.user.id, email: data.user.email ?? profile?.email ?? "", profile: profile ?? null };
});

/** For pages inside the app shell: signed in AND active, or redirect. */
export async function requireMember(): Promise<Viewer & { profile: Profile }> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.profile || !viewer.profile.active) redirect("/pending");
  return { ...viewer, profile: viewer.profile };
}

/** First name for greetings, falling back to the email's local part. */
export function firstName(viewer: Viewer): string {
  const name = viewer.profile?.name?.trim() || viewer.email.split("@")[0] || "";
  return name.split(/\s+/)[0] ?? "";
}
