/**
 * Shared helper for calling Yahoo Finance's undocumented JSON API directly.
 *
 * Yahoo gates most endpoints behind a cookie + crumb pair: you fetch a
 * session cookie from fc.yahoo.com, exchange it for a crumb token at
 * query2/v1/test/getcrumb, then pass both on every subsequent request.
 * The crumb is cached for 30 min and auto-refreshed on 401.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CRUMB_TTL_MS = 30 * 60 * 1000;

let cachedCrumb: { crumb: string; cookies: string; expiresAt: number } | null =
  null;

async function fetchCrumb(): Promise<{ crumb: string; cookies: string }> {
  const cookieResp = await fetch("https://fc.yahoo.com", {
    redirect: "manual",
    headers: { "User-Agent": USER_AGENT },
  });
  const setCookies = cookieResp.headers.getSetCookie?.() ?? [];
  const cookies = setCookies.map((c: string) => c.split(";")[0]).join("; ");

  const crumbResp = await fetch(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookies,
      },
    }
  );

  if (!crumbResp.ok) {
    throw new Error(
      `Yahoo crumb request failed: ${crumbResp.status} ${crumbResp.statusText}`
    );
  }

  const crumb = (await crumbResp.text()).trim();
  return { crumb, cookies };
}

async function getCrumb(): Promise<{ crumb: string; cookies: string }> {
  if (cachedCrumb && Date.now() < cachedCrumb.expiresAt) {
    return { crumb: cachedCrumb.crumb, cookies: cachedCrumb.cookies };
  }
  const fresh = await fetchCrumb();
  cachedCrumb = { ...fresh, expiresAt: Date.now() + CRUMB_TTL_MS };
  return fresh;
}

export function invalidateYahooCrumb(): void {
  cachedCrumb = null;
}

export type YahooFetchOptions = {
  query?: Record<string, string | number | undefined | null>;
  /** Include the crumb + cookie headers. Defaults to true. Some endpoints
   *  (e.g. /v1/finance/search) don't require auth, but sending it doesn't
   *  hurt. */
  auth?: boolean;
  /** Optional abort signal. */
  signal?: AbortSignal;
};

/**
 * GET a Yahoo Finance JSON endpoint. Returns parsed JSON or throws.
 * Retries once on 401 with a refreshed crumb.
 */
export async function yahooFetch<T = any>(
  url: string,
  options: YahooFetchOptions = {}
): Promise<T> {
  const { query, auth = true, signal } = options;

  const build = async (): Promise<Response> => {
    const u = new URL(url);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        u.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    };

    if (auth) {
      const { crumb, cookies } = await getCrumb();
      u.searchParams.set("crumb", crumb);
      headers.Cookie = cookies;
    }

    return fetch(u.toString(), { headers, signal });
  };

  let resp = await build();

  if (resp.status === 401 && auth) {
    invalidateYahooCrumb();
    resp = await build();
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `Yahoo Finance ${resp.status} ${resp.statusText}${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  return (await resp.json()) as T;
}
