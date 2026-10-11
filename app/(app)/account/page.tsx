import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { BackLink, Page, PageTitle } from "@/components/ui";
import { roleOptionLabel } from "@/lib/roles";
import { requireMemberWithRole } from "@/lib/session";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireMemberWithRole();
  const role = me.catalog.find((r) => r.key === me.profile.role);

  return (
    <Page narrow>
      <BackLink href="/" label="Today" />
      <PageTitle title="My account" subtitle={role ? roleOptionLabel(role) : me.profile.role} />

      <section className="mb-4 border border-line bg-surface p-4">
        <div className="mb-3 text-[10px] uppercase tracking-[1.5px] text-dim">Signed in as</div>
        <div className="break-all text-sm">{me.email}</div>
        <p className="mt-1 text-[11px] text-faint">Your email and role are managed by an admin.</p>
      </section>

      <section className="mb-4 border border-line bg-surface p-4">
        <div className="mb-3 text-[10px] uppercase tracking-[1.5px] text-dim">Your details</div>
        <AccountForm name={me.profile.name ?? ""} phone={me.profile.phone ?? ""} />
      </section>

      <section className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/set-password"
          className="flex min-h-12 items-center justify-center gap-2 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-ink hover:border-brand hover:text-brand"
        >
          <KeyRound size={14} /> Change password
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-ink hover:border-danger hover:text-danger"
          >
            <LogOut size={14} /> Sign out
          </button>
        </form>
      </section>
    </Page>
  );
}
