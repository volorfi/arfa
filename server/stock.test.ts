import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the stock service module
vi.mock("./stockService", () => ({
  getStockQuote: vi.fn().mockResolvedValue({
    symbol: "AAPL",
    shortName: "Apple Inc.",
    longName: "Apple Inc.",
    regularMarketPrice: 250.0,
    regularMarketChange: 5.0,
    regularMarketChangePercent: 2.04,
    regularMarketVolume: 50000000,
    regularMarketDayHigh: 252.0,
    regularMarketDayLow: 245.0,
    regularMarketOpen: 246.0,
    regularMarketPreviousClose: 245.0,
    fiftyTwoWeekHigh: 260.0,
    fiftyTwoWeekLow: 180.0,
    exchange: "NMS",
    currency: "USD",
    marketCap: 3800000000000,
    trailingPE: 32.5,
    trailingEps: 7.69,
    sector: "Technology",
    industry: "Consumer Electronics",
  }),
  getStockChart: vi.fn().mockResolvedValue([
    { timestamp: 1713200000000, date: "2026-04-15T00:00:00.000Z", open: 245, high: 248, low: 244, close: 247, volume: 40000000 },
    { timestamp: 1713286400000, date: "2026-04-16T00:00:00.000Z", open: 247, high: 252, low: 246, close: 250, volume: 50000000 },
  ]),
  getStockInsights: vi.fn().mockResolvedValue({
    finance: { result: { instrumentInfo: { recommendation: { rating: 4 } } } },
  }),
  getMarketIndices: vi.fn().mockResolvedValue([
    { symbol: "^GSPC", name: "S&P 500", price: 5800, change: 25, changePercent: 0.43, chartData: [{ time: 1, value: 5775 }, { time: 2, value: 5800 }] },
    { symbol: "^NDX", name: "Nasdaq 100", price: 20500, change: -50, changePercent: -0.24, chartData: [{ time: 1, value: 20550 }, { time: 2, value: 20500 }] },
  ]),
  getMarketMovers: vi.fn().mockResolvedValue({
    gainers: [
      { symbol: "SNAP", name: "Snap Inc.", price: 6.04, change: 1.31, changePercent: 27.7, volume: 80000000 },
      { symbol: "ORCL", name: "Oracle Corporation", price: 169.81, change: 26.12, changePercent: 18.2, volume: 50000000 },
    ],
    losers: [
      { symbol: "COST", name: "Costco Wholesale", price: 984.75, change: -45.5, changePercent: -4.42, volume: 3000000 },
    ],
  }),
  searchStocks: vi.fn().mockResolvedValue([
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
    { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ" },
  ]),
  getScreenerData: vi.fn().mockResolvedValue([
    { symbol: "AAPL", name: "Apple Inc.", price: 250, change: 5, changePercent: 2.04, marketCap: 3800000000000, peRatio: 32.5, volume: 50000000, sector: "Technology" },
    { symbol: "MSFT", name: "Microsoft Corporation", price: 420, change: -3, changePercent: -0.71, marketCap: 3100000000000, peRatio: 35.2, volume: 30000000, sector: "Technology" },
  ]),
  getIPOData: vi.fn().mockReturnValue({
    recent: [{ date: "Apr 14, 2026", symbol: "MYX", name: "Maywood Acquisition Corp." }],
    upcoming: [{ date: "Apr 17, 2026", symbol: "BWGC", name: "BW Industrial Holdings" }],
  }),
  getMarketNews: vi.fn().mockReturnValue([
    { title: "Test News Article", source: "Reuters", timestamp: "2h ago", relatedSymbols: ["AAPL"] },
  ]),
}));

// Mock the db module
vi.mock("./db", () => ({
  getWatchlistByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, symbol: "AAPL", companyName: "Apple Inc.", addedAt: new Date() },
  ]),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
  isInWatchlist: vi.fn().mockResolvedValue(true),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("stock.quote", () => {
  it("returns stock quote data for a valid symbol", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.quote({ symbol: "AAPL" });

    expect(result).toBeDefined();
    expect(result?.symbol).toBe("AAPL");
    expect(result?.regularMarketPrice).toBe(250.0);
    expect(result?.regularMarketChange).toBe(5.0);
    expect(result?.regularMarketChangePercent).toBe(2.04);
    expect(result?.exchange).toBe("NMS");
    expect(result?.currency).toBe("USD");
    expect(result?.marketCap).toBe(3800000000000);
    expect(result?.trailingPE).toBe(32.5);
    expect(result?.sector).toBe("Technology");
  });
});

