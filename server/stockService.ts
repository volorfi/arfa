import { ENV } from "./_core/env";
import type { StockQuote, StockChartPoint, MarketIndex, NewsItem, MarketMover, ScreenerStock } from "../shared/stockTypes";

// ─── RapidAPI helper with rate limiting ────────────────────────────
const RAPID_BASE = "https://yahoo-finance15.p.rapidapi.com/api";
const MIN_INTERVAL_MS = 600; // ~1.6 req/s to stay well under PRO rate limit
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
      await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
    item.resolve();
  }
  processing = false;
}

async function rapidGet(path: string, params: Record<string, string> = {}, retries = 2): Promise<any> {
  await rateLimitedWait();
  const url = new URL(`${RAPID_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com",
      "x-rapidapi-key": ENV.rapidApiKey,
    },
  });

  // Retry on 429 rate limit
  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 1500));
    return rapidGet(path, params, retries - 1);
  }

  // Handle 302 redirects and 500 server errors gracefully
  if (res.status === 302 || res.status === 500) {
    console.warn(`[RapidAPI] ${res.status} for ${path} - endpoint unavailable`);
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RapidAPI ${res.status}: ${text.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // Some endpoints return HTML instead of JSON (broken endpoints)
    console.warn(`[RapidAPI] Non-JSON response for ${path}`);
    return null;
  }

  return res.json();
}

// Helper that wraps rapidGet to return PromiseSettledResult format
async function safeGet(path: string, params: Record<string, string> = {}): Promise<PromiseSettledResult<any>> {
  try {
    const value = await rapidGet(path, params);
    return { status: "fulfilled", value };
  } catch (reason: any) {
    return { status: "rejected", reason };
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

const CACHE_5MIN = 5 * 60 * 1000;
const CACHE_15MIN = 15 * 60 * 1000;
const CACHE_1HR = 60 * 60 * 1000;

// ─── Stock Chart ───────────────────────────────────────────────────
function getRangeStartMs(range: string): number {
  const now = Date.now();
  const DAY = 86400000;
  switch (range) {
    case "1d": return now - 1 * DAY;
    case "5d": return now - 5 * DAY;
    case "1mo": return now - 30 * DAY;
    case "3mo": return now - 90 * DAY;
    case "6mo": return now - 180 * DAY;
    case "ytd": return new Date(new Date().getFullYear(), 0, 1).getTime();
    case "1y": return now - 365 * DAY;
    case "5y": return now - 5 * 365 * DAY;
    case "max": return 0;
    default: return now - 30 * DAY;
  }
}

export async function getStockChart(symbol: string, interval: string = "1d", range: string = "1mo"): Promise<StockChartPoint[]> {
  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  const cached = getCached<StockChartPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await rapidGet("/v1/markets/stock/history", {
      symbol,
      interval,
      diffandsplits: "false",
    });

    const body = response?.body;
    if (!body || typeof body !== "object") return [];

    const rangeStart = getRangeStartMs(range);

    const points: StockChartPoint[] = Object.entries(body)
      .map(([tsKey, val]: [string, any]) => ({
        timestamp: (val.date_utc || parseInt(tsKey)) * 1000,
        date: val.date || new Date(parseInt(tsKey) * 1000).toISOString(),
        open: val.open ?? 0,
        high: val.high ?? 0,
        low: val.low ?? 0,
        close: val.close ?? 0,
        volume: val.volume ?? 0,
      }))
      .filter((p) => p.close > 0 && p.timestamp >= rangeStart)
      .sort((a, b) => a.timestamp - b.timestamp);

    setCache(cacheKey, points, CACHE_5MIN);
    return points;
  } catch (error) {
    console.error(`[StockService] Chart error for ${symbol}:`, error);
    return [];
  }
}

// ─── Stock Quote ───────────────────────────────────────────────────
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch real-time quote
    const quoteRes = await rapidGet("/v1/markets/quote", { ticker: symbol, type: "STOCKS" });
    const qBody = quoteRes?.body;
    if (!qBody) return null;

    const lastPrice = parseFloat(String(qBody.primaryData?.lastSalePrice || "0").replace(/[$,]/g, "")) || 0;
    const netChange = parseFloat(String(qBody.primaryData?.netChange || "0").replace(/[$,]/g, "")) || 0;
    const pctChange = parseFloat(String(qBody.primaryData?.percentageChange || "0").replace(/[%,]/g, "")) || 0;
    const volume = parseInt(String(qBody.primaryData?.volume || "0").replace(/,/g, ""), 10) || 0;

    // Parse 52-week range
    const rangeStr = qBody.keyStats?.fiftyTwoWeekHighLow?.value || "";
    const [low52, high52] = rangeStr.split(" - ").map((s: string) => parseFloat(s) || 0);

    // Parse day range
    const dayRangeStr = qBody.keyStats?.dayrange?.value || "";
    const [dayLow, dayHigh] = dayRangeStr.split(" - ").map((s: string) => parseFloat(s) || 0);

    const prevClose = lastPrice - netChange;

    // Parse open price from keyStats
    const openStr = qBody.keyStats?.OpenPrice?.value || "";
    const openPrice = parseFloat(openStr) || prevClose || lastPrice;

    const quote: StockQuote = {
      symbol: qBody.symbol || symbol,
      shortName: qBody.companyName || symbol,
      longName: qBody.companyName || symbol,
      regularMarketPrice: lastPrice,
      regularMarketChange: netChange,
      regularMarketChangePercent: pctChange,
      regularMarketVolume: volume,
      regularMarketDayHigh: dayHigh || lastPrice,
      regularMarketDayLow: dayLow || lastPrice,
      regularMarketOpen: openPrice,
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: high52 || lastPrice,
      fiftyTwoWeekLow: low52 || lastPrice,
      exchange: qBody.exchange || "",
      currency: qBody.primaryData?.currency || "USD",
    };

    // Enrich with modules data sequentially to respect rate limits
    const [profileResult, financialResult, statisticsResult, calEventsResult] = [
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "profile" }),
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "financial-data" }),
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "statistics" }),
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "calendar-events" }),
    ];

    // Profile
    if (profileResult.status === "fulfilled") {
      const p = profileResult.value?.body;
      if (p) {
        if (p.sector) quote.sector = p.sector;
        if (p.industry) quote.industry = p.industry;
        if (p.website) quote.website = p.website;
        if (p.fullTimeEmployees) quote.employees = p.fullTimeEmployees;
        if (p.longBusinessSummary) quote.description = p.longBusinessSummary;
      }
    }

    // Financial data
    if (financialResult.status === "fulfilled") {
      const f = financialResult.value?.body;
      if (f) {
        if (f.currentPrice?.raw) quote.regularMarketPrice = f.currentPrice.raw;
        if (f.targetMeanPrice?.raw) quote.priceTarget = f.targetMeanPrice.raw;
        if (f.recommendationKey) quote.analystRating = f.recommendationKey;
        if (f.totalRevenue?.raw) quote.revenue = f.totalRevenue.raw;
        if (f.netIncome?.raw) quote.netIncome = f.netIncome.raw;
        // beta comes from statistics module, not financial-data
      }
    }

    // Statistics
    if (statisticsResult.status === "fulfilled") {
      const s = statisticsResult.value?.body;
      if (s) {
        if (s.forwardPE?.raw) quote.forwardPE = s.forwardPE.raw;
        if (s.trailingEps?.raw) {
          quote.trailingEps = s.trailingEps.raw;
          // Calculate trailing PE from price / EPS
          if (lastPrice && s.trailingEps.raw > 0) {
            quote.trailingPE = lastPrice / s.trailingEps.raw;
          }
        }
        if (s.beta?.raw) quote.beta = s.beta.raw;
        if (s.sharesOutstanding?.raw) quote.sharesOutstanding = s.sharesOutstanding.raw;
        // Dividend: use lastDividendValue * 4 as annual rate estimate
        if (s.lastDividendValue?.raw) {
          quote.dividendRate = s.lastDividendValue.raw * 4;
          if (lastPrice) quote.dividendYield = (quote.dividendRate / lastPrice);
        }
        // Calculate marketCap from shares * price
        if (s.sharesOutstanding?.raw && lastPrice) {
          quote.marketCap = s.sharesOutstanding.raw * lastPrice;
        } else if (s.enterpriseValue?.raw) {
          quote.marketCap = s.enterpriseValue.raw;
        }
      }
    }

    // Calendar events (earnings date, ex-dividend)
    if (calEventsResult.status === "fulfilled") {
      const c = calEventsResult.value?.body;
      if (c) {
        if (c.earnings?.earningsDate?.[0]?.fmt) quote.earningsDate = c.earnings.earningsDate[0].fmt;
        if (c.exDividendDate?.fmt) quote.exDividendDate = c.exDividendDate.fmt;
      }
    }

    setCache(cacheKey, quote, CACHE_5MIN);
    return quote;
  } catch (error) {
    console.error(`[StockService] Quote error for ${symbol}:`, error);
    return null;
  }
}

// ─── Stock Insights (modules) ──────────────────────────────────────
export async function getStockInsights(symbol: string): Promise<any> {
  const cacheKey = `insights:${symbol}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const [earningsRes, recRes] = [
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "earnings" }),
      await safeGet("/v1/markets/stock/modules", { ticker: symbol, module: "recommendation-trend" }),
    ];

    const result: any = { finance: { result: {} } };

    if (earningsRes.status === "fulfilled" && earningsRes.value?.body) {
      result.finance.result.earnings = earningsRes.value.body;
    }
    if (recRes.status === "fulfilled" && recRes.value?.body) {
      result.finance.result.recommendation = recRes.value.body;
    }

    setCache(cacheKey, result, CACHE_15MIN);
    return result;
  } catch (error) {
    console.error(`[StockService] Insights error for ${symbol}:`, error);
    return null;
  }
}

