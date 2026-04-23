import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Auth middleware.
 *
 * Runs on every request matched by the `config.matcher` below. Its jobs:
 *
 *   1. Refresh the Supabase session cookie if needed (so downstream
 *      server components see a valid session without extra work).
 *   2. Gate /dashboard/* — unauthenticated users are redirected to
 *      /login?next=<original>.
 *   3. Bounce authenticated users away from /login and /register to
 *      /dashboard (the account is already active, no reason to show
 *      sign-in forms).
 *
 * The (auth) and (marketing) route groups disappear at URL level, so the
 * paths here are /login, /register, /reset-password (public) and
 * /, /pricing, /docs, etc. (also public — not listed explicitly; anything
 * not under /dashboard is reachable).
 *
 * Pattern source: @supabase/ssr docs (updateSession pattern for Next.js).
 */

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ONLY_PATHS = ["/login", "/register"];
const LOGIN_PATH = "/login";
const DEFAULT_AUTHED_DESTINATION = "/dashboard";

export async function middleware(request: NextRequest) {
  // Start with a pass-through response we can mutate below.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refreshes an expiring session if there's a valid refresh token; returns
  // null for unauthenticated requests.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthPage = AUTH_ONLY_PATHS.some((p) => pathname === p);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    // Already signed in — send them where they were going, or to dashboard.
    const nextParam = request.nextUrl.searchParams.get("next");
    const dest =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : DEFAULT_AUTHED_DESTINATION;
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything EXCEPT Next.js internals, common static files, and
    // the Stripe webhook route (which needs the raw request body for
    // signature verification — middleware's response wrapping breaks that).
    "/((?!_next/static|_next/image|favicon.ico|favicon.jpg|robots.txt|sitemap.xml|api/stripe/webhook|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$).*)",
  ],
};
