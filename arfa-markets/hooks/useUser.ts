"use client";

import * as React from "react";

import { createBrowserSupabase } from "@/lib/supabase";
import type { SubscriptionPlanValue } from "@/components/plan-badge";

export interface AppUser {
  id: string | null;
  supabaseId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  plan: SubscriptionPlanValue;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UseUserState {
  user: AppUser | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Client hook for reading the current user + plan.
 *
 *   const { user, loading, refresh } = useUser();
 *
 * Fetches `/api/me` on mount and whenever Supabase's auth state changes
 * (sign-in, sign-out, token refresh). That way the UI reacts to logout in
 * another tab without a full page reload. Call `refresh()` after any
 * mutation that might change the profile (e.g. updateDisplayName).
 */
export function useUser(): UseUserState & { refresh: () => Promise<void> } {
  const [state, setState] = React.useState<UseUserState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await fetch("/api/me", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok && res.status !== 401) {
        throw new Error(`GET /api/me failed: ${res.status}`);
      }
      const data = (await res.json()) as { user: AppUser | null };
      setState({ user: data.user, loading: false, error: null });
    } catch (err) {
      setState({
        user: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    void fetchMe().then(() => {
      if (cancelled) return;
    });

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // We refetch on sign-in / sign-out / token refresh. Ignore
      // USER_UPDATED as it fires for metadata-only writes we already
      // optimistically reflected via refresh().
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        void fetchMe();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchMe]);

  return { ...state, refresh: fetchMe };
}
