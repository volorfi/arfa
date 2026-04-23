"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { planMeetsTier, type PlanId } from "@/lib/plans";
import type { RatioHistoryPoint } from "@/types/asset";

/**
 * ScoreHistoryChart — composite ARFA Ratio over time.
 *
 *   · Time-range tabs: 30D · 90D · 1Y · 3Y · All
 *   · Plan-gated ranges:
 *       FREE    → 30D only
 *       PREMIUM → up to 3Y
 *       PRO     → All
 *   · Recharts <LineChart> with our token colours; axis bounds are 1–7
 *     so the score scale is consistent regardless of selected range.
 */

type RangeKey = "30D" | "90D" | "1Y" | "3Y" | "ALL";

const RANGES: { key: RangeKey; label: string; days: number | null; minPlan: PlanId }[] = [
  { key: "30D", label: "30D",  days: 30,         minPlan: "FREE" },
  { key: "90D", label: "90D",  days: 90,         minPlan: "PREMIUM" },
  { key: "1Y",  label: "1Y",   days: 365,        minPlan: "PREMIUM" },
  { key: "3Y",  label: "3Y",   days: 365 * 3,    minPlan: "PREMIUM" },
  { key: "ALL", label: "All",  days: null,       minPlan: "PRO" },
];

interface Props {
  history: RatioHistoryPoint[];
  className?: string;
}

export function ScoreHistoryChart({ history, className }: Props) {
  const { user } = useUser();
  const userPlan: PlanId = user?.plan ?? "FREE";
  const [range, setRange] = React.useState<RangeKey>("30D");

  const data = React.useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    if (!r) return history;
    if (r.days === null) return history;
    return history.slice(-r.days);
  }, [history, range]);

  return (
    <section
      aria-label="ARFA Ratio history"
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-xs md:p-6",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold uppercase tracking-widest text-text-faint">
            Score history
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Composite ARFA Ratio over the selected window.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Score history range"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-1 p-1"
        >
          {RANGES.map((r) => {
            const allowed = planMeetsTier(userPlan, r.minPlan);
            const active = range === r.key;
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={!allowed}
                onClick={() => allowed && setRange(r.key)}
                title={
                  allowed
                    ? r.label
                    : `Available on ${r.minPlan === "PRO" ? "Pro" : "Premium"}`
                }
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1 font-display text-xs font-semibold tabular-nums transition-colors",
                  active && allowed
                    ? "bg-primary text-primary-foreground"
                    : allowed
                      ? "text-text-muted hover:text-text-primary"
                      : "cursor-not-allowed text-text-faint",
                )}
              >
                {!allowed && <Lock className="h-3 w-3" aria-hidden />}
                {r.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="h-64 w-full md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              minTickGap={32}
              stroke="hsl(var(--text-faint))"
              tick={{ fill: "hsl(var(--text-faint))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              type="number"
              domain={[1, 7]}
              ticks={[1, 4, 7]}
              stroke="hsl(var(--text-faint))"
              tick={{ fill: "hsl(var(--text-faint))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            {/* Reference line at the neutral midpoint */}
            <ReferenceLine
              y={4}
              stroke="hsl(var(--border))"
              strokeDasharray="2 3"
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              content={<HistoryTooltip />}
            />
            <Line
              type="monotone"
              dataKey="ratio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--surface-1))",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!planMeetsTier(userPlan, "PREMIUM") && (
        <p className="mt-3 text-xs text-text-faint">
          Free plans see the last 30 days. Upgrade to Premium for 3 years, or
          Pro for full history.
        </p>
      )}
    </section>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTick(iso: string): string {
  // Compact axis label: "Jun 12" — leave the year out, the range tab tells you.
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayload {
  payload?: RatioHistoryPoint;
  value?: number;
}

function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;

  const dateStr = new Date(p.date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-xs shadow-md">
      <p className="text-text-muted">{dateStr}</p>
      <p className="mt-1 font-semibold text-text-primary">
        ARFA Ratio:{" "}
        <span className="font-display font-bold text-primary">{p.ratio}</span>
        <span className="text-text-faint"> / 7</span>
      </p>
      {p.returnScore !== undefined && p.riskScore !== undefined && (
        <p className="mt-0.5 text-text-muted">
          Return {p.returnScore} · Risk {p.riskScore}
        </p>
      )}
    </div>
  );
}
