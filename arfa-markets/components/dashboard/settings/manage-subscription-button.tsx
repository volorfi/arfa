"use client";

import * as React from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { createCustomerPortalSession } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

/**
 * "Manage subscription" — calls a server action that mints a Stripe
 * Customer Portal session and server-redirects the user to it.
 */
export function ManageSubscriptionButton() {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      await createCustomerPortalSession();
      // On success the server action redirects — we never reach here.
      // On failure the action throws and the transition resolves; the
      // error boundary (or Next's error.tsx) will surface it.
    });
  }

  return (
    <Button size="lg" onClick={handleClick} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      Manage subscription
    </Button>
  );
}
