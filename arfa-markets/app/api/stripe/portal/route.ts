import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

/**
 * POST /api/stripe/portal
 *
 * Returns a Stripe Billing Portal URL the client can redirect to. The
 * portal lets the customer update cards, change plans, download invoices,
 * and cancel — all without us building dedicated UI.
 *
 * Paired with the `createCustomerPortalSession` server action (which does
 * the same thing but via a server-side redirect). This REST endpoint
 * exists so client-side fetches can open the portal the same way they
 * open checkout — uniform `{ url }` contract on the response.
 *
 * Security: caller identity from the Supabase session cookie. Any
 * `userId` in the request body is ignored.
 */
export async function POST() {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });

  const customerId = profile?.subscription?.stripeCustomerId;
  if (!customerId) {
    // User is on FREE — no Stripe customer exists. Tell the client to
    // route them to /pricing instead of throwing.
    return NextResponse.json(
      { error: "No active subscription.", redirectTo: "/pricing" },
      { status: 409 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl("/dashboard/settings"),
  });

  return NextResponse.json({ url: session.url });
}
