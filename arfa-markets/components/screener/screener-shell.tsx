"use client";

import * as React from "react";
import { Bookmark, Download, Filter, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { canAccess, type PlanId } from "@/lib/plans";
import { saveScreen } from "@/app/actions/screener";
import { SCREENER_ROWS, type ScreenerRow } from "@/lib/mock/screener";
import type { FactorKey } from "@/types/asset";
import { ScreenerFilters } from "./screener-filters";
import { ScreenerResults } from "./screener-results";
import {
  DEFAULT_FILTERS,
  type ScreenerFilters as Filters,
} from "./screener-types";

/**
 * ScreenerShell — owns the filter state, applies it to the catalogue,
 * and renders the filter panel + results table side-by-side (stacked
 * on mobile).
 *
 * Filtering happens here (single source of truth). Sorting + pagination
 * happen inside ScreenerResults — they don't interact with filtering
 * and shouldn't trigger filter recomputes.
 */
export function ScreenerShell() {
  const { user } = useUser();
  const userPlan: PlanId = user?.plan ?? "FREE";

  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

  const filteredRows = React.useMemo(
    () => applyFilters(SCREENER_ROWS, filters),
    [filters],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header + actions */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Screener
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Filter our universe by ARFA score, factor, and asset-class
            specifics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilterPanelOpen((o) => !o)}
            className="lg:hidden"
          >
            <Filter className="h-3.5 w-3.5" />
            {filterPanelOpen ? "Hide filters" : "Show filters"}
          </Button>
          <SaveScreenButton filters={filters} userPlan={userPlan} />
          <ExportResultsButton rows={filteredRows} userPlan={userPlan} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr] lg:items-start xl:grid-cols-[320px,1fr]">
        {/* Filter panel — always visible on lg+, toggleable on smaller */}
        <div
          className={cn(
            "lg:block",
            filterPanelOpen ? "block" : "hidden",
          )}
        >
          <ScreenerFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>

        <ScreenerResults
          rows={filteredRows}
          totalUnfiltered={SCREENER_ROWS.length}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Save / Export action buttons
// ─────────────────────────────────────────────────────────────────────────────

function SaveScreenButton({
  filters,
  userPlan,
}: {
  filters: Filters;
  userPlan: PlanId;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const allowed = canAccess(userPlan, "advanced-screener");

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Give the screen a name first.");
      return;
    }
    setPending(true);
    try {
      await saveScreen({
        name: name.trim(),
        filters: filters as unknown as Record<string, unknown>,
      });
      toast.success("Screen saved", {
        description: "Find it in your saved screens list.",
      });
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!allowed}
        onClick={() => setOpen((o) => !o)}
        title={
          allowed
            ? "Save this screen"
            : "Saved screens require a Premium plan."
        }
      >
        {!allowed && <Lock className="h-3.5 w-3.5" />}
        <Bookmark className="h-3.5 w-3.5" />
        Save screen
      </Button>

      {open && allowed && (
        <div
          role="dialog"
          aria-label="Name your screen"
          className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-border bg-surface-1 p-3 shadow-lg"
        >
          <label className="block text-xs font-medium text-text-muted">
            Screen name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. High-yield IG bonds"
            className="mt-1.5 w-full rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setName("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={pending || !name.trim()}
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportResultsButton({
  rows,
  userPlan,
}: {
  rows: ScreenerRow[];
  userPlan: PlanId;
}) {
  const allowed = canAccess(userPlan, "exports");

  function handleExport() {
    if (rows.length === 0) {
      toast.error("No rows to export.");
      return;
    }
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arfa-screener-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!allowed}
      onClick={handleExport}
      title={
        allowed
          ? "Download as CSV"
          : "Exports require a Premium plan."
      }
    >
      {!allowed && <Lock className="h-3.5 w-3.5" />}
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter application
// ─────────────────────────────────────────────────────────────────────────────

function applyFilters(rows: ScreenerRow[], f: Filters): ScreenerRow[] {
  return rows.filter((row) => {
    if (f.assetClasses.length > 0 && !f.assetClasses.includes(row.assetClass)) {
      return false;
    }
    if (row.ratio < f.ratioRange[0] || row.ratio > f.ratioRange[1]) return false;
    if (
      row.overallReturnScore < f.returnRange[0] ||
      row.overallReturnScore > f.returnRange[1]
    ) {
      return false;
    }
    if (
      row.overallRiskScore < f.riskRange[0] ||
      row.overallRiskScore > f.riskRange[1]
    ) {
      return false;
    }

    // Asset-class-specific tag filters apply only when the row matches that
    // class — irrelevant filters skip a row in another class.
    if (row.assetClass === "stock") {
      if (f.sectors.length > 0 && (!row.sector || !f.sectors.includes(row.sector))) return false;
      if (f.countries.length > 0 && (!row.country || !f.countries.includes(row.country))) return false;
      if (
        f.marketCaps.length > 0 &&
        (!row.marketCapBucket || !f.marketCaps.includes(row.marketCapBucket))
      ) {
        return false;
      }
    }
    if (row.assetClass === "bond") {
      if (f.currencies.length > 0 && (!row.currency || !f.currencies.includes(row.currency))) return false;
      if (
        f.creditRatings.length > 0 &&
        (!row.creditRating || !f.creditRatings.includes(row.creditRating))
      ) {
        return false;
      }
      if (
        f.durations.length > 0 &&
        (!row.durationBucket || !f.durations.includes(row.durationBucket))
      ) {
        return false;
      }
    }
    if (row.assetClass === "etf") {
      if (f.regions.length > 0 && (!row.region || !f.regions.includes(row.region))) return false;
      if (
        f.exposures.length > 0 &&
        (!row.exposure || !f.exposures.includes(row.exposure))
      ) {
        return false;
      }
    }

    // Individual factor bounds (Premium feature, but apply server-side
    // here too — if the user constructed bounds via Premium then
    // downgraded, we still honour them rather than secretly returning
    // un-filtered rows).
    for (const [factorKey, min] of Object.entries(f.factorMin)) {
      if (min === undefined) continue;
      const score = row.factorScores[factorKey as FactorKey];
      if (score === undefined || score < min) return false;
    }
    for (const [factorKey, max] of Object.entries(f.factorMax)) {
      if (max === undefined) continue;
      const score = row.factorScores[factorKey as FactorKey];
      if (score === undefined || score > max) return false;
    }

    return true;
  });
}

// ── CSV helpers ────────────────────────────────────────────────────────────

function rowsToCsv(rows: ScreenerRow[]): string {
  const headers = [
    "Asset",
    "Ticker",
    "Class",
    "ARFA Ratio",
    "Return Score",
    "Risk Score",
    "Top Return Driver",
    "Top Risk Driver",
    "Sector",
    "Country",
    "Currency",
    "Credit Rating",
    "Duration",
    "Region",
    "Exposure",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.ticker),
        csvCell(r.assetClass),
        r.ratio,
        r.overallReturnScore,
        r.overallRiskScore,
        csvCell(r.topReturnDriver.label),
        csvCell(r.topRiskDriver.label),
        csvCell(r.sector ?? ""),
        csvCell(r.country ?? ""),
        csvCell(r.currency ?? ""),
        csvCell(r.creditRating ?? ""),
        csvCell(r.durationBucket ?? ""),
        csvCell(r.region ?? ""),
        csvCell(r.exposure ?? ""),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csvCell(s: string): string {
  // RFC 4180: quote any cell containing a comma, quote, or newline; double
  // any embedded quotes. Conservative — quotes everything stringy.
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
