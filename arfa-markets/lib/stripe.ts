import Stripe from "stripe";

/**
 * Stripe singleton, server-side only.
 *
 * Do not import this file from client components — it would leak the secret
 * key into the client bundle. `import "server-only"` makes that a build-time
 * error instead of a runtime leak.
 */
import "server-only";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Copy .env.local.example → .env.local and add it.",
  );
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
  appInfo: {
    name: "ARFA Markets",
    url: "https://arfa.global",
  },
});

/** Publishable key — safe to expose to the client (it IS public). We
 *  read it from NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY so client bundles can
 *  also reference `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
 *  directly when wiring Stripe.js on the checkout page. Re-exported here
 *  for server callers that want to pass it through without another
 *  import. */
export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
