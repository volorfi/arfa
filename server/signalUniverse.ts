/**
 * Phase 0 signal universe — small seeded list of US large-caps, editable here.
 * Replace with S&P 500 constituents (or equivalent) when the batch job is
 * proven stable.
 */
const PHASE_0_UNIVERSE = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "ADBE",
  // Semiconductors
  "AMD", "TSM", "INTC", "ASML", "QCOM", "MU",
  // Consumer / retail
  "COST", "WMT", "HD", "NKE", "SBUX",
  // Finance
  "JPM", "BAC", "GS", "V", "MA", "BRK-B",
  // Healthcare
  "UNH", "LLY", "JNJ", "PFE", "MRK",
  // Industrials / energy
  "CAT", "BA", "GE", "XOM", "CVX",
  // Communication / media
  "NFLX", "DIS", "T",
];

export function getSignalUniverse(): string[] {
  // Dedupe defensively
  return Array.from(new Set(PHASE_0_UNIVERSE));
}
