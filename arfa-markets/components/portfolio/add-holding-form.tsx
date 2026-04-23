"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addHolding } from "@/app/actions/portfolio";
import { SCREENER_ROWS } from "@/lib/mock/screener";
import { uiClassToPrisma } from "@/components/watchlists/watchlist-item-row";

/**
 * Add-holding form — collapsed by default; click "Add holding" to expand.
 *
 * Asset picker uses the same search-then-select pattern as the watchlist
 * form, but here the server action needs full asset details (name,
 * ticker, assetClass), not just a symbol. We derive those from the
 * catalogue row the user selected.
 */
export function AddHoldingForm() {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  // Asset search state
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<(typeof SCREENER_ROWS)[number] | null>(null);

  const [quantity, setQuantity] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [date, setDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );

  const matches = React.useMemo(() => {
    if (selected) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SCREENER_ROWS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ticker.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query, selected]);

  function reset() {
    setQuery("");
    setSelected(null);
    setQuantity("");
    setPrice("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick an asset first.");
      return;
    }
    const q = Number(quantity);
    const p = Number(price);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      toast.error("Purchase price must be a positive number.");
      return;
    }

    setPending(true);
    try {
      await addHolding({
        assetId: selected.assetId,
        displayName: selected.name,
        ticker: selected.ticker,
        assetClass: uiClassToPrisma(selected.assetClass) as
          | "EQUITY"
          | "ETF"
          | "BOND_CORP"
          | "BOND_SOVEREIGN"
          | "FX"
          | "COMMODITY"
          | "INDEX"
          | "CRYPTO"
          | "MACRO",
        quantity: q,
        purchasePrice: p,
        purchaseDate: date,
      });
      toast.success(`Added ${selected.ticker}`);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error("Could not add", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add holding
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-xs md:grid-cols-[2fr,repeat(3,1fr)_auto] md:items-end md:gap-3"
    >
      {/* Asset picker */}
      <div className="relative">
        <label className="mb-1 block text-[11px] font-medium text-text-muted">
          Asset
        </label>
        {selected ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="truncate">
              <span className="font-medium text-text-primary">
                {selected.name}
              </span>{" "}
              <span className="text-text-muted">({selected.ticker})</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-text-muted underline-offset-2 hover:underline"
            >
              change
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              placeholder="Search by name or ticker…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={pending}
              className="block h-9 w-full rounded-md border border-border bg-surface-1 px-3 text-sm text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {matches.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface-1 shadow-lg">
                {matches.map((r) => (
                  <li key={r.assetId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text-primary"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-text-primary">
                          {r.name}
                        </span>
                        <span className="truncate font-mono text-xs text-text-muted">
                          {r.ticker}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-muted">
          Quantity
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={pending}
          className="block h-9 w-full rounded-md border border-border bg-surface-1 px-3 text-sm tabular-nums text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-muted">
          Purchase price
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={pending}
          className="block h-9 w-full rounded-md border border-border bg-surface-1 px-3 text-sm tabular-nums text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-text-muted">
          Purchase date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={pending}
          className="block h-9 w-full rounded-md border border-border bg-surface-1 px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !selected}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
