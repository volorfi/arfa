"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/asset/factor-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quickAddToWatchlist } from "@/app/actions/watchlist";
import type { ScreenerRow } from "@/lib/mock/screener";
import type { AssetClass, FactorType } from "@/types/asset";
import type { SortKey, SortState } from "./screener-types";
import { PAGE_SIZE } from "./screener-types";

/**
 * Results table — sortable, paginated, with quick "add to watchlist".
 *
 * The parent shell does the filtering and passes `rows` already filtered;
 * sorting and pagination are local to this component because they're
 * orthogonal to the filter state and changing them shouldn't recompute
 * filters upstream.
 */

interface Props {
  rows: ScreenerRow[];
  /** Total before pagination — for the result count copy. */
  totalUnfiltered: number;
  className?: string;
}

const PRISMA_ASSET_CLASS: Record<
  AssetClass,
  "EQUITY" | "ETF" | "BOND_CORP"
> = {
  stock: "EQUITY",
  etf: "ETF",
  // Map "bond" to BOND_CORP by default — UI flow doesn't distinguish
  // sovereign vs. corp at quick-add time.
  bond: "BOND_CORP",
};

export function ScreenerResults({ rows, totalUnfiltered, className }: Props) {
  const [sort, setSort] = React.useState<SortState>({ key: "ratio", dir: "desc" });
  const [page, setPage] = React.useState(1);

  // Reset to page 1 whenever the upstream filtered set changes.
  React.useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const sorted = React.useMemo(() => sortRows(rows, sort), [rows, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section
      aria-label="Screener results"
      className={cn(
        "rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-primary tabular-nums">
            {sorted.length.toLocaleString("en-US")}
          </span>{" "}
          of{" "}
          <span className="tabular-nums">
            {totalUnfiltered.toLocaleString("en-US")}
          </span>{" "}
          assets
        </p>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPage={setPage}
        />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2/50 text-left">
            <tr>
              <SortableTh
                label="Name"
                sortKey="name"
                state={sort}
                onSort={setSort}
              />
              <SortableTh
                label="Ticker"
                sortKey="ticker"
                state={sort}
                onSort={setSort}
              />
              <SortableTh
                label="Class"
                sortKey="assetClass"
                state={sort}
                onSort={setSort}
              />
              <SortableTh
                label="ARFA"
                sortKey="ratio"
                state={sort}
                onSort={setSort}
                align="right"
              />
              <SortableTh
                label="Return"
                sortKey="returnScore"
                state={sort}
                onSort={setSort}
                align="right"
              />
              <SortableTh
                label="Risk"
                sortKey="riskScore"
                state={sort}
                onSort={setSort}
                align="right"
              />
              <th className="px-3 py-2.5 font-medium text-text-muted">
                Top return driver
              </th>
              <th className="px-3 py-2.5 font-medium text-text-muted">
                Top risk driver
              </th>
              <th className="px-3 py-2.5 font-medium text-text-muted text-right">
                Add
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-text-muted"
                >
                  No assets match these filters. Try widening the score
                  ranges or removing tag filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => <ResultRow key={row.assetId} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:px-5">
        <p className="text-xs text-text-muted">
          {sorted.length === 0
            ? "—"
            : `Showing ${((safePage - 1) * PAGE_SIZE + 1).toLocaleString("en-US")}–${Math.min(safePage * PAGE_SIZE, sorted.length).toLocaleString("en-US")}`}
        </p>
        <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
      </footer>
    </section>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function ResultRow({ row }: { row: ScreenerRow }) {
  const [adding, setAdding] = React.useState(false);

  async function handleAdd() {
    if (adding) return;
    setAdding(true);
    try {
      const result = await quickAddToWatchlist({
        symbol: row.ticker,
        assetClass: PRISMA_ASSET_CLASS[row.assetClass],
      });
      toast.success(`${row.ticker} added`, {
        description: `Added to watchlist "${result.watchlistName}".`,
      });
    } catch (err) {
      toast.error("Could not add to watchlist", {
        description:
          err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <tr className="border-t border-border transition-colors hover:bg-surface-2/40">
      <td className="px-3 py-2.5">
        <Link
          href={`/dashboard/asset/${row.assetId}`}
          className="font-medium text-text-primary underline-offset-2 hover:text-primary hover:underline"
        >
          {row.name}
        </Link>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-text-muted">
        {row.ticker}
      </td>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="capitalize">
          {row.assetClass}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        <ScoreBadge score={row.ratio} factorType="return" />
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {row.overallReturnScore}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {row.overallRiskScore}
      </td>
      <td className="px-3 py-2.5">
        <DriverCell
          label={row.topReturnDriver.label}
          score={row.topReturnDriver.score}
          tone="return"
        />
      </td>
      <td className="px-3 py-2.5">
        <DriverCell
          label={row.topRiskDriver.label}
          score={row.topRiskDriver.score}
          tone="risk"
        />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          disabled={adding}
          aria-label={`Add ${row.ticker} to watchlist`}
          className="h-8 w-8 text-text-muted hover:text-text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function DriverCell({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: FactorType;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "return" ? "bg-success" : "bg-destructive",
        )}
      />
      <span className="text-text-primary">{label}</span>
      <span className="text-xs text-text-faint tabular-nums">
        {score} / 7
      </span>
    </span>
  );
}

// ── Sortable column header ─────────────────────────────────────────────────

function SortableTh({
  label,
  sortKey,
  state,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  state: SortState;
  onSort: (s: SortState) => void;
  align?: "left" | "right";
}) {
  const active = state.key === sortKey;
  const dir = active ? state.dir : null;

  return (
    <th
      className={cn(
        "px-3 py-2.5 font-medium text-text-muted",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() =>
          onSort({
            key: sortKey,
            dir: active && state.dir === "desc" ? "asc" : "desc",
          })
        }
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-text-primary",
          active && "text-text-primary",
        )}
        aria-sort={
          active ? (dir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </th>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="h-8 px-2"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs text-text-muted tabular-nums">
        Page <span className="font-semibold text-text-primary">{page}</span> of{" "}
        {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="h-8 px-2"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Sorting logic ──────────────────────────────────────────────────────────

function sortRows(rows: ScreenerRow[], sort: SortState): ScreenerRow[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function sortValue(row: ScreenerRow, key: SortKey): number | string {
  switch (key) {
    case "name":            return row.name.toLowerCase();
    case "ticker":          return row.ticker.toLowerCase();
    case "assetClass":      return row.assetClass;
    case "ratio":           return row.ratio;
    case "returnScore":     return row.overallReturnScore;
    case "riskScore":       return row.overallRiskScore;
    case "topReturnDriver": return row.topReturnDriver.label.toLowerCase();
    case "topRiskDriver":   return row.topRiskDriver.label.toLowerCase();
  }
}
