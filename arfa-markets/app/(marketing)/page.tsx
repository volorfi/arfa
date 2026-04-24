import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Banknote,
  CircleEllipsis,
  Coins,
  FlaskConical,
  Globe,
  LineChart,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WatchFace } from "@/components/marketing/watch-face";

export const metadata: Metadata = {
  title: "ARFA — Institutional-Grade Asset Research | arfa.global",
  description:
    "Score any stock, bond, or ETF across 12 return and risk factors. Forward-looking. Peer-relative. Daily refresh.",
  alternates: { canonical: "https://arfa.global/" },
  openGraph: {
    title: "ARFA — Institutional-Grade Asset Research",
    description:
      "Score any stock, bond, or ETF across 12 return and risk factors. Forward-looking. Peer-relative. Daily refresh.",
    url: "https://arfa.global/",
    type: "website",
  },
};

// ── Factor data ───────────────────────────────────────────────────────────────
const RETURN_FACTORS = [
  {
    icon: Scale,
    name: "Valuation",
    description:
      "How cheap or expensive an asset is versus its own history and peers.",
  },
  {
    icon: TrendingUp,
    name: "Performance",
    description:
      "Price trend strength and risk-adjusted return across lookback windows.",
  },
  {
    icon: Users,
    name: "Analyst View",
    description:
      "Sell-side consensus on targets, earnings revisions, and recommendations.",
  },
  {
    icon: Coins,
    name: "Profitability",
    description:
      "Return on capital, margin quality, and free-cash-flow conversion.",
  },
  {
    icon: LineChart,
    name: "Growth",
    description:
      "Forward revenue and earnings trajectory against sector and macro regime.",
  },
  {
    icon: Banknote,
    name: "Dividends",
    description:
      "Yield, coverage, and payout sustainability over the distribution cycle.",
  },
] as const;

const RISK_FACTORS = [
  {
    icon: ShieldAlert,
    name: "Default Risk",
    description:
      "Probability of distressed restructuring or missed obligations.",
  },
  {
    icon: Activity,
    name: "Volatility",
    description:
      "Realised and implied price variability relative to market regime.",
  },
  {
    icon: FlaskConical,
    name: "Stress Test",
    description:
      "Drawdown behaviour under historical and forward macro shocks.",
  },
  {
    icon: Waves,
    name: "Selling Difficulty",
    description:
      "Liquidity depth, bid-ask spread, and exit cost at typical trade sizes.",
  },
  {
    icon: Globe,
    name: "Country Risks",
    description:
      "Jurisdictional, currency, and sovereign exposure embedded in the asset.",
  },
  {
    icon: CircleEllipsis,
    name: "Other Risks",
    description:
      "Governance, concentration, accounting, and event-driven residuals.",
  },
] as const;

