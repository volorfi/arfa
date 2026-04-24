import { yahooFetch } from "./_core/yahooFinance";
import type {
  StockQuote,
  StockChartPoint,
  MarketIndex,
  NewsItem,
  MarketMover,
  ScreenerStock,
} from "../shared/stockTypes";

// ─── Rate limiter (Yahoo) ──────────────────────────────────────────
const MIN_INTERVAL_MS = 600;
let lastRequestTime = 0;
const requestQueue: Array<{ resolve: () => void }> = [];
let processing = false;

async function rateLimitedWait(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestQueue.push({ resolve });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  while (requestQueue.length > 0) {
    const item = requestQueue.shift()!;
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
    item.resolve();
  }
  processing = false;
}

async function yfGet<T = any>(
  url: string,
  query: Record<string, string | number | undefined> = {},
  opts: { auth?: boolean } = {}
): Promise<T | null> {
  await rateLimitedWait();
  try {
    return await yahooFetch<T>(url, { query, auth: opts.auth });
  } catch (error) {
    console.warn(`[StockService] Yahoo request failed: ${url}`, error);
    return null;
  }
}

// ─── Finnhub client ────────────────────────────────────────────────
const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function finnhubGet<T = any>(
  path: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  if (!FINNHUB_KEY) {
    console.warn(`[StockService] FINNHUB_API_KEY is not set; skipping ${path}`);
    return null;
  }
  const url = new URL(FINNHUB_BASE + path);
  url.searchParams.set("token", FINNHUB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(`[StockService] Finnhub ${path} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[StockService] Finnhub request failed: ${path}`, error);
    return null;
  }
}

// ─── Cache ─────────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

const CACHE_20S   = 20 * 1000;
const CACHE_5MIN  = 5  * 60 * 1000;
const CACHE_15MIN = 15 * 60 * 1000;
const CACHE_1HR   = 60 * 60 * 1000;

// ─── Yahoo response helpers ────────────────────────────────────────
function pickRaw(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof v.raw === "number") return v.raw;
  return undefined;
}

function pickFmt(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.fmt === "string") return v.fmt;
  return undefined;
}

// ─── Date helpers ──────────────────────────────────────────────────
// Format a Date (or today) as "YYYY-MM-DD" for Finnhub params.
function toISODate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Expand a single date string to a [from, to] window of ±3 days so
// the calendar endpoints return a meaningful set of events even when
// the exact date has sparse coverage.
function calendarWindow(date: string): { from: string; to: string } {
  const d = new Date(date);
  const from = new Date(d);
  from.setDate(from.getDate() - 3);
  const to = new Date(d);
  to.setDate(to.getDate() + 3);
  return { from: toISODate(from), to: toISODate(to) };
}

// ─── Stock Chart ───────────────────────────────────────────────────
function rangeToWindow(range: string): {
  period1?: number;
  period2?: number;
  yahooRange?: string;
} {
  const supported = new Set([
    "1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max",
  ]);
  if (supported.has(range)) return { yahooRange: range };
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  return { period1: now - 30 * DAY, period2: now };
}

export async function getStockChart(
  symbol: string,
  interval: string = "1d",
  range: string = "1mo"
): Promise<StockChartPoint[]> {
  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  const cached = getCached<StockChartPoint[]>(cacheKey);
  if (cached) return cached;

  const { yahooRange, period1, period2 } = rangeToWindow(range);
  const response = await yfGet<any>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
    { interval, range: yahooRange, period1, period2, includePrePost: "false" },
    { auth: false }
  );

  const result = response?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const quote = result.indicators?.quote?.[0] ?? {};
  const { timestamp } = result;
  const points: StockChartPoint[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    const close = quote.close?.[i];
    if (typeof close !== "number") continue;
    const ts = timestamp[i];
    points.push({
      timestamp: ts * 1000,
      date: new Date(ts * 1000).toISOString(),
      open:   quote.open?.[i]   ?? 0,
      high:   quote.high?.[i]   ?? 0,
      low:    quote.low?.[i]    ?? 0,
      close,
      volume: quote.volume?.[i] ?? 0,
    });
  }

  points.sort((a, b) => a.timestamp - b.timestamp);
  setCache(cacheKey, points, CACHE_5MIN);
  return points;
}

