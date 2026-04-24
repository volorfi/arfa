import { int, double, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, uniqueIndex } from "drizzle-orm/mysql-core";

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

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS + RESEARCH OS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export const assets = mysqlTable("assets", {
  id:           varchar("id",           { length: 36  }).primaryKey(),
  assetClass:   mysqlEnum("assetClass", ["equity","bond","fx","commodity","index","etf","macro"]).notNull(),
  identifier:   varchar("identifier",   { length: 64  }).notNull(),
  displayName:  varchar("displayName",  { length: 256 }).notNull(),
  exchangeCode: varchar("exchangeCode", { length: 16  }),
  currency:     varchar("currency",     { length: 3   }),
  countryCode:  varchar("countryCode",  { length: 2   }),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  uniqAsset: uniqueIndex("uq_asset").on(t.assetClass, t.identifier),
}));
export type Asset       = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

export const signals = mysqlTable("signals", {
  id:                varchar("id",              { length: 36  }).primaryKey(),
  assetId:           varchar("assetId",         { length: 36  }).notNull(),
  signalType:        mysqlEnum("signalType",    ["directional","relative","regime_linked","event","structural","meta"]).notNull(),
  horizon:           mysqlEnum("horizon",       ["1D","5D","20D","3M","6M"]).notNull(),
  stance:            mysqlEnum("stance",        ["bullish","bearish","neutral","tightening","widening","stable","stronger","weaker","range_bound"]).notNull(),
  confidenceScore:   double("confidenceScore").notNull(),
  confidenceBand:    mysqlEnum("confidenceBand",["very_high","high","moderate","low","abstain"]).notNull(),
  regimeState:       varchar("regimeState",     { length: 64  }).notNull(),
  topDrivers:        json("topDrivers").$type<string[]>().notNull(),
  riskFlags:         json("riskFlags").$type<string[]>().notNull(),
  falsifiers:        json("falsifiers").$type<string[]>().notNull(),
  disagreementScore: double("disagreementScore"),
  dataQualityScore:  double("dataQualityScore").notNull(),
  evidenceRefs:      json("evidenceRefs").$type<string[]>().notNull(),
  bullThesis:        text("bullThesis"),
  bearThesis:        text("bearThesis"),
  agentTrace:        json("agentTrace").$type<Record<string, unknown>>(),
  publicationStatus: mysqlEnum("publicationStatus", ["internal_only","review_required","publication_eligible","published","suppressed"]).notNull().default("internal_only"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  assetCreatedIdx: index("idx_signals_asset_created").on(t.assetId, t.createdAt),
  statusIdx:       index("idx_signals_status").on(t.publicationStatus),
}));
export type Signal       = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

export const notes = mysqlTable("notes", {
  id:           varchar("id",       { length: 36  }).primaryKey(),
  assetId:      varchar("assetId",  { length: 36  }).notNull(),
  noteType:     mysqlEnum("noteType", ["analysis","meeting","watchlist","journal","draft","other"]).notNull(),
  title:        varchar("title",    { length: 300 }).notNull(),
  bodyMarkdown: text("bodyMarkdown").notNull(),
  authorUserId: int("authorUserId").notNull(),
  status:       mysqlEnum("status", ["draft","active","archived"]).notNull().default("active"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  assetCreatedIdx: index("idx_notes_asset_created").on(t.assetId, t.createdAt),
}));
export type Note       = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

export const overrides = mysqlTable("overrides", {
  id:           varchar("id",          { length: 36  }).primaryKey(),
  objectType:   mysqlEnum("objectType",["signal","note","review","policy_decision","agent_output"]).notNull(),
  objectId:     varchar("objectId",    { length: 64  }).notNull(),
  overrideType: mysqlEnum("overrideType", ["suppress","downgrade_confidence","upgrade_confidence","replace_stance","hold_publication","add_falsifier","policy_restriction"]).notNull(),
  reasonCode:   varchar("reasonCode", { length: 100 }).notNull(),
  reasonText:   text("reasonText").notNull(),
  evidenceRefs: json("evidenceRefs").$type<string[]>().notNull(),
  userId:       int("userId").notNull(),
  effectiveFrom:timestamp("effectiveFrom"),
  effectiveTo:  timestamp("effectiveTo"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  objectIdx: index("idx_overrides_object").on(t.objectType, t.objectId),
}));
export type Override       = typeof overrides.$inferSelect;
export type InsertOverride = typeof overrides.$inferInsert;

export const reviewTasks = mysqlTable("review_tasks", {
  id:          varchar("id",         { length: 36 }).primaryKey(),
  reviewType:  mysqlEnum("reviewType", ["data_review","signal_review","publication_review","override_review","incident_review"]).notNull(),
  objectType:  mysqlEnum("objectType",["signal","note","override","incident","policy_decision"]).notNull(),
  objectId:    varchar("objectId",   { length: 64 }).notNull(),
  status:      mysqlEnum("status",   ["open","in_progress","approved","rejected","escalated","closed"]).notNull().default("open"),
  priority:    mysqlEnum("priority", ["low","medium","high","critical"]).notNull().default("medium"),
  assignedTo:  int("assignedTo"),
  reviewNotes: text("reviewNotes"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  statusIdx: index("idx_review_tasks_status").on(t.status, t.createdAt),
}));
export type ReviewTask       = typeof reviewTasks.$inferSelect;
export type InsertReviewTask = typeof reviewTasks.$inferInsert;
