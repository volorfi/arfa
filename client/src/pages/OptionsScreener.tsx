import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  SlidersHorizontal,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  Calculator,
  BarChart3,
  Activity,
  ArrowUpDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  Area,
} from "recharts";

// ─── Black-Scholes (client-side) ─────────────────────────────────
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}
function normalPDF(x: number): number { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

function bsGreeks(S: number, K: number, T: number, r: number, sigma: number, type: "call" | "put") {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: type === "call" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const nd1 = normalPDF(d1);
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const price = type === "call" ? S * Nd1 - K * Math.exp(-r * T) * Nd2 : K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  const delta = type === "call" ? Nd1 : Nd1 - 1;
  const gamma = nd1 / (S * sigma * sqrtT);
  const theta = type === "call" ? (-S * nd1 * sigma / (2 * sqrtT) - r * K * Math.exp(-r * T) * Nd2) / 365 : (-S * nd1 * sigma / (2 * sqrtT) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  const vega = S * nd1 * sqrtT / 100;
  const rho = type === "call" ? K * T * Math.exp(-r * T) * Nd2 / 100 : -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  return { price, delta, gamma, theta, vega, rho };
}

// ─── Tab type ────────────────────────────────────────────────────
type TabType = "greeks-calc" | "oi-analysis" | "iv-surface";

export default function OptionsScreener() {
  const [activeTab, setActiveTab] = useState<TabType>("greeks-calc");

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Options Tools</h1>
          <p className="text-sm text-muted-foreground">Greeks calculator, OI analysis, and IV surface visualization</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 mb-6 w-fit">
        {([
          { key: "greeks-calc" as TabType, label: "Greeks Calculator", icon: Calculator },
          { key: "oi-analysis" as TabType, label: "OI Analysis", icon: BarChart3 },
          { key: "iv-surface" as TabType, label: "IV Surface", icon: Activity },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "greeks-calc" && <GreeksCalculator />}
      {activeTab === "oi-analysis" && <OIAnalysis />}
      {activeTab === "iv-surface" && <IVSurface />}
    </div>
  );
}

// ─── Greeks Calculator ───────────────────────────────────────────
function GreeksCalculator() {
  const [spot, setSpot] = useState(100);
  const [strike, setStrike] = useState(100);
  const [dte, setDte] = useState(30);
  const [iv, setIv] = useState(30);
  const [rate, setRate] = useState(4.3);
  const [optType, setOptType] = useState<"call" | "put">("call");

  const T = dte / 365;
  const greeks = useMemo(() => bsGreeks(spot, strike, T, rate / 100, iv / 100, optType), [spot, strike, T, rate, iv, optType]);

  // Sensitivity chart: price vs delta
  const sensitivityData = useMemo(() => {
    const points: { price: number; delta: number; gamma: number; theta: number; vega: number; optionPrice: number }[] = [];
    const min = spot * 0.7, max = spot * 1.3;
    const step = (max - min) / 60;
    for (let p = min; p <= max; p += step) {
      const g = bsGreeks(p, strike, T, rate / 100, iv / 100, optType);
      points.push({ price: Math.round(p * 100) / 100, delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega, optionPrice: g.price });
    }
    return points;
  }, [spot, strike, T, rate, iv, optType]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold">Parameters</h3>
          <div className="space-y-2.5">
            <InputField label="Spot Price ($)" value={spot} onChange={setSpot} step={1} />
            <InputField label="Strike Price ($)" value={strike} onChange={setStrike} step={1} />
            <InputField label="Days to Expiry" value={dte} onChange={(v) => setDte(Math.max(1, v))} step={1} min={1} />
            <InputField label="Implied Volatility (%)" value={iv} onChange={setIv} step={1} />
            <InputField label="Risk-Free Rate (%)" value={rate} onChange={setRate} step={0.1} />
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Option Type</label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setOptType("call")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    optType === "call" ? "bg-gain/10 text-gain border border-gain/30" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  Call
                </button>
                <button
                  onClick={() => setOptType("put")}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    optType === "put" ? "bg-loss/10 text-loss border border-loss/30" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  Put
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold">Results</h3>
          <div className="space-y-2">
            <ResultRow label="Option Price" value={`$${greeks.price.toFixed(4)}`} highlight />
            <ResultRow label="Delta (Δ)" value={greeks.delta.toFixed(4)} tooltip="Rate of change of option price per $1 move in underlying" />
            <ResultRow label="Gamma (Γ)" value={greeks.gamma.toFixed(4)} tooltip="Rate of change of delta per $1 move in underlying" />
            <ResultRow label="Theta (Θ)" value={greeks.theta.toFixed(4)} tooltip="Daily time decay in dollars" />
            <ResultRow label="Vega (ν)" value={greeks.vega.toFixed(4)} tooltip="Change in option price per 1% change in IV" />
            <ResultRow label="Rho (ρ)" value={greeks.rho.toFixed(4)} tooltip="Change in option price per 1% change in interest rate" />
          </div>
          <div className="pt-2 border-t border-border/50 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Intrinsic Value</span>
              <span className="font-medium text-foreground">${(optType === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Value</span>
              <span className="font-medium text-foreground">${(greeks.price - (optType === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0))).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Moneyness</span>
              <span className={`font-medium ${spot > strike ? (optType === "call" ? "text-gain" : "text-loss") : spot < strike ? (optType === "call" ? "text-loss" : "text-gain") : "text-amber-500"}`}>
                {spot === strike ? "ATM" : optType === "call" ? (spot > strike ? "ITM" : "OTM") : (spot < strike ? "ITM" : "OTM")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="lg:col-span-2 space-y-5">
        {/* Option Price Chart */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold mb-3">Option Price vs Underlying</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sensitivityData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="price" tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tickFormatter={(v: number) => `$${v.toFixed(1)}`} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                <ReferenceLine x={spot} stroke="var(--primary)" strokeDasharray="4 4" />
                <ReferenceLine x={strike} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="optionPrice" stroke="oklch(0.55 0.18 250)" strokeWidth={2} dot={false} name="Option Price" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Greeks Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GreekChart data={sensitivityData} dataKey="delta" label="Delta" color="oklch(0.55 0.18 250)" spot={spot} />
          <GreekChart data={sensitivityData} dataKey="gamma" label="Gamma" color="oklch(0.72 0.19 142)" spot={spot} />
          <GreekChart data={sensitivityData} dataKey="theta" label="Theta" color="oklch(0.63 0.24 25)" spot={spot} />
          <GreekChart data={sensitivityData} dataKey="vega" label="Vega" color="oklch(0.65 0.15 280)" spot={spot} />
        </div>
      </div>
    </div>
  );
}

// ─── OI Analysis ─────────────────────────────────────────────────
function OIAnalysis() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputValue, setInputValue] = useState("AAPL");

  const { data: chainData, isLoading } = trpc.options.chain.useQuery(
    { symbol },
    { enabled: symbol.length > 0, retry: 2 }
  );

  const handleSearch = () => {
    const s = inputValue.trim().toUpperCase();
    if (s.length > 0) setSymbol(s);
  };

  const oiData = useMemo(() => {
    if (!chainData) return [];
    const strikeMap = new Map<number, { strike: number; callOI: number; putOI: number; callVol: number; putVol: number }>();

    (chainData.calls || []).forEach((c: any) => {
      const existing = strikeMap.get(c.strike) || { strike: c.strike, callOI: 0, putOI: 0, callVol: 0, putVol: 0 };
      existing.callOI = c.openInterest || 0;
      existing.callVol = c.volume || 0;
      strikeMap.set(c.strike, existing);
    });

    (chainData.puts || []).forEach((p: any) => {
      const existing = strikeMap.get(p.strike) || { strike: p.strike, callOI: 0, putOI: 0, callVol: 0, putVol: 0 };
      existing.putOI = p.openInterest || 0;
      existing.putVol = p.volume || 0;
      strikeMap.set(p.strike, existing);
    });

    return Array.from(strikeMap.values())
      .sort((a, b) => a.strike - b.strike)
      .filter((d) => d.callOI > 0 || d.putOI > 0);
  }, [chainData]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter symbol..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button onClick={handleSearch} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          Analyze
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading OI data...</span>
        </div>
      )}

      {chainData && !isLoading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Max Pain</div>
              <div className="text-lg font-bold">${chainData.maxPain?.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">P/C OI Ratio</div>
              <div className="text-lg font-bold">{chainData.putCallRatio?.oiRatio?.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Call OI</div>
              <div className="text-lg font-bold text-gain">{chainData.putCallRatio?.totalCallOI?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Put OI</div>
              <div className="text-lg font-bold text-loss">{chainData.putCallRatio?.totalPutOI?.toLocaleString()}</div>
            </div>
          </div>

          {/* OI by Strike Chart */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3">Open Interest by Strike</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oiData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="strike" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                  {chainData.maxPain && <ReferenceLine x={chainData.maxPain} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: `Max Pain $${chainData.maxPain.toFixed(0)}`, position: "top", style: { fontSize: 10, fill: "var(--primary)" } }} />}
                  <ReferenceLine x={chainData.underlyingPrice} stroke="oklch(0.65 0.15 280)" strokeDasharray="4 4" />
                  <Bar dataKey="callOI" fill="oklch(0.72 0.19 142 / 0.7)" name="Call OI" />
                  <Bar dataKey="putOI" fill="oklch(0.63 0.24 25 / 0.7)" name="Put OI" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume by Strike Chart */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3">Volume by Strike</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oiData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="strike" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Bar dataKey="callVol" fill="oklch(0.72 0.19 142 / 0.5)" name="Call Volume" />
                  <Bar dataKey="putVol" fill="oklch(0.63 0.24 25 / 0.5)" name="Put Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── IV Surface ──────────────────────────────────────────────────
function IVSurface() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputValue, setInputValue] = useState("AAPL");

  const { data: chainData, isLoading } = trpc.options.chain.useQuery(
    { symbol },
    { enabled: symbol.length > 0, retry: 2 }
  );

  const handleSearch = () => {
    const s = inputValue.trim().toUpperCase();
    if (s.length > 0) setSymbol(s);
  };

  // IV smile data: IV vs strike for calls and puts
  const ivSmileData = useMemo(() => {
    if (!chainData) return [];
    const calls = chainData.calls || [];
    const puts = chainData.puts || [];
    const strikeMap = new Map<number, { strike: number; callIV: number | null; putIV: number | null }>();

    calls.forEach((c: any) => {
      const existing = strikeMap.get(c.strike) || { strike: c.strike, callIV: null, putIV: null };
      existing.callIV = c.impliedVolatility ? c.impliedVolatility * 100 : null;
      strikeMap.set(c.strike, existing);
    });

    puts.forEach((p: any) => {
      const existing = strikeMap.get(p.strike) || { strike: p.strike, callIV: null, putIV: null };
      existing.putIV = p.impliedVolatility ? p.impliedVolatility * 100 : null;
      strikeMap.set(p.strike, existing);
    });

    return Array.from(strikeMap.values())
      .sort((a, b) => a.strike - b.strike)
      .filter((d) => d.callIV !== null || d.putIV !== null);
  }, [chainData]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter symbol..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button onClick={handleSearch} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          Analyze
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading IV data...</span>
        </div>
      )}

      {chainData && !isLoading && ivSmileData.length > 0 && (
        <>
          {/* IV Smile Chart */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold mb-1">Implied Volatility Smile</h3>
            <p className="text-xs text-muted-foreground mb-3">IV across strikes for the nearest expiration</p>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ivSmileData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="strike" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" label={{ value: "Implied Volatility (%)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "var(--muted-foreground)" } }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [`${value?.toFixed(1)}%`, name === "callIV" ? "Call IV" : "Put IV"]}
                    labelFormatter={(v: number) => `Strike: $${v}`}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                  <ReferenceLine x={chainData.underlyingPrice} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: `Spot $${chainData.underlyingPrice?.toFixed(0)}`, position: "top", style: { fontSize: 10, fill: "var(--primary)" } }} />
                  <Line type="monotone" dataKey="callIV" stroke="oklch(0.72 0.19 142)" strokeWidth={2} dot={{ r: 2 }} name="Call IV" connectNulls />
                  <Line type="monotone" dataKey="putIV" stroke="oklch(0.63 0.24 25)" strokeWidth={2} dot={{ r: 2 }} name="Put IV" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.72 0.19 142)" }} /> Call IV</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.63 0.24 25)" }} /> Put IV</span>
            </div>
          </div>

          {/* IV Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const allIVs = ivSmileData.flatMap((d) => [d.callIV, d.putIV].filter((v): v is number => v !== null));
              const avgIV = allIVs.length > 0 ? allIVs.reduce((a, b) => a + b, 0) / allIVs.length : 0;
              const minIV = allIVs.length > 0 ? Math.min(...allIVs) : 0;
              const maxIV = allIVs.length > 0 ? Math.max(...allIVs) : 0;
              const atmStrike = ivSmileData.reduce((best, d) => Math.abs(d.strike - (chainData?.underlyingPrice || 0)) < Math.abs(best.strike - (chainData?.underlyingPrice || 0)) ? d : best, ivSmileData[0]);
              return (
                <>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ATM IV</div>
                    <div className="text-lg font-bold">{(atmStrike?.callIV || atmStrike?.putIV || 0).toFixed(1)}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg IV</div>
                    <div className="text-lg font-bold">{avgIV.toFixed(1)}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min IV</div>
                    <div className="text-lg font-bold text-gain">{minIV.toFixed(1)}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Max IV</div>
                    <div className="text-lg font-bold text-loss">{maxIV.toFixed(1)}%</div>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────
function InputField({ label, value, onChange, step = 1, min }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
        step={step}
        min={min}
      />
    </div>
  );
}

function ResultRow({ label, value, highlight, tooltip }: { label: string; value: string; highlight?: boolean; tooltip?: string }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? "border-b border-border pb-2 mb-1" : ""}`}>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && (
          <span title={tooltip} className="cursor-help text-muted-foreground/50 hover:text-muted-foreground">
            <Activity className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className={`text-sm tabular-nums ${highlight ? "font-bold text-primary" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function GreekChart({ data, dataKey, label, color, spot }: { data: any[]; dataKey: string; label: string; color: string; spot: number }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <h4 className="text-xs font-semibold mb-2">{label}</h4>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="price" tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 8 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 8 }} stroke="var(--muted-foreground)" />
            <ReferenceLine x={spot} stroke="var(--primary)" strokeDasharray="2 2" />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
