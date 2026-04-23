/**
 * Shared screener types — kept in a tiny standalone module so both the
 * filter panel and the results table can import them without a circular
 * dependency.
 */

import type { AssetClass, FactorKey } from "@/types/asset";
import type {
  CreditBucket,
  DurationBucket,
  MarketCapBucket,
  Region,
} from "@/lib/mock/screener";

export interface ScreenerFilters {
  /** Empty = "all asset classes". */
  assetClasses: AssetClass[];
  /** [min, max], both inclusive, both 1–7. */
  ratioRange: [number, number];
  returnRange: [number, number];
  riskRange: [number, number];
  // Stocks
  sectors: string[];
  countries: string[];
  marketCaps: MarketCapBucket[];
  // Bonds
  currencies: string[];
  creditRatings: CreditBucket[];
  durations: DurationBucket[];
  // ETFs
  regions: Region[];
  exposures: string[];
  /** Per-factor minimum score (Premium): score ≥ N. Missing = no bound. */
  factorMin: Partial<Record<FactorKey, number>>;
  /** Per-factor maximum score (Premium): score ≤ N. Missing = no bound. */
  factorMax: Partial<Record<FactorKey, number>>;
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  assetClasses: [],
  ratioRange: [1, 7],
  returnRange: [1, 7],
  riskRange: [1, 7],
  sectors: [],
  countries: [],
  marketCaps: [],
  currencies: [],
  creditRatings: [],
  durations: [],
  regions: [],
  exposures: [],
  factorMin: {},
  factorMax: {},
};

export type FactorBoundKey = `${FactorKey}-min` | `${FactorKey}-max`;

/** Pre-computed list of factor + bound options shown in the editor. We
 *  only expose the most actionable bounds (a "min" for return factors,
 *  "max" for risk factors) to keep the panel scannable. */
export const FACTOR_BOUND_OPTIONS: {
  factorKey: FactorKey;
  bound: "min" | "max";
  label: string;
}[] = [
  // Returns: minimum score thresholds
  { factorKey: "valuation",          bound: "min", label: "Valuation ≥" },
  { factorKey: "performance",        bound: "min", label: "Performance ≥" },
  { factorKey: "analyst_view",       bound: "min", label: "Analyst View ≥" },
  { factorKey: "profitability",      bound: "min", label: "Profitability ≥" },
  { factorKey: "growth",             bound: "min", label: "Growth ≥" },
  { factorKey: "dividends",          bound: "min", label: "Dividends ≥" },
  // Risks: maximum score thresholds (lower = less risk)
  { factorKey: "default_risk",       bound: "max", label: "Default Risk ≤" },
  { factorKey: "volatility",         bound: "max", label: "Volatility ≤" },
  { factorKey: "stress_test",        bound: "max", label: "Stress Test ≤" },
  { factorKey: "selling_difficulty", bound: "max", label: "Liquidity ≤" },
  { factorKey: "country_risks",      bound: "max", label: "Country Risks ≤" },
  { factorKey: "other_risks",        bound: "max", label: "Other Risks ≤" },
];

// ── Sort + pagination state shared between shell and results table ──────────

export type SortKey =
  | "name"
  | "ticker"
  | "assetClass"
  | "ratio"
  | "returnScore"
  | "riskScore"
  | "topReturnDriver"
  | "topRiskDriver";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const DEFAULT_SORT: SortState = { key: "ratio", dir: "desc" };
export const PAGE_SIZE = 20;
