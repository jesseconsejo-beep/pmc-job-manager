import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSuper } from "@/lib/roles";
import type { Profile, RoleCatalogRow } from "@/lib/types";

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

/** role_catalog, once per request ("*" so it works before and after 0005 adds tier). */
export const getRoleCatalog = cache(async (): Promise<RoleCatalogRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("role_catalog").select("*").order("sort");
  return (data ?? []).map((r) => ({ ...r, tier: r.tier ?? null }));
});

export type Member = Viewer & { profile: Profile; catalog: RoleCatalogRow[]; admin: boolean; super: boolean };

/** Active member plus what their role allows (for page gates and header buttons). */
export async function requireMemberWithRole(): Promise<Member> {
  const viewer = await requireMember();
  const catalog = await getRoleCatalog();
  return {
    ...viewer,
    catalog,
    admin: isAdmin(viewer.profile, catalog),
    super: isSuper(viewer.profile, catalog),
  };
}

/** Admins only (role_catalog.is_admin); everyone else goes home with nothing rendered. */
export async function requireAdmin(): Promise<Member> {
  const m = await requireMemberWithRole();
  if (!m.admin) redirect("/");
  return m;
}

/** Supers only (tier owner or developer). */
export async function requireSuper(): Promise<Member> {
  const m = await requireMemberWithRole();
  if (!m.super) redirect("/");
  return m;
}
