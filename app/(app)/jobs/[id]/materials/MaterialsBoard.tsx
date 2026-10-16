"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, Check, CheckCheck, ChevronRight, Mail, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { createOrder, deleteOrder, markOrderSent, setItemsReceived, updateOrder } from "./actions";
import { OrderEditor, type SupplierHint } from "./OrderEditor";
import { OrderEmailModal } from "./OrderEmailModal";
import { ErrorNote, SectionHeader } from "@/components/ui";
import { formatDate, formatTimestamp } from "@/lib/dates";
import {
  ORDER_STATUSES,
  STATUS_COLOR,
  STATUS_LABEL,
  compareOrders,
  expectedUrgency,
  isOverdue,
  itemsOf,
  orderBadge,
  orderStatus,
  qtyUnit,
  type OrderJob,
  type OrderSender,
  type OrderStatus,
} from "@/lib/materials";
import type { MaterialItem, MaterialOrder } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op =
  | { type: "update"; id: string; patch: Partial<MaterialOrder> }
  | { type: "delete"; id: string }
  | { type: "receive"; id: string; itemIds: string[] | null; received: boolean; at: string };

function reducer(orders: MaterialOrder[], op: Op): MaterialOrder[] {
  switch (op.type) {
    case "update":
      return orders.map((o) => (o.id === op.id ? { ...o, ...op.patch } : o));
    case "delete":
      return orders.filter((o) => o.id !== op.id);
    case "receive":
      return orders.map((o) => {
        if (o.id !== op.id) return o;
        const wanted = op.itemIds ? new Set(op.itemIds) : null;
        const items = itemsOf(o).map((i) =>
          (wanted && !wanted.has(i.id)) || i.received === op.received
            ? i
            : { ...i, received: op.received, received_at: op.received ? op.at : null },
        );
        return { ...o, items };
      });
  }
}

type Run = (op: Op, call: () => Promise<ActionResult>) => void;

const nowIso = () => new Date().toISOString();

function shortDate(iso: string): string {
  return formatDate(iso, { month: "short", day: "numeric" });
}

/** Suppliers already used on this job, newest first, for the editor's suggestions. */
function supplierHints(orders: MaterialOrder[]): SupplierHint[] {
  const seen = new Map<string, SupplierHint>();
  for (const o of [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const name = o.supplier?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = seen.get(key);
    if (!prev) seen.set(key, { name, email: o.supplier_email?.trim() || null });
    else if (!prev.email && o.supplier_email?.trim()) prev.email = o.supplier_email.trim();
  }
  return [...seen.values()];
}

// ---------- board (Phase 1 MaterialsList) ----------

type Filter = "open" | "complete" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "complete", label: "Complete" },
  { id: "all", label: "All" },
];

