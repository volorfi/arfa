import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  majors: "Majors",
  usd_crosses: "USD Crosses",
  eur_crosses: "EUR Crosses",
  commodity_fx: "Commodity / JPY Crosses",
};

function fmtPrice(v: number, quote: string): string {
  if (quote === "JPY") return v.toFixed(2);
  return v.toFixed(4);
}

function PairTile({ q }: { q: any }) {
  const positive = q.changePercent > 0;
  const negative = q.changePercent < 0;
  return (
    <Link
      href={`/fx/${q.pair}`}
      className="block rounded-lg border border-border bg-card hover:border-primary/40 transition-colors p-3"
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-semibold text-sm text-foreground">{q.name}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{fmtPrice(q.price, q.quote)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-10">
          {q.chartData && q.chartData.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={q.chartData}>
                <defs>
                  <linearGradient id={`g-${q.pair}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={positive ? "var(--color-gain)" : "var(--color-loss)"}
                  strokeWidth={1.5}
                  fill={`url(#g-${q.pair})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {positive ? (
            <TrendingUp className="h-3 w-3 text-gain" />
          ) : negative ? (
            <TrendingDown className="h-3 w-3 text-loss" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              positive ? "text-gain" : negative ? "text-loss" : "text-muted-foreground"
            }`}
          >
            {positive ? "+" : ""}
            {q.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </Link>
  );
}

function StrengthMeter({ data }: { data: any[] | undefined }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => Math.abs(d.score)), 1);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        Currency Strength · Today
      </div>
      <div className="space-y-1.5">
        {[...data]
          .sort((a, b) => b.score - a.score)
          .map((d) => {
            const widthPct = (Math.abs(d.score) / max) * 48; // 48% of track max
            const positive = d.score > 0;
            return (
              <div key={d.code} className="flex items-center gap-2 text-xs">
                <span className="w-10 font-semibold text-foreground">{d.code}</span>
                <div className="relative flex-1 h-3 rounded-sm bg-muted/40">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                  <div
                    className={`absolute top-0 bottom-0 ${
                      positive ? "bg-gain" : "bg-loss"
                    } rounded-sm transition-all`}
                    style={{
                      [positive ? "left" : "right"]: "50%",
                      width: `${widthPct}%`,
                    } as any}
                  />
                </div>
                <span
                  className={`w-12 text-right tabular-nums text-[11px] ${
                    positive ? "text-gain" : d.score < 0 ? "text-loss" : "text-muted-foreground"
                  }`}
                >
                  {positive ? "+" : ""}
                  {d.avgChangePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
      </div>
      <div className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Derived from average performance of each currency across the pairs it
        appears in. Greater than zero → strengthening today.
      </div>
    </div>
  );
}

function CrossRateMatrix({ data }: { data: any | undefined }) {
  if (!data || !data.currencies) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        Cross Rates
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium pb-1 pr-2"></th>
              {data.currencies.map((c: string) => (
                <th key={c} className="text-right font-medium pb-1 px-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.currencies.map((base: string, i: number) => (
              <tr key={base} className="border-t border-border/60">
                <td className="py-1 pr-2 font-semibold text-foreground">{base}</td>
                {data.currencies.map((quote: string, j: number) => (
                  <td
                    key={quote}
                    className={`py-1 px-2 text-right ${
                      i === j ? "text-muted-foreground/40" : "text-foreground/80"
                    }`}
                  >
                    {data.rates[i][j]
                      ? i === j
                        ? "—"
                        : data.rates[i][j].toFixed(quote === "JPY" ? 2 : 4)
                      : "—"}
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

function CentralBanksTable({ data }: { data: any[] | undefined }) {
  if (!data) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        Central Bank Policy Rates
      </div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-medium pb-1">Bank</th>
            <th className="text-left font-medium pb-1">CCY</th>
            <th className="text-right font-medium pb-1">Rate</th>
            <th className="text-right font-medium pb-1 hidden md:table-cell">Last change</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.bank} className="border-t border-border/60">
              <td className="py-1.5 text-foreground">{r.bank}</td>
              <td className="py-1.5 font-semibold text-foreground/80">{r.currency}</td>
              <td className="py-1.5 text-right font-semibold">{r.rate.toFixed(2)}%</td>
              <td className="py-1.5 text-right text-muted-foreground hidden md:table-cell">
                {r.lastChange}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[10px] text-muted-foreground mt-3">
        Curated reference; verify against each bank's announcements before use.
      </div>
    </div>
  );
}

export default function FXOverview() {
  const { data: pairs, isLoading } = trpc.fx.overview.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: strength } = trpc.fx.strength.useQuery(undefined, { refetchInterval: 30000 });
  const { data: matrix } = trpc.fx.crossRates.useQuery();
  const { data: banks } = trpc.fx.centralBanks.useQuery();
  const { data: movers } = trpc.fx.movers.useQuery({ limit: 6 });

  const byCategory = useMemo(() => {
    const buckets: Record<string, any[]> = {
      majors: [],
      usd_crosses: [],
      eur_crosses: [],
      commodity_fx: [],
    };
    for (const p of pairs ?? []) {
      if (buckets[p.category]) buckets[p.category].push(p);
    }
    return buckets;
  }, [pairs]);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Currencies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live FX spots, currency strength, cross-rates, and central-bank
            positioning across majors and crosses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {(["majors", "usd_crosses", "eur_crosses", "commodity_fx"] as const).map((cat) => (
              <section key={cat}>
                <h2 className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                  {CATEGORY_LABELS[cat]}
                </h2>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {byCategory[cat].map((p) => (
                      <PairTile key={p.pair} q={p} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <StrengthMeter data={strength} />
            <CrossRateMatrix data={matrix} />

            {movers && movers.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                  Top Movers · Today
                </div>
                <div className="space-y-1">
                  {movers.map((m: any) => {
                    const pos = m.changePercent > 0;
                    return (
                      <Link
                        key={m.pair}
                        href={`/fx/${m.pair}`}
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

            <CentralBanksTable data={banks} />
          </div>
        </div>
      </div>
    </div>
  );
}
