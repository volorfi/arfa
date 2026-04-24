import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import {
  queryNews,
  queryNewsCategories,
  queryNewsSources,
} from "@/lib/services/news";

/**
 * GET /api/v1/news
 *
 * Default: list matching articles. Views:
 *   view=sources      distinct publication sources
 *   view=categories   distinct categories
 *
 * Filters (all optional): source, ticker, category, search, sentiment,
 * dateFrom, dateTo, page, pageSize.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const view = sp.get("view");

  try {
    if (view === "sources") {
      return NextResponse.json({ sources: await queryNewsSources() });
    }
    if (view === "categories") {
      return NextResponse.json({ categories: await queryNewsCategories() });
    }

    const rawSentiment = sp.get("sentiment");
    const sentiment =
      rawSentiment === "bullish" ||
      rawSentiment === "bearish" ||
      rawSentiment === "neutral"
        ? rawSentiment
        : undefined;

    const results = await queryNews({
      ticker: sp.get("ticker") ?? undefined,
      source: sp.get("source") ?? undefined,
      search: sp.get("search") ?? undefined,
      sentiment,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
    });
    return NextResponse.json(results);
  } catch (err) {
    return serviceError(err);
  }
}
