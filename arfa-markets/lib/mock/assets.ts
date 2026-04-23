/**
 * Mock asset analyses — used by the asset detail page until the real
 * scoring pipeline is wired up. Three assets, one per asset class:
 *
 *   aapl       — Apple Inc., stock
 *   us10y      — US Treasury 10Y, bond
 *   ishares-msci-world — iShares MSCI World UCITS ETF, ETF
 *
 * Numbers are illustrative — they're not pulled from any data source.
 * Don't infer signal from them.
 */

import type {
  AssetAnalysis,
  FactorScore,
  RatioHistoryPoint,
  Score,
} from "@/types/asset";

// ── Helpers used to keep mock series compact ────────────────────────────────

function asScore(n: number): Score {
  if (n < 1) return 1;
  if (n > 7) return 7;
  return Math.round(n) as Score;
}

/** Generate a smoothed ratio history of `days` length ending today, hovering
 *  around `mean` with low-amplitude jitter. Pure deterministic — same seed
 *  always produces the same series, which keeps SSR + client renders aligned. */
function mockHistory(
  days: number,
  mean: number,
  seed: number,
): RatioHistoryPoint[] {
  const out: RatioHistoryPoint[] = [];
  const today = new Date("2026-04-23T00:00:00Z");
  let value = mean;
  for (let i = days - 1; i >= 0; i--) {
    // Cheap deterministic LCG — no randomness, just enough variation to
    // keep the chart from looking dead-flat.
    const noise = ((seed * (i + 7)) % 13) / 26 - 0.25;
    value = Math.max(1, Math.min(7, mean + noise));
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    out.push({
      date: date.toISOString().slice(0, 10),
      ratio: asScore(value),
      returnScore: asScore(value + 0.4),
      riskScore: asScore(8 - value),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock 1 — Apple Inc. (stock)
// ─────────────────────────────────────────────────────────────────────────────

const aaplFactors: FactorScore[] = [
  // SLOT 1 — Valuation
  {
    factorKey: "valuation",
    factorType: "return",
    score: 3,
    label: "Valuation",
    driverSummary:
      "Trades at 32x forward earnings vs. peer median 21x — meaningfully expensive.",
    percentile: 28,
    confidence: 0.86,
    metrics: [
      { name: "Forward P/E", value: "32.1x", peerMedian: "21.4x", percentile: 22, scoreContribution: -0.7 },
      { name: "EV / EBITDA", value: "23.5x", peerMedian: "16.2x", percentile: 28, scoreContribution: -0.5 },
      { name: "Price / Book", value: "47.0x", peerMedian: "8.2x",  percentile: 5,  scoreContribution: -1.1 },
      { name: "FCF Yield",   value: "3.1%",  peerMedian: "5.3%",   percentile: 35, scoreContribution: -0.3 },
    ],
  },
  // SLOT 2 — Performance
  {
    factorKey: "performance",
    factorType: "return",
    score: 6,
    label: "Performance",
    driverSummary:
      "12-month risk-adjusted return in the 84th percentile of mega-cap tech.",
    percentile: 84,
    confidence: 0.92,
    metrics: [
      { name: "1Y Total Return", value: "28.4%", peerMedian: "11.2%", percentile: 87, scoreContribution: 1.1 },
      { name: "Sharpe (1Y)",     value: "1.42",  peerMedian: "0.78",  percentile: 84, scoreContribution: 0.9 },
      { name: "Max Drawdown",    value: "-9.1%", peerMedian: "-14.6%",percentile: 78, scoreContribution: 0.4 },
    ],
  },
  // SLOT 3 — Analyst View
  {
    factorKey: "analyst_view",
    factorType: "return",
    score: 5,
    label: "Analyst View",
    driverSummary:
      "Consensus 'Overweight'; price targets imply 9% upside. Revisions positive 6 of last 8 weeks.",
    percentile: 71,
    confidence: 0.81,
    metrics: [
      { name: "Consensus",          value: "Overweight",  peerMedian: "Hold", percentile: 79, scoreContribution: 0.6 },
      { name: "Implied Upside",     value: "9.1%",        peerMedian: "5.4%", percentile: 68, scoreContribution: 0.4 },
      { name: "8-week revisions",   value: "+6 / -2",     peerMedian: "+3 / -3", percentile: 76, scoreContribution: 0.5 },
    ],
  },
  // SLOT 4 — Profitability
  {
    factorKey: "profitability",
    factorType: "return",
    score: 7,
    label: "Profitability",
    driverSummary:
      "ROIC of 56% and gross margin 45% — top-decile capital efficiency.",
    percentile: 96,
    confidence: 0.94,
    metrics: [
      { name: "ROIC",            value: "56.2%", peerMedian: "14.1%", percentile: 98, scoreContribution: 1.8 },
      { name: "Gross Margin",    value: "45.0%", peerMedian: "38.2%", percentile: 71, scoreContribution: 0.5 },
      { name: "FCF Margin",      value: "26.4%", peerMedian: "18.0%", percentile: 86, scoreContribution: 0.7 },
    ],
  },
  // SLOT 5 — Growth
  {
    factorKey: "growth",
    factorType: "return",
    score: 4,
    label: "Growth",
    driverSummary:
      "FY26 revenue growth 4.8% — below sector. Services line strong, hardware muted.",
    percentile: 48,
    confidence: 0.79,
    metrics: [
      { name: "FY26 Rev Growth", value: "4.8%",  peerMedian: "8.7%",  percentile: 32, scoreContribution: -0.5 },
      { name: "FY26 EPS Growth", value: "9.2%",  peerMedian: "11.1%", percentile: 47, scoreContribution: -0.1 },
      { name: "3Y Rev CAGR",     value: "5.4%",  peerMedian: "9.6%",  percentile: 30, scoreContribution: -0.6 },
    ],
  },
  // SLOT 6 — Dividends
  {
    factorKey: "dividends",
    factorType: "return",
    score: 4,
    label: "Dividends",
    driverSummary:
      "0.5% yield, but 14% buyback yield — total shareholder return ~14.5%.",
    percentile: 55,
    confidence: 0.88,
    metrics: [
      { name: "Dividend Yield",     value: "0.5%",  peerMedian: "1.2%", percentile: 22, scoreContribution: -0.4 },
      { name: "Buyback Yield",      value: "14.0%", peerMedian: "3.1%", percentile: 96, scoreContribution: 1.4 },
      { name: "Payout Ratio",       value: "16%",   peerMedian: "32%",  percentile: 78, scoreContribution: 0.2 },
    ],
  },
  // SLOT 7 — Default Risk
  {
    factorKey: "default_risk",
    factorType: "risk",
    score: 1,
    label: "Default Risk",
    driverSummary:
      "Net cash position; 5Y CDS spread 18 bps — among the safest names globally.",
    percentile: 4,
    confidence: 0.97,
    metrics: [
      { name: "Net Debt / EBITDA", value: "-0.3x", peerMedian: "1.1x", percentile: 8,  scoreContribution: -1.5 },
      { name: "5Y CDS Spread",     value: "18 bps", peerMedian: "62 bps", percentile: 5, scoreContribution: -1.4 },
      { name: "Interest Coverage", value: "61x",   peerMedian: "12x",  percentile: 95, scoreContribution: -1.2 },
    ],
  },
  // SLOT 8 — Volatility
  {
    factorKey: "volatility",
    factorType: "risk",
    score: 4,
    label: "Volatility",
    driverSummary:
      "Realised vol 24% — in line with mega-cap tech regime; IV mildly elevated.",
    percentile: 52,
    confidence: 0.9,
    metrics: [
      { name: "Realised Vol (1Y)", value: "24.1%", peerMedian: "23.6%", percentile: 53, scoreContribution: 0.1 },
      { name: "IV (30D)",          value: "27.3%", peerMedian: "24.2%", percentile: 64, scoreContribution: 0.3 },
      { name: "Beta (vs. SPX)",    value: "1.18",  peerMedian: "1.05",  percentile: 60, scoreContribution: 0.2 },
    ],
  },
  // SLOT 9 — Stress Test
  {
    factorKey: "stress_test",
    factorType: "risk",
    score: 3,
    label: "Stress Test",
    driverSummary:
      "Modelled drawdown in '22-style risk-off scenario: -18% — better than peer median.",
    percentile: 35,
    confidence: 0.78,
    metrics: [
      { name: "Risk-off scenario", value: "-18.0%", peerMedian: "-24.0%", percentile: 28, scoreContribution: -0.5 },
      { name: "Rate-shock scenario", value: "-9.0%", peerMedian: "-12.0%", percentile: 30, scoreContribution: -0.4 },
      { name: "Stagflation scenario", value: "-22.0%", peerMedian: "-19.0%", percentile: 58, scoreContribution: 0.2 },
    ],
  },
  // SLOT 10 — Selling Difficulty
  {
    factorKey: "selling_difficulty",
    factorType: "risk",
    score: 1,
    label: "Selling Difficulty",
    driverSummary:
      "Average daily volume $9.4 bn — exit cost negligible at any practical size.",
    percentile: 1,
    confidence: 0.99,
    metrics: [
      { name: "ADV (USD)",        value: "$9.4 bn", peerMedian: "$1.8 bn", percentile: 1, scoreContribution: -1.7 },
      { name: "Bid-Ask Spread",   value: "0.5 bps", peerMedian: "2.1 bps", percentile: 2, scoreContribution: -1.5 },
      { name: "Days-to-Liquidate (10% ADV)", value: "0.1 day", peerMedian: "0.6 day", percentile: 4, scoreContribution: -1.3 },
    ],
  },
  // SLOT 11 — Country Risks
  {
    factorKey: "country_risks",
    factorType: "risk",
    score: 3,
    label: "Country Risks",
    driverSummary:
      "Predominantly US revenue base; ~19% China exposure adds geopolitical sensitivity.",
    percentile: 38,
    confidence: 0.83,
    metrics: [
      { name: "US Revenue",     value: "43%", peerMedian: "61%", percentile: 28, scoreContribution: -0.4 },
      { name: "China Revenue",  value: "19%", peerMedian: "5%",  percentile: 88, scoreContribution: 0.6 },
      { name: "Sovereign Rating (weighted)", value: "AA-", peerMedian: "AA", percentile: 42, scoreContribution: 0.1 },
    ],
  },
  // SLOT 12 — Other Risks
  {
    factorKey: "other_risks",
    factorType: "risk",
    score: 3,
    label: "Other Risks",
    driverSummary:
      "Antitrust scrutiny in App Store / search deal — primary regulatory overhang.",
    percentile: 41,
    confidence: 0.7,
    metrics: [
      { name: "Governance score", value: "8.4 / 10", peerMedian: "7.6 / 10", percentile: 32, scoreContribution: -0.3 },
      { name: "Concentration (top customer)", value: "<10%", peerMedian: "12%", percentile: 36, scoreContribution: -0.2 },
      { name: "Active litigation flags", value: "3", peerMedian: "2", percentile: 65, scoreContribution: 0.4 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 2 — US Treasury 10Y (bond)
// ─────────────────────────────────────────────────────────────────────────────

const us10yFactors: FactorScore[] = [
  {
    factorKey: "valuation",
    factorType: "return",
    score: 4,
    label: "Valuation",
    driverSummary:
      "Real yield 1.9% — fair vs. 30Y average; not historically cheap, not expensive.",
    percentile: 51,
    confidence: 0.92,
    metrics: [
      { name: "Real Yield",       value: "1.9%",  peerMedian: "1.7%", percentile: 56, scoreContribution: 0.1 },
      { name: "Term Premium",     value: "0.4%",  peerMedian: "0.5%", percentile: 48, scoreContribution: 0.0 },
      { name: "Yield vs. 5Y avg", value: "+45 bps", peerMedian: "+30 bps", percentile: 58, scoreContribution: 0.2 },
    ],
  },
  {
    factorKey: "performance",
    factorType: "return",
    score: 3,
    label: "Performance",
    driverSummary:
      "1Y total return -2.1% in a curve-steepening environment.",
    percentile: 36,
    confidence: 0.88,
    metrics: [
      { name: "1Y Total Return", value: "-2.1%", peerMedian: "0.8%", percentile: 24, scoreContribution: -0.7 },
      { name: "3Y Total Return", value: "-12.4%", peerMedian: "-8.2%", percentile: 30, scoreContribution: -0.5 },
    ],
  },
  {
    factorKey: "market_view",
    factorType: "return",
    score: 4,
    label: "Market View",
    driverSummary:
      "Curve pricing 25 bps cumulative cuts over next 12M — slightly more dovish than economist consensus.",
    percentile: 50,
    confidence: 0.74,
    metrics: [
      { name: "Implied path (12M)", value: "-25 bps", peerMedian: "-15 bps", percentile: 60, scoreContribution: 0.2 },
      { name: "Survey consensus",   value: "-15 bps", peerMedian: "-15 bps", percentile: 50, scoreContribution: 0.0 },
    ],
  },
  {
    factorKey: "profitability",
    factorType: "return",
    score: 5,
    label: "Carry",
    driverSummary:
      "Carry+roll-down 5.2% annualised — favourable vs. funding cost in current rate regime.",
    percentile: 64,
    confidence: 0.86,
    metrics: [
      { name: "Carry + Roll",    value: "5.2%", peerMedian: "4.4%", percentile: 67, scoreContribution: 0.5 },
      { name: "Funding spread",  value: "1.4%", peerMedian: "1.6%", percentile: 42, scoreContribution: 0.2 },
    ],
  },
  {
    factorKey: "growth",
    factorType: "return",
    score: 3,
    label: "Growth Backdrop",
    driverSummary:
      "Nominal growth slowing — supportive for duration but flagged 'late cycle'.",
    percentile: 38,
    confidence: 0.7,
    metrics: [
      { name: "GDP Nowcast",     value: "1.4%", peerMedian: "1.9%", percentile: 28, scoreContribution: -0.4 },
      { name: "PMI (composite)", value: "49.2", peerMedian: "51.1", percentile: 32, scoreContribution: -0.3 },
    ],
  },
  {
    factorKey: "coupons",
    factorType: "return",
    score: 5,
    label: "Coupons",
    driverSummary:
      "4.25% coupon — strongest income on the curve since 2007.",
    percentile: 72,
    confidence: 0.95,
    metrics: [
      { name: "Coupon",          value: "4.25%", peerMedian: "3.10%", percentile: 75, scoreContribution: 0.6 },
      { name: "Duration",        value: "8.1y",  peerMedian: "7.4y",  percentile: 60, scoreContribution: 0.2 },
    ],
  },
  {
    factorKey: "default_risk",
    factorType: "risk",
    score: 1,
    label: "Default Risk",
    driverSummary:
      "AA+ sovereign; nominal default risk de minimis. CDS 22 bps — pure tail-hedge.",
    percentile: 2,
    confidence: 0.99,
    metrics: [
      { name: "Sovereign Rating", value: "AA+", peerMedian: "AA-", percentile: 5, scoreContribution: -1.5 },
      { name: "5Y Sov CDS",       value: "22 bps", peerMedian: "55 bps", percentile: 4, scoreContribution: -1.4 },
    ],
  },
  {
    factorKey: "volatility",
    factorType: "risk",
    score: 4,
    label: "Volatility",
    driverSummary:
      "MOVE index 110 — elevated rate vol; average annual yield range ~120 bps.",
    percentile: 56,
    confidence: 0.85,
    metrics: [
      { name: "MOVE Index",      value: "110",   peerMedian: "92",  percentile: 64, scoreContribution: 0.3 },
      { name: "1Y Yield Range",  value: "118 bps", peerMedian: "85 bps", percentile: 70, scoreContribution: 0.4 },
    ],
  },
  {
    factorKey: "stress_test",
    factorType: "risk",
    score: 3,
    label: "Stress Test",
    driverSummary:
      "Modelled price loss from +100 bps shock: -7.4%. Hedge in risk-off scenario.",
    percentile: 36,
    confidence: 0.83,
    metrics: [
      { name: "+100 bps shock",     value: "-7.4%", peerMedian: "-6.5%", percentile: 58, scoreContribution: 0.2 },
      { name: "Risk-off scenario",  value: "+5.1%", peerMedian: "+3.0%", percentile: 18, scoreContribution: -0.7 },
    ],
  },
  {
    factorKey: "selling_difficulty",
    factorType: "risk",
    score: 1,
    label: "Selling Difficulty",
    driverSummary:
      "Deepest bond market on earth — exit cost effectively zero.",
    percentile: 1,
    confidence: 0.99,
    metrics: [
      { name: "Bid-Ask Spread (bps)", value: "0.5", peerMedian: "1.2", percentile: 3, scoreContribution: -1.6 },
      { name: "Daily Volume",         value: "$680 bn", peerMedian: "$2 bn", percentile: 1, scoreContribution: -1.7 },
    ],
  },
  {
    factorKey: "country_risks",
    factorType: "risk",
    score: 2,
    label: "Country Risks",
    driverSummary:
      "US rule-of-law and reserve-currency status — minimal jurisdictional risk.",
    percentile: 8,
    confidence: 0.95,
    metrics: [
      { name: "Sovereign Rating", value: "AA+", peerMedian: "AA-", percentile: 5,  scoreContribution: -1.0 },
      { name: "WGI Rule-of-Law",  value: "1.6", peerMedian: "0.9", percentile: 12, scoreContribution: -0.8 },
    ],
  },
  {
    factorKey: "other_risks",
    factorType: "risk",
    score: 4,
    label: "Other Risks",
    driverSummary:
      "Debt-ceiling cycles + fiscal trajectory — political tail risk priced into term premium.",
    percentile: 56,
    confidence: 0.7,
    metrics: [
      { name: "Debt / GDP",       value: "122%", peerMedian: "85%",  percentile: 80, scoreContribution: 0.5 },
      { name: "Political risk score", value: "5.8 / 10", peerMedian: "4.5 / 10", percentile: 65, scoreContribution: 0.3 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 3 — iShares MSCI World UCITS ETF (etf)
// ─────────────────────────────────────────────────────────────────────────────

const mscIWorldFactors: FactorScore[] = [
  {
    factorKey: "valuation",
    factorType: "return",
    score: 5,
    label: "Valuation",
    driverSummary:
      "Look-through P/E 18.4x — fair vs. 10Y average of 17.6x. Slight US tilt richer.",
    percentile: 62,
    confidence: 0.84,
    metrics: [
      { name: "Look-through P/E", value: "18.4x", peerMedian: "17.2x", percentile: 58, scoreContribution: 0.2 },
      { name: "P/B",              value: "3.0x",  peerMedian: "2.6x",  percentile: 64, scoreContribution: 0.3 },
    ],
  },
  {
    factorKey: "performance",
    factorType: "return",
    score: 6,
    label: "Performance",
    driverSummary:
      "1Y total return 14.6%; tracking error vs. index 0.04% — best-in-class replication.",
    percentile: 82,
    confidence: 0.96,
    metrics: [
      { name: "1Y Total Return", value: "14.6%", peerMedian: "12.1%", percentile: 76, scoreContribution: 0.6 },
      { name: "Tracking Error",  value: "0.04%", peerMedian: "0.12%", percentile: 8,  scoreContribution: 0.4 },
    ],
  },
  {
    factorKey: "analyst_view",
    factorType: "return",
    score: 5,
    label: "Analyst View",
    driverSummary:
      "Bottom-up consensus on holdings: 7% implied upside; revisions tilted positive.",
    percentile: 68,
    confidence: 0.78,
    metrics: [
      { name: "Implied Upside (bottom-up)", value: "7.2%", peerMedian: "5.0%", percentile: 70, scoreContribution: 0.4 },
    ],
  },
  {
    factorKey: "profitability",
    factorType: "return",
    score: 6,
    label: "Profitability",
    driverSummary:
      "Underlying basket ROIC 17% — concentration in mega-cap tech lifts the average.",
    percentile: 78,
    confidence: 0.88,
    metrics: [
      { name: "Look-through ROIC",     value: "17.4%", peerMedian: "13.1%", percentile: 78, scoreContribution: 0.6 },
      { name: "Look-through Margin",   value: "12.8%", peerMedian: "11.0%", percentile: 64, scoreContribution: 0.3 },
    ],
  },
  {
    factorKey: "growth",
    factorType: "return",
    score: 5,
    label: "Growth",
    driverSummary:
      "Forward earnings growth 8.4% — global diversification dilutes peaks but stabilises.",
    percentile: 64,
    confidence: 0.82,
    metrics: [
      { name: "FY26 EPS Growth", value: "8.4%", peerMedian: "7.6%", percentile: 60, scoreContribution: 0.3 },
    ],
  },
  {
    factorKey: "dividends",
    factorType: "return",
    score: 5,
    label: "Distributions",
    driverSummary:
      "Trailing distribution yield 1.8% — accumulating share class compounds in fund.",
    percentile: 60,
    confidence: 0.92,
    metrics: [
      { name: "Distribution Yield",  value: "1.8%", peerMedian: "1.6%", percentile: 60, scoreContribution: 0.2 },
      { name: "Expense Ratio",       value: "0.20%", peerMedian: "0.30%", percentile: 18, scoreContribution: 0.4 },
    ],
  },
  {
    factorKey: "default_risk",
    factorType: "risk",
    score: 1,
    label: "Issuer Risk",
    driverSummary:
      "iShares (BlackRock) issuer; UCITS structure with daily NAV — issuer risk negligible.",
    percentile: 3,
    confidence: 0.99,
    metrics: [
      { name: "Issuer Rating",       value: "AA-", peerMedian: "A+", percentile: 12, scoreContribution: -1.4 },
    ],
  },
  {
    factorKey: "volatility",
    factorType: "risk",
    score: 3,
    label: "Volatility",
    driverSummary:
      "Realised vol 14.5% — diversification across 1,500 holdings dampens individual-name swings.",
    percentile: 32,
    confidence: 0.94,
    metrics: [
      { name: "Realised Vol (1Y)", value: "14.5%", peerMedian: "17.0%", percentile: 28, scoreContribution: -0.6 },
      { name: "Beta (vs. SPX)",    value: "0.92",  peerMedian: "1.0",   percentile: 36, scoreContribution: -0.3 },
    ],
  },
  {
    factorKey: "stress_test",
    factorType: "risk",
    score: 3,
    label: "Stress Test",
    driverSummary:
      "Drawdown in '08-style scenario: -38%; '20-style: -22%. In-line with broad equity.",
    percentile: 38,
    confidence: 0.86,
    metrics: [
      { name: "'08-style", value: "-38.0%", peerMedian: "-40.0%", percentile: 42, scoreContribution: -0.2 },
      { name: "'20-style", value: "-22.0%", peerMedian: "-25.0%", percentile: 36, scoreContribution: -0.3 },
    ],
  },
  {
    factorKey: "selling_difficulty",
    factorType: "risk",
    score: 2,
    label: "Selling Difficulty",
    driverSummary:
      "Bid-ask spread 1.6 bps; primary-market creation/redemption keeps spreads tight.",
    percentile: 12,
    confidence: 0.93,
    metrics: [
      { name: "Bid-Ask Spread", value: "1.6 bps", peerMedian: "5.2 bps", percentile: 10, scoreContribution: -1.0 },
      { name: "ADV",            value: "$420 mn", peerMedian: "$60 mn",  percentile: 8,  scoreContribution: -1.1 },
    ],
  },
  {
    factorKey: "country_risks",
    factorType: "risk",
    score: 2,
    label: "Country Risks",
    driverSummary:
      "70% DM weighting; underlying jurisdictions average AA — low aggregate sovereign risk.",
    percentile: 18,
    confidence: 0.88,
    metrics: [
      { name: "DM Weight",     value: "70%", peerMedian: "62%", percentile: 22, scoreContribution: -0.5 },
      { name: "Avg Sov Rating",value: "AA",  peerMedian: "AA-", percentile: 28, scoreContribution: -0.3 },
    ],
  },
  {
    factorKey: "other_risks",
    factorType: "risk",
    score: 2,
    label: "Other Risks",
    driverSummary:
      "Top 10 holdings ~22% of portfolio — concentration moderate; structural ESG flags low.",
    percentile: 28,
    confidence: 0.78,
    metrics: [
      { name: "Top-10 Concentration", value: "22%", peerMedian: "28%", percentile: 32, scoreContribution: -0.3 },
      { name: "ESG Risk Score",       value: "Low", peerMedian: "Med", percentile: 25, scoreContribution: -0.4 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ASSETS: Record<string, AssetAnalysis> = {
  aapl: {
    assetId: "aapl",
    name: "Apple Inc.",
    ticker: "AAPL",
    assetClass: "stock",
    peerGroup: "vs. US Mega-cap Tech",
    overallReturnScore: 5,
    overallRiskScore: 3,
    ratio: 5,
    factorScores: aaplFactors,
    asOfDate: "2026-04-23",
    history: mockHistory(365 * 3, 5, 11),
  },
  us10y: {
    assetId: "us10y",
    name: "US Treasury 10Y",
    ticker: "US912828ZT0",
    assetClass: "bond",
    peerGroup: "vs. AAA Sovereign 10Y",
    overallReturnScore: 4,
    overallRiskScore: 2,
    ratio: 4,
    factorScores: us10yFactors,
    asOfDate: "2026-04-23",
    history: mockHistory(365 * 3, 4, 7),
  },
  "ishares-msci-world": {
    assetId: "ishares-msci-world",
    name: "iShares MSCI World UCITS ETF",
    ticker: "IWDA",
    assetClass: "etf",
    peerGroup: "vs. Global Equity ETFs",
    overallReturnScore: 6,
    overallRiskScore: 2,
    ratio: 6,
    factorScores: mscIWorldFactors,
    asOfDate: "2026-04-23",
    history: mockHistory(365 * 3, 6, 5),
  },
};

/** Look up a mock asset by id; returns null for unknown ids so the page
 *  can render a clean 404 instead of crashing. */
export function getMockAsset(id: string): AssetAnalysis | null {
  return MOCK_ASSETS[id] ?? null;
}

/** All assets, used by the search dropdown. */
export function listMockAssets(): AssetAnalysis[] {
  return Object.values(MOCK_ASSETS);
}
