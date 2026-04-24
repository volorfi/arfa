import crypto from "crypto";
import Parser from "rss-parser";
import cron from "node-cron";
import { insertNewsArticles, getNewsArticles, getNewsSources, getNewsCategories, deleteOldArticles } from "./db";
import type { InsertNewsArticle } from "../drizzle/schema";
import { analyzeUnprocessedArticles } from "./sentimentService";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "ARFA-Global-Markets/1.0",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// ─── RSS Feed Configuration ───────────────────────────────────────────────

interface FeedConfig {
  url: string;
  source: string;
  category: string;
  articleType: "news" | "blog";
}

const RSS_FEEDS: FeedConfig[] = [
  // ─── NEWS FEEDS ───────────────────────────────────────────────────────
  // Google News - Business / Finance
  {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Business",
    articleType: "news",
  },
  // Google News - Stock Market search
  {
    url: "https://news.google.com/rss/search?q=stock+market&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Markets",
    articleType: "news",
  },
  // Google News - Economy
  {
    url: "https://news.google.com/rss/search?q=economy+finance&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Economy",
    articleType: "news",
  },
  // Google News - Earnings
  {
    url: "https://news.google.com/rss/search?q=earnings+report+quarterly&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Earnings",
    articleType: "news",
  },
  // Google News - Bonds & Fixed Income
  {
    url: "https://news.google.com/rss/search?q=bonds+fixed+income+treasury&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Fixed Income",
    articleType: "news",
  },
  // Google News - Commodities
  {
    url: "https://news.google.com/rss/search?q=oil+gold+commodities+prices&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Commodities",
    articleType: "news",
  },
  // Google News - IPO
  {
    url: "https://news.google.com/rss/search?q=IPO+initial+public+offering&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "IPO",
    articleType: "news",
  },
  // Google News - Crypto
  {
    url: "https://news.google.com/rss/search?q=cryptocurrency+bitcoin+ethereum&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Crypto",
    articleType: "news",
  },
  // Google News - World / Geopolitics
  {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "World",
    articleType: "news",
  },
  // Google News - Technology
  {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Technology",
    articleType: "news",
  },

  // ─── BLOG FEEDS ───────────────────────────────────────────────────────
  // Seeking Alpha
  {
    url: "https://seekingalpha.com/feed.xml",
    source: "Seeking Alpha",
    category: "Analysis",
    articleType: "blog",
  },
  // Motley Fool
  {
    url: "https://www.fool.com/feeds/index.aspx",
    source: "Motley Fool",
    category: "Analysis",
    articleType: "blog",
  },
  // Benzinga
  {
    url: "https://www.benzinga.com/feed",
    source: "Benzinga",
    category: "Markets",
    articleType: "blog",
  },
  // MarketWatch Top Stories
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories",
    source: "MarketWatch",
    category: "Markets",
    articleType: "blog",
  },
  // MarketWatch Bulletins
  {
    url: "https://feeds.marketwatch.com/marketwatch/bulletins",
    source: "MarketWatch",
    category: "Breaking",
    articleType: "blog",
  },
  // Zero Hedge
  {
    url: "https://feeds.feedburner.com/zerohedge/feed",
    source: "Zero Hedge",
    category: "Markets",
    articleType: "blog",
  },
  // Calculated Risk
  {
    url: "https://www.calculatedriskblog.com/feeds/posts/default?alt=rss",
    source: "Calculated Risk",
    category: "Economy",
    articleType: "blog",
  },
  // Wolf Street
  {
    url: "https://wolfstreet.com/feed/",
    source: "Wolf Street",
    category: "Economy",
    articleType: "blog",
  },
  // Abnormal Returns
  {
    url: "https://abnormalreturns.com/feed/",
    source: "Abnormal Returns",
    category: "Analysis",
    articleType: "blog",
  },
  // The Reformed Broker (Josh Brown)
  {
    url: "https://thereformedbroker.com/feed/",
    source: "The Reformed Broker",
    category: "Analysis",
    articleType: "blog",
  },
  // Daily Reckoning
  {
    url: "https://dailyreckoning.com/feed/",
    source: "Daily Reckoning",
    category: "Analysis",
    articleType: "blog",
  },
  // Pragmatic Capitalism
  {
    url: "https://www.pragcap.com/feed/",
    source: "Pragmatic Capitalism",
    category: "Economy",
    articleType: "blog",
  },
  // Financial Times blogs via Google News
  {
    url: "https://news.google.com/rss/search?q=site:ft.com+opinion&hl=en-US&gl=US&ceid=US:en",
    source: "Financial Times",
    category: "Opinion",
    articleType: "blog",
  },
  // Bloomberg Opinion via Google News
  {
    url: "https://news.google.com/rss/search?q=site:bloomberg.com+opinion&hl=en-US&gl=US&ceid=US:en",
    source: "Bloomberg Opinion",
    category: "Opinion",
    articleType: "blog",
  },
];

