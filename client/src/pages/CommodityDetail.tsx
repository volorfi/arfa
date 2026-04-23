import { trpc } from "@/lib/trpc";
import { Link, useRoute } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtPrice(v: number): string {
  if (v >= 100) return v.toFixed(2);
  if (v >= 1) return v.toFixed(3);
  return v.toFixed(4);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export default function CommodityDetail() {
  const [, params] = useRoute<{ symbol: string }>("/commodities/:symbol");
  const symbol = params?.symbol?.toUpperCase();

  const { data, isLoading } = trpc.commodity.detail.useQuery(
    { symbol: symbol ?? "" },
    { enabled: Boolean(symbol), refetchInterval: 30000 },
  );
  const { data: related } = trpc.commodity.relatedEquities.useQuery(
    { symbol: symbol ?? "" },
    { enabled: Boolean(symbol) },
  );

  if (!symbol) {
    return <div className="p-8 text-muted-foreground">No commodity specified</div>;
  }
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 py-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
          <div className="h-[300px] bg-muted rounded animate-pulse mt-6" />
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 py-6">
          <Link href="/commodities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All commodities
          </Link>
          <div className="mt-8 text-center text-muted-foreground">
            {symbol} is not in our coverage universe. See{" "}
            <Link href="/commodities" className="text-primary underline">
              the commodities overview
            </Link>
            .
          </div>
        </div>
      </div>
    );
  }

  const positive = data.changePercent > 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        <Link
          href="/commodities"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All commodities
        </Link>

        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{data.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.family.replace("_", " ")} · {data.unit} · Yahoo ticker {data.ticker}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">{fmtPrice(data.price)}</div>
            <div
              className={`inline-flex items-center gap-1.5 text-sm font-semibold mt-1 ${
                positive ? "text-gain" : "text-loss"
              }`}
            >
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {positive ? "+" : ""}
              {data.change.toFixed(2)} ({positive ? "+" : ""}
              {data.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="h-[320px]">
                {data.chartData.length > 1 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                      <defs>
                        <linearGradient id="cm-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={positive ? "var(--color-gain)" : "var(--color-loss)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tickFormatter={(t) => new Date(t).toLocaleDateString()}
                        fontSize={10}
                        tick={{ fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        fontSize={10}
                        tick={{ fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(v) => fmtPrice(Number(v))}
                      />
                      <Tooltip
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        formatter={(v) => [fmtPrice(Number(v)), data.name]}
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "6px",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={positive ? "var(--color-gain)" : "var(--color-loss)"}
                        strokeWidth={2}
                        fill="url(#cm-area)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Day range</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {fmtPrice(data.dayLow)} – {fmtPrice(data.dayHigh)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">52W range</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.fiftyTwoWeekLow ? fmtPrice(data.fiftyTwoWeekLow) : "—"} –{" "}
                  {data.fiftyTwoWeekHigh ? fmtPrice(data.fiftyTwoWeekHigh) : "—"}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">1M change</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.changePercent1M === null
                    ? "—"
                    : `${data.changePercent1M > 0 ? "+" : ""}${data.changePercent1M.toFixed(2)}%`}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.changePercentYTD === null
                    ? "—"
                    : `${data.changePercentYTD > 0 ? "+" : ""}${data.changePercentYTD.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                Key metrics
              </div>
              <Metric label="Spot" value={fmtPrice(data.price)} />
              <Metric label="Unit" value={data.unit} />
              <Metric label="1D" value={`${positive ? "+" : ""}${data.changePercent.toFixed(2)}%`} />
              <Metric
                label="1W"
                value={
                  data.changePercent1W === null
                    ? "—"
                    : `${data.changePercent1W > 0 ? "+" : ""}${data.changePercent1W.toFixed(2)}%`
                }
              />
            </div>

            {related && related.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                  Related equities
                </div>
                <div className="space-y-1">
                  {related.map((r: any) => (
                    <Link
                      key={r.symbol}
                      href={`/stocks/${r.symbol}`}
                      className="flex justify-between items-baseline text-xs py-1 border-b border-border/40 last:border-0 hover:text-foreground"
                    >
                      <span className="text-muted-foreground truncate mr-2">{r.name}</span>
                      <span className="font-semibold">{r.symbol}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Forward curve, inventories, and positioning data are planned
                  additions — they need separate pipelines (EIA / USDA / CFTC).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
