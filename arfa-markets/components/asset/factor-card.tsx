"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FactorScore, Score } from "@/types/asset";

/**
 * FactorCard — single 12-card grid item.
 *
 *   · Left edge dot (NOT a side border) — green for return, red for risk
 *   · Factor name + score badge on the same row
 *   · One-line driver summary
 *   · "Details →" button — fires onOpenDetails so the parent can show
 *     the FactorDrawer
 */

interface FactorCardProps {
  factor: FactorScore;
  /** 1–12 — passed back through onOpenDetails so the parent doesn't need
   *  to compute it. */
  slot: number;
  onOpenDetails?: (slot: number, factor: FactorScore) => void;
  className?: string;
}

export function FactorCard({
  factor,
  slot,
  onOpenDetails,
  className,
}: FactorCardProps) {
  const isReturn = factor.factorType === "return";

  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-3 p-4 transition-colors hover:border-text-faint",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3 p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Tone dot — small, non-intrusive */}
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                isReturn ? "bg-success" : "bg-destructive",
              )}
            />
            <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              {String(slot).padStart(2, "0")} · {isReturn ? "Return" : "Risk"}
            </span>
          </div>
          <ScoreBadge score={factor.score} factorType={factor.factorType} />
        </div>

        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-text-primary">
            {factor.label}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            {factor.driverSummary}
          </p>
        </div>

        {onOpenDetails && (
          <div className="mt-auto pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onOpenDetails(slot, factor)}
              className="h-8 px-2 text-text-muted hover:text-text-primary"
            >
              Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Score badge ─────────────────────────────────────────────────────────────
/**
 * Pill showing the 1–7 score. Threshold-coloured (different system to the
 * watch-face arc gradient — distinct visual rhythm):
 *   1–3  →  muted (neutral grey)
 *   4    →  gold / amber (neutral middle)
 *   5–7  →  brand teal for return; warning red for risk
 */
function ScoreBadge({
  score,
  factorType,
}: {
  score: Score;
  factorType: "return" | "risk";
}) {
  let cls: string;
  if (score <= 3) {
    cls = "border-border bg-surface-2 text-text-muted";
  } else if (score === 4) {
    cls =
      "border-transparent bg-warning/15 text-[hsl(36_85%_38%)] dark:text-[hsl(36_80%_62%)]";
  } else {
    cls =
      factorType === "return"
        ? "border-transparent bg-primary/12 text-primary"
        : "border-transparent bg-destructive/12 text-destructive";
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-0.5 font-display text-sm font-bold tabular-nums",
        cls,
      )}
      aria-label={`Score ${score} out of 7`}
    >
      {score}
      <span className="ml-0.5 text-[10px] font-medium opacity-70">/7</span>
    </span>
  );
}

export { ScoreBadge };
