"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteWatchlist } from "@/app/actions/watchlist";

/** Inline destructive button — confirms via window.confirm() (no Radix
 *  AlertDialog needed for now). */
export function DeleteWatchlistButton({
  watchlistId,
  watchlistName,
  redirectAfter,
}: {
  watchlistId: string;
  watchlistName: string;
  /** Navigate here after a successful delete; defaults to staying put. */
  redirectAfter?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handle() {
    if (
      !window.confirm(
        `Delete "${watchlistName}"? This removes the list and all its items. This action cannot be undone.`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      await deleteWatchlist({ watchlistId });
      toast.success(`Deleted "${watchlistName}"`);
      if (redirectAfter) router.push(redirectAfter);
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={pending}
      className="h-8 px-2 text-text-muted hover:text-destructive"
      aria-label={`Delete ${watchlistName}`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
