/**
 * Analytics stub — central seam for product instrumentation.
 *
 * In production, swap the implementation below for whatever provider
 * lands (Posthog, Segment, Mixpanel, Amplitude, …). Call sites stay the
 * same, so this module is the only place that needs to change.
 *
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("upgrade_clicked", { plan: "PREMIUM", source: "pricing" });
 */

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Names of the events we already fire from the UI. Adding a new event?
 *  Append the literal here so callers get autocomplete + a typo-proof
 *  contract. Keep names snake_case and verb-driven. */
export type EventName =
  | "signup_completed"
  | "login_completed"
  | "upgrade_clicked"
  | "checkout_started"
  | "checkout_succeeded"
  | "asset_viewed"
  | "asset_search_select"
  | "screener_run"
  | "screener_saved"
  | "screener_exported"
  | "watchlist_created"
  | "watchlist_item_added"
  | "alert_created"
  | "portfolio_holding_added";

/**
 * Fire-and-forget. Never throws — analytics failures should never block
 * the user. Currently a console log gated to the browser; replace with
 * the real SDK call when one's wired.
 */
export function trackEvent(name: EventName, props: AnalyticsProps = {}): void {
  // SSR no-op so we don't accidentally double-count from server renders.
  if (typeof window === "undefined") return;

  try {
    // TODO: replace with `posthog.capture(name, props)` (or chosen
    // provider). Until then, devtools logs make wiring testable.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${name}`, props);
    }
  } catch {
    /* swallow — never let analytics break the UI */
  }
}

/** Identify the current user once their profile loads. Stub. */
export function identifyUser(userId: string, traits: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] identify ${userId}`, traits);
  }
}
