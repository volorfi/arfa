import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase";

/**
 * Shared auth + error helpers for /app/api/v1/* route handlers.
 *
 * `requireUser()` returns either the authed Supabase user OR a
 * pre-built NextResponse the route should return as-is. This keeps
 * every route's auth prelude down to a single if-check:
 *
 *   export async function GET() {
 *     const auth = await requireUser();
 *     if (auth instanceof NextResponse) return auth;
 *     // auth.user is typed User here
 *     …
 *   }
 *
 * Services in lib/services/ can also throw dedicated `*NotImplementedError`
 * classes; `serviceError()` wraps those into a 501 response with a
 * user-facing message, while other exceptions bubble to a 500.
 */

type Authed = { user: User };

export async function requireUser(): Promise<Authed | NextResponse> {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return NextResponse.json(
      { error: "auth_error", message: error.message },
      { status: 401 },
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Not authenticated." },
      { status: 401 },
    );
  }
  return { user };
}

/** Normalise a thrown error to a JSON response. Recognises our
 *  `NotImplementedError` family (via a `code` property equal to
 *  `"NOT_IMPLEMENTED"`) and turns those into 501; everything else is 500. */
export function serviceError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;

  if (code === "NOT_IMPLEMENTED") {
    return NextResponse.json(
      { error: "not_implemented", message },
      { status: 501 },
    );
  }
  // Log raw; the client sees a generic 500 to avoid leaking internals.
  // eslint-disable-next-line no-console
  console.error("[api/v1] service error:", err);
  return NextResponse.json(
    { error: "internal_error", message: "Something went wrong." },
    { status: 500 },
  );
}
