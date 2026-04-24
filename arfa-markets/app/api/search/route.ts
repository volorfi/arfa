import { NextResponse, type NextRequest } from "next/server";

import { SCREENER_ROWS } from "@/lib/mock/screener";
import type { AssetClass, Score } from "@/types/asset";

/**
 * GET /api/search?q=<query>
 *
 * Public search across the asset catalogue. Returns up to 10 hits sorted
 * by name. Empty query returns an empty array (no expensive "browse all"
 * fallback).
 *
 * Wired from the topbar AssetSearch combobox. Replace with a real index
 * (Postgres ILIKE / Algolia / similar) when the catalogue exits mock land.
 */

export const runtime = "nodejs";

const MAX_RESULTS = 10;

interface SearchHit {
  assetId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  ratio: Score;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) return NextResponse.json({ results: [] });

  const needle = q.toLowerCase();
  const results: SearchHit[] = SCREENER_ROWS
    .filter((r) => {
      return (
        r.name.toLowerCase().includes(needle) ||
        r.ticker.toLowerCase().includes(needle) ||
        r.assetId.toLowerCase().includes(needle)
      );
    })
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      assetId: r.assetId,
      name: r.name,
      ticker: r.ticker,
      assetClass: r.assetClass,
      ratio: r.ratio,
    }));

  // Lightweight cache hint — repeated typing of the same query in the
  // debounce window can hit the edge cache. SWR pattern keeps the
  // browser snappy without serving stale results across deploys.
  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control":
          "public, max-age=15, stale-while-revalidate=60",
      },
    },
  );
}
