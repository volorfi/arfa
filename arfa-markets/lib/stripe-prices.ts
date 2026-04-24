import "server-only";

import type { BillingInterval, PlanId } from "@/lib/plans";

/**
 * Server-only Stripe price resolution.
 *
 * Price IDs used to live on the PLANS catalogue under NEXT_PUBLIC_*
 * env vars so the pricing page could send them directly to the
 * checkout endpoint. That works, but the client was trusted with the
 * plan → priceId mapping — a hostile caller could POST any price id
 * they liked. Moving to server-only fixes that:
 *
 *   1. Client sends { plan, interval } to /api/stripe/checkout
 *   2. Server calls `resolvePriceId(plan, interval)` and uses the
 *      returned id (throwing if unconfigured)
 *   3. Webhook calls `planFromPriceId(priceId)` on Stripe events to
 *      translate back into our plan enum
 *
 * Env vars are read fresh on every call so Railway "redeploy without
 * build" flows pick up price changes without a new image.
 */

type PaidPlan = Extract<PlanId, "PREMIUM" | "PRO">;

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

/** Resolve the Stripe price id for a plan + interval. Returns undefined
 *  (not the empty string) when the corresponding env var is absent, so
 *  callers can differentiate "not configured" from "configured to empty". */
export function resolvePriceId(
  plan: PaidPlan,
  interval: BillingInterval,
): string | undefined {
  if (interval === "month") {
    return plan === "PREMIUM"
      ? readEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID")
      : readEnv("STRIPE_PRO_MONTHLY_PRICE_ID");
  }
  return plan === "PREMIUM"
    ? readEnv("STRIPE_PREMIUM_ANNUAL_PRICE_ID")
    : readEnv("STRIPE_PRO_ANNUAL_PRICE_ID");
}

/** Reverse lookup — used by the webhook when a subscription event fires
 *  and we need to figure out which plan the price belongs to. Returns
 *  null if the id doesn't match any configured plan (which should
 *  prompt a louder "unknown price" log in the caller). */
export function planFromPriceId(
  priceId: string,
): { plan: PaidPlan; interval: BillingInterval } | null {
  const table: { plan: PaidPlan; interval: BillingInterval; id?: string }[] = [
    { plan: "PREMIUM", interval: "month", id: readEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID") },
    { plan: "PREMIUM", interval: "year",  id: readEnv("STRIPE_PREMIUM_ANNUAL_PRICE_ID") },
    { plan: "PRO",     interval: "month", id: readEnv("STRIPE_PRO_MONTHLY_PRICE_ID") },
    { plan: "PRO",     interval: "year",  id: readEnv("STRIPE_PRO_ANNUAL_PRICE_ID") },
  ];
  const hit = table.find((row) => row.id === priceId);
  return hit ? { plan: hit.plan, interval: hit.interval } : null;
}
