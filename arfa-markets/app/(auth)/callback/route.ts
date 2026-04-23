import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * GET /callback
 *
 * The auth redirect target for:
 *   · Google OAuth (sign-in and sign-up)
 *   · Email confirmation links (password sign-up)
 *   · Password reset links (resetPasswordForEmail)
 *
 * Supabase returns an authorization `code` on the query string; we exchange
 * it for a session (which sets the persistent auth cookies via
 * @supabase/ssr), upsert the Prisma profile, then redirect to `next`
 * (default: /dashboard).
 *
 * If the `code` is missing or exchange fails, we redirect to /login with an
 * error flag the UI can surface later.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`,
    );
  }

  const supabase = createServerSupabase(cookies());
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Session cookies are now set. Create/refresh the Prisma profile + FREE
  // subscription row. Errors here are non-fatal — log and continue so the
  // user isn't blocked from reaching the dashboard.
  try {
    await ensureUserProfile();
  } catch (err) {
    console.error("[auth/callback] ensureUserProfile failed:", err);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

/** Block open-redirects: only allow same-origin relative paths. */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}
