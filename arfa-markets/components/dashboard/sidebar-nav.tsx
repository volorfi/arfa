"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart2,
  Bell,
  BrainCircuit,
  FileText,
  Landmark,
  Layers,
  LayoutDashboard,
  Newspaper,
  Package,
  PieChart,
  Settings,
  Sliders,
  Sprout,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { ArfaLogo } from "@/components/marketing/arfa-logo";
import { PlanBadge } from "@/components/plan-badge";

/**
 * Sidebar content — rendered both as the fixed desktop column AND as the
 * slide-in mobile drawer (see DashboardShell). Contents:
 *
 *   Logo
 *   Three grouped nav sections: Markets · Analysis · Portfolio
 *   Secondary: Settings
 *   Footer: user avatar + plan badge
 *
 * "Soon" badges mark destinations that don't have pages yet — the links
 * still render (so the IA is visible end-to-end) but clearly signal
 * work-in-progress. When a page ships, drop the `soon` flag on its nav
 * entry; nothing else changes.
 *
 * The nav column itself scrolls (`overflow-y-auto`) so adding more items
 * never pushes the plan badge below the fold.
 */

interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Page doesn't exist yet — show a "Soon" chip next to the label. */
  soon?: boolean;
}

interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "Markets",
    items: [
      { href: "/dashboard",             label: "Overview",    icon: LayoutDashboard },
      { href: "/dashboard/stocks",      label: "Stocks",      icon: TrendingUp,      soon: true },
      { href: "/dashboard/bonds",       label: "Bonds",       icon: Landmark,        soon: true },
      { href: "/dashboard/commodities", label: "Commodities", icon: Package,         soon: true },
      { href: "/dashboard/fx",          label: "FX",          icon: ArrowLeftRight,  soon: true },
      { href: "/dashboard/options",     label: "Options",     icon: Layers,          soon: true },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/dashboard/screener",    label: "Screener",    icon: Sliders },
      { href: "/dashboard/signals",     label: "Signals",     icon: Zap,          soon: true },
      { href: "/dashboard/ideafarm",    label: "Idea Farm",   icon: Sprout,       soon: true },
      { href: "/dashboard/research-os", label: "Research OS", icon: BrainCircuit, soon: true },
      { href: "/dashboard/sentiment",   label: "Sentiment",   icon: BarChart2,    soon: true },
      { href: "/dashboard/news",        label: "News",        icon: Newspaper,    soon: true },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/dashboard/portfolio",   label: "Portfolio",   icon: PieChart },
      { href: "/dashboard/watchlists",  label: "Watchlists",  icon: Star },
      { href: "/dashboard/alerts",      label: "Alerts",      icon: Bell },
      { href: "/dashboard/notes",       label: "Notes",       icon: FileText,   soon: true },
    ],
  },
];

const SECONDARY_NAV: NavItemConfig[] = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

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
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href="/dashboard"
          aria-label="ARFA dashboard"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={onNavigate}
        >
          <ArfaLogo variant="wordmark" />
        </Link>
      </div>

      {/* Grouped primary nav + secondary. `overflow-y-auto` so long nav
          lists never push the footer below the viewport. */}
      <nav
        aria-label="Dashboard navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {NAV_GROUPS.map((group, idx) => (
          <div key={group.label} className={cn(idx > 0 && "mt-4")}>
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-4">
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
        </div>
      </nav>

      {/* User + plan footer */}
      <div className="shrink-0 border-t border-border p-3">
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
  soon,
  onNavigate,
}: NavItemConfig & {
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
            active
              ? "text-primary"
              : "text-text-faint group-hover:text-text-muted",
          )}
        />
        <span className="flex-1">{label}</span>
        {soon && <SoonBadge />}
      </Link>
    </li>
  );
}

function SoonBadge() {
  return (
    <span
      aria-label="Coming soon"
      className="ml-auto rounded-full bg-surface-offset/10 px-1.5 py-0.5 text-[10px] font-medium text-text-faint dark:bg-surface-offset/20"
    >
      Soon
    </span>
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
  const initials =
    name
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
