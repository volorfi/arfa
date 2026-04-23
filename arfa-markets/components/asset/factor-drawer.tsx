"use client";

import * as React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUser } from "@/hooks/useUser";
import { UpgradeGate } from "@/components/upgrade-gate";
import { ScoreBadge } from "@/components/asset/factor-card";
import { isFactorGated } from "@/components/asset/factor-grid";
import type { FactorScore, Score } from "@/types/asset";

/**
 * FactorDrawer — slide-in details for a single factor.
 *
 * Layout
 *   header:  factor name + score badge + percentile
 *   body:    constituent metrics table
 *            trend sparkline (last 30 / 90 / 365 days)
 *            plain-English explanation paragraph
 *
 * Gating
 *   On FREE, 8 of 12 factors are paywalled at the drawer level. We always
 *   render the score and the one-line driver summary (also visible on
 *   the card) so the user knows what's behind the gate, then UpgradeGate
 *   blurs the metrics + sparkline.
 */

interface FactorDrawerProps {
  /** The slot 1–12 + factor to render. `null` closes the drawer. */
  selection: { slot: number; factor: FactorScore } | null;
  onOpenChange: (open: boolean) => void;
}

export function FactorDrawer({ selection, onOpenChange }: FactorDrawerProps) {
  const { user } = useUser();
  const userPlan = user?.plan ?? "FREE";
  const factor = selection?.factor;
  const slot = selection?.slot;

  const open = selection !== null;
  // `as const` so TS keeps the discriminated-union narrowing alive on
  // the gated.gated check below (otherwise `gated: false` widens to
  // `boolean` and `feature` becomes optional).
  const gated = factor
    ? isFactorGated(factor, userPlan)
    : ({ gated: false } as const);
  const isReturn = factor?.factorType === "return";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0">
        {factor && slot && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-text-faint">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isReturn ? "bg-success" : "bg-destructive",
                  )}
                />
                <span>
                  {String(slot).padStart(2, "0")} ·{" "}
                  {isReturn ? "Return" : "Risk"} factor
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 pt-1">
                <SheetTitle className="text-xl">{factor.label}</SheetTitle>
                <ScoreBadge
                  score={factor.score}
                  factorType={factor.factorType}
                />
              </div>
              <SheetDescription>
                {factor.driverSummary}
              </SheetDescription>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                <PercentileBadge percentile={factor.percentile} />
                <ConfidenceBadge confidence={factor.confidence} />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-7">
              {gated.gated ? (
                // Premium-gated drawer body — UpgradeGate blurs the
                // teaser content. We mount the same components inside
                // so the user sees what they'd get.
                <UpgradeGate feature={gated.feature}>
                  <DrawerBodyContent factor={factor} isReturn={!!isReturn} />
                </UpgradeGate>
              ) : (
                <DrawerBodyContent factor={factor} isReturn={!!isReturn} />
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Body (re-used inside and outside the upgrade gate) ──────────────────────

function DrawerBodyContent({
  factor,
  isReturn,
}: {
  factor: FactorScore;
  isReturn: boolean;
}) {
  return (
    <>
      <MetricsTable factor={factor} isReturn={isReturn} />
      <TrendSparkline factor={factor} isReturn={isReturn} />
      <Explanation factor={factor} />
    </>
  );
}

// ── Metrics table ──────────────────────────────────────────────────────────

function MetricsTable({
  factor,
  isReturn,
}: {
  factor: FactorScore;
  isReturn: boolean;
}) {
  return (
    <section>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-text-faint">
        Constituent metrics
      </h3>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-text-muted">Metric</th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">
                Value
              </th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">
                Peer median
              </th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">
                Pctile
              </th>
              <th className="px-3 py-2 text-right font-medium text-text-muted">
                Δ score
              </th>
            </tr>
          </thead>
          <tbody>
            {factor.metrics.map((m) => (
              <tr
                key={m.name}
                className="border-t border-border odd:bg-surface-1 even:bg-surface-2/40"
              >
                <td className="px-3 py-2 text-text-primary">{m.name}</td>
                <td className="px-3 py-2 text-right font-medium text-text-primary tabular-nums">
                  {m.value}
                </td>
                <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                  {m.peerMedian}
                </td>
                <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                  {Math.round(m.percentile)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-medium tabular-nums",
                    metricToneClass(m.scoreContribution, isReturn),
                  )}
                >
                  {formatDelta(m.scoreContribution)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-faint">
        Δ score is each metric&apos;s sensitivity contribution to the final
        factor score, in raw 1–7 units. Positive = lifted, negative = dragged
        down.
      </p>
    </section>
  );
}

function metricToneClass(delta: number, isReturn: boolean): string {
  if (Math.abs(delta) < 0.05) return "text-text-faint";
  // For RISK factors, a "positive" raw contribution means MORE risk —
  // so we colour it as a negative for the user (red), and vice versa.
  const isGood = isReturn ? delta > 0 : delta < 0;
  return isGood ? "text-success" : "text-destructive";
}

function formatDelta(n: number): string {
  if (Math.abs(n) < 0.05) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}`;
}

// ── Trend sparkline ────────────────────────────────────────────────────────

/** Tiny SVG sparkline — score (1–7) over the recent window. We reuse the
 *  drawer for several factors per session so we keep this lightweight
 *  (no Recharts dependency, no animations). */
function TrendSparkline({
  factor,
  isReturn,
}: {
  factor: FactorScore;
  isReturn: boolean;
}) {
  // Mock trend: walk +/- 1 around the current score over 30 days. Real
  // data lives on the AssetAnalysis once the API ships per-factor history.
  const series = React.useMemo(() => mockSparkSeries(factor.score), [factor.score]);

  const W = 320;
  const H = 80;
  const PAD = 6;
  const min = 1;
  const max = 7;

  const xStep = (W - PAD * 2) / Math.max(1, series.length - 1);
  const yScale = (s: number) =>
    H - PAD - ((s - min) / (max - min)) * (H - PAD * 2);

  const points = series.map((s, i) => `${PAD + i * xStep},${yScale(s)}`).join(" ");
  const last = series[series.length - 1] ?? factor.score;
  const first = series[0] ?? factor.score;
  const trend: "up" | "down" | "flat" =
    last > first + 0.4 ? "up" : last < first - 0.4 ? "down" : "flat";

  const lineColor = isReturn
    ? "hsl(var(--success))"
    : "hsl(var(--destructive))";

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-text-faint">
          30-day trend
        </h3>
        <TrendBadge trend={trend} />
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`30-day trend, ${factor.label}`}
        className="h-20 w-full rounded-md border border-border bg-surface-2 p-1"
      >
        {/* Gridlines at scores 4 and 7 */}
        <line
          x1={PAD}
          y1={yScale(4)}
          x2={W - PAD}
          y2={yScale(4)}
          stroke="hsl(var(--border))"
          strokeDasharray="2 3"
          strokeWidth="0.5"
        />
        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </section>
  );
}

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const cls =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-text-muted";
  const label =
    trend === "up" ? "Improving" : trend === "down" ? "Deteriorating" : "Stable";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cls)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function mockSparkSeries(target: Score): Score[] {
  // Cheap deterministic walker; same input always produces the same
  // series so SSR and client renders agree.
  const out: Score[] = [];
  let v = target;
  for (let i = 0; i < 30; i++) {
    const delta = ((target * 17 + i * 7) % 11) / 22 - 0.25;
    v = clampScore(v + delta);
    out.push(v);
  }
  // Force the last point to the actual current score so the sparkline
  // ends at the score visible on the card.
  out[out.length - 1] = target;
  return out;
}

function clampScore(n: number): Score {
  if (n < 1) return 1;
  if (n > 7) return 7;
  return Math.round(n) as Score;
}

// ── Plain-English explanation ──────────────────────────────────────────────

function Explanation({ factor }: { factor: FactorScore }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-text-faint">
        How to read this
      </h3>
      <p className="text-sm leading-relaxed text-text-primary">
        {factor.driverSummary}{" "}
        Constituent metrics above each contribute a fraction of the final{" "}
        <span className="font-semibold">{factor.score} / 7</span> score —
        deltas in the right column show their direction and weight.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        The score reflects this asset&apos;s percentile within its peer group
        and has been calibrated against multi-cycle historical outcomes.
        It is a research signal, not a recommendation.
      </p>
    </section>
  );
}

function PercentileBadge({ percentile }: { percentile: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-text-faint">Percentile</span>
      <span className="font-semibold text-text-primary tabular-nums">
        {Math.round(percentile)}
      </span>
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-text-faint">Confidence</span>
      <span className="font-semibold text-text-primary tabular-nums">
        {Math.round(confidence * 100)}%
      </span>
    </span>
  );
}
