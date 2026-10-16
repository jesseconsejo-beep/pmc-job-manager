"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Archive, ArchiveRestore, ClipboardList, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { addPost, deletePost, setArchived, setPinned, updatePost } from "./actions";
import { ErrorNote, Label } from "@/components/ui";
import { formatTimestamp, relativeTime } from "@/lib/dates";
import type { BulletinPost } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op =
  | { type: "add"; post: BulletinPost }
  | { type: "update"; id: string; patch: Partial<BulletinPost> }
  | { type: "delete"; id: string };

function reducer(posts: BulletinPost[], op: Op): BulletinPost[] {
  switch (op.type) {
    case "add":
      return [op.post, ...posts];
    case "update":
      return posts.map((p) => (p.id === op.id ? { ...p, ...op.patch } : p));
    case "delete":
      return posts.filter((p) => p.id !== op.id);
  }
}

type Run = (op: Op | null, call: () => Promise<ActionResult>, onFail?: () => void) => void;

const isTemp = (id: string) => id.startsWith("temp-");

type Filter = "active" | "archived" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

type Draft = { title: string; body: string; pinned: boolean };
const BLANK: Draft = { title: "", body: "", pinned: false };

// ---------- board ----------

export function BulletinBoard({
  posts,
  userId,
  authorName,
  admin,
  timezone,
  now,
}: {
  posts: BulletinPost[];
  userId: string;
  /** The viewer's display name: every new post is signed with it. */
  authorName: string;
  admin: boolean;
  timezone: string;
  /** Server render time, so relative times match between server and browser. */
  now: string;
}) {
  const [items, apply] = useOptimistic(posts, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);

  const run: Run = (op, call, onFail) => {
    setError(null);
    startTransition(async () => {
      if (op) apply(op);
      const r = await call();
      if (!r.ok) {
        setError(r.error);
        onFail?.();
      }
    });
  };

  const counts: Record<Filter, number> = {
    active: items.filter((p) => !p.archived).length,
    archived: items.filter((p) => p.archived).length,
    all: items.length,
  };

  // Pinned first, then newest first.
  const visible = items
    .filter((p) => (filter === "active" ? !p.archived : filter === "archived" ? p.archived : true))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.created_at.localeCompare(a.created_at)));

  const submitNew = (d: Draft) => {
    setDraft(null);
    const post: BulletinPost = {
      id: `temp-${Date.now()}`,
      title: d.title.trim(),
      body: d.body.trim() || null,
      author_id: userId,
      author_name: authorName,
      pinned: admin && d.pinned,
      archived: false,
      created_at: new Date().toISOString(),
    };
    if (filter === "archived") setFilter("active");
    run({ type: "add", post }, () => addPost({ title: d.title, body: d.body, pinned: admin && d.pinned }), () => setDraft(d));
  };

  const submitEdit = (p: BulletinPost, d: Draft) => {
    setEditing(null);
    run(
      { type: "update", id: p.id, patch: { title: d.title.trim(), body: d.body.trim() || null } },
      () => updatePost(p.id, { title: d.title, body: d.body }),
      () => setEditing({ id: p.id, draft: d }),
    );
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ClipboardList size={28} className="shrink-0 text-brand" />
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold uppercase tracking-[1.5px]">Bulletin board</h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-dim">
              Post reminders · {counts.active} active · {counts.archived} archived
            </p>
          </div>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDraft(BLANK);
            }}
            className="flex min-h-11 items-center gap-1.5 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
          >
            <Plus size={14} strokeWidth={3} /> New post
          </button>
        )}
      </div>

      <div className="mb-4 border border-steel bg-surface p-3 text-xs leading-relaxed" style={{ borderLeftWidth: 4 }}>
        Pinned posts appear at the top of everyone&apos;s Today view.
        {admin ? " Pin the ones the whole crew must see." : " An admin pins the ones the whole crew must see."}
      </div>

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

      <ErrorNote message={error} />

      {draft && (
        <div className="mb-4 border-2 border-brand bg-surface p-4">
          <div className="mb-3 font-display text-sm uppercase tracking-[1.5px] text-brand">New post</div>
          <PostForm
            initial={draft}
            showPin={admin}
            submitLabel="Post"
            footer={
              <span>
                Posting as <span className="text-ink">{authorName}</span>
              </span>
            }
            onSubmit={submitNew}
            onCancel={() => setDraft(null)}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <ClipboardList size={32} className="mx-auto mb-2" />
          <div className="text-xs">No {filter === "all" ? "" : filter} posts</div>
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((p) =>
            editing?.id === p.id ? (
              <div key={p.id} className="border border-line bg-surface p-3.5" style={{ borderLeft: "4px solid var(--color-primary)" }}>
                <PostForm
                  initial={editing.draft}
                  showPin={false}
                  submitLabel="Save"
                  onSubmit={(d) => submitEdit(p, d)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <PostCard
                key={p.id}
                post={p}
                admin={admin}
                canEdit={admin || p.author_id === userId}
                timezone={timezone}
                now={now}
                run={run}
                onEdit={() => {
                  setDraft(null);
                  setEditing({ id: p.id, draft: { title: p.title, body: p.body ?? "", pinned: p.pinned } });
                }}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

// ---------- one post ----------

function PostCard({
  post: p,
  admin,
  canEdit,
  timezone,
  now,
  run,
  onEdit,
}: {
  post: BulletinPost;
  admin: boolean;
  canEdit: boolean;
  timezone: string;
  now: string;
  run: Run;
  onEdit: () => void;
}) {
  const temp = isTemp(p.id);
  const accent = p.pinned ? "var(--color-primary)" : "var(--color-secondary)";

  const togglePin = () =>
    run({ type: "update", id: p.id, patch: { pinned: !p.pinned } }, () => setPinned(p.id, !p.pinned));
  const toggleArchive = () =>
    run({ type: "update", id: p.id, patch: { archived: !p.archived } }, () => setArchived(p.id, !p.archived));
  const remove = () => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    run({ type: "delete", id: p.id }, () => deletePost(p.id));
  };

  return (
    <article
      className={`border bg-surface p-3.5 ${p.archived ? "opacity-55" : ""} ${temp ? "animate-pulse" : ""}`}
      style={{ borderColor: p.pinned ? "var(--color-primary)" : "var(--color-line)", borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-48">
          {(p.pinned || p.archived) && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {p.pinned && (
                <span className="inline-flex items-center gap-1 bg-brand px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-[1.2px] text-bg">
                  <Pin size={10} strokeWidth={3} /> Pinned
                </span>
              )}
              {p.archived && (
                <span className="inline-flex items-center gap-1 border border-line-2 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[1.2px] text-dim">
                  <Archive size={10} /> Archived
                </span>
              )}
            </div>
          )}
          <h2 className="break-words font-display text-base font-bold tracking-[0.5px]">{p.title}</h2>
        </div>
        {(admin || canEdit) && (
          <div className="flex shrink-0 gap-1">
            {admin && (
              <IconButton
                label={p.pinned ? "Unpin" : "Pin to top"}
                onClick={togglePin}
                disabled={temp}
                active={p.pinned}
              >
                {p.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </IconButton>
            )}
            {admin && (
              <IconButton label={p.archived ? "Unarchive" : "Archive"} onClick={toggleArchive} disabled={temp}>
                {p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              </IconButton>
            )}
            {canEdit && (
              <IconButton label="Edit post" onClick={onEdit} disabled={temp}>
                <Pencil size={13} />
              </IconButton>
            )}
            {canEdit && (
              <IconButton label="Delete post" onClick={remove} disabled={temp} danger>
                <Trash2 size={13} />
              </IconButton>
            )}
          </div>
        )}
      </div>
      {p.body && <div className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed">{p.body}</div>}
      <div className="mt-2 flex flex-wrap gap-x-2 text-[10px] tracking-[0.5px] text-faint">
        <span>{relativeTime(p.created_at, timezone, new Date(now))}</span>
        {p.author_name && <span>· {p.author_name}</span>}
        <span>· {formatTimestamp(p.created_at, timezone, { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
    </article>
  );
}

// ---------- add / edit form ----------

function PostForm({
  initial,
  showPin,
  submitLabel,
  footer,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  showPin: boolean;
  submitLabel: string;
  footer?: React.ReactNode;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const ready = d.title.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(d);
      }}
      className="grid gap-3"
    >
      <div>
        <Label htmlFor="post-title">Title *</Label>
        <input
          id="post-title"
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          placeholder="Safety meeting Tuesday 7am, Truck rotation, etc."
          className="input"
          maxLength={200}
        />
      </div>
      <div>
        <Label htmlFor="post-body">Message</Label>
        <textarea
          id="post-body"
          value={d.body}
          onChange={(e) => setD({ ...d, body: e.target.value })}
          placeholder="Details for the crew..."
          rows={4}
          className="input resize-y"
          maxLength={5000}
        />
      </div>
      {showPin && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 border border-line bg-bg px-3">
          <input
            type="checkbox"
            checked={d.pinned}
            onChange={(e) => setD({ ...d, pinned: e.target.checked })}
            className="h-5 w-5 accent-brand"
          />
          <Pin size={14} className="text-brand" />
          <span className="font-display text-xs uppercase tracking-[1px]">Pin to top</span>
        </label>
      )}
      {footer && <div className="text-[11px] text-dim">{footer}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="min-h-11 flex-1 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:bg-surface-2 disabled:text-faint sm:flex-none"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-dim"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- small controls ----------

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`flex h-11 w-11 shrink-0 items-center justify-center border disabled:opacity-40 ${
        active
          ? "border-brand bg-brand text-bg"
          : danger
            ? "border-line-2 text-faint hover:border-danger hover:text-danger"
            : "border-line-2 text-dim hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}
