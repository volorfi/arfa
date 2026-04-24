"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  LayoutDashboard,
  PieChart,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MobileTabBar — fixed bottom navigation on viewports under md.
 *
 * Five tabs, matched to the five most-used dashboard sections. The
 * sidebar (SidebarNav) is hidden below md; this bar replaces it so
 * there's always exactly one navigation surface.
 *
 * Kept as a client component so `usePathname()` can highlight the
 * active tab without a round-trip. Z-index sits above the compliance
 * banner (z-20 here vs z-30 banner) — we want the legal notice visible
 * even while the tab bar is focused.
 */

const TABS = [
  { href: "/dashboard",            label: "Home",       icon: LayoutDashboard },
  { href: "/dashboard/screener",   label: "Screener",   icon: PieChart },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: Star },
  { href: "/dashboard/portfolio",  label: "Portfolio",  icon: Briefcase },
  { href: "/dashboard/alerts",     label: "Alerts",     icon: Bell },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-border bg-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-surface-1/80 md:hidden"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        // Exact for /dashboard; prefix for nested routes so
        // /dashboard/screener lights up "Screener" etc.
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
