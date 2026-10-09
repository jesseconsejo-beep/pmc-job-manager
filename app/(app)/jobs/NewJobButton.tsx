"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createJob, type NewJobState } from "./actions";
import { ErrorNote, Label } from "@/components/ui";

const initial: NewJobState = { error: null };

/** "+ NEW JOB" button and the Phase 1 NewJobModal (name + number). */
export function NewJobButton({ defaultNumber, openOnLoad = false }: { defaultNumber: string; openOnLoad?: boolean }) {
  const [open, setOpen] = useState(openOnLoad);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="clip-cta flex min-h-11 shrink-0 items-center gap-2 bg-brand px-4 font-display text-[13px] font-bold uppercase tracking-[1.5px] text-bg"
      >
        <Plus size={16} strokeWidth={3} /> New job
      </button>
      {open && <NewJobModal defaultNumber={defaultNumber} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewJobModal({ defaultNumber, onClose }: { defaultNumber: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(createJob, initial);
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-job-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md border-2 border-brand bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="new-job-title" className="font-display text-xl uppercase tracking-[1.5px]">
            New job
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center text-ink">
            <X size={20} />
          </button>
        </div>
        <form action={action}>
          <ErrorNote message={state.error} />
          <div className="mb-3">
            <Label htmlFor="job_name">Job name</Label>
            <input
              ref={nameRef}
              id="job_name"
              name="job_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Surrey Memorial Tower B"
              className="input"
            />
          </div>
          <div className="mb-3">
            <Label htmlFor="job_number">Job number</Label>
            <input id="job_number" name="job_number" defaultValue={defaultNumber} placeholder={`${defaultNumber}014`} className="input" />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || pending}
            className="mt-3 min-h-12 w-full bg-brand font-display text-sm font-bold uppercase tracking-[1.5px] text-bg disabled:bg-surface-2 disabled:text-faint"
          >
            {pending ? "Creating…" : "Create job"}
          </button>
        </form>
      </div>
    </div>
  );
}
