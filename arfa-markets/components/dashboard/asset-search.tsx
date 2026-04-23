"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { listMockAssets } from "@/lib/mock/assets";
import { assetClassLabel } from "@/types/asset";

/**
 * Asset search — combobox over the mock catalogue. Replace the source
 * with a real /api/search call when the data layer lands.
 *
 * UX:
 *   · Open on focus when there's a query, or on click of the search icon
 *   · Arrow-key navigation through results
 *   · Enter selects highlighted, Escape closes, click-outside closes
 *   · Up to 6 results shown; "More results" hint when truncated
 */

const ALL_ASSETS = listMockAssets();
const MAX_RESULTS = 6;

interface SearchResult {
  id: string;
  name: string;
  ticker: string;
  className: string;
}

function searchAssets(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = ALL_ASSETS.filter((a) => {
    return (
      a.name.toLowerCase().includes(q) ||
      a.ticker.toLowerCase().includes(q) ||
      a.assetId.toLowerCase().includes(q)
    );
  });
  return matches.slice(0, MAX_RESULTS).map((a) => ({
    id: a.assetId,
    name: a.name,
    ticker: a.ticker,
    className: assetClassLabel(a.assetClass),
  }));
}

export function AssetSearch() {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => searchAssets(query), [query]);

  // Reset highlight whenever the result list changes.
  React.useEffect(() => {
    setHighlight(0);
  }, [results.length]);

  // Click outside → close.
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[highlight];
      if (target) {
        window.location.href = `/dashboard/asset/${target.id}`;
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          placeholder="Search assets by name, ticker, or ISIN…"
          aria-label="Search assets"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="asset-search-results"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "block w-full rounded-md border border-border bg-surface-1 py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id="asset-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-border bg-surface-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={highlight === i}>
              <Link
                href={`/dashboard/asset/${r.id}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 text-sm",
                  highlight === i
                    ? "bg-surface-2 text-text-primary"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-text-primary">
                    {r.name}
                  </span>
                  <span className="truncate text-xs text-text-muted">
                    {r.ticker}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {r.className}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && (
        <div
          role="status"
          className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border border-border bg-surface-1 px-3 py-3 text-sm text-text-muted shadow-lg"
        >
          No matches for &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}
