import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Sample news articles for mocking (now with sentiment)
const mockArticles = [
  {
    id: 1,
    title: "Apple Reports Record Q2 Earnings",
    summary: "Apple Inc. reported record revenue for Q2 2026, beating analyst expectations.",
    url: "https://example.com/apple-earnings",
    source: "Yahoo Finance",
    category: "Earnings",
    tickers: "AAPL",
    sentiment: "bullish",
    publishedAt: new Date("2026-04-15T10:00:00Z"),
    fetchedAt: new Date("2026-04-15T12:00:00Z"),
    urlHash: "abc123",
  },
  {
    id: 2,
    title: "Tesla Stock Surges on New Model Announcement",
    summary: "Tesla shares rose 8% after announcing a new affordable EV model.",
    url: "https://example.com/tesla-surge",
    source: "Reuters",
    category: "Markets",
    tickers: "TSLA",
    sentiment: "bullish",
    publishedAt: new Date("2026-04-15T08:00:00Z"),
    fetchedAt: new Date("2026-04-15T12:00:00Z"),
    urlHash: "def456",
  },
  {
    id: 3,
    title: "S&P 500 Hits New All-Time High",
    summary: "The S&P 500 index reached a new record, driven by tech sector gains.",
    url: "https://example.com/sp500-high",
    source: "Bloomberg",
    category: "Markets",
    tickers: "AAPL,MSFT,GOOGL",
    sentiment: "bullish",
    publishedAt: new Date("2026-04-14T14:00:00Z"),
    fetchedAt: new Date("2026-04-14T16:00:00Z"),
    urlHash: "ghi789",
  },
  {
    id: 4,
    title: "Federal Reserve Signals Rate Hold",
    summary: "The Fed indicated rates will remain unchanged through Q3 2026.",
    url: "https://example.com/fed-rates",
    source: "CNBC",
    category: "Economy",
    tickers: null,
    sentiment: "neutral",
    publishedAt: new Date("2026-04-14T09:00:00Z"),
    fetchedAt: new Date("2026-04-14T10:00:00Z"),
    urlHash: "jkl012",
  },
  {
    id: 5,
    title: "Gold Prices Rise Amid Geopolitical Tensions",
    summary: "Gold futures climbed to $2,450 per ounce as investors sought safe havens.",
    url: "https://example.com/gold-rise",
    source: "Reuters",
    category: "Commodities",
    tickers: null,
    sentiment: "bearish",
    publishedAt: new Date("2026-04-13T11:00:00Z"),
    fetchedAt: new Date("2026-04-13T12:00:00Z"),
    urlHash: "mno345",
  },
  {
    id: 6,
    title: "Tech Sector Faces Regulatory Headwinds",
    summary: "New regulations could impact major tech companies' revenue growth.",
    url: "https://example.com/tech-regulation",
    source: "Bloomberg",
    category: "Markets",
    tickers: "AAPL,GOOGL,META",
    sentiment: "bearish",
    publishedAt: new Date("2026-04-13T09:00:00Z"),
    fetchedAt: new Date("2026-04-13T10:00:00Z"),
    urlHash: "pqr678",
  },
];

// Mock all required modules
vi.mock("./stockService", () => ({
  getStockQuote: vi.fn().mockResolvedValue(null),
  getStockChart: vi.fn().mockResolvedValue([]),
  getStockInsights: vi.fn().mockResolvedValue(null),
  getMarketIndices: vi.fn().mockResolvedValue([]),
  getMarketMovers: vi.fn().mockResolvedValue({ gainers: [], losers: [] }),
  searchStocks: vi.fn().mockResolvedValue([]),
  getScreenerData: vi.fn().mockResolvedValue([]),
  getIPOData: vi.fn().mockReturnValue({ recent: [], upcoming: [] }),
  getMarketNews: vi.fn().mockReturnValue([]),
}));

vi.mock("./financialsService", () => ({
  getFinancialStatements: vi.fn().mockResolvedValue(null),
}));

vi.mock("./bondService", () => ({
  getBonds: vi.fn().mockReturnValue([]),
  getIssuerBySlug: vi.fn().mockReturnValue(null),
  getFilterOptions: vi.fn().mockReturnValue({ ratings: [], regions: [], sectors: [], creditTrends: [], recommendations: [], countries: [] }),
  getBondsSummary: vi.fn().mockReturnValue({ totalBonds: 0, totalIssuers: 0, avgYield: 0, avgSpread: 0, avgDuration: 0, totalOutstanding: 0, ratingDistribution: {}, regionDistribution: {}, sectorDistribution: {} }),
}));

