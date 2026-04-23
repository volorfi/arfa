"use client";

import * as React from "react";
import { ChevronDown, Lock, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { canAccess, type PlanId } from "@/lib/plans";
import {
  COUNTRIES,
  CREDIT_RATINGS,
  CURRENCIES,
  DURATIONS,
  ETF_EXPOSURES,
  MARKET_CAPS,
  REGIONS,
  SECTORS,
} from "@/lib/mock/screener";
import type { ScreenerFilters, FactorBoundKey } from "./screener-types";
import { DEFAULT_FILTERS, FACTOR_BOUND_OPTIONS } from "./screener-types";
import type { AssetClass, FactorKey } from "@/types/asset";

/**
 * Filter panel — collapsible groups, range sliders, multi-select chips.
 *
 *   · Universal: asset class · ARFA ratio · return · risk
 *   · Per-asset-class: stocks (sector / country / cap),
 *                      bonds (currency / rating / duration),
 *                      ETFs  (region / exposure)
 *   · Individual factor minimums / maximums (PREMIUM-gated; rendered as
 *     a locked tile for FREE users so they see what's behind the wall)
 *
 * The component is dumb — receives `filters` + `onChange` + `onReset`
 * from the parent shell. Everything lives in the parent's state so
 * results/filter state stay in sync.
 */
export function ScreenerFilters({
  filters,
  onChange,
  onReset,
  className,
}: {
  filters: ScreenerFilters;
  onChange: (next: ScreenerFilters) => void;
  onReset: () => void;
  className?: string;
}) {
  const { user } = useUser();
  const userPlan: PlanId = user?.plan ?? "FREE";
  const factorFiltersUnlocked = canAccess(userPlan, "custom-screener-fields");

  const update = <K extends keyof ScreenerFilters>(
    key: K,
    value: ScreenerFilters[K],
  ) => onChange({ ...filters, [key]: value });

  const stocksVisible = filters.assetClasses.length === 0 || filters.assetClasses.includes("stock");
  const bondsVisible = filters.assetClasses.length === 0 || filters.assetClasses.includes("bond");
  const etfsVisible = filters.assetClasses.length === 0 || filters.assetClasses.includes("etf");

  return (
    <aside
      aria-label="Screener filters"
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border bg-card p-4 shadow-xs md:p-5",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-text-faint">
          Filters
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-2 text-text-muted hover:text-text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </header>

      {/* Asset class — multi-select chips */}
      <FilterGroup label="Asset class">
        <ChipMultiSelect
          options={[
            { value: "stock", label: "Stocks" },
            { value: "bond", label: "Bonds" },
            { value: "etf", label: "ETFs" },
          ]}
          value={filters.assetClasses}
          onChange={(v) => update("assetClasses", v as AssetClass[])}
        />
      </FilterGroup>

      {/* Universal score sliders */}
      <FilterGroup label="ARFA Ratio">
        <RangeRow
          range={filters.ratioRange}
          onChange={(r) => update("ratioRange", r)}
        />
      </FilterGroup>
      <FilterGroup label="Return Score">
        <RangeRow
          range={filters.returnRange}
          onChange={(r) => update("returnRange", r)}
        />
      </FilterGroup>
      <FilterGroup label="Risk Score">
        <RangeRow
          range={filters.riskRange}
          onChange={(r) => update("riskRange", r)}
        />
      </FilterGroup>

      {/* Asset-class-specific filters */}
      {stocksVisible && (
        <CollapsibleGroup label="Stocks" defaultOpen={false}>
          <SubGroup label="Sector">
            <ChipMultiSelect
              options={SECTORS.map((s) => ({ value: s, label: s }))}
              value={filters.sectors}
              onChange={(v) => update("sectors", v)}
              compact
            />
          </SubGroup>
          <SubGroup label="Country">
            <ChipMultiSelect
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              value={filters.countries}
              onChange={(v) => update("countries", v)}
              compact
            />
          </SubGroup>
          <SubGroup label="Market cap">
            <ChipMultiSelect
              options={MARKET_CAPS.map((m) => ({
                value: m,
                label: m === "mega" ? "Mega ($200B+)" : m === "large" ? "Large ($10–200B)" : m === "mid" ? "Mid ($2–10B)" : "Small ($300M–2B)",
              }))}
              value={filters.marketCaps}
              onChange={(v) => update("marketCaps", v)}
              compact
            />
          </SubGroup>
        </CollapsibleGroup>
      )}

      {bondsVisible && (
        <CollapsibleGroup label="Bonds" defaultOpen={false}>
          <SubGroup label="Currency">
            <ChipMultiSelect
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              value={filters.currencies}
              onChange={(v) => update("currencies", v)}
              compact
            />
          </SubGroup>
          <SubGroup label="Credit rating">
            <ChipMultiSelect
              options={CREDIT_RATINGS.map((c) => ({ value: c, label: c }))}
              value={filters.creditRatings}
              onChange={(v) => update("creditRatings", v)}
              compact
            />
          </SubGroup>
          <SubGroup label="Duration">
            <ChipMultiSelect
              options={DURATIONS.map((d) => ({ value: d, label: d }))}
              value={filters.durations}
              onChange={(v) => update("durations", v)}
              compact
            />
          </SubGroup>
        </CollapsibleGroup>
      )}

      {etfsVisible && (
        <CollapsibleGroup label="ETFs" defaultOpen={false}>
          <SubGroup label="Region">
            <ChipMultiSelect
              options={REGIONS.map((r) => ({ value: r, label: r }))}
              value={filters.regions}
              onChange={(v) => update("regions", v)}
              compact
            />
          </SubGroup>
          <SubGroup label="Exposure">
            <ChipMultiSelect
              options={ETF_EXPOSURES.map((e) => ({ value: e, label: e }))}
              value={filters.exposures}
              onChange={(v) => update("exposures", v)}
              compact
            />
          </SubGroup>
        </CollapsibleGroup>
      )}

      {/* Individual factor filters — Premium */}
      <CollapsibleGroup
        label="Individual factors"
        defaultOpen={factorFiltersUnlocked}
        rightSlot={
          !factorFiltersUnlocked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              <Lock className="h-3 w-3" /> Premium
            </span>
          )
        }
      >
        {factorFiltersUnlocked ? (
          <FactorBoundsEditor
            factorMin={filters.factorMin}
            factorMax={filters.factorMax}
            onChange={(min, max) =>
              onChange({ ...filters, factorMin: min, factorMax: max })
            }
          />
        ) : (
          <p className="text-xs leading-relaxed text-text-muted">
            Filter by individual factor scores (Valuation ≥ 5, Default Risk ≤
            2, etc.) on Premium and Pro plans.{" "}
            <a
              href="/pricing"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              See plans →
            </a>
          </p>
        )}
      </CollapsibleGroup>
    </aside>
  );
}

