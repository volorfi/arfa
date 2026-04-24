/**
 * Plan catalogue — single source of truth for ARFA Markets tiers.
 *
 * This module is isomorphic: it's imported from both server (checkout API,
 * webhook, dashboard server components) and client (pricing page, UpgradeGate,
 * useUser-derived UI). That means:
 *
 *   · Stripe price IDs are read via `process.env.NEXT_PUBLIC_*` so they
 *     resolve in both contexts. Price IDs are NOT secrets — they're public
 *     product identifiers, safe to ship to the browser.
 *   · The Stripe **secret** key stays in lib/stripe.ts (server-only).
 */

import type { SubscriptionPlanValue } from "@/components/plan-badge";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = SubscriptionPlanValue; // "FREE" | "PREMIUM" | "PRO"
export type BillingInterval = "month" | "year";

export interface PlanLimits {
  /** Max asset detail views per month. `null` = unlimited. */
  assetViews: number | null;
  /** Max number of watchlists the user can own. */
  watchlists: number;
  /** Max items per watchlist. Kept separate from `watchlists` so UI can
   *  surface both figures (e.g. "10 lists · 100 items each"). */
  watchlistItems: number;
  /** Max number of saved screener views. */
  savedScreens: number;
  /** Max exports per month (CSV / XLSX / PDF). 0 = feature disabled. */
  exports: number;
  /** Score history retention in days. `null` = full history. */
  historyDays: number | null;
  /** Max team seats that can share the workspace. 1 = solo user only. */
  teamSeats: number;
}

export interface Plan {
  id: PlanId;
  /** Display name — used in PlanBadge, pricing cards, matrix. */
  name: string;
  /** Sort key for "at least this tier" comparisons. FREE=0, PREMIUM=1, PRO=2. */
  tier: number;
  /** Monthly-equivalent display price in USD (i.e. what the pricing card
   *  shows as "$X / month" headline). Annual shows annual/12. */
  priceMonthly: number;
  /** Total billed annually when paying yearly. 0 for FREE. */
  priceAnnual: number;
  limits: PlanLimits;
}
// Price IDs intentionally DO NOT live here anymore — they were moved to
// `lib/stripe-prices.ts` (server-only) so the client can't tamper with
// the plan → priceId mapping. Client callers send { plan, interval }
// and the server resolves the id.

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags — what a plan can access
// ─────────────────────────────────────────────────────────────────────────────

/** Discrete, gated capabilities. Add here when you build a new feature that
 *  needs plan-level gating. Keep the list flat and stable — component code
 *  references these string literals directly. */
export type Feature =
  | "core-scores"
  | "insight-explainers"
  | "driver-decomposition"
  | "advanced-screener"
  | "custom-screener-fields"
  | "idea-stream"
  | "valuation-lab"
  | "bond-tools"
  | "etf-lookthrough"
  | "portfolio-intelligence"
  | "fragility-heatmap"
  | "score-drift-alerts"
  | "email-alerts"
  | "realtime-alerts"
  | "exports"
  | "research-reports"
  | "team-sharing"
  | "pro-dashboards"
  | "api-access"
  | "priority-support";

/** Minimum plan required for each feature. Anything not listed is FREE. */
const FEATURE_MIN_PLAN: Record<Feature, PlanId> = {
  "core-scores": "FREE",
  "insight-explainers": "FREE", // limited on FREE via count in UI
  "driver-decomposition": "PREMIUM",
  "advanced-screener": "PREMIUM",
  "custom-screener-fields": "PREMIUM",
  "idea-stream": "PREMIUM",
  "valuation-lab": "PREMIUM",
  "bond-tools": "PREMIUM",
  "etf-lookthrough": "PREMIUM",
  "portfolio-intelligence": "PREMIUM",
  "fragility-heatmap": "PREMIUM",
  "score-drift-alerts": "PREMIUM",
  "email-alerts": "PREMIUM",
  "exports": "PREMIUM",
  "research-reports": "PREMIUM",
  "realtime-alerts": "PRO",
  "team-sharing": "PRO",
  "pro-dashboards": "PRO",
  "api-access": "PRO",
  "priority-support": "PRO",
};

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tier: 0,
    priceMonthly: 0,
    priceAnnual: 0,
    limits: {
      assetViews: 25,
      watchlists: 1,
      watchlistItems: 10,
      savedScreens: 1,
      exports: 0,
      historyDays: 30,
      teamSeats: 1,
    },
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    tier: 1,
    priceMonthly: 39,
    priceAnnual: 348, // $29/mo effective
    limits: {
      assetViews: null,
      watchlists: 10,
      watchlistItems: 100,
      savedScreens: 25,
      exports: 20,
      historyDays: 1095, // ~3 years
      teamSeats: 1,
    },
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tier: 2,
    priceMonthly: 99,
    priceAnnual: 948, // $79/mo effective
    limits: {
      assetViews: null,
      watchlists: 50,
      watchlistItems: 500,
      savedScreens: 100,
      exports: 100,
      historyDays: null,
      teamSeats: 5,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Accessors
// ─────────────────────────────────────────────────────────────────────────────

/** Limits for the given plan. Safe against unknown input — falls back to FREE. */
export function getPlanLimits(plan: PlanId): PlanLimits {
  return (PLANS[plan] ?? PLANS.FREE).limits;
}

/** Does the user's plan grant access to the feature? PRO implies PREMIUM,
 *  PREMIUM implies FREE. */
export function canAccess(plan: PlanId, feature: Feature): boolean {
  const required = FEATURE_MIN_PLAN[feature];
  return planMeetsTier(plan, required);
}

/** Returns true if `plan` is at least the tier of `required`. */
export function planMeetsTier(plan: PlanId, required: PlanId): boolean {
  return (PLANS[plan]?.tier ?? 0) >= (PLANS[required]?.tier ?? 0);
}

// Stripe price resolution (`resolvePriceId`, `planFromPriceId`) lives
// in `lib/stripe-prices.ts` which imports "server-only". That file is
// the single place env vars like STRIPE_PREMIUM_MONTHLY_PRICE_ID are
// read; isomorphic code stays here.
