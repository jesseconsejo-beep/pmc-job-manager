"use client";

import { useActionState, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { ErrorNote, Label } from "@/components/ui";
import { roleOptionLabel } from "@/lib/roles";
import type { RoleCatalogRow } from "@/lib/types";
import { cancelInvite, inviteMember, resendInvite, type InviteState } from "./actions";

const initial: InviteState = { ok: false, error: null, sentTo: null, values: null };

export function InviteForm({ catalog, defaultRole }: { catalog: RoleCatalogRow[]; defaultRole: string }) {
  const [state, action, pending] = useActionState(inviteMember, initial);
  const v = state.values;
  // Controlled: React's post-submit form reset would otherwise drop the pick.
  const [role, setRole] = useState(defaultRole);

  return (
    <section className="border-2 border-brand bg-surface p-4">
      <h2 className="mb-1 font-display text-sm font-semibold uppercase tracking-[1.5px]">Invite someone</h2>
      <p className="mb-3 text-[11px] leading-relaxed text-dim">
        They get an email link to choose a password, and land with the role you pick.
      </p>
      <ErrorNote message={state.error} />
      {state.ok && state.sentTo && (
        <div role="status" className="mb-3 break-all border border-ok bg-bg px-3 py-2 text-xs text-ok">
          Invite sent to {state.sentTo}.
        </div>
      )}
      <form action={action} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="invite-email">Email</Label>
          <input
            id="invite-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            required
            defaultValue={v?.email ?? ""}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor="invite-name">Name</Label>
          <input
            id="invite-name"
            name="name"
            required
            maxLength={120}
            autoComplete="off"
            defaultValue={v?.name ?? ""}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input"
          >
            {catalog.map((r) => (
              <option key={r.key} value={r.key}>
                {roleOptionLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="clip-cta flex min-h-12 w-full items-center justify-center gap-2 bg-brand px-5 font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60 sm:w-auto"
          >
            <Send size={14} /> {pending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>
    </section>
  );
}

type PendingInvite = { id: string; email: string; role: string; invitedBy: string; expiresAt: string };

export function PendingInvites({
  invites,
  catalog,
  error,
}: {
  invites: PendingInvite[];
  catalog: RoleCatalogRow[];
  error: string | null;
}) {
  return (
    <section className="border border-line bg-surface p-4">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[1.5px]">
        Pending invites <span className="text-[11px] text-dim">({invites.length})</span>
      </h2>
      <ErrorNote message={error ? `Could not load invites: ${error}` : null} />
      {invites.length === 0 ? (
        <p className="text-xs italic text-faint">
          None. An invite turns into an active crew member as soon as the email is sent, so this list only holds invites
          that are still waiting.
        </p>
      ) : (
        <div className="grid gap-2">
          {invites.map((i) => (
            <InviteRow key={i.id} invite={i} roleLabel={catalog.find((r) => r.key === i.role)?.label ?? i.role} />
          ))}
        </div>
      )}
    </section>
  );
}

function InviteRow({ invite: i, roleLabel }: { invite: PendingInvite; roleLabel: string }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const expired = new Date(i.expiresAt).getTime() < Date.now();
  const expires = new Date(i.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    startTransition(async () => {
      const r = await fn();
      setNote(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Something went wrong." });
    });

  return (
    <div className={`border border-line bg-bg p-3 ${pending ? "opacity-60" : ""}`}>
      <div className="break-all text-[13px] font-semibold">{i.email}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-dim">
        <span className="text-brand">{roleLabel}</span> · invited by {i.invitedBy} ·{" "}
        <span className={expired ? "text-danger" : undefined}>
          {expired ? "expired" : "expires"} {expires}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => resendInvite(i.id), "Invite sent again.")}
          className="min-h-10 border border-line-2 px-3 font-display text-[10px] font-bold uppercase tracking-wider text-ink hover:border-brand hover:text-brand"
        >
          Resend
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Cancel the invite for ${i.email}?`)) run(() => cancelInvite(i.id), "Invite cancelled.");
          }}
          className="min-h-10 border border-line-2 px-3 font-display text-[10px] uppercase tracking-wider text-faint hover:border-danger hover:text-danger"
        >
          Cancel
        </button>
      </div>
      {note && (
        <div className={`mt-2 text-xs ${note.ok ? "text-ok" : "text-danger"}`} role={note.ok ? "status" : "alert"}>
          {note.text}
        </div>
      )}
    </div>
  );
}
