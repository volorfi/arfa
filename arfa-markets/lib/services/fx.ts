import { yahooFetch } from "@/lib/yahoo-finance";
import type {
  FXPair,
  FXPairCategory,
  FXQuote,
  CurrencyStrength,
  CrossRateMatrix,
  CentralBankRate,
} from "@/lib/types/fx";

// ─── Universe ──────────────────────────────────────────────────────
// URL-safe 6-letter slugs map to Yahoo's `{CODE}{CODE}=X` convention.
export const FX_UNIVERSE: FXPair[] = [
  // Majors
  { pair: "EURUSD", base: "EUR", quote: "USD", name: "EUR / USD", category: "majors" },
  { pair: "GBPUSD", base: "GBP", quote: "USD", name: "GBP / USD", category: "majors" },
  { pair: "USDJPY", base: "USD", quote: "JPY", name: "USD / JPY", category: "majors" },
  { pair: "USDCHF", base: "USD", quote: "CHF", name: "USD / CHF", category: "majors" },
  { pair: "AUDUSD", base: "AUD", quote: "USD", name: "AUD / USD", category: "majors" },
  { pair: "NZDUSD", base: "NZD", quote: "USD", name: "NZD / USD", category: "majors" },
  { pair: "USDCAD", base: "USD", quote: "CAD", name: "USD / CAD", category: "majors" },
  // USD crosses vs EMs / select DMs
  { pair: "USDCNY", base: "USD", quote: "CNY", name: "USD / CNY", category: "usd_crosses" },
  { pair: "USDINR", base: "USD", quote: "INR", name: "USD / INR", category: "usd_crosses" },
  { pair: "USDBRL", base: "USD", quote: "BRL", name: "USD / BRL", category: "usd_crosses" },
  { pair: "USDMXN", base: "USD", quote: "MXN", name: "USD / MXN", category: "usd_crosses" },
  { pair: "USDTRY", base: "USD", quote: "TRY", name: "USD / TRY", category: "usd_crosses" },
  { pair: "USDZAR", base: "USD", quote: "ZAR", name: "USD / ZAR", category: "usd_crosses" },
  { pair: "USDSGD", base: "USD", quote: "SGD", name: "USD / SGD", category: "usd_crosses" },
  // EUR crosses
  { pair: "EURGBP", base: "EUR", quote: "GBP", name: "EUR / GBP", category: "eur_crosses" },
  { pair: "EURJPY", base: "EUR", quote: "JPY", name: "EUR / JPY", category: "eur_crosses" },
  { pair: "EURCHF", base: "EUR", quote: "CHF", name: "EUR / CHF", category: "eur_crosses" },
  { pair: "EURSEK", base: "EUR", quote: "SEK", name: "EUR / SEK", category: "eur_crosses" },
  // Commodity FX / JPY crosses
  { pair: "AUDJPY", base: "AUD", quote: "JPY", name: "AUD / JPY", category: "commodity_fx" },
  { pair: "CADJPY", base: "CAD", quote: "JPY", name: "CAD / JPY", category: "commodity_fx" },
  { pair: "NZDJPY", base: "NZD", quote: "JPY", name: "NZD / JPY", category: "commodity_fx" },
];

const STRENGTH_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "CAD",
  "NZD",
  "CNY",
];

// ─── Simple in-memory cache ────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_30S = 30 * 1000;
const CACHE_5MIN = 5 * 60 * 1000;
const CACHE_1H = 60 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ─── Helpers ───────────────────────────────────────────────────────
function yahooTicker(pair: string): string {
  return `${pair}=X`;
}

function findPair(slug: string): FXPair | null {
  const upper = slug.toUpperCase();
  return FX_UNIVERSE.find((p) => p.pair === upper) ?? null;
}

type BatchQuote = {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

async function batchQuotes(tickers: string[]): Promise<Map<string, BatchQuote>> {
  if (tickers.length === 0) return new Map();
  try {
    const res = await yahooFetch<any>(
      "https://query1.finance.yahoo.com/v7/finance/quote",
      { query: { symbols: tickers.join(",") } },
    );
    const results: BatchQuote[] = res?.quoteResponse?.result ?? [];
    return new Map(results.map((q) => [q.symbol, q]));
  } catch (err) {
    console.warn("[FXService] batchQuotes failed:", err);
    return new Map();
  }
}

async function miniChart(ticker: string, range = "5d"): Promise<{ time: number; value: number }[]> {
  try {
    const res = await yahooFetch<any>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
      { query: { interval: "1d", range }, auth: false },
    );
    const r = res?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const out: { time: number; value: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      const v = closes[i];
      if (typeof v === "number") out.push({ time: ts[i] * 1000, value: v });
    }
    return out;
  } catch {
    return [];
  }
}

