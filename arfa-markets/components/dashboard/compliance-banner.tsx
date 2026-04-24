"use client";

import * as React from "react";
import { ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Compliance banner — fixed at the bottom of every dashboard page.
 *
 * Per spec, dismissed state is stored *in memory only* (component
 * useState) so it reappears on a fresh page load. Mounted inside
 * DashboardShell so its state persists across in-app navigations
 * (the layout doesn't unmount when switching dashboard pages).
 */
export function ComplianceBanner() {
  const [open, setOpen] = React.useState(true);

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Compliance notice"
      className="pointer-events-none sticky bottom-0 z-30 flex justify-center px-4 pb-3"
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-lg border border-border bg-surface-1/95 px-4 py-2.5 shadow-md backdrop-blur supports-[backdrop-filter]:bg-surface-1/80">
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-text-muted"
          aria-hidden
        />
        <p className="flex-1 text-xs leading-relaxed text-text-muted">
          ARFA scores are for informational purposes only and do not
          constitute investment advice.
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="h-7 w-7 shrink-0 text-text-muted hover:text-text-primary"
          aria-label="Dismiss notice"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
