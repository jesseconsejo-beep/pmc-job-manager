import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Person = { id: string; name: string; active: boolean };

/** Crew list for assignee pickers and name lookups (RLS: active members only). */
export async function loadPeople(supabase: Client): Promise<Person[]> {
  const { data } = await supabase.from("profiles").select("id, name, email, active").order("name");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name?.trim() || p.email.split("@")[0] || p.email,
    active: p.active,
  }));
}

export function nameMap(people: Person[]): Map<string, string> {
  return new Map(people.map((p) => [p.id, p.name]));
}
