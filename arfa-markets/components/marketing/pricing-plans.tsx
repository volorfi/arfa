"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type BillingCycle = "monthly" | "annual";

interface Plan {
  name: string;
  tagline: string;
  /** Monthly price when billed monthly. Free → 0. */
  priceMonthly: number;
  /** Annual price total when billed annually. Free → 0. */
  priceAnnual: number;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "Best for exploring ARFA.",
    priceMonthly: 0,
    priceAnnual: 0,
    features: [
      "25 asset views / month",
      "Core ARFA scores",
      "1 watchlist (up to 10 items)",
      "1 saved screen",
      "30-day score history",
      "Limited insight explainers",
    ],
    cta: { label: "Start Free", href: "/signup?plan=free" },
  },
  {
    name: "Premium",
    tagline: "Best for active investors.",
    priceMonthly: 39,
    priceAnnual: 348, // $29/mo effective
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
    cta: { label: "Upgrade to Premium", href: "/signup?plan=premium" },
    featured: true,
  },
  {
    name: "Pro",
    tagline: "Best for professionals.",
    priceMonthly: 99,
    priceAnnual: 948, // $79/mo effective
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
    cta: { label: "Go Pro", href: "/signup?plan=pro" },
  },
];

function formatUsd(n: number): string {
  if (n === 0) return "$0";
  return `$${n.toLocaleString("en-US")}`;
}

function effectiveMonthlyAnnual(plan: Plan): number {
  return plan.priceAnnual / 12;
}

export function PricingPlans() {
  const [billing, setBilling] = React.useState<BillingCycle>("monthly");

  return (
    <>
      <BillingToggle value={billing} onChange={setBilling} />

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} billing={billing} />
        ))}
      </div>
    </>
  );
}

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

function PlanCard({ plan, billing }: { plan: Plan; billing: BillingCycle }) {
  const annualEffective = effectiveMonthlyAnnual(plan);
  const displayPrice =
    billing === "monthly" ? plan.priceMonthly : annualEffective;

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        plan.featured && "border-primary shadow-md ring-1 ring-primary/20",
      )}
    >
      {plan.featured && (
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
          <p className="text-sm text-text-muted">{plan.tagline}</p>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-bold tracking-tight text-text-primary">
            {formatUsd(
              plan.priceMonthly === 0
                ? 0
                : Number(displayPrice.toFixed(0)),
            )}
          </span>
          {plan.priceMonthly !== 0 && (
            <span className="text-sm text-text-muted">/ month</span>
          )}
        </div>
        {plan.priceMonthly !== 0 && billing === "annual" && (
          <p className="text-xs text-text-faint">
            Billed {formatUsd(plan.priceAnnual)} annually
          </p>
        )}
        {plan.priceMonthly !== 0 && billing === "monthly" && (
          <p className="text-xs text-text-faint">Billed monthly</p>
        )}
        {plan.priceMonthly === 0 && (
          <p className="text-xs text-text-faint">Free forever</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 pt-0">
        <ul className="flex flex-col gap-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  plan.featured ? "text-primary" : "text-text-muted",
                )}
              />
              <span className="text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          asChild
          variant={plan.featured ? "default" : "outline"}
          className="mt-auto w-full"
          size="lg"
        >
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
