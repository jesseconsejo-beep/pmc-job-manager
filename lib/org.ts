import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, safeTimeZone } from "@/lib/dates";
import type { OrgSettings, PublicBranding } from "@/lib/types";

/** What the app needs from org_settings, with defaults applied. */
export type Org = {
  companyName: string;
  companyShort: string;
  logoUrl: string | null;
  colorPrimary: string;
  colorSecondary: string;
  timezone: string;
  jobNumberPrefix: string;
  serviceNumberPrefix: string;
  assistantName: string;
  /** "database" when the row was read; "default" when it could not be (e.g. no session). */
  source: "database" | "default";
};

/** Neutral, company-free defaults (the Phase 1 palette). */
export const DEFAULT_ORG: Org = {
  companyName: "Job Manager",
  companyShort: "Job Manager",
  logoUrl: null,
  colorPrimary: "#f5c518",
  colorSecondary: "#5b8db8",
  timezone: DEFAULT_TIMEZONE,
  jobNumberPrefix: "",
  serviceNumberPrefix: "",
  assistantName: "Assistant",
  source: "default",
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function color(value: string | null | undefined, fallback: string): string {
  return value && HEX.test(value.trim()) ? value.trim() : fallback;
}

function text(value: string | null | undefined, fallback: string): string {
  const v = value?.trim();
  return v ? v : fallback;
}

/** Public URL of an object in the 'branding' bucket. */
export function logoUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/branding/${clean}`;
}

export function toOrg(row: OrgSettings): Org {
  return {
    companyName: text(row.company_name, DEFAULT_ORG.companyName),
    companyShort: text(row.company_short, DEFAULT_ORG.companyShort),
    logoUrl: logoUrl(row.logo_path),
    colorPrimary: color(row.color_primary, DEFAULT_ORG.colorPrimary),
    colorSecondary: color(row.color_secondary, DEFAULT_ORG.colorSecondary),
    timezone: safeTimeZone(row.timezone),
    jobNumberPrefix: row.job_number_prefix ?? "",
    serviceNumberPrefix: row.service_number_prefix ?? "",
    assistantName: text(row.assistant_name, DEFAULT_ORG.assistantName),
    source: "database",
  };
}

/** Branding-only Org from public_branding(); every other field keeps its default. */
function fromBranding(row: PublicBranding): Org {
  return {
    ...DEFAULT_ORG,
    companyName: text(row.company_name, DEFAULT_ORG.companyName),
    companyShort: text(row.company_short, DEFAULT_ORG.companyShort),
    logoUrl: logoUrl(row.logo_path),
    colorPrimary: color(row.color_primary, DEFAULT_ORG.colorPrimary),
    colorSecondary: color(row.color_secondary, DEFAULT_ORG.colorSecondary),
    assistantName: text(row.assistant_name, DEFAULT_ORG.assistantName),
    source: "database",
  };
}

/**
 * Branding for pages shown before sign-in (login, forgot, set-password).
 * public_branding() (migration 0004) is callable by anon; until 0004 is
 * applied the RPC errors and the neutral defaults are used.
 */
export const getBranding = cache(async (): Promise<Org> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("public_branding");
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return DEFAULT_ORG;
    return fromBranding(row);
  } catch {
    return DEFAULT_ORG;
  }
});

/**
 * The org_settings row, read once per request with the caller's session.
 * RLS only lets signed-in users read it (org_settings_read requires
 * auth.uid()); signed-out requests fall back to getBranding(), then to
 * DEFAULT_ORG.
 */
export const getOrg = cache(async (): Promise<Org> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("org_settings").select("*").limit(1).maybeSingle();
    if (error || !data) return getBranding();
    return toOrg(data);
  } catch {
    return getBranding();
  }
});
