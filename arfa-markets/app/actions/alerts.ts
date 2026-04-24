"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { planMeetsTier, type PlanId } from "@/lib/plans";
import {
  DELIVERY_REQUIRED_PLAN,
  KIND_TO_PRISMA_TYPE,
  type AlertCondition,
  type AlertDeliveryMethod,
} from "@/lib/alerts";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * Alert server actions.
 *
 * Alerts are PREMIUM and above. Real-time push alerts are PRO-only.
 * This file does not actually send anything — it persists the row and
 * stubs the delivery handler. The cron worker that fans out triggers to
 * email / push lives outside this PR.
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
    throw new Error("Alerts require a Premium plan.");
  }
}

/** Per-plan cap on total alerts. PREMIUM: 5. PRO: 25. FREE shouldn't reach
 *  this (gate above catches it) but we return 0 as a safety net. */
function alertCapForPlan(plan: PlanId): number {
  if (plan === "PRO") return 25;
  if (plan === "PREMIUM") return 5;
  return 0;
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const ConditionInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ratio_change"), delta: z.number().min(0.5).max(6) }),
  z.object({
    kind: z.literal("factor_drop"),
    factorKey: z.string().min(1),
    threshold: z.number().min(1).max(7),
  }),
  z.object({
    kind: z.literal("factor_rise"),
    factorKey: z.string().min(1),
    threshold: z.number().min(1).max(7),
  }),
  z.object({
    kind: z.literal("risk_threshold"),
    threshold: z.number().min(1).max(7),
    direction: z.enum(["above", "below"]),
  }),
]);

const CreateInput = z.object({
  assetId: z.string().min(1),
  assetName: z.string().min(1).max(256),
  ticker: z.string().min(1).max(32),
  condition: ConditionInput,
  deliveryMethod: z.enum(["IN_APP", "EMAIL", "PUSH"]),
});

const IdInput = z.object({ alertId: z.string().min(1) });

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createAlert(input: z.infer<typeof CreateInput>) {
  const data = CreateInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  requirePremium(plan);

  // Per-plan total-alert cap. Count across ACTIVE + PAUSED (archived rows
  // are free). Done before Stripe-delivery checks so a user at their cap
  // gets the clearer message.
  const cap = alertCapForPlan(plan);
  const existing = await prisma.alert.count({
    where: {
      userId: prismaUserId,
      status: { in: ["ACTIVE", "PAUSED"] },
    },
  });
  if (existing >= cap) {
    throw new Error(
      `${plan} plan is limited to ${cap} alerts. Remove one or upgrade to add more.`,
    );
  }

  // Delivery method gate: PUSH is PRO-only.
  const requiredForDelivery = DELIVERY_REQUIRED_PLAN[data.deliveryMethod as AlertDeliveryMethod];
  if (!planMeetsTier(plan, requiredForDelivery)) {
    throw new Error(
      `${requiredForDelivery === "PRO" ? "Real-time push" : "Email"} alerts require the ${requiredForDelivery} plan.`,
    );
  }

  const created = await prisma.alert.create({
    data: {
      userId: prismaUserId,
      type: KIND_TO_PRISMA_TYPE[data.condition.kind],
      assetId: data.assetId,
      assetName: data.assetName,
      ticker: data.ticker.toUpperCase(),
      conditionJson: data.condition as unknown as Prisma.InputJsonValue,
      deliveryMethod: data.deliveryMethod,
    },
  });

  revalidatePath("/dashboard/alerts");
  return { id: created.id };
}

export async function deleteAlert(input: z.infer<typeof IdInput>) {
  const { alertId } = IdInput.parse(input);
  const { prismaUserId } = await requireUser();
  const result = await prisma.alert.deleteMany({
    where: { id: alertId, userId: prismaUserId },
  });
  if (result.count === 0) throw new Error("Alert not found.");
  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function pauseAlert(input: z.infer<typeof IdInput>) {
  const { alertId } = IdInput.parse(input);
  const { prismaUserId } = await requireUser();
  const result = await prisma.alert.updateMany({
    where: { id: alertId, userId: prismaUserId, status: "ACTIVE" },
    data: { status: "PAUSED" },
  });
  if (result.count === 0) throw new Error("Alert not found or already paused.");
  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

export async function resumeAlert(input: z.infer<typeof IdInput>) {
  const { alertId } = IdInput.parse(input);
  const { prismaUserId } = await requireUser();
  const result = await prisma.alert.updateMany({
    where: { id: alertId, userId: prismaUserId, status: "PAUSED" },
    data: { status: "ACTIVE" },
  });
  if (result.count === 0) throw new Error("Alert not found or already active.");
  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

// ── Stub delivery handler ───────────────────────────────────────────────────
// TODO: replace with real fan-out to Resend / push provider when the
// scoring engine wires up the trigger evaluator.
export async function deliverAlertStub(payload: {
  alertId: string;
  userId: string;
  ticker: string;
  description: string;
  via: AlertDeliveryMethod;
}): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `[alerts] would deliver alert ${payload.alertId} to user ${payload.userId} via ${payload.via}: ${payload.ticker} → ${payload.description}`,
  );
}
