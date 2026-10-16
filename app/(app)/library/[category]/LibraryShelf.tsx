"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { ExternalLink, FileText, FileUp, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { addDoc, deleteDoc, discardUpload, updateDoc, type DocInput, type FileChange } from "../actions";
import { ErrorNote, Label } from "@/components/ui";
import { categoryMeta, LIBRARY_BUCKET, libraryPath, pdfProblem, safeHref, splitTags } from "@/lib/library";
import { createClient } from "@/lib/supabase/client";
import type { LibraryCategory, LibraryDoc } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

// ---------- optimistic state ----------

type Op =
  | { type: "add"; doc: LibraryDoc }
  | { type: "update"; id: string; patch: Partial<LibraryDoc> }
  | { type: "delete"; id: string };

function reducer(docs: LibraryDoc[], op: Op): LibraryDoc[] {
  switch (op.type) {
    case "add":
      return [...docs, op.doc];
    case "update":
      return docs.map((d) => (d.id === op.id ? { ...d, ...op.patch } : d));
    case "delete":
      return docs.filter((d) => d.id !== op.id);
  }
}

type Run = (op: Op | null, call: () => Promise<ActionResult>, onFail?: () => void) => void;

const isTemp = (id: string) => id.startsWith("temp-");

type Draft = DocInput;
const BLANK: Draft = { title: "", edition: "", publisher: "", external_url: "", tags: "", notes: "" };

function draftOf(doc: LibraryDoc): Draft {
  return {
    title: doc.title,
    edition: doc.edition ?? "",
    publisher: doc.publisher ?? "",
    external_url: doc.external_url ?? "",
    tags: doc.tags ?? "",
    notes: doc.notes ?? "",
  };
}

function fieldsOf(d: Draft): Partial<LibraryDoc> {
  const tags = splitTags(d.tags).join(", ");
  return {
    title: d.title.trim(),
    edition: d.edition.trim() || null,
    publisher: d.publisher.trim() || null,
    external_url: d.external_url.trim() || null,
    tags: tags || null,
    notes: d.notes.trim() || null,
  };
}

function matches(doc: LibraryDoc, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return [doc.title, doc.publisher, doc.edition, doc.tags, doc.notes].some((v) => (v ?? "").toLowerCase().includes(s));
}

// ---------- shelf ----------

