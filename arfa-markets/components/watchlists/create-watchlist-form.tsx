"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createWatchlist } from "@/app/actions/watchlist";

/**
 * Create-watchlist form — small inline expander instead of a modal.
 * Click the button → reveal an input + Save / Cancel.
 *
 *   `disabled` = parent already knows the user is at their plan limit
 *                (e.g. FREE with 1 list); we still re-check server-side.
 */
export function CreateWatchlistForm({
  disabled,
  disabledReason,
}: {
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give the watchlist a name first.");
      return;
    }
    setPending(true);
    try {
      const result = await createWatchlist({ name: name.trim() });
      toast.success(`Created "${name.trim()}"`);
      setName("");
      setOpen(false);
      // Land on the new list's detail page so the user can immediately
      // start adding items.
      router.push(`/dashboard/watchlists/${result.id}`);
    } catch (err) {
      toast.error("Could not create", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : "Create a new watchlist"}
      >
        <Plus className="h-4 w-4" />
        New watchlist
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleCreate();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
        placeholder="Watchlist name"
        disabled={pending}
        autoFocus
        className="h-9 w-48 rounded-md border border-border bg-surface-1 px-3 text-sm text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="button" size="sm" onClick={handleCreate} disabled={pending || !name.trim()}>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Create
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}