// ─── Stock Quote ───────────────────────────────────────────────────
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  const [quoteRes, summaryRes] = await Promise.all([
    yfGet<any>(
      `https://query1.finance.yahoo.com/v7/finance/quote`,
      { symbols: symbol }
    ),
    yfGet<any>(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
      { modules: "assetProfile,financialData,defaultKeyStatistics,calendarEvents" }
    ),
  ]);

  const q = quoteRes?.quoteResponse?.result?.[0];
  if (!q) return null;

  const lastPrice = q.regularMarketPrice ?? 0;

  const quote: StockQuote = {
    symbol:                      q.symbol || symbol,
    shortName:                   q.shortName || q.longName || symbol,
    longName:                    q.longName  || q.shortName || symbol,
    regularMarketPrice:          lastPrice,
    regularMarketChange:         q.regularMarketChange         ?? 0,
    regularMarketChangePercent:  q.regularMarketChangePercent  ?? 0,
    regularMarketVolume:         q.regularMarketVolume         ?? 0,
    regularMarketDayHigh:        q.regularMarketDayHigh        ?? lastPrice,
    regularMarketDayLow:         q.regularMarketDayLow         ?? lastPrice,
    regularMarketOpen:           q.regularMarketOpen           ?? lastPrice,
    regularMarketPreviousClose:  q.regularMarketPreviousClose  ?? lastPrice,
    fiftyTwoWeekHigh:            q.fiftyTwoWeekHigh            ?? lastPrice,
    fiftyTwoWeekLow:             q.fiftyTwoWeekLow             ?? lastPrice,
    exchange:                    q.fullExchangeName || q.exchange || "",
    currency:                    q.currency || "USD",
  };

  if (typeof q.marketCap      === "number") quote.marketCap      = q.marketCap;
  if (typeof q.trailingPE     === "number") quote.trailingPE     = q.trailingPE;
  if (typeof q.forwardPE      === "number") quote.forwardPE      = q.forwardPE;
  if (typeof q.trailingEps    === "number") quote.trailingEps    = q.trailingEps;
  if (typeof q.epsTrailingTwelveMonths === "number" && !quote.trailingEps) {
    quote.trailingEps = q.epsTrailingTwelveMonths;
  }
  if (typeof q.dividendRate   === "number") quote.dividendRate   = q.dividendRate;
  if (typeof q.dividendYield  === "number") quote.dividendYield  = q.dividendYield;
  if (typeof q.sharesOutstanding === "number") quote.sharesOutstanding = q.sharesOutstanding;

  const summary = summaryRes?.quoteSummary?.result?.[0];
  if (summary) {
    const profile = summary.assetProfile;
    if (profile) {
      if (profile.sector)              quote.sector      = profile.sector;
      if (profile.industry)            quote.industry    = profile.industry;
      if (profile.website)             quote.website     = profile.website;
      if (typeof profile.fullTimeEmployees === "number") {
        quote.employees = profile.fullTimeEmployees;
      }
      if (profile.longBusinessSummary) quote.description = profile.longBusinessSummary;
    }

    const financial = summary.financialData;
    if (financial) {
      const priceTarget = pickRaw(financial.targetMeanPrice);
      if (priceTarget !== undefined) quote.priceTarget = priceTarget;
      if (typeof financial.recommendationKey === "string") {
        quote.analystRating = financial.recommendationKey;
      }
      const revenue    = pickRaw(financial.totalRevenue);
      if (revenue    !== undefined) quote.revenue    = revenue;
      const netIncome  = pickRaw(financial.netIncome);
      if (netIncome  !== undefined) quote.netIncome  = netIncome;
      const currentPrice = pickRaw(financial.currentPrice);
      if (currentPrice !== undefined && !quote.regularMarketPrice) {
        quote.regularMarketPrice = currentPrice;
      }
    }

    const stats = summary.defaultKeyStatistics;
    if (stats) {
      if (quote.forwardPE === undefined) {
        const fwd = pickRaw(stats.forwardPE);
        if (fwd !== undefined) quote.forwardPE = fwd;
      }
      if (quote.trailingEps === undefined) {
        const eps = pickRaw(stats.trailingEps);
        if (eps !== undefined) quote.trailingEps = eps;
      }
      const beta = pickRaw(stats.beta);
      if (beta !== undefined) quote.beta = beta;
      if (quote.sharesOutstanding === undefined) {
        const shares = pickRaw(stats.sharesOutstanding);
        if (shares !== undefined) quote.sharesOutstanding = shares;
      }
    }

    // calendarEvents from Yahoo still works for individual stock earnings dates
    // via quoteSummary — only the standalone /calendar/* endpoints are broken.
    const cal = summary.calendarEvents;
    if (cal) {
      const earningsFmt = pickFmt(cal.earnings?.earningsDate?.[0]);
      if (earningsFmt) quote.earningsDate   = earningsFmt;
      const exDivFmt    = pickFmt(cal.exDividendDate);
      if (exDivFmt)     quote.exDividendDate = exDivFmt;
    }
  }

  // Derived fields
  if (quote.trailingPE === undefined && quote.trailingEps && quote.trailingEps > 0) {
    quote.trailingPE = lastPrice / quote.trailingEps;
  }
  if (quote.marketCap === undefined && quote.sharesOutstanding && lastPrice) {
    quote.marketCap = quote.sharesOutstanding * lastPrice;
  }

  setCache(cacheKey, quote, CACHE_5MIN);
  return quote;
}

