import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";
import { planMeetsTier } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanBadge } from "@/components/plan-badge";
import { CreateAlertForm } from "@/components/alerts/create-alert-form";
import { AlertsList, type AlertRow } from "@/components/alerts/alerts-list";
import type { AlertDeliveryMethod } from "@/lib/alerts";

export const metadata: Metadata = { title: "Alerts" };

/**
 * Alerts dashboard. PREMIUM and above. PRO unlocks real-time push
 * delivery in the create form (gated client-side, re-checked server-side
 * in the action).
 */
export default async function AlertsPage() {
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
  const plan = profile?.subscription?.plan ?? "FREE";

  if (!planMeetsTier(plan, "PREMIUM")) {
    return <AlertsPaywall />;
  }

  const alerts = profile
    ? await prisma.alert.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const rows: AlertRow[] = alerts.map((a) => ({
    id: a.id,
    assetId: a.assetId,
    assetName: a.assetName,
    ticker: a.ticker,
    conditionJson: a.conditionJson,
    deliveryMethod: a.deliveryMethod as AlertDeliveryMethod,
    status: a.status,
    triggeredAt: a.triggeredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Alerts
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {rows.length === 0
            ? "Set thresholds; we'll tell you when an asset crosses them."
            : `${rows.length} of ${plan === "PRO" ? 25 : 5} alerts on ${plan}.`}
        </p>
      </header>

      <CreateAlertForm />
      <AlertsList rows={rows} />
    </div>
  );
}

function AlertsPaywall() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Alerts
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Never miss when an asset&apos;s ARFA score moves.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-5 p-8">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-text-muted" />
            <PlanBadge plan="PREMIUM" />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
            Alerts are a Premium feature.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
            On Premium you can set in-app and email alerts: ARFA Ratio
            changes by ±N, factor scores cross thresholds, risk score
            shifts. Pro adds real-time push notifications for the same
            triggers.
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