// ─── Market Indices ────────────────────────────────────────────────
export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = "market:indices";
  const cached = getCached<MarketIndex[]>(cacheKey);
  if (cached) return cached;

  const indices: { symbol: string; name: string; assetType: string }[] = [
    { symbol: "^GSPC", name: "S&P 500", assetType: "index" },
    { symbol: "^NDX", name: "Nasdaq 100", assetType: "index" },
    { symbol: "^DJI", name: "Dow Jones", assetType: "index" },
    { symbol: "^RUT", name: "Russell 2000", assetType: "index" },
    { symbol: "EURUSD=X", name: "EUR/USD", assetType: "fx" },
    { symbol: "GC=F", name: "Gold", assetType: "commodity" },
    { symbol: "CL=F", name: "WTI", assetType: "commodity" },
    { symbol: "BZ=F", name: "Brent", assetType: "commodity" },
    { symbol: "^TNX", name: "UST10 YTM", assetType: "yield" },
  ];

  const results: MarketIndex[] = [];

  // Use stock/history endpoint which works for all asset types (meta has current price)
  for (const idx of indices) {
    try {
      const histRes = await rapidGet("/v1/markets/stock/history", {
        symbol: idx.symbol,
        interval: "1d",
        diffandsplits: "false",
      });

      const meta = histRes?.meta;
      const body = histRes?.body;
      if (!meta) continue;

      const currentPrice = meta.regularMarketPrice ?? 0;
      // Get previous close from the second-to-last history point
      let prevClose = meta.chartPreviousClose ?? 0;
      if (body && typeof body === "object") {
        const keys = Object.keys(body).sort();
        if (keys.length >= 2) {
          const prevPoint = body[keys[keys.length - 2]];
          prevClose = prevPoint?.close ?? prevClose;
        }
      }
      if (!prevClose) prevClose = currentPrice;

      const change = currentPrice - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      // Build mini chart data from last 5 points
      const chartData: { time: number; value: number }[] = [];
      if (body && typeof body === "object") {
        const sortedKeys = Object.keys(body).sort();
        const recentKeys = sortedKeys.slice(-5);
        for (const k of recentKeys) {
          const pt = body[k];
          chartData.push({ time: (pt.date_utc || parseInt(k)) * 1000, value: pt.close ?? 0 });
        }
      }

      let displayValue: string;
      if (idx.assetType === "fx") displayValue = currentPrice.toFixed(4);
      else if (idx.assetType === "commodity") displayValue = `$${currentPrice.toFixed(2)}`;
      else if (idx.assetType === "yield") displayValue = `${currentPrice.toFixed(2)}%`;
      else displayValue = currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 });

      results.push({
        symbol: idx.symbol,
        name: idx.name,
        price: currentPrice,
        change,
        changePercent,
        chartData,
        assetType: idx.assetType,
        displayValue,
      });
    } catch (error) {
      console.error(`[StockService] Index error for ${idx.symbol}:`, error);
    }
  }

  if (results.length > 0) {
    setCache(cacheKey, results, CACHE_5MIN);
  }
  return results;
}

