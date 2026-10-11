import { HardHat } from "lucide-react";
import type { ReactNode } from "react";
import type { Org } from "@/lib/org";

/**
 * Frame for the signed-out pages (login, forgot password, set password):
 * hazard strip, tenant mark, one bordered card. Branding comes from
 * getBranding()/getOrg(); with neither available it shows a neutral mark.
 */
export function AuthShell({
  org,
  title,
  children,
  footer,
}: {
  org: Org;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const branded = org.source === "database";
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="hazard-strip" />
      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
              <img src={org.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded object-contain" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand font-display text-base font-bold text-bg">
                {branded ? org.companyShort.slice(0, 3).toUpperCase() : <HardHat size={26} />}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-display text-xl font-semibold uppercase leading-none tracking-wider">Job Manager</div>
              {branded && <div className="mt-1 truncate text-[10px] uppercase tracking-[2px] text-dim">{org.companyName}</div>}
            </div>
          </div>
          <div className="border-2 border-brand bg-surface p-6">
            <h1 className="mb-4 font-display text-lg uppercase tracking-[1.5px]">{title}</h1>
            {children}
          </div>
          {footer && <div className="mt-4 text-center text-[11px] leading-relaxed text-faint">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Full-width primary submit button used on the auth cards. */
export function AuthSubmit({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 min-h-12 w-full bg-brand font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
