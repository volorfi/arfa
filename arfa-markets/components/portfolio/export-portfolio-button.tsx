"use client";

import * as React from "react";
import { Download, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { canAccess, type PlanId } from "@/lib/plans";
import type { ComputedHolding } from "./compute";

/** Mock CSV export — Pro only. Real implementation later will hit a
 *  PDF / XLSX endpoint. */
export function ExportPortfolioButton({
  holdings,
  userPlan,
}: {
  holdings: ComputedHolding[];
  userPlan: PlanId;
}) {
  const allowed = canAccess(userPlan, "research-reports");

  function handle() {
    if (!allowed) return;
    if (holdings.length === 0) {
      toast.error("No holdings to export.");
      return;
    }
    const lines = [
      "Asset,Ticker,Class,Quantity,Purchase Price,Purchase Date,Current Price,Value,Weight %,P&L %,ARFA Ratio,Return,Risk",
    ];
    for (const h of holdings) {
      lines.push(
        [
          csvCell(h.displayName),
          csvCell(h.ticker),
          csvCell(h.assetClass),
          h.quantity,
          h.purchasePrice.toFixed(2),
          h.purchaseDate.slice(0, 10),
          h.currentPrice.toFixed(2),
          h.value.toFixed(2),
          (h.weight * 100).toFixed(2),
          h.pnlPercent.toFixed(2),
          h.matched?.ratio ?? "",
          h.matched?.overallReturnScore ?? "",
          h.matched?.overallRiskScore ?? "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arfa-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${holdings.length} positions`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!allowed}
      onClick={handle}
      title={
        allowed
          ? "Download portfolio as CSV"
          : "Portfolio reports are a Pro feature."
      }
    >
      {!allowed && <Lock className="h-3.5 w-3.5" />}
      <Download className="h-3.5 w-3.5" />
      Export portfolio
    </Button>
  );
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