export function MaterialsBoard({
  jobId,
  job,
  orders,
  today,
  timezone,
  sender,
}: {
  jobId: string;
  job: OrderJob;
  orders: MaterialOrder[];
  today: string;
  timezone: string;
  sender: OrderSender;
}) {
  const [list, apply] = useOptimistic(orders, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);

  const run: Run = (op, call) => {
    setError(null);
    startTransition(async () => {
      apply(op);
      const r = await call();
      if (!r.ok) setError(r.error);
    });
  };

  const statusOf = new Map(list.map((o) => [o.id, orderStatus(o)]));
  const counts: Record<Filter, number> = {
    open: list.filter((o) => statusOf.get(o.id) !== "complete").length,
    complete: list.filter((o) => statusOf.get(o.id) === "complete").length,
    all: list.length,
  };
  const overdue = list.filter((o) => isOverdue(o, today)).length;

  const groups = ORDER_STATUSES.filter((s) =>
    filter === "all" ? true : filter === "open" ? s !== "complete" : s === "complete",
  )
    .map((status) => ({ status, orders: list.filter((o) => statusOf.get(o.id) === status).sort(compareOrders) }))
    .filter((g) => g.orders.length > 0);

  const suppliers = supplierHints(list);
  const emailing = emailId ? (list.find((o) => o.id === emailId) ?? null) : null;

  const remove = (o: MaterialOrder) => {
    if (!window.confirm(`Delete order to ${o.supplier?.trim() || "supplier"}?`)) return;
    if (editingId === o.id) setEditingId(null);
    run({ type: "delete", id: o.id }, () => deleteOrder(jobId, o.id));
  };

  const toggleItem = (o: MaterialOrder, item: MaterialItem) =>
    run({ type: "receive", id: o.id, itemIds: [item.id], received: !item.received, at: nowIso() }, () =>
      setItemsReceived(jobId, o.id, [item.id], !item.received),
    );

  const receiveAll = (o: MaterialOrder) => {
    const left = itemsOf(o).filter((i) => !i.received).length;
    if (!window.confirm(`Mark all ${left} remaining ${left === 1 ? "item" : "items"} received?`)) return;
    run({ type: "receive", id: o.id, itemIds: null, received: true, at: nowIso() }, () =>
      setItemsReceived(jobId, o.id, null, true),
    );
  };

  const markSent = (o: MaterialOrder, to: string) =>
    run({ type: "update", id: o.id, patch: { last_sent_at: nowIso() } }, () => markOrderSent(jobId, o.id, to));

  return (
    <>
      <div className="mb-4 flex border-b border-line">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`min-h-11 border-b-2 px-4 font-display text-xs font-semibold uppercase tracking-[1.5px] ${
                active ? "border-brand text-brand" : "border-transparent text-dim"
              }`}
            >
              {f.label} <span className="text-[10px] opacity-60">({counts[f.id]})</span>
            </button>
          );
        })}
      </div>

      {overdue > 0 && (
        <div className="mb-3 flex items-center gap-2 border border-danger bg-surface px-3 py-2 text-[11px] font-bold tracking-wider text-danger">
          <AlertTriangle size={14} className="shrink-0" />
          {overdue} {overdue === 1 ? "ORDER" : "ORDERS"} OVERDUE
        </div>
      )}

      {showNew ? (
        <OrderEditor
          today={today}
          suppliers={suppliers}
          onSave={(input) => createOrder(jobId, input)}
          onDone={() => {
            setShowNew(false);
            setFilter((f) => (f === "complete" ? "open" : f));
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
          }}
          className="mb-4 flex min-h-11 items-center gap-1.5 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
        >
          <Plus size={16} strokeWidth={3} /> New order
        </button>
      )}

      <ErrorNote message={error} />

      {groups.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <Package size={32} className="mx-auto mb-2" />
          <div className="text-xs">No {filter === "all" ? "" : filter} orders</div>
        </div>
      ) : (
        <div className="grid gap-5">
          {groups.map((g) => (
            <section key={g.status}>
              <SectionHeader title={STATUS_LABEL[g.status]} count={g.orders.length} color={STATUS_COLOR[g.status]} />
              <div className="grid gap-2.5">
                {g.orders.map((o) =>
                  editingId === o.id ? (
                    <OrderEditor
                      key={o.id}
                      order={o}
                      today={today}
                      suppliers={suppliers}
                      onSave={(input) => updateOrder(jobId, o.id, input)}
                      onDone={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <OrderCard
                      key={o.id}
                      order={o}
                      status={g.status}
                      today={today}
                      timezone={timezone}
                      onEdit={() => {
                        setEditingId(o.id);
                        setShowNew(false);
                      }}
                      onDelete={() => remove(o)}
                      onEmail={() => setEmailId(o.id)}
                      onToggleItem={(item) => toggleItem(o, item)}
                      onReceiveAll={() => receiveAll(o)}
                    />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {emailing && (
        <OrderEmailModal
          order={emailing}
          job={job}
          sender={sender}
          onClose={() => setEmailId(null)}
          onSent={(to) => markSent(emailing, to)}
        />
      )}
    </>
  );
}

// ---------- one order (Phase 1 OrderCard) ----------

function OrderCard({
  order,
  status,
  today,
  timezone,
  onEdit,
  onDelete,
  onEmail,
  onToggleItem,
  onReceiveAll,
}: {
  order: MaterialOrder;
  status: OrderStatus;
  today: string;
  timezone: string;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  onToggleItem: (item: MaterialItem) => void;
  onReceiveAll: () => void;
}) {
  // Outstanding orders start open; finished ones start folded to keep the list short.
  const [expanded, setExpanded] = useState(status !== "complete");
  const items = itemsOf(order);
  const left = items.filter((i) => !i.received).length;
  const badge = orderBadge(order, today);
  const urgency = status === "complete" ? null : expectedUrgency(order.expected_date, today);

  return (
    <div className="border border-line bg-surface" style={{ borderLeft: `4px solid ${badge.color}` }}>
      <div className={`flex items-start gap-2 p-2 pr-3 ${expanded ? "border-b border-line" : ""}`}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-1.5 py-1 text-left"
        >
          <ChevronRight
            size={16}
            className={`mt-0.5 shrink-0 text-dim transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="min-w-0">
            <span className="block break-words font-display text-base font-bold tracking-[0.5px]">
              {order.supplier?.trim() || "Unnamed supplier"}
            </span>
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tracking-[0.5px] text-dim">
              <span>
                {items.length} {items.length === 1 ? "ITEM" : "ITEMS"}
              </span>
              {order.po_number && <span>PO #{order.po_number}</span>}
              {order.order_date && <span>Ordered {shortDate(order.order_date)}</span>}
              {order.expected_date && (
                <span style={urgency?.overdue ? { color: "var(--color-danger)", fontWeight: 700 } : undefined}>
                  Exp {shortDate(order.expected_date)}
                  {status === "partial" && urgency ? ` · ${urgency.label}` : ""}
                </span>
              )}
            </span>
          </span>
        </button>
        <span
          className="mt-1.5 shrink-0 whitespace-nowrap border px-2 py-1 text-[9px] font-bold tracking-[1px]"
          style={{ color: badge.color, borderColor: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {expanded && (
        <div className="p-3">
          {items.length === 0 ? (
            <div className="p-2 text-[11px] italic text-faint">No items in this order yet — tap edit to add</div>
          ) : (
            <div className="grid gap-1">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} timezone={timezone} onToggle={() => onToggleItem(item)} />
              ))}
            </div>
          )}

          {order.notes && (
            <div className="mt-2.5 whitespace-pre-wrap break-words border-l-2 border-line-2 bg-bg p-2 text-[11px] italic text-dim">
              &ldquo;{order.notes}&rdquo;
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
            <button
              type="button"
              onClick={onEmail}
              className="flex min-h-11 items-center gap-1.5 bg-steel px-3 font-display text-[11px] font-bold uppercase tracking-[1.5px] text-bg"
            >
              <Mail size={14} /> Email order
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex min-h-11 items-center gap-1.5 border border-line px-3 font-display text-[11px] uppercase tracking-[1.5px] text-ink hover:border-brand"
            >
              <Pencil size={14} /> Edit
            </button>
            {left > 0 && items.length > 1 && (
              <button
                type="button"
                onClick={onReceiveAll}
                className="flex min-h-11 items-center gap-1.5 border border-line px-3 font-display text-[11px] uppercase tracking-[1.5px] text-ink hover:border-ok hover:text-ok"
              >
                <CheckCheck size={14} /> Receive all
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete order"
              title="Delete order"
              className="ml-auto flex h-11 w-11 items-center justify-center border border-line text-faint hover:border-danger hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {order.last_sent_at && (
            <div className="mt-2 text-[9px] tracking-[0.5px] text-faint">
              ✓ Last emailed {formatTimestamp(order.last_sent_at, timezone, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, timezone, onToggle }: { item: MaterialItem; timezone: string; onToggle: () => void }) {
  const amount = qtyUnit(item);
  return (
    <div
      className={`flex items-center gap-1 pr-2 ${item.received ? "bg-bg" : ""}`}
      style={{ borderLeft: `2px solid ${item.received ? "var(--color-ok)" : "var(--color-line-2)"}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={item.received}
        aria-label={`Received: ${item.description}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center border-[1.5px] ${
            item.received ? "border-ok bg-ok" : "border-line-2 bg-transparent"
          }`}
        >
          {item.received && <Check size={12} strokeWidth={3} className="text-bg" />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-1.5">
        <div className={`break-words text-[13px] ${item.received ? "line-through opacity-55" : ""}`}>
          {amount && <span className="mr-1.5 font-semibold text-brand">{amount}</span>}
          {item.description}
        </div>
        {item.received && item.received_at && (
          <div className="mt-0.5 text-[9px] tracking-[0.5px] text-ok">
            Rec&rsquo;d {formatTimestamp(item.received_at, timezone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
