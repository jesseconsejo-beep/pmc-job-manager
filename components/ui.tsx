import Link from "next/link";
import { ChevronLeft, HardHat, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Page wrapper: Phase 1 used 16-20px padding and a centred max width. */
export function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <main className={`mx-auto w-full px-4 py-4 sm:px-5 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>{children}</main>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold uppercase tracking-[2px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[11px] uppercase tracking-wider text-dim">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** The prominent Phase 1 BackButton, as a link. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-11 max-w-full items-center gap-2 border border-line bg-surface-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] text-ink hover:border-brand hover:text-brand"
    >
      <ChevronLeft size={18} strokeWidth={2.5} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Section heading with the coloured bar and a count, as in TodayView. */
export function SectionHeader({ title, count, color }: { title: string; count?: number; color: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="h-[18px] w-1" style={{ background: color }} />
      <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px]">{title}</h2>
      {count !== undefined && <span className="text-[11px] tracking-wider text-dim">({count})</span>}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="border border-line bg-surface p-3.5 text-xs italic text-faint">{children}</div>;
}

export function EmptyState({ icon: Icon = HardHat, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line bg-surface px-6 py-12 text-center">
      <Icon size={44} className="mx-auto mb-4 text-brand-dim" />
      <div className="font-display text-lg uppercase tracking-[1.5px] text-dim">{title}</div>
      {children && <div className="mt-2 text-xs text-faint">{children}</div>}
    </div>
  );
}

export function ComingSoon({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Page narrow>
      <PageTitle title={title} />
      <EmptyState title="Coming soon">{children ?? "This part of the app is not built yet."}</EmptyState>
    </Page>
  );
}

export function StatBlock({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="border border-line bg-surface px-1 py-2.5 text-center">
      <div className="font-display text-[22px] font-bold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[1.2px] text-dim">{label}</div>
    </div>
  );
}

/** Small uppercase label above a value (Phase 1 InfoCell / Field label). */
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[10px] uppercase tracking-[1.5px] text-dim">
      {children}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-3 border border-danger bg-surface px-3 py-2 text-xs text-danger">
      {message}
    </div>
  );
}
