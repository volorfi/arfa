import { useState, useMemo, useCallback } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ChevronDown,
  Info,
  Layers,
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
  Area,
  ComposedChart,
} from "recharts";

// ─── Black-Scholes Implementation (client-side) ──────────────────
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function bsPrice(S: number, K: number, T: number, r: number, sigma: number, type: "call" | "put"): number {
  if (T <= 0) return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  if (sigma <= 0) return type === "call" ? Math.max(S - K * Math.exp(-r * T), 0) : Math.max(K * Math.exp(-r * T) - S, 0);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === "call") return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

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
  const theta = type === "call"
    ? (-S * nd1 * sigma / (2 * sqrtT) - r * K * Math.exp(-r * T) * Nd2) / 365
    : (-S * nd1 * sigma / (2 * sqrtT) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  const vega = S * nd1 * sqrtT / 100;
  const rho = type === "call" ? K * T * Math.exp(-r * T) * Nd2 / 100 : -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;

  return { price, delta, gamma, theta, vega, rho };
}

// ─── Strategy Templates ──────────────────────────────────────────
interface Leg {
  id: string;
  type: "call" | "put";
  direction: "buy" | "sell";
  strike: number;
  quantity: number;
  premium: number;
  iv: number;
}

interface StrategyTemplate {
  name: string;
  description: string;
  legs: Omit<Leg, "id" | "premium">[];
  category: string;
}

const STRATEGIES: StrategyTemplate[] = [
  { name: "Long Call", description: "Bullish bet with limited risk", category: "Single Leg",
    legs: [{ type: "call", direction: "buy", strike: 100, quantity: 1, iv: 0.3 }] },
  { name: "Long Put", description: "Bearish bet with limited risk", category: "Single Leg",
    legs: [{ type: "put", direction: "buy", strike: 100, quantity: 1, iv: 0.3 }] },
  { name: "Covered Call", description: "Income on stock + sell call", category: "Income",
    legs: [{ type: "call", direction: "sell", strike: 110, quantity: 1, iv: 0.3 }] },
  { name: "Cash-Secured Put", description: "Income from selling puts", category: "Income",
    legs: [{ type: "put", direction: "sell", strike: 95, quantity: 1, iv: 0.3 }] },
  { name: "Bull Call Spread", description: "Bullish with capped risk/reward", category: "Vertical",
    legs: [
      { type: "call", direction: "buy", strike: 95, quantity: 1, iv: 0.3 },
      { type: "call", direction: "sell", strike: 105, quantity: 1, iv: 0.28 },
    ] },
  { name: "Bear Put Spread", description: "Bearish with capped risk/reward", category: "Vertical",
    legs: [
      { type: "put", direction: "buy", strike: 105, quantity: 1, iv: 0.3 },
      { type: "put", direction: "sell", strike: 95, quantity: 1, iv: 0.28 },
    ] },
  { name: "Long Straddle", description: "Profit from big move either way", category: "Volatility",
    legs: [
      { type: "call", direction: "buy", strike: 100, quantity: 1, iv: 0.3 },
      { type: "put", direction: "buy", strike: 100, quantity: 1, iv: 0.3 },
    ] },
  { name: "Long Strangle", description: "Cheaper straddle, needs bigger move", category: "Volatility",
    legs: [
      { type: "call", direction: "buy", strike: 105, quantity: 1, iv: 0.28 },
      { type: "put", direction: "buy", strike: 95, quantity: 1, iv: 0.28 },
    ] },
  { name: "Iron Condor", description: "Profit from low volatility", category: "Volatility",
    legs: [
      { type: "put", direction: "buy", strike: 85, quantity: 1, iv: 0.32 },
      { type: "put", direction: "sell", strike: 90, quantity: 1, iv: 0.3 },
      { type: "call", direction: "sell", strike: 110, quantity: 1, iv: 0.3 },
      { type: "call", direction: "buy", strike: 115, quantity: 1, iv: 0.32 },
    ] },
  { name: "Butterfly Spread", description: "Profit if stock stays near strike", category: "Advanced",
    legs: [
      { type: "call", direction: "buy", strike: 90, quantity: 1, iv: 0.3 },
      { type: "call", direction: "sell", strike: 100, quantity: 2, iv: 0.28 },
      { type: "call", direction: "buy", strike: 110, quantity: 1, iv: 0.3 },
    ] },
  { name: "Calendar Spread", description: "Profit from time decay difference", category: "Advanced",
    legs: [
      { type: "call", direction: "sell", strike: 100, quantity: 1, iv: 0.3 },
      { type: "call", direction: "buy", strike: 100, quantity: 1, iv: 0.28 },
    ] },
  { name: "Jade Lizard", description: "Short put + short call spread", category: "Advanced",
    legs: [
      { type: "put", direction: "sell", strike: 95, quantity: 1, iv: 0.3 },
      { type: "call", direction: "sell", strike: 105, quantity: 1, iv: 0.28 },
      { type: "call", direction: "buy", strike: 110, quantity: 1, iv: 0.26 },
    ] },
];

