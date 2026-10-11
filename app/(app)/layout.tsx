import { AppHeader, initialsOf } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getOrg } from "@/lib/org";
import { requireMemberWithRole } from "@/lib/session";

/** Shell for every signed-in, active page. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMemberWithRole();
  const org = await getOrg();
  return (
    <div className="min-h-dvh" style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <AppHeader
        org={org}
        admin={member.admin}
        superUser={member.super}
        initials={initialsOf(member.profile.name, member.email)}
      />
      {children}
      <BottomNav assistantName={org.assistantName} />
    </div>
  );
}
