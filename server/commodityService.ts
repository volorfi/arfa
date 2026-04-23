import { yahooFetch } from "./_core/yahooFinance";
import type {
  Commodity,
  CommodityFamily,
  CommodityQuote,
  CorrelationMatrix,
  InflationBasket,
} from "../shared/commodityTypes";

// ─── Universe ──────────────────────────────────────────────────────
export const COMMODITY_UNIVERSE: Commodity[] = [
  // Energy
  { symbol: "CL", ticker: "CL=F", name: "WTI Crude Oil", family: "energy", unit: "USD/bbl" },
  { symbol: "BZ", ticker: "BZ=F", name: "Brent Crude Oil", family: "energy", unit: "USD/bbl" },
  { symbol: "NG", ticker: "NG=F", name: "Natural Gas", family: "energy", unit: "USD/MMBtu" },
  { symbol: "HO", ticker: "HO=F", name: "Heating Oil", family: "energy", unit: "USD/gal" },
  { symbol: "RB", ticker: "RB=F", name: "RBOB Gasoline", family: "energy", unit: "USD/gal" },
  // Precious metals
  { symbol: "GC", ticker: "GC=F", name: "Gold", family: "precious_metals", unit: "USD/oz" },
  { symbol: "SI", ticker: "SI=F", name: "Silver", family: "precious_metals", unit: "USD/oz" },
  { symbol: "PL", ticker: "PL=F", name: "Platinum", family: "precious_metals", unit: "USD/oz" },
  { symbol: "PA", ticker: "PA=F", name: "Palladium", family: "precious_metals", unit: "USD/oz" },
  // Base metals
  { symbol: "HG", ticker: "HG=F", name: "Copper", family: "base_metals", unit: "USD/lb" },
  // Agriculture
  { symbol: "ZC", ticker: "ZC=F", name: "Corn", family: "agriculture", unit: "USc/bushel" },
  { symbol: "ZW", ticker: "ZW=F", name: "Wheat", family: "agriculture", unit: "USc/bushel" },
  { symbol: "ZS", ticker: "ZS=F", name: "Soybeans", family: "agriculture", unit: "USc/bushel" },
  { symbol: "ZO", ticker: "ZO=F", name: "Oats", family: "agriculture", unit: "USc/bushel" },
  { symbol: "ZR", ticker: "ZR=F", name: "Rough Rice", family: "agriculture", unit: "USD/cwt" },
  // Softs
  { symbol: "KC", ticker: "KC=F", name: "Coffee", family: "softs", unit: "USc/lb" },
  { symbol: "SB", ticker: "SB=F", name: "Sugar No. 11", family: "softs", unit: "USc/lb" },
  { symbol: "CC", ticker: "CC=F", name: "Cocoa", family: "softs", unit: "USD/t" },
  { symbol: "CT", ticker: "CT=F", name: "Cotton", family: "softs", unit: "USc/lb" },
  { symbol: "OJ", ticker: "OJ=F", name: "Orange Juice", family: "softs", unit: "USc/lb" },
  // Livestock
  { symbol: "LE", ticker: "LE=F", name: "Live Cattle", family: "livestock", unit: "USc/lb" },
  { symbol: "HE", ticker: "HE=F", name: "Lean Hogs", family: "livestock", unit: "USc/lb" },
  { symbol: "GF", ticker: "GF=F", name: "Feeder Cattle", family: "livestock", unit: "USc/lb" },
];

