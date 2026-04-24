import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import {
  Globe,
  Search,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Filter,
  MapPin,
  Minus,
} from "lucide-react";
import { getFlagUrl } from "@/lib/countryFlags";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const REGION_DESCRIPTIONS: Record<string, string> = {
  Africa: "African sovereign economies span a wide spectrum from resource-rich nations to rapidly diversifying markets. The continent features some of the world's fastest-growing economies alongside countries managing debt sustainability challenges.",
  Americas: "The Americas region encompasses the world's largest economy alongside diverse emerging markets. From developed North American markets to Caribbean island nations, the region offers varied investment opportunities.",
  Asia: "Asia-Pacific represents the world's most dynamic growth region, home to both advanced economies and rapidly developing markets. The region drives global trade and increasingly shapes monetary policy trends.",
  CIS: "The Commonwealth of Independent States and neighboring economies feature resource-dependent and transitioning markets. These nations navigate between commodity cycles and structural economic reforms.",
  Europe: "European sovereign markets range from AAA-rated core economies to converging peripheral markets. The region benefits from institutional frameworks while managing fiscal consolidation and demographic challenges.",
  Latam: "Latin American economies are characterized by commodity dependence, evolving monetary frameworks, and structural reform agendas. The region offers yield premiums reflecting both growth potential and political risk.",
  "Middle East": "Middle Eastern sovereigns are dominated by hydrocarbon-rich Gulf states alongside diversifying economies. The region features some of the world's strongest fiscal positions and growing capital markets.",
  Oceania: "Oceania's sovereign markets are anchored by Australia and New Zealand's developed economies, complemented by Pacific island nations with unique economic structures and development challenges.",
};

const REGIONS_LIST = ["Africa", "Americas", "Asia", "CIS", "Europe", "Latam", "Middle East", "Oceania"];

type SortField = "country" | "compositeRating" | "bondCount" | "realGDPGrowth" | "inflation" | "fiscalBalance" | "publicDebtGDP2025" | "currentAccount" | "reservesBln" | "score" | "creditAssessment";