vi.mock("./sovereignService", () => ({
  getSovereignBonds: vi.fn().mockReturnValue([]),
  getSovereignBondBySlug: vi.fn().mockReturnValue(null),
  getSovereignFilters: vi.fn().mockReturnValue({ regions: [], countries: [], currencies: [], ratings: [], igHyOptions: [], creditAssessments: [] }),
  getSovereignSummary: vi.fn().mockReturnValue({ totalBonds: 0, uniqueCountries: 0, avgYield: "0", avgSpread: "0", avgDuration: "0", ratingDistribution: {}, regionDistribution: {} }),
}));

vi.mock("./newsService", () => ({
  queryNews: vi.fn().mockImplementation((opts: any) => {
    let filtered = [...mockArticles];

    if (opts.source) {
      filtered = filtered.filter((a) => a.source === opts.source);
    }
    if (opts.ticker) {
      const t = opts.ticker.toUpperCase();
      filtered = filtered.filter((a) => {
        if (!a.tickers) return false;
        const tickers = a.tickers.split(",");
        return tickers.includes(t);
      });
    }
    if (opts.category) {
      filtered = filtered.filter((a) => a.category === opts.category);
    }
    if (opts.sentiment) {
      filtered = filtered.filter((a) => a.sentiment === opts.sentiment);
    }
    if (opts.search) {
      const s = opts.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(s) ||
          (a.summary && a.summary.toLowerCase().includes(s))
      );
    }
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom);
      filtered = filtered.filter((a) => a.publishedAt >= from);
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      filtered = filtered.filter((a) => a.publishedAt <= to);
    }

    const limit = opts.pageSize || 50;
    const offset = ((opts.page || 1) - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    return Promise.resolve({ articles: paged, total: filtered.length });
  }),
  queryNewsSources: vi.fn().mockResolvedValue(["Bloomberg", "CNBC", "Reuters", "Yahoo Finance"]),
  queryNewsCategories: vi.fn().mockResolvedValue(["Commodities", "Earnings", "Economy", "Markets"]),
  scrapeAllNews: vi.fn().mockResolvedValue(50),
}));

vi.mock("./sentimentService", () => ({
  analyzeUnprocessedArticles: vi.fn().mockResolvedValue(10),
  getSentimentStats: vi.fn().mockImplementation((ticker?: string) => {
    let articles = [...mockArticles];
    if (ticker) {
      const t = ticker.toUpperCase();
      articles = articles.filter((a) => {
        if (!a.tickers) return false;
        return a.tickers.split(",").includes(t);
      });
    }
    const stats = { bullish: 0, bearish: 0, neutral: 0, total: 0 };
    for (const a of articles) {
      if (a.sentiment === "bullish") stats.bullish++;
      else if (a.sentiment === "bearish") stats.bearish++;
      else if (a.sentiment === "neutral") stats.neutral++;
      stats.total++;
    }
    return Promise.resolve(stats);
  }),
}));

