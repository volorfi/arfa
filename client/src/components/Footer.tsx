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
import { BrandMark } from "@/components/BrandMark";

const siteLinks = [
  {
    title: "Markets",
    links: [
      { label: "Home", path: "/" },
      { label: "Watchlist", path: "/watchlist" },
      { label: "News & Blogs", path: "/news" },
      { label: "Trending", path: "/trending" },
      { label: "Market Movers", path: "/movers" },
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
      { label: "Sovereign Bonds", path: "/fixed-income/sovereign" },
      { label: "Corporate Bonds", path: "/fixed-income/corporate" },
    ],
  },
  {
    title: "Currencies",
    links: [
      { label: "FX Overview", path: "/fx" },
      { label: "EUR / USD", path: "/fx/EURUSD" },
      { label: "GBP / USD", path: "/fx/GBPUSD" },
      { label: "USD / JPY", path: "/fx/USDJPY" },
    ],
  },
  {
    title: "Commodities",
    links: [
      { label: "All Commodities", path: "/commodities" },
      { label: "Gold", path: "/commodities/GC" },
      { label: "WTI Crude", path: "/commodities/CL" },
      { label: "Natural Gas", path: "/commodities/NG" },
      { label: "Copper", path: "/commodities/HG" },
    ],
  },
  {
    title: "Macro",
    links: [
      { label: "All Countries", path: "/macro" },
      { label: "Americas", path: "/macro/region/Americas" },
      { label: "Europe", path: "/macro/region/Europe" },
      { label: "Asia", path: "/macro/region/Asia" },
      { label: "Middle East", path: "/macro/region/Middle%20East" },
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
    title: "Options",
    links: [
      { label: "Options Chain", path: "/options/chain" },
      { label: "Strategy Builder", path: "/options/strategy" },
      { label: "Options Flow", path: "/options/flow" },
      { label: "Options Tools", path: "/options/tools" },
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
            <Link href="/" aria-label="ARFA home" className="inline-block">
              <BrandMark variant="horizontal-tagline" size={44} />
            </Link>
            <p className="text-[11px] text-muted-foreground tracking-wider uppercase mt-3">
              Global Markets Intelligence Hub
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4 max-w-xs">
              ARFA is an independent analytical platform focused on market
              intelligence, portfolio thinking, and capital allocation
              perspectives.
            </p>
          </div>

          {/* Center: Site navigation columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
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
          <div className="lg:col-span-2">
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
