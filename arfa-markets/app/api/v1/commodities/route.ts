import { NextResponse, type NextRequest } from "next/server";

import { requireUser, serviceError } from "@/lib/api/guard";
import {
  getCommoditiesByFamily,
  getCommoditiesOverview,
  getCommodity,
  getCommodityLeaderboard,
} from "@/lib/services/commodities";

/**
 * GET /api/v1/commodities
 *
 * Views:
 *   (default)          overview array
 *   view=by-family     grouped by energy/metals/agriculture/…
 *   view=leaderboard   top movers (query: sortKey, limit)
 *   slug=<symbol>      single commodity
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug");
  const view = sp.get("view");

  try {
    if (slug) {
      const c = await getCommodity(slug);
      if (!c) {
        return NextResponse.json(
          { error: "not_found" },
          { status: 404 },
        );
      }
      return NextResponse.json(c);
    }

    if (view === "by-family") {
      return NextResponse.json(await getCommoditiesByFamily());
    }

    if (view === "leaderboard") {
      const sortKey = (sp.get("sortKey") ??
        "changePercent") as Parameters<typeof getCommodityLeaderboard>[0];
      const limit = Number(sp.get("limit") ?? 10);
      const board = await getCommodityLeaderboard(sortKey, limit);
      return NextResponse.json({ leaderboard: board });
    }

    const overview = await getCommoditiesOverview();
    return NextResponse.json({ commodities: overview });
  } catch (err) {
    return serviceError(err);
  }
}
