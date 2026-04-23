/**
 * Portfolio computations — pure helpers shared by the holdings table,
 * summary card, and fragility heatmap.
 *
 * Without a price feed yet we can't show real P&L; we synthesise a
 * deterministic "current price" per holding by perturbing the purchase
 * price, then derive P&L from that. Replace `mockCurrentPrice()` once
 * the quote API is wired and these computations stay correct.
 */

import type { PortfolioHolding } from "@prisma/client";

import { getScreenerRow, type ScreenerRow } from "@/lib/mock/screener";
import type { FactorKey, Score } from "@/types/asset";

export interface ComputedHolding {
  id: string;
  assetId: string;
  displayName: string;
  ticker: string;
  assetClass: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  /** Synthesised current price; replace with live quote later. */
  currentPrice: number;
  /** Position value in the asset's native currency. */
  value: number;
  /** Position weight against the total portfolio value, 0–1. */
  weight: number;
  /** % change vs. cost basis. Can be negative. */
  pnlPercent: number;
  /** Matching screener row (for ARFA scores), or null if uncovered. */
  matched: ScreenerRow | null;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnlPercent: number;
  /** Weighted average ARFA Ratio across covered holdings, rounded to a Score. */
  weightedRatio: Score | null;
  weightedReturnScore: Score | null;
  weightedRiskScore: Score | null;
  /** Slice of total weight that has matching ARFA scores. Lets us caveat
   *  the weighted scores in the UI when coverage is incomplete. */
  coveredWeight: number;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Cheap deterministic "current price" derived from the asset id + the
 *  purchase price. Same input always produces the same output so SSR and
 *  client renders agree. */
function mockCurrentPrice(holding: PortfolioHolding): number {
  // Hash the assetId for a stable seed.
  let seed = 0x811c9dc5;
  for (let i = 0; i < holding.assetId.length; i++) {
    seed ^= holding.assetId.charCodeAt(i);
    seed = (seed * 16777619) >>> 0;
  }
  // -25% to +35% from purchase, biased slightly positive so the demo
  // doesn't look uniformly red.
  const factor = 0.75 + ((seed % 10000) / 10000) * 0.6;
  return holding.purchasePrice * factor;
}

export function computeHoldings(
  holdings: PortfolioHolding[],
): { computed: ComputedHolding[]; summary: PortfolioSummary } {
  // Pass 1 — derive value per holding so we can compute totals.
  const enriched = holdings.map((h) => {
    const matched = getScreenerRow(h.assetId);
    const currentPrice = mockCurrentPrice(h);
    const value = h.quantity * currentPrice;
    const cost = h.quantity * h.purchasePrice;
    const pnlPercent = cost === 0 ? 0 : ((value - cost) / cost) * 100;
    return { h, matched, currentPrice, value, cost, pnlPercent };
  });

  const totalValue = enriched.reduce((sum, e) => sum + e.value, 0);
  const totalCost = enriched.reduce((sum, e) => sum + e.cost, 0);
  const totalPnlPercent = totalCost === 0 ? 0 : ((totalValue - totalCost) / totalCost) * 100;

  // Pass 2 — assign weights, derive final shape.
  const computed: ComputedHolding[] = enriched.map((e) => ({
    id: e.h.id,
    assetId: e.h.assetId,
    displayName: e.h.displayName,
    ticker: e.h.ticker,
    assetClass: e.h.assetClass,
    quantity: e.h.quantity,
    purchasePrice: e.h.purchasePrice,
    purchaseDate: e.h.purchaseDate.toISOString(),
    currentPrice: e.currentPrice,
    value: e.value,
    weight: totalValue === 0 ? 0 : e.value / totalValue,
    pnlPercent: e.pnlPercent,
    matched: e.matched,
  }));

  // Weighted scores — only include rows we cover (matched != null).
  let coveredWeight = 0;
  let wRatio = 0;
  let wReturn = 0;
  let wRisk = 0;
  for (const c of computed) {
    if (!c.matched) continue;
    coveredWeight += c.weight;
    wRatio += c.weight * c.matched.ratio;
    wReturn += c.weight * c.matched.overallReturnScore;
    wRisk += c.weight * c.matched.overallRiskScore;
  }
  const weightedRatio = coveredWeight === 0 ? null : clampScore(wRatio / coveredWeight);
  const weightedReturnScore = coveredWeight === 0 ? null : clampScore(wReturn / coveredWeight);
  const weightedRiskScore = coveredWeight === 0 ? null : clampScore(wRisk / coveredWeight);

  return {
    computed,
    summary: {
      totalValue,
      totalCost,
      totalPnlPercent,
      weightedRatio,
      weightedReturnScore,
      weightedRiskScore,
      coveredWeight,
    },
  };
}

// ── Fragility heatmap ──────────────────────────────────────────────────────

/** A 12-cell grid (one per factor) of weighted concentration scores. For
 *  RISK factors a higher score means more concentration risk; for RETURN
 *  factors a higher score means more concentration of upside drivers
 *  (still useful information — concentrated bets are inherently more
 *  fragile). */
export interface FragilityCell {
  factorKey: FactorKey;
  factorType: "return" | "risk";
  label: string;
  /** 1–7, weighted by holding weight (covered slice only). */
  weightedScore: number;
  /** "low" | "moderate" | "high" — red/amber/green tone in UI. */
  level: "low" | "moderate" | "high";
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  valuation: "Valuation",
  performance: "Performance",
  analyst_view: "Analyst View",
  market_view: "Market View",
  profitability: "Profitability",
  growth: "Growth",
  dividends: "Dividends",
  coupons: "Coupons",
  default_risk: "Default Risk",
  volatility: "Volatility",
  stress_test: "Stress Test",
  selling_difficulty: "Liquidity",
  country_risks: "Country Risks",
  other_risks: "Other Risks",
};

/** Subset of factor keys we display on the heatmap (4 return + 6 risk =
 *  10 cells, but the spec asks for 3×4 = 12; we pad with the two stock-
 *  specific drivers so the layout stays full). */
const HEATMAP_KEYS: { factorKey: FactorKey; factorType: "return" | "risk" }[] = [
  // Row 1 — risk concentration
  { factorKey: "default_risk",       factorType: "risk" },
  { factorKey: "volatility",         factorType: "risk" },
  { factorKey: "stress_test",        factorType: "risk" },
  { factorKey: "selling_difficulty", factorType: "risk" },
  // Row 2 — risk continued
  { factorKey: "country_risks",      factorType: "risk" },
  { factorKey: "other_risks",        factorType: "risk" },
  { factorKey: "valuation",          factorType: "return" },
  { factorKey: "growth",             factorType: "return" },
  // Row 3 — return concentration
  { factorKey: "profitability",      factorType: "return" },
  { factorKey: "performance",        factorType: "return" },
  { factorKey: "analyst_view",       factorType: "return" },
  { factorKey: "dividends",          factorType: "return" },
];

export function computeFragility(holdings: ComputedHolding[]): FragilityCell[] {
  return HEATMAP_KEYS.map(({ factorKey, factorType }) => {
    let weightSum = 0;
    let weightedScore = 0;
    for (const h of holdings) {
      const score = h.matched?.factorScores[factorKey];
      if (score === undefined) continue;
      weightSum += h.weight;
      weightedScore += h.weight * score;
    }
    const avg = weightSum === 0 ? 0 : weightedScore / weightSum;

    let level: FragilityCell["level"];
    if (factorType === "risk") {
      // For risk: high score = MORE risk concentration → flag red.
      level = avg >= 5 ? "high" : avg >= 3.5 ? "moderate" : "low";
    } else {
      // For return: high concentration of upside is fragile too — but
      // less alarming, so the threshold is higher.
      level = avg >= 6 ? "high" : avg >= 4.5 ? "moderate" : "low";
    }

    return {
      factorKey,
      factorType,
      label: FACTOR_LABELS[factorKey],
      weightedScore: avg,
      level,
    };
  });
}

function clampScore(n: number): Score {
  if (n < 1) return 1;
  if (n > 7) return 7;
  return Math.round(n) as Score;
}
