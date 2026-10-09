import { ComingSoon } from "@/components/ui";
import { getOrg } from "@/lib/org";

export async function generateMetadata() {
  const org = await getOrg();
  return { title: org.assistantName };
}

export default async function AssistantPage() {
  const org = await getOrg();
  return <ComingSoon title={org.assistantName}>The assistant is not built yet.</ComingSoon>;
}
