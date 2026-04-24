import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  BarChart3,
  Landmark,
  MapPin,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Activity,
  Scale,
  Wallet,
  PiggyBank,
  Banknote,
  ArrowRight,
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
  ScatterChart,
  Scatter,
} from "recharts";

function formatNum(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

type BondSortField = "ticker" | "coupon" | "maturity" | "currency" | "price" | "yieldToMaturity" | "duration" | "zSpread";

export default function MacroCountry() {
  const params = useParams<{ country: string }>();
  const [, setLocation] = useLocation();
  const country = decodeURIComponent(params.country || "");

  const macroQuery = trpc.sovereign.countryMacro.useQuery({ country });
  const bondsQuery = trpc.sovereign.countryBonds.useQuery({ country });

  const [bondSort, setBondSort] = useState<BondSortField>("yieldToMaturity");
  const [bondSortDir, setBondSortDir] = useState<"asc" | "desc">("desc");

  const macro = macroQuery.data;
  const bonds = bondsQuery.data || [];

  const sortedBonds = useMemo(() => {
    return [...bonds].sort((a: any, b: any) => {
      const av = a[bondSort];
      const bv = b[bondSort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return bondSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return bondSortDir === "asc" ? av - bv : bv - av;
    });
  }, [bonds, bondSort, bondSortDir]);

  const toggleBondSort = (field: BondSortField) => {
    if (bondSort === field) setBondSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setBondSort(field); setBondSortDir("desc"); }
  };

  const BondSortIcon = ({ field }: { field: BondSortField }) => {
    if (bondSort !== field) return null;
    return bondSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Scatter data for bonds: Duration vs Yield
  const scatterData = useMemo(() => {
    return bonds
      .filter((b) => b.duration != null && b.yieldToMaturity != null)
      .map((b) => ({
        x: b.duration!,
        y: b.yieldToMaturity!,
        ticker: b.ticker,
        slug: b.slug,
        currency: b.currency,
      }));
  }, [bonds]);

  if (macroQuery.isLoading) {
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

  if (!macro) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto text-center py-20">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Country Not Found</h2>
        <p className="text-muted-foreground mb-4">No macroeconomic data found for "{country}".</p>
        <button onClick={() => setLocation("/macro")} className="text-primary hover:underline text-sm">
          ← Back to All Countries
        </button>
      </div>
    );
  }

  const flagUrl = getFlagUrl(country, "48x36");

  // Radar chart data
  const radarData = [
    { metric: "Fiscal", value: macro.fiscalBalance != null ? Math.max(0, Math.min(10, 5 + macro.fiscalBalance)) : 5, fullMark: 10 },
    { metric: "Debt", value: macro.publicDebtGDP2025 != null ? Math.max(0, Math.min(10, 10 - macro.publicDebtGDP2025 / 15)) : 5, fullMark: 10 },
    { metric: "Growth", value: macro.realGDPGrowth != null ? Math.max(0, Math.min(10, macro.realGDPGrowth + 3)) : 5, fullMark: 10 },
    { metric: "Inflation", value: macro.inflation != null ? Math.max(0, Math.min(10, 10 - macro.inflation / 3)) : 5, fullMark: 10 },
    { metric: "Reserves", value: macro.reservesMonths != null ? Math.max(0, Math.min(10, macro.reservesMonths)) : 5, fullMark: 10 },
    { metric: "Ext. Balance", value: macro.currentAccount != null ? Math.max(0, Math.min(10, 5 + macro.currentAccount / 3)) : 5, fullMark: 10 },
  ];

  const commentParagraphs = macro.creditComment
    ? macro.creditComment.split("\n").filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/")}>Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/macro")}>Macroeconomics</span>
        <span>/</span>
        {macro.region && (
          <>
            <span
              className="cursor-pointer hover:text-foreground"
              onClick={() => setLocation(`/macro/region/${encodeURIComponent(macro.region!)}`)}
            >
              {macro.region}
            </span>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium">{country}</span>
      </div>

      <button
        onClick={() => macro.region ? setLocation(`/macro/region/${encodeURIComponent(macro.region)}`) : setLocation("/macro")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {macro.region || "All Countries"}
      </button>

      {/* Country Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          {flagUrl && <img src={flagUrl} alt={country} className="h-10 w-14 rounded-md object-cover shadow-sm" />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{country}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {macro.region && (
                <span className="text-xs bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {macro.region}
                </span>
              )}
              {macro.compositeRating && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                  macro.igHyIndicator === "IG"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  {macro.compositeRating} ({macro.igHyIndicator || "—"})
                </span>
              )}
              {macro.creditAssessment && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
                  macro.creditAssessment === "POS" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                  macro.creditAssessment === "NEG" ? "bg-red-500/10 text-red-500 border-red-500/30" :
                  "bg-blue-500/10 text-blue-500 border-blue-500/30"
                }`}>
                  {macro.creditAssessment === "POS" ? <TrendingUp className="h-3 w-3" /> :
                   macro.creditAssessment === "NEG" ? <TrendingDown className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {macro.creditAssessment === "POS" ? "Positive Outlook" : macro.creditAssessment === "NEG" ? "Negative Outlook" : "Stable Outlook"}
                </span>
              )}
              {macro.score != null && (
                <span className="text-xs bg-muted/50 px-2 py-1 rounded-md border border-border/50 font-medium">
                  Score: {macro.score}/15
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ratings Row */}
      {(macro.spRating || macro.moodysRating || macro.fitchRating) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { agency: "S&P", rating: macro.spRating, outlook: macro.spOutlook },
            { agency: "Moody's", rating: macro.moodysRating, outlook: macro.moodysOutlook },
            { agency: "Fitch", rating: macro.fitchRating, outlook: macro.fitchOutlook },
          ].map((r) => (
            <div key={r.agency} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-[11px] text-muted-foreground mb-1">{r.agency}</div>
              <div className="text-lg font-bold">{r.rating || "NR"}</div>
              {r.outlook && (
                <div className={`text-[10px] mt-1 ${
                  r.outlook === "POS" ? "text-emerald-500" : r.outlook === "NEG" ? "text-red-500" : "text-blue-500"
                }`}>
                  {r.outlook === "POS" ? "Positive" : r.outlook === "NEG" ? "Negative" : "Stable"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Macro Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Real GDP Growth", value: macro.realGDPGrowth, unit: "%", icon: TrendingUp, colored: true },
          { label: "Consumer Inflation", value: macro.inflation, unit: "%", icon: Activity },
          { label: "Fiscal Balance / GDP", value: macro.fiscalBalance, unit: "%", icon: Scale, colored: true },
          { label: "Public Debt / GDP", value: macro.publicDebtGDP2025, unit: "%", icon: Landmark },
          { label: "Current Account / GDP", value: macro.currentAccount, unit: "%", icon: Wallet, colored: true },
          { label: "External Debt / GDP", value: macro.externalDebtGDP, unit: "%", icon: Banknote },
          { label: "Int. Reserves", value: macro.reservesBln, unit: "$B", icon: PiggyBank },
          { label: "Interest Exp / Gov Rev", value: macro.interestExpGovRev, unit: "%", icon: DollarSign },
        ].map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
              <m.icon className="h-3 w-3" />
              {m.label}
            </div>
            <div className={`text-lg font-bold ${
              m.colored && m.value != null ? (m.value >= 0 ? "text-emerald-500" : "text-red-500") : ""
            }`}>
              {m.value != null ? `${formatNum(m.value)}${m.unit}` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Radar Chart + Debt Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-500" />
            Macro Health Radar
          </h3>
          <div className="h-[280px]" style={{ minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            Key Debt & Fiscal Metrics
          </h3>
          <div className="h-[280px]" style={{ minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Public Debt/GDP", value: macro.publicDebtGDP2025, color: "#3b82f6" },
                  { name: "Ext. Debt/GDP", value: macro.externalDebtGDP, color: "#f59e0b" },
                  { name: "Int. Exp/Rev", value: macro.interestExpGovRev, color: "#ef4444" },
                  { name: "Fiscal Bal.", value: macro.fiscalBalance, color: macro.fiscalBalance != null && macro.fiscalBalance >= 0 ? "#22c55e" : "#ef4444" },
                ].filter((d) => d.value != null)}
                margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Public Debt/GDP", value: macro.publicDebtGDP2025, color: "#3b82f6" },
                    { name: "Ext. Debt/GDP", value: macro.externalDebtGDP, color: "#f59e0b" },
                    { name: "Int. Exp/Rev", value: macro.interestExpGovRev, color: "#ef4444" },
                    { name: "Fiscal Bal.", value: macro.fiscalBalance, color: macro.fiscalBalance != null && macro.fiscalBalance >= 0 ? "#22c55e" : "#ef4444" },
                  ]
                    .filter((d) => d.value != null)
                    .map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Credit Commentary */}
      {commentParagraphs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-amber-500" />
            Credit Commentary
          </h3>
          <div className="prose prose-sm prose-invert max-w-none">
            {commentParagraphs.map((p, i) => {
              if (i === 0) {
                return <h4 key={i} className="text-base font-semibold text-foreground mb-3">{p}</h4>;
              }
              if (i === 1 && p.startsWith("Credit Rating:")) {
                return (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-4">
                    <p className="text-xs text-muted-foreground">{p}</p>
                  </div>
                );
              }
              return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{p}</p>;
            })}
          </div>
        </div>
      )}

      {/* Sovereign Bonds Table */}
      {bonds.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-500" />
            {country} Sovereign Bonds ({bonds.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {[
                    { key: "ticker" as BondSortField, label: "Bond" },
                    { key: "coupon" as BondSortField, label: "Coupon" },
                    { key: "maturity" as BondSortField, label: "Maturity" },
                    { key: "currency" as BondSortField, label: "Ccy" },
                    { key: "price" as BondSortField, label: "Price" },
                    { key: "yieldToMaturity" as BondSortField, label: "YTM" },
                    { key: "duration" as BondSortField, label: "Duration" },
                    { key: "zSpread" as BondSortField, label: "Z-Spread" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="text-left py-2 px-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleBondSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <BondSortIcon field={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBonds.map((b) => (
                  <tr
                    key={b.slug}
                    className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/fixed-income/sovereign/${b.slug}`)}
                  >
                    <td className="py-2 px-2 font-medium text-primary truncate max-w-[220px]">{b.ticker}</td>
                    <td className="py-2 px-2">{b.coupon != null ? `${b.coupon}%` : "—"}</td>
                    <td className="py-2 px-2">{b.maturity || "—"}</td>
                    <td className="py-2 px-2">{b.currency || "—"}</td>
                    <td className="py-2 px-2">{b.price != null ? b.price.toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 font-semibold">{b.yieldToMaturity != null ? `${b.yieldToMaturity.toFixed(3)}%` : "—"}</td>
                    <td className="py-2 px-2">{b.duration != null ? b.duration.toFixed(2) : "—"}</td>
                    <td className="py-2 px-2">{b.zSpread != null ? `${b.zSpread.toFixed(0)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bond Market Map - Duration vs Yield */}
      {scatterData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-500" />
            Bond Market Map — Duration vs Yield
          </h3>
          <div className="h-[350px]" style={{ minWidth: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 50, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Duration"
                  unit=" yrs"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Modified Duration (years)", position: "insideBottom", offset: -20, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Yield"
                  unit="%"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Yield to Maturity (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                />
                <RechartsTooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground border border-border rounded-lg p-2 text-xs shadow-lg">
                        <div className="font-semibold">{d.ticker}</div>
                        <div>Duration: {d.x.toFixed(2)} yrs</div>
                        <div>YTM: {d.y.toFixed(3)}%</div>
                        <div className="text-muted-foreground">{d.currency}</div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scatterData}
                  fill="#f59e0b"
                  fillOpacity={0.7}
                  r={6}
                  cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.slug) setLocation(`/fixed-income/sovereign/${data.slug}`);
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Link to Sovereign Bonds */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Explore Sovereign Bond Universe</h3>
          <p className="text-xs text-muted-foreground mt-0.5">View all sovereign bonds with advanced filtering and market maps</p>
        </div>
        <button
          onClick={() => setLocation(`/fixed-income/sovereign?country=${encodeURIComponent(country)}`)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          View in Sovereign Bonds <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