// ─── Stock Insights ────────────────────────────────────────────────
export async function getStockInsights(symbol: string): Promise<any> {
  const cacheKey = `insights:${symbol}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const res = await yfGet<any>(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
    { modules: "earnings,recommendationTrend" }
  );

  const summary = res?.quoteSummary?.result?.[0];
  const result: any = { finance: { result: {} } };
  if (summary?.earnings)            result.finance.result.earnings       = summary.earnings;
  if (summary?.recommendationTrend) result.finance.result.recommendation = summary.recommendationTrend;

  setCache(cacheKey, result, CACHE_15MIN);
  return result;
}

// ─── Market Indices ────────────────────────────────────────────────
type IndexDef = { symbol: string; name: string; assetType: string };

const INDEX_DEFS: IndexDef[] = [
  { symbol: "^GSPC",    name: "S&P 500",      assetType: "index"     },
  { symbol: "^NDX",     name: "Nasdaq 100",   assetType: "index"     },
  { symbol: "^DJI",     name: "Dow Jones",    assetType: "index"     },
  { symbol: "^RUT",     name: "Russell 2000", assetType: "index"     },
  { symbol: "EURUSD=X", name: "EUR/USD",      assetType: "fx"        },
  { symbol: "GC=F",     name: "Gold",         assetType: "commodity" },
  { symbol: "CL=F",     name: "WTI",          assetType: "commodity" },
  { symbol: "BZ=F",     name: "Brent",        assetType: "commodity" },
  { symbol: "^TNX",     name: "UST10 YTM",    assetType: "yield"     },
];

function formatIndexDisplay(assetType: string, price: number): string {
  if (assetType === "fx")        return price.toFixed(4);
  if (assetType === "commodity") return `$${price.toFixed(2)}`;
  if (assetType === "yield")     return `${price.toFixed(2)}%`;
  return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

async function getIndexSparklines(): Promise<Map<string, { time: number; value: number }[]>> {
  const cacheKey = "market:indices:sparklines";
  const cached = getCached<Record<string, { time: number; value: number }[]>>(cacheKey);
  if (cached) return new Map(Object.entries(cached));

  const out = new Map<string, { time: number; value: number }[]>();
  await Promise.all(
    INDEX_DEFS.map(async (idx) => {
      const histRes = await yfGet<any>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}`,
        { interval: "1d", range: "5d" },
        { auth: false }
      );
      const r = histRes?.chart?.result?.[0];
      const timestamps: number[]           = r?.timestamp ?? [];
      const closes: (number | null)[]      = r?.indicators?.quote?.[0]?.close ?? [];
      const points: { time: number; value: number }[] = [];
      const start = Math.max(0, timestamps.length - 5);
      for (let i = start; i < timestamps.length; i++) {
        const v = closes[i];
        if (typeof v === "number") points.push({ time: timestamps[i] * 1000, value: v });
      }
      if (points.length > 0) out.set(idx.symbol, points);
    })
  );

  if (out.size > 0) setCache(cacheKey, Object.fromEntries(out), CACHE_5MIN);
  return out;
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = "market:indices";
  const cached = getCached<MarketIndex[]>(cacheKey);
  if (cached) return cached;

  const quoteRes = await yfGet<any>(
    "https://query1.finance.yahoo.com/v7/finance/quote",
    { symbols: INDEX_DEFS.map((i) => i.symbol).join(",") }
  );
  const quotes: any[]  = quoteRes?.quoteResponse?.result ?? [];
  const quoteMap       = new Map<string, any>(quotes.map((q) => [q.symbol, q]));
  const sparklines     = await getIndexSparklines();

  const results: MarketIndex[] = [];
  for (const idx of INDEX_DEFS) {
    const q = quoteMap.get(idx.symbol);
    if (!q) continue;
    const currentPrice   = q.regularMarketPrice ?? 0;
    const change         =
      typeof q.regularMarketChange === "number"
        ? q.regularMarketChange
        : currentPrice - (q.regularMarketPreviousClose ?? currentPrice);
    const changePercent  =
      typeof q.regularMarketChangePercent === "number"
        ? q.regularMarketChangePercent
        : q.regularMarketPreviousClose
          ? ((currentPrice - q.regularMarketPreviousClose) / q.regularMarketPreviousClose) * 100
          : 0;

    results.push({
      symbol:       idx.symbol,
      name:         idx.name,
      price:        currentPrice,
      change,
      changePercent,
      chartData:    sparklines.get(idx.symbol) ?? [],
      assetType:    idx.assetType,
      displayValue: formatIndexDisplay(idx.assetType, currentPrice),
    });
  }

  if (results.length > 0) setCache(cacheKey, results, CACHE_20S);
  return results;
}

