import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { ensureUserProfile } from "@/app/actions/user";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlanBadge } from "@/components/plan-badge";
import { ProfileForm } from "@/components/dashboard/settings/profile-form";
import { PasswordForm } from "@/components/dashboard/settings/password-form";
import { ManageSubscriptionButton } from "@/components/dashboard/settings/manage-subscription-button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login?next=/dashboard/settings");

  // Self-healing: any authenticated user should have a Prisma profile. If
  // something went wrong in the sign-up / callback flow, fix it here.
  let profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  if (!profile) {
    await ensureUserProfile();
    profile = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      include: { subscription: true },
    });
  }

  const plan = profile?.subscription?.plan ?? "FREE";
  const email = profile?.email ?? authUser.email ?? "";
  const name = profile?.name ?? "";
  const periodEnd = profile?.subscription?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd = profile?.subscription?.cancelAtPeriodEnd ?? false;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
          Settings
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage your profile, password, and subscription.
        </p>
      </div>

      {/* Subscription card */}
      <Card>
        <CardHeader className="gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Subscription
            </h2>
            <PlanBadge plan={plan} />
          </div>
          <p className="text-sm text-text-muted">
            {plan === "FREE"
              ? "You're on the Free plan. Upgrade to unlock the full ARFA diagnostics, Valuation Lab, and Portfolio Intelligence."
              : plan === "PREMIUM"
              ? "Premium unlocks full diagnostics, the Valuation Lab, and Portfolio Intelligence."
              : "Pro adds team sharing, dashboards, real-time alerts, and API access."}
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {periodEnd && (
            <div className="rounded-md border border-border bg-surface-2 px-4 py-3 text-sm">
              <span className="text-text-muted">
                {cancelAtPeriodEnd ? "Cancels on" : "Renews on"}{" "}
              </span>
              <span className="font-medium text-text-primary">
                {new Date(periodEnd).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {plan === "FREE" ? (
              <Button asChild size="lg">
                <Link href="/pricing">
                  <Sparkles className="h-4 w-4" />
                  Upgrade
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <ManageSubscriptionButton />
            )}

            {plan !== "FREE" && (
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">Compare plans</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Profile
          </h2>
          <p className="text-sm text-text-muted">
            Your display name. Email is managed by your sign-in provider.
          </p>
        </CardHeader>
        <CardContent>
          <ProfileForm initialName={name} email={email} />
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Password
          </h2>
          <p className="text-sm text-text-muted">
            Set a new password. Minimum 8 characters.
          </p>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
