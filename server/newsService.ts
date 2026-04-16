import crypto from "crypto";
import Parser from "rss-parser";
import cron from "node-cron";
import { insertNewsArticles, getNewsArticles, getNewsSources, getNewsCategories } from "./db";
import type { InsertNewsArticle } from "../drizzle/schema";

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
}

const RSS_FEEDS: FeedConfig[] = [
  // Google News - Business / Finance
  {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Business",
  },
  // Google News - Stock Market search
  {
    url: "https://news.google.com/rss/search?q=stock+market&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Markets",
  },
  // Google News - Economy
  {
    url: "https://news.google.com/rss/search?q=economy+finance&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Economy",
  },
  // Google News - Earnings
  {
    url: "https://news.google.com/rss/search?q=earnings+report+quarterly&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Earnings",
  },
  // Google News - Bonds & Fixed Income
  {
    url: "https://news.google.com/rss/search?q=bonds+fixed+income+treasury&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Fixed Income",
  },
  // Google News - Commodities
  {
    url: "https://news.google.com/rss/search?q=oil+gold+commodities+prices&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Commodities",
  },
  // Google News - IPO
  {
    url: "https://news.google.com/rss/search?q=IPO+initial+public+offering&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "IPO",
  },
  // Google News - Crypto
  {
    url: "https://news.google.com/rss/search?q=cryptocurrency+bitcoin+ethereum&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    category: "Crypto",
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

function extractRealSource(item: any): string {
  // Google News includes the real source in the <source> tag or at the end of the title
  if (item.creator) return item.creator;
  if (item["source"] && typeof item["source"] === "string") return item["source"];

  // Google News titles often end with " - Source Name"
  const title = item.title || "";
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0) {
    return title.substring(dashIdx + 3).trim();
  }
  return "Google News";
}

function cleanTitle(title: string): string {
  // Remove " - Source Name" suffix from Google News titles
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0) {
    return title.substring(0, dashIdx).trim();
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
  // Limit to ~200 chars for summary
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

      const realSource = extractRealSource(item);
      const title = cleanTitle(item.title);
      const summary = extractSummary(item.contentSnippet || item.content || item.summary || "");
      const tickers = extractTickers(item.title);
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
      });
    }

    console.log(`[NewsService] Fetched ${articles.length} articles from ${config.source} (${config.category})`);
    return articles;
  } catch (error) {
    console.error(`[NewsService] Error fetching ${config.source} (${config.category}):`, error);
    return [];
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────

export async function scrapeAllNews(): Promise<number> {
  console.log("[NewsService] Starting news scrape...");
  const allArticles: InsertNewsArticle[] = [];

  // Fetch feeds sequentially to avoid overwhelming servers
  for (const feedConfig of RSS_FEEDS) {
    const articles = await fetchFeed(feedConfig);
    allArticles.push(...articles);
    // Small delay between feeds
    await new Promise((r) => setTimeout(r, 500));
  }

  if (allArticles.length === 0) {
    console.log("[NewsService] No articles fetched");
    return 0;
  }

  const inserted = await insertNewsArticles(allArticles);
  console.log(`[NewsService] Scrape complete: ${inserted} articles processed (${allArticles.length} total fetched)`);
  return inserted;
}

// ─── Schedule scraping 3x daily ───────────────────────────────────────────

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

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
    } catch (error) {
      console.error("[NewsService] Scheduled scrape failed:", error);
    }
  });

  console.log("[NewsService] Scheduler started (7:00, 13:00, 19:00 UTC)");

  // Also run an initial scrape on startup (delayed by 5 seconds)
  setTimeout(async () => {
    try {
      await scrapeAllNews();
    } catch (error) {
      console.error("[NewsService] Initial scrape failed:", error);
    }
  }, 5000);
}

export function stopNewsScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[NewsService] Scheduler stopped");
  }
}

// ─── Query functions (used by tRPC routes) ────────────────────────────────

export async function queryNews(opts: {
  source?: string;
  ticker?: string;
  category?: string;
  search?: string;
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