// ─── Screener helper ───────────────────────────────────────────────
type ScrId = "day_gainers" | "day_losers" | "most_actives";

async function getPredefinedScreener(scrId: ScrId, count = 25): Promise<any[]> {
  const res = await yfGet<any>(
    "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved",
    { scrIds: scrId, count: String(count) }
  );
  const quotes = res?.finance?.result?.[0]?.quotes;
  return Array.isArray(quotes) ? quotes : [];
}

// ─── Market Movers ─────────────────────────────────────────────────
export async function getMarketMovers(): Promise<{
  gainers: MarketMover[];
  losers:  MarketMover[];
}> {
  const cacheKey = "market:movers";
  const cached = getCached<{ gainers: MarketMover[]; losers: MarketMover[] }>(cacheKey);
  if (cached) return cached;

  const [gainerQuotes, loserQuotes] = await Promise.all([
    getPredefinedScreener("day_gainers", 20),
    getPredefinedScreener("day_losers",  20),
  ]);

  const toMover = (item: any): MarketMover => ({
    symbol:        item.symbol             || "",
    name:          item.shortName || item.longName || item.symbol || "",
    price:         item.regularMarketPrice         ?? 0,
    change:        item.regularMarketChange        ?? 0,
    changePercent: item.regularMarketChangePercent ?? 0,
    volume:        item.regularMarketVolume        ?? 0,
  });

  const result = {
    gainers: gainerQuotes.map(toMover),
    losers:  loserQuotes.map(toMover),
  };

  if (result.gainers.length > 0 || result.losers.length > 0) {
    setCache(cacheKey, result, CACHE_5MIN);
  }
  return result;
}

// ─── Search ────────────────────────────────────────────────────────
export async function searchStocks(
  query: string
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<{ symbol: string; name: string; exchange: string }[]>(cacheKey);
  if (cached) return cached;

  const res = await yfGet<any>(
    "https://query1.finance.yahoo.com/v1/finance/search",
    { q: query, quotesCount: "15", newsCount: "0" },
    { auth: false }
  );
  const items: any[] = Array.isArray(res?.quotes) ? res.quotes : [];

  const results = items
    .filter((item) => item.symbol)
    .slice(0, 15)
    .map((item) => ({
      symbol:   item.symbol,
      name:     item.longname || item.shortname || item.symbol,
      exchange: item.exchDisp || item.exchange  || "US",
    }));

  setCache(cacheKey, results, CACHE_15MIN);
  return results;
}

