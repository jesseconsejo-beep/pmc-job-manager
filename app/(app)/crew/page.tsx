import { Users } from "lucide-react";
import { BackLink, Page } from "@/components/ui";
import { getOrg } from "@/lib/org";
import { sortCatalog } from "@/lib/roles";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CrewList } from "./CrewList";
import { InviteForm, PendingInvites } from "./Invites";

export const metadata = { title: "Crew" };

/** Admins only: the people list (roles, activation, contact cards) and invites. */
export default async function CrewPage() {
  const me = await requireAdmin();
  const org = await getOrg();
  const supabase = await createClient();

  const [profilesRes, invitesRes] = await Promise.all([
    supabase.from("profiles").select("id, email, name, role, phone, active").order("name"),
    supabase.from("invites").select("*").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);

  const people = profilesRes.data ?? [];
  const catalog = sortCatalog(me.catalog);
  const names = new Map(people.map((p) => [p.id, p.name?.trim() || p.email]));
  const invites = (invitesRes.data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    invitedBy: i.invited_by ? (names.get(i.invited_by) ?? "Unknown") : "—",
    expiresAt: i.expires_at,
  }));
  const activeCount = people.filter((p) => p.active).length;
  const defaultInviteRole =
    catalog.find((r) => r.key === "foreman")?.key ?? catalog[catalog.length - 1]?.key ?? "";

  return (
    <Page>
      <BackLink href="/" label="Today" />
      <div className="mb-5 flex items-center gap-3">
        <Users size={28} className="shrink-0 text-brand" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-bold uppercase tracking-[1.5px]">{org.companyShort} Crew</h1>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-dim">
            {activeCount} active · used for task assignment, timesheets, notifications
          </p>
        </div>
      </div>

      {profilesRes.error && (
        <div role="alert" className="mb-4 border border-danger bg-surface p-3 text-xs text-danger">
          Could not load the crew: {profilesRes.error.message}
        </div>
      )}

      <CrewList
        people={people}
        catalog={catalog}
        meId={me.userId}
        canDelete={me.super}
        companyName={org.companyName}
      />

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <InviteForm catalog={catalog} defaultRole={defaultInviteRole} />
        <PendingInvites invites={invites} catalog={catalog} error={invitesRes.error?.message ?? null} />
      </div>
    </Page>
  );
}
