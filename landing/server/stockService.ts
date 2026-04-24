import type { StockQuote, StockChartPoint, MarketIndex, NewsItem, MarketMover, ScreenerStock } from "../shared/stockTypes";

/**
 * stockService.ts — Yahoo Finance direct integration
 * MIGRATION: was yahoo-finance15.p.rapidapi.com (paid)
 * NOW: calls Yahoo Finance APIs directly (free, no API key needed)
 *
 * Uses the same crumb/cookie auth that optionsService already implements.
 * Crumb is cached for 24h and refreshed on 401.
 */

// ─── Crumb management (shared with optionsService) ────────────────────────────

let _crumbCache: { crumb: string; cookies: string; expiresAt: number } | null = null;

async function getCrumb(): Promise<{ crumb: string; cookies: string }> {
  if (_crumbCache && Date.now() < _crumbCache.expiresAt) {
    return { crumb: _crumbCache.crumb, cookies: _crumbCache.cookies };
  }

  const cookieResp = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    redirect: "follow",
  });
  const rawCookies = (cookieResp.headers.get("set-cookie") || "")
    .split(",")
    .map(c => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  const crumbResp = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": rawCookies,
    },
  });
  if (!crumbResp.ok) throw new Error(`Crumb fetch failed: ${crumbResp.status}`);
  const crumb = await crumbResp.text();

  _crumbCache = { crumb, cookies: rawCookies, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  return { crumb, cookies: rawCookies };
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function yahooGet(url: string, retries = 2): Promise<any> {
  const { crumb, cookies } = await getCrumb();
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${sep}crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": cookies,
      "Accept": "application/json",
    },
  });

  if (res.status === 401 && retries > 0) {
    _crumbCache = null; // force crumb refresh
    return yahooGet(url, retries - 1);
  }

  if (res.status === 404 || res.status === 422) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yahoo Finance ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function safeYahooGet(url: string): Promise<PromiseSettledResult<any>> {
  try {
    return { status: "fulfilled", value: await yahooGet(url) };
  } catch (reason: any) {
    return { status: "rejected", reason };
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

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

const CACHE_5MIN  = 5  * 60 * 1000;
const CACHE_15MIN = 15 * 60 * 1000;
const CACHE_1HR   = 60 * 60 * 1000;

// ─── QuoteSummary helper ──────────────────────────────────────────────────────

async function getQuoteSummary(symbol: string, modules: string[]): Promise<Record<string, any>> {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(",")}`;
  const res = await yahooGet(url);
  const result = res?.quoteSummary?.result?.[0];
  return result ?? {};
}

// ─── Stock Chart ──────────────────────────────────────────────────────────────

export async function getStockChart(symbol: string, interval = "1d", range = "1mo"): Promise<StockChartPoint[]> {
  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  const cached = getCached<StockChartPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const res = await yahooGet(url);
    const chart = res?.chart?.result?.[0];
    if (!chart) return [];

    const timestamps: number[] = chart.timestamp ?? [];
    const ohlcv = chart.indicators?.quote?.[0] ?? {};

    const points: StockChartPoint[] = timestamps.map((ts, i) => ({
      timestamp: ts * 1000,
      date:      new Date(ts * 1000).toISOString(),
      open:      ohlcv.open?.[i]   ?? 0,
      high:      ohlcv.high?.[i]   ?? 0,
      low:       ohlcv.low?.[i]    ?? 0,
      close:     ohlcv.close?.[i]  ?? 0,
      volume:    ohlcv.volume?.[i] ?? 0,
    })).filter(p => p.close > 0);

    setCache(cacheKey, points, CACHE_5MIN);
    return points;
  } catch (err) {
    console.error(`[StockService] Chart error for ${symbol}:`, err);
    return [];
  }
}

// ─── Stock Quote ──────────────────────────────────────────────────────────────

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  try {
    const modules = ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "calendarEvents", "assetProfile"];
    const data = await getQuoteSummary(symbol, modules);
    const price = data.price ?? {};

    const lastPrice   = price.regularMarketPrice?.raw ?? 0;
    const netChange   = price.regularMarketChange?.raw ?? 0;
    const pctChange   = price.regularMarketChangePercent?.raw ?? 0;

    const stats    = data.defaultKeyStatistics ?? {};
    const fin      = data.financialData ?? {};
    const summary  = data.summaryDetail ?? {};
    const profile  = data.assetProfile ?? {};
    const calendar = data.calendarEvents ?? {};

    const quote: StockQuote = {
      symbol:                    price.symbol ?? symbol,
      shortName:                 price.shortName ?? symbol,
      longName:                  price.longName ?? price.shortName ?? symbol,
      regularMarketPrice:        lastPrice,
      regularMarketChange:       netChange,
      regularMarketChangePercent:pctChange,
      regularMarketVolume:       price.regularMarketVolume?.raw ?? 0,
      regularMarketDayHigh:      price.regularMarketDayHigh?.raw ?? lastPrice,
      regularMarketDayLow:       price.regularMarketDayLow?.raw ?? lastPrice,
      regularMarketOpen:         price.regularMarketOpen?.raw ?? lastPrice,
      regularMarketPreviousClose:price.regularMarketPreviousClose?.raw ?? lastPrice - netChange,
      fiftyTwoWeekHigh:          summary.fiftyTwoWeekHigh?.raw ?? lastPrice,
      fiftyTwoWeekLow:           summary.fiftyTwoWeekLow?.raw ?? lastPrice,
      exchange:                  price.exchangeName ?? "",
      currency:                  price.currency ?? "USD",
      marketCap:                 price.marketCap?.raw ?? 0,
      // Valuation
      trailingPE:                summary.trailingPE?.raw,
      forwardPE:                 summary.forwardPE?.raw,
      trailingEps:               stats.trailingEps?.raw,
      beta:                      stats.beta?.raw,
      sharesOutstanding:         stats.sharesOutstanding?.raw,
      // Dividends
      dividendRate:              summary.dividendRate?.raw,
      dividendYield:             summary.dividendYield?.raw,
      exDividendDate:            summary.exDividendDate?.fmt,
      // Fundamentals
      revenue:                   fin.totalRevenue?.raw,
      netIncome:                 fin.netIncomeToCommon?.raw,
      priceTarget:               fin.targetMeanPrice?.raw,
      analystRating:             fin.recommendationKey,
      // Profile
      sector:                    profile.sector,
      industry:                  profile.industry,
      website:                   profile.website,
      employees:                 profile.fullTimeEmployees,
      description:               profile.longBusinessSummary,
      // Calendar
      earningsDate:              calendar.earnings?.earningsDate?.[0]?.fmt,
    };

    setCache(cacheKey, quote, CACHE_5MIN);
    return quote;
  } catch (err) {
    console.error(`[StockService] Quote error for ${symbol}:`, err);
    return null;
  }
}

// ─── Stock Insights ───────────────────────────────────────────────────────────

export async function getStockInsights(symbol: string): Promise<any> {
  const cacheKey = `insights:${symbol}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const data = await getQuoteSummary(symbol, ["earnings", "recommendationTrend"]);
    const result = { finance: { result: {} as any } };
    if (data.earnings)             result.finance.result.earnings       = data.earnings;
    if (data.recommendationTrend)  result.finance.result.recommendation = data.recommendationTrend;
    setCache(cacheKey, result, CACHE_15MIN);
    return result;
  } catch (err) {
    console.error(`[StockService] Insights error for ${symbol}:`, err);
    return null;
  }
}

