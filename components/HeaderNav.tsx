"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, User, Users, type LucideIcon } from "lucide-react";

type Btn = { href: string; label: string; icon: LucideIcon; title: string; iconOnlyOnPhone?: boolean };

/**
 * Header buttons in the Phase 1 style (SCHEDULE / BULLETIN / HOURS / CREW):
 * outlined, Oswald caps, filled with the brand colour when that page is open.
 * Which buttons show is decided on the server from the viewer's role.
 */
export function HeaderNav({ admin, superUser, initials }: { admin: boolean; superUser: boolean; initials: string }) {
  const pathname = usePathname();
  const buttons: Btn[] = [];
  if (admin) buttons.push({ href: "/crew", label: "Crew", icon: Users, title: "Manage crew" });
  if (superUser)
    buttons.push({ href: "/settings", label: "Settings", icon: Settings, title: "Company settings", iconOnlyOnPhone: true });

  const accountActive = pathname.startsWith("/account");

  return (
    <nav aria-label="Admin" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {buttons.map((b) => {
        const active = pathname.startsWith(b.href);
        const Icon = b.icon;
        return (
          <Link
            key={b.href}
            href={b.href}
            title={b.title}
            aria-label={b.iconOnlyOnPhone ? b.label : undefined}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 min-w-11 items-center justify-center gap-1 border px-2.5 font-display text-[10px] uppercase tracking-[1.5px] ${
              active ? "border-brand bg-brand text-bg" : "border-line text-ink hover:border-brand hover:text-brand"
            }`}
          >
            <Icon size={13} className="shrink-0" />
            <span className={b.iconOnlyOnPhone ? "hidden sm:inline" : undefined}>{b.label}</span>
          </Link>
        );
      })}
      <Link
        href="/account"
        title="My account"
        aria-label="My account"
        aria-current={accountActive ? "page" : undefined}
        className={`flex h-11 w-11 shrink-0 items-center justify-center border font-display text-xs font-bold ${
          accountActive ? "border-brand bg-brand text-bg" : "border-line-2 bg-surface-2 text-ink hover:border-brand"
        }`}
      >
        {initials || <User size={16} />}
      </Link>
    </nav>
  );
}
