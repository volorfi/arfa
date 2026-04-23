"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Score } from "@/types/asset";

/**
 * RatioCard — hero metric for the asset detail page.
 *
 *   ARFA Ratio (5/7)
 *     plain-English profile statement
 *     Return | Risk | Ratio sub-scores
 *     "Not a buy/sell/hold signal" disclaimer (tooltip)
 *
 * The composite ratio is duplicated here AND inside the watch face. They
 * always agree because both read the same `ratio` field.
 */

interface RatioCardProps {
  ratio: Score;
  overallReturnScore: Score;
  overallRiskScore: Score;
  className?: string;
}

const PROFILE_BY_SCORE: Record<Score, string> = {
  1: "Weak return potential · Elevated risk",
  2: "Limited return potential · Elevated risk",
  3: "Moderate return potential · Notable risk",
  4: "Balanced return potential · Moderate risk",
  5: "High return potential · Moderate risk",
  6: "High return potential · Contained risk",
  7: "Outstanding return potential · Contained risk",
};

export function RatioCard({
  ratio,
  overallReturnScore,
  overallRiskScore,
  className,
}: RatioCardProps) {
  return (
    <section
      aria-label="ARFA Ratio"
      className={cn(
        "rounded-lg border border-border bg-card p-6 shadow-xs md:p-8",
        className,
      )}
    >
      <div className="grid gap-6 md:grid-cols-[auto,1fr] md:gap-10 md:items-center">
        {/* Big score */}
        <div className="flex items-end gap-2">
          <span className="font-display text-7xl font-bold leading-none tracking-tight text-primary md:text-[88px]">
            {ratio}
          </span>
          <span className="font-display text-2xl font-semibold leading-none text-text-faint md:text-3xl">
            / 7
          </span>
        </div>

        {/* Label + subtext + sub-scores */}
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold uppercase tracking-widest text-text-faint">
                ARFA Ratio
              </h2>
              <DisclaimerTooltip />
            </div>
            <p className="mt-2 text-sm text-text-primary md:text-base">
              {PROFILE_BY_SCORE[ratio]}
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4 md:gap-6">
            <SubScore
              label="Return Score"
              value={overallReturnScore}
              tone="return"
            />
            <SubScore
              label="Risk Score"
              value={overallRiskScore}
              tone="risk"
            />
            <SubScore
              label="ARFA Ratio"
              value={ratio}
              tone="primary"
              emphasised
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SubScore({
  label,
  value,
  tone,
  emphasised,
}: {
  label: string;
  value: Score;
  tone: "return" | "risk" | "primary";
  emphasised?: boolean;
}) {
  const valueClass =
    tone === "return"
      ? "text-success"
      : tone === "risk"
        ? "text-destructive"
        : "text-primary";

  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-text-faint">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-display font-bold tracking-tight",
          valueClass,
          emphasised ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
        )}
      >
        {value}
        <span className="ml-1 text-sm font-medium text-text-faint">/ 7</span>
      </dd>
    </div>
  );
}

/** Native title-tooltip — keeps the primitive list small. We can swap to
 *  Radix Tooltip later if we want richer styling. */
function DisclaimerTooltip() {
  const message =
    "Not a buy/sell/hold signal. Does not account for personal suitability, risk tolerance, or objectives.";
  return (
    <span
      tabIndex={0}
      role="note"
      title={message}
      aria-label={message}
      className="inline-flex items-center justify-center rounded-full p-0.5 text-text-faint hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
