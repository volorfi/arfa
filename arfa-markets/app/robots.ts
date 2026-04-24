import type { MetadataRoute } from "next";

/**
 * robots.txt — crawl the marketing pages, keep everything authenticated
 * out of indexes. `auth/*` and `dashboard/*` are personalised and
 * unstable URLs; `api/*` is machine-only.
 */
export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://arfa.global";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api",
          "/api/",
          "/auth",
          "/auth/",
          "/callback",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
