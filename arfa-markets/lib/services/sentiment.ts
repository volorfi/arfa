import { prisma } from "@/lib/prisma";

/**
 * Sentiment service — aggregate sentiment stats over `NewsArticle`.
 *
 * The full LLM-driven tagger that populates `sentiment` on new rows
 * lives outside this module (it belongs in a cron worker that calls
 * the LLM provider; not yet built). What stays here is the read side:
 * summaries + per-ticker counts the dashboard renders.
 */

export interface SentimentStats {
  ticker: string | null;
  /** Total articles with a non-null sentiment score. */
  analysed: number;
  /** Total rows regardless of analysis state. */
  total: number;
  /** Mean sentiment across analysed rows (−1 … 1), or null if zero. */
  averageSentiment: number | null;
  /** Histogram buckets over the analysed rows. */
  bullish: number;
  neutral: number;
  bearish: number;
}

const NEUTRAL_THRESHOLD = 0.25;

export async function getSentimentStats(ticker?: string): Promise<SentimentStats> {
  const where = ticker ? { ticker: ticker.toUpperCase() } : {};

  // Fan out the three required aggregations in one round-trip.
  const [total, rows, agg] = await Promise.all([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where: { ...where, sentiment: { not: null } },
      select: { sentiment: true },
    }),
    prisma.newsArticle.aggregate({
      where: { ...where, sentiment: { not: null } },
      _avg: { sentiment: true },
    }),
  ]);

  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  for (const r of rows) {
    const s = r.sentiment ?? 0;
    if (s >= NEUTRAL_THRESHOLD) bullish++;
    else if (s <= -NEUTRAL_THRESHOLD) bearish++;
    else neutral++;
  }

  return {
    ticker: ticker?.toUpperCase() ?? null,
    analysed: rows.length,
    total,
    averageSentiment: agg._avg.sentiment ?? null,
    bullish,
    neutral,
    bearish,
  };
}

/** Placeholder entry point used to match the legacy signature. The
 *  real analysis loop belongs in a cron worker that reads
 *  `prisma.newsArticle.findMany({ where: { sentiment: null } })`
 *  and fills in the score via the LLM provider. */
export async function analyzeUnprocessedArticles(): Promise<number> {
  // eslint-disable-next-line no-console
  console.warn(
    "[sentiment] analyzeUnprocessedArticles() is a no-op here; wire it to a Railway cron worker.",
  );
  return 0;
}
