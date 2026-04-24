import { getDb } from "./db";
import { externalResearch, externalPodcasts, InsertExternalResearch, InsertExternalPodcast } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { asc, desc, eq, like, or, sql, and, lte, gte } from "drizzle-orm";
import crypto from "crypto";

// ─── HTML Parsing Helpers ───

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 64);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[…\]/g, "…")
    .replace(/\[\.\.\.\]/g, "…");
}

function parseMonthYear(dateStr: string): Date {
  // "April 2026" -> Date
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 2) {
    const month = months[parts[0]];
    const year = parseInt(parts[1]);
    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 15); // mid-month as approximate
    }
  }
  return new Date(); // fallback
}

// ─── Research Parser ───

interface RawResearchItem {
  title: string;
  firm: string | null;
  author: string | null;
  category: string | null;
  contentType: string | null;
  pages: string | null;
  description: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  date: string;
}

function parseResearchHtml(html: string): RawResearchItem[] {
  const items: RawResearchItem[] = [];

  // Split by filtered-post-item container divs
  const blocks = html.split(/<div\s+class="filtered-post-item">/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Title
    const titleMatch = block.match(/class="filtered-post-item__title"[^>]*>([\s\S]*?)<\/(?:div|h\d|span|p)/);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]*>/g, "").trim()) : "";
    if (!title) continue;

    // Source URL - from read-more link or any theideafarm.com link
    let sourceUrl = "";
    const readMoreMatch = block.match(/class="filtered-post-item__read-more"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/);
    if (readMoreMatch) {
      sourceUrl = readMoreMatch[1];
    } else {
      const linkMatch = block.match(/<a[^>]*href="(https:\/\/theideafarm\.com\/[^"]+)"/i);
      if (linkMatch) sourceUrl = linkMatch[1];
    }
    if (!sourceUrl) continue;

    // Subtitle/description
    const subMatch = block.match(/class="filtered-post-item__subtitle"[^>]*>([\s\S]*?)<\/(?:div|p)/);
    const description = subMatch ? decodeHtmlEntities(subMatch[1].replace(/<[^>]*>/g, "").trim()) : null;

    // Firm
    const firmMatch = block.match(/class="filtered-post-item__firm"[^>]*>([\s\S]*?)<\/(?:div|span)/);
    const firm = firmMatch ? decodeHtmlEntities(firmMatch[1].replace(/<[^>]*>/g, "").trim()) : null;

    // Author
    const authorMatch = block.match(/class="filtered-post-item__author"[^>]*>([\s\S]*?)<\/(?:div|span)/);
    const author = authorMatch ? decodeHtmlEntities(authorMatch[1].replace(/<[^>]*>/g, "").trim()) : null;

    // Date
    const dateMatch = block.match(/class="filtered-post-item__date"[^>]*>([\s\S]*?)<\/(?:div|span)/);
    const date = dateMatch ? decodeHtmlEntities(dateMatch[1].replace(/<[^>]*>/g, "").trim()) : "";

    // Content type (Research, Article, etc.)
    const typeMatch = block.match(/class="filtered-post-item__type"[^>]*>([\s\S]*?)<\/(?:div|span)/);
    const contentType = typeMatch ? decodeHtmlEntities(typeMatch[1].replace(/<[^>]*>/g, "").trim()) : null;

    // Image
    const imgMatch = block.match(/class="filtered-post-item__image"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // Pages - extract from top-info or content area
    const topInfoMatch = block.match(/class="filtered-post-item__top-info"[^>]*>([\s\S]*?)<\/div/);
    let pages: string | null = null;
    let category: string | null = null;
    if (topInfoMatch) {
      const topText = topInfoMatch[1].replace(/<[^>]*>/g, " ").trim();
      const pagesMatch = topText.match(/(\d+)\s*Pages/i);
      if (pagesMatch) pages = `${pagesMatch[1]} Pages`;
    }

    // Category from URL path
    const catFromUrl = sourceUrl.match(/theideafarm\.com\/([^\/]+)\//i);
    if (catFromUrl && catFromUrl[1] !== "research") {
      category = catFromUrl[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    items.push({ title, firm, author, category, contentType, pages, description, sourceUrl, imageUrl, date });
  }

  return items;
}

// ─── Podcast Parser ───

interface RawPodcastItem {
  title: string;
  category: string | null;
  duration: string | null;
  description: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  date: string;
}

function parsePodcastHtml(html: string): RawPodcastItem[] {
  const items: RawPodcastItem[] = [];

  // Split by filtered-post-item container divs (same structure as research)
  const blocks = html.split(/<div\s+class="filtered-post-item">/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Title
    const titleMatch = block.match(/class="filtered-post-item__title"[^>]*>([\s\S]*?)<\/(?:div|h\d|span|p)/);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]*>/g, "").trim()) : "";
    if (!title) continue;

    // Source URL
    let sourceUrl = "";
    const readMoreMatch = block.match(/class="filtered-post-item__read-more"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/);
    if (readMoreMatch) {
      sourceUrl = readMoreMatch[1];
    } else {
      const linkMatch = block.match(/<a[^>]*href="(https:\/\/theideafarm\.com\/[^"]+)"/i);
      if (linkMatch) sourceUrl = linkMatch[1];
    }
    if (!sourceUrl) continue;

    // Description
    const subMatch = block.match(/class="filtered-post-item__subtitle"[^>]*>([\s\S]*?)<\/(?:div|p)/);
    const description = subMatch ? decodeHtmlEntities(subMatch[1].replace(/<[^>]*>/g, "").trim()) : null;

    // Date
    const dateFieldMatch = block.match(/class="filtered-post-item__date"[^>]*>([\s\S]*?)<\/(?:div|span)/);
    const date = dateFieldMatch ? decodeHtmlEntities(dateFieldMatch[1].replace(/<[^>]*>/g, "").trim()) : "";

    // Image
    const imgMatch = block.match(/class="filtered-post-item__image"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // Category from post-taxonomies span (e.g., "Miscellaneous", "Asset Allocation")
    let category: string | null = null;
    const taxMatch = block.match(/class="post-taxonomies"[^>]*>\s*<span>(.*?)<\/span>/i);
    if (taxMatch) {
      category = decodeHtmlEntities(taxMatch[1].trim());
    }
    // Fallback: category from URL path
    if (!category) {
      const catFromUrl = sourceUrl.match(/theideafarm\.com\/([^\/]+)\//i);
      if (catFromUrl && catFromUrl[1] !== "podcast" && catFromUrl[1] !== "curated-podcasts") {
        category = catFromUrl[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    // Duration from metadata text
    const metaText = block.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const durationMatch = metaText.match(/(\d+)\s*(?:minutes|min)/i);
    const duration = durationMatch ? `${durationMatch[1]} min` : null;

    items.push({ title, category, duration, description, sourceUrl, imageUrl, date });
  }

  return items;
}

// ─── Ticker Extraction & Sentiment via LLM ───

interface TickerSentiment {
  tickers: string[];
  sentiment: "bullish" | "bearish" | "neutral";
}

async function analyzeTickersAndSentiment(items: { title: string; description: string | null }[]): Promise<TickerSentiment[]> {
  if (items.length === 0) return [];

  // Batch items for efficiency (max 20 per LLM call)
  const results: TickerSentiment[] = [];
  const batchSize = 20;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const prompt = batch.map((item, idx) =>
      `[${idx}] Title: "${item.title}"\nDescription: "${item.description || "N/A"}"`
    ).join("\n\n");

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a financial analyst. For each research article or podcast, extract:
1. US stock tickers mentioned or strongly implied (e.g. if "Apple" is mentioned, return "AAPL"). Only return valid US stock/ETF tickers. Do NOT return indices like ^SPX.
2. Overall market sentiment: "bullish", "bearish", or "neutral".

Return JSON array with objects: { "index": number, "tickers": string[], "sentiment": "bullish"|"bearish"|"neutral" }
Only include tickers for US-listed stocks and ETFs. If no specific tickers, return empty array.`
          },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ticker_sentiment",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      tickers: { type: "array", items: { type: "string" } },
                      sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] }
                    },
                    required: ["index", "tickers", "sentiment"],
                    additionalProperties: false
                  }
                }
              },
              required: ["items"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === "string") {
        const parsed = JSON.parse(content);
        const batchResults = new Map<number, TickerSentiment>();
        for (const item of parsed.items) {
          batchResults.set(item.index, { tickers: item.tickers, sentiment: item.sentiment });
        }
        for (let j = 0; j < batch.length; j++) {
          results.push(batchResults.get(j) || { tickers: [], sentiment: "neutral" });
        }
      } else {
        // Fallback
        for (const _ of batch) {
          results.push({ tickers: [], sentiment: "neutral" });
        }
      }
    } catch (err) {
      console.error("[IdeaFarm] LLM analysis failed:", err);
      for (const _ of batch) {
        results.push({ tickers: [], sentiment: "neutral" });
      }
    }
  }

  return results;
}

// ─── Fetch & Store ───

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ARFABot/1.0; +https://arfa.markets)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

// Extract direct source link from a detail page
async function extractOriginalSourceUrl(detailUrl: string, type: "research" | "podcast"): Promise<string | null> {
  try {
    const html = await fetchPage(detailUrl);
    if (type === "research") {
      // Social/share URLs to skip
      const skipPatterns = [
        /twitter\.com/i, /x\.com\/intent/i, /facebook\.com/i, /linkedin\.com\/sharing/i,
        /instagram\.com/i, /pinterest\.com/i, /reddit\.com/i, /mailto:/i,
        /open\.spotify\.com\/playlist/i, /youtube\.com\/channel/i, /youtube\.com\/c\//i,
        /themebfabershow\.com/i, /theideafarm\.com/i,
      ];
      const isSkipUrl = (url: string) => skipPatterns.some(p => p.test(url));

      // 1. Look for VIEW FULL REPORT button (Elementor-style: <a href="..."><span>VIEW FULL REPORT</span></a>)
      const vfrIdx = html.search(/VIEW\s+FULL\s+REPORT/i);
      if (vfrIdx > -1) {
        // Search backwards from VIEW FULL REPORT for the enclosing <a> tag
        const before = html.substring(Math.max(0, vfrIdx - 2000), vfrIdx);
        const aTagMatches = Array.from(before.matchAll(/<a[^>]*href="([^"]+)"[^>]*/gi));
        if (aTagMatches.length > 0) {
          const href = aTagMatches[aTagMatches.length - 1][1]; // closest <a> before the text
          if (href && !isSkipUrl(href) && href !== '#content') return href;
        }
      }

      // 2. Look for PDF links (external)
      const pdfMatches = Array.from(html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+\.pdf[^"]*)"[^>]*/gi));
      for (const m of pdfMatches) {
        if (!isSkipUrl(m[1])) return m[1];
      }

      // 3. Look for external target="_blank" links, skipping social/share links
      const extMatches = Array.from(html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*/gi));
      for (const m of extMatches) {
        if (!isSkipUrl(m[1])) return m[1];
      }
      // Also try href after target
      const extMatches2 = Array.from(html.matchAll(/<a[^>]*target="_blank"[^>]*href="(https?:\/\/[^"]+)"[^>]*/gi));
      for (const m of extMatches2) {
        if (!isSkipUrl(m[1])) return m[1];
      }
    } else {
      // For podcasts, use extractPodcastPlatformUrls instead
      const platforms = await extractPodcastPlatformUrls(detailUrl, html);
      return platforms.apple || platforms.spotify || platforms.youtube || null;
    }
    return null;
  } catch (err) {
    console.warn(`[IdeaFarm] Failed to extract source from ${detailUrl}:`, (err as Error).message?.slice(0, 80));
    return null;
  }
}

// Extract all platform-specific URLs from a podcast detail page
interface PodcastPlatformUrls {
  apple: string | null;
  spotify: string | null;
  youtube: string | null;
}

async function extractPodcastPlatformUrls(detailUrl: string, html?: string): Promise<PodcastPlatformUrls> {
  try {
    if (!html) html = await fetchPage(detailUrl);
    const apple = html.match(/<a[^>]*href="(https?:\/\/podcasts\.apple\.com[^"]+)"/i)?.[1] || null;
    const spotify = (
      html.match(/<a[^>]*href="(https?:\/\/open\.spotify\.com\/(?:episode|show)[^"]+)"/i)?.[1]
    ) || null;
    const youtube = (
      html.match(/<a[^>]*href="(https?:\/\/(?:www\.)?youtube\.com\/watch[^"]+)"/i)?.[1]
      || html.match(/<a[^>]*href="(https?:\/\/youtu\.be\/[^"]+)"/i)?.[1]
    ) || null;
    return { apple, spotify, youtube };
  } catch (err) {
    console.warn(`[IdeaFarm] Failed to extract platform URLs from ${detailUrl}:`, (err as Error).message?.slice(0, 80));
    return { apple: null, spotify: null, youtube: null };
  }
}

// Batch extract platform URLs for podcasts
async function batchExtractPodcastPlatformUrls(
  items: { sourceUrl: string }[]
): Promise<PodcastPlatformUrls[]> {
  const results: PodcastPlatformUrls[] = [];
  for (const item of items) {
    const urls = await extractPodcastPlatformUrls(item.sourceUrl);
    results.push(urls);
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

// Batch extract original source URLs with rate limiting
async function batchExtractSourceUrls(
  items: { sourceUrl: string }[],
  type: "research" | "podcast"
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  for (const item of items) {
    const url = await extractOriginalSourceUrl(item.sourceUrl, type);
    results.push(url);
    // Small delay to be polite to the server
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

export async function scrapeResearch(maxPages: number = 3): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let totalInserted = 0;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? "https://theideafarm.com/research/"
      : `https://theideafarm.com/research/page/${page}/`;

    try {
      console.log(`[IdeaFarm] Fetching research page ${page}...`);
      const html = await fetchPage(url);
      const items = parseResearchHtml(html);

      if (items.length === 0) break;

      // Filter to last month
      const recentItems = items.filter(item => {
        if (!item.date) return true; // include if no date
        const d = parseMonthYear(item.date);
        return d >= oneMonthAgo;
      });

      if (recentItems.length === 0) break; // all items are older, stop

      // Extract original source URLs from detail pages
      console.log(`[IdeaFarm] Extracting original source URLs for ${recentItems.length} research items...`);
      const originalUrls = await batchExtractSourceUrls(recentItems, "research");

      // Analyze tickers and sentiment
      const analysis = await analyzeTickersAndSentiment(
        recentItems.map(i => ({ title: i.title, description: i.description }))
      );

      // Insert into DB
      for (let i = 0; i < recentItems.length; i++) {
        const item = recentItems[i];
        const ts = analysis[i] || { tickers: [], sentiment: "neutral" as const };

        const record: InsertExternalResearch = {
          title: item.title,
          firm: item.firm,
          author: item.author,
          category: item.category,
          contentType: item.contentType,
          pages: item.pages,
          description: item.description,
          sourceUrl: item.sourceUrl,
          originalSourceUrl: originalUrls[i] || null,
          urlHash: hashUrl(item.sourceUrl),
          imageUrl: item.imageUrl,
          tickers: ts.tickers.length > 0 ? ts.tickers.join(",") : null,
          sentiment: ts.sentiment,
          sortOrder: Math.floor(Math.random() * 1000000),
          publishedAt: parseMonthYear(item.date),
        };

        try {
          await db.insert(externalResearch).values(record).onDuplicateKeyUpdate({
            set: { title: record.title, description: record.description, originalSourceUrl: record.originalSourceUrl },
          });
          totalInserted++;
        } catch (e: any) {
          console.warn(`[IdeaFarm] Skip research: ${e.message?.slice(0, 80)}`);
        }
      }

      // If fewer items than expected, probably last page
      if (items.length < 10) break;
    } catch (err) {
      console.error(`[IdeaFarm] Error fetching research page ${page}:`, err);
      break;
    }
  }

  console.log(`[IdeaFarm] Inserted ${totalInserted} research items`);
  return totalInserted;
}

export async function scrapePodcasts(maxPages: number = 3): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let totalInserted = 0;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? "https://theideafarm.com/curated-podcasts/"
      : `https://theideafarm.com/curated-podcasts/page/${page}/`;

    try {
      console.log(`[IdeaFarm] Fetching podcasts page ${page}...`);
      const html = await fetchPage(url);
      const items = parsePodcastHtml(html);

      if (items.length === 0) break;

      // Podcasts don't have date fields on theideafarm.com, so we take all from page 1 only
      // and limit total to ~200 most recent
      const recentItems = items.filter(item => {
        if (!item.date) return true; // no date = assume recent
        const d = parseMonthYear(item.date);
        return d >= oneMonthAgo;
      }).slice(0, 200);

      if (recentItems.length === 0) break;

      // Extract platform-specific URLs from detail pages
      console.log(`[IdeaFarm] Extracting platform URLs for ${recentItems.length} podcast items...`);
      const platformUrls = await batchExtractPodcastPlatformUrls(recentItems);

      const analysis = await analyzeTickersAndSentiment(
        recentItems.map(i => ({ title: i.title, description: i.description }))
      );

      for (let i = 0; i < recentItems.length; i++) {
        const item = recentItems[i];
        const ts = analysis[i] || { tickers: [], sentiment: "neutral" as const };
        const platforms = platformUrls[i] || { apple: null, spotify: null, youtube: null };

        const record: InsertExternalPodcast = {
          title: item.title,
          category: item.category,
          duration: item.duration,
          description: item.description,
          sourceUrl: item.sourceUrl,
          originalSourceUrl: platforms.apple || platforms.spotify || platforms.youtube || null,
          applePodcastsUrl: platforms.apple,
          spotifyUrl: platforms.spotify,
          youtubeUrl: platforms.youtube,
          urlHash: hashUrl(item.sourceUrl),
          imageUrl: item.imageUrl,
          tickers: ts.tickers.length > 0 ? ts.tickers.join(",") : null,
          sentiment: ts.sentiment,
          sortOrder: Math.floor(Math.random() * 1000000),
          publishedAt: parseMonthYear(item.date),
        };

        try {
          await db.insert(externalPodcasts).values(record).onDuplicateKeyUpdate({
            set: {
              title: record.title,
              category: record.category,
              description: record.description,
              originalSourceUrl: record.originalSourceUrl,
              applePodcastsUrl: record.applePodcastsUrl,
              spotifyUrl: record.spotifyUrl,
              youtubeUrl: record.youtubeUrl,
            },
          });
          totalInserted++;
        } catch (e: any) {
          console.warn(`[IdeaFarm] Skip podcast: ${e.message?.slice(0, 80)}`);
        }
      }

      if (items.length < 10) break;
    } catch (err) {
      console.error(`[IdeaFarm] Error fetching podcasts page ${page}:`, err);
      break;
    }
  }

  console.log(`[IdeaFarm] Inserted ${totalInserted} podcast items`);
  return totalInserted;
}

