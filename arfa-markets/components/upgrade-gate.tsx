"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import {
  canAccess,
  planMeetsTier,
  PLANS,
  type Feature,
  type PlanId,
} from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/plan-badge";

interface UpgradeGateProps {
  /** Minimum plan the user needs. Either specify `requiredPlan` directly
   *  or pass a `feature` and we'll look up its minimum plan. */
  requiredPlan?: Extract<PlanId, "PREMIUM" | "PRO">;
  /** Feature name from lib/plans.ts Feature union. Preferred over
   *  `requiredPlan` — keeps feature → plan mapping in one place. */
  feature?: Feature;
  /** Gated content. When the user's plan is sufficient, rendered as-is.
   *  Otherwise wrapped in a blurred, non-interactive layer with an
   *  upgrade overlay on top. */
  children: React.ReactNode;
  /** Descriptive heading on the overlay. Defaults to "Upgrade to <Plan>". */
  title?: string;
  /** Descriptive body copy on the overlay. */
  description?: string;
  className?: string;
}

/**
 * UpgradeGate — wrap any block that should be paywalled.
 *
 *   <UpgradeGate feature="valuation-lab">
 *     <ValuationLab />
 *   </UpgradeGate>
 *
 * While loading the plan we render nothing (prevents the flash where a
 * free user briefly sees premium content before the gate appears). Once
 * resolved, we either pass children through or render the blurred-overlay
 * paywall.
 */
export function UpgradeGate({
  requiredPlan,
  feature,
  children,
  title,
  description,
  className,
}: UpgradeGateProps) {
  const { user, loading } = useUser();

  // Derive the required plan from the feature mapping if not passed.
  const neededPlan: Extract<PlanId, "PREMIUM" | "PRO"> =
    requiredPlan ?? inferRequiredPlan(feature);

  if (loading) {
    return (
      <div
        aria-hidden
        className={cn("min-h-24 animate-pulse rounded-md bg-surface-2", className)}
      />
    );
  }

  const userPlan: PlanId = user?.plan ?? "FREE";
  const granted = feature
    ? canAccess(userPlan, feature)
    : planMeetsTier(userPlan, neededPlan);

  if (granted) {
    return <>{children}</>;
  }

  const planName = PLANS[neededPlan].name;

  return (
    <div className={cn("relative isolate", className)}>
      {/* Muted, non-interactive children behind the overlay. aria-hidden
          plus pointer-events-none plus inert (future-proof for AT). */}
      <div
        aria-hidden
        // @ts-expect-error — `inert` is HTML-valid but TS hasn't caught up
        inert=""
        className="pointer-events-none select-none blur-sm saturate-75 opacity-60"
      >
        {children}
      </div>

      {/* Overlay panel — sits above the blurred content, receives focus. */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="region"
          aria-label="Upgrade required"
          className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-surface-1 p-6 shadow-md"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-text-muted" />
            <PlanBadge plan={neededPlan} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-lg font-semibold tracking-tight text-text-primary">
              {title ?? `Upgrade to ${planName}`}
            </h3>
            <p className="text-sm leading-relaxed text-text-muted">
              {description ?? defaultDescription(feature, neededPlan)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/pricing">
                See plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline">
                <Link href="/login?next=/pricing">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function inferRequiredPlan(
  feature: Feature | undefined,
): Extract<PlanId, "PREMIUM" | "PRO"> {
  if (!feature) return "PREMIUM";
  // Walk plan tiers upward; return the first one that grants the feature.
  if (canAccess("PREMIUM", feature)) return "PREMIUM";
  return "PRO";
}

function defaultDescription(feature: Feature | undefined, plan: PlanId): string {
  if (feature) {
    return `${featureHumanName(feature)} is part of ${PLANS[plan].name}. Upgrade to unlock it, along with the full diagnostics and export toolkit.`;
  }
  return `This is a ${PLANS[plan].name} feature. Upgrade your plan to keep going.`;
}

/** Prettified feature names for overlay copy. Keep aligned with the Feature
 *  union in lib/plans.ts as new features land. */
const FEATURE_LABELS: Record<Feature, string> = {
  "core-scores": "Core ARFA scores",
  "insight-explainers": "Insight explainers",
  "driver-decomposition": "Driver decomposition",
  "advanced-screener": "The advanced screener",
  "custom-screener-fields": "Custom ARFA screener fields",
  "idea-stream": "The idea stream",
  "valuation-lab": "The Valuation Lab",
  "bond-tools": "Bond carry & spread tools",
  "etf-lookthrough": "ETF look-through",
  "portfolio-intelligence": "Portfolio Intelligence",
  "fragility-heatmap": "The fragility heatmap",
  "score-drift-alerts": "Score drift alerts",
  "email-alerts": "Email alerts",
  "realtime-alerts": "Real-time alerts",
  exports: "Exports (CSV / XLSX / PDF)",
  "research-reports": "Research reports",
  "team-sharing": "Team sharing",
  "pro-dashboards": "Pro dashboards",
  "api-access": "API access",
  "priority-support": "Priority support",
};

function featureHumanName(feature: Feature): string {
  return FEATURE_LABELS[feature] ?? "This feature";
}