// ── Building blocks ────────────────────────────────────────────────────────

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-faint">
        {label}
      </span>
      {children}
    </div>
  );
}

function SubGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function CollapsibleGroup({
  label,
  defaultOpen = false,
  rightSlot,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Native <details> — no Radix dep, fully accessible, animation-free.
  return (
    <details className="group rounded-md border border-border bg-surface-2/40" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </span>
        <span className="flex items-center gap-2">
          {rightSlot}
          <ChevronDown className="h-3.5 w-3.5 text-text-faint transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
        {children}
      </div>
    </details>
  );
}

function RangeRow({
  range,
  onChange,
}: {
  range: [number, number];
  onChange: (r: [number, number]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Slider
        value={range}
        min={1}
        max={7}
        step={1}
        onValueChange={(v) => {
          if (v.length >= 2) onChange([v[0]!, v[1]!] as [number, number]);
        }}
      />
      <div className="flex items-center justify-between text-[11px] tabular-nums text-text-muted">
        <span>
          Min <span className="font-semibold text-text-primary">{range[0]}</span>
        </span>
        <span>
          Max <span className="font-semibold text-text-primary">{range[1]}</span>
        </span>
      </div>
    </div>
  );
}

function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value]);
            }}
            className={cn(
              "rounded-full border px-2.5 py-0.5 transition-colors",
              compact ? "text-[11px]" : "text-xs",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface-1 text-text-muted hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Factor bounds editor (Premium) ─────────────────────────────────────────

function FactorBoundsEditor({
  factorMin,
  factorMax,
  onChange,
}: {
  factorMin: ScreenerFilters["factorMin"];
  factorMax: ScreenerFilters["factorMax"];
  onChange: (
    min: ScreenerFilters["factorMin"],
    max: ScreenerFilters["factorMax"],
  ) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {FACTOR_BOUND_OPTIONS.map((opt) => {
        const isMin = opt.bound === "min";
        const value = (isMin ? factorMin[opt.factorKey] : factorMax[opt.factorKey]) ?? 0;

        return (
          <label
            key={`${opt.factorKey}-${opt.bound}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-1 px-2.5 py-1.5"
          >
            <span className="text-[11px] text-text-muted">{opt.label}</span>
            <select
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                const next = n === 0 ? undefined : n;
                if (isMin) {
                  onChange({ ...factorMin, [opt.factorKey]: next }, factorMax);
                } else {
                  onChange(factorMin, { ...factorMax, [opt.factorKey]: next });
                }
              }}
              className="rounded border border-border bg-surface-1 px-1 py-0.5 font-display text-xs font-semibold text-text-primary"
            >
              <option value={0}>—</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

// Re-exports were causing a name clash with the `ScreenerFilters`
// component above. Consumers should import the types and DEFAULT_FILTERS
// directly from "./screener-types".
//
// Stub reference keeps the FactorKey + FactorBoundKey imports from being
// treated as unused (both are documented inline by the component above).
const _factorKeyTypeAnchor: FactorKey | undefined = undefined;
const _factorBoundKeyAnchor: FactorBoundKey | undefined = undefined;
void _factorKeyTypeAnchor;
void _factorBoundKeyAnchor;
