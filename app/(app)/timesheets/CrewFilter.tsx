"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Person } from "@/lib/people";

export type StatusFilter = "all" | "unapproved" | "approved";

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unapproved", label: "Unapproved" },
  { id: "approved", label: "Approved" },
];

function href(employee: string, status: StatusFilter): string {
  const q = new URLSearchParams({ view: "crew" });
  if (employee) q.set("employee", employee);
  if (status !== "all") q.set("status", status);
  return `/timesheets?${q.toString()}`;
}

/** "All crew" filters: one crew member (or everyone) and approval state, kept in the URL. */
export function CrewFilter({ people, employee, status }: { people: Person[]; employee: string; status: StatusFilter }) {
  const router = useRouter();
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-center">
      <select
        value={employee}
        onChange={(e) => router.push(href(e.target.value, status))}
        aria-label="Crew member"
        className="input"
      >
        <option value="">All crew</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.active ? "" : " (inactive)"}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = s.id === status;
          return (
            <Link
              key={s.id}
              href={href(employee, s.id)}
              aria-current={active ? "true" : undefined}
              className={`flex min-h-11 items-center border-[1.5px] px-3 font-display text-[11px] font-semibold uppercase tracking-[1.5px] ${
                active ? "border-brand bg-brand text-bg" : "border-line bg-bg text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
