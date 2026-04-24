"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ScoreBadge } from "@/components/asset/factor-card";
import { removeHolding } from "@/app/actions/portfolio";
import type { ComputedHolding } from "./compute";

/** Holdings table — each row is a position the user owns, with current
 *  weight, ARFA scores, and unrealised P&L. */
export function HoldingsTable({
  holdings,
}: {
  holdings: ComputedHolding[];
}) {
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No holdings yet"
        description="Use the form above to add your first position. We'll compute weight, weighted ARFA scores, and P&L as soon as you do."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2/50 text-left">
            <tr>
              <th className="px-3 py-2.5 font-medium text-text-muted">
                Asset
              </th>
              <th className="px-3 py-2.5 font-medium text-text-muted">
                Class
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Weight
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                ARFA
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Return
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Risk
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                P&amp;L
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Remove
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <HoldingRow key={h.id} holding={h} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HoldingRow({ holding }: { holding: ComputedHolding }) {
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    if (
      !window.confirm(
        `Remove ${holding.ticker} (${holding.quantity} units) from your portfolio?`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      await removeHolding({ holdingId: holding.id });
      toast.success(`Removed ${holding.ticker}`);
    } catch (err) {
      toast.error("Could not remove", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  const pnlPositive = holding.pnlPercent >= 0;

  return (
    <tr className={cn("border-t border-border", pending && "opacity-50")}>
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          {holding.matched ? (
            <Link
              href={`/dashboard/asset/${holding.matched.assetId}`}
              className="font-medium text-text-primary underline-offset-2 hover:text-primary hover:underline"
            >
              {holding.displayName}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">
              {holding.displayName}
            </span>
          )}
          <span className="text-xs text-text-muted tabular-nums">
            {holding.ticker} · {holding.quantity.toLocaleString("en-US")} ×{" "}
            ${holding.purchasePrice.toFixed(2)}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="capitalize">
          {prismaClassLabel(holding.assetClass)}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {(holding.weight * 100).toFixed(1)}%
      </td>
      <td className="px-3 py-2.5 text-right">
        {holding.matched ? (
          <ScoreBadge score={holding.matched.ratio} factorType="return" />
        ) : (
          <span className="text-xs text-text-faint">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {holding.matched ? holding.matched.overallReturnScore : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {holding.matched ? holding.matched.overallRiskScore : "—"}
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-right font-medium tabular-nums",
          pnlPositive ? "text-success" : "text-destructive",
        )}
      >
        {pnlPositive ? "+" : ""}
        {holding.pnlPercent.toFixed(2)}%
      </td>
      <td className="px-3 py-2.5 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={pending}
          aria-label={`Remove ${holding.ticker}`}
          className="h-8 w-8 text-text-muted hover:text-destructive"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </td>
    </tr>
  );
}

function prismaClassLabel(klass: string): string {
  switch (klass) {
    case "EQUITY":          return "Stock";
    case "ETF":             return "ETF";
    case "BOND_CORP":       return "Bond";
    case "BOND_SOVEREIGN":  return "Bond";
    case "FX":              return "FX";
    case "COMMODITY":       return "Commodity";
    case "INDEX":           return "Index";
    case "CRYPTO":          return "Crypto";
    case "MACRO":           return "Macro";
    default:                return klass;
  }
}
