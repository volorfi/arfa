"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AssetClass as PrismaAssetClass } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { planMeetsTier, type PlanId } from "@/lib/plans";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * Portfolio server actions — gated to PREMIUM and above.
 *
 * Portfolio rows are created lazily: the first addHolding call for a
 * user spins up the Portfolio row alongside the holding. Users on FREE
 * never see this section in the UI, but every action re-checks the
 * plan server-side as defence in depth.
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

function requirePremium(plan: PlanId): void {
  if (!planMeetsTier(plan, "PREMIUM")) {
    throw new Error("Portfolio Intelligence is a Premium feature. Upgrade to add holdings.");
  }
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const AddInput = z.object({
  assetId: z.string().min(1),
  displayName: z.string().trim().min(1).max(256),
  ticker: z.string().trim().min(1).max(32),
  assetClass: z.enum([
    "EQUITY",
    "ETF",
    "BOND_CORP",
    "BOND_SOVEREIGN",
    "FX",
    "COMMODITY",
    "INDEX",
    "CRYPTO",
    "MACRO",
  ]),
  quantity: z.number().positive("Quantity must be > 0."),
  purchasePrice: z.number().positive("Price must be > 0."),
  purchaseDate: z
    .string()
    .min(1, "Date required.")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date."),
});

const UpdateInput = z.object({
  holdingId: z.string().min(1),
  quantity: z.number().positive().optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseDate: z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date.")
    .optional(),
});

const RemoveInput = z.object({
  holdingId: z.string().min(1),
});

// ── Actions ─────────────────────────────────────────────────────────────────

/** Add a holding. Lazily creates the Portfolio row if one doesn't exist. */
export async function addHolding(input: z.infer<typeof AddInput>) {
  const data = AddInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  requirePremium(plan);

  // Ensure portfolio exists. Upsert is concise but a 2-step is clearer
  // about intent.
  let portfolio = await prisma.portfolio.findUnique({
    where: { userId: prismaUserId },
  });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: { userId: prismaUserId },
    });
  }

  await prisma.portfolioHolding.create({
    data: {
      portfolioId: portfolio.id,
      assetId: data.assetId,
      displayName: data.displayName,
      ticker: data.ticker.toUpperCase(),
      assetClass: data.assetClass as PrismaAssetClass,
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      purchaseDate: new Date(data.purchaseDate),
    },
  });

  revalidatePath("/dashboard/portfolio");
  return { ok: true };
}

/** Update an existing holding. Caller must own it. */
export async function updateHolding(input: z.infer<typeof UpdateInput>) {
  const data = UpdateInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  requirePremium(plan);

  const result = await prisma.portfolioHolding.updateMany({
    where: {
      id: data.holdingId,
      portfolio: { userId: prismaUserId },
    },
    data: {
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.purchasePrice !== undefined
        ? { purchasePrice: data.purchasePrice }
        : {}),
      ...(data.purchaseDate
        ? { purchaseDate: new Date(data.purchaseDate) }
        : {}),
    },
  });
  if (result.count === 0) throw new Error("Holding not found.");

  revalidatePath("/dashboard/portfolio");
  return { ok: true };
}

/** Remove a holding. */
export async function removeHolding(input: z.infer<typeof RemoveInput>) {
  const { holdingId } = RemoveInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  requirePremium(plan);

  const result = await prisma.portfolioHolding.deleteMany({
    where: {
      id: holdingId,
      portfolio: { userId: prismaUserId },
    },
  });
  if (result.count === 0) throw new Error("Holding not found.");

  revalidatePath("/dashboard/portfolio");
  return { ok: true };
}
