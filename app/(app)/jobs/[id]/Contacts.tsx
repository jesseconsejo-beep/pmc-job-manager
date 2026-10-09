"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { addContact, deleteContact, updateContact } from "../actions";
import { ErrorNote, Label } from "@/components/ui";
import { telHref } from "@/lib/jobs";
import type { Contact } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

type ContactRow = Pick<Contact, "id" | "name" | "role" | "phone" | "email">;

/** Site contacts for a job (the contacts table), with tap-to-call / tap-to-email. */
export function Contacts({ jobId, jobName, contacts }: { jobId: string; jobName: string; contacts: ContactRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="mb-5 border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] tracking-[1.5px] text-dim">SITE CONTACTS ({contacts.length})</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex min-h-11 items-center gap-1 border border-line bg-surface-2 px-3 font-display text-[11px] uppercase tracking-wider text-ink hover:border-brand"
          >
            <Plus size={14} /> Add contact
          </button>
        )}
      </div>

      {adding && (
        <ContactForm
          action={addContact.bind(null, jobId)}
          submitLabel="Add contact"
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {contacts.length === 0 && !adding ? (
        <p className="text-xs italic text-faint">No contacts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {contacts.map((c) =>
            editingId === c.id ? (
              <ContactForm
                key={c.id}
                contact={c}
                action={updateContact.bind(null, jobId, c.id)}
                submitLabel="Save"
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ContactCard
                key={c.id}
                jobId={jobId}
                jobName={jobName}
                contact={c}
                onEdit={() => {
                  setEditingId(c.id);
                  setAdding(false);
                }}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function ContactCard({
  jobId,
  jobName,
  contact: c,
  onEdit,
}: {
  jobId: string;
  jobName: string;
  contact: ContactRow;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    if (!window.confirm(`Remove ${c.name} from this job's contacts?`)) return;
    startTransition(async () => {
      const r = await deleteContact(jobId, c.id);
      if (!r.ok) setError(r.error);
    });
  };

  // vCard so a contact can be saved straight into iPhone Contacts (Phase 1 SAVE button).
  const saveVCard = () => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${c.name}`,
      `N:${c.name};;;;`,
      c.role && `TITLE:${c.role}`,
      `ORG:${jobName}`,
      c.phone && `TEL;TYPE=CELL:${c.phone}`,
      c.email && `EMAIL:${c.email}`,
      `NOTE:Site contact for ${jobName}`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/vcard" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.name}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`border border-line bg-bg p-3 ${pending ? "opacity-50" : ""}`}>
      <ErrorNote message={error} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="break-words text-[13px] font-semibold">{c.name}</div>
          {c.role && <div className="mb-1.5 text-[10px] tracking-wider text-brand">{c.role}</div>}
          {c.phone && (
            <a href={telHref(c.phone)} className="flex min-h-9 items-center gap-1.5 text-xs text-ink">
              <Phone size={12} className="shrink-0 text-steel" />
              <span className="border-b border-dashed border-steel-dark">{c.phone}</span>
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex min-h-9 items-center gap-1.5 text-[11px] text-ink">
              <Mail size={12} className="shrink-0 text-steel" />
              <span className="break-all border-b border-dashed border-steel-dark">{c.email}</span>
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={saveVCard}
            title="Save to Contacts"
            className="flex h-9 items-center justify-center gap-1 bg-steel px-2 font-display text-[9px] font-bold tracking-wider text-bg"
          >
            <User size={11} /> SAVE
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${c.name}`}
              className="flex h-9 w-9 items-center justify-center border border-line-2 text-dim hover:border-brand"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Remove ${c.name}`}
              className="flex h-9 w-9 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactForm({
  contact,
  action,
  submitLabel,
  onDone,
  onCancel,
}: {
  contact?: ContactRow;
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    const r = await action(prev, form);
    if (r.ok) onDone();
    return r;
  }, null);
  const idp = contact?.id ?? "new";

  return (
    <form action={formAction} className="mb-2 border border-line bg-bg p-3 sm:col-span-2">
      <ErrorNote message={state && !state.ok ? state.error : null} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`name-${idp}`}>Name</Label>
          <input id={`name-${idp}`} name="name" required defaultValue={contact?.name ?? ""} className="input" />
        </div>
        <div>
          <Label htmlFor={`role-${idp}`}>Role</Label>
          <input
            id={`role-${idp}`}
            name="role"
            defaultValue={contact?.role ?? ""}
            placeholder="Super, PM, GC..."
            className="input"
          />
        </div>
        <div>
          <Label htmlFor={`phone-${idp}`}>Phone</Label>
          <input id={`phone-${idp}`} name="phone" type="tel" defaultValue={contact?.phone ?? ""} className="input" />
        </div>
        <div>
          <Label htmlFor={`email-${idp}`}>Email</Label>
          <input id={`email-${idp}`} name="email" type="email" defaultValue={contact?.email ?? ""} className="input" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
