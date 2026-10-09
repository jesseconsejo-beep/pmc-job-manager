"use client";

import { useActionState, useState } from "react";
import { Building2, Calendar, Check, ExternalLink, MapPin, Pencil, X } from "lucide-react";
import { updateJob } from "../actions";
import { ErrorNote, Label } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { mapsUrl, STATUS_COLOR, STATUS_LABEL } from "@/lib/jobs";
import { JOB_STATUSES, type Job } from "@/lib/types";
import type { ActionResult } from "@/lib/validate";

type HeaderJob = Pick<
  Job,
  "id" | "job_number" | "job_name" | "client" | "location" | "start_date" | "target_date" | "notes" | "status"
>;

/** Phase 1 JobView header: read view with an EDIT HEADER toggle. */
export function JobHeader({ job }: { job: HeaderJob }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    const result = await updateJob(job.id, prev, form);
    if (result.ok) setEditing(false); // leave edit mode once a save succeeds
    return result;
  }, null);

  return (
    <section className="mb-5 border border-line bg-surface">
      <div className="h-1 bg-brand" />
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold tracking-[2px] text-brand">JOB #{job.job_number || "—"}</div>
            <h1 className="mt-1 break-words font-display text-[26px] font-semibold leading-tight tracking-wide">{job.job_name}</h1>
            <span
              className="mt-2 inline-block border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ color: STATUS_COLOR[job.status], borderColor: STATUS_COLOR[job.status] }}
            >
              {STATUS_LABEL[job.status]}
            </span>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-11 shrink-0 items-center gap-1.5 border border-line bg-surface-2 px-3 font-display text-[11px] uppercase tracking-[1.5px] text-ink hover:border-brand"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <form action={action}>
            <ErrorNote message={state && !state.ok ? state.error : null} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField name="job_name" label="Job name" defaultValue={job.job_name} required />
              <TextField name="job_number" label="Job number" defaultValue={job.job_number} />
              <TextField name="client" label="Client / GC" defaultValue={job.client} />
              <TextField name="location" label="Location / address" defaultValue={job.location} />
              <TextField name="start_date" label="Start date" type="date" defaultValue={job.start_date} />
              <TextField name="target_date" label="Target completion" type="date" defaultValue={job.target_date} />
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={job.status} className="input">
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Job notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={job.notes ?? ""}
                  placeholder="Site access notes, parking, security, key contacts..."
                  className="input resize-y"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg disabled:opacity-60"
              >
                <Check size={14} /> {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex min-h-11 items-center gap-1.5 border border-line px-4 font-display text-xs uppercase tracking-[1.5px] text-ink"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoCell label="Client / GC" value={job.client} icon={<Building2 size={12} className="shrink-0 text-dim" />} />
            <LocationCell location={job.location} />
            <InfoCell
              label="Start"
              value={job.start_date ? formatDate(job.start_date) : null}
              icon={<Calendar size={12} className="shrink-0 text-dim" />}
            />
            <InfoCell
              label="Target"
              value={job.target_date ? formatDate(job.target_date) : null}
              icon={<Calendar size={12} className="shrink-0 text-dim" />}
            />
            {job.notes && (
              <div className="col-span-2 border-t border-line pt-3 sm:col-span-4">
                <div className="mb-1 text-[10px] tracking-[1.5px] text-dim">NOTES</div>
                <div className="whitespace-pre-wrap break-words text-xs">{job.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: "text" | "date";
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className="input" />
    </div>
  );
}

function InfoCell({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">{label}</div>
      <div className="flex items-center gap-1.5 text-[13px]">
        {icon}
        {value ? <span className="break-words">{value}</span> : <span className="text-faint">—</span>}
      </div>
    </div>
  );
}

function LocationCell({ location }: { location: string | null }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] uppercase tracking-[1.5px] text-dim">Location</div>
      {location ? (
        <>
          <a
            href={mapsUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 border-b border-dashed border-steel-dark pb-0.5 text-[13px] text-steel hover:border-brand hover:text-brand"
          >
            <MapPin size={12} className="shrink-0" />
            <span className="break-words">{location}</span>
            <ExternalLink size={10} className="shrink-0 opacity-60" />
          </a>
          <div className="mt-1 text-[9px] tracking-wider text-faint">TAP TO OPEN IN MAPS</div>
        </>
      ) : (
        <div className="text-[13px] text-faint">—</div>
      )}
    </div>
  );
}
