/**
 * Options Service
 * - Yahoo Finance crumb-based API for options chain data
 * - RapidAPI for most-active options
 * - Black-Scholes Greeks calculation (server-side for validation)
 */
import { ENV } from "./_core/env";

// ─── Yahoo Finance Crumb Management ──────────────────────────────
let cachedCrumb: { crumb: string; cookies: string; expiresAt: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookies: string }> {
  if (cachedCrumb && Date.now() < cachedCrumb.expiresAt) {
    return { crumb: cachedCrumb.crumb, cookies: cachedCrumb.cookies };
  }

  // Step 1: Get cookies
  const cookieResp = await fetch("https://fc.yahoo.com", {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const setCookies = cookieResp.headers.getSetCookie?.() || [];
  const cookieStr = setCookies.map((c: string) => c.split(";")[0]).join("; ");

  // Step 2: Get crumb
  const crumbResp = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Cookie: cookieStr,
    },
  });
  const crumb = await crumbResp.text();

  cachedCrumb = { crumb, cookies: cookieStr, expiresAt: Date.now() + 30 * 60 * 1000 }; // 30 min cache
  return { crumb, cookies: cookieStr };
}

async function yahooOptionsGet(symbol: string, expirationDate?: number): Promise<any> {
  const { crumb, cookies } = await getYahooCrumb();
  let url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(crumb)}`;
  if (expirationDate) {
    url += `&date=${expirationDate}`;
  }

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Cookie: cookies,
    },
  });

  if (!resp.ok) {
    // If crumb expired, retry once
    if (resp.status === 401) {
      cachedCrumb = null;
      const { crumb: newCrumb, cookies: newCookies } = await getYahooCrumb();
      let retryUrl = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(newCrumb)}`;
      if (expirationDate) retryUrl += `&date=${expirationDate}`;
      const retryResp = await fetch(retryUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Cookie: newCookies },
      });
      if (!retryResp.ok) throw new Error(`Yahoo Finance options API error: ${retryResp.status}`);
      return retryResp.json();
    }
    throw new Error(`Yahoo Finance options API error: ${resp.status}`);
  }

  return resp.json();
}

// ─── RapidAPI Most Active Options ────────────────────────────────
const RAPID_BASE = "https://yahoo-finance15.p.rapidapi.com/api";
const MIN_INTERVAL_MS = 600;
let lastRapidTime = 0;

