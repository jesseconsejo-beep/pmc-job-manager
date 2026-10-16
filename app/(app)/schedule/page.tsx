import { BackLink, Page } from "@/components/ui";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { loadPeople } from "@/lib/people";
import { isBC } from "@/lib/schedule-shared";
import { requireMemberWithRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ScheduleBoard } from "./ScheduleBoard";

export const metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const member = await requireMemberWithRole();
  const org = await getOrg();
  const supabase = await createClient();

  const [eventsRes, settingsRes, people] = await Promise.all([
    supabase.from("schedule_events").select("*").order("start_date").order("created_at"),
    supabase.from("org_settings").select("region").limit(1).maybeSingle(),
    loadPeople(supabase),
  ]);

  return (
    <Page narrow>
      <BackLink href="/" label="Today" />
      {eventsRes.error ? (
        <div role="alert" className="border border-danger p-3 text-xs text-danger">
          Could not load the schedule: {eventsRes.error.message}
        </div>
      ) : (
        <ScheduleBoard
          events={eventsRes.data ?? []}
          people={people}
          today={todayInZone(org.timezone)}
          userId={member.userId}
          admin={member.admin}
          bcHolidays={isBC(settingsRes.data?.region) && member.admin}
        />
      )}
    </Page>
  );
}