// ─── Market Indices ───────────────────────────────────────────────────────────

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = "market:indices";
  const cached = getCached<MarketIndex[]>(cacheKey);
  if (cached) return cached;

  const indices = [
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

  const symbols = indices.map(i => i.symbol).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  const res = await safeYahooGet(url);

  const results: MarketIndex[] = [];

  if (res.status === "fulfilled") {
    const quotes: any[] = res.value?.quoteResponse?.result ?? [];

    for (const idx of indices) {
      const q = quotes.find((q: any) => q.symbol === idx.symbol);
      if (!q) continue;

      const currentPrice = q.regularMarketPrice ?? 0;
      const prevClose    = q.regularMarketPreviousClose ?? currentPrice;
      const change       = currentPrice - prevClose;
      const changePct    = prevClose ? (change / prevClose) * 100 : 0;

      let displayValue: string;
      if (idx.assetType === "fx")        displayValue = currentPrice.toFixed(4);
      else if (idx.assetType === "commodity") displayValue = `$${currentPrice.toFixed(2)}`;
      else if (idx.assetType === "yield") displayValue = `${currentPrice.toFixed(2)}%`;
      else displayValue = currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 });

      results.push({ symbol: idx.symbol, name: idx.name, price: currentPrice, change, changePercent: changePct, chartData: [], assetType: idx.assetType, displayValue });
    }
  }

  if (results.length > 0) setCache(cacheKey, results, CACHE_5MIN);
  return results;
}

