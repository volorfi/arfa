import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { resolvePriceId } from "@/lib/stripe-prices";
import { absoluteUrl } from "@/lib/utils";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the caller, returning the hosted
 * checkout URL. The client opens `response.url` (usually with
 * `window.location.href = url`) to start the flow.
 *
 * Security notes:
 *   · We ignore any `userId` in the request body. The authenticated user
 *     comes from Supabase session cookies — never trust client claims
 *     about identity.
 *   · Client sends `{ plan, interval }`; the server resolves the Stripe
 *     priceId via `resolvePriceId`. So a tampered body can't push the
 *     user into a non-existent / discounted price.
 *   · Stripe Customer is created lazily and cached on the Subscription row
 *     so repeated upgrades reuse the same customer (one customer per user).
 */

const BodySchema = z.object({
  plan: z.enum(["PREMIUM", "PRO"]),
  interval: z.enum(["month", "year"]),
});

export async function POST(req: NextRequest) {
  // Validate body
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      {
        error:
          "Request must be JSON: { plan: 'PREMIUM' | 'PRO', interval: 'month' | 'year' }.",
      },
      { status: 400 },
    );
  }

  // Resolve the Stripe price id server-side.
  const priceId = resolvePriceId(body.plan, body.interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Pricing is not configured yet for ${body.plan} (${body.interval}).`,
      },
      { status: 500 },
    );
  }

  // Identify the caller
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    // Not signed in — tell the client to route through /register first.
    return NextResponse.json(
      {
        error: "Not authenticated.",
        redirectTo: `/register?next=${encodeURIComponent("/pricing")}`,
      },
      { status: 401 },
    );
  }

  // Make sure the Prisma profile + subscription row exist. Idempotent.
  await ensureUserProfile();

  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  if (!profile || !profile.subscription) {
    return NextResponse.json(
      { error: "Profile not available. Try again." },
      { status: 500 },
    );
  }

  // Get or create a Stripe customer for this user.
  let stripeCustomerId = profile.subscription.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.name ?? undefined,
      // Metadata lets the webhook find our user even if the subscription
      // isn't attached to the session yet.
      metadata: {
        supabaseId: profile.supabaseId,
        userId: profile.id,
      },
    });
    stripeCustomerId = customer.id;
    await prisma.subscription.update({
      where: { userId: profile.id },
      data: { stripeCustomerId },
    });
  }

  // Create the Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    // Propagate identity to the session AND the resulting Subscription so
    // every webhook event we receive can resolve our user id locally
    // without extra DB lookups.
    client_reference_id: profile.id,
    metadata: {
      userId: profile.id,
      supabaseId: profile.supabaseId,
      planId: body.plan,
      interval: body.interval,
    },
    subscription_data: {
      metadata: {
        userId: profile.id,
        supabaseId: profile.supabaseId,
      },
    },
    // Land users back on the dashboard so they see their upgraded plan
    // reflected immediately. The `upgrade=success` query param lets the
    // dashboard surface a toast.
    success_url: absoluteUrl("/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: absoluteUrl("/pricing"),
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
