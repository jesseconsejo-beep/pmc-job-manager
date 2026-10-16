"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Calendar, Hammer, MapPin, Search, Timer, User } from "lucide-react";
import { diffDays, formatDate } from "@/lib/dates";
import { formatHours, SERVICE_STATUS_COLOR, SERVICE_STATUS_LABEL } from "@/lib/service";
import type { ServiceCall, ServiceStatus } from "@/lib/types";

/** What a list card needs (the page trims each row down to this). */
export type ServiceCard = Pick<
  ServiceCall,
  "id" | "service_code" | "project_name" | "customer_name" | "company_name" | "address" | "scheduled_date" | "status" | "created_at"
> & { hours: number };

export type ServiceFilter = "all" | ServiceStatus;

const TABS: { id: ServiceFilter; label: string; color: string }[] = [
  { id: "all", label: "All", color: "var(--color-primary)" },
  { id: "upcoming", label: SERVICE_STATUS_LABEL.upcoming, color: SERVICE_STATUS_COLOR.upcoming },
  { id: "in_progress", label: SERVICE_STATUS_LABEL.in_progress, color: SERVICE_STATUS_COLOR.in_progress },
  { id: "complete", label: SERVICE_STATUS_LABEL.complete, color: SERVICE_STATUS_COLOR.complete },
  { id: "cancelled", label: SERVICE_STATUS_LABEL.cancelled, color: "var(--color-dim)" },
];

// Open calls first (in progress, then upcoming), then the finished ones.
const RANK: Record<ServiceStatus, number> = { in_progress: 0, upcoming: 1, complete: 2, cancelled: 3 };
const isOpen = (s: ServiceStatus) => s === "upcoming" || s === "in_progress";

function compareCalls(a: ServiceCard, b: ServiceCard): number {
  if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
  // Open calls: soonest date first. Finished calls: most recent first. Undated last.
  if (a.scheduled_date !== b.scheduled_date) {
    if (!a.scheduled_date) return 1;
    if (!b.scheduled_date) return -1;
    const byDate = a.scheduled_date.localeCompare(b.scheduled_date);
    return isOpen(a.status) ? byDate : -byDate;
  }
  return b.created_at.localeCompare(a.created_at);
}

function matches(c: ServiceCard, q: string): boolean {
  if (!q) return true;
  return [c.service_code, c.project_name, c.customer_name, c.company_name, c.address]
    .some((v) => v?.toLowerCase().includes(q));
}

export function ServiceList({
  calls,
  initialFilter,
  today,
}: {
  calls: ServiceCard[];
  initialFilter: ServiceFilter;
  today: string;
}) {
  const [filter, setFilter] = useState<ServiceFilter>(initialFilter);
  const [query, setQuery] = useState("");

  const choose = (f: ServiceFilter) => {
    setFilter(f);
    // Keep the tab in the URL so Back from a call lands on the same tab.
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("status");
    else url.searchParams.set("status", f);
    window.history.replaceState(null, "", url);
  };

  const q = query.trim().toLowerCase();
  const searched = calls.filter((c) => matches(c, q));
  const counts: Record<ServiceFilter, number> = {
    all: searched.length,
    upcoming: 0,
    in_progress: 0,
    complete: 0,
    cancelled: 0,
  };
  for (const c of searched) counts[c.status] += 1;
  const visible = searched.filter((c) => filter === "all" || c.status === filter).sort(compareCalls);

  return (
    <>
      <div role="tablist" aria-label="Filter by status" className="mb-3 grid grid-cols-5 border-b border-line">
        {TABS.map((t) => {
          const active = filter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => choose(t.id)}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-0.5 pb-1.5 pt-1"
              style={{ borderColor: active ? t.color : "transparent", color: active ? t.color : "var(--color-dim)" }}
            >
              <span className="font-display text-lg font-semibold leading-none">{counts[t.id]}</span>
              <span className="text-center font-display text-[10px] font-semibold uppercase leading-tight tracking-[1px]">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {calls.length > 0 && (
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, customer, address..."
            aria-label="Search service calls"
            className="input !pl-9"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-line bg-surface px-6 py-10 text-center">
          <Hammer size={40} className="mx-auto mb-3 text-faint" />
          <div className="mb-3 font-display text-sm uppercase tracking-[1.5px] text-dim">
            {q ? "No calls match that search" : `No ${filter === "all" ? "" : SERVICE_STATUS_LABEL[filter].toLowerCase()} service calls`}
          </div>
          {filter === "all" && !q && (
            <Link
              href="/service/new"
              className="inline-flex min-h-11 items-center bg-brand px-4 font-display text-xs font-bold uppercase tracking-[1.5px] text-bg"
            >
              + Create first call
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((c) => (
            <CallCard key={c.id} call={c} today={today} />
          ))}
        </div>
      )}
    </>
  );
}

function CallCard({ call: c, today }: { call: ServiceCard; today: string }) {
  const color = SERVICE_STATUS_COLOR[c.status];
  const open = isOpen(c.status);
  const days = c.scheduled_date ? diffDays(today, c.scheduled_date) : null;
  const when = open && days === 0 ? "Today" : open && days === 1 ? "Tomorrow" : null;
  const late = c.status === "upcoming" && days !== null && days < 0;

  return (
    <Link
      href={`/service/${c.id}`}
      className={`block border border-line bg-surface p-3.5 transition hover:border-brand ${c.status === "cancelled" ? "opacity-60" : ""}`}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-bold tracking-[1.5px] text-brand">{c.service_code || "S-DRAFT"}</span>
            <span className="min-w-0 break-words font-display text-base font-semibold tracking-wide">
              {c.project_name || "Untitled service call"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-dim">
            {c.customer_name && (
              <span className="flex min-w-0 items-center gap-1">
                <User size={11} className="shrink-0" /> <span className="truncate">{c.customer_name}</span>
              </span>
            )}
            {c.company_name && (
              <span className="flex min-w-0 items-center gap-1">
                <Building2 size={11} className="shrink-0" /> <span className="truncate">{c.company_name}</span>
              </span>
            )}
            {c.address && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin size={11} className="shrink-0" /> <span className="break-words">{c.address}</span>
              </span>
            )}
            {c.scheduled_date && (
              <span className={`flex items-center gap-1 ${late ? "text-danger" : when ? "font-bold text-warn" : ""}`}>
                <Calendar size={11} className="shrink-0" />
                {when ?? formatDate(c.scheduled_date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {c.hours > 0 && (
              <span className="flex items-center gap-1">
                <Timer size={11} className="shrink-0" /> {formatHours(c.hours)}h
              </span>
            )}
          </div>
        </div>
        <span
          className="shrink-0 whitespace-nowrap border px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
          style={{ color, borderColor: color }}
        >
          {SERVICE_STATUS_LABEL[c.status]}
        </span>
      </div>
    </Link>
  );
}