// ─── Related-equity curated mapping ────────────────────────────────
const RELATED_EQUITIES: Record<string, { symbol: string; name: string }[]> = {
  CL: [
    { symbol: "XOM", name: "ExxonMobil" },
    { symbol: "CVX", name: "Chevron" },
    { symbol: "COP", name: "ConocoPhillips" },
    { symbol: "OXY", name: "Occidental Petroleum" },
    { symbol: "XLE", name: "Energy Select Sector SPDR ETF" },
  ],
  BZ: [
    { symbol: "SHEL", name: "Shell" },
    { symbol: "BP", name: "BP" },
    { symbol: "TTE", name: "TotalEnergies" },
    { symbol: "XLE", name: "Energy Select Sector SPDR ETF" },
  ],
  NG: [
    { symbol: "EQT", name: "EQT Corporation" },
    { symbol: "RRC", name: "Range Resources" },
    { symbol: "CHK", name: "Chesapeake Energy" },
    { symbol: "UNG", name: "United States Natural Gas Fund" },
  ],
  GC: [
    { symbol: "NEM", name: "Newmont" },
    { symbol: "GOLD", name: "Barrick Gold" },
    { symbol: "AEM", name: "Agnico Eagle Mines" },
    { symbol: "GLD", name: "SPDR Gold Shares ETF" },
    { symbol: "GDX", name: "VanEck Gold Miners ETF" },
  ],
  SI: [
    { symbol: "PAAS", name: "Pan American Silver" },
    { symbol: "HL", name: "Hecla Mining" },
    { symbol: "SLV", name: "iShares Silver Trust" },
    { symbol: "SIL", name: "Global X Silver Miners ETF" },
  ],
  PL: [
    { symbol: "SBSW", name: "Sibanye Stillwater" },
    { symbol: "PPLT", name: "abrdn Platinum ETF" },
  ],
  PA: [{ symbol: "PALL", name: "abrdn Palladium ETF" }],
  HG: [
    { symbol: "FCX", name: "Freeport-McMoRan" },
    { symbol: "SCCO", name: "Southern Copper" },
    { symbol: "COPX", name: "Global X Copper Miners ETF" },
  ],
  ZC: [{ symbol: "CORN", name: "Teucrium Corn Fund" }, { symbol: "ADM", name: "Archer-Daniels-Midland" }],
  ZW: [{ symbol: "WEAT", name: "Teucrium Wheat Fund" }],
  ZS: [{ symbol: "SOYB", name: "Teucrium Soybean Fund" }, { symbol: "BG", name: "Bunge" }],
  KC: [{ symbol: "SBUX", name: "Starbucks" }, { symbol: "JO", name: "iPath Coffee Subindex ETN" }],
  SB: [{ symbol: "CANE", name: "Teucrium Sugar Fund" }],
  CC: [{ symbol: "HSY", name: "Hershey" }, { symbol: "MDLZ", name: "Mondelez" }, { symbol: "NIB", name: "iPath Cocoa Subindex ETN" }],
  CT: [{ symbol: "BAL", name: "iPath Cotton Subindex ETN" }],
  OJ: [],
  LE: [{ symbol: "TSN", name: "Tyson Foods" }],
  HE: [{ symbol: "TSN", name: "Tyson Foods" }, { symbol: "HRL", name: "Hormel Foods" }],
  GF: [],
  ZO: [],
  ZR: [],
  RB: [{ symbol: "MPC", name: "Marathon Petroleum" }, { symbol: "VLO", name: "Valero Energy" }],
  HO: [{ symbol: "PSX", name: "Phillips 66" }],
};

// ─── Cache ─────────────────────────────────────────────────────────
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
    console.warn("[CommodityService] batchQuotes failed:", err);
    return new Map();
  }
}