let nextId = 1;
function makeId() { return `leg-${nextId++}`; }

export default function StrategyBuilder() {
  const [spotPrice, setSpotPrice] = useState(100);
  const [riskFreeRate, setRiskFreeRate] = useState(0.043);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [legs, setLegs] = useState<Leg[]>([
    { id: makeId(), type: "call", direction: "buy", strike: 100, quantity: 1, premium: 0, iv: 0.3 },
  ]);
  const [showTemplates, setShowTemplates] = useState(false);

  const T = daysToExpiry / 365;

  // Auto-calculate premiums from BS model
  const legsWithPremiums = useMemo(() => {
    return legs.map((leg) => {
      const greeks = bsGreeks(spotPrice, leg.strike, T, riskFreeRate, leg.iv, leg.type);
      return { ...leg, premium: greeks.price, greeks };
    });
  }, [legs, spotPrice, T, riskFreeRate]);

  // Calculate net Greeks
  const netGreeks = useMemo(() => {
    const net = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, cost: 0 };
    legsWithPremiums.forEach((leg: any) => {
      const mult = leg.direction === "buy" ? 1 : -1;
      const q = leg.quantity * mult;
      net.delta += (leg.greeks?.delta || 0) * q;
      net.gamma += (leg.greeks?.gamma || 0) * q;
      net.theta += (leg.greeks?.theta || 0) * q;
      net.vega += (leg.greeks?.vega || 0) * q;
      net.rho += (leg.greeks?.rho || 0) * q;
      net.cost += leg.premium * leg.quantity * mult * 100; // per contract = 100 shares
    });
    return net;
  }, [legsWithPremiums]);

  // Generate P&L chart data
  const chartData = useMemo(() => {
    const minStrike = Math.min(...legs.map((l) => l.strike), spotPrice) * 0.7;
    const maxStrike = Math.max(...legs.map((l) => l.strike), spotPrice) * 1.3;
    const step = (maxStrike - minStrike) / 100;
    const points: { price: number; plExpiry: number; plCurrent: number }[] = [];

    for (let price = minStrike; price <= maxStrike; price += step) {
      let plExpiry = 0;
      let plCurrent = 0;

      legs.forEach((leg) => {
        const mult = leg.direction === "buy" ? 1 : -1;
        // P&L at expiry
        const intrinsic = leg.type === "call" ? Math.max(price - leg.strike, 0) : Math.max(leg.strike - price, 0);
        const entryPremium = bsPrice(spotPrice, leg.strike, T, riskFreeRate, leg.iv, leg.type);
        plExpiry += (intrinsic - entryPremium) * mult * leg.quantity * 100;

        // P&L now (with remaining time)
        const currentValue = bsPrice(price, leg.strike, T, riskFreeRate, leg.iv, leg.type);
        plCurrent += (currentValue - entryPremium) * mult * leg.quantity * 100;
      });

      points.push({ price: Math.round(price * 100) / 100, plExpiry, plCurrent });
    }
    return points;
  }, [legs, spotPrice, T, riskFreeRate]);

  const maxProfit = Math.max(...chartData.map((d) => d.plExpiry));
  const maxLoss = Math.min(...chartData.map((d) => d.plExpiry));
  const breakevens = useMemo(() => {
    const bks: number[] = [];
    for (let i = 1; i < chartData.length; i++) {
      if ((chartData[i - 1].plExpiry <= 0 && chartData[i].plExpiry > 0) || (chartData[i - 1].plExpiry >= 0 && chartData[i].plExpiry < 0)) {
        bks.push(chartData[i].price);
      }
    }
    return bks;
  }, [chartData]);

  const addLeg = () => {
    setLegs([...legs, { id: makeId(), type: "call", direction: "buy", strike: spotPrice, quantity: 1, premium: 0, iv: 0.3 }]);
  };

  const removeLeg = (id: string) => {
    if (legs.length > 1) setLegs(legs.filter((l) => l.id !== id));
  };

  const updateLeg = (id: string, updates: Partial<Leg>) => {
    setLegs(legs.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const loadTemplate = (template: StrategyTemplate) => {
    const newLegs = template.legs.map((tl) => ({
      id: makeId(),
      ...tl,
      strike: Math.round(spotPrice * (tl.strike / 100)),
      premium: 0,
    }));
    setLegs(newLegs);
    setShowTemplates(false);
  };

  const resetAll = () => {
    setLegs([{ id: makeId(), type: "call", direction: "buy", strike: spotPrice, quantity: 1, premium: 0, iv: 0.3 }]);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Strategy Builder</h1>
          <p className="text-sm text-muted-foreground">Black-Scholes P&L calculator with interactive payoff diagrams</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Parameters + Legs */}
        <div className="lg:col-span-1 space-y-5">
          {/* Global Parameters */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Parameters
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Spot Price ($)</label>
                <input
                  type="number"
                  value={spotPrice}
                  onChange={(e) => setSpotPrice(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                  step={1}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Days to Expiry</label>
                <input
                  type="number"
                  value={daysToExpiry}
                  onChange={(e) => setDaysToExpiry(Math.max(1, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                  min={1}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk-Free Rate (%)</label>
                <input
                  type="number"
                  value={(riskFreeRate * 100).toFixed(1)}
                  onChange={(e) => setRiskFreeRate(Number(e.target.value) / 100)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                  step={0.1}
                />
              </div>
            </div>
          </div>

          {/* Strategy Templates */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <span>Load Strategy Template</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            </button>
            {showTemplates && (
              <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-80 overflow-y-auto">
                {["Single Leg", "Income", "Vertical", "Volatility", "Advanced"].map((cat) => (
                  <div key={cat}>
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">{cat}</div>
                    {STRATEGIES.filter((s) => s.category === cat).map((s) => (
                      <button
                        key={s.name}
                        onClick={() => loadTemplate(s)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Option Legs</h3>
              <div className="flex gap-2">
                <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
                <button onClick={addLeg} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
                  <Plus className="h-3 w-3" /> Add Leg
                </button>
              </div>
            </div>

            {legsWithPremiums.map((leg: any, idx: number) => (
              <div key={leg.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Leg {idx + 1}</span>
                  {legs.length > 1 && (
                    <button onClick={() => removeLeg(leg.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={leg.direction}
                    onChange={(e) => updateLeg(leg.id, { direction: e.target.value as "buy" | "sell" })}
                    className="px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                  >
                    <option value="buy">Buy (Long)</option>
                    <option value="sell">Sell (Short)</option>
                  </select>
                  <select
                    value={leg.type}
                    onChange={(e) => updateLeg(leg.id, { type: e.target.value as "call" | "put" })}
                    className="px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground">Strike</label>
                    <input
                      type="number"
                      value={leg.strike}
                      onChange={(e) => updateLeg(leg.id, { strike: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs tabular-nums"
                      step={1}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Qty</label>
                    <input
                      type="number"
                      value={leg.quantity}
                      onChange={(e) => updateLeg(leg.id, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs tabular-nums"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">IV (%)</label>
                    <input
                      type="number"
                      value={(leg.iv * 100).toFixed(0)}
                      onChange={(e) => updateLeg(leg.id, { iv: Number(e.target.value) / 100 })}
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs tabular-nums"
                      step={1}
                    />
                  </div>
                </div>
                {/* Calculated values */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>Premium: <b className="text-foreground">${leg.premium.toFixed(2)}</b></span>
                  <span>Delta: <b className="text-foreground">{leg.greeks?.delta?.toFixed(3)}</b></span>
                  <span>Gamma: <b className="text-foreground">{leg.greeks?.gamma?.toFixed(4)}</b></span>
                  <span>Theta: <b className="text-foreground">{leg.greeks?.theta?.toFixed(3)}</b></span>
                  <span>Vega: <b className="text-foreground">{leg.greeks?.vega?.toFixed(3)}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chart + Summary */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Net Cost" value={`$${netGreeks.cost.toFixed(0)}`} sub="Total premium" color={netGreeks.cost > 0 ? "loss" : "gain"} />
            <SummaryCard label="Max Profit" value={maxProfit === Infinity || maxProfit > 1e8 ? "Unlimited" : `$${maxProfit.toFixed(0)}`} color="gain" />
            <SummaryCard label="Max Loss" value={maxLoss === -Infinity || maxLoss < -1e8 ? "Unlimited" : `$${maxLoss.toFixed(0)}`} color="loss" />
            <SummaryCard label="Breakeven" value={breakevens.length > 0 ? breakevens.map((b) => `$${b.toFixed(1)}`).join(", ") : "—"} />
          </div>

          {/* Net Greeks */}
          <div className="grid grid-cols-5 gap-3">
            <GreekCard label="Delta" value={netGreeks.delta.toFixed(3)} />
            <GreekCard label="Gamma" value={netGreeks.gamma.toFixed(4)} />
            <GreekCard label="Theta" value={netGreeks.theta.toFixed(3)} />
            <GreekCard label="Vega" value={netGreeks.vega.toFixed(3)} />
            <GreekCard label="Rho" value={netGreeks.rho.toFixed(4)} />
          </div>

          {/* Payoff Diagram */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3">Payoff Diagram</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="price"
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    label={{ value: "Underlying Price at Expiry", position: "bottom", offset: 5, style: { fontSize: 11, fill: "var(--muted-foreground)" } }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    label={{ value: "P&L ($)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 11, fill: "var(--muted-foreground)" } }}
                  />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "plExpiry" ? "At Expiry" : "Current"]}
                    labelFormatter={(v: number) => `Price: $${v.toFixed(2)}`}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}
                  />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                  <ReferenceLine x={spotPrice} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: `Spot $${spotPrice}`, position: "top", style: { fontSize: 10, fill: "var(--primary)" } }} />
                  <Line type="monotone" dataKey="plCurrent" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Current" />
                  <Line type="monotone" dataKey="plExpiry" stroke="oklch(0.72 0.19 142)" strokeWidth={2.5} dot={false} name="At Expiry" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[oklch(0.72_0.19_142)]" /> At Expiry</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-primary" /> Current (with time value)</span>
            </div>
          </div>

          {/* Spot Price Slider */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3">Scenario Analysis</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Underlying Price</span>
                  <span className="font-medium text-foreground">${spotPrice.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={spotPrice * 0.5}
                  max={spotPrice * 1.5}
                  step={0.5}
                  value={spotPrice}
                  onChange={(e) => setSpotPrice(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Days to Expiry</span>
                  <span className="font-medium text-foreground">{daysToExpiry}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={daysToExpiry}
                  onChange={(e) => setDaysToExpiry(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color === "gain" ? "text-gain" : color === "loss" ? "text-loss" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function GreekCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
