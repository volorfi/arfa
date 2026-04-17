import { and, eq, desc, like, gte, lte, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, watchlist, newsArticles, InsertNewsArticle } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Watchlist helpers
export async function getWatchlistByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(watchlist).where(eq(watchlist.userId, userId));
  return result;
}

export async function addToWatchlist(userId: number, symbol: string, companyName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(watchlist).values({ userId, symbol: symbol.toUpperCase(), companyName: companyName || null }).onDuplicateKeyUpdate({ set: { companyName: companyName || null } });
}

export async function removeFromWatchlist(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol.toUpperCase())));
}

export async function isInWatchlist(userId: number, symbol: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol.toUpperCase()))).limit(1);
  return result.length > 0;
}

// News helpers
export async function insertNewsArticles(articles: InsertNewsArticle[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let inserted = 0;
  for (const article of articles) {
    try {
      await db.insert(newsArticles).values(article).onDuplicateKeyUpdate({ set: { title: article.title } });
      inserted++;
    } catch (e) {
      // skip duplicates
    }
  }
  return inserted;
}

export async function getNewsArticles(opts: {
  source?: string;
  ticker?: string;
  category?: string;
  search?: string;
  sentiment?: string;
  articleType?: "news" | "blog";
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { articles: [], total: 0 };

  const conditions = [];
  if (opts.source) conditions.push(eq(newsArticles.source, opts.source));
  if (opts.ticker) {
    const t = opts.ticker.toUpperCase();
    // Match exact ticker in comma-separated list: start, middle, or end
    conditions.push(
      or(
        eq(newsArticles.tickers, t),
        like(newsArticles.tickers, `${t},%`),
        like(newsArticles.tickers, `%,${t},%`),
        like(newsArticles.tickers, `%,${t}`)
      )
    );
  }
  if (opts.category) conditions.push(eq(newsArticles.category, opts.category));
  if (opts.search) conditions.push(or(like(newsArticles.title, `%${opts.search}%`), like(newsArticles.summary, `%${opts.search}%`)));
  if (opts.sentiment && ["bullish", "bearish", "neutral"].includes(opts.sentiment)) {
    conditions.push(sql`${newsArticles.sentiment} = ${opts.sentiment}`);
  }
  if (opts.articleType && ["news", "blog"].includes(opts.articleType)) {
    conditions.push(eq(newsArticles.articleType, opts.articleType));
  }
  if (opts.dateFrom) conditions.push(gte(newsArticles.publishedAt, opts.dateFrom));
  if (opts.dateTo) conditions.push(lte(newsArticles.publishedAt, opts.dateTo));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  const [articles, countResult] = await Promise.all([
    db.select().from(newsArticles).where(where).orderBy(desc(newsArticles.publishedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(newsArticles).where(where),
  ]);

  return { articles, total: (countResult[0]?.count ?? 0) as number };
}

export async function deleteOldArticles(daysOld: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await db.delete(newsArticles).where(lte(newsArticles.publishedAt, cutoff));
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function getSentimentAggregation(opts: {
  articleType?: "news" | "blog";
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) return { byTicker: [], bySource: [], byCategory: [], bySentiment: { bullish: 0, bearish: 0, neutral: 0 } };

  const conditions = [];
  if (opts.articleType) conditions.push(eq(newsArticles.articleType, opts.articleType));
  if (opts.dateFrom) conditions.push(gte(newsArticles.publishedAt, opts.dateFrom));
  if (opts.dateTo) conditions.push(lte(newsArticles.publishedAt, opts.dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Sentiment by ticker (top tickers by mention count)
  const tickerRows = await db
    .select({
      tickers: newsArticles.tickers,
      sentiment: newsArticles.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(newsArticles)
    .where(where ? and(where, sql`${newsArticles.tickers} IS NOT NULL AND ${newsArticles.tickers} != ''`) : sql`${newsArticles.tickers} IS NOT NULL AND ${newsArticles.tickers} != ''`)
    .groupBy(newsArticles.tickers, newsArticles.sentiment);

  // Aggregate tickers
  const tickerMap = new Map<string, { bullish: number; bearish: number; neutral: number; total: number }>();
  for (const row of tickerRows) {
    if (!row.tickers) continue;
    for (const ticker of row.tickers.split(",")) {
      const t = ticker.trim().toUpperCase();
      if (!t) continue;
      if (!tickerMap.has(t)) tickerMap.set(t, { bullish: 0, bearish: 0, neutral: 0, total: 0 });
      const entry = tickerMap.get(t)!;
      const c = Number(row.count);
      if (row.sentiment === "bullish") entry.bullish += c;
      else if (row.sentiment === "bearish") entry.bearish += c;
      else entry.neutral += c;
      entry.total += c;
    }
  }
  const byTicker = Array.from(tickerMap.entries())
    .map(([ticker, stats]) => ({ ticker, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);

  // Sentiment by source
  const sourceRows = await db
    .select({
      source: newsArticles.source,
      sentiment: newsArticles.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(newsArticles)
    .where(where)
    .groupBy(newsArticles.source, newsArticles.sentiment);

  const sourceMap = new Map<string, { bullish: number; bearish: number; neutral: number; total: number }>();
  for (const row of sourceRows) {
    if (!sourceMap.has(row.source)) sourceMap.set(row.source, { bullish: 0, bearish: 0, neutral: 0, total: 0 });
    const entry = sourceMap.get(row.source)!;
    const c = Number(row.count);
    if (row.sentiment === "bullish") entry.bullish += c;
    else if (row.sentiment === "bearish") entry.bearish += c;
    else entry.neutral += c;
    entry.total += c;
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Sentiment by category
  const catRows = await db
    .select({
      category: newsArticles.category,
      sentiment: newsArticles.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(newsArticles)
    .where(where)
    .groupBy(newsArticles.category, newsArticles.sentiment);

  const catMap = new Map<string, { bullish: number; bearish: number; neutral: number; total: number }>();
  for (const row of catRows) {
    const cat = row.category || "Other";
    if (!catMap.has(cat)) catMap.set(cat, { bullish: 0, bearish: 0, neutral: 0, total: 0 });
    const entry = catMap.get(cat)!;
    const c = Number(row.count);
    if (row.sentiment === "bullish") entry.bullish += c;
    else if (row.sentiment === "bearish") entry.bearish += c;
    else entry.neutral += c;
    entry.total += c;
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.total - a.total);

  // Overall sentiment
  const overallRows = await db
    .select({
      sentiment: newsArticles.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(newsArticles)
    .where(where)
    .groupBy(newsArticles.sentiment);

  const bySentiment = { bullish: 0, bearish: 0, neutral: 0 };
  for (const row of overallRows) {
    const c = Number(row.count);
    if (row.sentiment === "bullish") bySentiment.bullish = c;
    else if (row.sentiment === "bearish") bySentiment.bearish = c;
    else if (row.sentiment === "neutral") bySentiment.neutral = c;
  }

  return { byTicker, bySource, byCategory, bySentiment };
}

export async function getNewsSources(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ source: newsArticles.source }).from(newsArticles).orderBy(newsArticles.source);
  return result.map(r => r.source);
}

export async function getNewsCategories(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: newsArticles.category }).from(newsArticles).orderBy(newsArticles.category);
  return result.filter(r => r.category).map(r => r.category as string);
}
