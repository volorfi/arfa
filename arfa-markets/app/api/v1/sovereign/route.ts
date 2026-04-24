import { NextResponse, type NextRequest } from "next/server";

import { requireUser, serviceError } from "@/lib/api/guard";
import {
  getSovereignBonds,
  getSovereignCountries,
  getSovereignFilters,
  getSovereignSummary,
} from "@/lib/services/sovereign";

/**
 * GET /api/v1/sovereign
 *
 * Query params (filters): region, country, currency, rating, igHy,
 *                         creditAssessment, search
 * Query param view: "summary" | "countries" | (default) list
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const view = sp.get("view");

  try {
    if (view === "summary") {
      return NextResponse.json({
        summary: getSovereignSummary(),
        filters: getSovereignFilters(),
      });
    }
    if (view === "countries") {
      return NextResponse.json({ countries: getSovereignCountries() });
    }

    const bonds = getSovereignBonds({
      region: sp.get("region") ?? undefined,
      country: sp.get("country") ?? undefined,
      currency: sp.get("currency") ?? undefined,
      rating: sp.get("rating") ?? undefined,
      igHy: sp.get("igHy") ?? undefined,
      creditAssessment: sp.get("creditAssessment") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return NextResponse.json({ bonds, count: bonds.length });
  } catch (err) {
    return serviceError(err);
  }
}
