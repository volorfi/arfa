import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

/**
 * Placeholder dashboard landing. Real watchlist / screener / insights
 * widgets will land in follow-up builds.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Your watchlists, screens, and alerts will live here. Nothing to
          show yet — jump into settings or start researching.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Account settings
            </h2>
            <p className="text-sm text-text-muted">
              Profile, password, and subscription.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                Open settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Explore pricing
            </h2>
            <p className="text-sm text-text-muted">
              See what Premium and Pro unlock.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/pricing">
                Compare plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
