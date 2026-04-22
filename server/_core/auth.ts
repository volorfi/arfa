import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import {
  SignJWT,
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

type SessionPayload = {
  openId: string;
  name: string;
};

type StatePayload = {
  nonce: string;
  returnTo: string;
};

type GoogleTokenResponse = {
  id_token?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type GoogleIdClaims = JWTPayload & {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
};

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function buildRedirectUri(req: Request): string {
  if (ENV.appBaseUrl) {
    return `${ENV.appBaseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ||
    req.protocol;
  const host = req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

async function signState(payload: StatePayload): Promise<string> {
  const expSeconds = Math.floor((Date.now() + OAUTH_STATE_MAX_AGE_MS) / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expSeconds)
    .sign(getSecretKey());
}

async function verifyState(token: string): Promise<StatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const { nonce, returnTo } = payload as Record<string, unknown>;
    if (typeof nonce !== "string" || typeof returnTo !== "string") return null;
    return { nonce, returnTo };
  } catch {
    return null;
  }
}

async function signSession(payload: SessionPayload): Promise<string> {
  const expSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId: payload.openId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expSeconds)
    .sign(getSecretKey());
}

async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || openId.length === 0) return null;
    return { openId, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}

async function exchangeCodeForIdToken(
  code: string,
  redirectUri: string
): Promise<GoogleIdClaims> {
  const body = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Google token exchange failed (${response.status} ${response.statusText}): ${detail}`
    );
  }

  const data = (await response.json()) as GoogleTokenResponse;
  if (!data.id_token) {
    throw new Error("Google token response missing id_token");
  }

  const { payload } = await jwtVerify(data.id_token, jwks, {
    issuer: GOOGLE_ISSUERS,
    audience: ENV.googleClientId,
  });

  return payload as GoogleIdClaims;
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function parseCookies(req: Request): Map<string, string> {
  const header = req.headers.cookie;
  if (!header) return new Map();
  return new Map(Object.entries(parseCookieHeader(header)));
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(500).json({ error: "Google OAuth is not configured" });
      return;
    }

    const nonce = crypto.randomUUID().replace(/-/g, "");
    const returnTo = getQueryParam(req, "returnTo") || "/";
    const state = await signState({ nonce, returnTo });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      ...cookieOptions,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    const redirectUri = buildRedirectUri(req);
    const authUrl = new URL(GOOGLE_AUTHORIZE_URL);
    authUrl.searchParams.set("client_id", ENV.googleClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "online");
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("state", state);

    res.redirect(302, authUrl.toString());
  });

  app.get(
    "/api/auth/google/callback",
    async (req: Request, res: Response) => {
      const code = getQueryParam(req, "code");
      const state = getQueryParam(req, "state");

      if (!code || !state) {
        res.status(400).json({ error: "code and state are required" });
        return;
      }

      const statePayload = await verifyState(state);
      if (!statePayload) {
        res.status(400).json({ error: "Invalid or expired state" });
        return;
      }

      const cookies = parseCookies(req);
      const storedNonce = cookies.get(OAUTH_STATE_COOKIE);
      if (!storedNonce || storedNonce !== statePayload.nonce) {
        res.status(400).json({ error: "State nonce mismatch" });
        return;
      }

      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(OAUTH_STATE_COOKIE, { ...cookieOptions, maxAge: -1 });

      try {
        const redirectUri = buildRedirectUri(req);
        const claims = await exchangeCodeForIdToken(code, redirectUri);

        if (!claims.sub) {
          res.status(400).json({ error: "Google id_token missing sub claim" });
          return;
        }

        const openId = `google:${claims.sub}`;
        const name = claims.name ?? claims.email ?? "";
        const signedInAt = new Date();

        await db.upsertUser({
          openId,
          name: name || null,
          email: claims.email ?? null,
          loginMethod: "google",
          lastSignedIn: signedInAt,
        });

        const sessionToken = await signSession({ openId, name });

        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const returnTo = statePayload.returnTo.startsWith("/")
          ? statePayload.returnTo
          : "/";
        res.redirect(302, returnTo);
      } catch (error) {
        console.error("[Auth] Google callback failed", error);
        res.status(500).json({ error: "Authentication failed" });
      }
    }
  );
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const user = await db.getUserByOpenId(session.openId);
  if (!user) {
    throw ForbiddenError("User not found");
  }

  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });

  return user;
}
