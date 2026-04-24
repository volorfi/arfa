import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import {
  getExternalPodcasts,
  getExternalResearch,
} from "@/lib/services/ideafarm";

/**
 * GET /api/v1/ideafarm
 *
 * Default: research items. view=podcasts → podcast items.
 * Filters: ticker, search, limit, offset.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const opts = {
    ticker: sp.get("ticker") ?? undefined,
    search: sp.get("search") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
  };

  try {
    if (sp.get("view") === "podcasts") {
      return NextResponse.json(await getExternalPodcasts(opts));
    }
    return NextResponse.json(await getExternalResearch(opts));
  } catch (err) {
    return serviceError(err);
  }
}
