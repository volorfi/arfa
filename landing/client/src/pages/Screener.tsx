import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Filter, ArrowUpDown, Search, ChevronDown, X } from "lucide-react";

type SortField = "symbol" | "price" | "changePercent" | "marketCap" | "peRatio" | "volume";
type SortDir = "asc" | "desc";

const MARKET_CAP_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Mega (>$200B)", min: 200e9, max: Infinity },
  { label: "Large ($10B-$200B)", min: 10e9, max: 200e9 },
  { label: "Mid ($2B-$10B)", min: 2e9, max: 10e9 },
  { label: "Small ($300M-$2B)", min: 300e6, max: 2e9 },
  { label: "Micro (<$300M)", min: 0, max: 300e6 },
];

const PE_RANGES = [
  { label: "All", min: -Infinity, max: Infinity },
  { label: "Low (<15)", min: 0, max: 15 },
  { label: "Normal (15-25)", min: 15, max: 25 },
  { label: "High (25-50)", min: 25, max: 50 },
  { label: "Very High (>50)", min: 50, max: Infinity },
];

const PRICE_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under $10", min: 0, max: 10 },
  { label: "$10-$50", min: 10, max: 50 },
  { label: "$50-$100", min: 50, max: 100 },
  { label: "$100-$500", min: 100, max: 500 },
  { label: "Over $500", min: 500, max: Infinity },
];

const VOLUME_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Over 10M", min: 10e6, max: Infinity },
  { label: "1M-10M", min: 1e6, max: 10e6 },
  { label: "500K-1M", min: 500e3, max: 1e6 },
  { label: "Under 500K", min: 0, max: 500e3 },
];

export default function Screener() {
  const { data: stocks, isLoading } = trpc.stock.screener.useQuery();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [marketCapFilter, setMarketCapFilter] = useState(0);
  const [peFilter, setPeFilter] = useState(0);
  const [priceFilter, setPriceFilter] = useState(0);
  const [volumeFilter, setVolumeFilter] = useState(0);
  const [sortField, setSortField] = useState<SortField>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const sectors = useMemo(() => {
    if (!stocks) return ["All"];
    const s = new Set(stocks.map((st) => st.sector).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [stocks]);

  const activeFilterCount = [sectorFilter !== "All", marketCapFilter > 0, peFilter > 0, priceFilter > 0, volumeFilter > 0].filter(Boolean).length;

  const clearFilters = () => {
    setSectorFilter("All");
    setMarketCapFilter(0);
    setPeFilter(0);
    setPriceFilter(0);
    setVolumeFilter(0);
    setSearch("");
  };

  const filtered = useMemo(() => {
    if (!stocks) return [];
    let result = [...stocks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    if (sectorFilter !== "All") {
      result = result.filter((s) => s.sector === sectorFilter);
    }
    if (marketCapFilter > 0) {
      const range = MARKET_CAP_RANGES[marketCapFilter];
      result = result.filter((s) => s.marketCap >= range.min && s.marketCap < range.max);
    }
    if (peFilter > 0) {
      const range = PE_RANGES[peFilter];
      result = result.filter((s) => s.peRatio !== null && s.peRatio >= range.min && s.peRatio < range.max);
    }
    if (priceFilter > 0) {
      const range = PRICE_RANGES[priceFilter];
      result = result.filter((s) => s.price >= range.min && s.price < range.max);
    }
    if (volumeFilter > 0) {
      const range = VOLUME_RANGES[volumeFilter];
      result = result.filter((s) => s.volume >= range.min && s.volume < range.max);
    }
    result.sort((a, b) => {
      let aVal = a[sortField] ?? 0;
      let bVal = b[sortField] ?? 0;
      if (typeof aVal === "string") aVal = aVal.toLowerCase() as any;
      if (typeof bVal === "string") bVal = bVal.toLowerCase() as any;
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [stocks, search, sectorFilter, marketCapFilter, peFilter, priceFilter, volumeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ field, label, align = "right" }: { field: SortField; label: string; align?: string }) => (
    <th
      className={`${align === "left" ? "text-left" : "text-right"} px-4 py-2.5 font-medium cursor-pointer hover:text-foreground transition-colors select-none`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <ArrowUpDown className="h-3 w-3" />
        )}
      </span>
    </th>
  );

  const FilterSelect = ({ label, value, onChange, options }: { label: string; value: number; onChange: (v: number) => void; options: { label: string }[] }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 px-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((opt, i) => (
          <option key={i} value={i}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Stock Screener</h1>
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="pl-9 pr-4 h-9 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
            />
          </div>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3 flex items-center gap-1.5 text-sm rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilterSelect label="Market Cap" value={marketCapFilter} onChange={setMarketCapFilter} options={MARKET_CAP_RANGES} />
            <FilterSelect label="PE Ratio" value={peFilter} onChange={setPeFilter} options={PE_RANGES} />
            <FilterSelect label="Price" value={priceFilter} onChange={setPriceFilter} options={PRICE_RANGES} />
            <FilterSelect label="Volume" value={volumeFilter} onChange={setVolumeFilter} options={VOLUME_RANGES} />
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <SortHeader field="symbol" label="Symbol" align="left" />
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <SortHeader field="price" label="Price" />
                  <SortHeader field="changePercent" label="Change" />
                  <SortHeader field="marketCap" label="Market Cap" />
                  <SortHeader field="peRatio" label="PE Ratio" />
                  <SortHeader field="volume" label="Volume" />
                  <th className="text-left px-4 py-2.5 font-medium">Sector</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No stocks found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filtered.map((stock) => (
                    <tr key={stock.symbol} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/stocks/${stock.symbol}`} className="font-semibold text-primary hover:underline">
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-foreground truncate max-w-[180px]">{stock.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">${stock.price.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${stock.changePercent >= 0 ? "text-gain" : "text-loss"}`}>
                        {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">{formatMktCap(stock.marketCap)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{stock.peRatio?.toFixed(2) || "N/A"}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatVolume(stock.volume)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{stock.sector}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Showing {filtered.length} of {stocks?.length || 0} stocks
        </p>
      </div>
    </div>
  );
}

function formatMktCap(n: number): string {
  if (!n) return "N/A";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatVolume(n: number): string {
  if (!n) return "N/A";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}
