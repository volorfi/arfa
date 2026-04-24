"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  Settings,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MobileTabBar — fixed bottom navigation on viewports under md.
 *
 * Five tabs matched to the five most-used sections. The full
 * grouped nav (Markets / Analysis / Portfolio) stays accessible on
 * mobile via the hamburger in DashboardShell, which opens the
 * SidebarNav in a slide-in drawer — so we don't need a "More" tab.
 *
 * Z-index sits below the compliance banner (z-20 vs z-30) so the
 * legal notice is still visible when the tab bar is focused.
 */

const MOBILE_TABS = [
  { href: "/dashboard",           label: "Home",      icon: LayoutDashboard },
  { href: "/dashboard/stocks",    label: "Stocks",    icon: TrendingUp },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/dashboard/ideafarm",  label: "Ideas",     icon: Sprout },
  { href: "/dashboard/settings",  label: "Settings",  icon: Settings },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-border bg-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-surface-1/80 md:hidden"
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        // Exact match for /dashboard; prefix match for nested routes so
        // e.g. /dashboard/stocks/AAPL still highlights "Stocks".
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
              active
                ? "text-primary"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            <Icon
              className={cn("h-5 w-5", active && "drop-shadow-sm")}
              aria-hidden
            />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
