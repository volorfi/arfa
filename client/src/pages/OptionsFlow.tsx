import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
  BarChart3,
  Activity,
} from "lucide-react";

type SortKey = "optionsTotalVolume" | "percentChange" | "optionsImpliedVolatilityRank1y" | "optionsPutCallVolumeRatio" | "symbol";
type SortDir = "asc" | "desc";

export default function OptionsFlow() {
  const { data: mostActive, isLoading } = trpc.options.mostActive.useQuery(undefined, {
    refetchInterval: 120000,
    retry: 2,
  });

  const [sortKey, setSortKey] = useState<SortKey>("optionsTotalVolume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "bullish" | "bearish">("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredData = useMemo(() => {
    if (!mostActive) return [];
    let data = [...mostActive];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.symbol.toLowerCase().includes(q) || d.symbolName.toLowerCase().includes(q));
    }

    // Sentiment filter
    if (sentimentFilter !== "all") {
      data = data.filter((d) => {
        const callPct = parseFloat(d.optionsCallVolumePercent) || 0;
        const putPct = parseFloat(d.optionsPutVolumePercent) || 0;
        if (sentimentFilter === "bullish") return callPct > putPct;
        return putPct > callPct;
      });
    }

    // Sort
    data.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "symbol") {
        return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      }
      av = parseFloat((a as any)[sortKey]?.replace(/,/g, "")) || 0;
      bv = parseFloat((b as any)[sortKey]?.replace(/,/g, "")) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return data;
  }, [mostActive, searchQuery, sentimentFilter, sortKey, sortDir]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!mostActive || mostActive.length === 0) return null;
    let totalVol = 0, bullishCount = 0, bearishCount = 0, highIVCount = 0;
    mostActive.forEach((d) => {
      totalVol += parseInt(d.optionsTotalVolume?.replace(/,/g, "") || "0");
      const callPct = parseFloat(d.optionsCallVolumePercent) || 0;
      const putPct = parseFloat(d.optionsPutVolumePercent) || 0;
      if (callPct > putPct) bullishCount++; else bearishCount++;
      const ivRank = parseFloat(d.optionsImpliedVolatilityRank1y) || 0;
      if (ivRank > 50) highIVCount++;
    });
    return { totalVol, bullishCount, bearishCount, highIVCount, total: mostActive.length };
  }, [mostActive]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Zap className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Options Flow</h1>
          <p className="text-sm text-muted-foreground">Unusual activity and high-volume options across US equities</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <StatCard label="Tracked Symbols" value={stats.total.toString()} icon={<Activity className="h-3.5 w-3.5 text-primary" />} />
          <StatCard label="Total Volume" value={stats.totalVol.toLocaleString()} icon={<BarChart3 className="h-3.5 w-3.5 text-blue-500" />} />
          <StatCard label="Bullish Bias" value={stats.bullishCount.toString()} icon={<TrendingUp className="h-3.5 w-3.5 text-gain" />} />
          <StatCard label="Bearish Bias" value={stats.bearishCount.toString()} icon={<TrendingDown className="h-3.5 w-3.5 text-loss" />} />
          <StatCard label="High IV Rank (>50)" value={stats.highIVCount.toString()} icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by symbol or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5">
          {(["all", "bullish", "bearish"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSentimentFilter(f)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                sentimentFilter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "bullish" ? "🟢 Bullish" : "🔴 Bearish"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading options flow data...</span>
        </div>
      )}

      {/* Table */}
      {!isLoading && filteredData.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <SortHeader label="Symbol" sortKey="symbol" currentKey={sortKey} dir={sortDir} onClick={handleSort} />
                <th className="px-3 py-2.5 text-left font-medium text-xs">Name</th>
                <th className="px-3 py-2.5 text-right font-medium text-xs">Price</th>
                <SortHeader label="Change %" sortKey="percentChange" currentKey={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                <SortHeader label="Options Vol" sortKey="optionsTotalVolume" currentKey={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                <th className="px-3 py-2.5 text-right font-medium text-xs">Call %</th>
                <th className="px-3 py-2.5 text-right font-medium text-xs">Put %</th>
                <SortHeader label="P/C Ratio" sortKey="optionsPutCallVolumeRatio" currentKey={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                <SortHeader label="IV Rank 1Y" sortKey="optionsImpliedVolatilityRank1y" currentKey={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                <th className="px-3 py-2.5 text-center font-medium text-xs">Sentiment</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs">Chain</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => {
                const callPct = parseFloat(item.optionsCallVolumePercent) || 0;
                const putPct = parseFloat(item.optionsPutVolumePercent) || 0;
                const isBullish = callPct > putPct;
                const pctChange = parseFloat(item.percentChange) || 0;
                const ivRank = parseFloat(item.optionsImpliedVolatilityRank1y) || 0;
                const pcRatio = parseFloat(item.optionsPutCallVolumeRatio) || 0;

                return (
                  <tr key={item.symbol} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link href={`/stocks/${item.symbol}`}>
                        <span className="font-bold text-primary hover:underline cursor-pointer">{item.symbol}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{item.symbolName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">${item.lastPrice}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${pctChange >= 0 ? "text-gain" : "text-loss"}`}>
                      {pctChange >= 0 ? "+" : ""}{item.percentChange}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{item.optionsTotalVolume}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className="text-gain">{callPct.toFixed(1)}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className="text-loss">{putPct.toFixed(1)}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pcRatio.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <IVBar value={ivRank} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isBullish ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                      }`}>
                        {isBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isBullish ? "Bullish" : "Bearish"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Link href={`/options/chain?symbol=${item.symbol}`}>
                        <span className="text-xs text-primary hover:underline cursor-pointer font-medium">View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">No data found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-muted-foreground">
        Data refreshes every 2 minutes. Sentiment is derived from call/put volume ratio. High IV Rank indicates elevated implied volatility relative to the past year.
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, dir, onClick, align = "left" }: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onClick: (k: SortKey) => void; align?: "left" | "right";
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`px-3 py-2.5 font-medium text-xs cursor-pointer hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-primary" : "opacity-30"}`} />
      </span>
    </th>
  );
}

function IVBar({ value }: { value: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const color = clampedValue > 70 ? "bg-loss" : clampedValue > 40 ? "bg-amber-500" : "bg-gain";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clampedValue}%` }} />
      </div>
      <span className="text-xs tabular-nums">{clampedValue.toFixed(0)}%</span>
    </div>
  );
}
