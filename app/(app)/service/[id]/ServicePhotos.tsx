"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { addServicePhoto, deleteServicePhoto, updatePhotoCaption } from "../actions";
import { ErrorNote } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { newId } from "@/lib/service";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "./downscale";

export type PhotoView = {
  id: string;
  /** Short-lived signed URL; null when the link could not be made. */
  url: string | null;
  caption: string | null;
  date: string | null;
  takenBy: string | null;
  /** Uploader or admin: may caption and delete (RLS enforces the same). */
  canChange: boolean;
};

type Pending = { key: string; preview: string; state: "waiting" | "uploading" | "done" | "failed"; error?: string };

/**
 * Phase 1 ServicePhotos on Storage: shrink in the browser, upload to
 * photos/sc/<call id>/<uuid>.jpg, then record the photos row.
 */
export function ServicePhotos({
  callId,
  photos,
  loadError,
  limited,
}: {
  callId: string;
  photos: PhotoView[];
  loadError: string | null;
  limited: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startChange] = useTransition();

  // When a batch finishes (and the page has the new photos), drop the finished previews.
  useEffect(() => {
    if (uploading) return;
    setPending((list) => {
      const keep = list.filter((p) => p.state === "failed");
      for (const p of list) if (p.state !== "failed") URL.revokeObjectURL(p.preview);
      return keep.length === list.length ? list : keep;
    });
  }, [uploading]);

  const mark = (key: string, patch: Partial<Pending>) =>
    setPending((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const onFiles = (input: HTMLInputElement | null) => {
    const files = Array.from(input?.files ?? []).filter((f) => f.type.startsWith("image/") || f.type === "");
    if (input) input.value = "";
    if (files.length === 0) return;
    setError(null);
    const batch = files.map((file) => ({ file, key: newId(), preview: URL.createObjectURL(file) }));
    setPending((list) => [...batch.map((b) => ({ key: b.key, preview: b.preview, state: "waiting" as const })), ...list]);

    setNote(null);
    startUpload(async () => {
      const supabase = createClient();
      let saved = 0;
      for (const { file, key } of batch) {
        mark(key, { state: "uploading" });
        try {
          const img = await prepareImage(file);
          const path = `sc/${callId}/${newId()}.${img.ext}`;
          const { error: upErr } = await supabase.storage
            .from("photos")
            .upload(path, img.blob, { contentType: img.contentType, cacheControl: "3600", upsert: false });
          if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
          const r = await addServicePhoto(callId, path);
          if (!r.ok) {
            // Best effort: an orphaned file is invisible (no row points at it) but costs space.
            await supabase.storage.from("photos").remove([path]);
            throw new Error(r.error);
          }
          mark(key, { state: "done" });
          saved += 1;
        } catch (e) {
          mark(key, { state: "failed", error: e instanceof Error ? e.message : "Upload failed." });
        }
      }
      // Viewers who cannot read this call's photos would otherwise see them vanish.
      if (limited && saved > 0) setNote(saved === 1 ? "Photo saved to the call." : `${saved} photos saved to the call.`);
    });
  };

  const dismiss = (key: string) =>
    setPending((list) => {
      const p = list.find((x) => x.key === key);
      if (p) URL.revokeObjectURL(p.preview);
      return list.filter((x) => x.key !== key);
    });

  const remove = (p: PhotoView) => {
    if (!window.confirm("Delete this photo?")) return;
    setError(null);
    setBusyId(p.id);
    startChange(async () => {
      const r = await deleteServicePhoto(callId, p.id);
      if (!r.ok) setError(r.error);
      setBusyId(null);
    });
  };

  const saveCaption = (p: PhotoView, caption: string) => {
    if ((p.caption ?? "") === caption.trim()) return;
    setError(null);
    setBusyId(p.id);
    startChange(async () => {
      const r = await updatePhotoCaption(callId, p.id, caption);
      if (!r.ok) setError(r.error);
      setBusyId(null);
    });
  };

  const count = photos.length + pending.filter((p) => p.state !== "failed").length;
  const btn =
    "flex min-h-11 items-center gap-1.5 px-3 font-display text-[11px] font-bold uppercase tracking-[1.5px] disabled:opacity-50";

  return (
    <section className="mb-4 border border-line bg-surface p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[13px] uppercase tracking-[1.5px]">Photos ({count})</h2>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => cameraRef.current?.click()} className={`${btn} bg-steel text-bg`}>
            <Camera size={14} /> Take photo
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            className={`${btn} border border-line-2 text-ink hover:border-brand`}
          >
            <ImagePlus size={14} /> Upload
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onFiles(e.currentTarget)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onFiles(e.currentTarget)}
        />
      </div>

      {limited && (
        <p className="mb-3 border-l-2 border-warn pl-2 text-[10px] text-dim">
          Only admins and the person who created this call can see its photos. Photos you add still save to the call.
        </p>
      )}
      <ErrorNote message={error ?? (loadError ? `Could not load photos: ${loadError}` : null)} />
      {note && (
        <div role="status" className="mb-3 border border-ok bg-bg px-3 py-2 text-xs text-ok">
          {note}
        </div>
      )}

      {photos.length === 0 && pending.length === 0 ? (
        <div className="border-2 border-dashed border-line p-5 text-center text-xs text-faint">
          On a phone: TAKE PHOTO opens the camera, UPLOAD picks from the photo library.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {pending.map((p) => (
            <div key={p.key} className="relative border border-line bg-bg">
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
                <img src={p.preview} alt="" className="h-full w-full object-cover opacity-50" />
                {p.state !== "failed" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-ink" />
                  </div>
                )}
              </div>
              <div className="p-1.5 text-[10px] leading-snug">
                {p.state === "failed" ? (
                  <span className="text-danger">{p.error}</span>
                ) : (
                  <span className="text-dim">{p.state === "waiting" ? "Waiting…" : "Uploading…"}</span>
                )}
              </div>
              {p.state === "failed" && (
                <button
                  type="button"
                  onClick={() => dismiss(p.key)}
                  aria-label="Dismiss failed upload"
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
                >
                  <span className="flex h-7 w-7 items-center justify-center bg-black/70 text-ink">
                    <X size={13} />
                  </span>
                </button>
              )}
            </div>
          ))}
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              busy={busyId === p.id}
              onDelete={() => remove(p)}
              onCaption={(c) => saveCaption(p, c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PhotoTile({
  photo: p,
  busy,
  onDelete,
  onCaption,
}: {
  photo: PhotoView;
  busy: boolean;
  onDelete: () => void;
  onCaption: (caption: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.caption ?? "");

  const commit = () => {
    setEditing(false);
    onCaption(draft);
  };

  return (
    <div className={`relative border border-line bg-bg ${busy ? "opacity-50" : ""}`}>
      <div className="aspect-[4/3] overflow-hidden">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer" aria-label="Open full photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket */}
            <img src={p.url} alt={p.caption ?? "Service call photo"} loading="lazy" className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-faint">Image unavailable</div>
        )}
      </div>
      <div className="p-1.5 text-[10px] leading-snug text-dim">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commit();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(p.caption ?? "");
                  setEditing(false);
                }
              }}
              autoFocus
              maxLength={200}
              placeholder="Caption"
              aria-label="Photo caption"
              className="input !min-h-9 !py-1"
            />
          </form>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              {p.caption && <div className="mb-0.5 break-words text-ink">{p.caption}</div>}
              <div>
                {p.date ? formatDate(p.date, { month: "short", day: "numeric", year: "numeric" }) : ""}
                {p.takenBy ? ` · ${p.takenBy}` : ""}
              </div>
            </div>
            {p.canChange && (
              <button
                type="button"
                onClick={() => {
                  setDraft(p.caption ?? "");
                  setEditing(true);
                }}
                disabled={busy}
                aria-label={p.caption ? "Edit caption" : "Add caption"}
                title={p.caption ? "Edit caption" : "Add caption"}
                className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center text-dim hover:text-brand"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {p.canChange && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete photo"
          title="Delete photo"
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
