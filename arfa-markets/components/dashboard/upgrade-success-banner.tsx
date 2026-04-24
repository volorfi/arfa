"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PartyPopper, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * UpgradeSuccessBanner — renders when /dashboard loads with
 * ?upgrade=success (the Stripe checkout success_url). Auto-dismisses
 * after 5s; the dismiss button strips the query param so a refresh
 * doesn't resurrect the banner.
 *
 * Renders nothing if the param is absent, so it's safe to drop into
 * every dashboard page without gating.
 */
export function UpgradeSuccessBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("upgrade") === "success";

  const [visible, setVisible] = React.useState(isSuccess);

  // Keep visible in sync if the URL changes while the component is
  // mounted (rare, but possible via router.replace from elsewhere).
  React.useEffect(() => {
    setVisible(isSuccess);
  }, [isSuccess]);

  // Auto-dismiss + strip the query param after 5 seconds so a
  // subsequent refresh doesn't show the banner again.
  React.useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      // Clean the URL — shallow replace, no navigation.
      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      url.searchParams.delete("session_id");
      router.replace(url.pathname + (url.search || "") + url.hash);
    }, 5000);
    return () => window.clearTimeout(t);
  }, [visible, router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success md:px-5"
    >
      <div className="flex items-center gap-2.5">
        <PartyPopper className="h-4 w-4 shrink-0" aria-hidden />
        <p className="font-medium">
          Welcome to ARFA Premium! Your plan has been upgraded.
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          setVisible(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("upgrade");
          url.searchParams.delete("session_id");
          router.replace(url.pathname + (url.search || "") + url.hash);
        }}
        className="h-7 w-7 text-success hover:bg-success/20 hover:text-success"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
