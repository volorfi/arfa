import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PortfolioSummary } from "./compute";

/**
 * Portfolio summary card — totals + weighted ARFA scores. Server
 * component (no interactivity), pure formatting.
 */
export function PortfolioSummaryCard({
  summary,
  baseCurrency,
}: {
  summary: PortfolioSummary;
  baseCurrency: string;
}) {
  const usd = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: baseCurrency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const pnlPositive = summary.totalPnlPercent >= 0;

  return (
    <Card>
      <CardContent className="grid gap-6 p-6 md:grid-cols-3 lg:gap-8">
        <Stat label="Portfolio value" value={usd(summary.totalValue)} accent="primary" />

        <Stat
          label="Total P&L"
          value={`${pnlPositive ? "+" : ""}${summary.totalPnlPercent.toFixed(2)}%`}
          accent={pnlPositive ? "success" : "destructive"}
          subtext={`Cost basis ${usd(summary.totalCost)}`}
        />

        <div>
          <p className="text-xs uppercase tracking-wider text-text-faint">
            Weighted ARFA
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
              {summary.weightedRatio ?? "—"}
            </span>
            <span className="text-xs text-text-faint">/ 7</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
            <span>
              Return{" "}
              <span className="font-semibold text-success tabular-nums">
                {summary.weightedReturnScore ?? "—"}
              </span>
            </span>
            <span>·</span>
            <span>
              Risk{" "}
              <span className="font-semibold text-destructive tabular-nums">
                {summary.weightedRiskScore ?? "—"}
              </span>
            </span>
          </div>
          {summary.coveredWeight < 1 && summary.coveredWeight > 0 && (
            <p className="mt-2 text-[11px] text-text-faint">
              Based on {Math.round(summary.coveredWeight * 100)}% of portfolio
              by weight (rest uncovered).
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent: "primary" | "success" | "destructive";
}) {
  const accentClass =
    accent === "primary"
      ? "text-primary"
      : accent === "success"
        ? "text-success"
        : "text-destructive";
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl",
          accentClass,
        )}
      >
        {value}
      </p>
      {subtext && (
        <p className="mt-2 text-xs text-text-muted">{subtext}</p>
      )}
    </div>
  );
}