// ─── Market Movers ─────────────────────────────────────────────────
export async function getMarketMovers(): Promise<{ gainers: MarketMover[]; losers: MarketMover[] }> {
  const cacheKey = "market:movers";
  const cached = getCached<{ gainers: MarketMover[]; losers: MarketMover[] }>(cacheKey);
  if (cached) return cached;

  try {
    const [gainersRes, losersRes] = [
      await safeGet("/v1/markets/screener", { list: "day_gainers" }),
      await safeGet("/v1/markets/screener", { list: "day_losers" }),
    ];

    const parseMovers = (res: PromiseSettledResult<any>): MarketMover[] => {
      if (res.status !== "fulfilled") return [];
      const items = res.value?.body || [];
      if (!Array.isArray(items)) return [];
      return items.slice(0, 20).map((item: any) => ({
        symbol: item.symbol || "",
        name: item.shortName || item.longName || item.symbol || "",
        price: item.regularMarketPrice?.raw ?? item.regularMarketPrice ?? 0,
        change: item.regularMarketChange?.raw ?? item.regularMarketChange ?? 0,
        changePercent: item.regularMarketChangePercent?.raw ?? item.regularMarketChangePercent ?? 0,
        volume: item.regularMarketVolume?.raw ?? item.regularMarketVolume ?? 0,
      }));
    };

    const result = {
      gainers: parseMovers(gainersRes),
      losers: parseMovers(losersRes),
    };

    if (result.gainers.length > 0 || result.losers.length > 0) {
      setCache(cacheKey, result, CACHE_5MIN);
    }
    return result;
  } catch (error) {
    console.error("[StockService] Movers error:", error);
    return { gainers: [], losers: [] };
  }
}

