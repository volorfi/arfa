/**
 * Mock screener catalogue.
 *
 * This is a wider, lighter dataset than lib/mock/assets.ts: ~25 assets
 * with the columns the screener table needs (ratio, sub-scores, top
 * drivers, asset-class-specific filter fields, all 12 individual
 * factor scores). The detailed FactorScore arrays + history arrays
 * stay in assets.ts so we don't bloat this file.
 *
 * Generator is deterministic — same inputs always produce the same
 * outputs, so SSR + client renders agree without hydration warnings.
 */

import type { AssetClass, FactorKey, Score } from "@/types/asset";
import { MOCK_ASSETS } from "@/lib/mock/assets";

export type MarketCapBucket = "small" | "mid" | "large" | "mega";
export type DurationBucket = "0-3y" | "3-7y" | "7-15y" | "15y+";
export type CreditBucket = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC+";
export type Region =
  | "Global"
  | "US"
  | "Europe"
  | "Japan"
  | "Emerging Markets"
  | "Asia ex-Japan";

export interface ScreenerRow {
  assetId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  ratio: Score;
  overallReturnScore: Score;
  overallRiskScore: Score;
  /** Highest-scored return factor (best driver). */
  topReturnDriver: { factorKey: FactorKey; score: Score; label: string };
  /** Highest-scored risk factor (biggest drag). */
  topRiskDriver: { factorKey: FactorKey; score: Score; label: string };
  /** All 12 factor scores keyed by factor — used for individual-factor
   *  filtering on the screener (only shown to PREMIUM/PRO users). */
  factorScores: Partial<Record<FactorKey, Score>>;
  // ── Asset-class-specific filter fields ──
  sector?: string;
  country?: string;
  marketCapBucket?: MarketCapBucket;
  currency?: string;
  creditRating?: CreditBucket;
  durationBucket?: DurationBucket;
  region?: Region;
  exposure?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static catalogue
// ─────────────────────────────────────────────────────────────────────────────
//
// Each entry carries just enough seed info — the generator below fills in
// per-factor scores, top drivers, etc. deterministically.

interface CatalogueEntry {
  assetId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  /** Anchor ARFA ratio. Generator wiggles around this. */
  ratio: Score;
  sector?: string;
  country?: string;
  marketCapBucket?: MarketCapBucket;
  currency?: string;
  creditRating?: CreditBucket;
  durationBucket?: DurationBucket;
  region?: Region;
  exposure?: string;
}

// ── Stocks ───────────────────────────────────────────────────────────────────
const STOCKS: CatalogueEntry[] = [
  { assetId: "aapl",  name: "Apple Inc.",            ticker: "AAPL",  assetClass: "stock", ratio: 5, sector: "Technology",          country: "US", marketCapBucket: "mega"  },
  { assetId: "msft",  name: "Microsoft Corp.",       ticker: "MSFT",  assetClass: "stock", ratio: 6, sector: "Technology",          country: "US", marketCapBucket: "mega"  },
  { assetId: "googl", name: "Alphabet Inc.",         ticker: "GOOGL", assetClass: "stock", ratio: 5, sector: "Technology",          country: "US", marketCapBucket: "mega"  },
  { assetId: "nvda",  name: "NVIDIA Corp.",          ticker: "NVDA",  assetClass: "stock", ratio: 4, sector: "Technology",          country: "US", marketCapBucket: "mega"  },
  { assetId: "brk-b", name: "Berkshire Hathaway B",  ticker: "BRK.B", assetClass: "stock", ratio: 6, sector: "Financials",          country: "US", marketCapBucket: "mega"  },
  { assetId: "jpm",   name: "JPMorgan Chase & Co.",  ticker: "JPM",   assetClass: "stock", ratio: 5, sector: "Financials",          country: "US", marketCapBucket: "mega"  },
  { assetId: "xom",   name: "Exxon Mobil Corp.",     ticker: "XOM",   assetClass: "stock", ratio: 4, sector: "Energy",              country: "US", marketCapBucket: "mega"  },
  { assetId: "asml",  name: "ASML Holding NV",       ticker: "ASML",  assetClass: "stock", ratio: 5, sector: "Technology",          country: "NL", marketCapBucket: "mega"  },
  { assetId: "lvmh",  name: "LVMH Moët Hennessy",    ticker: "MC",    assetClass: "stock", ratio: 4, sector: "Consumer Discretionary", country: "FR", marketCapBucket: "mega"  },
  { assetId: "nesn",  name: "Nestlé S.A.",           ticker: "NESN",  assetClass: "stock", ratio: 5, sector: "Consumer Staples",    country: "CH", marketCapBucket: "mega"  },
  { assetId: "tsm",   name: "Taiwan Semiconductor",  ticker: "TSM",   assetClass: "stock", ratio: 6, sector: "Technology",          country: "TW", marketCapBucket: "mega"  },
  { assetId: "shop",  name: "Shopify Inc.",          ticker: "SHOP",  assetClass: "stock", ratio: 3, sector: "Technology",          country: "CA", marketCapBucket: "large" },
];

// ── Bonds ────────────────────────────────────────────────────────────────────
const BONDS: CatalogueEntry[] = [
  { assetId: "us10y", name: "US Treasury 10Y",          ticker: "US912828ZT0", assetClass: "bond", ratio: 4, currency: "USD", creditRating: "AAA", durationBucket: "7-15y", country: "US" },
  { assetId: "us2y",  name: "US Treasury 2Y",           ticker: "US912828YH7", assetClass: "bond", ratio: 5, currency: "USD", creditRating: "AAA", durationBucket: "0-3y",  country: "US" },
  { assetId: "us30y", name: "US Treasury 30Y",          ticker: "US912810TH3", assetClass: "bond", ratio: 3, currency: "USD", creditRating: "AAA", durationBucket: "15y+",  country: "US" },
  { assetId: "de10y", name: "Bund 10Y",                 ticker: "DE0001102614", assetClass: "bond", ratio: 4, currency: "EUR", creditRating: "AAA", durationBucket: "7-15y", country: "DE" },
  { assetId: "uk10y", name: "Gilt 10Y",                 ticker: "GB00B16NNR78", assetClass: "bond", ratio: 4, currency: "GBP", creditRating: "AA",  durationBucket: "7-15y", country: "GB" },
  { assetId: "ig-aapl", name: "Apple 2030 4.5%",        ticker: "US037833DV96", assetClass: "bond", ratio: 5, currency: "USD", creditRating: "AA",  durationBucket: "3-7y",  country: "US" },
  { assetId: "hy-vrtx", name: "Vertex Pharma HY 2031",  ticker: "US92532TAH82", assetClass: "bond", ratio: 4, currency: "USD", creditRating: "BB",  durationBucket: "3-7y",  country: "US" },
  { assetId: "em-mxn", name: "Mexico 10Y MXN",          ticker: "MX0MGO0000K4", assetClass: "bond", ratio: 3, currency: "MXN", creditRating: "BBB", durationBucket: "7-15y", country: "MX" },
];

// ── ETFs ─────────────────────────────────────────────────────────────────────
const ETFS: CatalogueEntry[] = [
  { assetId: "ishares-msci-world", name: "iShares MSCI World UCITS ETF", ticker: "IWDA", assetClass: "etf", ratio: 6, region: "Global",            exposure: "Global Equity" },
  { assetId: "spy",                 name: "SPDR S&P 500 ETF",            ticker: "SPY",  assetClass: "etf", ratio: 5, region: "US",                exposure: "US Large Cap" },
  { assetId: "vti",                 name: "Vanguard Total Stock Market", ticker: "VTI",  assetClass: "etf", ratio: 5, region: "US",                exposure: "US Total Market" },
  { assetId: "qqq",                 name: "Invesco QQQ Trust",           ticker: "QQQ",  assetClass: "etf", ratio: 5, region: "US",                exposure: "Nasdaq 100" },
  { assetId: "vxus",                name: "Vanguard Total Intl Stock",   ticker: "VXUS", assetClass: "etf", ratio: 5, region: "Global",            exposure: "ex-US Equity" },
  { assetId: "eem",                 name: "iShares MSCI Emerging Markets",ticker: "EEM", assetClass: "etf", ratio: 4, region: "Emerging Markets",  exposure: "EM Equity" },
];

const CATALOGUE: CatalogueEntry[] = [...STOCKS, ...BONDS, ...ETFS];

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

const RETURN_FACTOR_KEYS = (klass: AssetClass): FactorKey[] =>
  klass === "bond"
    ? ["valuation", "performance", "market_view", "profitability", "growth", "coupons"]
    : ["valuation", "performance", "analyst_view", "profitability", "growth", "dividends"];

const RISK_FACTOR_KEYS: FactorKey[] = [
  "default_risk",
  "volatility",
  "stress_test",
  "selling_difficulty",
  "country_risks",
  "other_risks",
];

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
  selling_difficulty: "Selling Difficulty",
  country_risks: "Country Risks",
  other_risks: "Other Risks",
};

