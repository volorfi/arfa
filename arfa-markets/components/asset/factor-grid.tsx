"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { canAccess, type Feature, type PlanId } from "@/lib/plans";
import { useUser } from "@/hooks/useUser";
import { UpgradeGate } from "@/components/upgrade-gate";
import { FactorCard } from "@/components/asset/factor-card";
import type { FactorScore, FactorKey } from "@/types/asset";

/**
 * FactorGrid — the 12 factor cards, two columns:
 *   left column  = RETURN (slots 1–6)
 *   right column = RISK   (slots 7–12)
 *
 * Each card's "Details →" calls onOpenDetails, which the asset page wires
 * to its FactorDrawer.
 *
 * On FREE, the most diagnostic factors (4 return, 4 risk) are wrapped in
 * an UpgradeGate so the cards visibly show the score — but the drill-down
 * is paywalled. The summary line stays readable so free users still get
 * a meaningful headline; the gate only kicks in when they try to dive in.
 *
 * For now the gate is purely visual on the cards (a small "Premium" badge
 * inline). The hard paywall lives in the FactorDrawer itself, so users
 * can see each card's headline regardless of plan.
 */

interface FactorGridProps {
  factorScores: FactorScore[];
  onOpenDetails: (slot: number, factor: FactorScore) => void;
  className?: string;
}

/** Which factors require Premium (or higher) for full drill-down. The
 *  short list of "always free" factors gives unauthenticated visitors
 *  enough to evaluate the product. */
const FREE_FACTOR_KEYS = new Set<FactorKey>([
  "valuation",
  "performance",
  "default_risk",
  "selling_difficulty",
]);

export function FactorGrid({
  factorScores,
  onOpenDetails,
  className,
}: FactorGridProps) {
  const { user } = useUser();
  const userPlan: PlanId = user?.plan ?? "FREE";

  // Slot 1..6 = return, 7..12 = risk. Render in two columns by splitting
  // the array; slot order is preserved within each column.
  const returnFactors = factorScores.slice(0, 6);
  const riskFactors = factorScores.slice(6, 12);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6",
        className,
      )}
    >
      <FactorColumn
        title="Return factors"
        subtitle="Slots 1 → 6 · upside drivers"
        tone="return"
        factors={returnFactors}
        startSlot={1}
        onOpenDetails={onOpenDetails}
        userPlan={userPlan}
      />
      <FactorColumn
        title="Risk factors"
        subtitle="Slots 7 → 12 · drag on the composite"
        tone="risk"
        factors={riskFactors}
        startSlot={7}
        onOpenDetails={onOpenDetails}
        userPlan={userPlan}
      />
    </div>
  );
}

function FactorColumn({
  title,
  subtitle,
  tone,
  factors,
  startSlot,
  onOpenDetails,
  userPlan,
}: {
  title: string;
  subtitle: string;
  tone: "return" | "risk";
  factors: FactorScore[];
  startSlot: number;
  onOpenDetails: (slot: number, factor: FactorScore) => void;
  userPlan: PlanId;
}) {
  const headingClass =
    tone === "return"
      ? "border-success/30 text-success"
      : "border-destructive/30 text-destructive";

  return (
    <div>
      <header
        className={cn(
          "mb-3 flex items-baseline justify-between border-b pb-2",
          headingClass,
        )}
      >
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-text-faint">
          {subtitle}
        </span>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {factors.map((factor, i) => {
          const slot = startSlot + i;
          const isFreeFactor = FREE_FACTOR_KEYS.has(factor.factorKey);
          const showFreePeek =
            !isFreeFactor && !canAccess(userPlan, "driver-decomposition");

          return (
            <li key={factor.factorKey}>
              <FactorCard
                factor={factor}
                slot={slot}
                onOpenDetails={onOpenDetails}
                // Visual cue that drilling in requires upgrade — actual
                // gate is in the FactorDrawer.
                className={cn(
                  showFreePeek && "ring-1 ring-inset ring-text-faint/15",
                )}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Re-export the same helper used by the FactorDrawer so paywall logic
// stays in one place.
export function isFactorGated(
  factor: FactorScore,
  userPlan: PlanId,
): { gated: true; feature: Feature } | { gated: false } {
  if (FREE_FACTOR_KEYS.has(factor.factorKey)) return { gated: false };
  if (canAccess(userPlan, "driver-decomposition")) return { gated: false };
  return { gated: true, feature: "driver-decomposition" };
}
