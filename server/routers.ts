import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
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
import { getBonds, getIssuerBySlug, getFilterOptions, getBondsSummary, getAllIssuers } from "./bondService";
import {
  getSovereignBonds,
  getSovereignBondBySlug,
  getSovereignFilters,
  getSovereignSummary,
  getSovereignBondsByCountry,
  getSovereignCountries,
  getCountryMacroDetail,
} from "./sovereignService";
import {
  queryNews,
  queryNewsSources,
  queryNewsCategories,
  scrapeAllNews,
  cleanupOldArticles,
} from "./newsService";
import { analyzeUnprocessedArticles, getSentimentStats } from "./sentimentService";
import { getSentimentAggregation, getNewsArticles } from "./db";
import {
  getOptionsChain,
  getMostActiveOptions,
  calculateMaxPain,
  calculatePutCallRatio,
  blackScholesGreeks,
} from "./optionsService";
import {
  getExternalResearch,
  getExternalPodcasts,
  getResearchCategories,
  getResearchFirms,
  getPodcastCategories,
  runFullScrape,
} from "./ideafarmService";

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

  // Universal search across all asset classes
  universalSearch: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const q = input.query.trim();
      if (q.length < 1) return { stocks: [], sovereignBonds: [], corporateBonds: [], countries: [], news: [] };
      const ql = q.toLowerCase();

      // 1. Stock search (from Yahoo API)
      let stocks: Array<{ symbol: string; name: string; exchange: string }> = [];
      try {
        const raw = await searchStocks(q);
        stocks = raw.slice(0, 5);
      } catch { stocks = []; }

      // 2. Sovereign bonds (by ticker, name, ISIN, country, region)
      const sovBonds = getSovereignBonds({ search: q });
      const sovereignBonds = sovBonds.slice(0, 8).map(b => ({
        ticker: b.ticker,
        slug: b.slug,
        country: b.country,
        isin: b.isin,
        rating: b.compositeRating,
        ytm: b.yieldToMaturity,
      }));

      // 3. Corporate bonds (by ticker, issuer, ISIN)
      const corpBonds = getBonds({ search: q });
      const corporateBonds = corpBonds.slice(0, 8).map(b => ({
        ticker: b.ticker,
        issuerName: b.issuerName,
        issuerSlug: b.issuerSlug,
        isin: b.isin,
        rating: b.rating,
        ytm: b.yieldToMaturity,
      }));

      // 4. Countries (from sovereign data)
      const allCountries = getSovereignCountries();
      const countries = allCountries
        .filter(c => c.country.toLowerCase().includes(ql) || (c.region && c.region.toLowerCase().includes(ql)))
        .slice(0, 5)
        .map(c => ({
          country: c.country,
          region: c.region,
          rating: c.compositeRating,
          bondCount: c.bondCount,
        }));

      // 5. News headlines (keyword search)
      let news: Array<{ id: number; title: string; source: string; publishedAt: Date; sentiment: string | null; tickers: string | null }> = [];
      try {
        const result = await getNewsArticles({ search: q, limit: 5 });
        news = result.articles.map(a => ({
          id: a.id,
          title: a.title,
          source: a.source,
          publishedAt: a.publishedAt,
          sentiment: a.sentiment,
          tickers: a.tickers,
        }));
      } catch { news = []; }

      return { stocks, sovereignBonds, corporateBonds, countries, news };
    }),

  // Trending tickers from Most Mentioned Today
  trendingTickers: publicProcedure.query(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const agg = await getSentimentAggregation({ dateFrom: todayStart });
    // Return top 5 most mentioned stock tickers (indices already filtered out in getSentimentAggregation)
    return agg.byTicker.slice(0, 5).map(t => t.ticker);
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

    countryBonds: publicProcedure
      .input(z.object({ country: z.string() }))
      .query(async ({ input }) => {
        return getSovereignBondsByCountry(input.country);
      }),

    countries: publicProcedure.query(async () => {
      return getSovereignCountries();
    }),

    countryMacro: publicProcedure
      .input(z.object({ country: z.string() }))
      .query(async ({ input }) => {
        return getCountryMacroDetail(input.country);
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
        articleType: z.enum(["news", "blog"]).optional(),
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
      const analyzed = await analyzeUnprocessedArticles();
      return { success: true, articlesProcessed: count, sentimentAnalyzed: analyzed };
    }),

    analyzeSentiment: protectedProcedure.mutation(async () => {
      const count = await analyzeUnprocessedArticles();
      return { success: true, articlesAnalyzed: count };
    }),

    cleanup: protectedProcedure.mutation(async () => {
      const deleted = await cleanupOldArticles();
      return { success: true, articlesDeleted: deleted };
    }),

    sentimentStats: publicProcedure
      .input(z.object({
        ticker: z.string().optional(),
        articleType: z.enum(["news", "blog"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return getSentimentStats(input?.ticker);
      }),

    sentimentDashboard: publicProcedure
      .input(z.object({
        articleType: z.enum(["news", "blog"]).optional(),
        period: z.enum(["today", "week", "month", "all"]).default("week"),
      }).optional())
      .query(async ({ input }) => {
        const period = input?.period || "week";
        let dateFrom: Date | undefined;
        const now = new Date();
        if (period === "today") {
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === "week") {
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === "month") {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        return getSentimentAggregation({
          articleType: input?.articleType,
          dateFrom,
        });
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

  options: router({
    chain: publicProcedure
      .input(z.object({
        symbol: z.string(),
        expirationDate: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const chain = await getOptionsChain(input.symbol, input.expirationDate);
        if (!chain) return null;
        const maxPain = calculateMaxPain(chain.calls, chain.puts);
        const pcRatio = calculatePutCallRatio(chain.calls, chain.puts);
        return { ...chain, maxPain, putCallRatio: pcRatio };
      }),

    mostActive: publicProcedure.query(async () => {
      return getMostActiveOptions();
    }),

    greeks: publicProcedure
      .input(z.object({
        spotPrice: z.number(),
        strikePrice: z.number(),
        timeToExpiry: z.number(), // in years
        riskFreeRate: z.number(),
        volatility: z.number(),
        optionType: z.enum(["call", "put"]),
      }))
      .query(({ input }) => {
        return blackScholesGreeks(
          input.spotPrice,
          input.strikePrice,
          input.timeToExpiry,
          input.riskFreeRate,
          input.volatility,
          input.optionType
        );
      }),
  }),

  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          email: z.string().email().max(200),
          subject: z.string().min(1).max(300),
          message: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ input }) => {
        const content = `Name: ${input.name}\nEmail: ${input.email}\nSubject: ${input.subject}\n\n${input.message}`;
        await notifyOwner({
          title: `Contact Form: ${input.subject}`,
          content,
        });
        return { success: true };
      }),
  }),

  externalResearch: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        firm: z.string().optional(),
        ticker: z.string().optional(),
        sentiment: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        randomize: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return getExternalResearch({ ...input, randomize: input.randomize ?? true });
      }),
    categories: publicProcedure.query(async () => {
      return getResearchCategories();
    }),
    firms: publicProcedure.query(async () => {
      return getResearchFirms();
    }),
  }),

  externalPodcasts: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        ticker: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        randomize: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return getExternalPodcasts({ ...input, randomize: input.randomize ?? true });
      }),
    categories: publicProcedure.query(async () => {
      return getPodcastCategories();
    }),
  }),

  ideafarmScrape: router({
    run: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Admin only");
      }
      return runFullScrape();
    }),
  }),
});

export type AppRouter = typeof appRouter;
