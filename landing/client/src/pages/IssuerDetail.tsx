import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  MapPin,
  Globe,
  BarChart3,
  Shield,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

const TREND_COLORS: Record<string, string> = {
  POS: "text-emerald-400",
  STA: "text-blue-400",
  NEG: "text-red-400",
};
const TREND_BG: Record<string, string> = {
  POS: "bg-emerald-500/10 border-emerald-500/20",
  STA: "bg-blue-500/10 border-blue-500/20",
  NEG: "bg-red-500/10 border-red-500/20",
};
const TREND_LABELS: Record<string, string> = {
  POS: "Positive",
  STA: "Stable",
  NEG: "Negative",
};
const TREND_ICONS: Record<string, typeof TrendingUp> = {
  POS: TrendingUp,
  STA: Minus,
  NEG: TrendingDown,
};

const REC_COLORS: Record<string, string> = {
  OW: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  MW: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  UW: "bg-red-500/10 border-red-500/20 text-red-400",
  N: "bg-gray-500/10 border-gray-500/20 text-gray-400",
};
const REC_LABELS: Record<string, string> = {
  OW: "Overweight",
  MW: "Market Weight",
  UW: "Underweight",
  N: "Neutral",
};

function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function formatLargeNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(0)}M`;
}

function MetricCard({
  label,
  value,
  suffix = "",
  description,
  colorize = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  description?: string;
  colorize?: boolean;
}) {
  const numVal = parseFloat(value);
  const colorClass =
    colorize && !isNaN(numVal)
      ? numVal > 0
        ? "text-emerald-400"
        : numVal < 0
        ? "text-red-400"
        : "text-foreground"
      : "text-foreground";

  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold ${colorClass}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}

function RatingBadge({ rating, size = "md" }: { rating: string | null; size?: "sm" | "md" | "lg" }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const sizeClass = size === "lg" ? "px-3 py-1 text-base" : size === "md" ? "px-2.5 py-0.5 text-sm" : "px-2 py-0.5 text-xs";
  const colorClass = rating.startsWith("AA")
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : rating.startsWith("A") && !rating.startsWith("AA")
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : rating.startsWith("BBB")
    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : rating === "BB+"
    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
    : "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <span className={`inline-flex items-center rounded font-semibold border ${sizeClass} ${colorClass}`}>
      {rating}
    </span>
  );
}

// Parse credit comment into structured sections
function parseCreditComment(comment: string | null): {
  title: string;
  ratingLine: string;
  momentum: string;
  body: string;
} {
  if (!comment) return { title: "", ratingLine: "", momentum: "", body: "" };

  const lines = comment.split("\n").filter((l) => l.trim());
  let title = "";
  let ratingLine = "";
  let momentum = "";
  let bodyLines: string[] = [];
  let inMomentum = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0) {
      title = line;
      continue;
    }
    if (line.startsWith("Credit Rating:") || (i === 1 && line.includes("Rating:"))) {
      ratingLine = line;
      continue;
    }
    if (line.startsWith("Credit Momentum:") || line.startsWith("Momentum:")) {
      inMomentum = true;
      momentum = line;
      continue;
    }
    if (inMomentum && !line.startsWith("Credit") && !line.match(/^[A-Z][a-z]+:/)) {
      momentum += " " + line;
      continue;
    }
    inMomentum = false;
    bodyLines.push(line);
  }

  return {
    title,
    ratingLine,
    momentum,
    body: bodyLines.join("\n\n"),
  };
}

const SCORE_LABELS = [
  "Business Profile",
  "Market Position",
  "Revenue Quality",
  "Profitability",
  "Leverage",
  "Coverage",
  "Liquidity",
  "Cash Flow",
  "Governance",
  "ESG",
  "Outlook",
  "Momentum",
];

export default function IssuerDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";

  const { data: issuer, isLoading, error } = trpc.bonds.issuer.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !issuer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Issuer Not Found</h2>
        <p className="text-muted-foreground">The issuer you're looking for doesn't exist.</p>
        <Link href="/fixed-income/corporate">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Corporate
          </Button>
        </Link>
      </div>
    );
  }

  const parsed = parseCreditComment(issuer.creditComment);
  const TrendIcon = issuer.creditTrend ? TREND_ICONS[issuer.creditTrend] : null;

  // Prepare radar chart data from scores
  const radarData = (issuer.scores || []).map((score, idx) => ({
    subject: SCORE_LABELS[idx] || `S${idx + 1}`,
    value: score ?? 0,
    fullMark: 2,
  }));

  // Bond yield comparison chart
  const bondYieldData = (issuer.bonds || []).map((b) => ({
    name: b.ticker.split(" ").slice(0, 3).join(" "),
    yield: b.yieldToMaturity ?? 0,
    spread: b.oasSpread ?? 0,
    duration: b.duration ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link href="/fixed-income/corporate">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Corporate
        </Button>
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{issuer.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <RatingBadge rating={issuer.rating} size="lg" />
              {issuer.creditTrend && TrendIcon && TREND_COLORS[issuer.creditTrend] && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
                    TREND_BG[issuer.creditTrend] || ""
                  } ${TREND_COLORS[issuer.creditTrend] || ""}`}
                >
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {TREND_LABELS[issuer.creditTrend] || issuer.creditTrend}
                  </span>
                </div>
              )}
              {issuer.recommendation && REC_COLORS[issuer.recommendation] && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
                    REC_COLORS[issuer.recommendation]
                  }`}
                >
                  <span className="text-sm font-medium">
                    {REC_LABELS[issuer.recommendation] || issuer.recommendation}
                  </span>
                </div>
              )}
              {issuer.score != null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-secondary/50">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Score: {issuer.score}/15
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {issuer.sector && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>{issuer.sector}</span>
                  {issuer.industryGroup && (
                    <span className="text-xs">({issuer.industryGroup})</span>
                  )}
                </div>
              )}
              {issuer.country && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{issuer.country}</span>
                </div>
              )}
              {issuer.region && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{issuer.region}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">
              {issuer.bonds.length} bond{issuer.bonds.length !== 1 ? "s" : ""} outstanding
            </div>
          </div>
        </div>
      </div>

      {/* Credit Commentary */}
      {issuer.creditComment && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Credit Commentary
          </h2>

          {parsed.ratingLine && (
            <div className="bg-secondary/50 rounded-lg p-4 mb-4 border-l-4 border-primary">
              <div className="text-sm text-foreground font-medium leading-relaxed">
                {parsed.ratingLine}
              </div>
            </div>
          )}

          {parsed.momentum && (
            <div
              className={`rounded-lg p-4 mb-4 border-l-4 ${
                parsed.momentum.toLowerCase().includes("positive")
                  ? "border-emerald-500 bg-emerald-500/5"
                  : parsed.momentum.toLowerCase().includes("negative")
                  ? "border-red-500 bg-red-500/5"
                  : "border-blue-500 bg-blue-500/5"
              }`}
            >
              <div className="text-sm font-semibold text-foreground mb-1">
                Credit Momentum
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {parsed.momentum.replace(/^Credit Momentum:\s*/i, "").replace(/^Momentum:\s*/i, "")}
              </div>
            </div>
          )}

          {parsed.body && (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {parsed.body}
            </div>
          )}
        </div>
      )}

      {/* Fundamental Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leverage & Coverage */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Leverage & Coverage
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Total Debt/EBITDA"
              value={formatNumber(issuer.totalDebtToEbitda, 1)}
              suffix="x"
            />
            <MetricCard
              label="Net Debt/EBITDA"
              value={formatNumber(issuer.netDebtToEbitda, 1)}
              suffix="x"
            />
            <MetricCard
              label="Total Debt/Equity"
              value={formatNumber(issuer.totalDebtToEquity, 1)}
              suffix="x"
            />
            <MetricCard
              label="EBITDA/Interest"
              value={formatNumber(issuer.ebitdaToInterest, 1)}
              suffix="x"
            />
          </div>
        </div>

        {/* Profitability & Cash Flow */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Profitability & Cash Flow
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="EBITDA Margin"
              value={formatPercent(issuer.ebitdaMargin)}
            />
            <MetricCard
              label="FCF Yield"
              value={formatPercent(issuer.fcfYield)}
              colorize
            />
            <MetricCard
              label="WACC Cost of Debt"
              value={formatPercent(issuer.waccCostDebt)}
            />
            <MetricCard
              label="Cash/Short-term Debt"
              value={formatNumber(issuer.cashToShortTermDebt, 2)}
              suffix="x"
            />
          </div>
        </div>

        {/* Debt Structure */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Debt Structure
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Cash & Near Cash"
              value={formatLargeNumber(issuer.cashNearCash)}
            />
            <MetricCard
              label="Short-term Borrowings"
              value={formatLargeNumber(issuer.shortTermBorrow)}
            />
            <MetricCard
              label="Long-term Borrowings"
              value={formatLargeNumber(issuer.longTermBorrow)}
            />
            <MetricCard
              label="ST Debt / Total Debt"
              value={formatPercent(issuer.shortTermDebtToTotalDebt)}
            />
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Risk Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="3Y Default Probability"
              value={
                issuer.defaultProb3Y != null
                  ? `${(issuer.defaultProb3Y * 100).toFixed(3)}%`
                  : "—"
              }
            />
            <MetricCard
              label="Loss Given Default"
              value={formatPercent(issuer.lossGivenDefault)}
            />
            <MetricCard
              label="CDS Spread (Implied)"
              value={
                issuer.cdsSpread != null
                  ? `${issuer.cdsSpread.toFixed(0)} bps`
                  : "—"
              }
            />
            <MetricCard
              label="Total Score"
              value={issuer.totalScore != null ? `${issuer.totalScore}` : "—"}
              suffix="/24"
            />
          </div>
        </div>
      </div>

      {/* Scoring Radar Chart */}
      {radarData.length > 0 && radarData.some((d) => d.value > 0) && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Credit Scoring Breakdown
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`${value}/2`, "Score"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bond List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Outstanding Bonds ({issuer.bonds.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                  Ticker
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                  ISIN
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                  Rating
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  Price
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  YTM
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  Duration
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  OAS
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  Z-Spread
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  Size
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  1M Chg
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                  Total Rtn
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {issuer.bonds.map((bond) => (
                <tr
                  key={bond.isin || bond.ticker}
                  className="hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm font-mono text-foreground">
                    {bond.ticker}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                    {bond.isin || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <RatingBadge rating={bond.rating} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums">
                    {formatNumber(bond.price)}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-foreground text-right tabular-nums">
                    {formatNumber(bond.yieldToMaturity)}%
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums">
                    {formatNumber(bond.duration)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums">
                    {formatNumber(bond.oasSpread, 0)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground text-right tabular-nums">
                    {formatNumber(bond.zSpread, 0)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-muted-foreground text-right tabular-nums">
                    {bond.amountOutstanding
                      ? formatLargeNumber(bond.amountOutstanding)
                      : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-sm font-medium text-right tabular-nums ${
                      (bond.change1M ?? 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {bond.change1M != null
                      ? `${bond.change1M >= 0 ? "+" : ""}${bond.change1M.toFixed(2)}%`
                      : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-sm font-medium text-right tabular-nums ${
                      (bond.totalReturn ?? 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {bond.totalReturn != null
                      ? `${bond.totalReturn >= 0 ? "+" : ""}${bond.totalReturn.toFixed(2)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bond Yield Chart */}
      {bondYieldData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Bond Yield Comparison
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bondYieldData}>
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: number, name: string) => [
                  name === "yield" ? `${value.toFixed(2)}%` : `${value.toFixed(0)} bps`,
                  name === "yield" ? "YTM" : "OAS Spread",
                ]}
              />
              <Bar dataKey="yield" fill="#3b82f6" radius={[4, 4, 0, 0]} name="yield" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
