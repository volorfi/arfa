"use client";

import * as React from "react";

import { WatchFace } from "@/components/asset/watch-face";
import { RatioCard } from "@/components/asset/ratio-card";
import { FactorGrid } from "@/components/asset/factor-grid";
import { FactorDrawer } from "@/components/asset/factor-drawer";
import { ScoreHistoryChart } from "@/components/asset/score-history-chart";
import type { AssetAnalysis, FactorScore } from "@/types/asset";

/**
 * Client wrapper around the asset detail content. We keep this separate
 * from the route's page.tsx so the page can stay a server component
 * (handles params + 404 + metadata) while this file owns the cross-
 * component state — namely, which factor is open in the drawer.
 *
 * The watch face and the factor grid both fire onSlotClick/onOpenDetails;
 * either one can drive the drawer, and they share the highlight state
 * via `selection`.
 */
export function AssetPageClient({ asset }: { asset: AssetAnalysis }) {
  const [selection, setSelection] = React.useState<{
    slot: number;
    factor: FactorScore;
  } | null>(null);

  const openFactor = React.useCallback((slot: number, factor: FactorScore) => {
    setSelection({ slot, factor });
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero metric + dial — stack on mobile, side-by-side on lg+ */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr,1fr] lg:items-start">
        <RatioCard
          ratio={asset.ratio}
          overallReturnScore={asset.overallReturnScore}
          overallRiskScore={asset.overallRiskScore}
        />
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs md:p-6">
          <div className="mx-auto aspect-square w-full max-w-[460px]">
            <WatchFace
              factorScores={asset.factorScores}
              ratio={asset.ratio}
              onSlotClick={openFactor}
              activeSlot={selection?.slot ?? null}
            />
          </div>
        </div>
      </div>

      {/* Factor grid — 6 return + 6 risk, two columns on lg+ */}
      <FactorGrid
        factorScores={asset.factorScores}
        onOpenDetails={openFactor}
      />

      {/* Score history */}
      <ScoreHistoryChart history={asset.history} />

      {/* Drawer (mounted once at the page level) */}
      <FactorDrawer
        selection={selection}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      />
    </div>
  );
}
