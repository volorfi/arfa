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

// Mock the bond service module
vi.mock("./bondService", () => ({
  getBonds: vi.fn().mockReturnValue([
    {
      ticker: "AAPL 3.25 02/23/26 Corp",
      issuerName: "APPLE INC",
      issuerSlug: "apple-inc",
      isin: "US037833DX42",
      rating: "AA+",
      currency: "USD",
      amountOutstanding: 2000,
      price: 99.5,
      yieldToMaturity: 4.12,
      duration: 3.25,
      zSpread: 45,
      oasSpread: 38,
      change1M: -0.25,
      totalReturn: 0.15,
      region: "N America",
      country: "US",
      industryGroup: "Technology",
      sector: "Technology",
      creditTrend: "STA",
      recommendation: "OW",
      score: 15,
      bval: null,
      defaultProb3Y: 0.001,
      lossGivenDefault: 0.35,
      cdsSpread: 42,
      cdsRateOfChange: -0.02,
      totalDebtToEbitda: 1.5,
      netDebtToEbitda: 0.8,
      totalDebtToEquity: 1.2,
      ebitdaToInterest: 25,
      cashToShortTermDebt: 3.5,
      shortTermDebtToTotalDebt: 0.1,
      ebitdaMargin: 0.35,
      fcfYield: 0.04,
      waccCostDebt: 0.03,
      cashNearCash: 30000,
      shortTermBorrow: 5000,
      longTermBorrow: 100000,
      scores: [2, 2, 2, 1, 1, 2, 1, 1, 1, 1, 0, 1],
      totalScore: 15,
    },
  ]),
  getIssuerBySlug: vi.fn().mockImplementation((slug: string) => {
    if (slug === "apple-inc") {
      return {
        name: "APPLE INC",
        slug: "apple-inc",
        rating: "AA+",
        region: "N America",
        country: "US",
        industryGroup: "Technology",
        sector: "Technology",
        creditTrend: "STA",
        recommendation: "OW",
        creditComment: "APPLE INC\nCredit Rating: AA+/Stable (S&P)\nCredit Momentum: Stable",
        equityTicker: "AAPL US Equity",
        bonds: [
          { ticker: "AAPL 3.25 02/23/26 Corp", isin: "US037833DX42", rating: "AA+", price: 99.5, yieldToMaturity: 4.12, duration: 3.25, zSpread: 45, oasSpread: 38, amountOutstanding: 2000, change1M: -0.25, totalReturn: 0.15 },
        ],
        totalDebtToEbitda: 1.5,
        netDebtToEbitda: 0.8,
        totalDebtToEquity: 1.2,
        ebitdaToInterest: 25,
        cashToShortTermDebt: 3.5,
        shortTermDebtToTotalDebt: 0.1,
        ebitdaMargin: 0.35,
        fcfYield: 0.04,
        waccCostDebt: 0.03,
        cashNearCash: 30000,
        shortTermBorrow: 5000,
        longTermBorrow: 100000,
        defaultProb3Y: 0.001,
        lossGivenDefault: 0.35,
        cdsSpread: 42,
        score: 15,
        totalScore: 15,
        scores: [2, 2, 2, 1, 1, 2, 1, 1, 1, 1, 0, 1],
      };
    }
    return null;
  }),
  getFilterOptions: vi.fn().mockReturnValue({
    ratings: ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"],
    regions: ["Asia", "Europe", "Latam", "N America"],
    sectors: ["Consumer", "Energy", "Technology", "Utilities"],
    creditTrends: ["POS", "STA", "NEG"],
    recommendations: ["OW", "MW", "UW"],
    countries: ["US", "UK", "Japan"],
  }),
  getBondsSummary: vi.fn().mockReturnValue({
    totalBonds: 702,
    totalIssuers: 701,
    avgYield: 5.12,
    avgSpread: 120.5,
    avgDuration: 5.8,
    totalOutstanding: 500000,
    ratingDistribution: { "AA+": 50, "A": 100, "BBB+": 200, "BBB": 150 },
    regionDistribution: { "N America": 300, "Europe": 200, "Asia": 100 },
    sectorDistribution: { "Technology": 100, "Utilities": 150, "Energy": 80 },
  }),
}));

