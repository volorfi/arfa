import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/debug/env
 *
 * Env-var presence check for production smoke-testing. NEVER returns
 * values — only booleans indicating whether each expected variable
 * resolves to a non-empty string.
 *
 * Access control:
 *   · Dev (NODE_ENV !== "production") → open.
 *   · Production → requires an x-admin-key header matching ADMIN_KEY.
 *     Return 404 (not 401) so probes can't enumerate the endpoint's
 *     existence.
 *
 * Usage:
 *   curl https://arfa.global/api/debug/env \
 *     -H "x-admin-key: <ADMIN_KEY from Vercel env vars>"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every env var we care about for the smoke test, grouped so the output
// reads like a deploy checklist.
const REQUIRED_VARS = {
  app: [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_APP_NAME",
  ],
  supabase: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  database: [
    // Neon-via-Vercel Postgres integration. Pooled URL for runtime queries,
    // non-pooling URL for migrations (directUrl in schema.prisma).
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
  ],
  stripe: [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
    "STRIPE_PREMIUM_ANNUAL_PRICE_ID",
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_ANNUAL_PRICE_ID",
  ],
  vercel: [
    // Vercel injects these at build/runtime; included so the endpoint can
    // confirm the app is actually running on Vercel.
    "VERCEL_ENV",
    "VERCEL_GIT_COMMIT_SHA",
  ],
} as const;

function present(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.length > 0;
}

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const adminKey = process.env.ADMIN_KEY;
    const provided = req.headers.get("x-admin-key");
    // Enumeration-resistant: treat missing/mismatched keys as 404.
    if (!adminKey || !provided || provided !== adminKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const checklist: Record<string, Record<string, boolean>> = {};
  let allPresent = true;
  for (const [group, keys] of Object.entries(REQUIRED_VARS)) {
    checklist[group] = {};
    for (const k of keys) {
      const ok = present(k);
      checklist[group][k] = ok;
      // Optional keys (VERCEL_*) shouldn't count against the overall
      // pass/fail since they're platform-injected.
      const optional =
        k === "VERCEL_ENV" ||
        k === "VERCEL_GIT_COMMIT_SHA";
      if (!ok && !optional) allPresent = false;
    }
  }

  return NextResponse.json(
    {
      status: allPresent ? "ok" : "missing",
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env: checklist,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
