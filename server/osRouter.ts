/**
 * osRouter.ts — Research OS tRPC endpoints (admin only)
 *
 * Wire into appRouter as: os: osRouter
 * All routes require role = admin.
 */

import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  assets, signals, notes, overrides, reviewTasks, users,
} from "../drizzle/schema";
import { eq, desc, and, inArray, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ensureAsset, runSignalPipeline } from "./agentService";

export const osRouter = router({

  // ────────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ────────────────────────────────────────────────────────────────────────────

  dashboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [openReviews, recentSignals, totalAssets] = await Promise.all([
      db.select().from(reviewTasks).where(inArray(reviewTasks.status, ["open","in_progress"])).limit(5),
      db.select({ s: signals, a: assets })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .orderBy(desc(signals.createdAt)).limit(10),
      db.select({ id: assets.id }).from(assets),
    ]);

    const signalCounts = {
      internal:    0, review: 0, eligible: 0, published: 0, suppressed: 0,
    };
    recentSignals.forEach(({ s }) => {
      if (s.publicationStatus === "internal_only")       signalCounts.internal++;
      else if (s.publicationStatus === "review_required") signalCounts.review++;
      else if (s.publicationStatus === "publication_eligible") signalCounts.eligible++;
      else if (s.publicationStatus === "published")      signalCounts.published++;
      else if (s.publicationStatus === "suppressed")     signalCounts.suppressed++;
    });

    return {
      openReviews:   openReviews.length,
      totalAssets:   totalAssets.length,
      signalCounts,
      recentSignals: recentSignals.map(({ s, a }) => ({
        signalId:        s.id,
        identifier:      a.identifier,
        displayName:     a.displayName,
        assetClass:      a.assetClass,
        stance:          s.stance,
        confidenceBand:  s.confidenceBand,
        publicationStatus: s.publicationStatus,
        createdAt:       s.createdAt.toISOString(),
      })),
      pendingReviews: openReviews.map(r => ({
        reviewId: r.id, reviewType: r.reviewType, objectId: r.objectId,
        priority: r.priority, status: r.status, createdAt: r.createdAt.toISOString(),
      })),
    };
  }),

  // ────────────────────────────────────────────────────────────────────────────
  // SIGNAL QUEUE (editorial approval workflow)
  // ────────────────────────────────────────────────────────────────────────────

  signalQueue: adminProcedure
    .input(z.object({
      status: z.enum(["internal_only","review_required","publication_eligible","published","suppressed","all"]).default("publication_eligible"),
      limit:  z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({ s: signals, a: assets })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .where(
          input.status !== "all" ? eq(signals.publicationStatus, input.status as any) : undefined
        )
        .orderBy(desc(signals.createdAt))
        .limit(input.limit);

      return rows.map(({ s, a }) => ({
        signalId:          s.id,
        assetId:           a.id,
        identifier:        a.identifier,
        displayName:       a.displayName,
        assetClass:        a.assetClass,
        stance:            s.stance,
        confidenceBand:    s.confidenceBand,
        confidenceScore:   s.confidenceScore,
        disagreementScore: s.disagreementScore,
        riskFlags:         s.riskFlags,
        publicationStatus: s.publicationStatus,
        horizon:           s.horizon,
        bullThesis:        s.bullThesis,
        bearThesis:        s.bearThesis,
        createdAt:         s.createdAt.toISOString(),
        updatedAt:         s.updatedAt.toISOString(),
      }));
    }),

  // Full signal detail including agent trace
  signalFull: adminProcedure
    .input(z.object({ signalId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ s: signals, a: assets })
        .from(signals)
        .innerJoin(assets, eq(signals.assetId, assets.id))
        .where(eq(signals.id, input.signalId))
        .limit(1);
      if (!rows.length) return null;
      const { s, a } = rows[0];
      return { ...s, asset: a, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
    }),

  // Publish a signal (move to 'published')
  publishSignal: adminProcedure
    .input(z.object({ signalId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(signals)
        .set({ publicationStatus: "published" })
        .where(eq(signals.id, input.signalId));
      // Close any open review tasks for this signal
      await db.update(reviewTasks)
        .set({ status: "approved", updatedAt: new Date() })
        .where(and(eq(reviewTasks.objectId, input.signalId), eq(reviewTasks.status, "open")));
      return { ok: true };
    }),

  // Suppress a signal
  suppressSignal: adminProcedure
    .input(z.object({ signalId: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(signals)
        .set({ publicationStatus: "suppressed" })
        .where(eq(signals.id, input.signalId));
      // Log as override
      await db.insert(overrides).values({
        id:           nanoid(36),
        objectType:   "signal",
        objectId:     input.signalId,
        overrideType: "suppress",
        reasonCode:   "admin_suppressed",
        reasonText:   input.reason,
        evidenceRefs: [],
        userId:       ctx.user!.id,
      });
      return { ok: true };
    }),

  // Trigger a new pipeline run for an asset
  triggerPipeline: adminProcedure
    .input(z.object({
      assetClass:  z.enum(["equity","bond","fx","commodity","index","etf","macro"]),
      identifier:  z.string().min(1).max(20),
      displayName: z.string().min(1).max(256),
      horizon:     z.enum(["1D","5D","20D","3M","6M"]).default("20D"),
    }))
    .mutation(async ({ input }) => {
      const assetId = await ensureAsset({
        assetClass:  input.assetClass,
        identifier:  input.identifier.toUpperCase(),
        displayName: input.displayName,
      });
      runSignalPipeline({
        assetId,
        identifier: input.identifier.toUpperCase(),
        assetClass: input.assetClass,
        horizon:    input.horizon,
      }).catch(err => console.error("[OS trigger] pipeline error:", err));
      return { queued: true, assetId };
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // OVERRIDES
  // ────────────────────────────────────────────────────────────────────────────

  createOverride: adminProcedure
    .input(z.object({
      objectType:   z.enum(["signal","note","review","policy_decision","agent_output"]),
      objectId:     z.string(),
      overrideType: z.enum(["suppress","downgrade_confidence","upgrade_confidence","replace_stance","hold_publication","add_falsifier","policy_restriction"]),
      reasonCode:   z.string().max(100),
      reasonText:   z.string().max(2000),
      evidenceRefs: z.array(z.string()).default([]),
      effectiveTo:  z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const id = nanoid(36);
      await db.insert(overrides).values({
        id,
        ...input,
        userId:       ctx.user!.id,
        effectiveTo:  input.effectiveTo ? new Date(input.effectiveTo) : null,
      });

      // Apply override side-effects on signals
      if (input.objectType === "signal") {
        if (input.overrideType === "suppress") {
          await db.update(signals).set({ publicationStatus: "suppressed" }).where(eq(signals.id, input.objectId));
        } else if (input.overrideType === "hold_publication") {
          await db.update(signals).set({ publicationStatus: "review_required" }).where(eq(signals.id, input.objectId));
        }
      }

      return { id };
    }),

  listOverrides: adminProcedure
    .input(z.object({ objectId: z.string().optional(), limit: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(overrides)
        .where(input.objectId ? eq(overrides.objectId, input.objectId) : undefined)
        .orderBy(desc(overrides.createdAt))
        .limit(input.limit);
      return rows.map(o => ({ ...o, createdAt: o.createdAt.toISOString() }));
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // NOTES
  // ────────────────────────────────────────────────────────────────────────────

  listNotes: adminProcedure
    .input(z.object({ assetId: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({ n: notes, a: assets })
        .from(notes)
        .innerJoin(assets, eq(notes.assetId, assets.id))
        .where(
          and(
            input.assetId ? eq(notes.assetId, input.assetId) : undefined,
            ne(notes.status, "archived"),
          )
        )
        .orderBy(desc(notes.createdAt))
        .limit(input.limit);
      return rows.map(({ n, a }) => ({
        noteId:      n.id, assetId: a.id, identifier: a.identifier,
        displayName: a.displayName, noteType: n.noteType, title: n.title,
        bodyMarkdown: n.bodyMarkdown, status: n.status,
        createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString(),
      }));
    }),

  createNote: adminProcedure
    .input(z.object({
      assetId:     z.string(),
      noteType:    z.enum(["analysis","meeting","watchlist","journal","draft","other"]),
      title:       z.string().max(300),
      bodyMarkdown:z.string().max(10000),
      status:      z.enum(["draft","active"]).default("active"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const id = nanoid(36);
      await db.insert(notes).values({ id, ...input, authorUserId: ctx.user!.id });
      return { id };
    }),

  updateNote: adminProcedure
    .input(z.object({
      noteId:       z.string(),
      title:        z.string().max(300).optional(),
      bodyMarkdown: z.string().max(10000).optional(),
      status:       z.enum(["draft","active","archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { noteId, ...patch } = input;
      await db.update(notes).set({ ...patch, updatedAt: new Date() }).where(eq(notes.id, noteId));
      return { ok: true };
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT (subscriber access control)
  // ────────────────────────────────────────────────────────────────────────────

  listUsers: adminProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: users.id, name: users.name, email: users.email,
          role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.limit);
      return rows.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), lastSignedIn: u.lastSignedIn.toISOString() }));
    }),

  setUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role:   z.enum(["user","subscriber","admin"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { ok: true };
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // REVIEW QUEUE
  // ────────────────────────────────────────────────────────────────────────────

  reviewQueue: adminProcedure
    .input(z.object({ status: z.enum(["open","in_progress","all"]).default("open") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(reviewTasks)
        .where(input.status !== "all" ? eq(reviewTasks.status, input.status as any) : undefined)
        .orderBy(desc(reviewTasks.createdAt))
        .limit(100);
      return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
    }),

  updateReview: adminProcedure
    .input(z.object({
      reviewId:    z.string(),
      status:      z.enum(["open","in_progress","approved","rejected","escalated","closed"]),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { reviewId, ...patch } = input;
      await db.update(reviewTasks)
        .set({ ...patch, assignedTo: ctx.user!.id, updatedAt: new Date() })
        .where(eq(reviewTasks.id, reviewId));
      return { ok: true };
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // ASSET MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  listAssets: adminProcedure
    .input(z.object({ limit: z.number().default(200) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(assets).orderBy(assets.assetClass, assets.identifier).limit(input.limit);
    }),

  upsertAsset: adminProcedure
    .input(z.object({
      assetClass:  z.enum(["equity","bond","fx","commodity","index","etf","macro"]),
      identifier:  z.string().min(1).max(64),
      displayName: z.string().min(1).max(256),
      exchangeCode:z.string().max(16).optional(),
      currency:    z.string().length(3).optional(),
      countryCode: z.string().length(2).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await ensureAsset(input);
      return { id };
    }),
});
