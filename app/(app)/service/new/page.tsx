import { Page } from "@/components/ui";
import { todayInZone, yearOf } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople } from "@/lib/people";
import { suggestServiceCode } from "@/lib/service";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ServiceCallEditor } from "../ServiceCallEditor";

export const metadata = { title: "New service call" };

export default async function NewServiceCallPage() {
  await requireMember();
  const org = await getOrg();
  const supabase = await createClient();
  const today = todayInZone(org.timezone);
  const [suggestedCode, people] = await Promise.all([
    suggestServiceCode(supabase, org.serviceNumberPrefix, yearOf(today)),
    loadPeople(supabase),
  ]);

  return (
    <Page narrow>
      <ServiceCallEditor call={null} suggestedCode={suggestedCode} people={people} today={today} />
    </Page>
  );
}
