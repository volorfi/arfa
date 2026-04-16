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
