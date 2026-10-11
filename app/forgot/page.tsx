import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { getOrg } from "@/lib/org";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Reset password" };

export default async function ForgotPage() {
  const org = await getOrg();
  return (
    <AuthShell
      org={org}
      title="Reset password"
      footer={
        <Link href="/login" className="inline-flex min-h-11 items-center underline decoration-dashed underline-offset-4 hover:text-brand">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
