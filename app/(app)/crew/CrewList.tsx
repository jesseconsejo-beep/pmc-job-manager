"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, Trash2, User } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { telHref } from "@/lib/jobs";
import { roleOptionLabel, TIER_LABEL, tierOf } from "@/lib/roles";
import type { Profile, RoleCatalogRow } from "@/lib/types";
import { downloadVCard } from "@/lib/vcard";
import { changeRole, deleteAccount, setActive } from "./actions";

type Person = Pick<Profile, "id" | "email" | "name" | "role" | "phone" | "active">;

export function CrewList({
  people,
  catalog,
  meId,
  canDelete,
  companyName,
}: {
  people: Person[];
  catalog: RoleCatalogRow[];
  meId: string;
  canDelete: boolean;
  companyName: string;
}) {
  const active = people.filter((p) => p.active);
  const inactive = people.filter((p) => !p.active);
  const row = (p: Person) => (
    <CrewRow key={p.id} person={p} catalog={catalog} isMe={p.id === meId} canDelete={canDelete} companyName={companyName} />
  );

  return (
    <>
      {active.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-xs text-faint">No active crew yet. Invite someone below.</div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">{active.map(row)}</div>
      )}
      {inactive.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-xs uppercase tracking-[1.5px] text-dim">Inactive ({inactive.length})</h2>
          <div className="grid grid-cols-1 gap-1.5">{inactive.map(row)}</div>
        </section>
      )}
    </>
  );
}

function CrewRow({
  person: p,
  catalog,
  isMe,
  canDelete,
  companyName,
}: {
  person: Person;
  catalog: RoleCatalogRow[];
  isMe: boolean;
  canDelete: boolean;
  companyName: string;
}) {
  const [role, setRole] = useState(p.role);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const name = p.name?.trim() || p.email.split("@")[0] || p.email;
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const roleRow = catalog.find((r) => r.key === p.role);
  const roleLabel = roleRow?.label ?? p.role;
  const tier = roleRow ? TIER_LABEL[tierOf(roleRow)] : null;

  const onRole = (next: string) => {
    if (next === p.role) return;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const r = await changeRole(p.id, next);
      if (!r.ok) {
        setError(r.error);
        setRole(p.role);
      }
    });
  };

  const onToggleActive = () => {
    setError(null);
    startTransition(async () => {
      const r = await setActive(p.id, !p.active);
      if (!r.ok) setError(r.error);
    });
  };

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      const r = await deleteAccount(p.id, typed);
      if (!r.ok) setError(r.error);
      else setConfirming(false);
    });
  };

  return (
    <div
      className={`border border-line bg-surface p-3 ${pending ? "opacity-60" : ""}`}
      style={{ borderLeft: `4px solid ${p.active ? "var(--color-primary)" : "var(--color-faint)"}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center font-display text-sm font-bold ${
            p.active ? "bg-brand text-bg" : "bg-surface-2 text-dim"
          }`}
          aria-hidden
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words text-sm font-semibold">{name}</span>
            {isMe && <span className="text-[10px] uppercase tracking-wider text-dim">(you)</span>}
            <span
              className={`border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${
                p.active ? "border-ok text-ok" : "border-line-2 text-faint"
              }`}
            >
              {p.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-brand">
            {roleLabel}
            {tier && tier.toLowerCase() !== roleLabel.toLowerCase() && <span className="text-dim"> · {tier}</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4">
            {p.phone && (
              <a href={telHref(p.phone)} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-ink">
                <Phone size={11} className="shrink-0 text-steel" />
                <span className="border-b border-dashed border-steel-dark">{p.phone}</span>
              </a>
            )}
            <a href={`mailto:${p.email}`} className="inline-flex min-h-9 min-w-0 items-center gap-1.5 text-[11px] text-ink">
              <Mail size={11} className="shrink-0 text-steel" />
              <span className="break-all border-b border-dashed border-steel-dark">{p.email}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:pl-[52px]">
        <label className="sr-only" htmlFor={`role-${p.id}`}>
          Role for {name}
        </label>
        <select
          id={`role-${p.id}`}
          value={role}
          onChange={(e) => onRole(e.target.value)}
          disabled={pending}
          className="input min-h-10! w-full py-1.5! sm:w-64!"
        >
          {!catalog.some((r) => r.key === role) && <option value={role}>{role}</option>}
          {catalog.map((r) => (
            <option key={r.key} value={r.key}>
              {roleOptionLabel(r)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={pending}
          className={`min-h-10 border px-3 font-display text-[10px] font-bold uppercase tracking-wider ${
            p.active ? "border-line-2 text-dim hover:border-warn hover:text-warn" : "border-ok text-ok"
          }`}
        >
          {p.active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadVCard({ name, title: roleLabel, org: companyName, phone: p.phone, email: p.email })
          }
          title="Save to Contacts"
          className="flex min-h-10 items-center gap-1 bg-steel px-3 font-display text-[10px] font-bold tracking-wider text-bg"
        >
          <User size={11} /> SAVE
        </button>
        {canDelete && !isMe && (
          <button
            type="button"
            onClick={() => {
              setConfirming((c) => !c);
              setTyped("");
              setError(null);
            }}
            aria-label={`Delete ${name}'s account`}
            title="Delete account"
            className="flex h-10 w-10 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-3 border border-danger bg-bg p-3 sm:ml-[52px]">
          <p className="text-xs leading-relaxed text-ink">
            Permanently delete this login? Only for someone with no timesheets or activity; otherwise deactivate.
            Type <span className="break-all font-semibold">{p.email}</span> to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Type their email to confirm"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="input mt-2"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending || typed.trim().toLowerCase() !== p.email.toLowerCase()}
              className="min-h-10 bg-danger px-4 font-display text-[11px] font-bold uppercase tracking-wider text-bg disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-10 border border-line px-4 font-display text-[11px] uppercase tracking-wider text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 sm:pl-[52px]">
          <ErrorNote message={error} />
        </div>
      )}
    </div>
  );
}
