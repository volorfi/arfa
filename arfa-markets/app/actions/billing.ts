"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

/**
 * Create a Stripe Customer Portal session for the currently-signed-in user
 * and redirect them to it.
 *
 * Called from the settings page "Manage subscription" button. If the user
 * doesn't have a Stripe customer yet (they're still on FREE), we redirect
 * to /pricing instead so they can pick a plan.
 */
export async function createCustomerPortalSession() {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login?next=/dashboard/settings");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });

  const customerId = user?.subscription?.stripeCustomerId;
  if (!customerId) {
    // No paid plan yet — send them to upgrade instead of 500ing.
    redirect("/pricing");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl("/dashboard/settings"),
  });

  redirect(session.url);
}
