import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Globe,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  MapPin,
  DollarSign,
  Shield,
  X,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

const ITEMS_PER_PAGE = 50;

type SortField =
  | "name"
  | "compositeRating"
  | "yieldToMaturity"
  | "duration"
  | "oasSpread"
  | "zSpread"
  | "price"
  | "change1M"
  | "totalReturnYTD"
  | "creditAssessment"
  | "score"
  | "currency"
  | "maturityYears"
  | "coupon";

type SortDir = "asc" | "desc";

const REGION_COLORS: Record<string, string> = {
  "Middle East": "#f59e0b",
  Europe: "#3b82f6",
  Africa: "#ef4444",
  Americas: "#10b981",
  Asia: "#8b5cf6",
  Latam: "#f97316",
  CIS: "#06b6d4",
  Oceania: "#84cc16",
};

const RATING_ORDER = [
  "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
  "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-",
  "B+", "B", "B-", "CCC+", "CCC", "CCC-", "NR",
];

function ratingIndex(r: string | null): number {
  if (!r) return 999;
  const idx = RATING_ORDER.indexOf(r);
  return idx === -1 ? 998 : idx;
}

function formatNum(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function formatPct(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "—";
  return `${val >= 0 ? "+" : ""}${val.toFixed(decimals)}%`;
}

function AssessmentBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    POS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    STA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    NEG: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = { POS: "Positive", STA: "Stable", NEG: "Negative" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors[value] || "bg-muted text-muted-foreground border-border"}`}>
      {value === "POS" && <TrendingUp className="h-3 w-3" />}
      {value === "NEG" && <TrendingDown className="h-3 w-3" />}
      {value === "STA" && <Minus className="h-3 w-3" />}
      {labels[value] || value}
    </span>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const idx = ratingIndex(rating);
  let color = "bg-muted text-muted-foreground";
  if (idx <= 2) color = "bg-emerald-500/15 text-emerald-400";
  else if (idx <= 6) color = "bg-green-500/15 text-green-400";
  else if (idx <= 9) color = "bg-blue-500/15 text-blue-400";
  else if (idx <= 12) color = "bg-yellow-500/15 text-yellow-400";
  else if (idx <= 15) color = "bg-orange-500/15 text-orange-400";
  else if (idx <= 18) color = "bg-red-500/15 text-red-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${color}`}>
      {rating}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const max = 20;
  const pct = Math.min((score / max) * 100, 100);
  let color = "bg-red-500";
  if (score >= 15) color = "bg-emerald-500";
  else if (score >= 10) color = "bg-blue-500";
  else if (score >= 7) color = "bg-yellow-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

// Custom scatter tooltip
function CustomScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl text-xs max-w-[280px]">
      <div className="font-semibold text-sm text-foreground mb-1">{d.name}</div>
      <div className="text-muted-foreground mb-2">{d.ticker}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">Rating:</span>
        <span className="font-medium">{d.compositeRating || "—"}</span>
        <span className="text-muted-foreground">Coupon:</span>
        <span className="font-medium">{d.coupon != null ? `${d.coupon}%` : "—"}</span>
        <span className="text-muted-foreground">Currency:</span>
        <span className="font-medium">{d.currency || "—"}</span>
        <span className="text-muted-foreground">Price:</span>
        <span className="font-medium">{d.price != null ? d.price.toFixed(2) : "—"}</span>
        <span className="text-muted-foreground">Duration:</span>
        <span className="font-medium">{d.x != null ? `${d.x.toFixed(2)} yrs` : "—"}</span>
        <span className="text-muted-foreground">Yield:</span>
        <span className="font-medium">{d.y != null ? `${d.y.toFixed(3)}%` : "—"}</span>
        <span className="text-muted-foreground">OAS:</span>
        <span className="font-medium">{d.oasSpread != null ? `${d.oasSpread.toFixed(0)} bps` : "—"}</span>
      </div>
    </div>
  );
}

