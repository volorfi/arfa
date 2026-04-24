/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Required for the Railway Dockerfile — Next.js emits a self-contained
  // node server under .next/standalone that the runtime stage copies in.
  // Without this the app tries to boot from the full monorepo at runtime.
  output: "standalone",

  // Trim bundle shipped to the browser by turning off production source
  // maps — they balloon cold-start disk usage on Railway for no user
  // benefit. Errors still have readable stacks server-side.
  productionBrowserSourceMaps: false,

  images: {
    // All remote image hosts we might serve from. Supabase storage is the
    // only one today; add additional hosts here as integrations land.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // `domains` is the legacy bare-hostname list. Kept in sync for any
    // older APIs that don't hand us a URL object.
    domains: [],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