async function changePercentBetween(ticker: string, windowDays: number): Promise<number | null> {
  try {
    const res = await yahooFetch<any>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
      { query: { interval: "1d", range: "1y" }, auth: false },
    );
    const closes: (number | null)[] = res?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c): c is number => typeof c === "number");
    if (valid.length < 2) return null;
    const last = valid[valid.length - 1];
    const idx = Math.max(0, valid.length - 1 - windowDays);
    const past = valid[idx];
    if (!past) return null;
    return ((last - past) / past) * 100;
  } catch {
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────
export async function getFXOverview(): Promise<FXQuote[]> {
  const cacheKey = "fx:overview";
  const cached = getCached<FXQuote[]>(cacheKey);
  if (cached) return cached;

  const tickers = FX_UNIVERSE.map((p) => yahooTicker(p.pair));
  const quotes = await batchQuotes(tickers);

  // Fetch mini-charts in parallel but bounded (Yahoo is tolerant but not unlimited).
  const results: FXQuote[] = await Promise.all(
    FX_UNIVERSE.map(async (p) => {
      const t = yahooTicker(p.pair);
      const q = quotes.get(t);
      const chart = await miniChart(t, "5d");
      const price = q?.regularMarketPrice ?? 0;
      const prev = q?.regularMarketPreviousClose ?? price;
      return {
        pair: p.pair,
        base: p.base,
        quote: p.quote,
        name: p.name,
        category: p.category,
        price,
        change: q?.regularMarketChange ?? price - prev,
        changePercent:
          q?.regularMarketChangePercent ?? (prev ? ((price - prev) / prev) * 100 : 0),
        changePercent1W: null,
        changePercentYTD: null,
        dayHigh: q?.regularMarketDayHigh ?? price,
        dayLow: q?.regularMarketDayLow ?? price,
        fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
        chartData: chart,
      };
    }),
  );

  setCache(cacheKey, results, CACHE_30S);
  return results;
}

export async function getFXPair(slug: string): Promise<FXQuote | null> {
  const pair = findPair(slug);
  if (!pair) return null;

  const cacheKey = `fx:pair:${pair.pair}`;
  const cached = getCached<FXQuote>(cacheKey);
  if (cached) return cached;

  const t = yahooTicker(pair.pair);
  const [quotes, chart, chg1w, chgYtd] = await Promise.all([
    batchQuotes([t]),
    miniChart(t, "1y"),
    changePercentBetween(t, 5),
    (async () => {
      // YTD: approximate using days since Jan 1 from today
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      const daysSince = Math.floor((now.getTime() - startOfYear) / (24 * 3600 * 1000));
      return changePercentBetween(t, daysSince);
    })(),
  ]);

  const q = quotes.get(t);
  if (!q) return null;
  const price = q.regularMarketPrice ?? 0;
  const prev = q.regularMarketPreviousClose ?? price;

  const result: FXQuote = {
    pair: pair.pair,
    base: pair.base,
    quote: pair.quote,
    name: pair.name,
    category: pair.category,
    price,
    change: q.regularMarketChange ?? price - prev,
    changePercent:
      q.regularMarketChangePercent ?? (prev ? ((price - prev) / prev) * 100 : 0),
    changePercent1W: chg1w,
    changePercentYTD: chgYtd,
    dayHigh: q.regularMarketDayHigh ?? price,
    dayLow: q.regularMarketDayLow ?? price,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    chartData: chart,
  };
  setCache(cacheKey, result, CACHE_30S);
  return result;
}

export async function getCurrencyStrength(): Promise<CurrencyStrength[]> {
  const cacheKey = "fx:strength";
  const cached = getCached<CurrencyStrength[]>(cacheKey);
  if (cached) return cached;

  const overview = await getFXOverview();

  const sums = new Map<string, { total: number; count: number }>();
  for (const code of STRENGTH_CURRENCIES) sums.set(code, { total: 0, count: 0 });

  for (const q of overview) {
    // If currency is base and pair went up, that currency strengthened.
    const baseEntry = sums.get(q.base);
    if (baseEntry) {
      baseEntry.total += q.changePercent;
      baseEntry.count++;
    }
    // If currency is quote and pair went up, that currency *weakened*.
    const quoteEntry = sums.get(q.quote);
    if (quoteEntry) {
      quoteEntry.total -= q.changePercent;
      quoteEntry.count++;
    }
  }

  const avgs = STRENGTH_CURRENCIES.map((code) => {
    const e = sums.get(code)!;
    const avg = e.count > 0 ? e.total / e.count : 0;
    return { code, avgChangePercent: avg };
  });

  // Z-score across currencies
  const mean = avgs.reduce((a, b) => a + b.avgChangePercent, 0) / avgs.length;
  const variance =
    avgs.reduce((a, b) => a + (b.avgChangePercent - mean) ** 2, 0) / avgs.length;
  const std = Math.sqrt(variance);

  const result: CurrencyStrength[] = avgs.map((a) => ({
    code: a.code,
    avgChangePercent: a.avgChangePercent,
    score: std > 0 ? (a.avgChangePercent - mean) / std : 0,
  }));

  setCache(cacheKey, result, CACHE_30S);
  return result;
}

export async function getCrossRateMatrix(): Promise<CrossRateMatrix> {
  const cacheKey = "fx:cross-matrix";
  const cached = getCached<CrossRateMatrix>(cacheKey);
  if (cached) return cached;

  // For the 8 majors, pull spot vs USD and derive cross-rates.
  const codes = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];
  const usdTickers = codes
    .filter((c) => c !== "USD")
    .map((c) => (c === "EUR" || c === "GBP" || c === "AUD" || c === "NZD" ? `${c}USD=X` : `USD${c}=X`));
  const quotes = await batchQuotes(usdTickers);

  // Build vsUSD map (1 unit of code = X USD)
  const vsUSD = new Map<string, number>();
  vsUSD.set("USD", 1);
  for (const c of codes) {
    if (c === "USD") continue;
    if (c === "EUR" || c === "GBP" || c === "AUD" || c === "NZD") {
      const q = quotes.get(`${c}USD=X`);
      if (q?.regularMarketPrice) vsUSD.set(c, q.regularMarketPrice);
    } else {
      const q = quotes.get(`USD${c}=X`);
      if (q?.regularMarketPrice) vsUSD.set(c, 1 / q.regularMarketPrice);
    }
  }

  const rates: number[][] = codes.map((base) =>
    codes.map((quote) => {
      if (base === quote) return 1;
      const b = vsUSD.get(base);
      const q = vsUSD.get(quote);
      if (!b || !q) return 0;
      return b / q;
    }),
  );

  const result: CrossRateMatrix = { currencies: codes, rates };
  setCache(cacheKey, result, CACHE_5MIN);
  return result;
}