export default function Sovereign() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [rating, setRating] = useState("");
  const [igHy, setIgHy] = useState("");
  const [creditAssessment, setCreditAssessment] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [chartGroupBy, setChartGroupBy] = useState<"none" | "region" | "currency">("region");

  const filtersQuery = trpc.sovereign.filters.useQuery();
  const summaryQuery = trpc.sovereign.summary.useQuery();
  const bondsQuery = trpc.sovereign.list.useQuery({
    region: region || undefined,
    country: country || undefined,
    currency: currency || undefined,
    rating: rating || undefined,
    igHy: igHy || undefined,
    creditAssessment: creditAssessment || undefined,
    search: search || undefined,
  });

  const bonds = bondsQuery.data || [];
  const filters = filtersQuery.data;
  const summary = summaryQuery.data;

  // Sort bonds
  const sorted = useMemo(() => {
    const arr = [...bonds];
    arr.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === "compositeRating") {
        aVal = ratingIndex(a.compositeRating);
        bVal = ratingIndex(b.compositeRating);
      } else {
        aVal = (a as any)[sortField];
        bVal = (b as any)[sortField];
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [bonds, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Scatter chart data
  const scatterData = useMemo(() => {
    return bonds
      .filter((b) => b.duration != null && b.yieldToMaturity != null)
      .map((b) => ({
        x: b.duration!,
        y: b.yieldToMaturity!,
        name: b.name,
        ticker: b.ticker,
        compositeRating: b.compositeRating,
        coupon: b.coupon,
        currency: b.currency,
        price: b.price,
        oasSpread: b.oasSpread,
        region: b.region,
        slug: b.slug,
      }));
  }, [bonds]);

  // Group scatter data for legend coloring
  const scatterGroups = useMemo(() => {
    if (chartGroupBy === "none") return { All: scatterData };
    const groups: Record<string, typeof scatterData> = {};
    scatterData.forEach((d) => {
      const key = chartGroupBy === "region" ? (d.region || "Other") : (d.currency || "Other");
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [scatterData, chartGroupBy]);

  const groupColors = useMemo(() => {
    const keys = Object.keys(scatterGroups);
    const palette = [
      "#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6",
      "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6",
      "#a855f7", "#f43f5e", "#0ea5e9", "#eab308", "#22c55e",
      "#d946ef", "#64748b", "#fb923c", "#2dd4bf", "#818cf8",
    ];
    const map: Record<string, string> = {};
    keys.forEach((k, i) => {
      if (chartGroupBy === "region" && REGION_COLORS[k]) {
        map[k] = REGION_COLORS[k];
      } else {
        map[k] = palette[i % palette.length];
      }
    });
    return map;
  }, [scatterGroups, chartGroupBy]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  }

  const activeFiltersCount = [region, country, currency, rating, igHy, creditAssessment, search].filter(Boolean).length;

  function clearAllFilters() {
    setRegion("");
    setCountry("");
    setCurrency("");
    setRating("");
    setIgHy("");
    setCreditAssessment("");
    setSearch("");
    setPage(1);
  }

  // Filtered countries based on selected region
  const filteredCountries = useMemo(() => {
    if (!filters) return [];
    if (!region) return filters.countries;
    // We need to get countries that belong to the selected region from the bonds data
    const countriesInRegion = Array.from(
      new Set(bonds.map((b) => b.country).filter(Boolean))
    ).sort() as string[];
    return countriesInRegion.length > 0 ? countriesInRegion : filters.countries;
  }, [filters, region, bonds]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/")}>Home</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/fixed-income/investment-grade")}>Fixed Income</span>
          <span>/</span>
          <span className="text-foreground font-medium">Sovereign</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          Sovereign Bonds
        </h1>
        <p className="text-muted-foreground mt-1">
          Global sovereign debt market — {bonds.length} bonds across {summary?.uniqueCountries || 0} countries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Total Bonds
          </div>
          <div className="text-xl font-bold">{summary?.totalBonds || bonds.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <MapPin className="h-3.5 w-3.5" />
            Countries
          </div>
          <div className="text-xl font-bold">{summary?.uniqueCountries || 0}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Avg Yield
          </div>
          <div className="text-xl font-bold">{summary?.avgYield || "0"}%</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            Avg OAS
          </div>
          <div className="text-xl font-bold">{summary?.avgSpread || "0"} bps</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Shield className="h-3.5 w-3.5" />
            Avg Duration
          </div>
          <div className="text-xl font-bold">{summary?.avgDuration || "0"} yrs</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </h3>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Search */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] text-muted-foreground mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ticker, country..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {/* Region */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Region</label>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setCountry(""); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Regions</option>
              {filters?.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {/* Country */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Country</label>
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Countries</option>
              {filteredCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {/* Currency */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Currency</label>
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Currencies</option>
              {filters?.currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {/* Rating */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Rating</label>
            <select
              value={rating}
              onChange={(e) => { setRating(e.target.value); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Ratings</option>
              {filters?.ratings.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {/* IG/HY */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">IG / HY</label>
            <select
              value={igHy}
              onChange={(e) => { setIgHy(e.target.value); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All</option>
              {filters?.igHyOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {/* Credit Assessment */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Credit Trend</label>
            <select
              value={creditAssessment}
              onChange={(e) => { setCreditAssessment(e.target.value); setPage(1); }}
              className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All</option>
              {filters?.creditAssessments.map((a) => (
                <option key={a} value={a}>
                  {a === "POS" ? "Positive" : a === "STA" ? "Stable" : a === "NEG" ? "Negative" : a}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Active filter tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            {region && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[11px]">
                Region: {region}
                <X className="h-3 w-3 cursor-pointer hover:text-amber-200" onClick={() => { setRegion(""); setCountry(""); setPage(1); }} />
              </span>
            )}
            {country && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[11px]">
                Country: {country}
                <X className="h-3 w-3 cursor-pointer hover:text-blue-200" onClick={() => { setCountry(""); setPage(1); }} />
              </span>
            )}
            {currency && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[11px]">
                Currency: {currency}
                <X className="h-3 w-3 cursor-pointer hover:text-green-200" onClick={() => { setCurrency(""); setPage(1); }} />
              </span>
            )}
            {rating && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-[11px]">
                Rating: {rating}
                <X className="h-3 w-3 cursor-pointer hover:text-purple-200" onClick={() => { setRating(""); setPage(1); }} />
              </span>
            )}
            {igHy && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-[11px]">
                {igHy}
                <X className="h-3 w-3 cursor-pointer hover:text-cyan-200" onClick={() => { setIgHy(""); setPage(1); }} />
              </span>
            )}
            {creditAssessment && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[11px]">
                Trend: {creditAssessment === "POS" ? "Positive" : creditAssessment === "STA" ? "Stable" : "Negative"}
                <X className="h-3 w-3 cursor-pointer hover:text-rose-200" onClick={() => { setCreditAssessment(""); setPage(1); }} />
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-[11px]">
                Search: "{search}"
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => { setSearch(""); setPage(1); }} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">
            Sovereign Bond Universe
            <span className="text-muted-foreground font-normal ml-2">({sorted.length} bonds)</span>
          </h3>
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages || 1}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { field: "name" as SortField, label: "Country / Issuer", width: "min-w-[160px]" },
                  { field: "compositeRating" as SortField, label: "Rating", width: "min-w-[70px]" },
                  { field: "coupon" as SortField, label: "Coupon", width: "min-w-[70px]" },
                  { field: "currency" as SortField, label: "CCY", width: "min-w-[55px]" },
                  { field: "maturityYears" as SortField, label: "Mat. (Yrs)", width: "min-w-[75px]" },
                  { field: "price" as SortField, label: "Price", width: "min-w-[65px]" },
                  { field: "yieldToMaturity" as SortField, label: "YTM", width: "min-w-[65px]" },
                  { field: "duration" as SortField, label: "Duration", width: "min-w-[75px]" },
                  { field: "oasSpread" as SortField, label: "OAS", width: "min-w-[65px]" },
                  { field: "zSpread" as SortField, label: "Z-Spread", width: "min-w-[75px]" },
                  { field: "change1M" as SortField, label: "1M Chg", width: "min-w-[70px]" },
                  { field: "totalReturnYTD" as SortField, label: "Total Rtn", width: "min-w-[75px]" },
                  { field: "creditAssessment" as SortField, label: "Trend", width: "min-w-[85px]" },
                  { field: "score" as SortField, label: "Score", width: "min-w-[90px]" },
                ].map(({ field, label, width }) => (
                  <th
                    key={field}
                    className={`px-3 py-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap ${width}`}
                    onClick={() => handleSort(field)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bondsQuery.isLoading ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-muted-foreground">
                    Loading sovereign bonds...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-muted-foreground">
                    No bonds match the current filters
                  </td>
                </tr>
              ) : (
                paginated.map((bond, i) => (
                  <tr
                    key={bond.slug + i}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/fixed-income/sovereign/${bond.slug}`)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{bond.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{bond.ticker}</div>
                    </td>
                    <td className="px-3 py-2.5"><RatingBadge rating={bond.compositeRating} /></td>
                    <td className="px-3 py-2.5 font-medium">{bond.coupon != null ? `${bond.coupon}%` : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold">{bond.currency || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">{formatNum(bond.maturityYears, 1)}</td>
                    <td className="px-3 py-2.5 font-medium">{formatNum(bond.price, 2)}</td>
                    <td className="px-3 py-2.5 font-semibold text-primary">{formatNum(bond.yieldToMaturity, 3)}%</td>
                    <td className="px-3 py-2.5">{formatNum(bond.duration, 2)}</td>
                    <td className="px-3 py-2.5">{bond.oasSpread != null ? bond.oasSpread.toFixed(0) : "—"}</td>
                    <td className="px-3 py-2.5">{bond.zSpread != null ? bond.zSpread.toFixed(0) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={bond.change1M != null ? (bond.change1M >= 0 ? "text-emerald-400" : "text-red-400") : ""}>
                        {formatPct(bond.change1M)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={bond.totalReturnYTD != null ? (bond.totalReturnYTD >= 0 ? "text-emerald-400" : "text-red-400") : ""}>
                        {formatPct(bond.totalReturnYTD)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><AssessmentBadge value={bond.creditAssessment} /></td>
                    <td className="px-3 py-2.5"><ScoreBar score={bond.score} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded text-xs font-medium ${
                      page === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Market Map - Scatter Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              Market Map — Duration vs Yield
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scatterData.length} bonds plotted • Synced with active filters
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {(["none", "region", "currency"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setChartGroupBy(g)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  chartGroupBy === g
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g === "none" ? "No Grouping" : g === "region" ? "By Region" : "By Currency"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                type="number"
                dataKey="x"
                name="Duration"
                unit=" yrs"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Modified Duration (years)",
                  position: "insideBottom",
                  offset: -15,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Yield"
                unit="%"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Yield to Maturity (%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <RechartsTooltip content={<CustomScatterTooltip />} />
              {chartGroupBy === "none" ? (
                <Scatter
                  name="All Bonds"
                  data={scatterData}
                  fill="#f59e0b"
                  fillOpacity={0.7}
                  r={5}
                  onClick={(data: any) => {
                    if (data?.slug) setLocation(`/fixed-income/sovereign/${data.slug}`);
                  }}
                  cursor="pointer"
                />
              ) : (
                Object.entries(scatterGroups).map(([key, data]) => (
                  <Scatter
                    key={key}
                    name={key}
                    data={data}
                    fill={groupColors[key]}
                    fillOpacity={0.7}
                    r={5}
                    onClick={(data: any) => {
                      if (data?.slug) setLocation(`/fixed-income/sovereign/${data.slug}`);
                    }}
                    cursor="pointer"
                  />
                ))
              )}
              {chartGroupBy !== "none" && (
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