// Mock the sovereign service module
vi.mock("./sovereignService", () => ({
  getSovereignBonds: vi.fn().mockReturnValue([
    {
      ticker: "TURKEY 6.5 09/20/33",
      name: "Republic of Turkey",
      isin: "US900123CK22",
      slug: "republic-of-turkey-6-5-09-20-33",
      rtgSP: "BB-",
      rtgSPOutlook: "POSITIVE",
      rtgMoody: "B1",
      rtgMoodyOutlook: "POSITIVE",
      rtgFitch: "BB-",
      rtgFitchOutlook: "STABLE",
      compositeRating: "BB-",
      igHyIndicator: "HY",
      series: null,
      paymentRank: "Sr Unsecured",
      coupon: 6.5,
      couponFreq: 2,
      couponType: "FIXED",
      maturity: "09/20/2033",
      currency: "USD",
      amtIssued: 3500,
      minPiece: 200000,
      amtOutstanding: 3500,
      price: 101.25,
      yieldToMaturity: 6.32,
      duration: 5.8,
      maturityYears: 7.4,
      zSpread: 280,
      oasSpread: 265,
      change1M: 0.45,
      change3M: 1.2,
      totalReturnYTD: 3.5,
      creditAssessment: "POS",
      score: 12,
      defaultProb: 0.035,
      publicDebtGDP2025: 35,
      publicDebtGDP2024: 33,
      debtTrajectory: 2,
      externalDebtGDP: 45,
      fiscalBalance: -3.5,
      inflation: 35,
      disinflation: -10,
      moneyGrowth: 40,
      currentAccount: -3.8,
      fxStability: "D",
      reservesTrend: "U",
      realGDPGrowth: 3.2,
      reservesExtDebt: 0.35,
      interestExpGovRev: 12,
      reservesMonths: 4.5,
      reservesBln: 98,
      externalDebtBln: 280,
      country: "Turkey",
      region: "Middle East",
      creditComment: "Republic of Turkey\nCredit Rating: BB-/Positive (S&P)\nTurkey has shown improving macro fundamentals.",
    },
  ]),
  getSovereignBondBySlug: vi.fn().mockImplementation((slug: string) => {
    if (slug === "republic-of-turkey-6-5-09-20-33") {
      return {
        ticker: "TURKEY 6.5 09/20/33",
        name: "Republic of Turkey",
        slug: "republic-of-turkey-6-5-09-20-33",
        compositeRating: "BB-",
        yieldToMaturity: 6.32,
        duration: 5.8,
        price: 101.25,
        country: "Turkey",
        region: "Middle East",
        creditComment: "Republic of Turkey\nCredit Rating: BB-/Positive (S&P)",
      };
    }
    return null;
  }),
  getSovereignFilters: vi.fn().mockReturnValue({
    regions: ["Middle East", "Europe", "Africa", "Americas", "Asia"],
    countries: ["Turkey", "Brazil", "Mexico", "South Africa"],
    currencies: ["USD", "EUR"],
    ratings: ["AAA", "AA+", "AA", "BBB", "BB-", "B+"],
    igHyOptions: ["IG", "HY"],
    creditAssessments: ["POS", "STA", "NEG"],
  }),
  getSovereignSummary: vi.fn().mockReturnValue({
    totalBonds: 150,
    uniqueCountries: 45,
    avgYield: "6.85",
    avgSpread: "285",
    avgDuration: "6.2",
    ratingDistribution: { "BBB": 40, "BB-": 30, "B+": 25 },
    regionDistribution: { "Middle East": 35, "Europe": 30, "Africa": 25 },
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

describe("bonds.list", () => {
  it("returns bond list data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.list();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("ticker");
    expect(result[0]).toHaveProperty("issuerName");
    expect(result[0]).toHaveProperty("issuerSlug");
    expect(result[0]).toHaveProperty("rating");
    expect(result[0]).toHaveProperty("yieldToMaturity");
    expect(result[0]).toHaveProperty("duration");
    expect(result[0]).toHaveProperty("oasSpread");
    expect(result[0]).toHaveProperty("price");
    expect(result[0]).toHaveProperty("creditTrend");
    expect(result[0]).toHaveProperty("recommendation");
    expect(result[0]).toHaveProperty("score");
  });

  it("accepts filter parameters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.list({ rating: "AA+", region: "N America" });

    expect(result).toBeInstanceOf(Array);
  });
});

describe("bonds.issuer", () => {
  it("returns issuer data for valid slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.issuer({ slug: "apple-inc" });

    expect(result).toBeDefined();
    expect(result?.name).toBe("APPLE INC");
    expect(result?.rating).toBe("AA+");
    expect(result?.creditComment).toContain("APPLE INC");
    expect(result?.bonds).toBeInstanceOf(Array);
    expect(result?.bonds.length).toBeGreaterThan(0);
    expect(result?.totalDebtToEbitda).toBe(1.5);
    expect(result?.ebitdaMargin).toBe(0.35);
  });

  it("returns null for unknown slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.issuer({ slug: "nonexistent" });

    expect(result).toBeNull();
  });
});

describe("bonds.filters", () => {
  it("returns filter options", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.filters();

    expect(result).toHaveProperty("ratings");
    expect(result).toHaveProperty("regions");
    expect(result).toHaveProperty("sectors");
    expect(result).toHaveProperty("creditTrends");
    expect(result).toHaveProperty("recommendations");
    expect(result.ratings).toBeInstanceOf(Array);
    expect(result.ratings.length).toBeGreaterThan(0);
  });
});

