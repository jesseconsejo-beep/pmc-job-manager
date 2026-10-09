"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, Hammer, House, Library, MessageSquare, Plus, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean };

/** Fixed bottom nav from the Phase 1 spec. The last tab is named by org_settings.assistant_name. */
export function BottomNav({ assistantName }: { assistantName: string }) {
  const pathname = usePathname();
  const left: Item[] = [
    { href: "/", label: "Today", icon: House, match: (p) => p === "/" },
    { href: "/jobs", label: "Jobs", icon: Folder, match: (p) => p.startsWith("/jobs") },
    { href: "/service", label: "Service", icon: Hammer, match: (p) => p.startsWith("/service") },
  ];
  const right: Item[] = [
    { href: "/library", label: "Library", icon: Library, match: (p) => p.startsWith("/library") },
    { href: "/assistant", label: assistantName, icon: MessageSquare, match: (p) => p.startsWith("/assistant") },
  ];

  const link = (item: Item) => {
    const Icon = item.icon;
    const active = item.match(pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 font-display text-[9px] font-semibold uppercase tracking-[0.8px] ${
          active ? "text-brand" : "text-dim"
        }`}
      >
        <Icon size={20} />
        <span className="max-w-full truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-brand bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-[60px] max-w-xl items-center justify-around">
        {left.map(link)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Quick add"
            title="Quick add (coming soon)"
            className="-mt-[18px] flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-bg"
            style={{ boxShadow: "0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent)" }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
        {right.map(link)}
      </div>
    </nav>
  );
}
