import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { PricingPlans } from "@/components/marketing/pricing-plans";

export const metadata: Metadata = {
  title: "Pricing — ARFA",
  description:
    "Free, Premium ($39/mo), and Pro ($99/mo) plans. Full ARFA research workflow for active investors and professionals.",
  alternates: { canonical: "https://arfa.global/pricing" },
  openGraph: {
    title: "Pricing — ARFA",
    description:
      "Free, Premium ($39/mo), and Pro ($99/mo) plans. Full ARFA research workflow for active investors and professionals.",
    url: "https://arfa.global/pricing",
    type: "website",
  },
};

// ── Feature matrix data ─────────────────────────────────────────────────────
// Values are rendered verbatim for limits; literal `true` renders ✓, literal
// `false` renders an em-dash.
type Cell = string | boolean;

const MATRIX_SECTIONS: {
  heading: string;
  rows: { label: string; free: Cell; premium: Cell; pro: Cell }[];
}[] = [
  {
    heading: "Asset research",
    rows: [
      { label: "Asset views", free: "25 / mo", premium: "Unlimited", pro: "Unlimited" },
      { label: "Core ARFA scores", free: true, premium: true, pro: true },
      { label: "Insight explainers", free: "Limited", premium: "Full", pro: "Full" },
      { label: "Driver decomposition", free: false, premium: true, pro: true },
      { label: "Scenario range", free: false, premium: true, pro: true },
      { label: "Idea stream", free: false, premium: true, pro: true },
      { label: "Premium idea cards", free: false, premium: true, pro: true },
    ],
  },
  {
    heading: "Screening",
    rows: [
      { label: "Advanced screener", free: false, premium: true, pro: true },
      { label: "Custom ARFA field screening", free: false, premium: true, pro: true },
      { label: "Saved screens", free: "1", premium: "25", pro: "100" },
      { label: "Save & rerun screens", free: false, premium: true, pro: true },
    ],
  },
  {
    heading: "Valuation Lab",
    rows: [
      { label: "Fair Value Range", free: false, premium: true, pro: true },
      { label: "Reverse Expectations", free: false, premium: true, pro: true },
      { label: "Scenario DCF", free: false, premium: true, pro: true },
      { label: "Bond carry & spread tools", free: false, premium: true, pro: true },
      { label: "ETF look-through", free: false, premium: true, pro: true },
    ],
  },
  {
    heading: "Portfolio & watchlists",
    rows: [
      { label: "Watchlists", free: "1 (10 items)", premium: "10 (100 each)", pro: "50 (500 each)" },
      { label: "Portfolio tracking", free: false, premium: true, pro: true },
      { label: "Portfolio Intelligence", free: false, premium: true, pro: true },
      { label: "Fragility heatmap", free: false, premium: true, pro: true },
      { label: "Score drift alerts", free: false, premium: true, pro: true },
    ],
  },
  {
    heading: "History & alerts",
    rows: [
      { label: "Score history", free: "30 days", premium: "3 years", pro: "Full" },
      { label: "Email alerts", free: false, premium: true, pro: true },
      { label: "Real-time alerts", free: false, premium: false, pro: true },
    ],
  },
  {
    heading: "Export & collaboration",
    rows: [
      { label: "Exports / month", free: false, premium: "20", pro: "100" },
      { label: "Research reports (PDF)", free: false, premium: true, pro: true },
      { label: "Saved notes", free: false, premium: true, pro: true },
      { label: "Team sharing", free: false, premium: false, pro: "Up to 5" },
      { label: "Pro dashboards", free: false, premium: false, pro: "25 workspaces" },
    ],
  },
  {
    heading: "Developer & support",
    rows: [
      { label: "API access", free: false, premium: false, pro: "Add-on" },
      { label: "Priority support", free: false, premium: false, pro: true },
    ],
  },
];