export default function MacroRegion() {
  const params = useParams<{ region: string }>();
  const [, setLocation] = useLocation();
  const region = decodeURIComponent(params.region || "");
  const countriesQuery = trpc.sovereign.countries.useQuery();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("country");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const allCountries = countriesQuery.data || [];
  const regionCountries = useMemo(() => {
    let result = allCountries.filter((c) => c.region === region);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.country.toLowerCase().includes(q));
    }
    return result.sort((a: any, b: any) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [allCountries, region, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir(field === "country" ? "asc" : "desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Scatter data: GDP Growth vs Inflation
  const scatterData = useMemo(() => {
    return regionCountries
      .filter((c) => c.realGDPGrowth != null && c.inflation != null)
      .map((c) => ({
        x: c.realGDPGrowth!,
        y: c.inflation!,
        country: c.country,
        rating: c.compositeRating,
      }));
  }, [regionCountries]);

  // Bar chart: Fiscal Balance
  const fiscalBarData = useMemo(() => {
    return regionCountries
      .filter((c) => c.fiscalBalance != null)
      .map((c) => ({
        country: c.country,
        value: c.fiscalBalance!,
        color: c.fiscalBalance! >= 0 ? "#22c55e" : "#ef4444",
      }))
      .sort((a, b) => b.value - a.value);
  }, [regionCountries]);

  // Stats
  const stats = useMemo(() => {
    const gdpVals = regionCountries.filter((c) => c.realGDPGrowth != null);
    const infVals = regionCountries.filter((c) => c.inflation != null);
    const fisVals = regionCountries.filter((c) => c.fiscalBalance != null);
    return {
      countries: regionCountries.length,
      bonds: regionCountries.reduce((s, c) => s + c.bondCount, 0),
      avgGDP: gdpVals.length ? (gdpVals.reduce((s, c) => s + c.realGDPGrowth!, 0) / gdpVals.length) : null,
      avgInflation: infVals.length ? (infVals.reduce((s, c) => s + c.inflation!, 0) / infVals.length) : null,
      avgFiscal: fisVals.length ? (fisVals.reduce((s, c) => s + c.fiscalBalance!, 0) / fisVals.length) : null,
    };
  }, [regionCountries]);

  if (countriesQuery.isLoading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-[300px] bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/")}>Home</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/macro")}>Macroeconomics</span>
        <span>/</span>
        <span className="text-foreground font-medium">{region}</span>
      </div>

      <button
        onClick={() => setLocation("/macro")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Countries
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Globe className="h-7 w-7 text-primary" />
          {region} — Macroeconomic Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          {REGION_DESCRIPTIONS[region] || `Macroeconomic overview for the ${region} region.`}
        </p>
      </div>

      {/* Region Navigation */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLocation("/macro")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-card text-muted-foreground border-border hover:bg-muted"
        >
          All Countries
        </button>
        {REGIONS_LIST.map((r) => (
          <button
            key={r}
            onClick={() => setLocation(`/macro/region/${encodeURIComponent(r)}`)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              region === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Countries", value: stats.countries.toString(), icon: Globe },
          { label: "Sovereign Bonds", value: stats.bonds.toString(), icon: MapPin },
          { label: "Avg GDP Growth", value: stats.avgGDP != null ? `${stats.avgGDP.toFixed(1)}%` : "—", icon: TrendingUp, color: stats.avgGDP != null && stats.avgGDP >= 0 ? "text-emerald-500" : "text-red-500" },
          { label: "Avg Inflation", value: stats.avgInflation != null ? `${stats.avgInflation.toFixed(1)}%` : "—", icon: BarChart3 },
          { label: "Avg Fiscal Balance", value: stats.avgFiscal != null ? `${stats.avgFiscal.toFixed(1)}%` : "—", icon: TrendingDown, color: stats.avgFiscal != null && stats.avgFiscal >= 0 ? "text-emerald-500" : "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
            <div className={`text-lg font-bold ${(s as any).color || ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GDP vs Inflation Scatter */}
        {scatterData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              GDP Growth vs Inflation
            </h3>
            <div className="h-[300px]" style={{ minWidth: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="GDP Growth"
                    unit="%"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "Real GDP Growth (%)", position: "insideBottom", offset: -20, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Inflation"
                    unit="%"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "Inflation (%)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground border border-border rounded-lg p-2 text-xs shadow-lg">
                          <div className="font-semibold">{d.country}</div>
                          <div>GDP Growth: {d.x.toFixed(1)}%</div>
                          <div>Inflation: {d.y.toFixed(1)}%</div>
                          <div className="text-muted-foreground">{d.rating}</div>
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
                      if (data?.country) setLocation(`/macro/country/${encodeURIComponent(data.country)}`);
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Fiscal Balance Bar Chart */}
        {fiscalBarData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Fiscal Balance (% of GDP)
            </h3>
            <div className="h-[300px]" style={{ minWidth: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fiscalBarData.slice(0, 20)} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={75}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Fiscal Balance"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {fiscalBarData.slice(0, 20).map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Country Table */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            {region} Countries ({regionCountries.length})
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg w-40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                {[
                  { key: "country" as SortField, label: "Country" },
                  { key: "compositeRating" as SortField, label: "Rating" },
                  { key: "creditAssessment" as SortField, label: "Outlook" },
                  { key: "score" as SortField, label: "Score" },
                  { key: "realGDPGrowth" as SortField, label: "GDP Growth" },
                  { key: "inflation" as SortField, label: "Inflation" },
                  { key: "fiscalBalance" as SortField, label: "Fiscal Bal." },
                  { key: "publicDebtGDP2025" as SortField, label: "Pub. Debt/GDP" },
                  { key: "currentAccount" as SortField, label: "Curr. Acct." },
                  { key: "reservesBln" as SortField, label: "Reserves" },
                  { key: "bondCount" as SortField, label: "Bonds" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-2 px-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.key} />
                    </span>
                  </th>
                ))}
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {regionCountries.map((c) => {
                const flagUrl = getFlagUrl(c.country, "20x15");
                return (
                  <tr
                    key={c.country}
                    className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/macro/country/${encodeURIComponent(c.country)}`)}
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        {flagUrl && <img src={flagUrl} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                        <span className="font-medium">{c.country}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`font-semibold ${c.igHyIndicator === "IG" ? "text-emerald-500" : c.igHyIndicator === "HY" ? "text-amber-500" : ""}`}>
                        {c.compositeRating || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {c.creditAssessment ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          c.creditAssessment === "POS" ? "bg-emerald-500/15 text-emerald-500" :
                          c.creditAssessment === "NEG" ? "bg-red-500/15 text-red-500" :
                          "bg-blue-500/15 text-blue-500"
                        }`}>
                          {c.creditAssessment === "POS" ? <TrendingUp className="h-2.5 w-2.5" /> :
                           c.creditAssessment === "NEG" ? <TrendingDown className="h-2.5 w-2.5" /> :
                           <Minus className="h-2.5 w-2.5" />}
                          {c.creditAssessment === "POS" ? "Positive" : c.creditAssessment === "NEG" ? "Negative" : "Stable"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-2 font-medium">{c.score != null ? `${c.score}/15` : "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className={c.realGDPGrowth != null ? (c.realGDPGrowth >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.realGDPGrowth != null ? `${c.realGDPGrowth.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">{c.inflation != null ? `${c.inflation.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className={c.fiscalBalance != null ? (c.fiscalBalance >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.fiscalBalance != null ? `${c.fiscalBalance.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">{c.publicDebtGDP2025 != null ? `${c.publicDebtGDP2025.toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className={c.currentAccount != null ? (c.currentAccount >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.currentAccount != null ? `${c.currentAccount.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">{c.reservesBln != null ? `$${c.reservesBln.toFixed(1)}B` : "—"}</td>
                    <td className="py-2.5 px-2 text-center font-medium">{c.bondCount}</td>
                    <td className="py-2.5 px-2"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
