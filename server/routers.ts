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
} from "./stockService";

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
