import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getWatchlistByUserId, addToWatchlist, removeFromWatchlist, isInWatchlist } from "./db";
import {
  getStockChart,
  getStockQuote,
  getStockInsights,
  getMarketIndices,
  getMarketMovers,
  searchStocks,
  getScreenerData,
  getIPOData,
  getMarketNews,
  getCalendarEarnings,
  getCalendarDividends,
  getCalendarStockSplits,
  getCalendarEconomicEvents,
  getCalendarPublicOfferings,
} from "./stockService";
import { getFinancialStatements } from "./financialsService";
import { getBonds, getIssuerBySlug, getFilterOptions, getBondsSummary } from "./bondService";
import {
  getSovereignBonds,
  getSovereignBondBySlug,
  getSovereignFilters,
  getSovereignSummary,
} from "./sovereignService";
import {
  queryNews,
  queryNewsSources,
  queryNewsCategories,
  scrapeAllNews,
} from "./newsService";
import { analyzeUnprocessedArticles, getSentimentStats } from "./sentimentService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  stock: router({
    quote: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getStockQuote(input.symbol);
      }),

    chart: publicProcedure
      .input(z.object({
        symbol: z.string(),
        interval: z.string().default("1d"),
        range: z.string().default("1mo"),
      }))
      .query(async ({ input }) => {
        return getStockChart(input.symbol, input.interval, input.range);
      }),

    insights: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getStockInsights(input.symbol);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        if (input.query.length < 1) return [];
        return searchStocks(input.query);
      }),

    screener: publicProcedure.query(async () => {
      return getScreenerData();
    }),

    financials: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return getFinancialStatements(input.symbol);
      }),
  }),

  market: router({
    indices: publicProcedure.query(async () => {
      return getMarketIndices();
    }),

    movers: publicProcedure.query(async () => {
      return getMarketMovers();
    }),

    news: publicProcedure.query(async () => {
      return getMarketNews();
    }),

    ipos: publicProcedure.query(async () => {
      return getIPOData();
    }),
  }),

  calendar: router({
    earnings: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getCalendarEarnings(input.date);
      }),

    dividends: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getCalendarDividends(input.date);
      }),

    stockSplits: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getCalendarStockSplits(input.date);
      }),

    economicEvents: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getCalendarEconomicEvents(input.date);
      }),

    publicOfferings: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return getCalendarPublicOfferings(input.date);
      }),
  }),

  bonds: router({
    list: publicProcedure
      .input(z.object({
        rating: z.string().optional(),
        region: z.string().optional(),
        sector: z.string().optional(),
        creditTrend: z.string().optional(),
        recommendation: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getBonds(input || undefined);
      }),

    issuer: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getIssuerBySlug(input.slug);
      }),

    filters: publicProcedure.query(async () => {
      return getFilterOptions();
    }),

    summary: publicProcedure.query(async () => {
      return getBondsSummary();
    }),
  }),

  sovereign: router({
    list: publicProcedure
      .input(z.object({
        region: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
        rating: z.string().optional(),
        igHy: z.string().optional(),
        creditAssessment: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getSovereignBonds(input || undefined);
      }),

    detail: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getSovereignBondBySlug(input.slug);
      }),

    filters: publicProcedure.query(async () => {
      return getSovereignFilters();
    }),

    summary: publicProcedure.query(async () => {
      return getSovereignSummary();
    }),
  }),

  news: router({
    list: publicProcedure
      .input(z.object({
        source: z.string().optional(),
        ticker: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        sentiment: z.enum(["bullish", "bearish", "neutral"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return queryNews(input || {});
      }),

    sources: publicProcedure.query(async () => {
      return queryNewsSources();
    }),

    categories: publicProcedure.query(async () => {
      return queryNewsCategories();
    }),

    scrape: protectedProcedure.mutation(async () => {
      const count = await scrapeAllNews();
      // Run sentiment analysis on newly scraped articles
      const analyzed = await analyzeUnprocessedArticles();
      return { success: true, articlesProcessed: count, sentimentAnalyzed: analyzed };
    }),

    analyzeSentiment: protectedProcedure.mutation(async () => {
      const count = await analyzeUnprocessedArticles();
      return { success: true, articlesAnalyzed: count };
    }),

    sentimentStats: publicProcedure
      .input(z.object({ ticker: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getSentimentStats(input?.ticker);
      }),
  }),

  watchlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWatchlistByUserId(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addToWatchlist(ctx.user.id, input.symbol, input.companyName);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromWatchlist(ctx.user.id, input.symbol);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ ctx, input }) => {
        return isInWatchlist(ctx.user.id, input.symbol);
      }),
  }),
});

export type AppRouter = typeof appRouter;