// ─── Search ────────────────────────────────────────────────────────
export async function searchStocks(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<{ symbol: string; name: string; exchange: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await rapidGet("/v1/markets/search", { search: query });
    const items = response?.body || [];
    if (!Array.isArray(items)) return [];

    const results = items
      .filter((item: any) => item.symbol)
      .slice(0, 15)
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.name || item.longname || item.shortname || item.symbol,
        exchange: item.exchDisp || item.exchange || "US",
      }));

    setCache(cacheKey, results, CACHE_15MIN);
    return results;
  } catch (error) {
    console.error("[StockService] Search error:", error);
    return [];
  }
}

// ─── Screener ──────────────────────────────────────────────────────
export async function getScreenerData(): Promise<ScreenerStock[]> {
  const cacheKey = "screener:all";
  const cached = getCached<ScreenerStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const [mostActive, gainers, losers] = [
      await safeGet("/v1/markets/screener", { list: "most_actives" }),
      await safeGet("/v1/markets/screener", { list: "day_gainers" }),
      await safeGet("/v1/markets/screener", { list: "day_losers" }),
    ];

    const seen = new Set<string>();
    const stocks: ScreenerStock[] = [];

    const parseScreener = (res: PromiseSettledResult<any>) => {
      if (res.status !== "fulfilled") return;
      const items = res.value?.body || [];
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const sym = item.symbol;
        if (!sym || seen.has(sym)) continue;
        seen.add(sym);
        stocks.push({
          symbol: sym,
          name: item.shortName || item.longName || sym,
          price: item.regularMarketPrice?.raw ?? item.regularMarketPrice ?? 0,
          change: item.regularMarketChange?.raw ?? item.regularMarketChange ?? 0,
          changePercent: item.regularMarketChangePercent?.raw ?? item.regularMarketChangePercent ?? 0,
          marketCap: item.marketCap?.raw ?? item.marketCap ?? 0,
          peRatio: item.trailingPE?.raw ?? item.trailingPE ?? null,
          volume: item.regularMarketVolume?.raw ?? item.regularMarketVolume ?? 0,
          sector: item.sector || "Other",
        });
      }
    };

    parseScreener(mostActive);
    parseScreener(gainers);
    parseScreener(losers);

    setCache(cacheKey, stocks, CACHE_5MIN);
    return stocks;
  } catch (error) {
    console.error("[StockService] Screener error:", error);
    return [];
  }
}

