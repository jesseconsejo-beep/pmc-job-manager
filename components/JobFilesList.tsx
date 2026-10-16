"use client";

import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { ExternalLink, FileText, FileUp, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { ErrorNote, Label } from "@/components/ui";
import { addJobFile, deleteJobFile, updateJobFile, type JobFileInput } from "@/lib/job-files-actions";
import {
  FILE_FOLDER,
  JOB_FILES_BUCKET,
  MAX_PDF_BYTES,
  SIGNED_URL_SECONDS,
  cleanLink,
  isPdf,
  linkHost,
  newJobFilePath,
  type FolderFileType,
  type JobFileRow,
} from "@/lib/job-files";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { fail, type ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Item = JobFileRow & { pending?: "upload" | "save" };

type Op =
  | { type: "add"; item: Item }
  | { type: "update"; id: string; patch: Partial<Item> }
  | { type: "delete"; id: string };

function reducer(items: Item[], op: Op): Item[] {
  switch (op.type) {
    case "add":
      return [op.item, ...items];
    case "update":
      return items.map((i) => (i.id === op.id ? { ...i, ...op.patch } : i));
    case "delete":
      return items.filter((i) => i.id !== op.id);
  }
}

/** What the add / edit form hands back. The File stays in state so a failed save can reopen with it. */
type Draft = {
  name: string;
  revision: string;
  date_issued: string;
  notes: string;
  source: "link" | "pdf";
  url: string;
  file: File | null;
};

const BLANK: Draft = { name: "", revision: "", date_issued: "", notes: "", source: "link", url: "", file: null };

function draftOf(row: JobFileRow): Draft {
  return {
    name: row.name,
    revision: row.revision ?? "",
    date_issued: row.date_issued ?? "",
    notes: row.notes ?? "",
    source: row.storage_path ? "pdf" : "link",
    url: row.external_url ?? "",
    file: null,
  };
}

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---------- list ----------

/**
 * IFC and Shop Drawing folders (Phase 1 FilesList, one component for both).
 * Each drawing is an external link or a PDF uploaded from the browser to the
 * private 'job-files' bucket at job/<job_id>/<uuid>.pdf, opened by signed URL.
 */
export function JobFilesList({
  jobId,
  fileType,
  files,
}: {
  jobId: string;
  fileType: FolderFileType;
  files: JobFileRow[];
}) {
  const folder = FILE_FOLDER[fileType];
  const [items, apply] = useOptimistic<Item[], Op>(files, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Add form: closed (null) or open with a draft (kept after a failed save).
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);

  /** Upload the PDF if one was picked, then save the row; an orphaned upload is removed. */
  const persist = async (draft: Draft, existing: JobFileRow | null): Promise<ActionResult> => {
    let uploaded: string | null = null;
    if (draft.source === "pdf" && draft.file) {
      const path = newJobFilePath(jobId);
      const { error: upErr } = await createClient()
        .storage.from(JOB_FILES_BUCKET)
        .upload(path, draft.file, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
      if (upErr) return fail(`Upload failed: ${upErr.message}`);
      uploaded = path;
    }
    const input: JobFileInput = {
      name: draft.name,
      revision: draft.revision,
      date_issued: draft.date_issued,
      notes: draft.notes,
      source: draft.source === "link" ? "link" : uploaded ? "pdf" : "keep",
      external_url: draft.url,
      storage_path: uploaded ?? "",
    };
    const r = existing
      ? await updateJobFile(jobId, fileType, existing.id, input)
      : await addJobFile(jobId, fileType, input);
    if (!r.ok && uploaded) await createClient().storage.from(JOB_FILES_BUCKET).remove([uploaded]);
    return r;
  };

  const submitAdd = (draft: Draft) => {
    setError(null);
    setAdding(null);
    const temp: Item = {
      id: `temp-${Date.now()}`,
      file_type: fileType,
      name: draft.name.trim(),
      revision: draft.revision.trim() || null,
      date_issued: draft.date_issued || null,
      storage_path: null,
      external_url: null,
      notes: draft.notes.trim() || null,
      uploaded_at: new Date().toISOString(),
      pending: draft.source === "pdf" && draft.file ? "upload" : "save",
    };
    startTransition(async () => {
      apply({ type: "add", item: temp });
      const r = await persist(draft, null);
      if (!r.ok) {
        setError(r.error);
        setAdding(draft);
      }
    });
  };

  const submitEdit = (row: JobFileRow, draft: Draft) => {
    setError(null);
    setEditing(null);
    startTransition(async () => {
      apply({
        type: "update",
        id: row.id,
        patch: {
          name: draft.name.trim(),
          revision: draft.revision.trim() || null,
          date_issued: draft.date_issued || null,
          notes: draft.notes.trim() || null,
          pending: draft.source === "pdf" && draft.file ? "upload" : "save",
        },
      });
      const r = await persist(draft, row);
      if (!r.ok) {
        setError(r.error);
        setEditing({ id: row.id, draft });
      }
    });
  };

  const remove = (row: JobFileRow) => {
    const what = row.storage_path ? `"${row.name}" and its PDF` : `"${row.name}"`;
    if (!window.confirm(`Delete ${what}?`)) return;
    setError(null);
    startTransition(async () => {
      apply({ type: "delete", id: row.id });
      const r = await deleteJobFile(jobId, fileType, row.id);
      if (!r.ok) setError(r.error);
    });
  };

  const openPdf = async (row: JobFileRow) => {
    if (!row.storage_path) return;
    setError(null);
    // Open the tab inside the tap: iOS Safari blocks window.open after an await.
    const win = window.open("", "_blank");
    const { data, error: signErr } = await createClient()
      .storage.from(JOB_FILES_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
    if (signErr || !data?.signedUrl) {
      win?.close();
      setError(`Could not open the PDF: ${signErr?.message ?? "no link returned"}`);
      return;
    }
    if (win) {
      win.opener = null;
      win.location.href = data.signedUrl;
    } else {
      window.location.assign(data.signedUrl);
    }
  };

  return (
    <>
      <div className="mb-4 border border-line bg-surface p-3.5">
        <div className="mb-1 text-[10px] tracking-[1.5px] text-dim">UPLOAD OR LINK</div>
        <p className="text-xs leading-relaxed text-ink">
          Upload the PDF, or paste a link to {folder.plural} on Dropbox, SharePoint, OneDrive or Google Drive.
        </p>
      </div>

      <ErrorNote message={error} />

      {adding ? (
        <FileForm
          key="add"
          initial={adding}
          hasPdf={false}
          submitLabel="Save"
          onSubmit={submitAdd}
          onCancel={() => setAdding(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(BLANK);
            setEditing(null);
          }}
          className="mb-4 flex min-h-11 items-center gap-1.5 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
        >
          <Plus size={16} strokeWidth={2.5} /> {folder.addLabel}
        </button>
      )}

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <FileText size={32} className="mx-auto mb-2" />
          <div className="text-xs">{folder.empty}</div>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((row) =>
            editing?.id === row.id ? (
              <FileForm
                key={row.id}
                initial={editing.draft}
                hasPdf={!!row.storage_path}
                submitLabel="Save"
                onSubmit={(d) => submitEdit(row, d)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <FileRow
                key={row.id}
                row={row}
                onOpenPdf={() => void openPdf(row)}
                onEdit={() => {
                  setEditing({ id: row.id, draft: draftOf(row) });
                  setAdding(null);
                }}
                onDelete={() => remove(row)}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

// ---------- one drawing ----------

function FileRow({
  row,
  onOpenPdf,
  onEdit,
  onDelete,
}: {
  row: Item;
  onOpenPdf: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const busy = !!row.pending || row.id.startsWith("temp-");
  return (
    <div className={`flex items-center gap-2.5 border border-line bg-surface p-2.5 pl-3.5 ${busy ? "animate-pulse" : ""}`}>
      <FileText size={20} className="shrink-0 text-steel" />
      <div className="min-w-0 flex-1 py-1">
        <div className="break-words text-sm font-semibold">{row.name}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tracking-wider text-dim">
          {row.revision && <span>{row.revision}</span>}
          {row.date_issued && <span>{formatDate(row.date_issued)}</span>}
          {row.pending === "upload" ? (
            <span className="text-brand">UPLOADING PDF…</span>
          ) : row.pending === "save" ? (
            <span className="text-brand">SAVING…</span>
          ) : row.storage_path ? (
            <span className="text-steel">PDF</span>
          ) : row.external_url ? (
            <span className="text-steel">{linkHost(row.external_url)}</span>
          ) : (
            <span className="italic text-faint">no file yet</span>
          )}
        </div>
        {row.notes && <div className="mt-1 whitespace-pre-line break-words text-[11px] text-dim">{row.notes}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {row.storage_path && !busy ? (
          <button
            type="button"
            onClick={onOpenPdf}
            aria-label={`Open ${row.name} PDF`}
            title="Open PDF"
            className="flex h-11 w-11 items-center justify-center border border-line-2 text-brand hover:border-brand"
          >
            <FileText size={16} />
          </button>
        ) : row.external_url && !busy ? (
          <a
            href={row.external_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${row.name} link`}
            title="Open link"
            className="flex h-11 w-11 items-center justify-center border border-line-2 text-brand hover:border-brand"
          >
            <ExternalLink size={16} />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          aria-label={`Edit ${row.name}`}
          title="Edit"
          className="flex h-11 w-11 items-center justify-center border border-line-2 text-dim hover:border-brand disabled:opacity-40"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${row.name}`}
          title="Delete"
          className="flex h-11 w-11 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- add / edit form ----------

function FileForm({
  initial,
  hasPdf,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  /** The row already has a stored PDF (edit), so a new file is optional. */
  hasPdf: boolean;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idp = useId();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const pick = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!isPdf(file)) {
      setError("Choose a PDF file.");
    } else if (file.size > MAX_PDF_BYTES) {
      setError(`That PDF is ${sizeLabel(file.size)}. The limit is ${sizeLabel(MAX_PDF_BYTES)}.`);
    } else {
      set("file", file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    setError(null);
    if (!d.name.trim()) return setError("Give the drawing a name or number.");
    if (d.source === "pdf" && !d.file && !hasPdf) return setError("Choose a PDF to upload.");
    if (d.source === "link") {
      const link = cleanLink(d.url);
      if (link.error) return setError(link.error);
    }
    onSubmit(d);
  };


  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mb-4 border border-brand bg-surface p-3.5"
    >
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Label htmlFor={`${idp}-name`}>Drawing name / number</Label>
          <input
            id={`${idp}-name`}
            value={d.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="M-101 Mech Plan"
            maxLength={200}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor={`${idp}-rev`}>Revision</Label>
          <input
            id={`${idp}-rev`}
            value={d.revision}
            onChange={(e) => set("revision", e.target.value)}
            placeholder="Rev 3"
            maxLength={50}
            className="input"
          />
        </div>
        <div>
          <Label htmlFor={`${idp}-date`}>Date issued</Label>
          <input
            id={`${idp}-date`}
            type="date"
            value={d.date_issued}
            onChange={(e) => set("date_issued", e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">File</div>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {(
            [
              { id: "pdf", label: "Upload PDF", icon: FileUp },
              { id: "link", label: "Link", icon: Link2 },
            ] as const
          ).map((s) => {
            const Icon = s.icon;
            const active = d.source === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => set("source", s.id)}
                aria-pressed={active}
                className={`flex min-h-11 items-center justify-center gap-1.5 border-[1.5px] px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
                  active ? "border-brand bg-brand text-bg" : "border-line bg-bg text-ink"
                }`}
              >
                <Icon size={14} /> {s.label}
              </button>
            );
          })}
        </div>

        {d.source === "link" ? (
          <div>
            <Label htmlFor={`${idp}-url`}>Link (Dropbox / SharePoint URL)</Label>
            <input
              id={`${idp}-url`}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={d.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 border border-dashed border-line-2 bg-bg p-2.5">
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 border border-line-2 bg-surface-2 px-3 font-display text-[11px] uppercase tracking-wider text-ink hover:border-brand hover:text-brand">
              <FileUp size={14} /> {d.file || hasPdf ? "Choose another PDF" : "Choose PDF"}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
            <div className="min-w-0 flex-1 text-[11px] text-dim">
              {d.file ? (
                <span className="flex items-center gap-1.5">
                  <span className="break-all text-ink">{d.file.name}</span>
                  <span className="shrink-0">· {sizeLabel(d.file.size)}</span>
                  <button
                    type="button"
                    onClick={() => set("file", null)}
                    aria-label="Clear the chosen PDF"
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-faint hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : hasPdf ? (
                "PDF attached. Choose a file only to replace it."
              ) : (
                `PDF up to ${sizeLabel(MAX_PDF_BYTES)}.`
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Label htmlFor={`${idp}-notes`}>Notes</Label>
        <textarea
          id={`${idp}-notes`}
          value={d.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          maxLength={2000}
          className="input resize-y"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg sm:flex-none"
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
