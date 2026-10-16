import type { Tool } from "@/lib/types";

/**
 * Who dropped off / picked up a tool, as sent from the form: a profile id
 * (crew with a login), or free text for anyone else. One of the two wins:
 * a valid id clears the text.
 */
export type PersonInput = { id: string; text: string };

/** Display name for an id/text pair: the profile's name, else the typed name. */
export function whoLabel(id: string | null, text: string | null, names: Map<string, string>): string | null {
  if (id) return names.get(id) ?? (text?.trim() || "Former crew member");
  const t = text?.trim();
  return t ? t : null;
}

/** On-site tools in the order they arrived; picked-up tools most recent first. */
export function splitTools(tools: Tool[]): { onSite: Tool[]; pickedUp: Tool[] } {
  const onSite = tools.filter((t) => !t.picked_up).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pickedUp = tools
    .filter((t) => t.picked_up)
    .sort(
      (a, b) =>
        (b.picked_up_date ?? "").localeCompare(a.picked_up_date ?? "") || b.created_at.localeCompare(a.created_at),
    );
  return { onSite, pickedUp };
}
