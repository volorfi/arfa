import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Building2,
  Users,
  Globe,
  Calendar,
  DollarSign,
  BarChart3,
  Activity,
  Newspaper,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MarketTickerBar from "@/components/MarketTickerBar";
import FinancialsTabComponent from "@/components/FinancialsTab";

const PERIOD_OPTIONS = [
  { label: "1D", interval: "5m", range: "1d" },
  { label: "5D", interval: "15m", range: "5d" },
  { label: "1M", interval: "1d", range: "1mo" },
  { label: "YTD", interval: "1d", range: "ytd" },
  { label: "3M", interval: "1d", range: "3mo" },
  { label: "6M", interval: "1d", range: "6mo" },
  { label: "1Y", interval: "1wk", range: "1y" },
  { label: "5Y", interval: "1mo", range: "5y" },
  { label: "Max", interval: "1mo", range: "max" },
];

const TABS = ["Overview", "Financials", "News", "Forecast", "Statistics", "Dividends", "History", "Profile"];

export default function StockDetail() {
  const [, params] = useRoute("/stocks/:symbol");
  const symbol = params?.symbol?.toUpperCase() || "";
  const [activeTab, setActiveTab] = useState("Overview");
  const [periodIdx, setPeriodIdx] = useState(2); // 1M default

  const { data: quote, isLoading: quoteLoading } = trpc.stock.quote.useQuery(
    { symbol },
    { enabled: !!symbol, refetchInterval: 30000 }
  );

  const period = PERIOD_OPTIONS[periodIdx];
  const { data: chartData, isLoading: chartLoading } = trpc.stock.chart.useQuery(
    { symbol, interval: period.interval, range: period.range },
    { enabled: !!symbol }
  );

  const { data: insights } = trpc.stock.insights.useQuery(
    { symbol },
    { enabled: !!symbol }
  );

  const { user } = useAuth();
  const { data: isWatched } = trpc.watchlist.check.useQuery(
    { symbol },
    { enabled: !!symbol && !!user }
  );
  const utils = trpc.useUtils();
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
      toast.success(`${symbol} added to watchlist`);
    },
  });
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
      toast.success(`${symbol} removed from watchlist`);
    },
  });

  const toggleWatchlist = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (isWatched) {
      removeMutation.mutate({ symbol });
    } else {
      addMutation.mutate({ symbol, companyName: quote?.shortName });
    }
  };

  const isPositive = (quote?.regularMarketChange ?? 0) >= 0;

  if (!symbol) return <div className="p-8 text-center text-muted-foreground">No symbol provided</div>;

  return (
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {quoteLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  {quote?.longName || quote?.shortName || symbol}
                  <span className="text-muted-foreground font-normal ml-2">({symbol})</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {quote?.exchange}: {symbol} · Real-Time Price · {quote?.currency || "USD"}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWatchlist}
              className="text-xs gap-1.5"
            >
              {isWatched ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
              {isWatched ? "Remove" : "Watchlist"}
            </Button>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            {quoteLoading ? (
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <span className="text-4xl font-bold text-foreground">
                  ${quote?.regularMarketPrice?.toFixed(2)}
                </span>
                <span className={`text-lg font-semibold ${isPositive ? "text-gain" : "text-loss"}`}>
                  {isPositive ? "+" : ""}{quote?.regularMarketChange?.toFixed(2)} ({isPositive ? "+" : ""}{quote?.regularMarketChangePercent?.toFixed(2)}%)
                </span>
                {isPositive ? <TrendingUp className="h-5 w-5 text-gain" /> : <TrendingDown className="h-5 w-5 text-loss" />}
              </>
            )}
          </div>
          {/* After-hours price */}
          {!quoteLoading && (quote?.postMarketPrice || quote?.preMarketPrice) && (
            <div className="flex items-baseline gap-2 mt-1">
              {quote?.postMarketPrice ? (
                <>
                  <span className="text-xs text-muted-foreground">After-Hours:</span>
                  <span className="text-sm font-medium text-foreground">${quote.postMarketPrice.toFixed(2)}</span>
                  <span className={`text-xs ${(quote.postMarketChange ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
                    {(quote.postMarketChange ?? 0) >= 0 ? "+" : ""}{quote.postMarketChange?.toFixed(2)} ({(quote.postMarketChangePercent ?? 0) >= 0 ? "+" : ""}{quote.postMarketChangePercent?.toFixed(2)}%)
                  </span>
                </>
              ) : quote?.preMarketPrice ? (
                <>
                  <span className="text-xs text-muted-foreground">Pre-Market:</span>
                  <span className="text-sm font-medium text-foreground">${quote.preMarketPrice.toFixed(2)}</span>
                  <span className={`text-xs ${(quote.preMarketChange ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
                    {(quote.preMarketChange ?? 0) >= 0 ? "+" : ""}{quote.preMarketChange?.toFixed(2)} ({(quote.preMarketChangePercent ?? 0) >= 0 ? "+" : ""}{quote.preMarketChangePercent?.toFixed(2)}%)
                  </span>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "Overview" && (
          <OverviewTab
            quote={quote}
            chartData={chartData || []}
            chartLoading={chartLoading}
            quoteLoading={quoteLoading}
            periodIdx={periodIdx}
            setPeriodIdx={setPeriodIdx}
            isPositive={isPositive}
            insights={insights}
            symbol={symbol}
          />
        )}
        {activeTab === "Financials" && <FinancialsTabComponent symbol={symbol} />}
        {activeTab === "News" && <StockNewsTab symbol={symbol} />}
        {activeTab === "Forecast" && <ForecastTab insights={insights} symbol={symbol} />}
        {activeTab === "Statistics" && <StatisticsTab quote={quote} />}
        {activeTab === "Dividends" && <DividendsTab quote={quote} />}
        {activeTab === "History" && <HistoryTab symbol={symbol} />}
        {activeTab === "Profile" && <ProfileTab quote={quote} insights={insights} symbol={symbol} />}
      </div>
    </div>
  );
}

function OverviewTab({ quote, chartData, chartLoading, quoteLoading, periodIdx, setPeriodIdx, isPositive, insights, symbol }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Metrics */}
      <div className="lg:col-span-1 space-y-1">
        <MetricsTable quote={quote} loading={quoteLoading} />
      </div>
      {/* Right: Chart */}
      <div className="lg:col-span-2">
        <StockChart
          data={chartData}
          loading={chartLoading}
          periodIdx={periodIdx}
          setPeriodIdx={setPeriodIdx}
          isPositive={isPositive}
        />
        {/* About section */}
        <div className="mt-6 bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2 text-foreground">About {symbol}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {quote?.description
              ? (quote.description.length > 300 ? quote.description.substring(0, 300) + "..." : quote.description)
              : `${quote?.longName || symbol} is listed on ${quote?.exchange || "the stock exchange"} and trades under the ticker symbol ${symbol}. The stock is currently priced at $${quote?.regularMarketPrice?.toFixed(2) || "N/A"} with a market capitalization of ${quote?.marketCap ? formatLargeNumber(quote.marketCap) : "N/A"}.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricsTable({ quote, loading }: { quote: any; loading: boolean }) {
  const metrics = useMemo(() => {
    if (!quote) return [];
    return [
      { label: "Market Cap", value: quote.marketCap ? formatLargeNumber(quote.marketCap) : "N/A" },
      { label: "Revenue (ttm)", value: quote.revenue ? formatLargeNumber(quote.revenue) : "N/A" },
      { label: "Net Income", value: quote.netIncome ? formatLargeNumber(quote.netIncome) : "N/A" },
      { label: "EPS", value: quote.trailingEps ? `$${quote.trailingEps.toFixed(2)}` : "N/A" },
      { label: "Shares Out", value: quote.sharesOutstanding ? formatLargeNumber(quote.sharesOutstanding) : "N/A" },
      { label: "PE Ratio", value: quote.trailingPE ? quote.trailingPE.toFixed(2) : "N/A" },
      { label: "Forward PE", value: quote.forwardPE ? quote.forwardPE.toFixed(2) : "N/A" },
      { label: "Dividend", value: quote.dividendRate ? `$${quote.dividendRate.toFixed(2)} (${(quote.dividendYield * 100).toFixed(2)}%)` : "N/A" },
      { label: "Volume", value: quote.regularMarketVolume ? quote.regularMarketVolume.toLocaleString() : "N/A" },
      { label: "Open", value: quote.regularMarketOpen ? `$${quote.regularMarketOpen.toFixed(2)}` : "N/A" },
      { label: "Previous Close", value: quote.regularMarketPreviousClose ? `$${quote.regularMarketPreviousClose.toFixed(2)}` : "N/A" },
      { label: "Day's Range", value: `$${quote.regularMarketDayLow?.toFixed(2)} - $${quote.regularMarketDayHigh?.toFixed(2)}` },
      { label: "52-Week Range", value: `$${quote.fiftyTwoWeekLow?.toFixed(2)} - $${quote.fiftyTwoWeekHigh?.toFixed(2)}` },
      { label: "Beta", value: quote.beta ? quote.beta.toFixed(2) : "N/A" },
      { label: "Analysts", value: quote.analystRating || "N/A" },
      { label: "Price Target", value: quote.priceTarget ? `$${quote.priceTarget.toFixed(2)}` : "N/A" },
    ];
  }, [quote]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex justify-between items-center px-4 py-2 text-sm ${
            i < metrics.length - 1 ? "border-b border-border/50" : ""
          }`}
        >
          <span className="text-muted-foreground">{m.label}</span>
          <span className="font-medium text-foreground">{m.value}</span>
        </div>
      ))}
    </div>
  );
}

function StockChart({ data, loading, periodIdx, setPeriodIdx, isPositive }: any) {
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point: any) => ({
      ...point,
      displayDate: formatChartDate(point.timestamp, PERIOD_OPTIONS[periodIdx].range),
    }));
  }, [data, periodIdx]);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Period selectors */}
      <div className="flex gap-1 mb-4">
        {PERIOD_OPTIONS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPeriodIdx(i)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              periodIdx === i
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No chart data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                labelFormatter={(label: string) => label}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                fill="url(#chartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}


function ForecastTab({ insights, symbol }: any) {
  const finResult = insights?.finance?.result;
  const recommendation = finResult?.recommendation;
  const techEvents = finResult?.instrumentInfo?.technicalEvents;
  const shortTerm = techEvents?.shortTermOutlook;
  const midTerm = techEvents?.intermediateTermOutlook;
  const longTerm = techEvents?.longTermOutlook;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Analyst Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary/50 rounded-lg p-4">
            <span className="text-xs text-muted-foreground">Rating</span>
            <p className="text-xl font-bold text-foreground mt-1">
              {recommendation?.rating || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{recommendation?.provider || ""}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <span className="text-xs text-muted-foreground">Price Target</span>
            <p className="text-xl font-bold text-foreground mt-1">
              {recommendation?.targetPrice ? `$${recommendation.targetPrice.toFixed(2)}` : "N/A"}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <span className="text-xs text-muted-foreground">Provider</span>
            <p className="text-xl font-bold text-foreground mt-1">
              {techEvents?.provider || "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Technical Outlook</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Short-Term", data: shortTerm },
            { label: "Intermediate-Term", data: midTerm },
            { label: "Long-Term", data: longTerm },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/50 rounded-lg p-4">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <p className={`text-lg font-bold mt-1 ${
                item.data?.direction === "Bullish" ? "text-gain" :
                item.data?.direction === "Bearish" ? "text-loss" : "text-foreground"
              }`}>
                {item.data?.direction || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.data?.scoreDescription || ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatisticsTab({ quote }: any) {
  const stats = [
    { label: "Market Cap", value: quote?.marketCap ? formatLargeNumber(quote.marketCap) : "N/A" },
    { label: "Enterprise Value", value: "N/A" },
    { label: "PE Ratio (TTM)", value: quote?.trailingPE?.toFixed(2) || "N/A" },
    { label: "Forward PE", value: quote?.forwardPE?.toFixed(2) || "N/A" },
    { label: "PEG Ratio", value: "N/A" },
    { label: "Price/Sales", value: "N/A" },
    { label: "Price/Book", value: "N/A" },
    { label: "EPS (TTM)", value: quote?.trailingEps ? `$${quote.trailingEps.toFixed(2)}` : "N/A" },
    { label: "Revenue (TTM)", value: quote?.revenue ? formatLargeNumber(quote.revenue) : "N/A" },
    { label: "Gross Profit", value: "N/A" },
    { label: "EBITDA", value: "N/A" },
    { label: "Net Income", value: quote?.netIncome ? formatLargeNumber(quote.netIncome) : "N/A" },
    { label: "Shares Outstanding", value: quote?.sharesOutstanding ? formatLargeNumber(quote.sharesOutstanding) : "N/A" },
    { label: "Float", value: "N/A" },
    { label: "Avg Volume (10d)", value: quote?.averageVolume?.toLocaleString() || "N/A" },
    { label: "Beta", value: quote?.beta?.toFixed(2) || "N/A" },
    { label: "52-Week High", value: quote?.fiftyTwoWeekHigh ? `$${quote.fiftyTwoWeekHigh.toFixed(2)}` : "N/A" },
    { label: "52-Week Low", value: quote?.fiftyTwoWeekLow ? `$${quote.fiftyTwoWeekLow.toFixed(2)}` : "N/A" },
  ];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Key Statistics</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {stats.map((s, i) => (
          <div key={s.label} className="flex justify-between px-4 py-2.5 border-b border-border/50 text-sm">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium text-foreground">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DividendsTab({ quote }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-semibold text-lg mb-4 text-foreground">Dividends</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary/50 rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Annual Dividend</span>
          <p className="text-xl font-bold text-foreground mt-1">
            {quote?.dividendRate ? `$${quote.dividendRate.toFixed(2)}` : "N/A"}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Dividend Yield</span>
          <p className="text-xl font-bold text-foreground mt-1">
            {quote?.dividendYield ? `${(quote.dividendYield * 100).toFixed(2)}%` : "N/A"}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Ex-Dividend Date</span>
          <p className="text-xl font-bold text-foreground mt-1">
            {quote?.exDividendDate || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ symbol }: any) {
  const { data, isLoading } = trpc.stock.chart.useQuery(
    { symbol, interval: "1d", range: "1mo" },
    { enabled: !!symbol }
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Price History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-right px-4 py-2 font-medium">Open</th>
              <th className="text-right px-4 py-2 font-medium">High</th>
              <th className="text-right px-4 py-2 font-medium">Low</th>
              <th className="text-right px-4 py-2 font-medium">Close</th>
              <th className="text-right px-4 py-2 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-2">
                      <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              [...(data || [])].reverse().map((point: any, i: number) => (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-2 text-foreground">
                    {new Date(point.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">${point.open.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-foreground">${point.high.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-foreground">${point.low.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium text-foreground">${point.close.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{point.volume.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileTab({ quote, insights, symbol }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Company Profile</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {quote?.description || `${quote?.longName || symbol} trades on ${quote?.exchange || "the stock exchange"} under the ticker ${symbol}. The company operates in the ${quote?.sector || "various"} sector within the ${quote?.industry || "broader market"} industry.`}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Building2, label: "Sector", value: quote?.sector || "N/A" },
            { icon: Users, label: "Employees", value: quote?.employees?.toLocaleString() || "N/A" },
            { icon: Globe, label: "Website", value: quote?.website ? quote.website : "N/A", isLink: !!quote?.website },
            { icon: Calendar, label: "Industry", value: quote?.industry || "N/A" },
            { icon: Calendar, label: "Exchange", value: quote?.exchange || "N/A" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
                {(item as any).isLink ? (
                  <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline block">{item.value}</a>
                ) : (
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stock News Tab ─────────────────────────────────────────────────────

const NEWS_PAGE_SIZE = 20;

function StockNewsTab({ symbol }: { symbol: string }) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const queryInput = useMemo(
    () => ({
      ticker: symbol,
      search: search || undefined,
      source: source || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: NEWS_PAGE_SIZE,
    }),
    [symbol, search, source, dateFrom, dateTo, page]
  );

  const { data, isLoading } = trpc.news.list.useQuery(queryInput);
  const { data: sources } = trpc.news.sources.useQuery();

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / NEWS_PAGE_SIZE);

  function formatTimeAgo(dateStr: string | Date): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={`Search ${symbol} news...`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearch(searchInput);
                      setPage(1);
                    }
                  }}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSearch(searchInput);
                  setPage(1);
                }}
                className="h-9 px-3"
              >
                Search
              </Button>
            </div>
          </div>

          {/* Source */}
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources?.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date from */}
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {symbol} News
        </span>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            ({total} article{total !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* Articles */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-5 w-full bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No news articles found for {symbol}.
              {search && " Try adjusting your search criteria."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-accent/30 transition-colors group"
              >
                <h3 className="text-sm font-medium text-foreground leading-snug mb-1.5 group-hover:text-primary transition-colors">
                  {article.title}
                  <ExternalLink className="inline-block h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </h3>
                {article.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-medium text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded">
                    {article.source}
                  </span>
                  {article.category && (
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {article.category}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-3 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility functions
function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatChartDate(timestamp: number, range: string): string {
  const date = new Date(timestamp);
  if (range === "1d") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (range === "5d") {
    return date.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" });
  }
  if (["1mo", "3mo", "ytd"].includes(range)) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
