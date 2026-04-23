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
  apiVersion: "2024-12-18.acacia",
  typescript: true,
  appInfo: {
    name: "ARFA Markets",
    url: "https://arfa.global",
  },
});

/** Publishable key — safe to expose to the client. Re-exported here for
 *  convenience so server code fetching the checkout session can pass it
 *  through without importing another file. */
export const stripePublishableKey =
  process.env.STRIPE_PUBLISHABLE_KEY ?? "";
