"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Error boundary for asset detail + history pages. Offers "Try again"
 *  + "Back to dashboard" so users aren't stuck on a broken deep link. */
export default function AssetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[asset/error]", error);
    }
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
            Couldn&apos;t load this asset
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            The asset data failed to load. This is usually temporary —
            retrying is safe.
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
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
