"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { getPlanLimits, planMeetsTier, type PlanId } from "@/lib/plans";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * Saved screen actions — Premium and above.
 *
 * The `filters` payload is opaque JSON: the screener UI evolves
 * frequently and we don't want a schema migration for every new field.
 * Server-side we sanity-check that it's a JSON-serialisable object, but
 * we don't validate its shape.
 */

interface ContextUser {
  prismaUserId: string;
  plan: PlanId;
}

async function requireUser(): Promise<ContextUser> {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("You must be signed in.");

  await ensureUserProfile();
  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });
  if (!profile) throw new Error("Profile not available. Try again.");
  return {
    prismaUserId: profile.id,
    plan: profile.subscription?.plan ?? "FREE",
  };
}

const SaveScreenInput = z.object({
  name: z.string().trim().min(1).max(64),
  filters: z.record(z.unknown()),
});

export async function saveScreen(input: z.infer<typeof SaveScreenInput>) {
  const data = SaveScreenInput.parse(input);
  const { prismaUserId, plan } = await requireUser();

  // Plan check — saving screens beyond the FREE quota requires Premium.
  if (!planMeetsTier(plan, "PREMIUM")) {
    const limits = getPlanLimits(plan);
    const existing = await prisma.savedScreen.count({
      where: { userId: prismaUserId },
    });
    if (existing >= limits.savedScreens) {
      throw new Error(
        `${plan} plan caps saved screens at ${limits.savedScreens}. Upgrade to Premium for 25.`,
      );
    }
  }

  // Premium / Pro: still bounded by limits.
  if (planMeetsTier(plan, "PREMIUM")) {
    const limits = getPlanLimits(plan);
    const existing = await prisma.savedScreen.count({
      where: { userId: prismaUserId },
    });
    if (existing >= limits.savedScreens) {
      throw new Error(
        `${plan} plan caps saved screens at ${limits.savedScreens}.`,
      );
    }
  }

  const created = await prisma.savedScreen.create({
    data: {
      userId: prismaUserId,
      name: data.name,
      // Zod validates structure as a JSON-compatible record; the cast
      // narrows it to Prisma's InputJsonValue type.
      filters: data.filters as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/dashboard/screener");
  return { id: created.id };
}
