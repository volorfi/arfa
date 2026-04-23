import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";
import { getPlanLimits } from "@/lib/plans";
import { getScreenerRow } from "@/lib/mock/screener";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddItemForm } from "@/components/watchlists/add-item-form";
import { DeleteWatchlistButton } from "@/components/watchlists/delete-watchlist-button";
import {
  WatchlistItemRow,
  type WatchlistItemRowData,
} from "@/components/watchlists/watchlist-item-row";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  // Cheap title derivation; the page itself does the auth + lookup.
  const wl = await prisma.watchlist.findUnique({ where: { id: params.id } });
  return { title: wl ? `${wl.name} — Watchlist` : "Watchlist not found" };
}

export default async function WatchlistDetailPage({ params }: PageProps) {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  await ensureUserProfile();
  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  if (!profile) notFound();

  const watchlist = await prisma.watchlist.findFirst({
    where: { id: params.id, userId: profile.id },
    include: {
      items: { orderBy: { addedAt: "desc" } },
    },
  });
  if (!watchlist) notFound();

  const plan = profile.subscription?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const atItemLimit = watchlist.items.length >= limits.watchlistItems;

  // Resolve mock screener metadata for each item by symbol so the table
  // renders ARFA scores, asset class, etc. Items not in the catalogue
  // still render — their score columns show "—".
  const rows: WatchlistItemRowData[] = watchlist.items.map((it) => {
    const matched = SYMBOL_INDEX.get(it.symbol.toUpperCase()) ?? null;
    return {
      id: it.id,
      symbol: it.symbol,
      assetClass: it.assetClass,
      matched,
      addedAt: it.addedAt.toISOString(),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link href="/dashboard/watchlists">
            <ChevronLeft className="h-4 w-4" />
            All watchlists
          </Link>
        </Button>
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              {watchlist.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {watchlist.items.length} of {limits.watchlistItems} items on{" "}
              {plan}.
            </p>
          </div>
          <DeleteWatchlistButton
            watchlistId={watchlist.id}
            watchlistName={watchlist.name}
            redirectAfter="/dashboard/watchlists"
          />
        </header>
      </div>

      {/* Add item */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
            Add an asset
          </h2>
          {atItemLimit ? (
            <p className="text-sm text-text-muted">
              This list is full ({limits.watchlistItems} items on {plan}).{" "}
              <Link
                href="/pricing"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Upgrade
              </Link>{" "}
              to fit more, or remove items first.
            </p>
          ) : (
            <AddItemForm watchlistId={watchlist.id} />
          )}
        </CardContent>
      </Card>

      {/* Items table */}
      <section className="rounded-lg border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-text-muted">
                No items yet. Use the search above to add the first one.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2/50 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-text-muted">
                    Name
                  </th>
                  <th className="px-3 py-2.5 font-medium text-text-muted">
                    Symbol
                  </th>
                  <th className="px-3 py-2.5 font-medium text-text-muted">
                    Class
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
                  <th className="px-3 py-2.5 font-medium text-text-muted">
                    Added
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <WatchlistItemRow key={r.id} item={r} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Symbol index for catalogue lookup ──────────────────────────────────────
// Built once per server module load. Maps the upper-cased ticker stored in
// WatchlistItem to the lighter ScreenerRow (which carries the scores we
// render in the table).
import { SCREENER_ROWS } from "@/lib/mock/screener";

const SYMBOL_INDEX = (() => {
  const m = new Map<string, ReturnType<typeof getScreenerRow>>();
  for (const row of SCREENER_ROWS) {
    m.set(row.ticker.toUpperCase(), row);
  }
  return m;
})();
