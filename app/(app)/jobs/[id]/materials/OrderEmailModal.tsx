"use client";

import { useEffect, useState } from "react";
import { Check, Mail, Send, X } from "lucide-react";
import { Label } from "@/components/ui";
import {
  composeOrderEmail,
  itemsOf,
  mailtoHref,
  orderStatus,
  parseRecipients,
  type OrderJob,
  type OrderSender,
} from "@/lib/materials";
import type { MaterialOrder } from "@/lib/types";

type CopyKey = "all" | "body";

/** Write text to the clipboard; falls back to execCommand where the Clipboard API is unavailable. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let done = false;
    try {
      done = document.execCommand("copy");
    } catch {
      done = false;
    }
    document.body.removeChild(ta);
    return done;
  }
}

/** The ready-to-send supplier email for one order (Phase 1 OrderEmailModal). */
export function OrderEmailModal({
  order,
  job,
  sender,
  onClose,
  onSent,
}: {
  order: MaterialOrder;
  job: OrderJob;
  sender: OrderSender;
  onClose: () => void;
  /** Stamp last_sent_at; `to` is the validated recipient list. */
  onSent: (to: string) => void;
}) {
  const [to, setTo] = useState(order.supplier_email ?? "");
  const partial = orderStatus(order) === "partial";
  const [outstandingOnly, setOutstandingOnly] = useState(partial);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const all = itemsOf(order);
  const outstanding = all.filter((i) => !i.received);
  const items = partial && outstandingOnly ? outstanding : all;

  const { subject, body } = composeOrderEmail({
    supplier: order.supplier,
    poNumber: order.po_number,
    expectedDate: order.expected_date,
    notes: order.notes,
    items,
    jobName: job.name,
    jobNumber: job.number,
    deliverTo: job.location,
    senderName: sender.name,
    companyName: sender.company,
    senderEmail: sender.email,
  });
  const fullText = `Subject: ${subject}\n\n${body}`;

  const recipients = parseRecipients(to);
  const toBad = recipients.invalid.length > 0;
  const sendTo = recipients.valid.join(", ");
  const canSend = !toBad && items.length > 0;
  const href = mailtoHref(recipients.valid, subject, body);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the page behind the sheet from scrolling on iPhone.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const copy = async (text: string, key: CopyKey) => {
    setCopyError(null);
    if (!(await copyText(text))) {
      setCopyError("Could not copy. Select the message and copy it by hand.");
      return;
    }
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const supplierName = order.supplier?.trim() || "supplier";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-email-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-[640px] flex-col border-2 border-steel bg-surface">
        <div className="h-1 shrink-0 bg-steel" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id="order-email-title" className="font-display text-lg uppercase tracking-[1.5px]">
              Email order
            </h2>
            <div className="mt-0.5 truncate text-[10px] uppercase tracking-[1px] text-dim">
              To {supplierName} · {items.length} {items.length === 1 ? "item" : "items"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Label htmlFor="order-email-to">To (supplier email)</Label>
          <input
            id="order-email-to"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="orders@supplier.com"
            aria-invalid={toBad}
            className="input"
            style={toBad ? { borderColor: "var(--color-danger)" } : undefined}
          />
          {toBad ? (
            <div className="mt-1 text-[10px] text-danger">Check: {recipients.invalid.join(", ")}</div>
          ) : (
            !sendTo && <div className="mt-1 text-[10px] text-faint">No address yet. You can add it in Mail.</div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">From</div>
              <div className="break-all text-[13px]">{sender.email ?? "—"}</div>
              <div className="mt-0.5 text-[10px] text-faint">Signed with this address; Mail sends from your own account.</div>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">Deliver to</div>
              {job.location ? (
                <div className="break-words text-[13px]">{job.location}</div>
              ) : (
                <div className="text-[11px] text-warn">No job location set. Add it on the job page to include the delivery address.</div>
              )}
            </div>
          </div>

          {partial && (
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-xs">
              <input
                type="checkbox"
                checked={outstandingOnly}
                onChange={(e) => setOutstandingOnly(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              Only items not yet received ({outstanding.length} of {all.length})
            </label>
          )}

          <div className="mb-1 mt-3 text-[10px] uppercase tracking-[1.5px] text-dim">Subject</div>
          <div className="mb-3 break-words border border-line bg-bg p-2.5 text-[13px]">{subject}</div>

          <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">Message</div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words border border-line bg-bg p-3 font-mono text-xs leading-relaxed">
            {body}
          </pre>
          {copyError && (
            <div role="alert" className="mt-2 text-[11px] text-danger">
              {copyError}
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-wrap gap-1.5 border-t border-line p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <a
            href={canSend ? href : undefined}
            aria-disabled={!canSend}
            onClick={(e) => {
              if (!canSend) {
                e.preventDefault();
                return;
              }
              onSent(sendTo);
              // Close after the browser has followed the mailto: link (an unmounted link cannot navigate).
              window.setTimeout(onClose, 0);
            }}
            className={`flex min-h-11 w-full items-center justify-center gap-1.5 px-4 font-display text-[11px] font-bold uppercase tracking-[1.5px] sm:order-last sm:ml-auto sm:w-auto ${
              canSend ? "bg-brand text-bg" : "cursor-not-allowed bg-surface-2 text-faint"
            }`}
          >
            <Mail size={14} /> Open in Mail
          </a>
          <button
            type="button"
            onClick={() => copy(fullText, "all")}
            className={`flex min-h-11 items-center gap-1.5 border px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
              copied === "all" ? "border-ok bg-ok text-bg" : "border-line bg-surface-2 text-ink"
            }`}
          >
            {copied === "all" ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              "Copy all"
            )}
          </button>
          <button
            type="button"
            onClick={() => copy(body, "body")}
            className={`flex min-h-11 items-center gap-1.5 border px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
              copied === "body" ? "border-ok bg-ok text-bg" : "border-line bg-surface-2 text-ink"
            }`}
          >
            {copied === "body" ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              "Copy body"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canSend) return;
              onSent(sendTo);
              onClose();
            }}
            disabled={!canSend}
            title="Sent it another way? Stamp it as sent."
            className="flex min-h-11 items-center gap-1.5 border border-line px-3 font-display text-[11px] uppercase tracking-[1.5px] text-dim hover:border-steel hover:text-ink disabled:opacity-40"
          >
            <Send size={13} /> Mark sent
          </button>
        </div>
      </div>
    </div>
  );
}