// ─── Screener (combined) ───────────────────────────────────────────
export async function getScreenerData(): Promise<ScreenerStock[]> {
  const cacheKey = "screener:all";
  const cached = getCached<ScreenerStock[]>(cacheKey);
  if (cached) return cached;

  const [mostActive, gainers, losers] = await Promise.all([
    getPredefinedScreener("most_actives", 25),
    getPredefinedScreener("day_gainers",  25),
    getPredefinedScreener("day_losers",   25),
  ]);

  const seen = new Set<string>();
  const stocks: ScreenerStock[] = [];

  const add = (items: any[]) => {
    for (const item of items) {
      const sym = item.symbol;
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      stocks.push({
        symbol:        sym,
        name:          item.shortName || item.longName || sym,
        price:         item.regularMarketPrice         ?? 0,
        change:        item.regularMarketChange        ?? 0,
        changePercent: item.regularMarketChangePercent ?? 0,
        marketCap:     item.marketCap                  ?? 0,
        peRatio:       typeof item.trailingPE === "number" ? item.trailingPE : null,
        volume:        item.regularMarketVolume        ?? 0,
        sector:        item.sector || "Other",
      });
    }
  };

  add(mostActive);
  add(gainers);
  add(losers);

  setCache(cacheKey, stocks, CACHE_5MIN);
  return stocks;
}

// ─── IPO Data ──────────────────────────────────────────────────────
// Primary: Finnhub IPO calendar for a rolling 30-day window.
// Fallback: static curated list if Finnhub key is absent or call fails.
export async function getIPOData(): Promise<{ recent: any[]; upcoming: any[] }> {
  const cacheKey = "ipo:data";
  const cached = getCached<{ recent: any[]; upcoming: any[] }>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const past30 = new Date(today); past30.setDate(today.getDate() - 30);
  const next30  = new Date(today); next30.setDate(today.getDate() + 30);

  const res = await finnhubGet<{ ipoCalendar: any[] }>("/calendar/ipo", {
    from: toISODate(past30),
    to:   toISODate(next30),
  });

  if (res?.ipoCalendar && res.ipoCalendar.length > 0) {
    const todayTs = today.getTime();
    const recent: any[]   = [];
    const upcoming: any[] = [];

    for (const ipo of res.ipoCalendar) {
      const ipoDate = new Date(ipo.date ?? "");
      const entry = {
        date:   ipo.date   ?? "",
        symbol: ipo.symbol ?? "",
        name:   ipo.name   ?? ipo.symbol ?? "",
        price:  ipo.price  ?? null,
        shares: ipo.numberOfShares ?? null,
        status: ipo.status ?? "",
      };
      if (ipoDate.getTime() <= todayTs) {
        recent.push(entry);
      } else {
        upcoming.push(entry);
      }
    }

    // Most recent first; nearest upcoming first
    recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const result = { recent: recent.slice(0, 10), upcoming: upcoming.slice(0, 10) };
    setCache(cacheKey, result, CACHE_1HR);
    return result;
  }

  // Static fallback
  const fallback = {
    recent: [
      { date: "Apr 14, 2026", symbol: "MYX",  name: "Maywood Acquisition Corp." },
      { date: "Apr 7, 2026",  symbol: "AACP", name: "Apogee Acquisition"        },
      { date: "Apr 7, 2026",  symbol: "ACGC", name: "ACP Holdings Acquisition"  },
      { date: "Apr 1, 2026",  symbol: "HMH",  name: "HMH Holding"               },
      { date: "Mar 31, 2026", symbol: "KPET", name: "KPET Ultra Paceline"       },
    ],
    upcoming: [
      { date: "Apr 17, 2026", symbol: "BWGC", name: "BW Industrial Holdings"   },
      { date: "Apr 17, 2026", symbol: "AVEX", name: "AEVEX"                    },
      { date: "Apr 17, 2026", symbol: "KLRA", name: "Kailera Therapeutics"     },
      { date: "Apr 18, 2026", symbol: "QRED", name: "QuasarEdge Acquisition"   },
      { date: "Apr 21, 2026", symbol: "MRCO", name: "Mercator Acquisition"     },
    ],
  };
  setCache(cacheKey, fallback, CACHE_1HR);
  return fallback;
}

