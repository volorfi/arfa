import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  BarChart3,
  DollarSign,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type SortField =
  | "issuerName"
  | "rating"
  | "yieldToMaturity"
  | "duration"
  | "oasSpread"
  | "zSpread"
  | "price"
  | "change1M"
  | "totalReturn"
  | "score"
  | "amountOutstanding";
type SortDir = "asc" | "desc";

const RATING_ORDER: Record<string, number> = {
  AAA: 1, "AA+": 2, AA: 3, "AA-": 4, "A+": 5, A: 6, "A-": 7,
  "BBB+": 8, BBB: 9, "BBB-": 10, "BB+": 11, NR: 12,
};

const TREND_COLORS: Record<string, string> = {
  POS: "text-emerald-400",
  STA: "text-blue-400",
  NEG: "text-red-400",
};
const TREND_ICONS: Record<string, typeof TrendingUp> = {
  POS: TrendingUp,
  STA: Minus,
  NEG: TrendingDown,
};
const TREND_LABELS: Record<string, string> = {
  POS: "Positive",
  STA: "Stable",
  NEG: "Negative",
};

const REC_COLORS: Record<string, string> = {
  OW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  UW: "bg-red-500/20 text-red-400 border-red-500/30",
  N: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};
const REC_LABELS: Record<string, string> = {
  OW: "Overweight",
  MW: "Market Weight",
  UW: "Underweight",
  N: "Neutral",
};

const PIE_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48",
];

