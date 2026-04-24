import { NextResponse, type NextRequest } from "next/server";

import { requireUser, serviceError } from "@/lib/api/guard";
import { prisma } from "@/lib/prisma";
import { ensureUserProfile } from "@/app/actions/user";
import { listAssets, runAgentForAsset } from "@/lib/services/agent";

/**
 * GET  /api/v1/agent          → list the caller's tracked assets
 * POST /api/v1/agent          → { assetId } → queue an agent pass
 *
 * Both variants map the Supabase user to our internal Prisma user id
 * before touching the service layer, so services stay decoupled from
 * the auth provider.
 */

/** Resolve the Prisma User id for the Supabase session. Creates the
 *  row lazily via ensureUserProfile so first-time callers don't 404. */
async function getPrismaUserId(supabaseId: string): Promise<string | null> {
  await ensureUserProfile();
  const profile = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const userId = await getPrismaUserId(auth.user.id);
    if (!userId) {
      return NextResponse.json({ assets: [] });
    }
    return NextResponse.json({ assets: await listAssets(userId) });
  } catch (err) {
    return serviceError(err);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "JSON body required." },
      { status: 400 },
    );
  }
  const assetId = (body as { assetId?: string })?.assetId;
  if (!assetId) {
    return NextResponse.json(
      { error: "bad_request", message: "assetId is required." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await runAgentForAsset(assetId));
  } catch (err) {
    return serviceError(err);
  }
}
