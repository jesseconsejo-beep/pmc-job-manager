import type { Profile, RoleCatalogRow, Tier } from "@/lib/types";

/**
 * Roles as data (role_catalog). Permissions follow the TIER; the role's label
 * is only a job title. The database is the lock (RLS + triggers); these helpers
 * only decide which pages and buttons to show.
 */

export const TIERS: readonly Tier[] = ["developer", "owner", "manager", "employee"];

export const TIER_LABEL: Record<Tier, string> = {
  developer: "Developer",
  owner: "Owner",
  manager: "Manager",
  employee: "Employee",
};

/**
 * The row's tier. Before 0005 is applied there is no tier column, so derive
 * it the way 0005's backfill does: owner -> owner, other admins -> manager.
 */
export function tierOf(row: Pick<RoleCatalogRow, "key" | "is_admin"> & { tier?: Tier | null }): Tier {
  if (row.tier && TIERS.includes(row.tier)) return row.tier;
  if (row.key === "developer") return "developer";
  if (row.key === "owner") return "owner";
  return row.is_admin ? "manager" : "employee";
}

type Who = Pick<Profile, "role" | "active"> | null | undefined;

function roleRow(profile: Who, catalog: readonly RoleCatalogRow[]): RoleCatalogRow | undefined {
  if (!profile || !profile.active) return undefined;
  return catalog.find((r) => r.key === profile.role);
}

/** role_catalog.is_admin: sees everything, manages people below owner. */
export function isAdmin(profile: Who, catalog: readonly RoleCatalogRow[]): boolean {
  return roleRow(profile, catalog)?.is_admin === true;
}

/** Tier developer or owner: company settings, branding, owner-level people. */
export function isSuper(profile: Who, catalog: readonly RoleCatalogRow[]): boolean {
  const row = roleRow(profile, catalog);
  if (!row) return false;
  const t = tierOf(row);
  return t === "developer" || t === "owner";
}

/** Catalog ordered for pickers: developer first, then by tier, then the catalog's sort. */
export function sortCatalog(catalog: readonly RoleCatalogRow[]): RoleCatalogRow[] {
  return [...catalog].sort(
    (a, b) => TIERS.indexOf(tierOf(a)) - TIERS.indexOf(tierOf(b)) || a.sort - b.sort || a.label.localeCompare(b.label),
  );
}

/** "Project Manager · Manager": the title with its tier beside it. */
export function roleOptionLabel(row: RoleCatalogRow): string {
  const tier = TIER_LABEL[tierOf(row)];
  return row.label.trim().toLowerCase() === tier.toLowerCase() ? row.label : `${row.label} · ${tier}`;
}