// ─── Cleanup: delete entries older than 3 months ───

export async function cleanupOldEntries(): Promise<{ research: number; podcasts: number }> {
  const db = await getDb();
  if (!db) return { research: 0, podcasts: 0 };

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);

  const r1 = await db.delete(externalResearch).where(lte(externalResearch.publishedAt, cutoff));
  const r2 = await db.delete(externalPodcasts).where(lte(externalPodcasts.publishedAt, cutoff));

  const researchDeleted = (r1 as any)[0]?.affectedRows ?? 0;
  const podcastsDeleted = (r2 as any)[0]?.affectedRows ?? 0;

  console.log(`[IdeaFarm] Cleanup: deleted ${researchDeleted} research, ${podcastsDeleted} podcasts older than 3 months`);
  return { research: researchDeleted, podcasts: podcastsDeleted };
}

// ─── Full scrape + cleanup ───

export async function runFullScrape(): Promise<{ research: number; podcasts: number; cleaned: { research: number; podcasts: number } }> {
  const research = await scrapeResearch(5);
  const podcasts = await scrapePodcasts(1); // podcasts have no date field, limit to 1 page (~latest items)
  const cleaned = await cleanupOldEntries();
  return { research, podcasts, cleaned };
}

// ─── Query Helpers ───

export async function getExternalResearch(opts: {
  category?: string;
  firm?: string;
  ticker?: string;
  sentiment?: string;
  search?: string;
  limit?: number;
  offset?: number;
  randomize?: boolean;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.category) conditions.push(eq(externalResearch.category, opts.category));
  if (opts.firm) conditions.push(eq(externalResearch.firm, opts.firm));
  if (opts.ticker) {
    const t = opts.ticker.toUpperCase();
    conditions.push(
      or(
        eq(externalResearch.tickers, t),
        like(externalResearch.tickers, `${t},%`),
        like(externalResearch.tickers, `%,${t},%`),
        like(externalResearch.tickers, `%,${t}`)
      )
    );
  }
  if (opts.sentiment && ["bullish", "bearish", "neutral"].includes(opts.sentiment)) {
    conditions.push(sql`${externalResearch.sentiment} = ${opts.sentiment}`);
  }
  if (opts.search) {
    const s = opts.search.trim();
    if (s) {
      conditions.push(
        or(
          sql`LOWER(${externalResearch.title}) LIKE LOWER(${`%${s}%`})`,
          sql`LOWER(${externalResearch.description}) LIKE LOWER(${`%${s}%`})`,
          sql`LOWER(${externalResearch.firm}) LIKE LOWER(${`%${s}%`})`,
          sql`LOWER(${externalResearch.tickers}) LIKE LOWER(${`%${s}%`})`
        )
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  // Stable-random order: sortOrder is assigned at insert time
  const orderBy = asc(externalResearch.sortOrder);

  const [items, countResult] = await Promise.all([
    db.select().from(externalResearch).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(externalResearch).where(where),
  ]);

  return { items, total: (countResult[0]?.count ?? 0) as number };
}

export async function getExternalPodcasts(opts: {
  category?: string;
  ticker?: string;
  search?: string;
  limit?: number;
  offset?: number;
  randomize?: boolean;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.category) conditions.push(eq(externalPodcasts.category, opts.category));
  if (opts.ticker) {
    const t = opts.ticker.toUpperCase();
    conditions.push(
      or(
        eq(externalPodcasts.tickers, t),
        like(externalPodcasts.tickers, `${t},%`),
        like(externalPodcasts.tickers, `%,${t},%`),
        like(externalPodcasts.tickers, `%,${t}`)
      )
    );
  }
  if (opts.search) {
    const s = opts.search.trim();
    if (s) {
      conditions.push(
        or(
          sql`LOWER(${externalPodcasts.title}) LIKE LOWER(${`%${s}%`})`,
          sql`LOWER(${externalPodcasts.description}) LIKE LOWER(${`%${s}%`})`,
          sql`LOWER(${externalPodcasts.tickers}) LIKE LOWER(${`%${s}%`})`
        )
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  // Stable-random order: sortOrder is assigned at insert time
  const orderBy = asc(externalPodcasts.sortOrder);

  const [items, countResult] = await Promise.all([
    db.select().from(externalPodcasts).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(externalPodcasts).where(where),
  ]);

  return { items, total: (countResult[0]?.count ?? 0) as number };
}

export async function getResearchFirms(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ firm: externalResearch.firm }).from(externalResearch).orderBy(externalResearch.firm);
  return result.filter(r => r.firm).map(r => r.firm as string);
}

export async function getResearchCategories(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: externalResearch.category }).from(externalResearch).orderBy(externalResearch.category);
  return result.filter(r => r.category).map(r => r.category as string);
}

export async function getPodcastCategories(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: externalPodcasts.category }).from(externalPodcasts).orderBy(externalPodcasts.category);
  return result.filter(r => r.category).map(r => r.category as string);
}