async function historicalCloses(ticker: string, range = "1y"): Promise<number[]> {
  try {
    const res = await yahooFetch<any>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
      { query: { interval: "1d", range }, auth: false },
    );
    const closes: (number | null)[] = res?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((c): c is number => typeof c === "number");
  } catch {
    return [];
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

function findCommodity(slug: string): Commodity | null {
  const s = slug.toUpperCase();
  return COMMODITY_UNIVERSE.find((c) => c.symbol === s || c.ticker === s) ?? null;
}

// ─── Public API ────────────────────────────────────────────────────
export async function getCommoditiesOverview(): Promise<CommodityQuote[]> {
  const cacheKey = "commodity:overview";
  const cached = getCached<CommodityQuote[]>(cacheKey);
  if (cached) return cached;

  const quotes = await batchQuotes(COMMODITY_UNIVERSE.map((c) => c.ticker));

  const results: CommodityQuote[] = await Promise.all(
    COMMODITY_UNIVERSE.map(async (c) => {
      const q = quotes.get(c.ticker);
      const chart = await miniChart(c.ticker, "5d");
      const price = q?.regularMarketPrice ?? 0;
      const prev = q?.regularMarketPreviousClose ?? price;
      return {
        ...c,
        price,
        change: q?.regularMarketChange ?? price - prev,
        changePercent:
          q?.regularMarketChangePercent ?? (prev ? ((price - prev) / prev) * 100 : 0),
        changePercent1W: null,
        changePercent1M: null,
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

export async function getCommodity(slug: string): Promise<CommodityQuote | null> {
  const c = findCommodity(slug);
  if (!c) return null;

  const cacheKey = `commodity:${c.symbol}`;
  const cached = getCached<CommodityQuote>(cacheKey);
  if (cached) return cached;

  const [quotes, closes, chart] = await Promise.all([
    batchQuotes([c.ticker]),
    historicalCloses(c.ticker, "1y"),
    miniChart(c.ticker, "1y"),
  ]);
  const q = quotes.get(c.ticker);
  if (!q) return null;
  const price = q.regularMarketPrice ?? 0;
  const prev = q.regularMarketPreviousClose ?? price;

  function pctWindow(days: number): number | null {
    if (closes.length < 2) return null;
    const last = closes[closes.length - 1];
    const idx = Math.max(0, closes.length - 1 - days);
    const past = closes[idx];
    if (!past) return null;
    return ((last - past) / past) * 100;
  }
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const daysSinceYTD = Math.floor((now.getTime() - startOfYear) / (24 * 3600 * 1000));

  const result: CommodityQuote = {
    ...c,
    price,
    change: q.regularMarketChange ?? price - prev,
    changePercent:
      q.regularMarketChangePercent ?? (prev ? ((price - prev) / prev) * 100 : 0),
    changePercent1W: pctWindow(5),
    changePercent1M: pctWindow(21),
    changePercentYTD: pctWindow(daysSinceYTD),
    dayHigh: q.regularMarketDayHigh ?? price,
    dayLow: q.regularMarketDayLow ?? price,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    chartData: chart,
  };
  setCache(cacheKey, result, CACHE_30S);
  return result;
}

export async function getCommoditiesByFamily(): Promise<Record<CommodityFamily, CommodityQuote[]>> {
  const overview = await getCommoditiesOverview();
  const grouped = {
    energy: [] as CommodityQuote[],
    precious_metals: [] as CommodityQuote[],
    base_metals: [] as CommodityQuote[],
    agriculture: [] as CommodityQuote[],
    softs: [] as CommodityQuote[],
    livestock: [] as CommodityQuote[],
  };
  for (const q of overview) grouped[q.family].push(q);
  return grouped;
}

export async function getCommodityLeaderboard(
  sortKey: "changePercent" | "changePercent1W" | "changePercent1M" | "changePercentYTD" = "changePercent",
  limit = 10,
): Promise<CommodityQuote[]> {
  const all = await getCommoditiesOverview();
  return [...all]
    .filter((q) => {
      const v = q[sortKey];
      return typeof v === "number";
    })
    .sort((a, b) => Math.abs((b[sortKey] as number) ?? 0) - Math.abs((a[sortKey] as number) ?? 0))
    .slice(0, limit);
}

export async function getCorrelationMatrix(): Promise<CorrelationMatrix> {
  const cacheKey = "commodity:corr";
  const cached = getCached<CorrelationMatrix>(cacheKey);
  if (cached) return cached;

  // A compact cross-asset correlation set: a few commodities + DXY + SPY.
  const set = [
    { label: "Gold", ticker: "GC=F" },
    { label: "Silver", ticker: "SI=F" },
    { label: "WTI", ticker: "CL=F" },
    { label: "NatGas", ticker: "NG=F" },
    { label: "Copper", ticker: "HG=F" },
    { label: "DXY", ticker: "DX-Y.NYB" },
    { label: "S&P 500", ticker: "^GSPC" },
  ];

  const series = await Promise.all(
    set.map(async (s) => ({
      label: s.label,
      closes: await historicalCloses(s.ticker, "6mo"),
    })),
  );

  // Align to min length; compute simple returns.
  const minLen = Math.min(...series.map((s) => s.closes.length));
  if (minLen < 30) {
    const empty: CorrelationMatrix = {
      symbols: set.map((s) => s.label),
      values: set.map(() => set.map(() => 0)),
    };
    return empty;
  }
  const returns = series.map((s) => {
    const tail = s.closes.slice(s.closes.length - minLen);
    const out: number[] = [];
    for (let i = 1; i < tail.length; i++) {
      out.push((tail[i] - tail[i - 1]) / tail[i - 1]);
    }
    return out;
  });

  function corr(a: number[], b: number[]): number {
    const n = a.length;
    const meanA = a.reduce((x, y) => x + y, 0) / n;
    const meanB = b.reduce((x, y) => x + y, 0) / n;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    const den = Math.sqrt(denA * denB);
    return den === 0 ? 0 : num / den;
  }

  const n = returns.length;
  const values: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 1 : Number(corr(returns[i], returns[j]).toFixed(3)),
    ),
  );

  const result: CorrelationMatrix = { symbols: set.map((s) => s.label), values };
  setCache(cacheKey, result, CACHE_1H);
  return result;
}

export async function getInflationBaskets(): Promise<InflationBasket[]> {
  const overview = await getCommoditiesOverview();
  const find = (sym: string) => overview.find((q) => q.symbol === sym);

  function basket(family: InflationBasket["family"], label: string, syms: string[]): InflationBasket {
    const members = syms
      .map(find)
      .filter((x): x is CommodityQuote => Boolean(x));
    const avg1D =
      members.length === 0 ? 0 : members.reduce((a, b) => a + b.changePercent, 0) / members.length;
    return {
      family,
      label,
      members: members.map((m) => m.symbol),
      avgChangePercent1D: avg1D,
      avgChangePercentYTD: 0, // Populated once we compute YTD on overview; stub for now.
    };
  }
  return [
    basket("food", "Food basket", ["ZC", "ZW", "ZS", "KC", "SB"]),
    basket("energy", "Energy basket", ["CL", "NG"]),
    basket("metals", "Metals basket", ["GC", "HG"]),
  ];
}

export async function getRelatedEquities(slug: string): Promise<{ symbol: string; name: string }[]> {
  const c = findCommodity(slug);
  if (!c) return [];
  return RELATED_EQUITIES[c.symbol] ?? [];
}

void CACHE_5MIN;
