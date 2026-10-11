import { headers } from "next/headers";

/**
 * The site origin for links in auth emails (redirectTo). Prefers the
 * request's own host so preview deployments and localhost both work.
 * Supabase only honours redirect URLs on its allow list; the email
 * templates use {{ .SiteURL }} for the confirm link itself.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  }
  const origin = h.get("origin");
  return origin ?? "http://localhost:3000";
}
