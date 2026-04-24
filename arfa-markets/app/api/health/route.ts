import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Liveness probe for Railway. Returns 200 + a timestamp; deliberately
 * does NOT touch Prisma / Supabase / Stripe so a brief outage in any
 * dependency doesn't cause Railway to tear down the container.
 *
 * For a proper readiness check (db reachable, Stripe key valid, etc.)
 * add a `/api/ready` endpoint and point Railway there instead.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
