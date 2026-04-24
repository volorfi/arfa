import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Agent service — CRUD over the user-scoped research triplet:
 * Signal (trade ideas), Asset (tracked positions), Note (notebook).
 *
 * The legacy /server/agentService.ts ran an LLM-driven 12-factor
 * scoring pipeline. That's out of scope for this port — the richer
 * pipeline can land later as a cron worker that writes into Signal.
 * For now this module exposes the minimum the /api/v1/agent route
 * needs: list + create + update + delete per user.
 *
 * Every function takes `userId` (the Prisma User.id) so the route can
 * resolve ownership from the Supabase session before calling in.
 */

// ── Signals ────────────────────────────────────────────────────────────────

export interface SignalInput {
  ticker: string;
  type: "BUY" | "SELL" | "WATCH" | "AVOID";
  conviction?: number;
  thesis?: string | null;
  targetPrice?: number | null;
  stopLoss?: number | null;
  expiresAt?: string | null;
}

export async function listSignals(userId: string) {
  return prisma.signal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSignal(userId: string, input: SignalInput) {
  return prisma.signal.create({
    data: {
      userId,
      ticker: input.ticker.toUpperCase(),
      type: input.type,
      conviction: input.conviction ?? 3,
      thesis: input.thesis ?? null,
      targetPrice: input.targetPrice ?? null,
      stopLoss: input.stopLoss ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
}

export async function deleteSignal(userId: string, id: string) {
  const result = await prisma.signal.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

// ── Assets (user-scoped) ───────────────────────────────────────────────────

export interface AssetInput {
  ticker: string;
  name?: string | null;
  assetClass: "equity" | "bond" | "commodity" | "fx" | "crypto";
  quantity?: number | null;
  avgCost?: number | null;
  currency?: string;
  notes?: string | null;
}

export async function listAssets(userId?: string) {
  // Optional userId for a forthcoming public-catalogue view; for now
  // we require it so the route never leaks one user's portfolio to
  // another. The /api/v1/agent route always passes a userId.
  if (!userId) return [];
  return prisma.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertAsset(userId: string, input: AssetInput) {
  // Natural key: (userId, ticker). Prisma needs a compound unique to
  // use upsert directly — we don't have one, so do it by hand.
  const existing = await prisma.asset.findFirst({
    where: { userId, ticker: input.ticker.toUpperCase() },
    select: { id: true },
  });

  const data: Prisma.AssetCreateInput = {
    user: { connect: { id: userId } },
    ticker: input.ticker.toUpperCase(),
    name: input.name ?? null,
    assetClass: input.assetClass,
    quantity: input.quantity ?? null,
    avgCost: input.avgCost ?? null,
    currency: input.currency ?? "USD",
    notes: input.notes ?? null,
  };

  if (existing) {
    return prisma.asset.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        assetClass: data.assetClass,
        quantity: data.quantity,
        avgCost: data.avgCost,
        currency: data.currency,
        notes: data.notes,
      },
    });
  }
  return prisma.asset.create({ data });
}

export async function deleteAsset(userId: string, id: string) {
  const result = await prisma.asset.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

// ── Notes ──────────────────────────────────────────────────────────────────

export interface NoteInput {
  ticker?: string | null;
  title?: string | null;
  content: string;
  tags?: string[] | null;
  isPinned?: boolean;
}

export async function listNotes(userId: string, ticker?: string) {
  return prisma.note.findMany({
    where: {
      userId,
      ...(ticker ? { ticker: ticker.toUpperCase() } : {}),
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });
}

export async function createNote(userId: string, input: NoteInput) {
  return prisma.note.create({
    data: {
      userId,
      ticker: input.ticker ? input.ticker.toUpperCase() : null,
      title: input.title ?? null,
      content: input.content,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isPinned: input.isPinned ?? false,
    },
  });
}

export async function deleteNote(userId: string, id: string) {
  const result = await prisma.note.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

// ── Entry point called by POST /api/v1/agent ───────────────────────────────

/**
 * Re-run the agent over an asset. The current implementation is a
 * placeholder — the real factor pipeline lives in a future cron
 * worker. Returning a structured payload keeps the route responsive
 * while we build the scoring engine.
 */
export async function runAgentForAsset(assetId: string) {
  // eslint-disable-next-line no-console
  console.warn(
    `[agent] runAgentForAsset(${assetId}) — placeholder; wire the factor pipeline here.`,
  );
  return { assetId, status: "queued" as const };
}
