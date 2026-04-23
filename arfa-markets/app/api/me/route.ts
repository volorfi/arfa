import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/me — shape consumed by the client-side useUser() hook.
 *
 * Returns 200 with { user: null } for unauthenticated requests (easier to
 * branch on in the hook than a 401 exception). 401 is reserved for genuine
 * token errors.
 */
export async function GET() {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return NextResponse.json(
      { user: null, error: error.message },
      { status: 401 },
    );
  }
  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const profile = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { subscription: true },
  });

  return NextResponse.json({
    user: profile
      ? {
          id: profile.id,
          supabaseId: profile.supabaseId,
          email: profile.email,
          name: profile.name,
          image: profile.image,
          plan: profile.subscription?.plan ?? "FREE",
          status: profile.subscription?.status ?? "ACTIVE",
          currentPeriodEnd:
            profile.subscription?.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd:
            profile.subscription?.cancelAtPeriodEnd ?? false,
        }
      : // Authenticated in Supabase but no profile row yet — surface enough
        // info for the client to render, and rely on ensureUserProfile() to
        // fill in the profile on the next write path.
        {
          id: null,
          supabaseId: authUser.id,
          email: authUser.email ?? null,
          name: null,
          image: null,
          plan: "FREE" as const,
          status: "ACTIVE" as const,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
  });
}
