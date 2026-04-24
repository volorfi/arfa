import { NextResponse, type NextRequest } from "next/server";

import { serviceError } from "@/lib/api/guard";
import {
  calculateMaxPain,
  calculatePutCallRatio,
  getOptionsChain,
} from "@/lib/services/options";

/**
 * GET /api/v1/options/:ticker
 *
 * Returns the options chain plus derived metrics (max pain + P/C ratio).
 * Query param `expiration` selects a specific expiry epoch.
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

  const expirationRaw = req.nextUrl.searchParams.get("expiration");
  const expirationDate = expirationRaw ? Number(expirationRaw) : undefined;

  try {
    const chain = await getOptionsChain(ticker, expirationDate);
    if (!chain) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404 },
      );
    }
    const maxPain = calculateMaxPain(chain.calls, chain.puts);
    const putCall = calculatePutCallRatio(chain.calls, chain.puts);
    return NextResponse.json({ ...chain, maxPain, putCall });
  } catch (err) {
    return serviceError(err);
  }
}