// ─── IPO Data ──────────────────────────────────────────────────────
export function getIPOData(): { recent: any[]; upcoming: any[] } {
  // IPO endpoint returns HTML, so we keep static data for now
  // Will be replaced by calendar/ipo when available
  const recent = [
    { date: "Apr 14, 2026", symbol: "MYX", name: "Maywood Acquisition Corp." },
    { date: "Apr 7, 2026", symbol: "AACP", name: "Apogee Acquisition" },
    { date: "Apr 7, 2026", symbol: "ACGC", name: "ACP Holdings Acquisition" },
    { date: "Apr 1, 2026", symbol: "HMH", name: "HMH Holding" },
    { date: "Mar 31, 2026", symbol: "KPET", name: "KPET Ultra Paceline" },
  ];
  const upcoming = [
    { date: "Apr 17, 2026", symbol: "BWGC", name: "BW Industrial Holdings" },
    { date: "Apr 17, 2026", symbol: "AVEX", name: "AEVEX" },
    { date: "Apr 17, 2026", symbol: "KLRA", name: "Kailera Therapeutics" },
    { date: "Apr 18, 2026", symbol: "QRED", name: "QuasarEdge Acquisition" },
    { date: "Apr 21, 2026", symbol: "MRCO", name: "Mercator Acquisition" },
  ];
  return { recent, upcoming };
}

// ─── Market News (static fallback) ────────────────────────────────
export function getMarketNews(): NewsItem[] {
  return [
    { title: "Wall Street scales fresh record high as investors bet on end of Iran war", source: "The Guardian", timestamp: "2h ago", relatedSymbols: ["^GSPC", "^DJI"] },
    { title: "Fed signals potential rate cut as inflation cools", source: "Reuters", timestamp: "4h ago", relatedSymbols: ["^GSPC"] },
    { title: "NVIDIA reports record quarterly revenue driven by AI demand", source: "CNBC", timestamp: "5h ago", relatedSymbols: ["NVDA"] },
    { title: "Tesla delivers record number of vehicles in Q1 2026", source: "Bloomberg", timestamp: "6h ago", relatedSymbols: ["TSLA"] },
    { title: "Microsoft Azure revenue surges 35% year-over-year", source: "TechCrunch", timestamp: "7h ago", relatedSymbols: ["MSFT"] },
  ];
}

// ─── Calendar Events ───────────────────────────────────────────────
export async function getCalendarEarnings(date: string): Promise<any[]> {
  const cacheKey = `cal:earnings:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await rapidGet("/v1/markets/calendar/earnings", { date });
    const items = res?.body || [];
    if (!Array.isArray(items)) return [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (error) {
    console.error("[StockService] Calendar earnings error:", error);
    return [];
  }
}

export async function getCalendarDividends(date: string): Promise<any[]> {
  const cacheKey = `cal:dividends:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await rapidGet("/v1/markets/calendar/dividends", { date });
    const items = res?.body || [];
    if (!Array.isArray(items)) return [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (error) {
    console.error("[StockService] Calendar dividends error:", error);
    return [];
  }
}

export async function getCalendarStockSplits(date: string): Promise<any[]> {
  const cacheKey = `cal:splits:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await rapidGet("/v1/markets/calendar/stock-splits", { date });
    const items = res?.body || [];
    if (!Array.isArray(items)) return [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (error) {
    console.error("[StockService] Calendar stock-splits error:", error);
    return [];
  }
}

export async function getCalendarEconomicEvents(date: string): Promise<any[]> {
  const cacheKey = `cal:econ:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await rapidGet("/v1/markets/calendar/economic_events", { date });
    if (!res) return []; // endpoint unavailable (500/302)
    const items = res.body || [];
    if (!Array.isArray(items)) return [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (error) {
    console.error("[StockService] Calendar economic events error:", error);
    return [];
  }
}

export async function getCalendarPublicOfferings(date: string): Promise<any[]> {
  const cacheKey = `cal:ipo:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    // public_offerings endpoint redirects; use ipo endpoint instead
    const res = await rapidGet("/v1/markets/calendar/ipo", { date });
    if (!res) return []; // endpoint unavailable
    const items = res.body || [];
    if (!Array.isArray(items)) return [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (error) {
    console.error("[StockService] Calendar public offerings error:", error);
    return [];
  }
}
