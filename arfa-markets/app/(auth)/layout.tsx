import Link from "next/link";

import { ArfaLogo } from "@/components/marketing/arfa-logo";
import { ThemeToggle } from "@/components/marketing/theme-toggle";

/**
 * Shared shell for /login, /register, /reset-password.
 * Centered card layout, ARFA logo at top, theme toggle in the corner.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Top rail — logo left, theme toggle right */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 md:px-6">
        <Link
          href="/"
          aria-label="ARFA home"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArfaLogo variant="wordmark" />
        </Link>
        <ThemeToggle />
      </div>

      {/* Centered card */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer strip */}
      <footer className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
        <p className="text-xs text-text-faint">
          ARFA is not a broker, dealer, or investment adviser.
        </p>
      </footer>
    </div>
  );
}
