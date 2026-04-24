import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import { getBonds, getBondsSummary, getFilterOptions } from "@/lib/services/bonds";

/**
 * GET /api/v1/bonds
 *
 * Query params are forwarded to `getBonds()`:
 *   rating, region, sector, creditTrend, recommendation, search
 *
 * Extra:
 *   view=summary   → returns { summary, filters } instead of the list
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const view = sp.get("view");

  try {
    if (view === "summary") {
      return NextResponse.json({
        summary: getBondsSummary(),
        filters: getFilterOptions(),
      });
    }

    const results = getBonds({
      rating: sp.get("rating") ?? undefined,
      region: sp.get("region") ?? undefined,
      sector: sp.get("sector") ?? undefined,
      creditTrend: sp.get("creditTrend") ?? undefined,
      recommendation: sp.get("recommendation") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return NextResponse.json({ bonds: results, count: results.length });
  } catch (err) {
    return serviceError(err);
  }
}
