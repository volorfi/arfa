/**
 * auth.ts — Authentication system (replaces Manus sdk.ts + oauth.ts)
 *
 * MIGRATION: Manus OAuth → direct Google OAuth 2.0
 *
 * Flow:
 *   1. /api/auth/google         → redirects to Google consent screen
 *   2. /api/auth/google/callback → exchanges code, upserts user, sets JWT cookie
 *   3. /api/auth/logout          → clears cookie
 *
 * Session JWTs use the same JWT_SECRET and cookie name as before,
 * so existing sessions issued by Manus remain valid during rollover.
 *
 * Setup:
 *   Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
 *   Authorised redirect URI: https://yourdomain.com/api/auth/google/callback
 *   Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_BASE_URL in your .env
 */

import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import type { User } from "../../drizzle/schema";
import { ForbiddenError } from "@shared/_core/errors";

// ── Session JWT ───────────────────────────────────────────────────────────────

const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

export async function signSession(payload: { openId: string; name: string }): Promise<string> {
  return new SignJWT({ openId: payload.openId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secretKey());
}

export async function verifySession(cookie: string | undefined | null): Promise<{ openId: string; name: string } | null> {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, secretKey(), { algorithms: ["HS256"] });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    return { openId, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}

// ── Google OAuth helpers ──────────────────────────────────────────────────────

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v2/userinfo";

function callbackUrl() {
  return `${ENV.appBaseUrl}/api/auth/google/callback`;
}

async function exchangeGoogleCode(code: string): Promise<{ access_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri:  callbackUrl(),
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json();
}

async function getGoogleUser(accessToken: string): Promise<{ id: string; name: string; email: string }> {
  const res = await fetch(GOOGLE_USER_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google user info failed: ${res.status}`);
  return res.json();
}

// ── Authenticate an incoming request (used by tRPC context) ───────────────────

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = req.headers.cookie ?? "";
  const match   = cookies.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const session = await verifySession(match?.[1]);

  if (!session) throw ForbiddenError("Invalid or missing session");

  let user = await db.getUserByOpenId(session.openId);

  if (!user) {
    // Session exists but user was deleted — clean slate
    await db.upsertUser({ openId: session.openId, name: session.name ?? null, email: null, loginMethod: "google", lastSignedIn: new Date() });
    user = await db.getUserByOpenId(session.openId);
  }

  if (!user) throw ForbiddenError("User not found");

  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

// ── Express OAuth routes ──────────────────────────────────────────────────────

export function registerAuthRoutes(app: Express) {
  // 1. Start Google OAuth flow
  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured" });
      return;
    }
    const params = new URLSearchParams({
      client_id:     ENV.googleClientId,
      redirect_uri:  callbackUrl(),
      response_type: "code",
      scope:         "openid email profile",
      access_type:   "online",
    });
    res.redirect(302, `${GOOGLE_AUTH_URL}?${params}`);
  });

  // 2. Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code  = typeof req.query.code  === "string" ? req.query.code  : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;

    if (error || !code) {
      console.error("[Auth] Google OAuth error:", error);
      res.redirect(302, "/?auth=error");
      return;
    }

    try {
      const token    = await exchangeGoogleCode(code);
      const gUser    = await getGoogleUser(token.access_token);

      // openId = "google_<google_id>" — namespaced to avoid collisions
      const openId = `google_${gUser.id}`;

      await db.upsertUser({
        openId,
        name:        gUser.name ?? null,
        email:       gUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await signSession({ openId, name: gUser.name ?? "" });
      const cookieOpts   = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOpts, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err) {
      console.error("[Auth] Google callback failed:", err);
      res.redirect(302, "/?auth=error");
    }
  });

  // 3. Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const opts = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { path: opts.path, domain: opts.domain, secure: opts.secure, httpOnly: opts.httpOnly, sameSite: opts.sameSite });
    res.json({ ok: true });
  });

  // Backwards-compat redirect — Manus sent users to /api/oauth/callback
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/api/auth/google");
  });
}