// ─── Scheduler ──────────────────────────────────────────────────────────

const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY_MS = 30 * 1000; // 30 seconds after server start

export function startIdeafarmScheduler() {
  console.log("[IdeaFarm] Scheduler initialized. First scrape in 30s, then every 24h.");

  // Initial scrape after short delay (to let server fully start)
  setTimeout(async () => {
    try {
      console.log("[IdeaFarm] Running initial scrape...");
      const result = await runFullScrape();
      console.log(`[IdeaFarm] Initial scrape complete: ${result.research} research, ${result.podcasts} podcasts. Cleaned: ${result.cleaned.research} research, ${result.cleaned.podcasts} podcasts.`);
    } catch (err) {
      console.error("[IdeaFarm] Initial scrape failed:", err);
    }
  }, INITIAL_DELAY_MS);

  // Recurring scrape every 24 hours
  setInterval(async () => {
    try {
      console.log("[IdeaFarm] Running scheduled scrape...");
      const result = await runFullScrape();
      console.log(`[IdeaFarm] Scheduled scrape complete: ${result.research} research, ${result.podcasts} podcasts. Cleaned: ${result.cleaned.research} research, ${result.cleaned.podcasts} podcasts.`);
    } catch (err) {
      console.error("[IdeaFarm] Scheduled scrape failed:", err);
    }
  }, SCRAPE_INTERVAL_MS);
}
