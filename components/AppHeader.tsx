import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { HeaderNav } from "@/components/HeaderNav";
import type { Org } from "@/lib/org";

/** Initials for the account button ("Jesse Consejo" -> "JC"). */
export function initialsOf(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split("@")[0] || "";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Industrial header: hazard strip, brand, role-gated buttons (CREW for admins,
 * SETTINGS for owners/developers), the account button, and sign-out (on a
 * phone, sign-out lives on the Account page to keep the header on one line).
 */
export function AppHeader({
  org,
  admin,
  superUser,
  initials,
}: {
  org: Org;
  admin: boolean;
  superUser: boolean;
  initials: string;
}) {
  return (
    <header
      className="sticky top-0 z-50 border-b-2 border-brand"
      style={{ background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%)" }}
    >
      <div className="hazard-strip" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant logo from a public bucket
            <img src={org.logoUrl} alt={org.companyShort} className="h-10 w-10 shrink-0 rounded object-contain" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand font-display text-sm font-bold text-bg">
              {org.companyShort.slice(0, 3).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold uppercase leading-none tracking-wider">
              {org.companyShort}
            </span>
            <span className="mt-1 block truncate text-[10px] uppercase tracking-[2px] text-dim">Job Manager</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <HeaderNav admin={admin} superUser={superUser} initials={initials} />
          <form action={signOut} className="hidden sm:block">
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1.5 border border-line px-3 font-display text-[11px] uppercase tracking-[1.5px] text-ink hover:border-brand hover:text-brand"
            >
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