describe("bonds.summary", () => {
  it("returns summary statistics", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.bonds.summary();

    expect(result).toHaveProperty("totalBonds", 702);
    expect(result).toHaveProperty("totalIssuers", 701);
    expect(result).toHaveProperty("avgYield");
    expect(result).toHaveProperty("avgSpread");
    expect(result).toHaveProperty("avgDuration");
    expect(result).toHaveProperty("ratingDistribution");
    expect(result).toHaveProperty("regionDistribution");
    expect(result).toHaveProperty("sectorDistribution");
  });
});

describe("sovereign.list", () => {
  it("returns sovereign bonds list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.list({});

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("ticker");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("compositeRating");
    expect(result[0]).toHaveProperty("yieldToMaturity");
    expect(result[0]).toHaveProperty("duration");
    expect(result[0]).toHaveProperty("country");
    expect(result[0]).toHaveProperty("region");
    expect(result[0]).toHaveProperty("creditComment");
  });

  it("accepts filter parameters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.list({ region: "Middle East", currency: "USD" });

    expect(result).toBeInstanceOf(Array);
  });
});

describe("sovereign.detail", () => {
  it("returns bond data for valid slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.detail({ slug: "republic-of-turkey-6-5-09-20-33" });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Republic of Turkey");
    expect(result?.compositeRating).toBe("BB-");
    expect(result?.creditComment).toContain("Republic of Turkey");
  });

  it("returns null for unknown slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.detail({ slug: "nonexistent" });

    expect(result).toBeNull();
  });
});

describe("sovereign.filters", () => {
  it("returns filter options", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.filters();

    expect(result).toHaveProperty("regions");
    expect(result).toHaveProperty("countries");
    expect(result).toHaveProperty("currencies");
    expect(result).toHaveProperty("ratings");
    expect(result).toHaveProperty("igHyOptions");
    expect(result).toHaveProperty("creditAssessments");
    expect(result.regions).toBeInstanceOf(Array);
    expect(result.regions.length).toBeGreaterThan(0);
  });
});

describe("sovereign.summary", () => {
  it("returns summary statistics", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sovereign.summary();

    expect(result).toHaveProperty("totalBonds", 150);
    expect(result).toHaveProperty("uniqueCountries", 45);
    expect(result).toHaveProperty("avgYield");
    expect(result).toHaveProperty("avgSpread");
    expect(result).toHaveProperty("avgDuration");
    expect(result).toHaveProperty("ratingDistribution");
    expect(result).toHaveProperty("regionDistribution");
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
