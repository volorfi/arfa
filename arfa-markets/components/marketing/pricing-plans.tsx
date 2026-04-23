"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  getPriceId,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";

/**
 * Pricing plans — marketing-side pricing cards + billing toggle.
 *
 * Free-plan CTA routes to /register (no payment step).
 *
 * Paid-plan CTAs POST to /api/stripe/checkout with the Stripe price id
 * selected by the monthly/annual toggle, then redirect the browser to the
 * hosted Stripe Checkout page. If the user isn't signed in, the API
 * returns 401 with `redirectTo` — we honour it by routing through
 * /register?next=/pricing so they come back here after signup.
 */

type BillingCycle = "monthly" | "annual";
const BILLING_TO_INTERVAL: Record<BillingCycle, BillingInterval> = {
  monthly: "month",
  annual: "year",
};

// ── UI plan descriptors ─────────────────────────────────────────────────────
// Separate from lib/plans.ts Plan objects because these carry long-form
// marketing copy (tagline + feature bullets) that the runtime plan code
// doesn't need.
interface CardPlan {
  id: PlanId;
  tagline: string;
  features: string[];
  ctaLabel: string;
  featured?: boolean;
}

const CARD_PLANS: CardPlan[] = [
  {
    id: "FREE",
    tagline: "Best for exploring ARFA.",
    features: [
      "25 asset views / month",
      "Core ARFA scores",
      "1 watchlist (up to 10 items)",
      "1 saved screen",
      "30-day score history",
      "Limited insight explainers",
    ],
    ctaLabel: "Start Free",
  },
  {
    id: "PREMIUM",
    tagline: "Best for active investors.",
    features: [
      "Unlimited asset views",
      "Full ARFA diagnostics & explainers",
      "10 watchlists (up to 100 items each)",
      "25 saved screens",
      "3-year score history",
      "Advanced screener with ARFA fields",
      "Valuation Lab (Fair Value Range, Reverse Expectations, Scenario DCF)",
      "Portfolio Intelligence (fragility heatmap, score drift)",
      "Email alerts",
      "20 exports / month (CSV / XLSX / PDF)",
    ],
    ctaLabel: "Upgrade to Premium",
    featured: true,
  },
  {
    id: "PRO",
    tagline: "Best for professionals.",
    features: [
      "Everything in Premium",
      "50 watchlists (500 items each)",
      "100 saved screens",
      "Full score history",
      "100 exports / month",
      "Team sharing (up to 5 seats)",
      "Pro dashboards (25 workspaces)",
      "Priority alerts (real-time)",
      "Priority support",
      "API access (add-on)",
    ],
    ctaLabel: "Go Pro",
  },
];

function formatUsd(n: number): string {
  if (n === 0) return "$0";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function PricingPlans() {
  const router = useRouter();
  const [billing, setBilling] = React.useState<BillingCycle>("monthly");
  /** Which plan is currently in the middle of a checkout roundtrip. Used
   *  to show a spinner on the clicked card and disable the others so the
   *  user can't double-submit. */
  const [pendingPlan, setPendingPlan] = React.useState<PlanId | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpgrade(planId: PlanId) {
    if (planId === "FREE") {
      router.push("/register");
      return;
    }

    setError(null);
    const interval = BILLING_TO_INTERVAL[billing];
    const priceId = getPriceId(planId, interval);
    if (!priceId) {
      setError(
        `Pricing isn't configured yet for ${PLANS[planId].name} (${interval}ly). Try again later or contact support.`,
      );
      return;
    }

    setPendingPlan(planId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = (await res.json()) as {
        url?: string;
        error?: string;
        redirectTo?: string;
      };

      if (res.status === 401 && data.redirectTo) {
        // Not signed in — bounce to register with a return path.
        router.push(data.redirectTo);
        return;
      }
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Try again.");
        return;
      }

      // Hard navigation to Stripe Checkout.
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error starting checkout.",
      );
    } finally {
      // `pendingPlan` stays set on success because we're about to leave the
      // page anyway; only clear on error so the button re-enables.
      setPendingPlan((p) => (p === planId ? null : p));
    }
  }

  return (
    <>
      <BillingToggle value={billing} onChange={setBilling} />

      {error && (
        <Alert variant="destructive" className="mt-6">
          {error}
        </Alert>
      )}

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
        {CARD_PLANS.map((cp) => (
          <PlanCard
            key={cp.id}
            cardPlan={cp}
            billing={billing}
            onUpgrade={handleUpgrade}
            isPending={pendingPlan === cp.id}
            // Disable sibling buttons while one is mid-checkout so users
            // don't double-click across cards.
            disableOthers={pendingPlan !== null && pendingPlan !== cp.id}
          />
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BillingToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="tablist"
        aria-label="Billing cycle"
        className="inline-flex items-center rounded-full border border-border bg-surface-1 p-1 shadow-xs"
      >
        {(["monthly", "annual"] as const).map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              {option === "monthly" ? "Monthly" : "Annual"}
            </button>
          );
        })}
      </div>
      <Badge variant="success" className="hidden sm:inline-flex">
        Save 25% annually
      </Badge>
    </div>
  );
}

function PlanCard({
  cardPlan,
  billing,
  onUpgrade,
  isPending,
  disableOthers,
}: {
  cardPlan: CardPlan;
  billing: BillingCycle;
  onUpgrade: (planId: PlanId) => void;
  isPending: boolean;
  disableOthers: boolean;
}) {
  const plan = PLANS[cardPlan.id];
  const effectiveMonthly =
    plan.priceAnnual === 0 ? 0 : plan.priceAnnual / 12;
  const displayPrice = billing === "monthly" ? plan.priceMonthly : effectiveMonthly;
  const isFree = cardPlan.id === "FREE";

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        cardPlan.featured && "border-primary shadow-md ring-1 ring-primary/20",
      )}
    >
      {cardPlan.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-xl font-semibold tracking-tight text-text-primary">
            {plan.name}
          </h3>
          <p className="text-sm text-text-muted">{cardPlan.tagline}</p>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-bold tracking-tight text-text-primary">
            {formatUsd(displayPrice)}
          </span>
          {!isFree && <span className="text-sm text-text-muted">/ month</span>}
        </div>
        {!isFree && billing === "annual" && (
          <p className="text-xs text-text-faint">
            Billed {formatUsd(plan.priceAnnual)} annually
          </p>
        )}
        {!isFree && billing === "monthly" && (
          <p className="text-xs text-text-faint">Billed monthly</p>
        )}
        {isFree && <p className="text-xs text-text-faint">Free forever</p>}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 pt-0">
        <ul className="flex flex-col gap-3">
          {cardPlan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  cardPlan.featured ? "text-primary" : "text-text-muted",
                )}
              />
              <span className="text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>

        {isFree ? (
          // Free tier has no Stripe roundtrip — straight to /register.
          <Button
            asChild
            variant={cardPlan.featured ? "default" : "outline"}
            className="mt-auto w-full"
            size="lg"
            disabled={disableOthers}
          >
            <Link href="/register">{cardPlan.ctaLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={cardPlan.featured ? "default" : "outline"}
            className="mt-auto w-full"
            size="lg"
            onClick={() => onUpgrade(cardPlan.id)}
            disabled={isPending || disableOthers}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              cardPlan.ctaLabel
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
