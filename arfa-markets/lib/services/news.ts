import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * News service — queries + basic CRUD for the `NewsArticle` table.
 *
 * The legacy /server/newsService.ts additionally scraped articles
 * (Google News, Seeking Alpha, etc.) and ran a sentiment pass. Those
 * scheduled jobs live outside this module — wire them as a Railway
 * cron worker that calls `upsertArticles()` and the sentiment pipeline
 * on a schedule.
 */

export interface QueryNewsOptions {
  ticker?: string;
  source?: string;
  search?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  dateFrom?: string; // ISO date string
  dateTo?: string;
  page?: number; // 1-indexed
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Map the string-sentiment filter to bounds on our signed float
 *  column. Sentiment is -1.0 … 1.0; NULL = not yet analysed. */
function sentimentBounds(
  s: QueryNewsOptions["sentiment"],
): Prisma.FloatFilter | undefined {
  if (!s) return undefined;
  if (s === "bullish") return { gte: 0.25 };
  if (s === "bearish") return { lte: -0.25 };
  // neutral window ≈ [-0.25, 0.25]
  return { gte: -0.25, lte: 0.25 };
}

export async function queryNews(opts: QueryNewsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.NewsArticleWhereInput = {};

  if (opts.ticker) where.ticker = opts.ticker.toUpperCase();
  if (opts.source) where.source = opts.source;
  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { summary: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const bounds = sentimentBounds(opts.sentiment);
  if (bounds) where.sentiment = bounds;

  if (opts.dateFrom || opts.dateTo) {
    where.publishedAt = {
      ...(opts.dateFrom ? { gte: new Date(opts.dateFrom) } : {}),
      ...(opts.dateTo ? { lte: new Date(opts.dateTo) } : {}),
    };
  }

  const [articles, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.newsArticle.count({ where }),
  ]);

  return { articles, total, page, pageSize };
}

export async function queryNewsSources(): Promise<string[]> {
  const rows = await prisma.newsArticle.findMany({
    where: { source: { not: null } },
    select: { source: true },
    distinct: ["source"],
    orderBy: { source: "asc" },
  });
  return rows
    .map((r) => r.source)
    .filter((s): s is string => typeof s === "string");
}

/** The current schema doesn't model a dedicated category column — kept
 *  here as an endpoint so the UI doesn't 404. Returns an empty list
 *  until a category column lands. */
export async function queryNewsCategories(): Promise<string[]> {
  return [];
}

/** Upsert a batch of scraped articles. Idempotent via the URL unique
 *  index: re-running the same scrape doesn't duplicate rows. */
export async function upsertArticles(
  articles: Array<
    Omit<Prisma.NewsArticleCreateInput, "id" | "createdAt" | "sentiment"> & {
      sentiment?: number | null;
    }
  >,
): Promise<number> {
  let count = 0;
  for (const article of articles) {
    await prisma.newsArticle.upsert({
      where: { url: article.url },
      update: {}, // keep existing rows untouched; sentiment updates go
      // through analyzeUnprocessedArticles in sentiment.ts
      create: article,
    });
    count++;
  }
  return count;
}

/** Remove articles older than `daysOld` (default 90). Uses `publishedAt`
 *  when present; falls back to `createdAt` so orphan rows don't linger. */
export async function cleanupOldArticles(daysOld = 90): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await prisma.newsArticle.deleteMany({
    where: {
      OR: [
        { publishedAt: { lt: cutoff } },
        { AND: [{ publishedAt: null }, { createdAt: { lt: cutoff } }] },
      ],
    },
  });
  return result.count;
}

/** Placeholder entry-point preserved for API-route parity. The real
 *  implementation lives in a cron worker (not yet built). */
export async function scrapeAllNews(): Promise<number> {
  // eslint-disable-next-line no-console
  console.warn(
    "[news] scrapeAllNews() is a no-op here; wire it to a Railway cron worker.",
  );
  return 0;
}
