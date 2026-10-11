import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getOrg } from "@/lib/org";
import { getViewer } from "@/lib/session";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata = { title: "Choose a password" };

/**
 * Reached from an invite or reset email (via /auth/confirm, which signs the
 * person in). Needs a session; works whether or not the profile is active.
 */
export default async function SetPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?error=link");
  const org = await getOrg();
  return (
    <AuthShell org={org} title="Choose a password">
      <SetPasswordForm email={viewer.email} />
    </AuthShell>
  );
}
