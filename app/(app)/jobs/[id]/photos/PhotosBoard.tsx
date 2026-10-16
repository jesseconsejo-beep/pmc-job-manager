"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Image as ImageIcon,
  Images,
  LoaderCircle,
  Pencil,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { addPhoto, deletePhoto, updatePhoto, type PhotoPatch } from "./actions";
import { MAX_EDGE, preparePhoto } from "./prepare";
import { ErrorNote, Label } from "@/components/ui";
import { dateInZone, formatDate } from "@/lib/dates";
import { isPolicyError, jobPhotoPath, newFileId, PHOTO_BUCKET, PHOTO_REFUSED, type PhotoView } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";
import { fail, type ActionResult } from "@/lib/validate";

// ---------- optimistic state (edits and deletes; uploads show in the tray) ----------

type Op = { type: "update"; id: string; patch: Partial<PhotoView> } | { type: "delete"; id: string };

function reducer(photos: PhotoView[], op: Op): PhotoView[] {
  switch (op.type) {
    case "update":
      return photos.map((p) => (p.id === op.id ? { ...p, ...op.patch } : p));
    case "delete":
      return photos.filter((p) => p.id !== op.id);
  }
}

type Run = (op: Op, call: () => Promise<ActionResult>) => void;

/** "Oct 16", with the year only when it is not this year. */
function shortDate(iso: string, today: string): string {
  return formatDate(
    iso,
    iso.slice(0, 4) === today.slice(0, 4) ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
}

/** The photo's calendar date, falling back to the day it was uploaded (org timezone). */
function photoDate(p: PhotoView, timezone: string): string {
  return p.date ?? dateInZone(p.taken_at, timezone);
}

// ---------- board ----------

export function PhotosBoard({
  jobId,
  photos,
  viewerId,
  admin,
  assigned,
  today,
  timezone,
  signError,
}: {
  jobId: string;
  photos: PhotoView[];
  viewerId: string;
  admin: boolean;
  assigned: boolean;
  today: string;
  timezone: string;
  signError: string | null;
}) {
  const [items, apply] = useOptimistic(photos, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const run: Run = (op, call) => {
    setError(null);
    startTransition(async () => {
      apply(op);
      const r = await call();
      if (!r.ok) setError(r.error);
    });
  };

  // RLS has the final say; this only decides which buttons to show.
  const canChange = (p: PhotoView) => admin || p.taken_by === viewerId;

  const remove = (p: PhotoView) => {
    if (!window.confirm(`Delete ${p.caption ? `"${p.caption}"` : "this photo"}? This cannot be undone.`)) return;
    // Close the viewer first so a failure shows on the page instead of reopening behind it.
    if (viewingId === p.id) setViewingId(null);
    run({ type: "delete", id: p.id }, () => deletePhoto(jobId, p.id));
  };

  const save = (p: PhotoView, patch: PhotoPatch, optimistic: Partial<PhotoView>) =>
    run({ type: "update", id: p.id, patch: optimistic }, () => updatePhoto(jobId, p.id, patch));

  const viewIndex = viewingId ? items.findIndex((p) => p.id === viewingId) : -1;
  const viewing = viewIndex >= 0 ? items[viewIndex] : null;

  return (
    <>
      {!admin && !assigned && (
        <div className="mb-4 flex items-start gap-2.5 border border-warn bg-surface p-3 text-xs leading-relaxed">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" />
          <span>
            You are not assigned to this job, so its photos are hidden from you and uploads will be refused. Ask an owner
            or manager to add you to the job.
          </span>
        </div>
      )}

      <Uploader jobId={jobId} today={today} />
      <ErrorNote message={error} />
      {signError && <ErrorNote message={`Some pictures could not be loaded: ${signError}`} />}

      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="h-[18px] w-1 bg-steel" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[1.5px]">Job photos</h2>
        <span className="text-[11px] tracking-wider text-dim">({items.length})</span>
      </div>

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <ImageIcon size={32} className="mx-auto mb-2" />
          <div className="text-xs">No photos yet</div>
          <div className="mt-1 text-[11px]">On a phone, Take photo opens the camera.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              today={today}
              timezone={timezone}
              canChange={canChange(p)}
              onOpen={() => setViewingId(p.id)}
              onDelete={() => remove(p)}
            />
          ))}
        </div>
      )}

      {viewing && (
        <Lightbox
          key={viewing.id}
          photo={viewing}
          index={viewIndex}
          total={items.length}
          today={today}
          timezone={timezone}
          canChange={canChange(viewing)}
          error={error}
          onIndex={(i) => setViewingId(items[i]?.id ?? null)}
          onClose={() => setViewingId(null)}
          onSave={(patch, optimistic) => save(viewing, patch, optimistic)}
          onDelete={() => remove(viewing)}
        />
      )}
    </>
  );
}