// ─── Market Movers ────────────────────────────────────────────────────────────

export async function getMarketMovers(): Promise<{ gainers: MarketMover[]; losers: MarketMover[] }> {
  const cacheKey = "market:movers";
  const cached = getCached<{ gainers: MarketMover[]; losers: MarketMover[] }>(cacheKey);
  if (cached) return cached;

  const parse = (res: PromiseSettledResult<any>): MarketMover[] => {
    if (res.status !== "fulfilled") return [];
    const items: any[] = res.value?.finance?.result?.[0]?.quotes ?? [];
    return items.slice(0, 20).map(item => ({
      symbol:        item.symbol ?? "",
      name:          item.shortName ?? item.longName ?? item.symbol ?? "",
      price:         item.regularMarketPrice ?? 0,
      change:        item.regularMarketChange ?? 0,
      changePercent: item.regularMarketChangePercent ?? 0,
      volume:        item.regularMarketVolume ?? 0,
    }));
  };

  const [gainersRes, losersRes] = await Promise.all([
    safeYahooGet("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25"),
    safeYahooGet("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers&count=25"),
  ]);

  const result = { gainers: parse(gainersRes), losers: parse(losersRes) };
  if (result.gainers.length > 0 || result.losers.length > 0) setCache(cacheKey, result, CACHE_5MIN);
  return result;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<{ symbol: string; name: string; exchange: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0`;
    const res = await yahooGet(url);
    const items: any[] = res?.quotes ?? [];
    const results = items
      .filter(i => i.symbol && (i.quoteType === "EQUITY" || i.quoteType === "ETF" || i.quoteType === "INDEX"))
      .slice(0, 15)
      .map(i => ({ symbol: i.symbol, name: i.longname ?? i.shortname ?? i.symbol, exchange: i.exchDisp ?? i.exchange ?? "US" }));

    setCache(cacheKey, results, CACHE_15MIN);
    return results;
  } catch (err) {
    console.error("[StockService] Search error:", err);
    return [];
  }
}

// ─── Screener ─────────────────────────────────────────────────────────────────

export async function getScreenerData(): Promise<ScreenerStock[]> {
  const cacheKey = "screener:all";
  const cached = getCached<ScreenerStock[]>(cacheKey);
  if (cached) return cached;

  const scrIds = ["most_actives", "day_gainers", "day_losers"];
  const results = await Promise.allSettled(
    scrIds.map(id => yahooGet(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${id}&count=25`))
  );

  const seen = new Set<string>();
  const stocks: ScreenerStock[] = [];

  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    const items: any[] = res.value?.finance?.result?.[0]?.quotes ?? [];
    for (const item of items) {
      const sym = item.symbol;
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      stocks.push({
        symbol:        sym,
        name:          item.shortName ?? item.longName ?? sym,
        price:         item.regularMarketPrice ?? 0,
        change:        item.regularMarketChange ?? 0,
        changePercent: item.regularMarketChangePercent ?? 0,
        marketCap:     item.marketCap ?? 0,
        peRatio:       item.trailingPE ?? null,
        volume:        item.regularMarketVolume ?? 0,
        sector:        item.sector ?? "Other",
      });
    }
  }

  if (stocks.length > 0) setCache(cacheKey, stocks, CACHE_5MIN);
  return stocks;
}

