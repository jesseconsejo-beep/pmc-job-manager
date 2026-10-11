import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ErrorNote } from "@/components/ui";
import { getOrg } from "@/lib/org";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Ask your admin for a new invite.",
};

/**
 * Invite-only: email + password, no sign-up link. Accounts are created by an
 * admin invite (or by hand for the first owner).
 *
 * Branding: signed out, org_settings is unreadable, so getOrg() falls back to
 * public_branding() (0004), then to the neutral defaults.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const org = await getOrg();
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <AuthShell
      org={org}
      title="Sign in"
      footer={<>Accounts are by invitation only. Ask your admin for an invite.</>}
    >
      <ErrorNote message={message} />
      <LoginForm />
      <div className="mt-4 text-center">
        <Link
          href="/forgot"
          className="inline-flex min-h-11 items-center text-xs text-dim underline decoration-dashed underline-offset-4 hover:text-brand"
        >
          Forgot password?
        </Link>
      </div>
    </AuthShell>
  );
}
