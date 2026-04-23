"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);

  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        // Supabase delivers the reset link back to this URL with an OTP that
        // the /callback handler exchanges into a short-lived session the
        // update-password page can use.
        redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(
          "/dashboard/settings",
        )}`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setSubmitting(false);
      return;
    }

    setSentTo(email);
    setSubmitting(false);
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader className="gap-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            Reset link sent
          </h1>
          <p className="text-sm text-text-muted">
            If an account exists for{" "}
            <span className="font-medium text-text-primary">{sentTo}</span>,
            we&apos;ve emailed a reset link. It expires in 60 minutes.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          Reset your password
        </h1>
        <p className="text-sm text-text-muted">
          Enter the email on your account and we&apos;ll send you a link to
          pick a new password.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
