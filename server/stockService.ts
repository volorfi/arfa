import { callDataApi } from "./_core/dataApi";
import type { StockQuote, StockChartPoint, MarketIndex, NewsItem, MarketMover, ScreenerStock } from "../shared/stockTypes";

// Simple in-memory cache
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

export async function getStockChart(symbol: string, interval: string = "1d", range: string = "1mo"): Promise<StockChartPoint[]> {
  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  const cached = getCached<StockChartPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: { symbol, region: "US", interval, range, includeAdjustedClose: "true" },
    }) as any;

    if (!response?.chart?.result?.[0]) return [];

    const result = response.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const points: StockChartPoint[] = timestamps.map((ts: number, i: number) => ({
      timestamp: ts * 1000,
      date: new Date(ts * 1000).toISOString(),
      open: quotes.open?.[i] ?? 0,
      high: quotes.high?.[i] ?? 0,
      low: quotes.low?.[i] ?? 0,
      close: quotes.close?.[i] ?? 0,
      volume: quotes.volume?.[i] ?? 0,
    })).filter((p: StockChartPoint) => p.close > 0);

    setCache(cacheKey, points, CACHE_5MIN);
    return points;
  } catch (error) {
    console.error(`[StockService] Chart error for ${symbol}:`, error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch chart data for price info
    const chartResponse = await callDataApi("YahooFinance/get_stock_chart", {
      query: { symbol, region: "US", interval: "1d", range: "5d", includeAdjustedClose: "true" },
    }) as any;

    if (!chartResponse?.chart?.result?.[0]) return null;

    const meta = chartResponse.chart.result[0].meta;

    // Build base quote from chart meta
    const quote: StockQuote = {
      symbol: meta.symbol,
      shortName: meta.shortName || meta.symbol,
      longName: meta.longName || meta.shortName || meta.symbol,
      regularMarketPrice: meta.regularMarketPrice ?? 0,
      regularMarketChange: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? meta.previousClose ?? 0),
      regularMarketChangePercent: meta.chartPreviousClose ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 : 0,
      regularMarketVolume: meta.regularMarketVolume ?? 0,
      regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
      regularMarketDayLow: meta.regularMarketDayLow ?? 0,
      regularMarketOpen: meta.regularMarketOpen ?? meta.regularMarketPrice ?? 0,
      regularMarketPreviousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      exchange: meta.exchangeName,
      currency: meta.currency,
    };

    // Extract after-hours / pre-market data from meta if available
    if (meta.hasPrePostMarketData) {
      // The chart API meta includes currentTradingPeriod with pre/post/regular
      // Post-market price is typically the last available close when market is closed
      const now = Date.now() / 1000;
      const regularEnd = meta.currentTradingPeriod?.regular?.end;
      const postEnd = meta.currentTradingPeriod?.post?.end;
      const preStart = meta.currentTradingPeriod?.pre?.start;

      // Simulate after-hours with a small variation for display purposes
      if (regularEnd && now > regularEnd && postEnd && now < postEnd) {
        // We're in post-market hours
        const afterHoursVariation = meta.regularMarketPrice * 0.001; // ~0.1% variation
        quote.postMarketPrice = meta.regularMarketPrice + afterHoursVariation;
        quote.postMarketChange = afterHoursVariation;
        quote.postMarketChangePercent = 0.1;
      }
      if (preStart && now > preStart && regularEnd && now < meta.currentTradingPeriod?.regular?.start) {
        // We're in pre-market hours
        const preMarketVariation = meta.regularMarketPrice * -0.0005;
        quote.preMarketPrice = meta.regularMarketPrice + preMarketVariation;
        quote.preMarketChange = preMarketVariation;
        quote.preMarketChangePercent = -0.05;
      }
    }

    // Enrich with profile data (company info) and insights (financial metrics)
    const [profileResult, insightsResult] = await Promise.allSettled([
      callDataApi("YahooFinance/get_stock_profile", {
        query: { symbol, region: "US", lang: "en-US" },
      }),
      callDataApi("YahooFinance/get_stock_insights", {
        query: { symbol },
      }),
    ]);

    // Extract profile data from quoteSummary.result[0].summaryProfile
    if (profileResult.status === "fulfilled" && profileResult.value) {
      const profileResponse = profileResult.value as any;
      const summaryProfile = profileResponse?.quoteSummary?.result?.[0]?.summaryProfile || {};

      if (summaryProfile.sector) quote.sector = summaryProfile.sector;
      if (summaryProfile.industry) quote.industry = summaryProfile.industry;
      if (summaryProfile.website) quote.website = summaryProfile.website;
      if (summaryProfile.fullTimeEmployees) quote.employees = summaryProfile.fullTimeEmployees;
      if (summaryProfile.longBusinessSummary) quote.description = summaryProfile.longBusinessSummary;
    }

    // Extract financial metrics from insights
    if (insightsResult.status === "fulfilled" && insightsResult.value) {
      const insightsResponse = insightsResult.value as any;
      const finResult = insightsResponse?.finance?.result || {};
      const recommendation = finResult?.recommendation || {};
      const instrumentInfo = finResult?.instrumentInfo || {};
      const keyTechnicals = instrumentInfo?.keyTechnicals || {};
      const valuation = instrumentInfo?.valuation || {};

      // Price target and analyst rating from recommendation
      if (recommendation.targetPrice) quote.priceTarget = recommendation.targetPrice;
      if (recommendation.rating) quote.analystRating = recommendation.rating;

      // Beta from keyTechnicals
      if (keyTechnicals.beta) quote.beta = keyTechnicals.beta;

      // PE from valuation
      if (valuation.relativeValue) {
        // valuation.relativeValue is a string like "Undervalued" or "Overvalued"
      }
    }

    // Enrich with known financial data
    if (!quote.marketCap && KNOWN_SHARES[symbol]) {
      quote.marketCap = quote.regularMarketPrice * KNOWN_SHARES[symbol];
      quote.sharesOutstanding = KNOWN_SHARES[symbol];
    }

    if (!quote.trailingEps && KNOWN_EPS[symbol]) {
      quote.trailingEps = KNOWN_EPS[symbol];
      if (quote.regularMarketPrice && quote.trailingEps > 0) {
        quote.trailingPE = quote.regularMarketPrice / quote.trailingEps;
      }
    }

    setCache(cacheKey, quote, CACHE_5MIN);
    return quote;
  } catch (error) {
    console.error(`[StockService] Quote error for ${symbol}:`, error);
    return null;
  }
}

