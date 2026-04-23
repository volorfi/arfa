import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getMockAsset } from "@/lib/mock/assets";
import { assetClassLabel } from "@/types/asset";
import { AssetPageClient } from "./asset-page-client";

/**
 * Asset detail — the core product page.
 *
 *   /dashboard/asset/aapl
 *   /dashboard/asset/us10y
 *   /dashboard/asset/ishares-msci-world
 *
 * Currently reads from the mock catalogue in lib/mock/assets.ts. Swap
 * `getMockAsset` for the real data fetch when the API lands; nothing
 * else on this page needs to change.
 *
 * Server component owns the params + 404 + metadata; the AssetPageClient
 * owns the interactive cross-component state (drawer selection,
 * watch-face highlight).
 */

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const asset = getMockAsset(params.id);
  if (!asset) return { title: "Asset not found" };
  return {
    title: `${asset.name} (${asset.ticker}) — ARFA Ratio ${asset.ratio}/7`,
    description: `${asset.name}: 12-factor ARFA analysis vs. ${asset.peerGroup}.`,
  };
}

export default function AssetPage({ params }: PageProps) {
  const asset = getMockAsset(params.id);
  if (!asset) notFound();

  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-text-faint">
          <Badge variant="outline">{assetClassLabel(asset.assetClass)}</Badge>
          <span>{asset.peerGroup}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {asset.name}
          </h1>
          <p className="font-mono text-sm font-medium text-text-muted">
            {asset.ticker}
          </p>
        </div>
        <p className="text-xs text-text-faint">
          Updated daily · Last refresh:{" "}
          {new Date(asset.asOfDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </header>

      <AssetPageClient asset={asset} />
    </article>
  );
}
