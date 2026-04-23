import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

/**
 * Supabase clients.
 *
 * The @supabase/ssr package gives us two client factories that share the same
 * session-cookie format; we expose both from this file.
 *
 *   createBrowserSupabase()     — client components ("use client")
 *   createServerSupabase(store) — server components, route handlers, middleware
 *                                 (caller provides a cookie store compatible
 *                                 with Next's `cookies()` or `NextRequest`)
 *
 * Kept in one file per spec. The server factory does not import
 * `next/headers` itself, so this module is safe to import from client code —
 * only the server factory's runtime path uses cookies.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Thrown at import time so misconfiguration surfaces during build / first
  // request, not as a cryptic network error deep inside auth calls.
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
}

// ── Browser client ────────────────────────────────────────────────────────────
// Reads session from document.cookie. Use in client components.
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

// ── Server cookie store interface ────────────────────────────────────────────
// Minimal contract that both Next's `cookies()` (from next/headers) and
// `NextRequest.cookies` satisfy, so the same factory works in both contexts.
export type ServerCookieStore = {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options: CookieOptions) => void;
};

// ── Server client ────────────────────────────────────────────────────────────
// Pass in Next's cookie store. In server components you typically do:
//
//   import { cookies } from "next/headers";
//   const supabase = createServerSupabase(cookies());
//
// In route handlers / middleware you may need the setAll callback to write
// refreshed session cookies back to the response.
export function createServerSupabase(cookieStore: ServerCookieStore) {
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In server components (rendering), cookies are read-only; the
        // try/catch lets us ignore the expected Next error there.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set?.(name, value, options);
          });
        } catch {
          /* server component — cannot set cookies, safe to ignore */
        }
      },
    },
  });
}

/** Service-role client — server-only, bypasses Row-Level Security.
 *  Use sparingly: webhooks, background jobs, admin scripts. Never import
 *  into anything that runs in the browser. */
export function createServiceRoleSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  // Service role doesn't need cookie persistence — it's always acting as admin.
  return createServerClient(SUPABASE_URL!, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
