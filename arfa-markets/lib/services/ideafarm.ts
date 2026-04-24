import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * IdeaFarm service — read + bulk-upsert against the scraped research
 * library (ExternalResearch + ExternalPodcast).
 *
 * The legacy scraper (/server/ideafarmService.ts) ran on a schedule
 * and downloaded items from theideafarm.com. That lives in a cron
 * worker; this file exposes the read + upsert surface so the worker
 * has a stable target.
 */

export interface ListOptions {
  ticker?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(n: number | undefined): number {
  return Math.min(MAX_LIMIT, Math.max(1, n ?? DEFAULT_LIMIT));
}

export async function getExternalResearch(opts: ListOptions = {}) {
  const where: Prisma.ExternalResearchWhereInput = {};
  if (opts.ticker) where.ticker = opts.ticker.toUpperCase();
  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { content: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.externalResearch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opts.offset ?? 0,
      take: clampLimit(opts.limit),
    }),
    prisma.externalResearch.count({ where }),
  ]);
  return { items, total };
}

export async function getExternalPodcasts(opts: ListOptions = {}) {
  const where: Prisma.ExternalPodcastWhereInput = {};
  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { transcript: { contains: opts.search, mode: "insensitive" } },
      { speaker: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.externalPodcast.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: opts.offset ?? 0,
      take: clampLimit(opts.limit),
    }),
    prisma.externalPodcast.count({ where }),
  ]);
  return { items, total };
}

/** Bulk-insert scraped research rows. The source URL isn't unique in
 *  the schema (content may change), so callers should dedupe upstream
 *  or tolerate duplicates. */
export async function insertResearch(
  rows: Prisma.ExternalResearchCreateManyInput[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await prisma.externalResearch.createMany({ data: rows });
  return result.count;
}

export async function insertPodcasts(
  rows: Prisma.ExternalPodcastCreateManyInput[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await prisma.externalPodcast.createMany({ data: rows });
  return result.count;
}

/** Placeholder for the scheduled scrape. Kept so the API route can
 *  call into it without a 501; real implementation belongs in a cron
 *  worker (not yet built). */
export async function runFullScrape(): Promise<{ research: number; podcasts: number }> {
  // eslint-disable-next-line no-console
  console.warn(
    "[ideafarm] runFullScrape() is a no-op here; wire it to a Railway cron worker.",
  );
  return { research: 0, podcasts: 0 };
}
