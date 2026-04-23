"use client";

import * as React from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { addItemToWatchlist } from "@/app/actions/watchlist";
import { listMockAssets } from "@/lib/mock/assets";
import { SCREENER_ROWS } from "@/lib/mock/screener";
import type { AssetClass } from "@/types/asset";
import { uiClassToPrisma } from "./watchlist-item-row";

/**
 * Add-item form — search across the screener catalogue, click a result
 * to add it to the watchlist. Same UX as the topbar AssetSearch but
 * scoped to a watchlist.
 */

interface SearchHit {
  assetId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
}

const ALL_ASSETS: SearchHit[] = (() => {
  // Combine the lighter screener catalogue with any detailed mock
  // assets that aren't in it yet.
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const r of SCREENER_ROWS) {
    out.push({ assetId: r.assetId, name: r.name, ticker: r.ticker, assetClass: r.assetClass });
    seen.add(r.assetId);
  }
  for (const a of listMockAssets()) {
    if (!seen.has(a.assetId)) {
      out.push({ assetId: a.assetId, name: a.name, ticker: a.ticker, assetClass: a.assetClass });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
})();

export function AddItemForm({ watchlistId }: { watchlistId: string }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ASSETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.ticker.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  async function handleAdd(hit: SearchHit) {
    setPendingId(hit.assetId);
    try {
      await addItemToWatchlist({
        watchlistId,
        symbol: hit.ticker,
        assetClass: uiClassToPrisma(hit.assetClass) as
          | "EQUITY"
          | "ETF"
          | "BOND_CORP"
          | "BOND_SOVEREIGN"
          | "FX"
          | "COMMODITY"
          | "INDEX"
          | "CRYPTO"
          | "MACRO",
      });
      toast.success(`Added ${hit.ticker}`);
      setQuery("");
      setOpen(false);
    } catch (err) {
      toast.error("Could not add", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          type="search"
          placeholder="Add an asset by name or ticker…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          className="block w-full rounded-md border border-border bg-surface-1 py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-border bg-surface-1 shadow-lg"
        >
          {matches.map((hit) => {
            const pending = pendingId === hit.assetId;
            return (
              <li key={hit.assetId} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => handleAdd(hit)}
                  disabled={pending}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    "text-text-muted hover:bg-surface-2 hover:text-text-primary",
                    pending && "opacity-60",
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-text-primary">
                      {hit.name}
                    </span>
                    <span className="truncate font-mono text-xs text-text-muted">
                      {hit.ticker}
                    </span>
                  </span>
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  ) : (
                    <Plus className="h-4 w-4 text-text-muted" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && query.trim() && matches.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-md border border-border bg-surface-1 px-3 py-2.5 text-sm text-text-muted shadow-lg">
          No matches for &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}
