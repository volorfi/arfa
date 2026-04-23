/**
 * Asset analysis types.
 *
 * The shape mirrors what the ARFA scoring engine emits per asset, so it's
 * also what the asset detail page renders. Keep this in sync with any
 * future API responses — components import from here, never duplicate.
 */

export type AssetClass = "stock" | "bond" | "etf";

/** All 12 factors, plus per-asset-class variants (analyst_view vs.
 *  market_view, dividends vs. coupons). The watch face renders exactly 12
 *  slots — pick one of each pair per asset class. */
export type FactorKey =
  | "valuation"
  | "performance"
  | "analyst_view" // stocks
  | "market_view" // bonds
  | "profitability"
  | "growth"
  | "dividends" // stocks / ETFs
  | "coupons" // bonds
  | "default_risk"
  | "volatility"
  | "stress_test"
  | "selling_difficulty"
  | "country_risks"
  | "other_risks";

/** Score scale used everywhere. 1 = lowest, 7 = highest. For return factors
 *  higher is better; for risk factors higher means MORE risk (worse for the
 *  composite). */
export type Score = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type FactorType = "return" | "risk";

export interface SubMetric {
  /** Display name, e.g. "Price-to-Book" */
  name: string;
  /** Asset's value, formatted for display ("0.8x", "12.4%") */
  value: string | number;
  /** Peer median for this metric, formatted for display */
  peerMedian: string | number;
  /** Asset's percentile within the peer group, 0–100 */
  percentile: number;
  /** How much this metric pushed the factor score, in raw score units
   *  (positive = lifted score, negative = lowered). Sum across metrics
   *  doesn't have to equal the final score; this is a sensitivity. */
  scoreContribution: number;
}

export interface FactorScore {
  factorKey: FactorKey;
  factorType: FactorType;
  /** Final score for this factor on the asset. */
  score: Score;
  /** Display label, e.g. "Valuation". Localised at render time. */
  label: string;
  /** Single-sentence summary of WHY this score landed here. Plain
   *  English, ≤ 160 chars. Always visible (no paywall). */
  driverSummary: string;
  /** Constituent metrics. Gated behind PREMIUM in the drawer for FREE. */
  metrics: SubMetric[];
  /** Asset's percentile within its peer group on this factor, 0–100. */
  percentile: number;
  /** Model's confidence in the score, 0–1. Surfaced in the drawer. */
  confidence: number;
}

/** A point on the ARFA Ratio history chart. */
export interface RatioHistoryPoint {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  ratio: Score;
  /** Optional sub-scores, for stacked / detail charts. */
  returnScore?: Score;
  riskScore?: Score;
}

export interface AssetAnalysis {
  /** Slug used in URLs (e.g. "aapl"). */
  assetId: string;
  /** Display name, e.g. "Apple Inc." */
  name: string;
  /** Ticker (stocks/ETFs) or ISIN-tail (bonds). */
  ticker: string;
  assetClass: AssetClass;
  /** Peer-group label shown under the asset name. */
  peerGroup: string;
  /** Aggregated 1–7 across the 6 return factors. */
  overallReturnScore: Score;
  /** Aggregated 1–7 across the 6 risk factors. */
  overallRiskScore: Score;
  /** Composite ARFA Ratio (1–7). Higher = better risk/return profile. */
  ratio: Score;
  /** Exactly 12 entries, each occupying one watch-face slot. The order
   *  here matches the slot positions 1–12 (slot 1 = factorScores[0]). */
  factorScores: FactorScore[];
  /** ISO date of the last data refresh. */
  asOfDate: string;
  /** Time series for the score-history chart. Sorted oldest → newest. */
  history: RatioHistoryPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** The canonical slot-index → (kind, slot number 1–12) mapping. Slots 1–6
 *  are right-side return factors; slots 7–12 are left-side risk factors. */
export function slotKind(slot: number): FactorType {
  return slot <= 6 ? "return" : "risk";
}

/** Asset-class display label. */
export function assetClassLabel(klass: AssetClass): string {
  switch (klass) {
    case "stock":
      return "Stock";
    case "bond":
      return "Bond";
    case "etf":
      return "ETF";
  }
}
