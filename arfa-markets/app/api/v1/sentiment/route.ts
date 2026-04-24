import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import { getSentimentStats } from "@/lib/services/sentiment";

/** GET /api/v1/sentiment?ticker=AAPL — aggregate sentiment for a ticker. */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? undefined;
  try {
    return NextResponse.json(await getSentimentStats(ticker));
  } catch (err) {
    return serviceError(err);
  }
}
