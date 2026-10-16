"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { todayInZone } from "@/lib/dates";
import { itemsOf, newId, parseQty, parseRecipients } from "@/lib/materials";
import { getOrg } from "@/lib/org";
import { requireMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { MaterialItem, MaterialOrder } from "@/lib/types";
import { cleanDate, cleanText, fail, isUuid, ok, type ActionResult } from "@/lib/validate";

type Client = Awaited<ReturnType<typeof createClient>>;

const MAX_ITEMS = 200;

function refresh(jobId: string) {
  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`, "layout");
}

async function loadOrder(supabase: Client, jobId: string, orderId: string): Promise<MaterialOrder | null> {
  const { data } = await supabase
    .from("material_orders")
    .select("*")
    .eq("id", orderId)
    .eq("job_id", jobId)
    .maybeSingle();
  return data ?? null;
}

function supplierLabel(supplier: string | null): string {
  return supplier?.trim() || "supplier";
}

// ---------- order form ----------

export type OrderItemInput = { id: string; description: string; qty: string; unit: string };

export type OrderInput = {
  supplier: string;
  supplier_email: string;
  po_number: string;
  order_date: string;
  expected_date: string;
  notes: string;
  items: OrderItemInput[];
};

type OrderFields = Pick<
  MaterialOrder,
  "supplier" | "supplier_email" | "po_number" | "order_date" | "expected_date" | "notes" | "items"
>;

function field(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === "string" ? v : "";
}

/**
 * Validate the editor's input (it arrives from the client, so trust nothing).
 * Items keep their received state from `current` (the freshest stored row),
 * so an edit never un-receives what someone ticked in the meantime.
 */
function cleanOrder(input: unknown, current: MaterialItem[], today: string): { error: string } | { fields: OrderFields } {
  if (!input || typeof input !== "object") return { error: "Nothing to save." };
  const o = input as Record<string, unknown>;

  const supplier = cleanText(field(o, "supplier"), 200);
  if (!supplier) return { error: "Name the supplier." };

  const emailText = field(o, "supplier_email").trim();
  let supplierEmail: string | null = null;
  if (emailText) {
    const { valid, invalid } = parseRecipients(emailText);
    if (invalid.length > 0 || valid.length === 0) return { error: `Check the supplier email: ${invalid[0] ?? emailText}` };
    supplierEmail = valid.join(", ").slice(0, 320);
  }

  const rawItems: unknown = o.items;
  if (!Array.isArray(rawItems)) return { error: "Add at least one item." };
  const before = new Map(current.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const items: MaterialItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const description = cleanText(field(r, "description"), 500);
    if (!description) continue; // blank rows are dropped, as in Phase 1
    const qty = parseQty(field(r, "qty"));
    if (qty === undefined) return { error: `Qty for "${description}" must be a number (e.g. 12 or 2.5).` };
    const rawId = field(r, "id");
    const id = (isUuid(rawId) || before.has(rawId)) && !seen.has(rawId) ? rawId : newId();
    seen.add(id);
    const prev = before.get(id);
    items.push({
      id,
      description,
      qty,
      unit: cleanText(field(r, "unit"), 20),
      received: prev?.received ?? false,
      received_at: prev?.received_at ?? null,
    });
  }
  if (items.length === 0) return { error: "Add at least one item." };
  if (items.length > MAX_ITEMS) return { error: `An order can hold up to ${MAX_ITEMS} items.` };

  return {
    fields: {
      supplier,
      supplier_email: supplierEmail,
      po_number: cleanText(field(o, "po_number"), 60),
      order_date: cleanDate(field(o, "order_date")) ?? today,
      expected_date: cleanDate(field(o, "expected_date")),
      notes: cleanText(field(o, "notes"), 2000),
      items,
    },
  };
}

export async function createOrder(jobId: string, input: OrderInput): Promise<ActionResult> {
  const viewer = await requireMember();
  if (!isUuid(jobId)) return fail("Unknown job.");
  const org = await getOrg();
  const r = cleanOrder(input, [], todayInZone(org.timezone));
  if ("error" in r) return fail(r.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_orders")
    .insert({ job_id: jobId, ...r.fields, created_by: viewer.userId })
    .select("id")
    .single();
  if (error) return fail(`Could not create the order: ${error.message}`);
  const n = r.fields.items.length;
  await logActivity(supabase, {
    jobId,
    type: "material",
    description: `Order created: ${supplierLabel(r.fields.supplier)} (${n} ${n === 1 ? "item" : "items"})`,
    metadata: { order_id: data.id },
  });
  refresh(jobId);
  return ok();
}

export async function updateOrder(jobId: string, orderId: string, input: OrderInput): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(orderId)) return fail("Unknown order.");
  const supabase = await createClient();
  const current = await loadOrder(supabase, jobId, orderId);
  if (!current) return fail("That order no longer exists.");
  const org = await getOrg();
  const r = cleanOrder(input, itemsOf(current), todayInZone(org.timezone));
  if ("error" in r) return fail(r.error);

  const { data, error } = await supabase
    .from("material_orders")
    .update(r.fields)
    .eq("id", orderId)
    .eq("job_id", jobId)
    .select("id");
  if (error) return fail(`Could not save the order: ${error.message}`);
  if (!data || data.length === 0) return fail("That order no longer exists.");
  await logActivity(supabase, {
    jobId,
    type: "material",
    description: `Order updated: ${supplierLabel(r.fields.supplier)}`,
    metadata: { order_id: orderId },
  });
  refresh(jobId);
  return ok();
}

export async function deleteOrder(jobId: string, orderId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(orderId)) return fail("Unknown order.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_orders")
    .delete()
    .eq("id", orderId)
    .eq("job_id", jobId)
    .select("supplier, po_number");
  if (error) return fail(`Could not delete the order: ${error.message}`);
  const removed = data?.[0];
  if (removed) {
    await logActivity(supabase, {
      jobId,
      type: "material",
      description: `Order deleted: ${supplierLabel(removed.supplier)}${removed.po_number ? ` (PO #${removed.po_number})` : ""}`,
      metadata: { order_id: orderId },
    });
  }
  refresh(jobId);
  return ok();
}

// ---------- receiving ----------

/**
 * Tick items received (or not). itemIds = null means every item in the order.
 * Re-reads the row and edits the freshest array, so two people receiving
 * different lines at the same moment rarely clobber each other.
 */
export async function setItemsReceived(
  jobId: string,
  orderId: string,
  itemIds: string[] | null,
  received: boolean,
): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(orderId)) return fail("Unknown order.");
  if (itemIds !== null && (!Array.isArray(itemIds) || itemIds.some((id) => typeof id !== "string" || !id))) {
    return fail("Unknown item.");
  }
  const flag = received === true;

  const supabase = await createClient();
  const current = await loadOrder(supabase, jobId, orderId);
  if (!current) return fail("That order no longer exists.");
  const items = itemsOf(current);
  const wanted = itemIds === null ? null : new Set(itemIds);
  if (wanted && !items.some((i) => wanted.has(i.id))) return fail("That item is no longer on the order.");

  const at = new Date().toISOString();
  const changed: MaterialItem[] = [];
  const next = items.map((i) => {
    if ((wanted && !wanted.has(i.id)) || i.received === flag) return i;
    changed.push(i);
    return { ...i, received: flag, received_at: flag ? at : null };
  });
  if (changed.length === 0) return ok();

  const { error } = await supabase.from("material_orders").update({ items: next }).eq("id", orderId).eq("job_id", jobId);
  if (error) return fail(`Could not save: ${error.message}`);

  const supplier = supplierLabel(current.supplier);
  let description: string;
  if (changed.length === 1) {
    description = `${flag ? "Received" : "Marked not received"}: ${changed[0].description} (${supplier})`;
  } else {
    description = flag
      ? `Received ${changed.length} items (${supplier})`
      : `Marked ${changed.length} items not received (${supplier})`;
  }
  await logActivity(supabase, {
    jobId,
    type: "material",
    description,
    metadata: { order_id: orderId, item_ids: changed.map((i) => i.id) },
  });
  refresh(jobId);
  return ok();
}

// ---------- emailing ----------

/**
 * Stamp last_sent_at after the order was opened in Mail (or marked sent by hand).
 * If the order had no supplier email and one was typed in the email screen, keep it.
 */
export async function markOrderSent(jobId: string, orderId: string, to: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(jobId) || !isUuid(orderId)) return fail("Unknown order.");
  const supabase = await createClient();
  const current = await loadOrder(supabase, jobId, orderId);
  if (!current) return fail("That order no longer exists.");

  const recipients = typeof to === "string" ? parseRecipients(to) : { valid: [], invalid: [] };
  const sentTo = recipients.invalid.length === 0 && recipients.valid.length > 0 ? recipients.valid.join(", ") : null;

  const update: Partial<MaterialOrder> = { last_sent_at: new Date().toISOString() };
  if (!current.supplier_email && sentTo) update.supplier_email = sentTo.slice(0, 320);

  const { error } = await supabase.from("material_orders").update(update).eq("id", orderId).eq("job_id", jobId);
  if (error) return fail(`Could not mark the order sent: ${error.message}`);
  await logActivity(supabase, {
    jobId,
    type: "material",
    description: `Order emailed to ${supplierLabel(current.supplier)}${sentTo ? ` (${sentTo})` : ""}`,
    metadata: { order_id: orderId },
  });
  refresh(jobId);
  return ok();
}
