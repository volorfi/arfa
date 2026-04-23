import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";
import { canAccess, planMeetsTier } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanBadge } from "@/components/plan-badge";
import { AddHoldingForm } from "@/components/portfolio/add-holding-form";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary";
import { FragilityHeatmap } from "@/components/portfolio/fragility-heatmap";
import { ExportPortfolioButton } from "@/components/portfolio/export-portfolio-button";
import { computeFragility, computeHoldings } from "@/components/portfolio/compute";

export const metadata: Metadata = { title: "Portfolio" };

/**
 * Portfolio dashboard — Premium and above.
 *
 * Server component does the auth + plan check + Prisma read; the
 * computed shape is then passed to the client/server child components.
 *
 * Layered gating:
 *   FREE     → see the upgrade pitch (paywall card), nothing else
 *   PREMIUM  → holdings table + summary + Pro-locked fragility heatmap
 *   PRO      → everything, including fragility heatmap + export button
 */
export default async function PortfolioPage() {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null; // layout already redirects

  await ensureUserProfile();
  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  const plan = profile?.subscription?.plan ?? "FREE";

  // FREE → paywall the entire page.
  if (!planMeetsTier(plan, "PREMIUM")) {
    return <PortfolioPaywall />;
  }

  const portfolio = profile
    ? await prisma.portfolio.findUnique({
        where: { userId: profile.id },
        include: { holdings: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  const { computed: holdings, summary } = computeHoldings(portfolio?.holdings ?? []);
  const fragility = computeFragility(holdings);
  const showFragility = canAccess(plan, "fragility-heatmap") && holdings.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Add the positions you actually hold. ARFA scores roll up to a
            weighted view of your composite return / risk profile.
          </p>
        </div>
        <ExportPortfolioButton holdings={holdings} userPlan={plan} />
      </header>

      {/* Add-holding form */}
      <AddHoldingForm />

      {holdings.length > 0 && (
        <PortfolioSummaryCard
          summary={summary}
          baseCurrency={portfolio?.baseCurrency ?? "USD"}
        />
      )}

      <HoldingsTable holdings={holdings} />

      {/* Fragility heatmap (PRO) */}
      {holdings.length > 0 &&
        (showFragility ? (
          <FragilityHeatmap cells={fragility} />
        ) : (
          <FragilityPaywall />
        ))}
    </div>
  );
}

// ── Paywalls ────────────────────────────────────────────────────────────────

function PortfolioPaywall() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Portfolio
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Track the positions you hold and see them rolled up to ARFA scores.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-5 p-8">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-text-muted" />
            <PlanBadge plan="PREMIUM" />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
            Portfolio Intelligence is a Premium feature.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
            On Premium you can add holdings (asset, quantity, cost basis,
            purchase date), see weighted ARFA / Return / Risk scores across
            your portfolio, and unrealised P&amp;L per position. Pro adds
            the fragility heatmap and the exportable portfolio report.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/pricing">
                See plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FragilityPaywall() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-text-muted" />
            <PlanBadge plan="PRO" />
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-text-primary">
            Fragility heatmap
          </h3>
          <p className="max-w-xl text-sm text-text-muted">
            Surface which factor risks your portfolio is concentrated in —
            the cells turn red where a shock would hurt most. Available on
            Pro alongside real-time alerts and the priority queue.
          </p>
        </div>
        <Button asChild>
          <Link href="/pricing">
            Go Pro
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
