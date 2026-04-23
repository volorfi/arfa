import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const FAMILY_LABELS: Record<string, { label: string; hint: string }> = {
  energy: { label: "Energy", hint: "Crude, natural gas and refined products" },
  precious_metals: { label: "Precious Metals", hint: "Gold, silver, platinum group" },
  base_metals: { label: "Base Metals", hint: "Copper and industrial metals" },
  agriculture: { label: "Agriculture", hint: "Grains and oilseeds" },
  softs: { label: "Softs", hint: "Coffee, sugar, cocoa, cotton, OJ" },
  livestock: { label: "Livestock", hint: "Cattle and hogs" },
};

const FAMILY_ORDER = [
  "energy",
  "precious_metals",
  "base_metals",
  "agriculture",
  "softs",
  "livestock",
] as const;

function fmtPrice(v: number): string {
  if (v >= 100) return v.toFixed(2);
  if (v >= 1) return v.toFixed(3);
  return v.toFixed(4);
}

function Tile({ q }: { q: any }) {
  const positive = q.changePercent > 0;
  const negative = q.changePercent < 0;
  return (
    <Link
      href={`/commodities/${q.symbol}`}
      className="block rounded-lg border border-border bg-card hover:border-primary/40 transition-colors p-3"
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-semibold text-sm text-foreground truncate">{q.name}</span>
        <span className="text-[10px] text-muted-foreground">{q.unit}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-base font-semibold tabular-nums">{fmtPrice(q.price)}</div>
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
              positive ? "text-gain" : negative ? "text-loss" : "text-muted-foreground"
            }`}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : negative ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {positive ? "+" : ""}
            {q.changePercent.toFixed(2)}%
          </div>
        </div>
        <div className="h-10 w-20">
          {q.chartData && q.chartData.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={q.chartData}>
                <defs>
                  <linearGradient id={`cg-${q.symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={positive ? "var(--color-gain)" : "var(--color-loss)"}
                  strokeWidth={1.5}
                  fill={`url(#cg-${q.symbol})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Link>
  );
}

function InflationBaskets({ data }: { data: any[] | undefined }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        Inflation basket · 1D
      </div>
      <div className="space-y-2">
        {data.map((b) => {
          const pos = b.avgChangePercent1D > 0;
          return (
            <div key={b.family} className="flex justify-between items-baseline">
              <div>
                <div className="text-sm font-semibold text-foreground">{b.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {b.members.join(" · ")}
                </div>
              </div>
              <span
                className={`text-sm tabular-nums font-semibold ${
                  pos ? "text-gain" : b.avgChangePercent1D < 0 ? "text-loss" : "text-muted-foreground"
                }`}
              >
                {pos ? "+" : ""}
                {b.avgChangePercent1D.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CorrelationHeatmap({ data }: { data: any | undefined }) {
  if (!data || !data.symbols) return null;
  function color(v: number): string {
    // v is expected in [-1, 1]
    const clamp = Math.max(-1, Math.min(1, v));
    if (clamp > 0) {
      const a = (clamp * 0.6).toFixed(2);
      return `rgba(34,197,94,${a})`; // green with alpha
    }
    const a = (-clamp * 0.6).toFixed(2);
    return `rgba(239,68,68,${a})`;
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        6-month return correlations
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] tabular-nums">
          <thead>
            <tr>
              <th></th>
              {data.symbols.map((s: string) => (
                <th key={s} className="font-medium text-muted-foreground pb-1 pl-2">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.symbols.map((row: string, i: number) => (
              <tr key={row}>
                <td className="font-semibold text-muted-foreground pr-2 py-0.5">{row}</td>
                {data.values[i].map((v: number, j: number) => (
                  <td
                    key={j}
                    className="px-1 py-0.5 text-center font-medium text-foreground/90"
                    style={{ backgroundColor: color(v) }}
                  >
                    {v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CommoditiesOverview() {
  const { data: families, isLoading } = trpc.commodity.byFamily.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: leaderboard } = trpc.commodity.leaderboard.useQuery({
    sortKey: "changePercent",
    limit: 6,
  });
  const { data: baskets } = trpc.commodity.inflationBaskets.useQuery();
  const { data: corr } = trpc.commodity.correlations.useQuery();

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Commodities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spots for energy, metals, agriculture, softs, and livestock futures,
            with inflation-basket rollups and cross-asset correlations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {FAMILY_ORDER.map((fam) => {
              const group = families?.[fam] ?? [];
              return (
                <section key={fam}>
                  <div className="flex items-baseline justify-between mb-2">
                    <h2 className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {FAMILY_LABELS[fam].label}
                    </h2>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {FAMILY_LABELS[fam].hint}
                    </span>
                  </div>
                  {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {group.map((q: any) => (
                        <Tile key={q.symbol} q={q} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="lg:col-span-1 space-y-6">
            {leaderboard && leaderboard.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                  Top Movers · Today
                </div>
                <div className="space-y-1">
                  {leaderboard.map((m: any) => {
                    const pos = m.changePercent > 0;
                    return (
                      <Link
                        key={m.symbol}
                        href={`/commodities/${m.symbol}`}
                        className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0 hover:text-foreground"
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className={`tabular-nums ${pos ? "text-gain" : "text-loss"}`}>
                          {pos ? "+" : ""}
                          {m.changePercent.toFixed(2)}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <InflationBaskets data={baskets} />
            <CorrelationHeatmap data={corr} />

            <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-4">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                Coming soon
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>· Forward curves (contango / backwardation)</li>
                <li>· EIA inventory reports for WTI / NatGas</li>
                <li>· USDA WASDE feeds for grains</li>
                <li>· COT positioning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