describe("stock.chart", () => {
  it("returns chart data points with correct structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.chart({ symbol: "AAPL", interval: "1d", range: "1mo" });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("timestamp");
    expect(result[0]).toHaveProperty("open");
    expect(result[0]).toHaveProperty("high");
    expect(result[0]).toHaveProperty("low");
    expect(result[0]).toHaveProperty("close");
    expect(result[0]).toHaveProperty("volume");
  });

  it("uses default interval and range when not provided", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.chart({ symbol: "AAPL" });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("stock.insights", () => {
  it("returns insights data for a symbol", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.insights({ symbol: "AAPL" });

    expect(result).toBeDefined();
    expect(result?.finance?.result?.instrumentInfo).toBeDefined();
  });
});

describe("stock.search", () => {
  it("returns search results for a valid query", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.search({ query: "AA" });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("symbol");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("exchange");
  });

  it("returns empty array for empty query", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.search({ query: "" });

    expect(result).toEqual([]);
  });
});

describe("stock.screener", () => {
  it("returns screener data with correct structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.screener();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("symbol");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("price");
    expect(result[0]).toHaveProperty("changePercent");
    expect(result[0]).toHaveProperty("marketCap");
    expect(result[0]).toHaveProperty("peRatio");
    expect(result[0]).toHaveProperty("volume");
    expect(result[0]).toHaveProperty("sector");
  });
});

describe("market.indices", () => {
  it("returns market indices data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.market.indices();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("symbol");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("price");
    expect(result[0]).toHaveProperty("change");
    expect(result[0]).toHaveProperty("changePercent");
    expect(result[0]).toHaveProperty("chartData");
  });
});

describe("market.movers", () => {
  it("returns gainers and losers", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.market.movers();

    expect(result).toHaveProperty("gainers");
    expect(result).toHaveProperty("losers");
    expect(result.gainers).toBeInstanceOf(Array);
    expect(result.losers).toBeInstanceOf(Array);
    expect(result.gainers.length).toBeGreaterThan(0);
    expect(result.gainers[0]).toHaveProperty("symbol");
    expect(result.gainers[0]).toHaveProperty("price");
    expect(result.gainers[0]).toHaveProperty("changePercent");
  });
});

describe("market.news", () => {
  it("returns news items with correct structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.market.news();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("source");
    expect(result[0]).toHaveProperty("timestamp");
  });
});

describe("market.ipos", () => {
  it("returns recent and upcoming IPOs", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.market.ipos();

    expect(result).toHaveProperty("recent");
    expect(result).toHaveProperty("upcoming");
    expect(result.recent).toBeInstanceOf(Array);
    expect(result.upcoming).toBeInstanceOf(Array);
    expect(result.recent[0]).toHaveProperty("date");
    expect(result.recent[0]).toHaveProperty("symbol");
    expect(result.recent[0]).toHaveProperty("name");
  });
});

describe("watchlist", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.watchlist.list()).rejects.toThrow();
  });

  it("returns watchlist for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.watchlist.list();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("symbol", "AAPL");
    expect(result[0]).toHaveProperty("companyName", "Apple Inc.");
  });

  it("check returns boolean for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.watchlist.check({ symbol: "AAPL" });

    expect(result).toBe(true);
  });

  it("add returns success for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.watchlist.add({ symbol: "TSLA", companyName: "Tesla, Inc." });

    expect(result).toEqual({ success: true });
  });

  it("remove returns success for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.watchlist.remove({ symbol: "AAPL" });

    expect(result).toEqual({ success: true });
  });

  it("add requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.watchlist.add({ symbol: "TSLA" })).rejects.toThrow();
  });

  it("remove requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.watchlist.remove({ symbol: "AAPL" })).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();

    expect(result).toBeNull();
  });

  it("returns user data for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe("user");
  });
});
