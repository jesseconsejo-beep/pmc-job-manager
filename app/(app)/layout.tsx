import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getOrg } from "@/lib/org";
import { requireMember } from "@/lib/session";

/** Shell for every signed-in, active page. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  const org = await getOrg();
  return (
    <div className="min-h-dvh" style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <AppHeader org={org} />
      {children}
      <BottomNav assistantName={org.assistantName} />
    </div>
  );
}
