import { BackLink, Page, PageTitle } from "@/components/ui";
import { safeTimeZone } from "@/lib/dates";
import { logoUrl } from "@/lib/org";
import { requireSuper } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LogoUpload } from "./LogoUpload";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Company settings" };

/** Timezones offered: the Americas and Pacific, plus whatever is saved now. */
function timezoneOptions(current: string): string[] {
  let all: string[] = [];
  try {
    all = Intl.supportedValuesOf("timeZone");
  } catch {
    all = [];
  }
  const list = all.filter((z) => z.startsWith("America/") || z.startsWith("Pacific/"));
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

/** Owners and developers only: every org_settings value, plus the logo. */
export default async function SettingsPage() {
  await requireSuper();
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("org_settings").select("*").limit(1).maybeSingle();

  return (
    <Page narrow>
      <BackLink href="/" label="Today" />
      <PageTitle title="Company settings" subtitle="Name, brand, time and numbering for the whole app" />
      {error || !row ? (
        <div role="alert" className="border border-danger bg-surface p-3 text-xs text-danger">
          Could not load the settings{error ? `: ${error.message}` : " (no settings row)."}
        </div>
      ) : (
        <>
          <LogoUpload logoPath={row.logo_path} logoUrl={logoUrl(row.logo_path)} companyShort={row.company_short} />
          <SettingsForm settings={row} timezones={timezoneOptions(row.timezone)} />
          {row.updated_at && (
            <p className="mt-3 text-[10px] text-faint">
              Last saved {new Date(row.updated_at).toLocaleString("en-CA", { timeZone: safeTimeZone(row.timezone) })}
            </p>
          )}
        </>
      )}
    </Page>
  );
}
