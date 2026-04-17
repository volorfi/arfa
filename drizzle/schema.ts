import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 16 }).notNull(),
  companyName: varchar("companyName", { length: 256 }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

export const newsArticles = mysqlTable("news_articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  summary: text("summary"),
  url: varchar("url", { length: 1024 }).notNull(),
  source: varchar("source", { length: 128 }).notNull(),
  category: varchar("category", { length: 128 }),
  tickers: varchar("tickers", { length: 512 }),
  publishedAt: timestamp("publishedAt").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  urlHash: varchar("urlHash", { length: 64 }).notNull().unique(),
  sentiment: mysqlEnum("sentiment", ["bullish", "bearish", "neutral"]),
  articleType: mysqlEnum("articleType", ["news", "blog"]).default("news").notNull(),
});

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;
