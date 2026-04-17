import { Link } from "wouter";
import {
  Home,
  Star,
  Newspaper,
  Calendar,
  BarChart3,
  Layers,
  Landmark,
  TrendingUp,
  ArrowUpDown,
  Wrench,
} from "lucide-react";

const siteLinks = [
  {
    title: "Markets",
    links: [
      { label: "Home", path: "/" },
      { label: "Watchlist", path: "/watchlist" },
      { label: "News", path: "/news" },
      { label: "Trending", path: "/trending" },
      { label: "Market Movers", path: "/movers" },
    ],
  },
  {
    title: "Calendars",
    links: [
      { label: "Earnings", path: "/calendars/earnings" },
      { label: "Dividends", path: "/calendars/dividends" },
      { label: "Stock Splits", path: "/calendars/stock-splits" },
      { label: "Economic Events", path: "/calendars/economic-events" },
      { label: "Public Offerings", path: "/calendars/public-offerings" },
    ],
  },
  {
    title: "Stocks & ETFs",
    links: [
      { label: "Stock Screener", path: "/screener" },
      { label: "All Stocks", path: "/stocks" },
      { label: "ETFs", path: "/etfs" },
      { label: "IPOs", path: "/ipos" },
    ],
  },
  {
    title: "Fixed Income",
    links: [
      { label: "Sovereign", path: "/fixed-income/sovereign" },
      { label: "Corporate", path: "/fixed-income/corporate" },
      { label: "Macroeconomics", path: "/macro" },
    ],
  },
];

const legalLinks = [
  { label: "About Us", path: "/about" },
  { label: "Terms of Use", path: "/terms" },
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Data Disclaimer", path: "/data-disclaimer" },
  { label: "Disclaimer", path: "/disclaimer" },
  { label: "Cookie Notice", path: "/cookies" },
  { label: "Contact", path: "/contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      {/* Main footer content */}
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Left: ARFA branding */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-[10px]">AG</span>
              </div>
              <div>
                <div className="font-semibold text-sm tracking-tight text-foreground">
                  ARFA Global Markets
                </div>
                <div className="text-[11px] text-muted-foreground tracking-wide uppercase">
                  Investment Intelligence
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-xs">
              ARFA is an independent analytical platform focused on market intelligence, portfolio thinking, and capital allocation perspectives.
            </p>
          </div>

          {/* Center: Site navigation columns */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {siteLinks.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        href={link.path}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right: ARFA Markets legal links */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              ARFA Markets
            </h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="border-t border-border" />
      </div>

      {/* Bottom: Disclaimer + Copyright */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">
          ARFA is an independent analytical platform focused on market intelligence, portfolio thinking, and capital allocation perspectives. All content on this website is provided for general informational, educational, and analytical purposes only and does not constitute investment advice, regulated investment services, or an offer, solicitation, or recommendation in relation to any financial instrument or strategy. All materials including text, analysis, research, graphics, branding, and design, are protected by applicable intellectual property laws and may not be copied, reproduced, redistributed, modified, or commercially exploited without prior written permission, except as otherwise permitted by law. Data shown on this website may be delayed, incomplete, estimated, derived, or sourced from third parties, and is provided without any warranty as to accuracy or completeness.
        </p>
        <p className="text-xs text-muted-foreground/50">
          &copy; 2026 ARFA Global Markets. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
