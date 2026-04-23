import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";
import { getPlanLimits } from "@/lib/plans";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWatchlistForm } from "@/components/watchlists/create-watchlist-form";
import { DeleteWatchlistButton } from "@/components/watchlists/delete-watchlist-button";

export const metadata: Metadata = { title: "Watchlists" };

/**
 * Watchlists index — list of the user's watchlists with item counts.
 *
 * Server component reads from Prisma. Mutations (create / delete) are
 * client components calling server actions; revalidatePath inside the
 * action keeps this page fresh.
 */
export default async function WatchlistsPage() {
  // Auth was checked by the dashboard layout — re-resolve here so we can
  // ensure the profile exists and read it.
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  // Layout already redirected if !authUser, but TS doesn't know that.
  if (!authUser) return null;

  await ensureUserProfile();
  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  const plan = profile?.subscription?.plan ?? "FREE";
  const limits = getPlanLimits(plan);

  const watchlists = profile
    ? await prisma.watchlist.findMany({
        where: { userId: profile.id },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const atLimit = watchlists.length >= limits.watchlists;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Watchlists
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {watchlists.length} of {limits.watchlists} on {plan}.{" "}
            {limits.watchlistItems.toLocaleString("en-US")} items per list.
          </p>
        </div>
        <CreateWatchlistForm
          disabled={atLimit}
          disabledReason={`${plan} plan caps watchlists at ${limits.watchlists}.`}
        />
      </header>

      {watchlists.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {watchlists.map((wl) => (
            <li key={wl.id}>
              <Card className="group relative h-full transition-colors hover:border-text-faint">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-text-muted" />
                      <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
                        {wl.name}
                      </h2>
                    </div>
                    <DeleteWatchlistButton
                      watchlistId={wl.id}
                      watchlistName={wl.name}
                    />
                  </div>
                  <p className="text-sm text-text-muted">
                    <span className="font-semibold text-text-primary tabular-nums">
                      {wl._count.items}
                    </span>{" "}
                    item{wl._count.items === 1 ? "" : "s"} · last update{" "}
                    {new Date(wl.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <Link
                    href={`/dashboard/watchlists/${wl.id}`}
                    className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Open
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 px-8 py-10">
        <Star className="h-6 w-6 text-text-faint" />
        <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
          No watchlists yet
        </h2>
        <p className="max-w-md text-sm text-text-muted">
          Create a list to track tickers you&apos;re researching. From the
          screener you can quick-add any asset to your default list.
        </p>
      </CardContent>
    </Card>
  );
}
