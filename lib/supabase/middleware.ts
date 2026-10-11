import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types";

/** Signed-out pages; a signed-in active member is sent home from these. */
const PUBLIC_PATHS = ["/login", "/forgot"];
/** Always passed through: the email-link landing verifies its own token. */
const OPEN_PATHS = ["/auth/confirm"];
/** Needs a session, but any profile state (invitees and resets land here). */
const SESSION_ANY_STATE_PATHS = ["/set-password"];
const PENDING_PATH = "/pending";

function matches(paths: readonly string[], pathname: string): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublic(pathname: string): boolean {
  return matches(PUBLIC_PATHS, pathname);
}

/**
 * Refreshes the Supabase session cookie on every request and routes people:
 *   /auth/confirm         -> always through (it verifies the emailed token)
 *   no session            -> /login (except /login and /forgot)
 *   session, /set-password-> through, active or not
 *   session, inactive     -> /pending
 *   session, active       -> away from /login, /forgot and /pending
 * Pages re-check this on the server; the middleware is the front door, not the lock.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Carry any refreshed auth cookies onto the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (matches(OPEN_PATHS, pathname)) return response;

  if (!userId) {
    return isPublic(pathname) ? response : redirectTo("/login");
  }

  if (matches(SESSION_ANY_STATE_PATHS, pathname)) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", userId)
    .maybeSingle();
  const active = profile?.active === true;

  if (!active) {
    return pathname === PENDING_PATH ? response : redirectTo(PENDING_PATH);
  }

  if (pathname === PENDING_PATH || isPublic(pathname)) {
    return redirectTo("/");
  }
  return response;
}