const ASSET_CLASSES = [
  {
    name: "Stocks",
    description:
      "Factor weights emphasise cash-flow durability, valuation vs. sector, and analyst revisions — adjusted for size and liquidity tier.",
  },
  {
    name: "Bonds",
    description:
      "Credit spread and default risk dominate, with carry, duration, and country exposure folded into the composite view.",
  },
  {
    name: "ETFs",
    description:
      "We look through to the underlying basket — scoring the weighted holdings, tracking error, and cost drag as one coherent signal.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Search any asset",
    description: "Type a ticker, ISIN, or name. Equities, bonds, or ETFs.",
  },
  {
    icon: TrendingUp,
    title: "See 12 factor scores",
    description: "Six return factors on the right, six risk factors on the left.",
  },
  {
    icon: Sparkles,
    title: "Read the ARFA Ratio",
    description:
      "One composite number from 1 to 7 — higher means a better risk-return profile.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "I used to open three terminals and a spreadsheet to decide whether a name was worth a full write-up. Now I open ARFA and know in ten seconds.",
    author: "Avery Chen",
    role: "Portfolio Manager, long-only equities",
  },
  {
    quote:
      "The fragility heatmap caught a concentration risk in my sleeve before I did. That kind of feedback changes how I run the book.",
    author: "Lukas Meier",
    role: "Multi-asset analyst",
  },
  {
    quote:
      "Bond coverage is the part nobody else gets right. ARFA's composite pulls carry and default into one number that actually moves with reality.",
    author: "Priya Ramanathan",
    role: "Credit strategist, EM fixed income",
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FactorsSection
        id="factors"
        kind="return"
        title="Return factors"
        subtitle="Six dimensions that drive upside. Each scored 1 to 7 against the asset's universe."
        items={RETURN_FACTORS}
      />
      <FactorsSection
        kind="risk"
        title="Risk factors"
        subtitle="Six dimensions that erode value. Flagged the moment they break out of regime."
        items={RISK_FACTORS}
      />
      <AssetClasses />
      <SocialProof />
      <CtaBanner />
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="product" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-12 md:gap-10 md:px-6 md:py-24 lg:gap-16 lg:py-32">
        <div className="md:col-span-7 md:pt-4 lg:col-span-6">
          <Badge variant="secondary" className="mb-5">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            ARFA Ratio · 12-factor composite
          </Badge>

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Research any asset in seconds.
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">With institutional depth.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
            ARFA scores 120,000+ stocks, bonds, and ETFs across 12 return and
            risk factors — the same way a CFA analyst would, delivered in one
            number: the ARFA Ratio.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-text-faint">
            No credit card required · 25 asset views on Free
          </p>
        </div>

        {/* Watch-face visual */}
        <div className="md:col-span-5 lg:col-span-6">
          <div className="relative aspect-square w-full max-w-[520px] mx-auto">
            <div className="absolute inset-0 rounded-full bg-surface-1 shadow-lg ring-1 ring-border" />
            <div className="relative h-full w-full p-4 sm:p-6">
              <WatchFace score={6} scale={7} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps, one number."
          description="From search to score in under a minute. Same output for every asset class."
        />

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-semibold uppercase tracking-widest text-text-faint">
                        Step {idx + 1}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-text-muted" />
                      <h3 className="font-display text-lg font-semibold text-text-primary">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ── Factors (generic for return / risk) ──────────────────────────────────────
function FactorsSection({
  id,
  kind,
  title,
  subtitle,
  items,
}: {
  id?: string;
  kind: "return" | "risk";
  title: string;
  subtitle: string;
  items: readonly { icon: React.ElementType; name: string; description: string }[];
}) {
  const isReturn = kind === "return";

  return (
    <section id={id} className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <SectionHeader
          eyebrow={isReturn ? "1–6 · Upside" : "7–12 · Drag"}
          eyebrowTone={isReturn ? "success" : "destructive"}
          title={title}
          description={subtitle}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.name} className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={
                        isReturn
                          ? "h-5 w-5 text-success"
                          : "h-5 w-5 text-destructive"
                      }
                    />
                    <h3 className="font-display text-base font-semibold tracking-tight text-text-primary">
                      {item.name}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Asset classes ─────────────────────────────────────────────────────────────
function AssetClasses() {
  return (
    <section id="asset-classes" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <SectionHeader
          eyebrow="Coverage"
          title="Same model, three asset classes."
          description="The 12 factors stay; the weights adapt. So a bond and an ETF end up on the same 1-to-7 scale you can actually compare."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ASSET_CLASSES.map((asset) => (
            <Card key={asset.name} className="h-full">
              <CardHeader>
                <h3 className="font-display text-xl font-semibold tracking-tight text-text-primary">
                  {asset.name}
                </h3>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-text-muted">
                  {asset.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Social proof ──────────────────────────────────────────────────────────────
function SocialProof() {
  const stats = [
    { label: "Assets scored", value: "120,000+" },
    { label: "Factors", value: "12" },
    { label: "Refresh", value: "Daily" },
    { label: "Forward-looking", value: "Always" },
  ];

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <SectionHeader
          eyebrow="Used by"
          title="Analysts, PMs, and strategists."
          description="Research teams that care less about dashboards and more about decisions."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.author} className="h-full">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-text-primary">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {t.author}
                  </p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stat row */}
        <div className="mt-16 grid grid-cols-2 gap-6 border-t border-border pt-10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-text-faint">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA banner ────────────────────────────────────────────────────────────────
function CtaBanner() {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
        <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface-1 p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              Start researching for free. Upgrade when you need more.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              25 asset views, core scores, and a watchlist on Free. No credit
              card required.
            </p>
          </div>
          <Button size="lg" asChild className="self-start md:self-auto">
            <Link href="/signup">
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Shared section header ─────────────────────────────────────────────────────
function SectionHeader({
  eyebrow,
  eyebrowTone,
  title,
  description,
}: {
  eyebrow: string;
  eyebrowTone?: "default" | "success" | "destructive";
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={
          eyebrowTone === "success"
            ? "font-display text-xs font-semibold uppercase tracking-widest text-success"
            : eyebrowTone === "destructive"
            ? "font-display text-xs font-semibold uppercase tracking-widest text-destructive"
            : "font-display text-xs font-semibold uppercase tracking-widest text-text-faint"
        }
      >
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted md:text-lg">
        {description}
      </p>
    </div>
  );
}
