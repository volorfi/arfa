"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { AssetSearch } from "@/components/dashboard/asset-search";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ComplianceBanner } from "@/components/dashboard/compliance-banner";

/**
 * Dashboard shell — fixed left sidebar + sticky top bar + scrolling main.
 *
 *   · Desktop (md+): the sidebar is always-visible, 256px column.
 *   · Mobile:        the sidebar is hidden; a hamburger in the topbar
 *                    opens it as a slide-in Sheet (focus trap + scroll
 *                    lock courtesy of Radix Dialog).
 *
 * The whole layout is one scroll container — no nested scroll —so that
 * sticky elements (top bar, sidebar header) behave predictably and the
 * back button restores scroll position.
 *
 * The navigation tree closes the mobile drawer automatically on click
 * via the `onNavigate` callback. We also listen for pathname changes as
 * a belt-and-braces fix in case future nav happens via router.push.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the path actually changes — covers
  // navigation triggered by anything other than the link click handler.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className="hidden w-64 shrink-0 border-r border-border bg-surface-1 md:block"
      >
        <div className="sticky top-0 h-dvh">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile sidebar — slide-in from the left */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] gap-0 p-0"
          showClose={false}
        >
          {/* Visually-hidden a11y headings (Sheet requires Title + Desc) */}
          <SheetTitle className="sr-only">Sidebar navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation links and account info.
          </SheetDescription>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Right column: top bar + main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            {/* Mobile menu trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search — flex-1 so it expands; capped via max-w on the input */}
            <div className="min-w-0 flex-1">
              <AssetSearch />
            </div>

            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {/* Per-spec compliance banner. State lives in this client
            component (DashboardShell) so dismissals persist across
            in-app navigation but reset on full page reload. */}
        <ComplianceBanner />
      </div>
    </div>
  );
}