export function LibraryShelf({
  category,
  docs,
  userId,
  admin,
  companyShort,
  bc,
  openError,
}: {
  category: LibraryCategory;
  docs: LibraryDoc[];
  userId: string;
  admin: boolean;
  companyShort: string;
  bc: boolean;
  /** Arrived back from /library/open after a PDF could not be signed. */
  openError: boolean;
}) {
  const meta = categoryMeta(category, { companyShort, bc });
  const Icon = meta.icon;
  const [items, apply] = useOptimistic(docs, reducer);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    openError ? "That PDF could not be opened. Try again, or ask an admin to upload it again." : null,
  );
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);

  // Drop ?error=open from the address bar so a refresh does not repeat the message.
  useEffect(() => {
    if (openError) window.history.replaceState(null, "", `/library/${category}`);
  }, [openError, category]);

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

  const q = search.trim();
  const visible = items.filter((d) => matches(d, q)).sort((a, b) => a.title.localeCompare(b.title));

  const submitNew = (d: Draft, change: FileChange) => {
    setAdding(null);
    const path = change.kind === "new" ? change.path : null;
    const doc: LibraryDoc = {
      id: `temp-${Date.now()}`,
      category,
      title: "",
      edition: null,
      publisher: null,
      tags: null,
      notes: null,
      storage_path: path,
      external_url: null,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      ...fieldsOf(d),
    };
    run({ type: "add", doc }, () => addDoc(category, d, path), () => {
      if (path) void discardUpload(category, path);
      setAdding(d);
    });
  };

  const submitEdit = (doc: LibraryDoc, d: Draft, change: FileChange) => {
    setEditing(null);
    const storage_path =
      change.kind === "new" ? change.path : change.kind === "remove" ? null : doc.storage_path;
    run({ type: "update", id: doc.id, patch: { ...fieldsOf(d), storage_path } }, () => updateDoc(doc.id, d, change), () => {
      if (change.kind === "new") void discardUpload(category, change.path);
      setEditing({ id: doc.id, draft: d });
    });
  };

  const remove = (doc: LibraryDoc) => {
    if (!window.confirm(`Remove "${doc.title}" from the library?${doc.storage_path ? " The uploaded PDF is deleted too." : ""}`)) return;
    run({ type: "delete", id: doc.id }, () => deleteDoc(doc.id));
  };

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <Icon size={28} className="shrink-0" style={{ color: meta.color }} aria-hidden />
        <div className="min-w-0">
          <h1 className="break-words font-display text-[22px] font-bold uppercase tracking-[1.5px]">{meta.label}</h1>
          <p className="mt-0.5 text-[11px] text-dim">{meta.desc}</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-3 flex items-center gap-2 border border-line bg-surface px-3">
          <Search size={16} className="shrink-0 text-dim" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, publisher, tag..."
            aria-label="Search documents"
            className="min-h-11 w-full min-w-0 bg-transparent py-2 text-base outline-none placeholder:text-faint"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="flex h-11 w-9 shrink-0 items-center justify-center text-dim"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <ErrorNote message={error} />

      {adding ? (
        <div className="mb-4 border bg-surface p-4" style={{ borderColor: meta.color }}>
          <div className="mb-3 font-display text-sm uppercase tracking-[1.5px]" style={{ color: meta.color }}>
            New document
          </div>
          <DocForm
            category={category}
            initial={adding}
            hasFile={false}
            admin={admin}
            titlePlaceholder={meta.titlePlaceholder}
            publisherPlaceholder={meta.publisherPlaceholder}
            color={meta.color}
            submitLabel="Save"
            onSubmit={submitNew}
            onCancel={() => setAdding(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(BLANK);
          }}
          className="mb-4 flex min-h-11 items-center gap-1.5 px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
          style={{ background: meta.color }}
        >
          <Plus size={14} strokeWidth={3} /> Add document
        </button>
      )}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-line p-10 text-center text-faint">
          <Icon size={32} className="mx-auto mb-2" aria-hidden />
          <div className="text-xs">{q ? "No matches" : "No documents yet"}</div>
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((doc) =>
            editing?.id === doc.id ? (
              <div key={doc.id} className="border bg-surface p-3.5" style={{ borderColor: meta.color }}>
                <DocForm
                  category={category}
                  initial={editing.draft}
                  hasFile={!!doc.storage_path}
                  admin={admin}
                  titlePlaceholder={meta.titlePlaceholder}
                  publisherPlaceholder={meta.publisherPlaceholder}
                  color={meta.color}
                  submitLabel="Save"
                  onSubmit={(d, change) => submitEdit(doc, d, change)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <DocCard
                key={doc.id}
                doc={doc}
                color={meta.color}
                canChange={admin || doc.uploaded_by === userId}
                canDelete={(admin || doc.uploaded_by === userId) && (admin || !doc.storage_path)}
                onEdit={() => {
                  setAdding(null);
                  setEditing({ id: doc.id, draft: draftOf(doc) });
                }}
                onDelete={() => remove(doc)}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

// ---------- one document ----------

function DocCard({
  doc,
  color,
  canChange,
  canDelete,
  onEdit,
  onDelete,
}: {
  doc: LibraryDoc;
  color: string;
  canChange: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const temp = isTemp(doc.id);
  const tags = splitTags(doc.tags);
  const link = safeHref(doc.external_url);

  return (
    <div className={`border border-line bg-surface p-3 ${temp ? "animate-pulse" : ""}`}>
      <div className="break-words text-sm font-semibold">{doc.title}</div>
      {(doc.publisher || doc.edition) && (
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-dim">
          {doc.publisher && <span>{doc.publisher}</span>}
          {doc.edition && (
            <span>
              {doc.publisher ? "· " : ""}
              {doc.edition}
            </span>
          )}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.map((t, i) => (
            <span key={`${t}-${i}`} className="border border-steel-dark bg-bg px-1.5 py-0.5 text-[9px] tracking-[0.5px] text-steel">
              {t}
            </span>
          ))}
        </div>
      )}
      {doc.notes && <div className="mt-1.5 whitespace-pre-wrap break-words text-[11px] italic text-dim">{doc.notes}</div>}

      {(doc.storage_path || link || canChange || canDelete) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {doc.storage_path && !temp && (
            <a
              href={`/library/open/${doc.id}`}
              target="_blank"
              rel="noopener"
              className="flex min-h-11 items-center gap-1.5 border px-3 font-display text-[11px] font-semibold uppercase tracking-[1.2px]"
              style={{ borderColor: color, color }}
            >
              <FileText size={14} /> Open PDF
            </a>
          )}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-1.5 border border-line-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[1.2px] text-ink hover:border-brand"
            >
              <ExternalLink size={14} /> Open link
            </a>
          )}
          <span className="flex-1" />
          {canChange && (
            <button
              type="button"
              onClick={onEdit}
              disabled={temp}
              aria-label="Edit document"
              title="Edit document"
              className="flex h-11 w-11 items-center justify-center border border-line-2 text-dim hover:border-brand disabled:opacity-40"
            >
              <Pencil size={13} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={temp}
              aria-label="Remove document"
              title="Remove document"
              className="flex h-11 w-11 items-center justify-center border border-line-2 text-faint hover:border-danger hover:text-danger disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- add / edit form ----------

function DocForm({
  category,
  initial,
  hasFile,
  admin,
  titlePlaceholder,
  publisherPlaceholder,
  color,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  category: LibraryCategory;
  initial: Draft;
  /** The document already has an uploaded PDF (edit only). */
  hasFile: boolean;
  admin: boolean;
  titlePlaceholder: string;
  publisherPlaceholder: string;
  color: string;
  submitLabel: string;
  onSubmit: (d: Draft, change: FileChange) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const ready = d.title.trim() !== "" && !busy;

  const pick = (f: File | undefined) => {
    setFormError(null);
    if (!f) return;
    const problem = pdfProblem(f);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFile(f);
    setRemoveFile(false);
  };

  const submit = async () => {
    if (!ready) return;
    setFormError(null);
    if (!file) {
      onSubmit(d, removeFile ? { kind: "remove" } : { kind: "keep" });
      return;
    }
    // Upload first, straight from the browser (storage RLS: admins only), then save the row.
    setBusy(true);
    const path = libraryPath(category, crypto.randomUUID());
    const { error } = await createClient()
      .storage.from(LIBRARY_BUCKET)
      .upload(path, file, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
    setBusy(false);
    if (error) {
      setFormError(`Upload failed: ${error.message}`);
      return;
    }
    onSubmit(d, { kind: "new", path });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid gap-3"
    >
      <ErrorNote message={formError} />
      <div>
        <Label htmlFor="doc-title">Title *</Label>
        <input
          id="doc-title"
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={titlePlaceholder}
          className="input"
          maxLength={300}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <Label htmlFor="doc-edition">Edition / Version</Label>
          <input
            id="doc-edition"
            value={d.edition}
            onChange={(e) => set({ edition: e.target.value })}
            placeholder="2024 / Rev 5"
            className="input"
            maxLength={100}
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="doc-publisher">Publisher / Manufacturer</Label>
          <input
            id="doc-publisher"
            value={d.publisher}
            onChange={(e) => set({ publisher: e.target.value })}
            placeholder={publisherPlaceholder}
            className="input"
            maxLength={200}
          />
        </div>
      </div>

      {admin && (
        <div>
          <Label>PDF file</Label>
          {hasFile && !file && (
            <div className="mb-1.5 flex min-h-11 items-center gap-2 border border-line bg-bg px-3 text-xs">
              <FileText size={14} className="shrink-0" style={{ color: removeFile ? undefined : color }} />
              <span className={`flex-1 ${removeFile ? "text-faint line-through" : ""}`}>PDF attached</span>
              <button
                type="button"
                onClick={() => setRemoveFile(!removeFile)}
                className="min-h-9 px-2 font-display text-[11px] uppercase tracking-wider text-dim hover:text-danger"
              >
                {removeFile ? "Keep" : "Remove"}
              </button>
            </div>
          )}
          {file ? (
            <div className="flex min-h-11 items-center gap-2 border border-line bg-bg px-3 text-xs">
              <FileUp size={14} className="shrink-0" style={{ color }} />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-[10px] text-dim">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Clear chosen file"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-dim"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 border border-dashed border-line-2 px-3 text-xs text-dim hover:border-brand hover:text-ink">
              <FileUp size={16} className="shrink-0" />
              {hasFile ? "Replace with another PDF…" : "Upload a PDF…"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="doc-url">Document link (PDF in Dropbox / SharePoint / Drive)</Label>
        <input
          id="doc-url"
          type="url"
          inputMode="url"
          value={d.external_url}
          onChange={(e) => set({ external_url: e.target.value })}
          placeholder="https://..."
          className="input"
          maxLength={2000}
        />
      </div>
      <div>
        <Label htmlFor="doc-tags">Tags (comma-separated)</Label>
        <input
          id="doc-tags"
          value={d.tags}
          onChange={(e) => set({ tags: e.target.value })}
          placeholder="DWV, venting, slope, drainage"
          className="input"
          maxLength={500}
        />
      </div>
      <div>
        <Label htmlFor="doc-notes">Notes</Label>
        <textarea
          id="doc-notes"
          value={d.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Anything useful: sections most referenced, install gotchas..."
          rows={3}
          className="input resize-y"
          maxLength={4000}
        />
      </div>
      {!admin && (
        <p className="bg-bg p-2 text-[10px] leading-relaxed text-dim">
          Paste a link to the document. Only admins can upload PDF files.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="min-h-11 flex-1 px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-50 sm:flex-none"
          style={{ background: color }}
        >
          {busy ? "Uploading…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-dim"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
