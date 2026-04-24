"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dashboard-wide error boundary.
 *
 * Caught by Next.js whenever anything in /dashboard/* throws during
 * rendering or a server action. Renders a friendly card with a retry
 * button that calls the framework-provided `reset()`.
 *
 * Client component per App Router requirements — error boundaries must
 * be client components so they can hold the reset closure.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Hook to analytics so we notice error spikes. Currently stubs to
    // console in dev.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[dashboard/error]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              We hit an unexpected error loading this page. Retrying usually
              works — if it doesn&apos;t, refresh the page and we&apos;ll log
              the failure.
            </p>
          </div>
          {error.digest && (
            <p className="font-mono text-[11px] text-text-faint">
              ref: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => reset()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
