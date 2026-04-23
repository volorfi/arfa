"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AssetClass as PrismaAssetClass } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { getPlanLimits, type PlanId } from "@/lib/plans";
import { ensureUserProfile } from "@/app/actions/user";

/**
 * Watchlist server actions — CRUD with plan-limit enforcement.
 *
 * All actions throw plain `Error` on failure. Client callers should
 * surface the message via toast.error(); the message is intentionally
 * user-facing (no stack traces) so it can be shown verbatim.
 *
 * Plan limits (enforced server-side, not just in UI):
 *   FREE     1 watchlist  / 10 items each
 *   PREMIUM  10           / 100
 *   PRO      50           / 500
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ContextUser {
  prismaUserId: string;
  plan: PlanId;
}

/** Look up the current user + plan, or throw 401-style. Idempotent: also
 *  ensures the User + Subscription rows exist (via ensureUserProfile). */
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

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateInput = z.object({
  name: z.string().trim().min(1, "Name required.").max(64, "Name too long."),
  color: z.string().trim().max(16).optional(),
});

const AddItemInput = z.object({
  watchlistId: z.string().min(1),
  symbol: z.string().trim().min(1).max(32),
  assetClass: z.enum(["EQUITY", "ETF", "BOND_CORP", "BOND_SOVEREIGN", "FX", "COMMODITY", "INDEX", "CRYPTO", "MACRO"]),
  notes: z.string().trim().max(280).optional(),
});

const RemoveItemInput = z.object({
  itemId: z.string().min(1),
});

const DeleteInput = z.object({
  watchlistId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new watchlist. Throws if the user is at their plan's limit. */
export async function createWatchlist(input: z.infer<typeof CreateInput>) {
  const data = CreateInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  const limits = getPlanLimits(plan);

  const count = await prisma.watchlist.count({ where: { userId: prismaUserId } });
  if (count >= limits.watchlists) {
    throw new Error(
      `${plan} plan is limited to ${limits.watchlists} watchlist${limits.watchlists === 1 ? "" : "s"}. Upgrade to add more.`,
    );
  }

  const created = await prisma.watchlist.create({
    data: {
      userId: prismaUserId,
      name: data.name,
      color: data.color ?? null,
    },
  });

  revalidatePath("/dashboard/watchlists");
  return { id: created.id };
}

/** Delete a watchlist (and all its items, via cascade). Caller must own it. */
export async function deleteWatchlist(input: z.infer<typeof DeleteInput>) {
  const { watchlistId } = DeleteInput.parse(input);
  const { prismaUserId } = await requireUser();

  // deleteMany so attempting to delete someone else's watchlist is a
  // no-op (count=0) instead of leaking that the row exists.
  const result = await prisma.watchlist.deleteMany({
    where: { id: watchlistId, userId: prismaUserId },
  });
  if (result.count === 0) {
    throw new Error("Watchlist not found.");
  }

  revalidatePath("/dashboard/watchlists");
  return { ok: true };
}

/** Add a symbol to a watchlist. Throws if the list would exceed the
 *  plan's per-list item cap, or if the symbol is already present
 *  (composite unique constraint on (watchlistId, symbol)). */
export async function addItemToWatchlist(input: z.infer<typeof AddItemInput>) {
  const data = AddItemInput.parse(input);
  const { prismaUserId, plan } = await requireUser();
  const limits = getPlanLimits(plan);

  const watchlist = await prisma.watchlist.findFirst({
    where: { id: data.watchlistId, userId: prismaUserId },
    include: { _count: { select: { items: true } } },
  });
  if (!watchlist) throw new Error("Watchlist not found.");

  if (watchlist._count.items >= limits.watchlistItems) {
    throw new Error(
      `${plan} plan caps each watchlist at ${limits.watchlistItems} items. Upgrade or remove items first.`,
    );
  }

  // Idempotent insert — if the symbol is already there, surface a clean
  // message instead of leaking the Prisma uniqueness error.
  try {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: data.watchlistId,
        symbol: data.symbol.toUpperCase(),
        assetClass: data.assetClass as PrismaAssetClass,
        notes: data.notes ?? null,
      },
    });
  } catch (err) {
    if (
      err instanceof Error &&
      // Prisma error code for uniqueness violation
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(`${data.symbol.toUpperCase()} is already on this watchlist.`);
    }
    throw err;
  }

  revalidatePath(`/dashboard/watchlists/${data.watchlistId}`);
  revalidatePath("/dashboard/watchlists");
  return { ok: true };
}

/** Remove an item by id. Caller must own its parent watchlist. */
export async function removeItemFromWatchlist(
  input: z.infer<typeof RemoveItemInput>,
) {
  const { itemId } = RemoveItemInput.parse(input);
  const { prismaUserId } = await requireUser();

  // Ownership check via the Watchlist join, deleteMany so it's safe.
  const result = await prisma.watchlistItem.deleteMany({
    where: { id: itemId, watchlist: { userId: prismaUserId } },
  });
  if (result.count === 0) throw new Error("Item not found.");

  // We don't know the parent watchlistId without a lookup; revalidate
  // the index page (cheap) and let the [id] page revalidate on its
  // next visit.
  revalidatePath("/dashboard/watchlists");
  return { ok: true };
}

/** Quick add from a screener row — picks the first watchlist or creates a
 *  default one if the user has none. Returns the watchlistId for
 *  client-side toast linkback. */
export async function quickAddToWatchlist(
  input: { symbol: string; assetClass: z.infer<typeof AddItemInput>["assetClass"] },
) {
  const { prismaUserId, plan } = await requireUser();
  const limits = getPlanLimits(plan);

  // Find first watchlist or create one (within plan limit).
  let target = await prisma.watchlist.findFirst({
    where: { userId: prismaUserId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });

  if (!target) {
    if (limits.watchlists < 1) {
      throw new Error(`${plan} plan does not allow watchlists.`);
    }
    const created = await prisma.watchlist.create({
      data: { userId: prismaUserId, name: "Default" },
    });
    target = { ...created, _count: { items: 0 } };
  }

  if (target._count.items >= limits.watchlistItems) {
    throw new Error(
      `Watchlist "${target.name}" is full (${limits.watchlistItems} items on ${plan}).`,
    );
  }

  await addItemToWatchlist({
    watchlistId: target.id,
    symbol: input.symbol,
    assetClass: input.assetClass,
  });

  return { watchlistId: target.id, watchlistName: target.name };
}
