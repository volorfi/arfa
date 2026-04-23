"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

/**
 * Ensure the authenticated Supabase user has a matching Prisma User +
 * Subscription row. Idempotent (upsert); safe to call repeatedly.
 *
 *   · After password sign-up (from the register page)
 *   · From the OAuth callback route (first-time Google sign-in)
 *   · From any dashboard page as a self-healing guard
 *
 * Creates a FREE / ACTIVE subscription on first run so every user has a
 * concrete plan row from day one — no null subscription branches needed.
 */
export async function ensureUserProfile(input?: { name?: string }) {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { ok: false as const, error: "not_authenticated" };
  }

  const displayName =
    input?.name?.trim() ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    null;

  const avatar =
    (authUser.user_metadata?.avatar_url as string | undefined) ||
    (authUser.user_metadata?.picture as string | undefined) ||
    null;

  // Upsert the User, and ensure a Subscription exists via connectOrCreate.
  await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      email: authUser.email ?? "",
      // Only overwrite name/image if we got something non-empty, otherwise
      // keep whatever the user previously set via the settings page.
      ...(displayName ? { name: displayName } : {}),
      ...(avatar ? { image: avatar } : {}),
    },
    create: {
      supabaseId: authUser.id,
      email: authUser.email ?? "",
      name: displayName,
      image: avatar,
      subscription: {
        create: { plan: "FREE", status: "ACTIVE" },
      },
    },
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}

/** Update the display name. Returns a tiny result shape suitable for
 *  optimistic UI or form-state reducers. */
export async function updateDisplayName(formData: FormData) {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { ok: false as const, error: "not_authenticated" };

  const raw = formData.get("name");
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length === 0 || name.length > 120) {
    return { ok: false as const, error: "Name must be 1–120 characters." };
  }

  await prisma.user.update({
    where: { supabaseId: authUser.id },
    data: { name },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}