// ─── IPO Data ─────────────────────────────────────────────────────────────────

export async function getIPOData(): Promise<{ recent: any[]; upcoming: any[] }> {
  // Yahoo Finance doesn't have a public IPO calendar endpoint —
  // keeping the static fallback (same as before)
  return {
    recent: [
      { date: "Apr 14, 2026", symbol: "MYX",  name: "Maywood Acquisition Corp." },
      { date: "Apr 7, 2026",  symbol: "AACP", name: "Apogee Acquisition" },
      { date: "Apr 7, 2026",  symbol: "ACGC", name: "ACP Holdings Acquisition" },
      { date: "Apr 1, 2026",  symbol: "HMH",  name: "HMH Holding" },
      { date: "Mar 31, 2026", symbol: "KPET", name: "KPET Ultra Paceline" },
    ],
    upcoming: [
      { date: "Apr 17, 2026", symbol: "BWGC", name: "BW Industrial Holdings" },
      { date: "Apr 17, 2026", symbol: "AVEX", name: "AEVEX" },
      { date: "Apr 17, 2026", symbol: "KLRA", name: "Kailera Therapeutics" },
      { date: "Apr 18, 2026", symbol: "QRED", name: "QuasarEdge Acquisition" },
      { date: "Apr 21, 2026", symbol: "MRCO", name: "Mercator Acquisition" },
    ],
  };
}

// ─── Market news (static) ─────────────────────────────────────────────────────

export function getMarketNews(): NewsItem[] {
  return [
    { title: "Wall Street scales fresh record high as investors bet on end of Iran war", source: "The Guardian", timestamp: "2h ago", relatedSymbols: ["^GSPC", "^DJI"] },
    { title: "Fed signals potential rate cut as inflation cools", source: "Reuters", timestamp: "4h ago", relatedSymbols: ["^GSPC"] },
    { title: "NVIDIA reports record quarterly revenue driven by AI demand", source: "CNBC", timestamp: "5h ago", relatedSymbols: ["NVDA"] },
    { title: "Tesla delivers record number of vehicles in Q1 2026", source: "Bloomberg", timestamp: "6h ago", relatedSymbols: ["TSLA"] },
    { title: "Microsoft Azure revenue surges 35% year-over-year", source: "TechCrunch", timestamp: "7h ago", relatedSymbols: ["MSFT"] },
  ];
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

async function getCalendarEvents(scrId: string, date: string, cachePrefix: string): Promise<any[]> {
  const cacheKey = `cal:${cachePrefix}:${date}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&date=${date}&count=50`;
    const res = await yahooGet(url);
    const items: any[] = res?.finance?.result?.[0]?.quotes ?? [];
    setCache(cacheKey, items, CACHE_1HR);
    return items;
  } catch (err) {
    console.error(`[StockService] Calendar ${cachePrefix} error:`, err);
    return [];
  }
}

export async function getCalendarEarnings(date: string): Promise<any[]>       { return getCalendarEvents("earnings_date", date, "earnings"); }
export async function getCalendarDividends(date: string): Promise<any[]>      { return getCalendarEvents("ex_dividend_upcoming", date, "dividends"); }
export async function getCalendarStockSplits(date: string): Promise<any[]>    { return []; } // no direct Yahoo endpoint
export async function getCalendarEconomicEvents(date: string): Promise<any[]> { return []; } // no direct Yahoo endpoint
export async function getCalendarPublicOfferings(date: string): Promise<any[]>{ return []; } // no direct Yahoo endpoint
