import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Activity,
  Landmark,
  Banknote,
  PiggyBank,
  Scale,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getFlagUrl } from "@/lib/countryFlags";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

function formatNum(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function formatPct(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}%`;
}

function formatBln(val: number | null | undefined): string {
  if (val == null) return "—";
  return `$${val.toFixed(1)}B`;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
  subtext,
}: {
  label: string;
  value: string;
  icon?: any;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
      {subtext && <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>}
    </div>
  );
}

function RatingDisplay({ agency, rating, outlook }: { agency: string; rating: string | null; outlook: string | null }) {
  if (!rating || rating === "-") return null;
  const outlookColor =
    outlook === "POSITIVE" || outlook === "POS"
      ? "text-emerald-400"
      : outlook === "NEGATIVE" || outlook === "NEG"
      ? "text-red-400"
      : "text-blue-400";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{agency}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{rating}</span>
        {outlook && outlook !== "-" && (
          <span className={`text-[10px] font-medium ${outlookColor}`}>{outlook}</span>
        )}
      </div>
    </div>
  );
}

function AssessmentBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const config: Record<string, { bg: string; icon: any; label: string }> = {
    POS: { bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: TrendingUp, label: "Positive" },
    STA: { bg: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Minus, label: "Stable" },
    NEG: { bg: "bg-red-500/15 text-red-400 border-red-500/30", icon: TrendingDown, label: "Negative" },
  };
  const c = config[value] || { bg: "bg-muted text-muted-foreground border-border", icon: Minus, label: value };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
      <c.icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
}

export default function SovereignBondDetail() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const bondQuery = trpc.sovereign.detail.useQuery({ slug: params.slug || "" });

  const bond = bondQuery.data;

  if (bondQuery.isLoading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-6 bg-muted rounded w-96" />
          <div className="grid grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bond) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto text-center py-20">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Bond Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested sovereign bond could not be found.</p>
        <button
          onClick={() => setLocation("/fixed-income/sovereign")}
          className="text-primary hover:underline text-sm"
        >
          ← Back to Sovereign Bonds
        </button>
      </div>
    );
  }

  // Radar chart data for macro health
  const radarData = [
    { metric: "Fiscal", value: bond.fiscalBalance != null ? Math.max(0, Math.min(10, 5 + bond.fiscalBalance)) : 5, fullMark: 10 },
    { metric: "Debt", value: bond.publicDebtGDP2025 != null ? Math.max(0, Math.min(10, 10 - bond.publicDebtGDP2025 / 15)) : 5, fullMark: 10 },
    { metric: "Growth", value: bond.realGDPGrowth != null ? Math.max(0, Math.min(10, bond.realGDPGrowth + 3)) : 5, fullMark: 10 },
    { metric: "Inflation", value: bond.inflation != null ? Math.max(0, Math.min(10, 10 - bond.inflation / 3)) : 5, fullMark: 10 },
    { metric: "Reserves", value: bond.reservesMonths != null ? Math.max(0, Math.min(10, bond.reservesMonths)) : 5, fullMark: 10 },
    { metric: "Ext. Balance", value: bond.currentAccount != null ? Math.max(0, Math.min(10, 5 + bond.currentAccount / 3)) : 5, fullMark: 10 },
  ];

  // Bar chart for key metrics comparison
  const debtBarData = [
    { name: "Public Debt/GDP", value: bond.publicDebtGDP2025, color: "#3b82f6" },
    { name: "Ext. Debt/GDP", value: bond.externalDebtGDP, color: "#f59e0b" },
    { name: "Int. Exp/Rev", value: bond.interestExpGovRev, color: "#ef4444" },
  ].filter((d) => d.value != null);

  // Credit comment paragraphs
  const commentParagraphs = bond.creditComment
    ? bond.creditComment.split("\n").filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/")}>Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/fixed-income/sovereign")}>Sovereign</span>
        <span>/</span>
        <span className="text-foreground font-medium">{bond.name}</span>
      </div>

      {/* Back button */}
      <button
        onClick={() => setLocation("/fixed-income/sovereign")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sovereign Bonds
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {(() => {
                const flagUrl = getFlagUrl(bond.country, "48x36");
                return flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={bond.country || ""}
                    className="h-12 w-16 rounded-lg object-cover shadow-md border border-border/50"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                );
              })()}
              <div>
                <h1 className="text-xl font-bold">{bond.name}</h1>
                <p className="text-sm text-muted-foreground">{bond.ticker}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {bond.country && (
                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium">
                  {bond.country}
                </span>
              )}
              {bond.region && (
                <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
                  {bond.region}
                </span>
              )}
              {bond.currency && (
                <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                  {bond.currency}
                </span>
              )}
              {bond.igHyIndicator && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  bond.igHyIndicator === "IG"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-orange-500/10 text-orange-400"
                }`}>
                  {bond.igHyIndicator}
                </span>
              )}
              <AssessmentBadge value={bond.creditAssessment} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{formatNum(bond.yieldToMaturity, 3)}%</div>
            <div className="text-xs text-muted-foreground">Yield to Maturity</div>
            <div className="mt-2 text-lg font-semibold">{formatNum(bond.price, 3)}</div>
            <div className="text-xs text-muted-foreground">Indicative Price</div>
          </div>
        </div>
      </div>

      {/* Bond Pricing & Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Metrics */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Pricing & Performance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Price" value={formatNum(bond.price, 3)} icon={DollarSign} />
            <MetricCard label="YTM" value={`${formatNum(bond.yieldToMaturity, 3)}%`} icon={TrendingUp} color="text-primary" />
            <MetricCard label="Modified Duration" value={`${formatNum(bond.duration, 2)} yrs`} icon={Activity} />
            <MetricCard label="Maturity (Years)" value={formatNum(bond.maturityYears, 1)} icon={BarChart3} />
            <MetricCard label="OAS Spread" value={bond.oasSpread != null ? `${bond.oasSpread.toFixed(0)} bps` : "—"} icon={BarChart3} />
            <MetricCard label="Z-Spread" value={bond.zSpread != null ? `${bond.zSpread.toFixed(0)} bps` : "—"} icon={BarChart3} />
            <MetricCard
              label="1M Change"
              value={formatPct(bond.change1M)}
              icon={bond.change1M != null && bond.change1M >= 0 ? ArrowUpRight : ArrowDownRight}
              color={bond.change1M != null ? (bond.change1M >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="3M Change"
              value={formatPct(bond.change3M)}
              icon={bond.change3M != null && bond.change3M >= 0 ? ArrowUpRight : ArrowDownRight}
              color={bond.change3M != null ? (bond.change3M >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="Total Return YTD"
              value={formatPct(bond.totalReturnYTD)}
              icon={bond.totalReturnYTD != null && bond.totalReturnYTD >= 0 ? TrendingUp : TrendingDown}
              color={bond.totalReturnYTD != null ? (bond.totalReturnYTD >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="Default Prob (3Y)"
              value={bond.defaultProb != null ? `${(bond.defaultProb * 100).toFixed(2)}%` : "—"}
              icon={AlertTriangle}
              color={bond.defaultProb != null && bond.defaultProb > 0.05 ? "text-red-400" : "text-foreground"}
            />
          </div>
        </div>

        {/* Bond Structure */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-amber-500" />
            Bond Structure
          </h3>
          <div className="space-y-0">
            {[
              { label: "ISIN", value: bond.isin },
              { label: "Coupon", value: bond.coupon != null ? `${bond.coupon}%` : null },
              { label: "Coupon Type", value: bond.couponType },
              { label: "Coupon Frequency", value: bond.couponFreq != null ? `${bond.couponFreq}x per year` : null },
              { label: "Maturity Date", value: bond.maturity },
              { label: "Series", value: bond.series },
              { label: "Payment Rank", value: bond.paymentRank },
              { label: "Amount Issued", value: bond.amtIssued != null ? `${bond.amtIssued.toLocaleString()} mln` : null },
              { label: "Amount Outstanding", value: bond.amtOutstanding != null ? `${bond.amtOutstanding.toLocaleString()} mln` : null },
              { label: "Min Piece", value: bond.minPiece != null ? bond.minPiece.toLocaleString() : null },
              { label: "Score", value: bond.score != null ? `${bond.score} / 15` : null },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-medium">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credit Ratings */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          Credit Ratings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="text-[11px] text-muted-foreground mb-2">Composite</div>
            <div className="text-2xl font-bold text-center">{bond.compositeRating || "—"}</div>
            <div className="text-center mt-1">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                bond.igHyIndicator === "IG"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : bond.igHyIndicator === "HY"
                  ? "bg-orange-500/15 text-orange-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                {bond.igHyIndicator || "—"}
              </span>
            </div>
          </div>
          <div className="md:col-span-3 bg-muted/30 rounded-lg p-4 border border-border/50">
            <RatingDisplay agency="S&P" rating={bond.rtgSP} outlook={bond.rtgSPOutlook} />
            <RatingDisplay agency="Moody's" rating={bond.rtgMoody} outlook={bond.rtgMoodyOutlook} />
            <RatingDisplay agency="Fitch" rating={bond.rtgFitch} outlook={bond.rtgFitchOutlook} />
          </div>
        </div>
      </div>

      {/* Macro Fundamentals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macro Radar */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Macro Health Radar
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Debt & Fiscal */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-500" />
            Debt & Fiscal Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Public Debt/GDP 2025"
              value={bond.publicDebtGDP2025 != null ? `${bond.publicDebtGDP2025}%` : "—"}
              icon={Landmark}
            />
            <MetricCard
              label="Public Debt/GDP 2024"
              value={bond.publicDebtGDP2024 != null ? `${bond.publicDebtGDP2024}%` : "—"}
              icon={Landmark}
            />
            <MetricCard
              label="Debt Trajectory"
              value={bond.debtTrajectory != null ? `${bond.debtTrajectory > 0 ? "+" : ""}${bond.debtTrajectory}% YoY` : "—"}
              icon={bond.debtTrajectory != null && bond.debtTrajectory <= 0 ? TrendingDown : TrendingUp}
              color={bond.debtTrajectory != null ? (bond.debtTrajectory <= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="External Debt/GDP"
              value={bond.externalDebtGDP != null ? `${bond.externalDebtGDP}%` : "—"}
              icon={Scale}
            />
            <MetricCard
              label="Fiscal Balance"
              value={bond.fiscalBalance != null ? `${bond.fiscalBalance > 0 ? "+" : ""}${bond.fiscalBalance}% GDP` : "—"}
              icon={Wallet}
              color={bond.fiscalBalance != null ? (bond.fiscalBalance >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="Interest Exp / Gov Rev"
              value={bond.interestExpGovRev != null ? `${bond.interestExpGovRev}%` : "—"}
              icon={DollarSign}
            />
          </div>
        </div>

        {/* Growth & Monetary */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Growth & Monetary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Real GDP Growth 2025"
              value={bond.realGDPGrowth != null ? `${bond.realGDPGrowth}%` : "—"}
              icon={TrendingUp}
              color={bond.realGDPGrowth != null ? (bond.realGDPGrowth >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="Inflation (CPI 2025)"
              value={bond.inflation != null ? `${bond.inflation}%` : "—"}
              icon={BarChart3}
            />
            <MetricCard
              label="Disinflation Moment"
              value={bond.disinflation != null ? `${bond.disinflation > 0 ? "+" : ""}${bond.disinflation}%` : "—"}
              icon={Activity}
            />
            <MetricCard
              label="Money Growth (M2)"
              value={bond.moneyGrowth != null ? `${bond.moneyGrowth}%` : "—"}
              icon={Banknote}
            />
            <MetricCard
              label="Current Account"
              value={bond.currentAccount != null ? `${bond.currentAccount > 0 ? "+" : ""}${bond.currentAccount}% GDP` : "—"}
              icon={PiggyBank}
              color={bond.currentAccount != null ? (bond.currentAccount >= 0 ? "text-emerald-400" : "text-red-400") : "text-foreground"}
            />
            <MetricCard
              label="FX Stability"
              value={bond.fxStability === "S" ? "Strengthening" : bond.fxStability === "D" ? "Depreciating" : bond.fxStability || "—"}
              icon={DollarSign}
              color={bond.fxStability === "S" ? "text-emerald-400" : bond.fxStability === "D" ? "text-red-400" : "text-foreground"}
            />
          </div>
        </div>
      </div>

      {/* Reserves */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-cyan-500" />
          International Reserves & External Position
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            label="Reserves (Months)"
            value={bond.reservesMonths != null ? `${bond.reservesMonths} months` : "—"}
            icon={PiggyBank}
          />
          <MetricCard
            label="Reserves"
            value={formatBln(bond.reservesBln)}
            icon={DollarSign}
          />
          <MetricCard
            label="External Debt"
            value={formatBln(bond.externalDebtBln)}
            icon={Scale}
          />
          <MetricCard
            label="Reserves / Ext. Debt"
            value={bond.reservesExtDebt != null ? `${bond.reservesExtDebt}x` : "—"}
            icon={Shield}
            color={bond.reservesExtDebt != null ? (bond.reservesExtDebt >= 1 ? "text-emerald-400" : "text-amber-400") : "text-foreground"}
          />
          <MetricCard
            label="Reserves Trend"
            value={bond.reservesTrend === "U" ? "Increasing" : bond.reservesTrend === "D" ? "Decreasing" : bond.reservesTrend || "—"}
            icon={bond.reservesTrend === "U" ? TrendingUp : TrendingDown}
            color={bond.reservesTrend === "U" ? "text-emerald-400" : bond.reservesTrend === "D" ? "text-red-400" : "text-foreground"}
          />
        </div>
      </div>

      {/* Debt Comparison Bar Chart */}
      {debtBarData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Key Ratios Comparison (% of GDP / Revenue)
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtBarData} layout="vertical" margin={{ left: 100, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={95}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {debtBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Credit Commentary */}
      {commentParagraphs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-amber-500" />
            Credit Commentary
          </h3>
          <div className="prose prose-sm prose-invert max-w-none">
            {commentParagraphs.map((p, i) => {
              // First line is usually the title
              if (i === 0) {
                return (
                  <h4 key={i} className="text-base font-semibold text-foreground mb-3">
                    {p}
                  </h4>
                );
              }
              // Second line is usually the credit rating summary
              if (i === 1 && p.startsWith("Credit Rating:")) {
                return (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-4">
                    <p className="text-xs text-muted-foreground">{p}</p>
                  </div>
                );
              }
              // Rest is the commentary
              return (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {p}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
