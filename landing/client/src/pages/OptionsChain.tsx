import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
  ArrowUpDown,
  Info,
  Loader2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function fmt(n: number | undefined, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toFixed(decimals);
}
function fmtPct(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}
function fmtInt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toLocaleString();
}
function fmtGreek(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toFixed(4);
}

const POPULAR_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY", "QQQ", "IWM",
  "AMD", "NFLX", "COIN", "PLTR", "SOFI", "BA", "DIS", "JPM", "GS", "XOM",
];

export default function OptionsChain() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputValue, setInputValue] = useState("AAPL");
  const [selectedExpiration, setSelectedExpiration] = useState<number | undefined>(undefined);
  const [showGreeks, setShowGreeks] = useState(true);
  const [highlightITM, setHighlightITM] = useState(true);
  const [strikesFilter, setStrikesFilter] = useState<"all" | "near" | "itm" | "otm">("near");

  const { data: chainData, isLoading, error } = trpc.options.chain.useQuery(
    { symbol, expirationDate: selectedExpiration },
    { enabled: symbol.length > 0, refetchInterval: 60000, retry: 2 }
  );

  const handleSearch = useCallback(() => {
    const s = inputValue.trim().toUpperCase();
    if (s.length > 0) {
      setSymbol(s);
      setSelectedExpiration(undefined);
    }
  }, [inputValue]);

  const expirationDates = useMemo(() => {
    if (!chainData?.expirationDates) return [];
    return chainData.expirationDates.map((ts: number) => ({
      timestamp: ts,
      label: new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      daysToExpiry: Math.max(0, Math.ceil((ts - Date.now() / 1000) / 86400)),
    }));
  }, [chainData?.expirationDates]);

  const underlyingPrice = chainData?.underlyingPrice || 0;

  // Filter strikes based on selection
  const { filteredCalls, filteredPuts, allStrikes } = useMemo(() => {
    if (!chainData) return { filteredCalls: [], filteredPuts: [], allStrikes: [] };
    const calls = chainData.calls || [];
    const puts = chainData.puts || [];
    const strikes = Array.from(new Set([...calls.map((c: any) => c.strike), ...puts.map((p: any) => p.strike)])).sort((a, b) => a - b);

    if (strikesFilter === "all") return { filteredCalls: calls, filteredPuts: puts, allStrikes: strikes };

    const nearRange = underlyingPrice * 0.1; // +/- 10%
    const filterFn = (strike: number) => {
      if (strikesFilter === "near") return Math.abs(strike - underlyingPrice) <= nearRange;
      if (strikesFilter === "itm") return true; // show all, highlight ITM
      if (strikesFilter === "otm") return true;
      return true;
    };

    const filteredStrikes = strikes.filter(filterFn);
    return {
      filteredCalls: calls.filter((c: any) => filteredStrikes.includes(c.strike)),
      filteredPuts: puts.filter((p: any) => filteredStrikes.includes(p.strike)),
      allStrikes: filteredStrikes,
    };
  }, [chainData, strikesFilter, underlyingPrice]);

  // Build strike-keyed maps for easy lookup
  const callMap = useMemo(() => {
    const m = new Map<number, any>();
    filteredCalls.forEach((c: any) => m.set(c.strike, c));
    return m;
  }, [filteredCalls]);

  const putMap = useMemo(() => {
    const m = new Map<number, any>();
    filteredPuts.forEach((p: any) => m.set(p.strike, p));
    return m;
  }, [filteredPuts]);

  const selectedExpLabel = expirationDates.find((e: any) => e.timestamp === (selectedExpiration || chainData?.selectedExpiration))?.label || "Select expiration";
  const selectedDTE = expirationDates.find((e: any) => e.timestamp === (selectedExpiration || chainData?.selectedExpiration))?.daysToExpiry;

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Options Chain</h1>
          <p className="text-sm text-muted-foreground">Real-time options data with Greeks and analytics</p>
        </div>
      </div>

      {/* Symbol Search + Quick Picks */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter symbol (e.g. AAPL, SPY, QQQ)"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Load Chain
        </button>
      </div>

      {/* Quick Symbol Picks */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {POPULAR_SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => { setInputValue(s); setSymbol(s); setSelectedExpiration(undefined); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              symbol === s ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading options chain for {symbol}...</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-12 text-destructive">
          <p className="font-medium">Failed to load options for {symbol}</p>
          <p className="text-sm text-muted-foreground mt-1">The symbol may not have options available or the data is temporarily unavailable.</p>
        </div>
      )}

      {/* Data */}
      {chainData && !isLoading && (
        <>
          {/* Underlying Info Bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-card border border-border mb-5">
            <Link href={`/stocks/${chainData.quote.symbol}`}>
              <span className="text-lg font-display font-bold text-primary hover:underline cursor-pointer">{chainData.quote.symbol}</span>
            </Link>
            <span className="text-sm text-muted-foreground">{chainData.quote.shortName}</span>
            <span className="text-xl font-bold">${fmt(chainData.quote.regularMarketPrice)}</span>
            <span className={`text-sm font-medium ${chainData.quote.regularMarketChange >= 0 ? "text-gain" : "text-loss"}`}>
              {chainData.quote.regularMarketChange >= 0 ? "+" : ""}{fmt(chainData.quote.regularMarketChange)} ({fmt(chainData.quote.regularMarketChangePercent)}%)
            </span>
            {chainData.maxPain !== undefined && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Max Pain:</span>
                <span className="text-sm font-semibold">${fmt(chainData.maxPain)}</span>
              </div>
            )}
            {chainData.putCallRatio && (
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">P/C Vol:</span>
                <span className="text-sm font-semibold">{fmt(chainData.putCallRatio.volumeRatio)}</span>
                <span className="text-xs text-muted-foreground ml-2">P/C OI:</span>
                <span className="text-sm font-semibold">{fmt(chainData.putCallRatio.oiRatio)}</span>
              </div>
            )}
          </div>

          {/* Expiration Selector */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiration</span>
              {selectedDTE !== undefined && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{selectedDTE} DTE</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expirationDates.map((exp: any) => (
                <button
                  key={exp.timestamp}
                  onClick={() => setSelectedExpiration(exp.timestamp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (selectedExpiration || chainData.selectedExpiration) === exp.timestamp
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {exp.label}
                  <span className="ml-1 opacity-60">({exp.daysToExpiry}d)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5">
              {(["near", "all", "itm", "otm"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStrikesFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    strikesFilter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "near" ? "Near Money" : f === "all" ? "All Strikes" : f.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showGreeks} onChange={(e) => setShowGreeks(e.target.checked)} className="rounded" />
              Show Greeks
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={highlightITM} onChange={(e) => setHighlightITM(e.target.checked)} className="rounded" />
              Highlight ITM
            </label>
          </div>

          {/* Summary Stats */}
          {chainData.putCallRatio && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
              <StatCard label="Total Call Vol" value={fmtInt(chainData.putCallRatio.totalCallVolume)} icon={<TrendingUp className="h-3.5 w-3.5 text-gain" />} />
              <StatCard label="Total Put Vol" value={fmtInt(chainData.putCallRatio.totalPutVolume)} icon={<TrendingDown className="h-3.5 w-3.5 text-loss" />} />
              <StatCard label="Call OI" value={fmtInt(chainData.putCallRatio.totalCallOI)} />
              <StatCard label="Put OI" value={fmtInt(chainData.putCallRatio.totalPutOI)} />
              <StatCard label="P/C Volume" value={fmt(chainData.putCallRatio.volumeRatio)} />
              <StatCard label="Max Pain" value={`$${fmt(chainData.maxPain)}`} icon={<Target className="h-3.5 w-3.5 text-amber-500" />} />
            </div>
          )}

          {/* Options Chain Table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  {/* Calls header */}
                  <th colSpan={showGreeks ? 10 : 6} className="text-center py-2 text-gain font-semibold border-b border-border text-xs uppercase tracking-wider">
                    Calls
                  </th>
                  {/* Strike */}
                  <th className="text-center py-2 font-semibold border-b border-border text-xs uppercase tracking-wider bg-muted/60">
                    Strike
                  </th>
                  {/* Puts header */}
                  <th colSpan={showGreeks ? 10 : 6} className="text-center py-2 text-loss font-semibold border-b border-border text-xs uppercase tracking-wider">
                    Puts
                  </th>
                </tr>
                <tr className="bg-muted/20 text-muted-foreground">
                  {/* Call columns */}
                  <th className="px-2 py-2 text-right font-medium">Bid</th>
                  <th className="px-2 py-2 text-right font-medium">Ask</th>
                  <th className="px-2 py-2 text-right font-medium">Last</th>
                  <th className="px-2 py-2 text-right font-medium">Chg</th>
                  <th className="px-2 py-2 text-right font-medium">Vol</th>
                  <th className="px-2 py-2 text-right font-medium">OI</th>
                  {showGreeks && (
                    <>
                      <th className="px-2 py-2 text-right font-medium">IV</th>
                      <th className="px-2 py-2 text-right font-medium">Delta</th>
                      <th className="px-2 py-2 text-right font-medium">Gamma</th>
                      <th className="px-2 py-2 text-right font-medium">Theta</th>
                    </>
                  )}
                  {/* Strike */}
                  <th className="px-3 py-2 text-center font-bold bg-muted/40">Strike</th>
                  {/* Put columns */}
                  <th className="px-2 py-2 text-right font-medium">Bid</th>
                  <th className="px-2 py-2 text-right font-medium">Ask</th>
                  <th className="px-2 py-2 text-right font-medium">Last</th>
                  <th className="px-2 py-2 text-right font-medium">Chg</th>
                  <th className="px-2 py-2 text-right font-medium">Vol</th>
                  <th className="px-2 py-2 text-right font-medium">OI</th>
                  {showGreeks && (
                    <>
                      <th className="px-2 py-2 text-right font-medium">IV</th>
                      <th className="px-2 py-2 text-right font-medium">Delta</th>
                      <th className="px-2 py-2 text-right font-medium">Gamma</th>
                      <th className="px-2 py-2 text-right font-medium">Theta</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {allStrikes.map((strike) => {
                  const call = callMap.get(strike);
                  const put = putMap.get(strike);
                  const isATM = Math.abs(strike - underlyingPrice) === Math.min(...allStrikes.map((s) => Math.abs(s - underlyingPrice)));
                  const callITM = strike < underlyingPrice;
                  const putITM = strike > underlyingPrice;

                  return (
                    <tr
                      key={strike}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                        isATM ? "bg-primary/5 border-primary/20" : ""
                      }`}
                    >
                      {/* Call side */}
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                        {call ? fmt(call.bid) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                        {call ? fmt(call.ask) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                        {call ? fmt(call.lastPrice) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""} ${
                        call?.change > 0 ? "text-gain" : call?.change < 0 ? "text-loss" : ""
                      }`}>
                        {call ? (call.change > 0 ? "+" : "") + fmt(call.change) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                        {call ? fmtInt(call.volume) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                        {call ? fmtInt(call.openInterest) : "—"}
                      </td>
                      {showGreeks && (
                        <>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                            {call ? fmtPct(call.impliedVolatility) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                            {call ? fmtGreek(call.delta) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                            {call ? fmtGreek(call.gamma) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && callITM ? "bg-gain/5" : ""}`}>
                            {call ? fmtGreek(call.theta) : "—"}
                          </td>
                        </>
                      )}

                      {/* Strike */}
                      <td className={`px-3 py-1.5 text-center font-bold tabular-nums bg-muted/30 ${isATM ? "text-primary" : ""}`}>
                        {fmt(strike)}
                        {isATM && <span className="block text-[9px] text-primary font-normal">ATM</span>}
                      </td>

                      {/* Put side */}
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                        {put ? fmt(put.bid) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                        {put ? fmt(put.ask) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                        {put ? fmt(put.lastPrice) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""} ${
                        put?.change > 0 ? "text-gain" : put?.change < 0 ? "text-loss" : ""
                      }`}>
                        {put ? (put.change > 0 ? "+" : "") + fmt(put.change) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                        {put ? fmtInt(put.volume) : "—"}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                        {put ? fmtInt(put.openInterest) : "—"}
                      </td>
                      {showGreeks && (
                        <>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                            {put ? fmtPct(put.impliedVolatility) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                            {put ? fmtGreek(put.delta) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                            {put ? fmtGreek(put.gamma) : "—"}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${highlightITM && putITM ? "bg-loss/5" : ""}`}>
                            {put ? fmtGreek(put.theta) : "—"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gain/20 border border-gain/30" /> Call ITM</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-loss/20 border border-loss/30" /> Put ITM</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/20 border border-primary/30" /> ATM Strike</span>
            <span className="ml-auto">Data refreshes every 60s. Greeks calculated via Black-Scholes model.</span>
          </div>
        </>
      )}
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
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}
