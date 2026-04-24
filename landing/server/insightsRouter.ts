/**
 * insightsRouter.ts — Subscriber-gated tRPC endpoints
 *
 * All routes require role = subscriber | admin.
 * Wire into appRouter as: insights: insightsRouter
 */

import { z } from "zod";
import { subscriberProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { assets, signals, notes } from "../drizzle/schema";
import { eq, desc, and, inArray, like, or } from "drizzle-orm";
import { ensureAsset, runSignalPipeline } from "./agentService";

export const insightsRouter = router({

  // ── Signal feed (dashboard) ────────────────────────────────────────────────
  // Returns the latest published signal per asset, sorted by confidence desc.
  signalFeed: subscriberProcedure
    .input(z.object({
      assetClass: z.enum(["equity","bond","fx","commodity","index","etf","macro","all"]).default("all"),
      stance:     z.enum(["bullish","bearish","neutral","all"]).default("all"),
      band:       z.enum(["very_high","high","moderate","low","all"]).default("all"),
      limit:      z.number().min(1).max(100).default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get latest published signal per asset via subquery approach
      const publishedSignals = await db
        .select({
          signal: signals,
          asset:  assets,
        })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .where(
          and(
            inArray(signals.publicationStatus, ["published", "publication_eligible"]),
            input.assetClass !== "all" ? eq(assets.assetClass, input.assetClass as any) : undefined,
            input.stance !== "all"     ? eq(signals.stance, input.stance as any)         : undefined,
            input.band   !== "all"     ? eq(signals.confidenceBand, input.band as any)   : undefined,
          )
        )
        .orderBy(desc(signals.confidenceScore), desc(signals.createdAt))
        .limit(input.limit);

      return publishedSignals.map(({ signal, asset }) => ({
        signalId:          signal.id,
        assetId:           asset.id,
        assetClass:        asset.assetClass,
        identifier:        asset.identifier,
        displayName:       asset.displayName,
        currency:          asset.currency,
        countryCode:       asset.countryCode,
        stance:            signal.stance,
        confidenceBand:    signal.confidenceBand,
        confidenceScore:   signal.confidenceScore,
        horizon:           signal.horizon,
        regimeState:       signal.regimeState,
        topDrivers:        signal.topDrivers,
        riskFlags:         signal.riskFlags,
        bullThesis:        signal.bullThesis,
        bearThesis:        signal.bearThesis,
        disagreementScore: signal.disagreementScore,
        updatedAt:         signal.updatedAt.toISOString(),
      }));
    }),

  // ── Signal detail ──────────────────────────────────────────────────────────
  // Full signal card with Driver Panel + Debate View + Risk Box.
  // agentTrace is intentionally excluded from the public response.
  signalDetail: subscriberProcedure
    .input(z.object({ signalId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select({ signal: signals, asset: assets })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .where(
          and(
            eq(signals.id, input.signalId),
            inArray(signals.publicationStatus, ["published","publication_eligible"])
          )
        )
        .limit(1);

      if (!rows.length) return null;
      const { signal, asset } = rows[0];

      return {
        signalId:          signal.id,
        assetId:           asset.id,
        assetClass:        asset.assetClass,
        identifier:        asset.identifier,
        displayName:       asset.displayName,
        exchangeCode:      asset.exchangeCode,
        currency:          asset.currency,
        countryCode:       asset.countryCode,
        signalType:        signal.signalType,
        horizon:           signal.horizon,
        stance:            signal.stance,
        confidenceScore:   signal.confidenceScore,
        confidenceBand:    signal.confidenceBand,
        regimeState:       signal.regimeState,
        topDrivers:        signal.topDrivers,
        riskFlags:         signal.riskFlags,
        falsifiers:        signal.falsifiers,
        disagreementScore: signal.disagreementScore,
        dataQualityScore:  signal.dataQualityScore,
        evidenceRefs:      signal.evidenceRefs,
        bullThesis:        signal.bullThesis,
        bearThesis:        signal.bearThesis,
        createdAt:         signal.createdAt.toISOString(),
        updatedAt:         signal.updatedAt.toISOString(),
      };
    }),

  // ── Signal history for an asset ────────────────────────────────────────────
  assetSignalHistory: subscriberProcedure
    .input(z.object({ assetId: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.assetId, input.assetId),
            inArray(signals.publicationStatus, ["published","publication_eligible"])
          )
        )
        .orderBy(desc(signals.createdAt))
        .limit(Math.min(input.limit, 50));

      return rows.map(s => ({
        signalId:        s.id,
        stance:          s.stance,
        confidenceBand:  s.confidenceBand,
        confidenceScore: s.confidenceScore,
        horizon:         s.horizon,
        createdAt:       s.createdAt.toISOString(),
      }));
    }),

  // ── Notes for an asset ─────────────────────────────────────────────────────
  assetNotes: subscriberProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(notes)
        .where(and(eq(notes.assetId, input.assetId), eq(notes.status, "active")))
        .orderBy(desc(notes.createdAt))
        .limit(20);

      return rows.map(n => ({
        noteId:       n.id,
        noteType:     n.noteType,
        title:        n.title,
        bodyMarkdown: n.bodyMarkdown,
        status:       n.status,
        createdAt:    n.createdAt.toISOString(),
        updatedAt:    n.updatedAt.toISOString(),
      }));
    }),

  // ── Macro regime overview ──────────────────────────────────────────────────
  // Aggregates published signals by asset class for the regime dashboard.
  macroRegimeOverview: subscriberProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({ signal: signals, asset: assets })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .where(inArray(signals.publicationStatus, ["published","publication_eligible"]))
        .orderBy(desc(signals.createdAt))
        .limit(200);

      // Group by assetClass, take latest per asset, summarise
      const byClass = new Map<string, typeof rows>();
      for (const row of rows) {
        const cls = row.asset.assetClass;
        if (!byClass.has(cls)) byClass.set(cls, []);
        byClass.get(cls)!.push(row);
      }

      return Array.from(byClass.entries()).map(([cls, clsRows]) => {
        const bullCount = clsRows.filter(r => r.signal.stance === "bullish").length;
        const bearCount = clsRows.filter(r => r.signal.stance === "bearish").length;
        const total     = clsRows.length;
        return {
          assetClass:   cls,
          total,
          bullish:      bullCount,
          bearish:      bearCount,
          neutral:      total - bullCount - bearCount,
          netSentiment: total ? Math.round(((bullCount - bearCount) / total) * 100) : 0,
          topSignals:   clsRows.slice(0, 5).map(r => ({
            identifier:   r.asset.identifier,
            displayName:  r.asset.displayName,
            stance:       r.signal.stance,
            confidenceBand: r.signal.confidenceBand,
          })),
        };
      });
    }),

  // ── Asset search (for signal screener) ────────────────────────────────────
  searchAssets: subscriberProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(assets)
        .where(
          or(
            like(assets.identifier,  `%${input.q.toUpperCase()}%`),
            like(assets.displayName, `%${input.q}%`),
          )
        )
        .limit(20);
    }),

  // ── Request fresh analysis ─────────────────────────────────────────────────
  // Authenticated subscribers can request a fresh pipeline run (background).
  requestAnalysis: subscriberProcedure
    .input(z.object({
      assetClass:  z.enum(["equity","bond","fx","commodity","index","etf","macro"]),
      identifier:  z.string().min(1).max(20),
      displayName: z.string().min(1).max(256),
      horizon:     z.enum(["1D","5D","20D","3M","6M"]).default("20D"),
    }))
    .mutation(async ({ input }) => {
      // Ensure asset exists
      const assetId = await ensureAsset({
        assetClass:  input.assetClass,
        identifier:  input.identifier.toUpperCase(),
        displayName: input.displayName,
      });

      // Fire and forget — pipeline runs in background
      runSignalPipeline({
        assetId,
        identifier: input.identifier.toUpperCase(),
        assetClass: input.assetClass,
        horizon:    input.horizon,
      }).catch(err => console.error("[agentService] pipeline error:", err));

      return { queued: true, assetId };
    }),
});