// ── FAQ data ────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "What's included in Free?",
    a: "25 asset views per month, core ARFA scores for any supported asset, one watchlist of up to 10 items, one saved screen, 30-day score history, and limited insight explainers. No credit card needed to sign up.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel Premium or Pro anytime from your billing dashboard. Your paid features stay active through the end of the current billing period, after which your account reverts to Free.",
  },
  {
    q: "Is ARFA an investment advisor?",
    a: "No. ARFA is a research tool. We are not a broker, dealer, or registered investment adviser. Scores, ratings, and outputs are analytical signals for informational purposes only and do not constitute investment advice or a recommendation.",
  },
  {
    q: "What are exports?",
    a: "On Premium and Pro you can download asset reports, screener results, and watchlists as CSV, XLSX, or PDF. Each download counts as one export against your monthly quota (20 on Premium, 100 on Pro).",
  },
  {
    q: "Do you offer team or enterprise plans?",
    a: "Pro includes team sharing for up to 5 seats. If you need more seats, SSO, custom data feeds, or an on-premises deployment, contact us — we'll put together an enterprise quote.",
  },
  {
    q: "How often is data refreshed?",
    a: "Fundamentals and ARFA scores refresh daily after market close. Pro plans add real-time alerts layered on top of the daily score grid.",
  },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  return (
    <>
      <Hero />
      <MatrixSection />
      <FaqSection />
      <ComplianceNote />
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <div className="max-w-3xl">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Choose the plan that matches your research depth.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-muted md:text-lg">
            Start free forever. Upgrade when you need the full diagnostics, the
            Valuation Lab, or the Pro workspace.
          </p>
        </div>

        <div className="mt-10">
          <PricingPlans />
        </div>
      </div>
    </section>
  );
}

// ── Feature matrix ───────────────────────────────────────────────────────────
function MatrixSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <div className="max-w-3xl">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
            Feature comparison
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Everything, side by side.
          </h2>
        </div>

        <div className="mt-12 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-text-faint md:px-6">
                  Feature
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-text-primary md:px-6">
                  Free
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-text-primary md:px-6">
                  <span className="mr-2">Premium</span>
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Most popular
                  </span>
                </th>
                <th className="px-4 py-4 text-sm font-semibold text-text-primary md:px-6">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_SECTIONS.map((section, sIdx) => (
                <MatrixSectionRows
                  key={section.heading}
                  heading={section.heading}
                  rows={section.rows}
                  isFirst={sIdx === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MatrixSectionRows({
  heading,
  rows,
  isFirst,
}: {
  heading: string;
  rows: { label: string; free: Cell; premium: Cell; pro: Cell }[];
  isFirst: boolean;
}) {
  return (
    <>
      <tr
        className={cn(
          "bg-surface-2/50",
          isFirst ? "border-t border-border" : "border-t-2 border-border",
        )}
      >
        <th
          colSpan={4}
          scope="colgroup"
          className="px-4 py-3 text-left font-display text-[11px] font-semibold uppercase tracking-widest text-text-muted md:px-6"
        >
          {heading}
        </th>
      </tr>
      {rows.map((row) => (
        <tr
          key={row.label}
          className="border-t border-border transition-colors hover:bg-surface-2/40"
        >
          <td className="px-4 py-3.5 text-sm text-text-primary md:px-6">
            {row.label}
          </td>
          <MatrixCell value={row.free} />
          <MatrixCell value={row.premium} />
          <MatrixCell value={row.pro} />
        </tr>
      ))}
    </>
  );
}

function MatrixCell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <td className="px-4 py-3.5 md:px-6">
        <Check className="h-4 w-4 text-success" aria-label="Included" />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-4 py-3.5 md:px-6">
        <Minus className="h-4 w-4 text-text-faint" aria-label="Not included" />
      </td>
    );
  }
  return (
    <td className="px-4 py-3.5 text-sm text-text-primary md:px-6">{value}</td>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
function FaqSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-4 py-20 md:px-6 md:py-24">
        <div className="max-w-3xl">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Questions, answered.
          </h2>
        </div>

        <ul className="mt-12 divide-y divide-border rounded-lg border border-border bg-surface-1">
          {FAQ.map((item, idx) => (
            <li key={item.q}>
              <details
                className="group"
                // First item open by default so the UX isn't all collapsed cold
                open={idx === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 text-left md:px-6 md:py-6">
                  <span className="font-display text-base font-semibold tracking-tight text-text-primary md:text-lg">
                    {item.q}
                  </span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition-transform group-open:rotate-45">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 4v16m-8-8h16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-6 md:px-6">
                  <p className="max-w-3xl text-sm leading-relaxed text-text-muted">
                    {item.a}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Compliance note ──────────────────────────────────────────────────────────
function ComplianceNote() {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
        <div className="rounded-lg border border-border bg-surface-2 p-6 md:p-8">
          <p className="max-w-4xl text-sm leading-relaxed text-text-muted">
            <span className="font-semibold text-text-primary">
              Compliance.
            </span>{" "}
            ARFA is not a broker, dealer, or investment adviser. Scores and
            outputs do not constitute investment advice and do not account for
            individual investor suitability, risk tolerance, or objectives.
          </p>
        </div>
      </div>
    </section>
  );
}
