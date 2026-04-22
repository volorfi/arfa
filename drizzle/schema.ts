import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "subscriber", "admin"]).default("user").notNull(),
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

export const externalResearch = mysqlTable("external_research", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  firm: varchar("firm", { length: 256 }),
  author: varchar("author", { length: 256 }),
  category: varchar("category", { length: 128 }),
  contentType: varchar("contentType", { length: 64 }),
  pages: varchar("pages", { length: 32 }),
  description: text("description"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  originalSourceUrl: varchar("originalSourceUrl", { length: 1024 }),
  urlHash: varchar("urlHash", { length: 64 }).notNull().unique(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  tickers: varchar("tickers", { length: 512 }),
  sentiment: mysqlEnum("researchSentiment", ["bullish", "bearish", "neutral"]),
  sortOrder: int("sortOrder").default(0).notNull(),
  publishedAt: timestamp("publishedAt").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
});

export type ExternalResearch = typeof externalResearch.$inferSelect;
export type InsertExternalResearch = typeof externalResearch.$inferInsert;

export const externalPodcasts = mysqlTable("external_podcasts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  category: varchar("category", { length: 128 }),
  duration: varchar("duration", { length: 32 }),
  description: text("description"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  originalSourceUrl: varchar("originalSourceUrl", { length: 1024 }),
  applePodcastsUrl: varchar("applePodcastsUrl", { length: 1024 }),
  spotifyUrl: varchar("spotifyUrl", { length: 1024 }),
  youtubeUrl: varchar("youtubeUrl", { length: 1024 }),
  urlHash: varchar("urlHash", { length: 64 }).notNull().unique(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  tickers: varchar("tickers", { length: 512 }),
  sentiment: mysqlEnum("podcastSentiment", ["bullish", "bearish", "neutral"]),
  sortOrder: int("sortOrder").default(0).notNull(),
  publishedAt: timestamp("publishedAt").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
});

export type ExternalPodcast = typeof externalPodcasts.$inferSelect;
export type InsertExternalPodcast = typeof externalPodcasts.$inferInsert;