// ─── Ticker extraction ────────────────────────────────────────────────────

const KNOWN_TICKERS: Record<string, string> = {
  apple: "AAPL", microsoft: "MSFT", google: "GOOGL", alphabet: "GOOGL",
  amazon: "AMZN", meta: "META", facebook: "META", nvidia: "NVDA",
  tesla: "TSLA", netflix: "NFLX", amd: "AMD", intel: "INTC",
  "jpmorgan": "JPM", "goldman sachs": "GS", "bank of america": "BAC",
  "morgan stanley": "MS", citigroup: "C", disney: "DIS",
  walmart: "WMT", boeing: "BA", "coca-cola": "KO", pepsi: "PEP",
  "johnson & johnson": "JNJ", pfizer: "PFE", moderna: "MRNA",
  uber: "UBER", airbnb: "ABNB", spotify: "SPOT", palantir: "PLTR",
  snowflake: "SNOW", coinbase: "COIN", robinhood: "HOOD",
  "s&p 500": "^GSPC", "s&p": "^GSPC", nasdaq: "^IXIC",
  "dow jones": "^DJI", dow: "^DJI",
  broadcom: "AVGO", salesforce: "CRM", adobe: "ADBE",
  "advanced micro": "AMD", qualcomm: "QCOM", micron: "MU",
  visa: "V", mastercard: "MA", paypal: "PYPL",
  "berkshire hathaway": "BRK-B", berkshire: "BRK-B",
  oracle: "ORCL", ibm: "IBM", cisco: "CSCO",
  "home depot": "HD", costco: "COST", target: "TGT",
  nike: "NKE", starbucks: "SBUX", "mcdonald's": "MCD", mcdonalds: "MCD",
  exxon: "XOM", chevron: "CVX", conocophillips: "COP",
  "procter & gamble": "PG", "procter and gamble": "PG",
  "eli lilly": "LLY", "unitedhealth": "UNH", merck: "MRK",
  abbvie: "ABBV", amgen: "AMGN",
  "wells fargo": "WFC", "charles schwab": "SCHW",
  "general motors": "GM", ford: "F",
  "at&t": "T", verizon: "VZ", "t-mobile": "TMUS",
  crowdstrike: "CRWD", datadog: "DDOG", servicenow: "NOW",
  shopify: "SHOP", "trade desk": "TTD",
  rivian: "RIVN", lucid: "LCID",
  "arm holdings": "ARM", arm: "ARM",
  supermicro: "SMCI", dell: "DELL",
};

function extractTickers(title: string): string[] {
  const tickers = new Set<string>();

  // Match explicit ticker patterns like $AAPL or (AAPL)
  const tickerPatterns = title.match(/\$([A-Z]{1,5})\b/g);
  if (tickerPatterns) {
    tickerPatterns.forEach((t) => tickers.add(t.replace("$", "")));
  }
  const parenPatterns = title.match(/\(([A-Z]{1,5})\)/g);
  if (parenPatterns) {
    parenPatterns.forEach((t) => tickers.add(t.replace(/[()]/g, "")));
  }

  // Match known company names
  const lowerTitle = title.toLowerCase();
  for (const [name, ticker] of Object.entries(KNOWN_TICKERS)) {
    if (lowerTitle.includes(name)) {
      tickers.add(ticker);
    }
  }

  return Array.from(tickers).slice(0, 10);
}

// ─── Extract real source from Google News ─────────────────────────────────

function extractRealSource(item: any, feedSource: string): string {
  // For non-Google feeds, use the feed source directly
  if (feedSource !== "Google News" && !feedSource.includes("via Google")) {
    return feedSource;
  }
  // Google News includes the real source in the <source> tag or at the end of the title
  if (item.creator) return item.creator;
  if (item["source"] && typeof item["source"] === "string") return item["source"];

  // Google News titles often end with " - Source Name"
  const title = item.title || "";
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0) {
    return title.substring(dashIdx + 3).trim();
  }
  return feedSource;
}

function cleanTitle(title: string, feedSource: string): string {
  // Only strip " - Source Name" suffix for Google News titles
  if (feedSource === "Google News" || feedSource.includes("via Google")) {
    const dashIdx = title.lastIndexOf(" - ");
    if (dashIdx > 0) {
      return title.substring(0, dashIdx).trim();
    }
  }
  return title.trim();
}

// ─── Extract summary from HTML description ────────────────────────────────

function extractSummary(description: string | undefined): string {
  if (!description) return "";
  // Strip HTML tags
  let text = description.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Limit to ~250 chars for summary
  if (text.length > 250) {
    text = text.substring(0, 247) + "...";
  }
  return text;
}

// ─── URL hash ─────────────────────────────────────────────────────────────

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").substring(0, 64);
}

