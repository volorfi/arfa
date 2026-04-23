import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtPrice(v: number, quote: string): string {
  if (quote === "JPY") return v.toFixed(2);
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

export default function FXPairDetail() {
  const [, params] = useRoute<{ pair: string }>("/fx/:pair");
  const pair = params?.pair?.toUpperCase();

  const { data, isLoading } = trpc.fx.pair.useQuery(
    { slug: pair ?? "" },
    { enabled: Boolean(pair), refetchInterval: 30000 },
  );
  const { data: banks } = trpc.fx.centralBanks.useQuery();

  if (!pair) {
    return <div className="p-8 text-muted-foreground">No pair specified</div>;
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
          <Link href="/fx" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All currencies
          </Link>
          <div className="mt-8 text-center text-muted-foreground">
            Pair {pair} not in our coverage universe. Try{" "}
            <Link href="/fx" className="text-primary underline">the FX overview</Link>.
          </div>
        </div>
      </div>
    );
  }

  const positive = data.changePercent > 0;
  const baseBank = banks?.find((b: any) => b.currency === data.base);
  const quoteBank = banks?.find((b: any) => b.currency === data.quote);
  const rateDiff =
    baseBank && quoteBank ? baseBank.rate - quoteBank.rate : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        <Link
          href="/fx"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All currencies
        </Link>

        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{data.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.base} base · {data.quote} quote · spot FX
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {fmtPrice(data.price, data.quote)}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-sm font-semibold mt-1 ${
                positive ? "text-gain" : "text-loss"
              }`}
            >
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {positive ? "+" : ""}
              {data.change.toFixed(data.quote === "JPY" ? 2 : 4)} ({positive ? "+" : ""}
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
                        <linearGradient id="fx-area" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v) => fmtPrice(Number(v), data.quote)}
                      />
                      <Tooltip
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        formatter={(v) => [fmtPrice(Number(v), data.quote), data.name]}
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
                        fill="url(#fx-area)"
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
                  {fmtPrice(data.dayLow, data.quote)} – {fmtPrice(data.dayHigh, data.quote)}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">52W range</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.fiftyTwoWeekLow ? fmtPrice(data.fiftyTwoWeekLow, data.quote) : "—"} –{" "}
                  {data.fiftyTwoWeekHigh ? fmtPrice(data.fiftyTwoWeekHigh, data.quote) : "—"}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">1W change</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.changePercent1W === null ? "—" : `${data.changePercent1W > 0 ? "+" : ""}${data.changePercent1W.toFixed(2)}%`}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD</div>
                <div className="text-xs font-semibold mt-0.5 tabular-nums">
                  {data.changePercentYTD === null ? "—" : `${data.changePercentYTD > 0 ? "+" : ""}${data.changePercentYTD.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-3">
                Interest rate differential
              </div>
              {baseBank && quoteBank ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{baseBank.bank}</span>
                      <span className="tabular-nums font-semibold">{baseBank.rate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{quoteBank.bank}</span>
                      <span className="tabular-nums font-semibold">{quoteBank.rate.toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/60 flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">{data.base} – {data.quote}</span>
                    <span
                      className={`text-base font-semibold tabular-nums ${
                        rateDiff! > 0 ? "text-gain" : rateDiff! < 0 ? "text-loss" : "text-muted-foreground"
                      }`}
                    >
                      {rateDiff! > 0 ? "+" : ""}
                      {rateDiff!.toFixed(2)} pp
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Central-bank rate not tracked for one side of this pair.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-2">
                Key metrics
              </div>
              <Metric label="Spot" value={fmtPrice(data.price, data.quote)} />
              <Metric label="1D change" value={`${positive ? "+" : ""}${data.changePercent.toFixed(2)}%`} />
              <Metric label="Category" value={data.category.replace("_", " ")} />
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Economic calendar filtered by currency is coming in a future
                  iteration. For now, see the{" "}
                  <Link href="/calendars/economic-events" className="text-primary underline">
                    global economic calendar
                  </Link>
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