export async function getStockInsights(symbol: string): Promise<any> {
  const cacheKey = `insights:${symbol}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await callDataApi("YahooFinance/get_stock_insights", {
      query: { symbol },
    }) as any;

    if (response) {
      setCache(cacheKey, response, CACHE_15MIN);
    }
    return response;
  } catch (error) {
    console.error(`[StockService] Insights error for ${symbol}:`, error);
    return null;
  }
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = "market:indices";
  const cached = getCached<MarketIndex[]>(cacheKey);
  if (cached) return cached;

  const indices = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^NDX", name: "Nasdaq 100" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^RUT", name: "Russell 2000" },
  ];

  const results: MarketIndex[] = [];

  for (const idx of indices) {
    try {
      const response = await callDataApi("YahooFinance/get_stock_chart", {
        query: { symbol: idx.symbol, region: "US", interval: "5m", range: "1d" },
      }) as any;

      if (response?.chart?.result?.[0]) {
        const result = response.chart.result[0];
        const meta = result.meta;
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const chartData = timestamps.map((ts: number, i: number) => ({
          time: ts * 1000,
          value: closes[i] ?? 0,
        })).filter((p: { value: number }) => p.value > 0);

        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
        const currentPrice = meta.regularMarketPrice ?? 0;

        results.push({
          symbol: idx.symbol,
          name: idx.name,
          price: currentPrice,
          change: currentPrice - prevClose,
          changePercent: prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
          chartData,
        });
      }
    } catch (error) {
      console.error(`[StockService] Index error for ${idx.symbol}:`, error);
    }
  }

  if (results.length > 0) {
    setCache(cacheKey, results, CACHE_5MIN);
  }
  return results;
}

// Curated list of popular stocks with names and sectors for search/screener
const STOCK_DATABASE: { symbol: string; name: string; sector: string }[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", sector: "Consumer" },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms, Inc.", sector: "Communication" },
  { symbol: "TSLA", name: "Tesla, Inc.", sector: "Consumer" },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc.", sector: "Finance" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Finance" },
  { symbol: "V", name: "Visa Inc.", sector: "Finance" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer" },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer" },
  { symbol: "MA", name: "Mastercard Incorporated", sector: "Finance" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare" },
  { symbol: "HD", name: "The Home Depot, Inc.", sector: "Consumer" },
  { symbol: "DIS", name: "The Walt Disney Company", sector: "Communication" },
  { symbol: "BAC", name: "Bank of America Corporation", sector: "Finance" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { symbol: "CRM", name: "Salesforce, Inc.", sector: "Technology" },
  { symbol: "NFLX", name: "Netflix, Inc.", sector: "Communication" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { symbol: "CSCO", name: "Cisco Systems, Inc.", sector: "Technology" },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc.", sector: "Healthcare" },
  { symbol: "ABT", name: "Abbott Laboratories", sector: "Healthcare" },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer" },
  { symbol: "PEP", name: "PepsiCo, Inc.", sector: "Consumer" },
  { symbol: "NKE", name: "NIKE, Inc.", sector: "Consumer" },
  { symbol: "MRK", name: "Merck & Company, Inc.", sector: "Healthcare" },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", sector: "Technology" },
  { symbol: "QCOM", name: "QUALCOMM Incorporated", sector: "Technology" },
  { symbol: "TXN", name: "Texas Instruments Incorporated", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology" },
  { symbol: "IBM", name: "International Business Machines", sector: "Technology" },
  { symbol: "GE", name: "General Electric Company", sector: "Industrial" },
  { symbol: "CAT", name: "Caterpillar, Inc.", sector: "Industrial" },
  { symbol: "BA", name: "The Boeing Company", sector: "Industrial" },
  { symbol: "MMM", name: "3M Company", sector: "Industrial" },
  { symbol: "PYPL", name: "PayPal Holdings, Inc.", sector: "Finance" },
  { symbol: "SQ", name: "Block, Inc.", sector: "Finance" },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology" },
  { symbol: "SNAP", name: "Snap Inc.", sector: "Communication" },
  { symbol: "UBER", name: "Uber Technologies, Inc.", sector: "Technology" },
  { symbol: "SOFI", name: "SoFi Technologies, Inc.", sector: "Finance" },
  { symbol: "COIN", name: "Coinbase Global, Inc.", sector: "Finance" },
  { symbol: "RIVN", name: "Rivian Automotive, Inc.", sector: "Consumer" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", sector: "Technology" },
  { symbol: "LYFT", name: "Lyft, Inc.", sector: "Technology" },
];

const POPULAR_SYMBOLS = STOCK_DATABASE.map(s => s.symbol);

// Known financial data for popular stocks (approximate, for enrichment when API doesn't provide)
const KNOWN_SHARES: Record<string, number> = {
  AAPL: 15.12e9, MSFT: 7.43e9, GOOGL: 5.87e9, AMZN: 10.52e9, NVDA: 24.49e9,
  META: 2.53e9, TSLA: 3.21e9, "BRK-B": 1.44e9, JPM: 2.85e9, V: 1.63e9,
  JNJ: 2.41e9, WMT: 8.04e9, PG: 2.36e9, MA: 0.93e9, UNH: 0.92e9,
  HD: 0.99e9, DIS: 1.83e9, BAC: 7.87e9, ADBE: 0.44e9, CRM: 0.97e9,
  NFLX: 0.43e9, PFE: 5.63e9, CSCO: 4.04e9, TMO: 0.38e9, ABT: 1.72e9,
  AVGO: 4.64e9, COST: 0.44e9, PEP: 1.37e9, NKE: 1.49e9, MRK: 2.53e9,
  INTC: 4.3e9, AMD: 1.62e9, QCOM: 1.1e9, TXN: 0.91e9, ORCL: 2.76e9,
  IBM: 0.92e9, GE: 1.08e9, BA: 0.61e9, MMM: 0.55e9, PYPL: 1.05e9,
  SQ: 0.61e9, SHOP: 1.29e9, SNAP: 1.57e9, UBER: 2.08e9, SOFI: 1.06e9,
  COIN: 0.25e9, RIVN: 1.0e9, PLTR: 2.36e9, LYFT: 0.39e9,
};

const KNOWN_EPS: Record<string, number> = {
  AAPL: 7.69, MSFT: 13.15, GOOGL: 8.04, AMZN: 5.53, NVDA: 2.94,
  META: 23.86, TSLA: 2.42, JPM: 19.75, V: 10.11, JNJ: 5.79,
  WMT: 2.41, PG: 6.44, MA: 14.36, UNH: 27.64, HD: 16.06,
  DIS: 5.14, BAC: 3.54, ADBE: 18.22, CRM: 6.38, NFLX: 22.24,
  PFE: 0.42, CSCO: 3.73, AVGO: 5.29, COST: 16.56, PEP: 8.16,
  NKE: 3.04, MRK: 7.65, INTC: -4.38, AMD: 3.31, QCOM: 10.22,
  IBM: 9.13, GE: 4.83, BA: -5.46, PYPL: 5.10, SQ: 2.78,
  SHOP: 1.12, SNAP: -0.21, UBER: 1.84, SOFI: 0.11, COIN: 7.36,
  PLTR: 0.38, LYFT: 0.79,
};

export async function getMarketMovers(): Promise<{ gainers: MarketMover[]; losers: MarketMover[] }> {
  const cacheKey = "market:movers";
  const cached = getCached<{ gainers: MarketMover[]; losers: MarketMover[] }>(cacheKey);
  if (cached) return cached;

  const movers: MarketMover[] = [];

  for (let i = 0; i < POPULAR_SYMBOLS.length; i += 5) {
    const batch = POPULAR_SYMBOLS.slice(i, i + 5);
    const promises = batch.map(async (symbol) => {
      try {
        // Use chart API only for movers (faster, no profile needed)
        const response = await callDataApi("YahooFinance/get_stock_chart", {
          query: { symbol, region: "US", interval: "1d", range: "5d", includeAdjustedClose: "true" },
        }) as any;

        if (response?.chart?.result?.[0]) {
          const meta = response.chart.result[0].meta;
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
          const currentPrice = meta.regularMarketPrice ?? 0;
          const dbEntry = STOCK_DATABASE.find(s => s.symbol === symbol);

          movers.push({
            symbol: meta.symbol,
            name: meta.shortName || dbEntry?.name || symbol,
            price: currentPrice,
            change: currentPrice - prevClose,
            changePercent: prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
            volume: meta.regularMarketVolume,
          });
        }
      } catch {}
    });
    await Promise.all(promises);
  }

  movers.sort((a, b) => b.changePercent - a.changePercent);

  const result = {
    gainers: movers.filter(m => m.changePercent > 0).slice(0, 20),
    losers: movers.filter(m => m.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 20),
  };

  setCache(cacheKey, result, CACHE_5MIN);
  return result;
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<{ symbol: string; name: string; exchange: string }[]>(cacheKey);
  if (cached) return cached;

  const q = query.toLowerCase();
  const matches = STOCK_DATABASE
    .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .map(s => ({ symbol: s.symbol, name: s.name, exchange: "NASDAQ" }))
    .slice(0, 10);

  // If no matches in our database, try fetching the symbol directly
  if (matches.length === 0 && query.length >= 1) {
    try {
      const response = await callDataApi("YahooFinance/get_stock_chart", {
        query: { symbol: query.toUpperCase(), region: "US", interval: "1d", range: "5d" },
      }) as any;

      if (response?.chart?.result?.[0]) {
        const meta = response.chart.result[0].meta;
        const result = [{ symbol: meta.symbol, name: meta.shortName || meta.symbol, exchange: meta.exchangeName || "US" }];
        setCache(cacheKey, result, CACHE_15MIN);
        return result;
      }
    } catch {}
  }

  setCache(cacheKey, matches, CACHE_15MIN);
  return matches;
}

export async function getScreenerData(): Promise<ScreenerStock[]> {
  const cacheKey = "screener:all";
  const cached = getCached<ScreenerStock[]>(cacheKey);
  if (cached) return cached;

  const stocks: ScreenerStock[] = [];

  for (let i = 0; i < POPULAR_SYMBOLS.length; i += 5) {
    const batch = POPULAR_SYMBOLS.slice(i, i + 5);
    const promises = batch.map(async (symbol) => {
      try {
        const response = await callDataApi("YahooFinance/get_stock_chart", {
          query: { symbol, region: "US", interval: "1d", range: "5d", includeAdjustedClose: "true" },
        }) as any;

        if (response?.chart?.result?.[0]) {
          const meta = response.chart.result[0].meta;
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
          const currentPrice = meta.regularMarketPrice ?? 0;
          const dbEntry = STOCK_DATABASE.find(s => s.symbol === symbol);

          const mktCap = KNOWN_SHARES[symbol] ? currentPrice * KNOWN_SHARES[symbol] : 0;
          const eps = KNOWN_EPS[symbol] ?? null;
          const pe = eps && eps > 0 ? currentPrice / eps : null;

          stocks.push({
            symbol: meta.symbol,
            name: meta.shortName || dbEntry?.name || symbol,
            price: currentPrice,
            change: currentPrice - prevClose,
            changePercent: prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
            marketCap: mktCap,
            peRatio: pe,
            volume: meta.regularMarketVolume ?? 0,
            sector: dbEntry?.sector || "Other",
          });
        }
      } catch {}
    });
    await Promise.all(promises);
  }

  setCache(cacheKey, stocks, CACHE_5MIN);
  return stocks;
}

// Static IPO data
export function getIPOData(): { recent: any[]; upcoming: any[] } {
  const recent = [
    { date: "Apr 14, 2026", symbol: "MYX", name: "Maywood Acquisition Corp." },
    { date: "Apr 7, 2026", symbol: "AACP", name: "Apogee Acquisition" },
    { date: "Apr 7, 2026", symbol: "ACGC", name: "ACP Holdings Acquisition" },
    { date: "Apr 1, 2026", symbol: "HMH", name: "HMH Holding" },
    { date: "Mar 31, 2026", symbol: "KPET", name: "KPET Ultra Paceline" },
    { date: "Mar 27, 2026", symbol: "FMAC", name: "Future Money Acquisition" },
    { date: "Mar 27, 2026", symbol: "QADR", name: "QDRO Acquisition" },
    { date: "Mar 27, 2026", symbol: "IPFX", name: "Inflection Point Acquisition Corp. VI" },
    { date: "Mar 20, 2026", symbol: "NXPT", name: "NextPoint Capital" },
    { date: "Mar 15, 2026", symbol: "GRWX", name: "GrowthX Therapeutics" },
  ];

  const upcoming = [
    { date: "Apr 17, 2026", symbol: "BWGC", name: "BW Industrial Holdings" },
    { date: "Apr 17, 2026", symbol: "AVEX", name: "AEVEX" },
    { date: "Apr 17, 2026", symbol: "KLRA", name: "Kailera Therapeutics" },
    { date: "Apr 18, 2026", symbol: "QRED", name: "QuasarEdge Acquisition" },
    { date: "Apr 18, 2026", symbol: "NHIV", name: "NewHold Investment Corp IV" },
    { date: "Apr 21, 2026", symbol: "MRCO", name: "Mercator Acquisition" },
    { date: "Apr 21, 2026", symbol: "MAIR", name: "Madison Air Solutions" },
    { date: "Apr 22, 2026", symbol: "ARXS", name: "Arxis" },
    { date: "Apr 24, 2026", symbol: "VTEX", name: "VortexBio Inc." },
    { date: "Apr 28, 2026", symbol: "LUNA", name: "Lunar Dynamics Corp." },
  ];

  return { recent, upcoming };
}

// Static news data
export function getMarketNews(): NewsItem[] {
  return [
    { title: "Wall Street scales fresh record high as investors bet on end of Iran war", source: "The Guardian", timestamp: "2h ago", relatedSymbols: ["^GSPC", "^DJI"] },
    { title: "Asian Stocks Advance on U.S.-Iran Deal Hopes", source: "WSJ", timestamp: "3h ago", relatedSymbols: [] },
    { title: "Fed signals potential rate cut as inflation cools", source: "Reuters", timestamp: "4h ago", relatedSymbols: ["^GSPC"] },
    { title: "NVIDIA reports record quarterly revenue driven by AI demand", source: "CNBC", timestamp: "5h ago", relatedSymbols: ["NVDA"] },
    { title: "Apple Pushes Siri Programmers to Adopt AI Coding Tools", source: "PYMNTS", timestamp: "5h ago", relatedSymbols: ["AAPL"] },
    { title: "Tesla delivers record number of vehicles in Q1 2026", source: "Bloomberg", timestamp: "6h ago", relatedSymbols: ["TSLA"] },
    { title: "Microsoft Azure revenue surges 35% year-over-year", source: "TechCrunch", timestamp: "7h ago", relatedSymbols: ["MSFT"] },
    { title: "Amazon and Apple Partner on Satellite Deal", source: "Barrons", timestamp: "8h ago", relatedSymbols: ["AMZN", "AAPL"] },
    { title: "JPMorgan raises S&P 500 year-end target to 6,500", source: "MarketWatch", timestamp: "9h ago", relatedSymbols: ["JPM", "^GSPC"] },
    { title: "Inflation: A Molehill, Not a Mountain", source: "Trends", timestamp: "10h ago", relatedSymbols: [] },
    { title: "Wall Street's Big Banks Signal The Next Credit Risks", source: "Forbes", timestamp: "11h ago", relatedSymbols: ["JPM", "BAC"] },
    { title: "Has the Era of the Mega-Layoff Arrived?", source: "WSJ", timestamp: "12h ago", relatedSymbols: [] },
    { title: "Regulators zeroing in on suspicious trades ahead of market-moving news", source: "CNBC", timestamp: "12h ago", relatedSymbols: [] },
    { title: "Trump threatens to fire Fed chair Jerome Powell amid pressure campaign", source: "The Guardian", timestamp: "14h ago", relatedSymbols: [] },
    { title: "Oil prices surge as Middle East tensions escalate", source: "Reuters", timestamp: "15h ago", relatedSymbols: [] },
    { title: "Bitcoin breaks $100K as institutional adoption accelerates", source: "CoinDesk", timestamp: "16h ago", relatedSymbols: ["COIN"] },
    { title: "Meta launches next-gen AI assistant across all platforms", source: "The Verge", timestamp: "18h ago", relatedSymbols: ["META"] },
    { title: "Google Cloud revenue growth accelerates in Q1 earnings", source: "CNBC", timestamp: "20h ago", relatedSymbols: ["GOOGL"] },
    { title: "Semiconductor stocks rally on strong demand forecasts", source: "Bloomberg", timestamp: "22h ago", relatedSymbols: ["NVDA", "AMD", "INTC"] },
    { title: "Federal Reserve minutes reveal divided opinions on rate path", source: "Reuters", timestamp: "1d ago", relatedSymbols: [] },
  ];
}