// ─── Fetch a single feed ──────────────────────────────────────────────────

async function fetchFeed(config: FeedConfig): Promise<InsertNewsArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);
    const articles: InsertNewsArticle[] = [];

    for (const item of feed.items || []) {
      if (!item.title || !item.link) continue;

      const realSource = extractRealSource(item, config.source);
      const title = cleanTitle(item.title, config.source);
      const summary = extractSummary(item.contentSnippet || item.content || item.summary || "");
      const tickers = extractTickers(item.title + " " + (item.contentSnippet || ""));
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

      articles.push({
        title,
        summary: summary || null,
        url: item.link,
        source: realSource,
        category: config.category,
        tickers: tickers.length > 0 ? tickers.join(",") : null,
        publishedAt,
        urlHash: hashUrl(item.link),
        articleType: config.articleType,
      });
    }

    console.log(`[NewsService] Fetched ${articles.length} ${config.articleType} articles from ${config.source} (${config.category})`);
    return articles;
  } catch (error) {
    console.error(`[NewsService] Error fetching ${config.source} (${config.category}):`, error);
    return [];
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────

export async function scrapeAllNews(): Promise<number> {
  console.log("[NewsService] Starting news + blog scrape...");
  const allArticles: InsertNewsArticle[] = [];

  // Fetch feeds sequentially to avoid overwhelming servers
  for (const feedConfig of RSS_FEEDS) {
    const articles = await fetchFeed(feedConfig);
    allArticles.push(...articles);
    // Small delay between feeds
    await new Promise((r) => setTimeout(r, 300));
  }

  if (allArticles.length === 0) {
    console.log("[NewsService] No articles fetched");
    return 0;
  }

  const inserted = await insertNewsArticles(allArticles);
  console.log(`[NewsService] Scrape complete: ${inserted} articles processed (${allArticles.length} total fetched)`);
  return inserted;
}

// ─── Cleanup old articles (>90 days) ──────────────────────────────────────

export async function cleanupOldArticles(): Promise<number> {
  try {
    const deleted = await deleteOldArticles(90);
    if (deleted > 0) {
      console.log(`[NewsService] Cleaned up ${deleted} articles older than 90 days`);
    }
    return deleted;
  } catch (error) {
    console.error("[NewsService] Cleanup failed:", error);
    return 0;
  }
}

// ─── Schedule scraping 3x daily ───────────────────────────────────────────

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;
let cleanupTask: ReturnType<typeof cron.schedule> | null = null;

export function startNewsScheduler() {
  // Guard against duplicate registration
  if (scheduledTask) {
    console.log("[NewsService] Scheduler already running, skipping");
    return;
  }
  // Schedule at 7:00, 13:00, 19:00 UTC (morning, afternoon, evening)
  scheduledTask = cron.schedule("0 7,13,19 * * *", async () => {
    try {
      await scrapeAllNews();
      // Run sentiment analysis on newly scraped articles
      await analyzeUnprocessedArticles();
    } catch (error) {
      console.error("[NewsService] Scheduled scrape failed:", error);
    }
  });

  // Schedule cleanup once daily at 3:00 UTC
  cleanupTask = cron.schedule("0 3 * * *", async () => {
    try {
      await cleanupOldArticles();
    } catch (error) {
      console.error("[NewsService] Scheduled cleanup failed:", error);
    }
  });

  console.log("[NewsService] Scheduler started (scrape: 7:00, 13:00, 19:00 UTC | cleanup: 3:00 UTC)");

  // Also run an initial scrape on startup (delayed by 5 seconds)
  setTimeout(async () => {
    try {
      await scrapeAllNews();
      // Run sentiment analysis after initial scrape
      await analyzeUnprocessedArticles();
      // Also run cleanup on startup
      await cleanupOldArticles();
    } catch (error) {
      console.error("[NewsService] Initial scrape failed:", error);
    }
  }, 5000);
}

export function stopNewsScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
  }
  console.log("[NewsService] Scheduler stopped");
}

// ─── Query functions (used by tRPC routes) ────────────────────────────────

export async function queryNews(opts: {
  source?: string;
  ticker?: string;
  category?: string;
  search?: string;
  sentiment?: string;
  articleType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const limit = opts.pageSize || 50;
  const offset = ((opts.page || 1) - 1) * limit;

  return getNewsArticles({
    source: opts.source,
    ticker: opts.ticker,
    category: opts.category,
    search: opts.search,
    sentiment: opts.sentiment,
    articleType: opts.articleType as "news" | "blog" | undefined,
    dateFrom: opts.dateFrom ? new Date(opts.dateFrom) : undefined,
    dateTo: opts.dateTo ? new Date(opts.dateTo) : undefined,
    limit,
    offset,
  });
}

export async function queryNewsSources() {
  return getNewsSources();
}

export async function queryNewsCategories() {
  return getNewsCategories();
}