// ---------- capture + upload tray ----------

type StagedStatus = "ready" | "uploading" | "done" | "error";
type Staged = { key: string; file: File; preview: string; caption: string; status: StagedStatus; error: string | null };

/** One batch at a time keeps phone memory in check. */
const MAX_STAGED = 20;

type Browser = ReturnType<typeof createClient>;

/**
 * Shrink, upload the bytes straight to Storage with the viewer's session,
 * then record the row. The path convention is what storage RLS checks:
 * crew may only write under jobs they are assigned to.
 */
async function uploadOne(supabase: Browser, jobId: string, item: Staged, date: string): Promise<ActionResult> {
  try {
    const prepared = await preparePhoto(item.file);
    const path = jobPhotoPath(jobId, newFileId(), prepared.ext);
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, prepared.blob, { contentType: prepared.contentType, cacheControl: "3600", upsert: false });
    if (error) return fail(isPolicyError(error.message) ? PHOTO_REFUSED : `Upload failed: ${error.message}`);
    return await addPhoto(jobId, { storagePath: path, caption: item.caption, date });
  } catch (e) {
    return fail(e instanceof Error && e.message ? e.message : "Upload failed. Check the connection and try again.");
  }
}

function Uploader({ jobId, today }: { jobId: string; today: string }) {
  const [staged, setStaged] = useState<Staged[]>([]);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const previews = useRef(new Set<string>());

  // Free the local preview images when leaving the page.
  useEffect(() => {
    const set = previews.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
    };
  }, []);

  const release = (url: string) => {
    URL.revokeObjectURL(url);
    previews.current.delete(url);
  };

  const patch = (key: string, change: Partial<Staged>) =>
    setStaged((prev) => prev.map((s) => (s.key === key ? { ...s, ...change } : s)));

  const stage = (list: FileList | null) => {
    setNote(null);
    const files = Array.from(list ?? []).filter((f) => f.type === "" || f.type.startsWith("image/"));
    if (files.length === 0) return;
    const room = Math.max(0, MAX_STAGED - staged.length);
    if (files.length > room) setNote(`Up to ${MAX_STAGED} photos at a time. Upload these, then add the rest.`);
    const next: Staged[] = files.slice(0, room).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { key: newFileId(), file, preview, caption: "", status: "ready", error: null };
    });
    setStaged((prev) => [...prev, ...next]);
  };

  const unstage = (item: Staged) => {
    release(item.preview);
    setStaged((prev) => prev.filter((s) => s.key !== item.key));
  };

  const cancel = () => {
    staged.forEach((s) => release(s.preview));
    setStaged([]);
    setNote(null);
    setDate(today);
  };

  const uploadAll = async () => {
    if (busy) return;
    const queue = staged.filter((s) => s.status === "ready" || s.status === "error");
    if (queue.length === 0) return;
    setBusy(true);
    setNote(null);
    const supabase = createClient();
    const saved: Staged[] = [];
    for (const item of queue) {
      patch(item.key, { status: "uploading", error: null });
      const r = await uploadOne(supabase, jobId, item, date);
      if (r.ok) {
        saved.push(item);
        patch(item.key, { status: "done" });
      } else {
        patch(item.key, { status: "error", error: r.error });
      }
    }
    // Saved ones now come back from the server as real thumbnails; failures stay for a retry.
    const savedKeys = new Set(saved.map((s) => s.key));
    setStaged((prev) => prev.filter((s) => !savedKeys.has(s.key)));
    saved.forEach((s) => release(s.preview));
    if (saved.length === queue.length) setDate(today);
    setBusy(false);
  };

  const pending = staged.filter((s) => s.status !== "done").length;
  const failed = staged.filter((s) => s.status === "error").length;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <PickButton
          icon={<Camera size={18} />}
          label="Take photo"
          className="bg-brand text-bg"
          disabled={busy}
          capture
          onFiles={stage}
        />
        <PickButton
          icon={<Images size={18} />}
          label="From library"
          className="bg-steel text-bg"
          disabled={busy}
          multiple
          onFiles={stage}
        />
      </div>
      {note && <div className="mb-3 border border-line bg-surface px-3 py-2 text-xs text-dim">{note}</div>}

      {staged.length > 0 && (
        <section className="mb-5 border border-brand bg-surface p-3" aria-label="New photos">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[1.5px] text-brand">
              New photos ({staged.length})
            </h2>
            <span className="text-[10px] text-faint">Shrunk to {MAX_EDGE}px before upload</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {staged.map((s) => (
              <div key={s.key} className={`border bg-bg ${s.status === "error" ? "border-danger" : "border-line"}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
                  <img src={s.preview} alt="" className="h-full w-full object-cover" />
                  {s.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-ink">
                      <LoaderCircle size={26} className="animate-spin" aria-label="Uploading" />
                    </div>
                  )}
                  {s.status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-ok">
                      <Check size={28} strokeWidth={3} aria-label="Saved" />
                    </div>
                  )}
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => unstage(s)}
                      aria-label="Remove from upload"
                      title="Remove"
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
                    >
                      <span className="flex h-7 w-7 items-center justify-center bg-black/70 text-ink">
                        <X size={14} />
                      </span>
                    </button>
                  )}
                </div>
                <div className="p-1.5">
                  <input
                    value={s.caption}
                    onChange={(e) => patch(s.key, { caption: e.target.value })}
                    placeholder="Caption..."
                    aria-label="Caption"
                    maxLength={300}
                    disabled={busy}
                    className="input"
                  />
                  {s.error && (
                    <div role="alert" className="mt-1 break-words text-[11px] leading-snug text-danger">
                      {s.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="photo-date">Date</Label>
              <input
                id="photo-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
                className="input"
              />
            </div>
            <button
              type="button"
              onClick={uploadAll}
              disabled={busy || pending === 0}
              className="flex min-h-11 items-center justify-center gap-2 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> Uploading...
                </>
              ) : failed > 0 ? (
                `Retry ${failed} ${failed === 1 ? "photo" : "photos"}`
              ) : (
                `Upload ${pending} ${pending === 1 ? "photo" : "photos"}`
              )}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * A big tap target that opens the camera (capture) or the photo library.
 * The file input sits inside the label so iOS opens the picker on tap.
 */
function PickButton({
  icon,
  label,
  className,
  disabled,
  capture = false,
  multiple = false,
  onFiles,
}: {
  icon: ReactNode;
  label: string;
  className: string;
  disabled: boolean;
  capture?: boolean;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      aria-disabled={disabled || undefined}
      className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 px-4 font-display text-xs font-bold uppercase tracking-[1.5px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink ${className} ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {icon} {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          // Clear so picking the same picture again still fires a change.
          e.target.value = "";
        }}
      />
    </label>
  );
}

// ---------- grid card ----------

function PhotoCard({
  photo,
  today,
  timezone,
  canChange,
  onOpen,
  onDelete,
}: {
  photo: PhotoView;
  today: string;
  timezone: string;
  canChange: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const caption = photo.caption?.trim();

  return (
    <div className="relative overflow-hidden border border-line bg-surface">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open photo: ${caption || "untitled"}`}
        className="block aspect-[4/3] w-full overflow-hidden bg-bg"
      >
        {photo.url && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from a private bucket
          <img
            src={photo.url}
            alt={caption ?? ""}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-faint">
            <ImageOff size={22} />
            <span className="text-[10px]">Image unavailable</span>
          </span>
        )}
      </button>
      <div className="p-2">
        <div className={`break-words text-xs ${caption ? "" : "italic text-faint"}`}>{caption || "Untitled"}</div>
        <div className="mt-0.5 text-[10px] text-dim">
          {shortDate(photoDate(photo, timezone), today)}
          {photo.takenByName && ` · ${photo.takenByName}`}
        </div>
      </div>
      {canChange && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete photo: ${caption || "untitled"}`}
          title="Delete"
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
        >
          <span className="flex h-7 w-7 items-center justify-center bg-black/70 text-ink hover:text-danger">
            <Trash2 size={13} />
          </span>
        </button>
      )}
    </div>
  );
}

// ---------- full-screen viewer ----------

function Lightbox({
  photo,
  index,
  total,
  today,
  timezone,
  canChange,
  error,
  onIndex,
  onClose,
  onSave,
  onDelete,
}: {
  photo: PhotoView;
  index: number;
  total: number;
  today: string;
  timezone: string;
  canChange: boolean;
  error: string | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  onSave: (patch: PhotoPatch, optimistic: Partial<PhotoView>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [date, setDate] = useState(photoDate(photo, timezone));
  const [broken, setBroken] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      } else if (!editing && e.key === "ArrowLeft" && hasPrev) onIndex(index - 1);
      else if (!editing && e.key === "ArrowRight" && hasNext) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [editing, hasPrev, hasNext, index, onClose, onIndex]);

  const submit = () => {
    if (!date) return;
    onSave({ caption, date }, { caption: caption.trim() || null, date });
    setEditing(false);
  };

  const shownCaption = photo.caption?.trim();

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-2 p-2">
        <span className="pl-2 text-[11px] tracking-wider text-dim">
          {index + 1} / {total}
        </span>
        <div className="flex gap-1.5">
          {photo.url && (
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open full size in a new tab"
              title="Open full size"
              className="flex h-11 w-11 items-center justify-center border border-line-2 text-dim hover:border-brand hover:text-brand"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center border border-line-2 text-ink hover:border-brand hover:text-brand"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {photo.url && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from a private bucket
          <img
            src={photo.url}
            alt={shownCaption ?? ""}
            onError={() => setBroken(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-faint">
            <ImageOff size={36} />
            <span className="text-xs">Image unavailable</span>
          </span>
        )}
        {hasPrev && (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-black/60 text-ink"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            aria-label="Next photo"
            className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-black/60 text-ink"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      <div className="border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl">
          <ErrorNote message={error} />
        </div>
        {editing ? (
          <form
            className="mx-auto grid max-w-3xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <Label htmlFor="lightbox-caption">Caption</Label>
              <input
                id="lightbox-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
                autoFocus
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-1.5 sm:grid-cols-[12rem_1fr_auto]">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="lightbox-date">Date</Label>
                <input id="lightbox-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              </div>
              <button
                type="submit"
                disabled={!date}
                className="min-h-11 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mx-auto flex max-w-3xl items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={`break-words text-sm ${shownCaption ? "" : "italic text-faint"}`}>{shownCaption || "Untitled"}</div>
              <div className="mt-0.5 text-[11px] text-dim">
                {shortDate(photoDate(photo, timezone), today)}
                {photo.takenByName && ` · ${photo.takenByName}`}
              </div>
            </div>
            {canChange && (
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCaption(photo.caption ?? "");
                    setDate(photoDate(photo, timezone));
                    setEditing(true);
                  }}
                  aria-label="Edit caption and date"
                  title="Edit"
                  className="flex h-11 w-11 items-center justify-center border border-line-2 text-dim hover:border-brand hover:text-brand"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete photo"
                  title="Delete"
                  className="flex h-11 w-11 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
