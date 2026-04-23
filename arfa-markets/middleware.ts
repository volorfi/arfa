import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth middleware.
 *
 * Runs on every request matched by the `config.matcher` below. Its job:
 *
 *   1. Refresh the Supabase session cookie if needed (so downstream
 *      server components see a valid session without extra work).
 *   2. Gate /dashboard/* — if the request path is under /dashboard and
 *      there's no authenticated user, redirect to /login?next=<original>.
 *
 * Everything else passes through unchanged.
 *
 * Pattern source: @supabase/ssr docs (updateSession pattern for Next.js).
 */

const PROTECTED_PREFIXES = ["/dashboard"];
const LOGIN_PATH = "/login";

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
        setAll(cookiesToSet) {
          // Copy cookies onto the incoming request so any downstream
          // handler in this same request sees the refreshed session,
          // then onto the outgoing response so the browser persists it.
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

  // Touching getUser() refreshes an expiring session if there's a valid
  // refresh token, and returns null for unauthenticated requests.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    // Preserve the originally requested path so /login can redirect back
    // after a successful sign-in.
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything EXCEPT Next.js internals and common static files.
    // Keep this list in sync with any new public asset types you add.
    "/((?!_next/static|_next/image|favicon.ico|favicon.jpg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$).*)",
  ],
};