vi.mock("./db", () => ({
  getWatchlistByUserId: vi.fn().mockResolvedValue([]),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
  isInWatchlist: vi.fn().mockResolvedValue(false),
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

// ─── News List Tests ──────────────────────────────────────────────────────

describe("news.list", () => {
  it("returns all articles when no filters applied", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({});

    expect(result).toBeDefined();
    expect(result.articles).toBeInstanceOf(Array);
    expect(result.articles.length).toBe(6);
    expect(result.total).toBe(6);
  });

  it("returns articles with sentiment field", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({});

    const article = result.articles[0];
    expect(article).toHaveProperty("id");
    expect(article).toHaveProperty("title");
    expect(article).toHaveProperty("summary");
    expect(article).toHaveProperty("url");
    expect(article).toHaveProperty("source");
    expect(article).toHaveProperty("category");
    expect(article).toHaveProperty("sentiment");
    expect(article).toHaveProperty("publishedAt");
    expect(["bullish", "bearish", "neutral"]).toContain(article.sentiment);
  });

  it("filters by source", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ source: "Reuters" });

    expect(result.articles.length).toBe(2);
    expect(result.total).toBe(2);
    result.articles.forEach((a) => {
      expect(a.source).toBe("Reuters");
    });
  });

  it("filters by ticker (exact match)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ ticker: "AAPL" });

    expect(result.articles.length).toBe(3);
    expect(result.total).toBe(3);
    result.articles.forEach((a) => {
      expect(a.tickers).toBeTruthy();
      expect(a.tickers!.split(",")).toContain("AAPL");
    });
  });

  it("filters by ticker without false positives", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ ticker: "MSFT" });

    expect(result.articles.length).toBe(1);
    expect(result.articles[0].title).toContain("S&P 500");
  });

  it("filters by category", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ category: "Markets" });

    expect(result.articles.length).toBe(3);
    result.articles.forEach((a) => {
      expect(a.category).toBe("Markets");
    });
  });

  it("filters by sentiment - bullish", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ sentiment: "bullish" });

    expect(result.articles.length).toBe(3);
    result.articles.forEach((a) => {
      expect(a.sentiment).toBe("bullish");
    });
  });

  it("filters by sentiment - bearish", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ sentiment: "bearish" });

    expect(result.articles.length).toBe(2);
    result.articles.forEach((a) => {
      expect(a.sentiment).toBe("bearish");
    });
  });

  it("filters by sentiment - neutral", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ sentiment: "neutral" });

    expect(result.articles.length).toBe(1);
    result.articles.forEach((a) => {
      expect(a.sentiment).toBe("neutral");
    });
  });

  it("combines sentiment with other filters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({
      sentiment: "bullish",
      category: "Markets",
    });

    expect(result.articles.length).toBe(2);
    result.articles.forEach((a) => {
      expect(a.sentiment).toBe("bullish");
      expect(a.category).toBe("Markets");
    });
  });

  it("filters by search keyword in title", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ search: "Apple" });

    expect(result.articles.length).toBe(1);
    expect(result.articles[0].title).toContain("Apple");
  });

  it("filters by search keyword in summary", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ search: "safe havens" });

    expect(result.articles.length).toBe(1);
    expect(result.articles[0].title).toContain("Gold");
  });

  it("filters by date range", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({
      dateFrom: "2026-04-15T00:00:00Z",
      dateTo: "2026-04-15T23:59:59Z",
    });

    expect(result.articles.length).toBe(2);
    result.articles.forEach((a) => {
      const d = new Date(a.publishedAt);
      expect(d.toISOString().startsWith("2026-04-15")).toBe(true);
    });
  });

  it("combines multiple filters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({
      source: "Reuters",
      category: "Commodities",
    });

    expect(result.articles.length).toBe(1);
    expect(result.articles[0].title).toContain("Gold");
  });

  it("supports pagination", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ pageSize: 2, page: 1 });

    expect(result.articles.length).toBe(2);
    expect(result.total).toBe(6);
  });

  it("returns empty for non-matching filters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list({ source: "NonExistentSource" });

    expect(result.articles.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("works without any input (undefined)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.list(undefined);

    expect(result).toBeDefined();
    expect(result.articles).toBeInstanceOf(Array);
  });
});

// ─── News Sources Tests ───────────────────────────────────────────────────

describe("news.sources", () => {
  it("returns a list of source strings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.sources();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(4);
    expect(result).toContain("Reuters");
    expect(result).toContain("Bloomberg");
  });
});

// ─── News Categories Tests ────────────────────────────────────────────────

describe("news.categories", () => {
  it("returns a list of category strings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.categories();

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(4);
    expect(result).toContain("Markets");
    expect(result).toContain("Earnings");
  });
});

// ─── Sentiment Stats Tests ───────────────────────────────────────────────

describe("news.sentimentStats", () => {
  it("returns overall sentiment distribution", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.sentimentStats({});

    expect(result).toBeDefined();
    expect(result.bullish).toBe(3);
    expect(result.bearish).toBe(2);
    expect(result.neutral).toBe(1);
    expect(result.total).toBe(6);
  });

  it("returns sentiment stats filtered by ticker", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.sentimentStats({ ticker: "AAPL" });

    expect(result).toBeDefined();
    expect(result.bullish).toBe(2); // articles 1, 3
    expect(result.bearish).toBe(1); // article 6
    expect(result.neutral).toBe(0);
    expect(result.total).toBe(3);
  });

  it("returns zeros for ticker with no articles", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.sentimentStats({ ticker: "XYZ" });

    expect(result.bullish).toBe(0);
    expect(result.bearish).toBe(0);
    expect(result.neutral).toBe(0);
    expect(result.total).toBe(0);
  });

  it("works without input", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.news.sentimentStats(undefined);

    expect(result).toBeDefined();
    expect(result.total).toBe(6);
  });
});

// ─── News Scrape Tests ────────────────────────────────────────────────────

describe("news.scrape", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.news.scrape()).rejects.toThrow();
  });

  it("returns success with article count and sentiment count for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.news.scrape();

    expect(result.success).toBe(true);
    expect(result.articlesProcessed).toBe(50);
    expect(result.sentimentAnalyzed).toBe(10);
  });
});

// ─── Sentiment Analysis Mutation Tests ───────────────────────────────────

describe("news.analyzeSentiment", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.news.analyzeSentiment()).rejects.toThrow();
  });

  it("returns success with analyzed count for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.news.analyzeSentiment();

    expect(result.success).toBe(true);
    expect(result.articlesAnalyzed).toBe(10);
  });
});
