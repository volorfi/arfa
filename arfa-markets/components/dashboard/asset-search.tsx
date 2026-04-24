"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/asset/factor-card";
import { trackEvent } from "@/lib/analytics";
import type { AssetClass, Score } from "@/types/asset";
import { assetClassLabel } from "@/types/asset";

/**
 * Asset search — debounced fetch against /api/search?q=…
 *
 * UX:
 *   · 300 ms debounce on the input
 *   · Cancellable AbortController so a fast typist doesn't render stale
 *     results from earlier requests
 *   · Arrow-key navigation, Enter to select, Escape closes,
 *     click-outside closes
 *   · Loading spinner when a request is in flight; "no matches" when the
 *     server returns an empty list
 */

const DEBOUNCE_MS = 300;

interface SearchHit {
  assetId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  ratio: Score;
}

export function AssetSearch() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const requestSeq = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);

  // Debounced fetcher.
  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const handle = window.setTimeout(() => {
      // Cancel any in-flight previous request to avoid race conditions.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const seq = ++requestSeq.current;

      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { results: SearchHit[] }) => {
          // Drop late responses if a newer request has fired.
          if (seq !== requestSeq.current) return;
          setResults(Array.isArray(data.results) ? data.results : []);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query]);

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

  function navigateTo(hit: SearchHit) {
    trackEvent("asset_search_select", {
      assetId: hit.assetId,
      from: "topbar",
    });
    window.location.href = `/dashboard/asset/${hit.assetId}`;
  }

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
      if (target) navigateTo(target);
    }
  }

  const showDropdown =
    open && (loading || results.length > 0 || query.trim().length > 0);

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
            "block w-full rounded-md border border-border bg-surface-1 py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
        />
        {loading && (
          <Loader2
            aria-hidden
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-faint"
          />
        )}
      </div>

      {showDropdown && (
        <div
          id="asset-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-border bg-surface-1 shadow-lg"
        >
          {results.length > 0 ? (
            <ul>
              {results.map((r, i) => (
                <li key={r.assetId} role="option" aria-selected={highlight === i}>
                  <Link
                    href={`/dashboard/asset/${r.assetId}`}
                    onClick={() => {
                      setOpen(false);
                      trackEvent("asset_search_select", {
                        assetId: r.assetId,
                        from: "topbar",
                      });
                    }}
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
                      <span className="truncate font-mono text-xs text-text-muted">
                        {r.ticker}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {assetClassLabel(r.assetClass)}
                      </span>
                      <ScoreBadge score={r.ratio} factorType="return" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p
              role="status"
              className="px-3 py-3 text-sm text-text-muted"
            >
              No matches for &ldquo;{query}&rdquo;.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
