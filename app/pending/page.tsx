import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { getOrg } from "@/lib/org";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Waiting for activation" };

export default async function PendingPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile?.active) redirect("/");
  const org = await getOrg();

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="hazard-strip" />
      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-sm border-2 border-brand bg-surface p-6 text-center">
          <Clock size={40} className="mx-auto mb-4 text-brand" />
          <h1 className="font-display text-lg uppercase tracking-[1.5px]">Almost there</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink">Your account is waiting for an admin to activate it.</p>
          <p className="mt-2 break-all text-xs text-dim">Signed in as {viewer.email}</p>
          <p className="mt-1 text-[11px] text-faint">{org.companyName}</p>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="min-h-12 w-full border border-line font-display text-sm uppercase tracking-[1.5px] text-ink hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