async function rapidGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRapidTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRapidTime = Date.now();

  const url = new URL(`${RAPID_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com",
      "x-rapidapi-key": ENV.rapidApiKey,
    },
  });

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    return rapidGet(path, params);
  }
  if (!res.ok) return null;
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────
export interface OptionContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  bid: number;
  ask: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  expiration: number;
  lastTradeDate: number;
  // Calculated Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface OptionsChainData {
  symbol: string;
  underlyingPrice: number;
  expirationDates: number[];
  selectedExpiration: number;
  strikes: number[];
  calls: OptionContract[];
  puts: OptionContract[];
  quote: {
    symbol: string;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  };
}

export interface MostActiveOption {
  symbol: string;
  symbolName: string;
  lastPrice: string;
  priceChange: string;
  percentChange: string;
  optionsTotalVolume: string;
  optionsPutVolumePercent: string;
  optionsCallVolumePercent: string;
  optionsPutCallVolumeRatio: string;
  optionsImpliedVolatilityRank1y: string;
}

// ─── Black-Scholes Model ─────────────────────────────────────────
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function blackScholesGreeks(
  S: number, // underlying price
  K: number, // strike price
  T: number, // time to expiration in years
  r: number, // risk-free rate
  sigma: number, // implied volatility
  type: "call" | "put"
): { price: number; delta: number; gamma: number; theta: number; vega: number; rho: number } {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: type === "call" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let price: number, delta: number, theta: number, rho: number;

  if (type === "call") {
    price = S * Nd1 - K * Math.exp(-r * T) * Nd2;
    delta = Nd1;
    theta = (-S * nd1 * sigma / (2 * sqrtT) - r * K * Math.exp(-r * T) * Nd2) / 365;
    rho = K * T * Math.exp(-r * T) * Nd2 / 100;
  } else {
    price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    delta = Nd1 - 1;
    theta = (-S * nd1 * sigma / (2 * sqrtT) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }

  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = S * nd1 * sqrtT / 100;

  return { price, delta, gamma, theta, vega, rho };
}

// ─── Max Pain Calculation ────────────────────────────────────────
export function calculateMaxPain(calls: OptionContract[], puts: OptionContract[]): number {
  const allStrikes = Array.from(new Set([...calls.map((c) => c.strike), ...puts.map((p) => p.strike)])).sort((a, b) => a - b);

  let minPain = Infinity;
  let maxPainStrike = allStrikes[0] || 0;

  for (const testStrike of allStrikes) {
    let totalPain = 0;

    // Call writers' pain: for each call, if testStrike > call.strike, pain = (testStrike - call.strike) * OI
    for (const call of calls) {
      if (testStrike > call.strike) {
        totalPain += (testStrike - call.strike) * (call.openInterest || 0);
      }
    }

    // Put writers' pain: for each put, if testStrike < put.strike, pain = (put.strike - testStrike) * OI
    for (const put of puts) {
      if (testStrike < put.strike) {
        totalPain += (put.strike - testStrike) * (put.openInterest || 0);
      }
    }

    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = testStrike;
    }
  }

  return maxPainStrike;
}

// ─── Public API Functions ────────────────────────────────────────

/**
 * Get options chain for a symbol with optional expiration date
 */
export async function getOptionsChain(symbol: string, expirationDate?: number): Promise<OptionsChainData | null> {
  try {
    const data = await yahooOptionsGet(symbol.toUpperCase(), expirationDate);
    const result = data?.optionChain?.result?.[0];
    if (!result) return null;

    const quote = result.quote || {};
    const underlyingPrice = quote.regularMarketPrice || 0;
    const riskFreeRate = 0.043; // ~4.3% US Treasury rate

    const options = result.options?.[0];
    const calls: OptionContract[] = (options?.calls || []).map((c: any) => {
      const T = Math.max((c.expiration - Date.now() / 1000) / (365.25 * 24 * 3600), 0.001);
      const greeks = blackScholesGreeks(underlyingPrice, c.strike, T, riskFreeRate, c.impliedVolatility || 0.3, "call");
      return {
        contractSymbol: c.contractSymbol,
        strike: c.strike,
        lastPrice: c.lastPrice ?? 0,
        change: c.change ?? 0,
        percentChange: c.percentChange ?? 0,
        volume: c.volume ?? 0,
        openInterest: c.openInterest ?? 0,
        bid: c.bid ?? 0,
        ask: c.ask ?? 0,
        impliedVolatility: c.impliedVolatility ?? 0,
        inTheMoney: c.inTheMoney ?? false,
        expiration: c.expiration,
        lastTradeDate: c.lastTradeDate ?? 0,
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        rho: greeks.rho,
      };
    });

    const puts: OptionContract[] = (options?.puts || []).map((p: any) => {
      const T = Math.max((p.expiration - Date.now() / 1000) / (365.25 * 24 * 3600), 0.001);
      const greeks = blackScholesGreeks(underlyingPrice, p.strike, T, riskFreeRate, p.impliedVolatility || 0.3, "put");
      return {
        contractSymbol: p.contractSymbol,
        strike: p.strike,
        lastPrice: p.lastPrice ?? 0,
        change: p.change ?? 0,
        percentChange: p.percentChange ?? 0,
        volume: p.volume ?? 0,
        openInterest: p.openInterest ?? 0,
        bid: p.bid ?? 0,
        ask: p.ask ?? 0,
        impliedVolatility: p.impliedVolatility ?? 0,
        inTheMoney: p.inTheMoney ?? false,
        expiration: p.expiration,
        lastTradeDate: p.lastTradeDate ?? 0,
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        rho: greeks.rho,
      };
    });

    return {
      symbol: symbol.toUpperCase(),
      underlyingPrice,
      expirationDates: result.expirationDates || [],
      selectedExpiration: options?.expirationDate || result.expirationDates?.[0] || 0,
      strikes: result.strikes || [],
      calls,
      puts,
      quote: {
        symbol: quote.symbol || symbol,
        shortName: quote.shortName || quote.longName || symbol,
        regularMarketPrice: quote.regularMarketPrice || 0,
        regularMarketChange: quote.regularMarketChange || 0,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
        marketCap: quote.marketCap,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      },
    };
  } catch (err) {
    console.error(`[Options] Error fetching chain for ${symbol}:`, err);
    return null;
  }
}

/**
 * Get most active options from RapidAPI
 */
export async function getMostActiveOptions(): Promise<MostActiveOption[]> {
  try {
    const data = await rapidGet("/v1/markets/options/most-active", { type: "STOCKS" });
    if (!data?.body) return [];
    return data.body.map((item: any) => ({
      symbol: item.symbol,
      symbolName: item.symbolName,
      lastPrice: item.lastPrice,
      priceChange: item.priceChange,
      percentChange: item.percentChange,
      optionsTotalVolume: item.optionsTotalVolume,
      optionsPutVolumePercent: item.optionsPutVolumePercent,
      optionsCallVolumePercent: item.optionsCallVolumePercent,
      optionsPutCallVolumeRatio: item.optionsPutCallVolumeRatio,
      optionsImpliedVolatilityRank1y: item.optionsImpliedVolatilityRank1y,
    }));
  } catch (err) {
    console.error("[Options] Error fetching most active:", err);
    return [];
  }
}

/**
 * Get put/call ratio for a symbol based on total OI
 */
export function calculatePutCallRatio(calls: OptionContract[], puts: OptionContract[]): {
  volumeRatio: number;
  oiRatio: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
} {
  const totalCallVolume = calls.reduce((sum, c) => sum + (c.volume || 0), 0);
  const totalPutVolume = puts.reduce((sum, p) => sum + (p.volume || 0), 0);
  const totalCallOI = calls.reduce((sum, c) => sum + (c.openInterest || 0), 0);
  const totalPutOI = puts.reduce((sum, p) => sum + (p.openInterest || 0), 0);

  return {
    volumeRatio: totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0,
    oiRatio: totalCallOI > 0 ? totalPutOI / totalCallOI : 0,
    totalCallVolume,
    totalPutVolume,
    totalCallOI,
    totalPutOI,
  };
}
