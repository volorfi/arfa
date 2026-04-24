import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { planFromPriceId } from "@/lib/stripe-prices";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

/**
 * POST /api/stripe/webhook
 *
 * Stripe calls this endpoint whenever a subscription event happens. We
 * verify the signature with STRIPE_WEBHOOK_SECRET, then fan out to one of
 * three handlers.
 *
 * Important:
 *   · This route is EXCLUDED from the middleware matcher (see
 *     middleware.ts) because middleware wraps the response and mutates
 *     cookies, which would break raw-body signature verification.
 *   · Route handlers in Next 14 App Router don't parse JSON by default;
 *     `await req.text()` gives us the untouched body Stripe signed.
 *   · We set `runtime = "nodejs"` explicitly — Edge Runtime doesn't
 *     support the `stripe` Node client reliably.
 *   · All handlers are idempotent so replays (which Stripe does on
 *     non-2xx responses) don't corrupt state.
 */

export const runtime = "nodejs";
// No point caching a POST; make sure Next doesn't try.
export const dynamic = "force-dynamic";

const HANDLED_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }
  if (!webhookSecret) {
    // Fail loud — deploying without a webhook secret would silently accept
    // forged events. Stripe retries the delivery and alerts appear in the
    // dashboard, so returning 500 is the right signal here.
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(
      "[stripe/webhook] signature verification failed:",
      (err as Error).message,
    );
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 },
    );
  }

  // Early-out on events we don't care about; respond 200 so Stripe stops
  // retrying. This is recommended over returning 400 for untracked events.
  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
    }
  } catch (err) {
    // Log + 500 so Stripe retries — we want retries for transient DB
    // errors, but NOT for malformed events, which are caught above.
    console.error(
      `[stripe/webhook] handler for ${event.type} failed:`,
      err,
    );
    return NextResponse.json(
      { error: "Handler error; Stripe should retry." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, handled: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 *
 * Fires when the customer finishes Stripe Checkout. The session contains
 * the Stripe subscription id; we pull the full subscription to read plan +
 * period end, then persist onto our Subscription row.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // We only care about subscription checkouts — ignore one-off payments
  // and setup sessions (which reuse this event type).
  if (session.mode !== "subscription") return;
  if (!session.subscription) return;

  const userId = resolveUserIdFromMetadata(session.metadata);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await writeSubscription(userId, session.customer, subscription);
}

/**
 * customer.subscription.updated
 *
 * Fires on plan changes, renewal, cancellation scheduling, payment
 * failures — any lifecycle transition. We mirror the Stripe state onto
 * our row so the UI reads it as truth.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = resolveUserIdFromMetadata(subscription.metadata);
  await writeSubscription(userId, subscription.customer, subscription);
}

/**
 * customer.subscription.deleted
 *
 * Fires when the subscription is fully cancelled (either immediately or
 * at period end after a cancellation). Downgrade to FREE and mark as
 * CANCELED. Keep the stripeCustomerId so future upgrades reuse it.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = resolveUserIdFromMetadata(subscription.metadata);

  await prisma.subscription.updateMany({
    where: userId
      ? { userId }
      : { stripeSubscriptionId: subscription.id },
    data: {
      plan: "FREE",
      status: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared persistence
// ─────────────────────────────────────────────────────────────────────────────

/** Write subscription + customer fields onto our Subscription row. Routes
 *  by userId if the metadata carried it; otherwise falls back to locating
 *  the row via stripeCustomerId or stripeSubscriptionId. */
async function writeSubscription(
  userId: string | null,
  customerParam: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof customerParam === "string"
      ? customerParam
      : customerParam && "id" in customerParam
        ? customerParam.id
        : null;

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? planFromPriceId(priceId) : null;

  // planFromPriceId is a narrow "PREMIUM" | "PRO" union; we fall back to
  // FREE when the price id didn't resolve. Prisma wants its own enum
  // type on updateMany — narrow the union directly to SubscriptionPlan.
  const plan: SubscriptionPlan = planInfo?.plan ?? "FREE";
  const data = {
    plan,
    status: mapStripeStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId ?? null,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  // Preference order for locating the row:
  //   1. explicit userId from metadata (stamped by /api/stripe/checkout)
  //   2. existing stripeCustomerId (fallback if metadata lost)
  //   3. existing stripeSubscriptionId (paranoid fallback)
  if (userId) {
    await prisma.subscription.updateMany({
      where: { userId },
      data,
    });
    return;
  }
  if (customerId) {
    const updated = await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data,
    });
    if (updated.count > 0) return;
  }
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data,
  });
}

/** Read our userId from Stripe metadata. Returns null if not present. */
function resolveUserIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  const id = metadata?.userId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Translate Stripe's subscription status string to our Prisma enum. */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "paused":
      // Treat paused as PAST_DUE so UI prompts action; we don't have a
      // dedicated PAUSED enum value and adding one now would require a
      // migration.
      return "PAST_DUE";
    default: {
      // Exhaustiveness check — compile error if Stripe adds a status.
      const _never: never = status;
      void _never;
      return "ACTIVE";
    }
  }
}
