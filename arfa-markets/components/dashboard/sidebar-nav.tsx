"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Settings,
  Sliders,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { ArfaLogo } from "@/components/marketing/arfa-logo";
import { PlanBadge } from "@/components/plan-badge";

/**
 * The sidebar's contents — extracted so we can render it both as a fixed
 * desktop column AND as a slide-in mobile drawer (see DashboardShell).
 *
 *   Logo
 *   Primary nav: Overview, Screener, Watchlists, Portfolio, Alerts
 *   Secondary nav: Settings
 *   Footer: Plan badge + user avatar + email
 *
 * The active item is the one whose href is a prefix of the current path
 * (so /dashboard/watchlists/123 highlights "Watchlists").
 */

const PRIMARY_NAV = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/screener",   label: "Screener",   icon: Sliders },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: Star },
  { href: "/dashboard/portfolio",  label: "Portfolio",  icon: PieChart },
  { href: "/dashboard/alerts",     label: "Alerts",     icon: Bell },
] as const;

const SECONDARY_NAV = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({
  onNavigate,
}: {
  /** Called whenever a nav link is clicked — used by the mobile drawer
   *  to close itself after navigation. Optional. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link
          href="/dashboard"
          aria-label="ARFA dashboard"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={onNavigate}
        >
          <ArfaLogo variant="wordmark" />
        </Link>
      </div>

      {/* Primary nav */}
      <nav aria-label="Dashboard navigation" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        <hr className="my-4 border-border" />

        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        {/* Item-list-only items beyond settings (Screener / Watchlists / etc.)
            don't have pages yet; nav links resolve to 404 until built. The
            sidebar still renders them so the IA is visible end-to-end. */}
      </nav>

      {/* User + plan footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <UserAvatar
            name={user?.name ?? user?.email ?? "User"}
            image={user?.image ?? null}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {user?.name ?? user?.email ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-text-muted">
              {user?.email ?? "—"}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
          <span className="text-xs text-text-muted">Plan</span>
          <PlanBadge plan={user?.plan ?? "FREE"} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-text-muted hover:bg-surface-2 hover:text-text-primary",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-colors",
            active ? "text-primary" : "text-text-faint group-hover:text-text-muted",
          )}
        />
        {label}
      </Link>
    </li>
  );
}

function UserAvatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  // Initials fallback. Two letters max, uppercased.
  const initials = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "U";

  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary"
    >
      {initials}
    </span>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
