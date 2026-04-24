import Link from "next/link";

import { ArfaLogo } from "@/components/marketing/arfa-logo";

/**
 * Marketing footer — four columns on md+, collapses to stacked on mobile.
 *
 * Colour is the ARFA brand navy (`#0a0f1e`) regardless of theme — this is
 * a brand anchor, not a themed surface. Links use slate-400 for resting
 * state and white on hover for punchy contrast against the navy.
 *
 * Every link points at a real destination when one exists; anything still
 * on the roadmap (Stocks / Bonds / etc. sub-hubs, Blog, Careers, legal
 * pages) uses `href="#"` so the IA is visible without routing to 404s.
 */

const PRODUCT_LINKS = [
  { href: "#", label: "Stocks" },
  { href: "#", label: "Bonds" },
  { href: "#", label: "FX" },
  { href: "#", label: "Commodities" },
  { href: "#", label: "Options" },
  { href: "#", label: "Screener" },
  { href: "#", label: "Signals" },
  { href: "#", label: "Idea Farm" },
  { href: "#", label: "Research OS" },
] as const;

const COMPANY_LINKS = [
  { href: "#", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Careers" },
] as const;

const LEGAL_LINKS = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms of Service" },
  { href: "#", label: "Risk Disclosure" },
  { href: "#", label: "Cookie Policy" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-[#0a0f1e] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="ARFA home"
              className="inline-block text-white"
            >
              {/* ArfaLogo is theme-aware; forcing text-white on the wrapper
                  keeps the wordmark legible against the navy regardless. */}
              <ArfaLogo variant="wordmark" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Professional investment intelligence for global markets.
            </p>
            <p className="mt-6 text-xs text-slate-500">
              © {year} ARFA Global. All rights reserved.
            </p>
          </div>

          {/* Product */}
          <FooterColumn heading="Product" links={PRODUCT_LINKS} />

          {/* Company */}
          <FooterColumn heading="Company" links={COMPANY_LINKS} />

          {/* Legal */}
          <FooterColumn heading="Legal" links={LEGAL_LINKS} />
        </div>

        {/* Compliance disclaimer — kept across the merge because it's a
            regulatory requirement, not a theming choice. */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-slate-500">
            ARFA provides analytical tools for informational purposes only.
            Nothing on this site constitutes investment advice, a solicitation,
            or a recommendation in relation to any security, financial product,
            or strategy. Scores and outputs do not account for individual
            suitability, risk tolerance, or objectives. Past performance is not
            indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-slate-300">
        {heading}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
