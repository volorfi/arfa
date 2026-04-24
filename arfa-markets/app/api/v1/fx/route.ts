import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import {
  getCentralBankRates,
  getCrossRateMatrix,
  getCurrencyStrength,
  getFXMovers,
  getFXOverview,
  getFXPair,
} from "@/lib/services/fx";

/**
 * GET /api/v1/fx
 *
 * Views:
 *   (default)              overview
 *   pair=<slug>            single pair
 *   view=strength          currency strength index
 *   view=cross             cross-rate matrix
 *   view=central-banks     central bank rates
 *   view=movers            top movers (limit param)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pair = sp.get("pair");
  const view = sp.get("view");

  try {
    if (pair) {
      const p = await getFXPair(pair);
      if (!p) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(p);
    }

    switch (view) {
      case "strength":
        return NextResponse.json({ strength: await getCurrencyStrength() });
      case "cross":
        return NextResponse.json(await getCrossRateMatrix());
      case "central-banks":
        return NextResponse.json({ rates: await getCentralBankRates() });
      case "movers": {
        const limit = Number(sp.get("limit") ?? 10);
        return NextResponse.json({ movers: await getFXMovers(limit) });
      }
      default:
        return NextResponse.json({ fx: await getFXOverview() });
    }
  } catch (err) {
    return serviceError(err);
  }
}
