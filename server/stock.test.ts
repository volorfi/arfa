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

// Mock the financials service module
vi.mock("./financialsService", () => ({
  getFinancialStatements: vi.fn().mockResolvedValue({
    symbol: "AAPL",
    currency: "USD",
    incomeStatement: {
      annual: [
        { period: "2025", endDate: "2025-09-27", totalRevenue: 410e9, costOfRevenue: 225e9, grossProfit: 185e9, operatingExpenses: 60e9, operatingIncome: 125e9, interestExpense: 3.5e9, incomeBeforeTax: 123e9, incomeTaxExpense: 18.5e9, netIncome: 104.5e9, eps: 6.91, epsD: 6.87, sharesOutstanding: 15.12e9, ebitda: 137e9, grossMargin: 45.1, operatingMargin: 30.5, netMargin: 25.5 },
      ],
      quarterly: [
        { period: "Q1 2026", endDate: "2025-12-28", totalRevenue: 124e9, costOfRevenue: 67e9, grossProfit: 57e9, operatingExpenses: 16e9, operatingIncome: 41e9, interestExpense: 0.9e9, incomeBeforeTax: 40.5e9, incomeTaxExpense: 6.1e9, netIncome: 34.4e9, eps: 2.28, epsD: 2.26, sharesOutstanding: 15.04e9, ebitda: 44e9, grossMargin: 46.0, operatingMargin: 33.1, netMargin: 27.7 },
      ],
    },
    balanceSheet: {
      annual: [
        { period: "2025", endDate: "2025-09-27", totalAssets: 365e9, totalCurrentAssets: 143e9, cashAndEquivalents: 30e9, shortTermInvestments: 31e9, accountsReceivable: 60e9, inventory: 7e9, totalNonCurrentAssets: 222e9, propertyPlantEquipment: 44e9, goodwill: 0, intangibleAssets: 0, totalLiabilities: 290e9, totalCurrentLiabilities: 153e9, accountsPayable: 62e9, shortTermDebt: 16e9, totalNonCurrentLiabilities: 137e9, longTermDebt: 97e9, totalEquity: 75e9, retainedEarnings: 4e9, totalDebt: 113e9, bookValuePerShare: 4.96 },
      ],
      quarterly: [
        { period: "Q1 2026", endDate: "2025-12-28", totalAssets: 395e9, totalCurrentAssets: 163e9, cashAndEquivalents: 32e9, shortTermInvestments: 28e9, accountsReceivable: 76e9, inventory: 8e9, totalNonCurrentAssets: 232e9, propertyPlantEquipment: 46e9, goodwill: 0, intangibleAssets: 0, totalLiabilities: 312e9, totalCurrentLiabilities: 172e9, accountsPayable: 70e9, shortTermDebt: 12e9, totalNonCurrentLiabilities: 140e9, longTermDebt: 95e9, totalEquity: 83e9, retainedEarnings: 12e9, totalDebt: 107e9, bookValuePerShare: 5.52 },
      ],
    },
    cashFlow: {
      annual: [
        { period: "2025", endDate: "2025-09-27", operatingCashFlow: 118e9, depreciationAmortization: 12e9, changeInWorkingCapital: -2e9, capitalExpenditures: -10e9, investingCashFlow: -5e9, acquisitions: 0, financingCashFlow: -110e9, debtRepayment: -10e9, shareRepurchases: -90e9, dividendsPaid: -15.5e9, freeCashFlow: 108e9, netChangeInCash: 3e9 },
      ],
      quarterly: [
        { period: "Q1 2026", endDate: "2025-12-28", operatingCashFlow: 40e9, depreciationAmortization: 3e9, changeInWorkingCapital: 5e9, capitalExpenditures: -3e9, investingCashFlow: -2e9, acquisitions: 0, financingCashFlow: -33e9, debtRepayment: -3e9, shareRepurchases: -25e9, dividendsPaid: -4e9, freeCashFlow: 37e9, netChangeInCash: 5e9 },
      ],
    },
  }),
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

describe("stock.financials", () => {
  it("returns financial statements for a valid symbol", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.financials({ symbol: "AAPL" });

    expect(result).toBeDefined();
    expect(result?.symbol).toBe("AAPL");
    expect(result?.currency).toBe("USD");
  });

  it("returns income statement with annual and quarterly data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.financials({ symbol: "AAPL" });

    expect(result?.incomeStatement).toBeDefined();
    expect(result?.incomeStatement.annual).toBeInstanceOf(Array);
    expect(result?.incomeStatement.quarterly).toBeInstanceOf(Array);
    expect(result?.incomeStatement.annual.length).toBeGreaterThan(0);
    expect(result?.incomeStatement.annual[0]).toHaveProperty("totalRevenue");
    expect(result?.incomeStatement.annual[0]).toHaveProperty("netIncome");
    expect(result?.incomeStatement.annual[0]).toHaveProperty("eps");
    expect(result?.incomeStatement.annual[0]).toHaveProperty("grossMargin");
    expect(result?.incomeStatement.annual[0]).toHaveProperty("operatingMargin");
    expect(result?.incomeStatement.annual[0]).toHaveProperty("netMargin");
  });

  it("returns balance sheet with annual and quarterly data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.financials({ symbol: "AAPL" });

    expect(result?.balanceSheet).toBeDefined();
    expect(result?.balanceSheet.annual).toBeInstanceOf(Array);
    expect(result?.balanceSheet.quarterly).toBeInstanceOf(Array);
    expect(result?.balanceSheet.annual[0]).toHaveProperty("totalAssets");
    expect(result?.balanceSheet.annual[0]).toHaveProperty("totalLiabilities");
    expect(result?.balanceSheet.annual[0]).toHaveProperty("totalEquity");
    expect(result?.balanceSheet.annual[0]).toHaveProperty("cashAndEquivalents");
    expect(result?.balanceSheet.annual[0]).toHaveProperty("longTermDebt");
  });

  it("returns cash flow with annual and quarterly data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.stock.financials({ symbol: "AAPL" });

    expect(result?.cashFlow).toBeDefined();
    expect(result?.cashFlow.annual).toBeInstanceOf(Array);
    expect(result?.cashFlow.quarterly).toBeInstanceOf(Array);
    expect(result?.cashFlow.annual[0]).toHaveProperty("operatingCashFlow");
    expect(result?.cashFlow.annual[0]).toHaveProperty("capitalExpenditures");
    expect(result?.cashFlow.annual[0]).toHaveProperty("freeCashFlow");
    expect(result?.cashFlow.annual[0]).toHaveProperty("dividendsPaid");
    expect(result?.cashFlow.annual[0]).toHaveProperty("shareRepurchases");
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
