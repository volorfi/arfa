import Link from "next/link";

import { ArfaLogo } from "@/components/marketing/arfa-logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#factors", label: "12-factor model" },
      { href: "/#asset-classes", label: "Asset coverage" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/docs", label: "Docs" },
      { href: "/contact", label: "Contact" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-4">
            <Link href="/" aria-label="ARFA home" className="inline-block">
              <ArfaLogo variant="wordmark" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-text-muted">
              Institutional-grade research on any stock, bond, or ETF —
              condensed into one number.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-text-muted transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rule + disclaimer */}
        <div className="mt-12 border-t border-border pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-text-faint">
            ARFA provides analytical tools for informational purposes only.
            Nothing on this site constitutes investment advice, a solicitation,
            or a recommendation in relation to any security, financial product,
            or strategy. Scores and outputs do not account for individual
            suitability, risk tolerance, or objectives. Past performance is not
            indicative of future results.
          </p>
          <p className="mt-4 text-xs text-text-faint">
            © {new Date().getFullYear()} ARFA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
