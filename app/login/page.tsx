import { HardHat } from "lucide-react";
import { getOrg } from "@/lib/org";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

/**
 * Invite-only: email + password, no sign-up link. Accounts are created by an
 * admin invite (or by hand for the first owner).
 *
 * Branding: org_settings is readable only with a session (org_settings_read
 * requires auth.uid()), so a signed-out visitor gets the neutral defaults here.
 */
export default async function LoginPage() {
  const org = await getOrg();
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="hazard-strip" />
      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
              <img src={org.logoUrl} alt="" className="h-12 w-12 rounded object-contain" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center bg-brand font-display text-base font-bold text-bg">
                {org.source === "database" ? org.companyShort.slice(0, 3).toUpperCase() : <HardHat size={26} />}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-display text-xl font-semibold uppercase leading-none tracking-wider">Job Manager</div>
              {org.source === "database" && (
                <div className="mt-1 truncate text-[10px] uppercase tracking-[2px] text-dim">{org.companyName}</div>
              )}
            </div>
          </div>
          <div className="border-2 border-brand bg-surface p-6">
            <h1 className="mb-4 font-display text-lg uppercase tracking-[1.5px]">Sign in</h1>
            <LoginForm />
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            Accounts are by invitation only. Ask your admin for an invite.
          </p>
        </div>
      </main>
    </div>
  );
}