/** Tiny PRNG seeded from the asset id string. We use a content-derived
 *  seed (not Math.random) so server and client renders agree, and the
 *  same asset always lands on the same scores between page loads. */
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
    h = h >>> 0;
  }
  return h;
}

function lcg(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function clampScore(n: number): Score {
  if (n < 1) return 1;
  if (n > 7) return 7;
  return Math.round(n) as Score;
}

/** Build a ScreenerRow from a catalogue entry, deriving deterministic
 *  factor scores around the anchor `ratio`. */
function rowFromEntry(entry: CatalogueEntry): ScreenerRow {
  const rand = lcg(seedFromString(entry.assetId));

  // Return factors: cluster around ratio + small jitter
  const returnKeys = RETURN_FACTOR_KEYS(entry.assetClass);
  const returnScores: Score[] = returnKeys.map(() =>
    clampScore(entry.ratio + (rand() * 3 - 1.4)),
  );

  // Risk factors: invert (higher ratio → lower risk on average)
  const riskScores: Score[] = RISK_FACTOR_KEYS.map(() =>
    clampScore(8 - entry.ratio + (rand() * 3 - 1.4)),
  );

  const factorScores: Partial<Record<FactorKey, Score>> = {};
  returnKeys.forEach((k, i) => (factorScores[k] = returnScores[i]));
  RISK_FACTOR_KEYS.forEach((k, i) => (factorScores[k] = riskScores[i]));

  const overallReturnScore = clampScore(
    returnScores.reduce((a, b) => a + b, 0) / returnScores.length,
  );
  const overallRiskScore = clampScore(
    riskScores.reduce((a, b) => a + b, 0) / riskScores.length,
  );

  const topReturnIdx = returnScores.indexOf(Math.max(...returnScores) as Score);
  const topRiskIdx = riskScores.indexOf(Math.max(...riskScores) as Score);
  const topReturnKey = returnKeys[topReturnIdx];
  const topRiskKey = RISK_FACTOR_KEYS[topRiskIdx];

  return {
    assetId: entry.assetId,
    name: entry.name,
    ticker: entry.ticker,
    assetClass: entry.assetClass,
    ratio: entry.ratio,
    overallReturnScore,
    overallRiskScore,
    topReturnDriver: {
      factorKey: topReturnKey ?? returnKeys[0]!,
      score: returnScores[topReturnIdx] ?? entry.ratio,
      label: FACTOR_LABELS[topReturnKey ?? returnKeys[0]!],
    },
    topRiskDriver: {
      factorKey: topRiskKey ?? "volatility",
      score: riskScores[topRiskIdx] ?? clampScore(8 - entry.ratio),
      label: FACTOR_LABELS[topRiskKey ?? "volatility"],
    },
    factorScores,
    sector: entry.sector,
    country: entry.country,
    marketCapBucket: entry.marketCapBucket,
    currency: entry.currency,
    creditRating: entry.creditRating,
    durationBucket: entry.durationBucket,
    region: entry.region,
    exposure: entry.exposure,
  };
}

/** Full screener dataset, ordered alphabetically by name. */
export const SCREENER_ROWS: ScreenerRow[] = CATALOGUE
  .map(rowFromEntry)
  .sort((a, b) => a.name.localeCompare(b.name));

/** Look up a single row (used by the watchlist + portfolio tables to
 *  render scores alongside user-saved items). */
export function getScreenerRow(assetId: string): ScreenerRow | null {
  return SCREENER_ROWS.find((r) => r.assetId === assetId) ?? null;
}

/** Use the existing asset-detail mocks where they exist, so that
 *  navigating from the screener to /dashboard/asset/[id] still hits a
 *  real detailed analysis. */
export function hasDetailedAnalysis(assetId: string): boolean {
  return assetId in MOCK_ASSETS;
}

// ── Filter option helpers (used by the screener filter panel) ───────────────
export const SECTORS = [
  "Technology",
  "Financials",
  "Energy",
  "Consumer Discretionary",
  "Consumer Staples",
  "Healthcare",
  "Industrials",
  "Utilities",
  "Materials",
  "Real Estate",
  "Communication Services",
] as const;

export const COUNTRIES = ["US", "GB", "DE", "FR", "CH", "NL", "JP", "TW", "CA", "MX"] as const;
export const MARKET_CAPS: MarketCapBucket[] = ["small", "mid", "large", "mega"];
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "MXN"] as const;
export const CREDIT_RATINGS: CreditBucket[] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC+"];
export const DURATIONS: DurationBucket[] = ["0-3y", "3-7y", "7-15y", "15y+"];
export const REGIONS: Region[] = ["Global", "US", "Europe", "Japan", "Emerging Markets", "Asia ex-Japan"];
export const ETF_EXPOSURES = [
  "Global Equity",
  "US Large Cap",
  "US Total Market",
  "Nasdaq 100",
  "ex-US Equity",
  "EM Equity",
] as const;
