import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * EmptyState — one place to land whenever a collection is empty.
 *
 *   <EmptyState
 *     icon={Star}
 *     title="No watchlists yet"
 *     description="Create a list to track tickers you're researching."
 *     ctaLabel="New watchlist"
 *     ctaHref="/dashboard/watchlists?new=1"
 *   />
 *
 * Pass children to render custom action(s) instead of / alongside the
 * ctaLabel + ctaHref pair (useful when the CTA is a client action, not
 * a link).
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-surface-1 px-6 py-10 md:px-8",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        <p className="max-w-xl text-sm leading-relaxed text-text-muted">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ctaLabel && ctaHref && (
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
