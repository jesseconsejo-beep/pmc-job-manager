"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { todayInZone } from "@/lib/dates";
import { getOrg } from "@/lib/org";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { PersonInput } from "@/lib/tools";
import type { Tool } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;
type Who = { id: string | null; text: string | null };

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

/** A profile id wins; otherwise the typed name (or nobody). */
function cleanPerson(v: unknown): Who {
  if (!v || typeof v !== "object") return { id: null, text: null };
  const { id, text } = v as Record<string, unknown>;
  if (isUuid(id)) return { id: id.toLowerCase(), text: null };
  return { id: null, text: cleanText(text, 100) };
}

async function whoName(supabase: Client, who: Who): Promise<string | null> {
  if (who.id) {
    const { data } = await supabase.from("profiles").select("name, email").eq("id", who.id).maybeSingle();
    return data ? data.name?.trim() || data.email : null;
  }
  return who.text;
}

function byClause(name: string | null): string {
  return name ? ` (by ${name})` : "";
}

// ---------- add ----------

export type ToolInput = { name: string; dropped_by: PersonInput; dropped_date: string };

export async function addTool(jobId: string, input: ToolInput): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const name = cleanText(input?.name, 200);
  if (!name) return fail("Name the tool or piece of equipment.");
  const by = cleanPerson(input.dropped_by);

  const supabase = await createClient();
  const { error } = await supabase.from("tools").insert({
    job_id: jobId,
    name,
    dropped_by_id: by.id,
    dropped_by_text: by.text,
    dropped_date: cleanDate(input.dropped_date),
  });
  if (error) return fail(`Could not add the tool: ${error.message}`);

  const who = await whoName(supabase, by);
  await logActivity(supabase, {
    jobId,
    type: "tool",
    description: who ? `Tool dropped off: ${name}${byClause(who)}` : `Tool added: ${name}`,
  });
  refresh(jobId);
  return ok();
}

// ---------- edit + verified toggle ----------

export type ToolPatch = {
  name?: string;
  dropped_by?: PersonInput;
  dropped_date?: string;
  picked_up_by?: PersonInput;
  picked_up_date?: string;
  checked?: boolean;
};

export async function updateTool(jobId: string, toolId: string, patch: ToolPatch): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(toolId)) return fail("Unknown tool.");
  const supabase = await createClient();
  const { data: current } = await supabase.from("tools").select("*").eq("id", toolId).eq("job_id", jobId).maybeSingle();
  if (!current) return fail("That tool no longer exists.");

  const update: Partial<Tool> = {};
  if (patch.name !== undefined) {
    const name = cleanText(patch.name, 200);
    if (!name) return fail("The tool needs a name.");
    update.name = name;
  }
  if (patch.dropped_by !== undefined) {
    const by = cleanPerson(patch.dropped_by);
    update.dropped_by_id = by.id;
    update.dropped_by_text = by.text;
  }
  if (patch.dropped_date !== undefined) update.dropped_date = cleanDate(patch.dropped_date);
  // Pick-up details only mean something while the tool is marked picked up.
  if (current.picked_up && patch.picked_up_by !== undefined) {
    const by = cleanPerson(patch.picked_up_by);
    if (!by.id && !by.text) return fail("Say who picked it up.");
    update.picked_up_by_id = by.id;
    update.picked_up_by_text = by.text;
  }
  if (current.picked_up && patch.picked_up_date !== undefined) {
    const d = cleanDate(patch.picked_up_date);
    if (!d) return fail("Pick the date it was picked up.");
    update.picked_up_date = d;
  }
  if (typeof patch.checked === "boolean") update.checked = patch.checked;
  if (Object.keys(update).length === 0) return ok();

  const { error } = await supabase.from("tools").update(update).eq("id", toolId).eq("job_id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const label = update.name ?? current.name;
  const onlyChecked = Object.keys(update).length === 1 && update.checked !== undefined;
  const description = onlyChecked
    ? update.checked
      ? `Tool verified on site: ${label}`
      : `Tool unverified: ${label}`
    : `Tool updated: ${label}`;
  await logActivity(supabase, { jobId, type: "tool", description });
  refresh(jobId);
  return ok();
}

// ---------- picked up / back on site ----------

export async function markPickedUp(jobId: string, toolId: string, by: PersonInput, date: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(toolId)) return fail("Unknown tool.");
  const who = cleanPerson(by);
  if (!who.id && !who.text) return fail("Say who picked it up.");
  const org = await getOrg();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .update({
      picked_up: true,
      picked_up_by_id: who.id,
      picked_up_by_text: who.text,
      picked_up_date: cleanDate(date) ?? todayInZone(org.timezone),
    })
    .eq("id", toolId)
    .eq("job_id", jobId)
    .select("name");
  if (error) return fail(`Could not mark it picked up: ${error.message}`);
  const row = data?.[0];
  if (!row) return fail("That tool no longer exists.");

  const name = await whoName(supabase, who);
  await logActivity(supabase, { jobId, type: "tool", description: `Tool picked up: ${row.name}${byClause(name)}` });
  refresh(jobId);
  return ok();
}

export async function markOnSite(jobId: string, toolId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(toolId)) return fail("Unknown tool.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .update({ picked_up: false, picked_up_by_id: null, picked_up_by_text: null, picked_up_date: null })
    .eq("id", toolId)
    .eq("job_id", jobId)
    .select("name");
  if (error) return fail(`Could not mark it back on site: ${error.message}`);
  const row = data?.[0];
  if (!row) return fail("That tool no longer exists.");

  await logActivity(supabase, { jobId, type: "tool", description: `Tool back on site: ${row.name}` });
  refresh(jobId);
  return ok();
}

// ---------- delete ----------

export async function deleteTool(jobId: string, toolId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(toolId)) return fail("Unknown tool.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("tools").delete().eq("id", toolId).eq("job_id", jobId).select("name");
  if (error) return fail(`Could not remove: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await logActivity(supabase, { jobId, type: "tool", description: `Tool removed: ${removed.name}` });
  }
  refresh(jobId);
  return ok();
}
