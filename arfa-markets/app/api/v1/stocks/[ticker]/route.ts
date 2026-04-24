import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import {
  getStockChart,
  getStockInsights,
  getStockQuote,
} from "@/lib/services/stock";

/**
 * GET /api/v1/stocks/:ticker
 *
 * Query params:
 *   include:  comma-separated subset of quote | chart | insights
 *             (default: "quote")
 *   interval: e.g. "1d" (used when include=chart)
 *   range:    e.g. "1mo" (used when include=chart)
 *
 * Responds with a composite { quote?, chart?, insights? } object so the
 * client can fetch everything it needs for an asset-detail page in one
 * network round-trip.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker?.toUpperCase();
  if (!ticker) {
    return NextResponse.json(
      { error: "bad_request", message: "Ticker is required." },
      { status: 400 },
    );
  }

  const includeParam = req.nextUrl.searchParams.get("include") ?? "quote";
  const wanted = new Set(
    includeParam.split(",").map((s) => s.trim()).filter(Boolean),
  );
  const interval = req.nextUrl.searchParams.get("interval") ?? "1d";
  const range = req.nextUrl.searchParams.get("range") ?? "1mo";

  try {
    const [quote, chart, insights] = await Promise.all([
      wanted.has("quote") ? getStockQuote(ticker) : Promise.resolve(undefined),
      wanted.has("chart")
        ? getStockChart(ticker, interval, range)
        : Promise.resolve(undefined),
      wanted.has("insights")
        ? getStockInsights(ticker)
        : Promise.resolve(undefined),
    ]);

    return NextResponse.json({ ticker, quote, chart, insights });
  } catch (err) {
    return serviceError(err);
  }
}
