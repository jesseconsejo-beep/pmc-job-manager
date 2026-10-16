"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { History, Mail, MapPin, Pencil, Phone, Printer, Trash2 } from "lucide-react";
import { deleteServiceCall, setServiceStatus } from "../actions";
import { ServiceCallEditor, StatusButton } from "../ServiceCallEditor";
import { BackLink, ErrorNote } from "@/components/ui";
import { formatTimestamp } from "@/lib/dates";
import { mapsUrl, telHref } from "@/lib/jobs";
import type { Person } from "@/lib/people";
import { workOrderMailto } from "@/lib/service";
import { SERVICE_STATUSES, type ServiceCall, type ServiceStatus } from "@/lib/types";
import { ServicePhotos, type PhotoView } from "./ServicePhotos";
import { WorkOrderSheet, type SheetCompany } from "./WorkOrderSheet";

export type { PhotoView };
export type HistoryLine = { id: string; description: string; who: string | null; at: string };

/** Phase 1 ServiceCallView: the paper work order, status, photos and actions; EDIT swaps in the editor. */
export function ServiceCallScreen({
  call,
  fingerprint,
  people,
  today,
  timezone,
  admin,
  company,
  photos,
  photosError,
  photosLimited,
  history,
  startEditing,
}: {
  call: ServiceCall;
  fingerprint: string;
  people: Person[];
  today: string;
  timezone: string;
  admin: boolean;
  company: SheetCompany;
  photos: PhotoView[];
  photosError: string | null;
  photosLimited: boolean;
  history: HistoryLine[];
  startEditing: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [status, setOptimisticStatus] = useOptimistic<ServiceStatus, ServiceStatus>(call.status, (_, next) => next);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const names = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const shown: ServiceCall = { ...call, status };

  if (editing) {
    return (
      <ServiceCallEditor
        call={call}
        fingerprint={fingerprint}
        people={people}
        today={today}
        onDone={() => {
          setEditing(false);
          // Drop ?edit=1 so a reload shows the work order, not the editor.
          if (window.location.search.includes("edit=")) window.history.replaceState(null, "", window.location.pathname);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const changeStatus = (next: ServiceStatus) => {
    if (next === status) return;
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const r = await setServiceStatus(call.id, next);
      if (!r.ok) setError(r.error);
    });
  };

  const remove = () => {
    const label = call.service_code || call.project_name || "this service call";
    if (!window.confirm(`Delete ${label}? Its photos and history go with it. This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      // Redirects to the list on success.
      const r = await deleteServiceCall(call.id);
      if (r && !r.ok) setError(r.error);
    });
  };

  const btn =
    "flex min-h-11 items-center justify-center gap-1.5 px-4 font-display text-xs uppercase tracking-[1.5px]";

  return (
    <>
      <div data-print="hide">
        <BackLink href="/service" label="Service Calls" />
        {(call.customer_phone || call.address) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {call.customer_phone && (
              <a href={telHref(call.customer_phone)} className={`${btn} border border-line bg-surface text-ink hover:border-brand`}>
                <Phone size={14} /> Call
              </a>
            )}
            {call.address && (
              <a
                href={mapsUrl(call.address)}
                target="_blank"
                rel="noreferrer"
                className={`${btn} border border-line bg-surface text-ink hover:border-brand ${call.customer_phone ? "" : "col-span-2"}`}
              >
                <MapPin size={14} /> Directions
              </a>
            )}
          </div>
        )}
      </div>

      <WorkOrderSheet call={shown} names={names} company={company} timezone={timezone} />

      <div data-print="hide">
        <div ref={errorRef}>
          <ErrorNote message={error} />
        </div>

        <section className="mb-4 border border-line bg-surface p-3">
          <h2 className="mb-2 text-[10px] uppercase tracking-[1.5px] text-dim">Status</h2>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="Status">
            {SERVICE_STATUSES.map((s) => (
              <StatusButton key={s} status={s} active={status === s} disabled={busy} onClick={() => changeStatus(s)} />
            ))}
          </div>
        </section>

        <ServicePhotos callId={call.id} photos={photos} loadError={photosError} limited={photosLimited} />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              window.scrollTo({ top: 0 });
            }}
            className={`${btn} col-span-2 bg-brand font-bold text-bg sm:col-span-1`}>
            <Pencil size={14} /> Edit work order
          </button>
          <button type="button" onClick={() => window.print()} className={`${btn} bg-steel font-bold text-bg`}>
            <Printer size={14} /> Print / PDF
          </button>
          <a
            href={workOrderMailto(shown, company.name, company.short, names)}
            className={`${btn} border border-line text-ink hover:border-brand`}
          >
            <Mail size={14} /> Email work order
          </a>
          {admin && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Delete service call"
              title="Delete service call (admins only)"
              className={`${btn} col-span-2 border border-line text-danger hover:border-danger disabled:opacity-50 sm:col-span-1 sm:ml-auto`}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        {history.length > 0 && (
          <details className="mb-4 border border-line bg-surface">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-display text-xs uppercase tracking-[1.5px] text-dim">
              <History size={14} /> History ({history.length})
            </summary>
            <ul className="border-t border-line px-3 py-2">
              {history.map((h) => (
                <li key={h.id} className="border-b border-line py-1.5 text-[11px] last:border-0">
                  <div className="break-words text-ink">{h.description}</div>
                  <div className="mt-0.5 text-[10px] text-faint">
                    {formatTimestamp(h.at, timezone)}
                    {h.who ? ` · ${h.who}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
