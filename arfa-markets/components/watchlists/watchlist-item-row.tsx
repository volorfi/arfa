"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/asset/factor-card";
import { removeItemFromWatchlist } from "@/app/actions/watchlist";
import type { ScreenerRow } from "@/lib/mock/screener";
import type { AssetClass } from "@/types/asset";

/**
 * Single item row in a watchlist's mini-screener table.
 *
 * Each row is a client component so the trash button can call the server
 * action without coordinating state with the parent table.
 */

export interface WatchlistItemRowData {
  id: string;
  symbol: string;
  assetClass: string; // Prisma AssetClass enum value
  /** Screener row matched by symbol/ticker — undefined when the symbol
   *  isn't in the catalogue (e.g. a manually-entered ticker we don't
   *  cover yet). */
  matched: ScreenerRow | null;
  /** ISO timestamp from `addedAt`. */
  addedAt: string;
}

export function WatchlistItemRow({ item }: { item: WatchlistItemRowData }) {
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    if (!window.confirm(`Remove ${item.symbol} from this watchlist?`)) return;
    setPending(true);
    try {
      await removeItemFromWatchlist({ itemId: item.id });
      toast.success(`Removed ${item.symbol}`);
    } catch (err) {
      toast.error("Could not remove", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  const matched = item.matched;

  return (
    <tr className={cn("border-t border-border", pending && "opacity-50")}>
      <td className="px-3 py-2.5">
        {matched ? (
          <Link
            href={`/dashboard/asset/${matched.assetId}`}
            className="font-medium text-text-primary underline-offset-2 hover:text-primary hover:underline"
          >
            {matched.name}
          </Link>
        ) : (
          <span className="font-medium text-text-primary">{item.symbol}</span>
        )}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-text-muted">
        {item.symbol}
      </td>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="capitalize">
          {prismaClassLabel(item.assetClass)}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        {matched ? (
          <ScoreBadge score={matched.ratio} factorType="return" />
        ) : (
          <span className="text-xs text-text-faint">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {matched ? matched.overallReturnScore : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">
        {matched ? matched.overallRiskScore : "—"}
      </td>
      <td className="px-3 py-2.5 text-xs text-text-faint">
        {new Date(item.addedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-3 py-2.5 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={pending}
          aria-label={`Remove ${item.symbol}`}
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

// Prisma AssetClass → friendly label.
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

/** Convert our 3-class UI AssetClass to the Prisma enum representation
 *  used by add/remove actions. Exported here so the "add item" form can
 *  reuse it. */
export function uiClassToPrisma(klass: AssetClass): string {
  switch (klass) {
    case "stock": return "EQUITY";
    case "etf":   return "ETF";
    case "bond":  return "BOND_CORP";
  }
}
