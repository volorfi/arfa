"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createBrowserSupabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

// Same pattern as /login — wrap the useSearchParams-using form in
// <Suspense> so Next 14's static-page pass doesn't fail.
export default function RegisterPage() {
  return (
    <React.Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </React.Suspense>
  );
}

function RegisterFallback() {
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <div className="h-6 w-52 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-2" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const supabase = React.useMemo(() => createBrowserSupabase(), []);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [oauthPending, setOauthPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = React.useState<string | null>(null);

  function validate(): string | null {
    if (name.trim().length === 0) return "Please enter your name.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords don't match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored as `user_metadata.full_name` — we'll read it in
        // ensureUserProfile to seed the display name for OAuth flows, and
        // for password flows we also pass it explicitly below.
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      // Email confirmation disabled in Supabase project — user is already
      // signed in. Create the Prisma profile row and go to dashboard.
      const result = await ensureUserProfile({ name: name.trim() });
      if (!result.ok) {
        setError(
          "Account created but profile setup failed. Try signing in.",
        );
        setSubmitting(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
      return;
    }

    // Email confirmation enabled — user must click the link in the email.
    // Show a confirmation state; the profile row gets created later in the
    // /callback route.
    setEmailSentTo(email);
    setSubmitting(false);
  }

  async function handleGoogle() {
    setError(null);
    setOauthPending(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthPending(false);
    }
  }

  if (emailSentTo) {
    return (
      <Card>
        <CardHeader className="gap-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            Check your email
          </h1>
          <p className="text-sm text-text-muted">
            We sent a confirmation link to{" "}
            <span className="font-medium text-text-primary">{emailSentTo}</span>.
            Click it to finish creating your account.
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
          Create your ARFA account
        </h1>
        <p className="text-sm text-text-muted">
          Free forever. Upgrade when you need more.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogle}
          disabled={oauthPending || submitting}
        >
          {oauthPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Sign up with Google
        </Button>

        <Divider label="or" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-text-faint">At least 8 characters.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <Button type="submit" size="lg" disabled={submitting || oauthPending}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-xs text-text-faint">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-text-muted">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-text-muted">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
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

function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex-1 border-t border-border" />
      <span className="mx-3 text-xs uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.35-1.59-5.06-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.94 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.98-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.98 2.33C4.65 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