// ─── Central bank rates (curated) ──────────────────────────────────
// Curated list; rates are updated by committee infrequently, so a small
// hand-maintained table beats flaky scraping for Phase 1.
export async function getCentralBankRates(): Promise<CentralBankRate[]> {
  return [
    {
      bank: "Federal Reserve",
      countryOrArea: "United States",
      currency: "USD",
      rate: 4.5,
      lastChange: "2025-12-18",
      stance: "hold",
    },
    {
      bank: "European Central Bank",
      countryOrArea: "Euro Area",
      currency: "EUR",
      rate: 2.5,
      lastChange: "2025-12-12",
      stance: "hold",
    },
    {
      bank: "Bank of England",
      countryOrArea: "United Kingdom",
      currency: "GBP",
      rate: 4.75,
      lastChange: "2025-11-07",
      stance: "hold",
    },
    {
      bank: "Bank of Japan",
      countryOrArea: "Japan",
      currency: "JPY",
      rate: 0.5,
      lastChange: "2025-01-24",
      stance: "hike",
    },
    {
      bank: "Swiss National Bank",
      countryOrArea: "Switzerland",
      currency: "CHF",
      rate: 0.5,
      lastChange: "2025-12-12",
      stance: "cut",
    },
    {
      bank: "Reserve Bank of Australia",
      countryOrArea: "Australia",
      currency: "AUD",
      rate: 4.1,
      lastChange: "2025-02-18",
      stance: "cut",
    },
    {
      bank: "Bank of Canada",
      countryOrArea: "Canada",
      currency: "CAD",
      rate: 3.0,
      lastChange: "2025-01-29",
      stance: "cut",
    },
    {
      bank: "Reserve Bank of New Zealand",
      countryOrArea: "New Zealand",
      currency: "NZD",
      rate: 3.75,
      lastChange: "2025-02-19",
      stance: "cut",
    },
    {
      bank: "People's Bank of China",
      countryOrArea: "China",
      currency: "CNY",
      rate: 3.1,
      lastChange: "2024-10-21",
      stance: "hold",
    },
    {
      bank: "Central Bank of the Russian Federation",
      countryOrArea: "Russia",
      currency: "RUB",
      rate: 21,
      lastChange: "2024-10-25",
      stance: "hold",
    },
  ];
}

export async function getFXMovers(limit = 10): Promise<FXQuote[]> {
  const all = await getFXOverview();
  return [...all]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, limit);
}

// Keep reference to CACHE_1H so lint doesn't complain; reserved for future.
void CACHE_1H;
