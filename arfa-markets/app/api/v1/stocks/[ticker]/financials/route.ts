import { NextResponse } from "next/server";

import { serviceError } from "@/lib/api/guard";
import { getFinancialStatements } from "@/lib/services/financials";

/** GET /api/v1/stocks/:ticker/financials — income / balance / cashflow. */
export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker?.toUpperCase();
  if (!ticker) {
    return NextResponse.json(
      { error: "bad_request", message: "Ticker is required." },
      { status: 400 },
    );
  }

  try {
    const data = await getFinancialStatements(ticker);
    if (!data) {
      return NextResponse.json(
        { error: "not_found", message: `No financials for ${ticker}.` },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return serviceError(err);
  }
}