function formatNumber(val: number | null, decimals = 2): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function formatLargeNumber(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  return `$${val.toFixed(0)}M`;
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const isIG =
    rating.startsWith("A") || rating.startsWith("BBB") || rating === "NR";
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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colorClass}`}
    >
      {rating}
    </span>
  );
}

export default function InvestmentGrade() {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterTrend, setFilterTrend] = useState("");
  const [filterRec, setFilterRec] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: bonds, isLoading } = trpc.bonds.list.useQuery({
    rating: filterRating || undefined,
    region: filterRegion || undefined,
    sector: filterSector || undefined,
    creditTrend: filterTrend || undefined,
    recommendation: filterRec || undefined,
    search: searchQuery || undefined,
  });

  const { data: filters } = trpc.bonds.filters.useQuery();
  const { data: summary } = trpc.bonds.summary.useQuery();

  const sorted = useMemo(() => {
    if (!bonds) return [];
    const arr = [...bonds];
    arr.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === "rating") {
        aVal = RATING_ORDER[a.rating || "NR"] || 99;
        bVal = RATING_ORDER[b.rating || "NR"] || 99;
      } else if (sortField === "issuerName") {
        aVal = a.issuerName.toLowerCase();
        bVal = b.issuerName.toLowerCase();
      } else {
        aVal = (a as any)[sortField] ?? (sortDir === "asc" ? Infinity : -Infinity);
        bVal = (b as any)[sortField] ?? (sortDir === "asc" ? Infinity : -Infinity);
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [bonds, sortField, sortDir]);

  const paged = useMemo(() => {
    return sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "issuerName" ? "asc" : "desc");
    }
    setPage(0);
  }

  function SortHeader({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    const active = sortField === field;
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${className}`}
        onClick={() => toggleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3 text-primary" />
            ) : (
              <ArrowDown className="h-3 w-3 text-primary" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </div>
      </th>
    );
  }

  const hasActiveFilters =
    filterRating || filterRegion || filterSector || filterTrend || filterRec;

  const ratingChartData = summary
    ? Object.entries(summary.ratingDistribution)
        .sort(
          ([a], [b]) =>
            (RATING_ORDER[a] || 99) - (RATING_ORDER[b] || 99)
        )
        .map(([name, value]) => ({ name, value }))
    : [];

  const regionChartData = summary
    ? Object.entries(summary.regionDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          USD Investment Grade Bonds
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive analysis of {summary?.totalBonds || "—"} USD-denominated
          investment grade bonds across {summary?.totalIssuers || "—"} issuers
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Bonds</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {summary.totalBonds}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Yield</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {summary.avgYield}%
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg OAS Spread</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {summary.avgSpread} bps
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Duration</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {summary.avgDuration} yrs
            </span>
          </div>
        </div>
      )}

      {/* Distribution Charts */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Rating Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ratingChartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
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
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Region Distribution
            </h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={regionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                  >
                    {regionChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 text-xs">
                {regionChartData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">
                      {item.name}{" "}
                      <span className="text-foreground font-medium">
                        ({item.value})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by issuer, ticker, or ISIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 ${hasActiveFilters ? "border-primary text-primary" : ""}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {[filterRating, filterRegion, filterSector, filterTrend, filterRec].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {showFilters && filters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Rating
              </label>
              <select
                value={filterRating}
                onChange={(e) => {
                  setFilterRating(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground"
              >
                <option value="">All Ratings</option>
                {filters.ratings.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Region
              </label>
              <select
                value={filterRegion}
                onChange={(e) => {
                  setFilterRegion(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground"
              >
                <option value="">All Regions</option>
                {filters.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Sector
              </label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground"
              >
                <option value="">All Sectors</option>
                {filters.sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Credit Trend
              </label>
              <select
                value={filterTrend}
                onChange={(e) => {
                  setFilterTrend(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground"
              >
                <option value="">All Trends</option>
                {filters.creditTrends.map((t) => (
                  <option key={t} value={t}>
                    {TREND_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Recommendation
              </label>
              <select
                value={filterRec}
                onChange={(e) => {
                  setFilterRec(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-sm text-foreground"
              >
                <option value="">All</option>
                {filters.recommendations.map((r) => (
                  <option key={r} value={r}>
                    {REC_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="col-span-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterRating("");
                    setFilterRegion("");
                    setFilterSector("");
                    setFilterTrend("");
                    setFilterRec("");
                    setPage(0);
                  }}
                  className="text-xs gap-1"
                >
                  <X className="h-3 w-3" /> Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}{" "}
          bonds
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-8">
                    #
                  </th>
                  <SortHeader field="issuerName" className="min-w-[200px]">
                    Issuer / Ticker
                  </SortHeader>
                  <SortHeader field="rating">Rating</SortHeader>
                  <SortHeader field="yieldToMaturity">YTM</SortHeader>
                  <SortHeader field="duration">Duration</SortHeader>
                  <SortHeader field="oasSpread">OAS</SortHeader>
                  <SortHeader field="zSpread">Z-Spread</SortHeader>
                  <SortHeader field="price">Price</SortHeader>
                  <SortHeader field="change1M">1M Chg</SortHeader>
                  <SortHeader field="totalReturn">Total Rtn</SortHeader>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rec
                  </th>
                  <SortHeader field="score">Score</SortHeader>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sector
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Region
                  </th>
                  <SortHeader field="amountOutstanding">Size</SortHeader>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((bond, idx) => {
                  const TrendIcon = bond.creditTrend
                    ? TREND_ICONS[bond.creditTrend]
                    : null;
                  return (
                    <tr
                      key={bond.isin || bond.ticker}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {page * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/fixed-income/issuer/${bond.issuerSlug}`}
                          className="group"
                        >
                          <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {bond.issuerName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {bond.ticker}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <RatingBadge rating={bond.rating} />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-medium text-foreground tabular-nums">
                        {formatNumber(bond.yieldToMaturity)}%
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground tabular-nums">
                        {formatNumber(bond.duration)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground tabular-nums">
                        {formatNumber(bond.oasSpread, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground tabular-nums">
                        {formatNumber(bond.zSpread, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground tabular-nums">
                        {formatNumber(bond.price, 2)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-sm font-medium tabular-nums ${
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
                        className={`px-3 py-2.5 text-sm font-medium tabular-nums ${
                          (bond.totalReturn ?? 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {bond.totalReturn != null
                          ? `${bond.totalReturn >= 0 ? "+" : ""}${bond.totalReturn.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {bond.creditTrend && TrendIcon && TREND_COLORS[bond.creditTrend] ? (
                          <div
                            className={`flex items-center gap-1 ${TREND_COLORS[bond.creditTrend]}`}
                          >
                            <TrendIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {TREND_LABELS[bond.creditTrend] || bond.creditTrend}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {bond.recommendation && REC_COLORS[bond.recommendation] ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                              REC_COLORS[bond.recommendation]
                            }`}
                          >
                            {bond.recommendation}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {bond.score != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (bond.score / 15) * 100)}%`,
                                  backgroundColor:
                                    bond.score >= 12
                                      ? "#10b981"
                                      : bond.score >= 8
                                      ? "#3b82f6"
                                      : bond.score >= 4
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground tabular-nums">
                              {bond.score}/15
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {bond.sector || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {bond.region || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                        {bond.amountOutstanding
                          ? formatLargeNumber(bond.amountOutstanding)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/fixed-income/issuer/${bond.issuerSlug}`}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 7 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "ghost"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
