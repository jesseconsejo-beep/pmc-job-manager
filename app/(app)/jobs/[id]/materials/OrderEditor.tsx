"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { OrderInput, OrderItemInput } from "./actions";
import { ErrorNote, Label } from "@/components/ui";
import { formatQty, itemsOf, newId, parseQty, parseRecipients } from "@/lib/materials";
import type { MaterialOrder } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

/** A supplier already used on this job (name + the email it was sent to). */
export type SupplierHint = { name: string; email: string | null };

type DraftItem = OrderItemInput & { received: boolean };

const UNITS = ["ea", "ft", "m", "len", "pc", "pr", "set", "box", "case", "bag", "roll", "pkg", "pail", "tube", "lb", "kg", "L", "gal"];

function blankItem(): DraftItem {
  // Stable id from the start: the server keeps it, so the item is the same item forever.
  return { id: newId(), description: "", qty: "", unit: "", received: false };
}

function draftItems(order: MaterialOrder | undefined): DraftItem[] {
  const items = order
    ? itemsOf(order).map((i) => ({
        id: i.id,
        description: i.description,
        qty: formatQty(i.qty),
        unit: i.unit ?? "",
        received: i.received,
      }))
    : [];
  return items.length > 0 ? items : [blankItem()];
}

/** Create or edit an order (Phase 1 OrderEditor). */
export function OrderEditor({
  order,
  today,
  suppliers,
  onSave,
  onDone,
  onCancel,
}: {
  order?: MaterialOrder;
  today: string;
  suppliers: SupplierHint[];
  onSave: (input: OrderInput) => Promise<ActionResult>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isNew = !order;
  const uid = useId();
  const [supplier, setSupplier] = useState(order?.supplier ?? "");
  const [supplierEmail, setSupplierEmail] = useState(order?.supplier_email ?? "");
  const [po, setPo] = useState(order?.po_number ?? "");
  const [orderDate, setOrderDate] = useState(order?.order_date ?? today);
  const [expected, setExpected] = useState(order?.expected_date ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [items, setItems] = useState<DraftItem[]>(() => draftItems(order));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [initial] = useState(() => JSON.stringify({ supplier, supplierEmail, po, orderDate, expected, notes, items }));

  // Enter on an item jumps to the next row's description (adding a row at the end).
  const descInputs = useRef(new Map<string, HTMLInputElement>());
  const focusNext = useRef<string | null>(null);

  const valid = items.filter((i) => i.description.trim());
  const badQty = new Set(valid.filter((i) => parseQty(i.qty) === undefined).map((i) => i.id));
  const emailCheck = supplierEmail.trim() ? parseRecipients(supplierEmail) : null;
  const emailBad = !!emailCheck && (emailCheck.invalid.length > 0 || emailCheck.valid.length === 0);
  const canSave = !!supplier.trim() && valid.length > 0 && badQty.size === 0 && !emailBad && !pending;

  const changeSupplier = (v: string) => {
    setSupplier(v);
    const hint = suppliers.find((s) => s.name.toLowerCase() === v.trim().toLowerCase());
    if (hint?.email && !supplierEmail.trim()) setSupplierEmail(hint.email);
  };

  const updateItem = (id: string, patch: Partial<OrderItemInput>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItem = () => {
    const item = blankItem();
    focusNext.current = item.id;
    setItems((prev) => [...prev, item]);
  };

  const nextRow = (idx: number) => {
    const next = items[idx + 1];
    if (next) descInputs.current.get(next.id)?.focus();
    else addItem();
  };

  const removeItem = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const cancel = () => {
    const now = JSON.stringify({ supplier, supplierEmail, po, orderDate, expected, notes, items });
    if (now !== initial && !window.confirm("Discard your changes to this order?")) return;
    onCancel();
  };

  const save = () => {
    if (!canSave) return;
    const input: OrderInput = {
      supplier,
      supplier_email: supplierEmail,
      po_number: po,
      order_date: orderDate,
      expected_date: expected,
      notes,
      items: valid.map(({ id, description, qty, unit }) => ({ id, description, qty, unit })),
    };
    setError(null);
    start(async () => {
      const r = await onSave(input);
      // Close inside a transition so it lands together with the refreshed list.
      if (r.ok) start(() => onDone());
      else setError(r.error);
    });
  };

  const unitsId = `${uid}-units`;
  const suppliersId = `${uid}-suppliers`;

  return (
    <div className="mb-4 border-2 border-brand bg-surface p-4">
      <div className="mb-3 font-display text-sm uppercase tracking-[1.5px] text-brand">{isNew ? "New order" : "Edit order"}</div>
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <Label htmlFor={`${uid}-supplier`}>Supplier *</Label>
          <input
            id={`${uid}-supplier`}
            value={supplier}
            onChange={(e) => changeSupplier(e.target.value)}
            placeholder="Andrew Sheret, Wolseley..."
            list={suppliers.length > 0 ? suppliersId : undefined}
            autoComplete="off"
            className="input"
          />
          {suppliers.length > 0 && (
            <datalist id={suppliersId}>
              {suppliers.map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={`${uid}-email`}>Supplier email</Label>
          <input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            placeholder="orders@..."
            aria-invalid={emailBad}
            className="input"
            style={emailBad ? { borderColor: "var(--color-danger)" } : undefined}
          />
          {emailBad && <div className="mt-1 text-[10px] text-danger">That email doesn&rsquo;t look right.</div>}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={`${uid}-po`}>PO #</Label>
          <input id={`${uid}-po`} value={po} onChange={(e) => setPo(e.target.value)} placeholder="Optional" className="input" />
        </div>
        <div>
          <Label htmlFor={`${uid}-ordered`}>Order date</Label>
          <input
            id={`${uid}-ordered`}
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor={`${uid}-expected`}>Expected delivery</Label>
          <input
            id={`${uid}-expected`}
            type="date"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-[10px] tracking-[1.5px] text-dim">
          <span>ITEMS *</span>
          <span className="text-faint">
            {valid.length} valid / {items.length} total
          </span>
        </div>
        <datalist id={unitsId}>
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <div className="grid gap-1.5">
          {items.map((it, idx) => {
            const bad = badQty.has(it.id);
            const enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                nextRow(idx);
              }
            };
            return (
              <div key={it.id} className="border border-line bg-bg p-2">
                <div className="grid grid-cols-[1fr_1fr_2.75rem] gap-1.5 sm:grid-cols-[1fr_5.5rem_5.5rem_2.75rem]">
                  <input
                    ref={(el) => {
                      if (!el) {
                        descInputs.current.delete(it.id);
                        return;
                      }
                      descInputs.current.set(it.id, el);
                      if (focusNext.current === it.id) {
                        focusNext.current = null;
                        el.focus();
                      }
                    }}
                    value={it.description}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    onKeyDown={enter}
                    placeholder='3/4" Type L copper'
                    aria-label={`Item ${idx + 1} description`}
                    enterKeyHint="next"
                    className="input col-span-3 sm:col-span-1"
                  />
                  <input
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                    onKeyDown={enter}
                    placeholder="Qty"
                    inputMode="decimal"
                    aria-label={`Item ${idx + 1} quantity`}
                    aria-invalid={bad}
                    enterKeyHint="next"
                    className="input text-center"
                    style={bad ? { borderColor: "var(--color-danger)" } : undefined}
                  />
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                    onKeyDown={enter}
                    placeholder="Unit"
                    list={unitsId}
                    autoCapitalize="none"
                    autoComplete="off"
                    aria-label={`Item ${idx + 1} unit`}
                    enterKeyHint="next"
                    className="input text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length === 1}
                    aria-label={`Remove item ${idx + 1}`}
                    title="Remove item"
                    className="flex h-11 w-11 items-center justify-center text-danger disabled:cursor-not-allowed disabled:text-faint"
                  >
                    <X size={16} />
                  </button>
                </div>
                {bad && <div className="mt-1 text-[10px] text-danger">Qty must be a number (e.g. 12 or 2.5).</div>}
                {it.received && <div className="mt-1 text-[9px] tracking-wider text-ok">✓ RECEIVED</div>}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 border border-dashed border-brand font-display text-[11px] font-semibold uppercase tracking-[1.5px] text-brand"
        >
          <Plus size={14} /> Add another item
        </button>
      </div>

      <div className="mt-3">
        <Label htmlFor={`${uid}-notes`}>Notes for supplier</Label>
        <textarea
          id={`${uid}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery instructions, specs to clarify, etc."
          rows={3}
          className="input resize-y"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="min-h-11 border border-line px-4 font-display text-[11px] uppercase tracking-[1.5px] text-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="min-h-11 bg-brand px-4 font-display text-[11px] font-bold uppercase tracking-[1.5px] text-bg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
        >
          {pending ? "Saving…" : isNew ? "Create order" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