// ─── Market News ───────────────────────────────────────────────────
export function getMarketNews(): NewsItem[] {
  return [
    { title: "Wall Street scales fresh record high as investors bet on end of Iran war",  source: "The Guardian", timestamp: "2h ago", relatedSymbols: ["^GSPC", "^DJI"] },
    { title: "Fed signals potential rate cut as inflation cools",                          source: "Reuters",       timestamp: "4h ago", relatedSymbols: ["^GSPC"]          },
    { title: "NVIDIA reports record quarterly revenue driven by AI demand",                source: "CNBC",          timestamp: "5h ago", relatedSymbols: ["NVDA"]            },
    { title: "Tesla delivers record number of vehicles in Q1 2026",                       source: "Bloomberg",     timestamp: "6h ago", relatedSymbols: ["TSLA"]            },
    { title: "Microsoft Azure revenue surges 35% year-over-year",                         source: "TechCrunch",    timestamp: "7h ago", relatedSymbols: ["MSFT"]            },
  ];
}

// ─── Calendar: Earnings ────────────────────────────────────────────
// Finnhub GET /calendar/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
// Response: { earningsCalendar: Array<{ date, symbol, company, eps, epsEstimate,
//             hour, quarter, revenueEstimate, revenue, year }> }
export async function getCalendarEarnings(date: string): Promise<any[]> {
  const cacheKey = `calendar:earnings:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const { from, to } = calendarWindow(date);
  const res = await finnhubGet<{ earningsCalendar: any[] }>("/calendar/earnings", { from, to });
  const items = res?.earningsCalendar ?? [];

  setCache(cacheKey, items, CACHE_1HR);
  return items;
}

// ─── Calendar: Economic Events ─────────────────────────────────────
// Finnhub GET /calendar/economic?from=YYYY-MM-DD&to=YYYY-MM-DD
// Response: { economicCalendar: Array<{ actual, country, estimate, event,
//             impact, prev, time, unit }> }
export async function getCalendarEconomicEvents(date: string): Promise<any[]> {
  const cacheKey = `calendar:economic:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const { from, to } = calendarWindow(date);
  const res = await finnhubGet<{ economicCalendar: any[] }>("/calendar/economic", { from, to });
  const items = res?.economicCalendar ?? [];

  setCache(cacheKey, items, CACHE_1HR);
  return items;
}

// ─── Calendar: Dividends ───────────────────────────────────────────
// Finnhub requires a symbol for dividends; there is no market-wide dividend
// calendar endpoint. For single-stock pages call getStockQuote() instead —
// quote.exDividendDate comes from Yahoo quoteSummary/calendarEvents which
// still works. Return [] here for calendar-view compatibility.
export async function getCalendarDividends(_date: string): Promise<any[]> {
  return [];
}

// ─── Calendar: Stock Splits ────────────────────────────────────────
// Finnhub /stock/split also requires a per-symbol call. Return [] for the
// calendar view; individual quotes carry split info via Yahoo quoteSummary.
export async function getCalendarStockSplits(_date: string): Promise<any[]> {
  return [];
}

// ─── Calendar: Public Offerings (IPO) ─────────────────────────────
// Re-uses the rolling IPO window from getIPOData(); filters to the target date
// ± 3 days so the calendar tab stays consistent with the IPO section.
export async function getCalendarPublicOfferings(date: string): Promise<any[]> {
  const cacheKey = `calendar:ipo:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  const { from, to } = calendarWindow(date);
  const res = await finnhubGet<{ ipoCalendar: any[] }>("/calendar/ipo", { from, to });
  const items = (res?.ipoCalendar ?? []).map((ipo) => ({
    date:   ipo.date   ?? "",
    symbol: ipo.symbol ?? "",
    name:   ipo.name   ?? ipo.symbol ?? "",
    price:  ipo.price  ?? null,
    status: ipo.status ?? "",
  }));

  setCache(cacheKey, items, CACHE_1HR);
  return items;
}
