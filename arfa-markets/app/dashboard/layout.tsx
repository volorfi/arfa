import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createServerSupabase } from "@/lib/supabase";
import { ArfaLogo } from "@/components/marketing/arfa-logo";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

/**
 * Dashboard shell — authenticated. Middleware already redirects
 * unauthenticated users, but we re-check here as defence in depth and to
 * have the auth user handy for the nav.
 *
 * Minimal chrome for now; a proper sidebar + nav can layer on later.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="ARFA dashboard"
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArfaLogo variant="wordmark" />
            </Link>
            <nav aria-label="Dashboard" className="hidden items-center gap-5 md:flex">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
