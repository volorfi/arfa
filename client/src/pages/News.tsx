import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Newspaper,
  Search,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  BookOpen,
  LayoutGrid,
  BarChart3,
  FileText,
  Headphones,
  Building2,
  User,
  FileStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  Treemap,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

const PAGE_SIZE = 30;

type SentimentType = "bullish" | "bearish" | "neutral" | null;
type TabType = "all" | "world" | "blogs" | "research" | "podcasts";
type DashboardPeriod = "today" | "week" | "month" | "all";

const SENTIMENT_CONFIG = {
  bullish: {
    label: "Bullish",
    icon: TrendingUp,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    color: "#10b981",
  },
  bearish: {
    label: "Bearish",
    icon: TrendingDown,
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    color: "#ef4444",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
    color: "#64748b",
  },
} as const;

const TAB_CONFIG = [
  { key: "all" as TabType, label: "All News & Blogs", icon: LayoutGrid },
  { key: "world" as TabType, label: "World News", icon: Globe },
  { key: "blogs" as TabType, label: "Blogs", icon: BookOpen },
  { key: "research" as TabType, label: "External Research", icon: FileText },
  { key: "podcasts" as TabType, label: "Podcasts", icon: Headphones },
];

function SentimentBadge({ sentiment }: { sentiment: SentimentType }) {
  if (!sentiment || !SENTIMENT_CONFIG[sentiment]) return null;
  const config = SENTIMENT_CONFIG[sentiment];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.className}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

function ArticleTypeBadge({ type }: { type: string }) {
  if (type === "blog") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20">
        <BookOpen className="h-2.5 w-2.5" />
        Blog
      </span>
    );
  }
  return null;
}

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

// ─── Sentiment Dashboard Component ───────────────────────────────────────

function SentimentDashboard({ tab, period, onPeriodChange }: {
  tab: TabType;
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
}) {
  const articleType = tab === "blogs" ? "blog" as const : tab === "world" ? "news" as const : undefined;
  const { data, isLoading } = trpc.news.sentimentDashboard.useQuery({ articleType, period });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-5">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[250px] bg-muted rounded animate-pulse" />
          <div className="h-[250px] bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { byTicker, bySource, byCategory, bySentiment } = data;
  const totalSentiment = bySentiment.bullish + bySentiment.bearish + bySentiment.neutral;

  // Bubble chart data for tickers
  const bubbleData = byTicker.slice(0, 20).map((t) => {
    const score = t.total > 0 ? (t.bullish - t.bearish) / t.total : 0;
    return {
      name: t.ticker,
      x: score,
      y: t.total,
      z: t.total,
      bullish: t.bullish,
      bearish: t.bearish,
      neutral: t.neutral,
      fill: score > 0.15 ? "#10b981" : score < -0.15 ? "#ef4444" : "#64748b",
    };
  });

  // Category treemap data
  const treemapData = byCategory.map((c) => {
    const score = c.total > 0 ? (c.bullish - c.bearish) / c.total : 0;
    return {
      name: c.category,
      size: c.total,
      bullish: c.bullish,
      bearish: c.bearish,
      neutral: c.neutral,
      fill: score > 0.15 ? "#10b981" : score < -0.15 ? "#ef4444" : "#64748b",
    };
  });

  // Source bar chart data
  const sourceBarData = bySource.slice(0, 10).map((s) => ({
    name: s.source.length > 15 ? s.source.substring(0, 14) + "..." : s.source,
    fullName: s.source,
    bullish: s.bullish,
    bearish: s.bearish,
    neutral: s.neutral,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Sentiment Analytics</h2>
        </div>
        <div className="flex items-center gap-1">
          {(["today", "week", "month", "all"] as DashboardPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p === "today" ? "Today" : p === "week" ? "7 Days" : p === "month" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Sentiment Ring + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3" />
              {totalSentiment > 0 && (
                <>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3"
                    strokeDasharray={`${(bySentiment.bullish / totalSentiment) * 88} 88`} strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="3"
                    strokeDasharray={`${(bySentiment.neutral / totalSentiment) * 88} 88`}
                    strokeDashoffset={`${-(bySentiment.bullish / totalSentiment) * 88}`} />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="3"
                    strokeDasharray={`${(bySentiment.bearish / totalSentiment) * 88} 88`}
                    strokeDashoffset={`${-((bySentiment.bullish + bySentiment.neutral) / totalSentiment) * 88}`} />
                </>
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">{totalSentiment}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Bullish</span>
              <span className="text-xs font-semibold text-foreground">{bySentiment.bullish}</span>
              <span className="text-[10px] text-muted-foreground">
                ({totalSentiment > 0 ? Math.round((bySentiment.bullish / totalSentiment) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs text-muted-foreground">Neutral</span>
              <span className="text-xs font-semibold text-foreground">{bySentiment.neutral}</span>
              <span className="text-[10px] text-muted-foreground">
                ({totalSentiment > 0 ? Math.round((bySentiment.neutral / totalSentiment) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Bearish</span>
              <span className="text-xs font-semibold text-foreground">{bySentiment.bearish}</span>
              <span className="text-[10px] text-muted-foreground">
                ({totalSentiment > 0 ? Math.round((bySentiment.bearish / totalSentiment) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Top 3 Bullish Tickers */}
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Most Bullish</span>
          </div>
          <div className="space-y-1.5">
            {byTicker
              .filter((t) => t.bullish > 0 && !t.ticker.startsWith("^"))
              .sort((a, b) => (b.total > 0 ? b.bullish / b.total : 0) - (a.total > 0 ? a.bullish / a.total : 0))
              .slice(0, 5)
              .map((t) => (
                <div key={t.ticker} className="flex items-center justify-between">
                  <Link href={`/stocks/${t.ticker}`} className="text-xs font-medium text-foreground hover:text-primary">
                    {t.ticker}
                  </Link>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {t.total > 0 ? Math.round((t.bullish / t.total) * 100) : 0}% bull
                  </span>
                </div>
              ))}
            {byTicker.filter((t) => t.bullish > 0).length === 0 && (
              <span className="text-[10px] text-muted-foreground">No data</span>
            )}
          </div>
        </div>

        {/* Top 3 Bearish Tickers */}
        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Most Bearish</span>
          </div>
          <div className="space-y-1.5">
            {byTicker
              .filter((t) => t.bearish > 0 && !t.ticker.startsWith("^"))
              .sort((a, b) => (b.total > 0 ? b.bearish / b.total : 0) - (a.total > 0 ? a.bearish / a.total : 0))
              .slice(0, 5)
              .map((t) => (
                <div key={t.ticker} className="flex items-center justify-between">
                  <Link href={`/stocks/${t.ticker}`} className="text-xs font-medium text-foreground hover:text-primary">
                    {t.ticker}
                  </Link>
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                    {t.total > 0 ? Math.round((t.bearish / t.total) * 100) : 0}% bear
                  </span>
                </div>
              ))}
            {byTicker.filter((t) => t.bearish > 0).length === 0 && (
              <span className="text-[10px] text-muted-foreground">No data</span>
            )}
          </div>
        </div>

        {/* Most Mentioned */}
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Most Mentioned</span>
          </div>
          <div className="space-y-1.5">
            {byTicker.filter((t) => !t.ticker.startsWith("^")).slice(0, 5).map((t) => (
              <div key={t.ticker} className="flex items-center justify-between">
                <Link href={`/stocks/${t.ticker}`} className="text-xs font-medium text-foreground hover:text-primary">
                  {t.ticker}
                </Link>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {t.total} mentions
                </span>
              </div>
            ))}
            {byTicker.length === 0 && (
              <span className="text-[10px] text-muted-foreground">No data</span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticker Sentiment Bubble Chart */}
        <div className="bg-muted/20 border border-border/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Ticker Sentiment Map</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Bubble size = mention count, X = sentiment score (-1 bearish to +1 bullish)</p>
          {bubbleData.length > 0 ? (
            <div className="h-[220px]" style={{ minWidth: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis type="number" dataKey="x" domain={[-1, 1]} tickCount={5}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    label={{ value: "Sentiment Score", position: "bottom", offset: 0, style: { fontSize: 10, fill: "var(--muted-foreground)" } }} />
                  <YAxis type="number" dataKey="y"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    label={{ value: "Mentions", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--muted-foreground)" } }} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground border border-border rounded-lg p-2 shadow-lg text-xs">
                          <div className="font-semibold mb-1">{d.name}</div>
                          <div className="text-emerald-500">Bullish: {d.bullish}</div>
                          <div className="text-red-500">Bearish: {d.bearish}</div>
                          <div className="text-slate-500">Neutral: {d.neutral}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={bubbleData}>
                    {bubbleData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.7} stroke={entry.fill} strokeWidth={1} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">No ticker data available</div>
          )}
        </div>

        {/* Source Sentiment Stacked Bar Chart */}
        <div className="bg-muted/20 border border-border/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Sentiment by Source</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Stacked bar: bullish / neutral / bearish per source</p>
          {sourceBarData.length > 0 ? (
            <div className="h-[220px]" style={{ minWidth: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <RechartsTooltip
                    content={({ payload, label }) => {
                      if (!payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover text-popover-foreground border border-border rounded-lg p-2 shadow-lg text-xs">
                          <div className="font-semibold mb-1">{d?.fullName || label}</div>
                          <div className="text-emerald-500">Bullish: {d?.bullish}</div>
                          <div className="text-slate-500">Neutral: {d?.neutral}</div>
                          <div className="text-red-500">Bearish: {d?.bearish}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="bullish" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill="#64748b" />
                  <Bar dataKey="bearish" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">No source data available</div>
          )}
        </div>
      </div>

      {/* Category Treemap */}
      {treemapData.length > 0 && (
        <div className="mt-4 bg-muted/20 border border-border/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Category Sentiment Treemap</h3>
          <p className="text-[10px] text-muted-foreground mb-2">
            Size = article count. Color: <span className="text-emerald-500">green</span> = bullish, <span className="text-slate-500">gray</span> = neutral, <span className="text-red-500">red</span> = bearish
          </p>
          <div className="h-[180px]" style={{ minWidth: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="var(--background)"
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, fill } = props;
  if (!width || !height || width < 30 || height < 20) return null;
  const fontSize = width > 120 ? 14 : width > 80 ? 12 : 11;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.4} stroke={fill} strokeWidth={1.5} rx={4} />
      {width > 50 && height > 25 && (
        <>
          {/* Dark outline for contrast on any background */}
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={800}
            fill="none"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={3}
            strokeLinejoin="round"
          >
            {name}
          </text>
          {/* White text on top */}
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={800}
            fill="#ffffff"
          >
            {name}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Main News Page ──────────────────────────────────────────────────────

export default function News() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showDashboard, setShowDashboard] = useState(true);
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("week");
  const [source, setSource] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [sentiment, setSentiment] = useState<string>("");
  const [ticker, setTicker] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);

  // Map tab to articleType filter
  const articleTypeFilter = useMemo(() => {
    if (activeTab === "blogs") return "blog" as const;
    if (activeTab === "world") return "news" as const;
    return undefined;
  }, [activeTab]);

  const queryInput = useMemo(
    () => ({
      source: source || undefined,
      category: category || undefined,
      sentiment: (sentiment || undefined) as "bullish" | "bearish" | "neutral" | undefined,
      articleType: articleTypeFilter,
      ticker: ticker || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [source, category, sentiment, articleTypeFilter, ticker, search, dateFrom, dateTo, page]
  );

  const { data, isLoading } = trpc.news.list.useQuery(queryInput);
  const { data: sources } = trpc.news.sources.useQuery();
  const { data: categories } = trpc.news.categories.useQuery();
  const { data: sentimentStats } = trpc.news.sentimentStats.useQuery({});

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSource("");
    setCategory("");
    setSentiment("");
    setTicker("");
    setSearch("");
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = source || category || sentiment || ticker || search || dateFrom || dateTo;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Market News & Blogs</h1>
            <span className="text-xs text-muted-foreground ml-2">
              {total > 0 && `${total.toLocaleString()} articles`}
            </span>
          </div>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              showDashboard
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-muted/50 p-1 rounded-lg w-fit">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-md transition-all ${
                activeTab === key
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Sentiment Dashboard (collapsible) - only for news tabs */}
        {showDashboard && activeTab !== "research" && activeTab !== "podcasts" && (
          <SentimentDashboard tab={activeTab} period={dashboardPeriod} onPeriodChange={setDashboardPeriod} />
        )}

        {/* External Research Tab */}
        {activeTab === "research" && <ExternalResearchTab />}

        {/* Podcasts Tab */}
        {activeTab === "podcasts" && <PodcastsTab />}

        {/* News content - only for news tabs */}
        {activeTab !== "research" && activeTab !== "podcasts" && (<>

        {/* Sentiment Summary Bar */}
        {sentimentStats && sentimentStats.total > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-card border border-border rounded-lg">
            <span className="text-xs font-medium text-muted-foreground mr-1">Market Sentiment:</span>
            <button
              onClick={() => { setSentiment(sentiment === "bullish" ? "" : "bullish"); setPage(1); }}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sentiment === "bullish"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-emerald-500/8 text-emerald-600/70 dark:text-emerald-400/70 hover:bg-emerald-500/15"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              <span className="font-semibold">{sentimentStats.bullish}</span>
              <span>Bullish</span>
            </button>
            <button
              onClick={() => { setSentiment(sentiment === "bearish" ? "" : "bearish"); setPage(1); }}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sentiment === "bearish"
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 ring-1 ring-red-500/30"
                  : "bg-red-500/8 text-red-600/70 dark:text-red-400/70 hover:bg-red-500/15"
              }`}
            >
              <TrendingDown className="h-3 w-3" />
              <span className="font-semibold">{sentimentStats.bearish}</span>
              <span>Bearish</span>
            </button>
            <button
              onClick={() => { setSentiment(sentiment === "neutral" ? "" : "neutral"); setPage(1); }}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                sentiment === "neutral"
                  ? "bg-slate-500/20 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/30"
                  : "bg-slate-500/8 text-slate-600/70 dark:text-slate-400/70 hover:bg-slate-500/15"
              }`}
            >
              <Minus className="h-3 w-3" />
              <span className="font-semibold">{sentimentStats.neutral}</span>
              <span>Neutral</span>
            </button>
            {/* Sentiment bar visualization */}
            <div className="flex-1 ml-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {sentimentStats.bullish > 0 && (
                  <div className="bg-emerald-500 transition-all" style={{ width: `${(sentimentStats.bullish / sentimentStats.total) * 100}%` }} />
                )}
                {sentimentStats.neutral > 0 && (
                  <div className="bg-slate-400 transition-all" style={{ width: `${(sentimentStats.neutral / sentimentStats.total) * 100}%` }} />
                )}
                {sentimentStats.bearish > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(sentimentStats.bearish / sentimentStats.total) * 100}%` }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
            {hasFilters && (
              <button onClick={clearFilters} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search headlines..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Button size="sm" onClick={handleSearch} className="h-9 px-4">Search</Button>
              </div>
            </div>

            {/* Source filter */}
            <Select value={source} onValueChange={(v) => { setSource(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources?.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>

            {/* Sentiment filter */}
            <Select value={sentiment} onValueChange={(v) => { setSentiment(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sentiment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="bullish"><span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-500" />Bullish</span></SelectItem>
                <SelectItem value="bearish"><span className="flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-red-500" />Bearish</span></SelectItem>
                <SelectItem value="neutral"><span className="flex items-center gap-1.5"><Minus className="h-3 w-3 text-slate-500" />Neutral</span></SelectItem>
              </SelectContent>
            </Select>

            {/* Ticker filter */}
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Ticker (e.g. AAPL)" value={ticker} onChange={(e) => { setTicker(e.target.value.toUpperCase()); setPage(1); }} className="pl-8 h-9 text-sm" />
            </div>

            {/* Date from */}
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {/* Date to */}
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 10 }).map((_, i) => (
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
                {hasFilters
                  ? "No articles match your filters. Try adjusting your search criteria."
                  : "No articles yet. Articles will appear after the next scheduled scrape."}
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                          {article.title}
                          <ExternalLink className="inline-block h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </h3>
                      </div>
                      {article.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{article.summary}</p>
                      )}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <SentimentBadge sentiment={article.sentiment as SentimentType} />
                        <ArticleTypeBadge type={(article as any).articleType || "news"} />
                        <span className="text-[11px] font-medium text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded">{article.source}</span>
                        {article.category && (
                          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{article.category}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{formatTimeAgo(article.publishedAt)}</span>
                        {article.tickers && (
                          <div className="flex gap-1">
                            {article.tickers.split(",").slice(0, 5).map((t) => (
                              <span
                                key={t}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/stocks/${t}`; }}
                                className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20 cursor-pointer"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-3 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 px-3 text-xs">
                  Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        </>)}
      </div>
    </div>
  );
}

// ─── External Research Tab ──────────────────────────────────────────────

function ExternalResearchTab() {
  const [researchSearch, setResearchSearch] = useState("");
  const [researchSearchInput, setResearchSearchInput] = useState("");
  const [researchCategory, setResearchCategory] = useState("");
  const [researchSentiment, setResearchSentiment] = useState("");
  const [researchPage, setResearchPage] = useState(1);

  const queryInput = useMemo(() => ({
    category: researchCategory || undefined,
    sentiment: researchSentiment || undefined,
    search: researchSearch || undefined,
    limit: PAGE_SIZE,
    offset: (researchPage - 1) * PAGE_SIZE,
    randomize: true,
  }), [researchCategory, researchSentiment, researchSearch, researchPage]);

  const { data, isLoading } = trpc.externalResearch.list.useQuery(queryInput);
  const { data: categories } = trpc.externalResearch.categories.useQuery();

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {/* Info banner */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Curated research reports from top investment banks, asset managers, and think tanks.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {(researchSearch || researchCategory || researchSentiment) && (
            <button onClick={() => { setResearchSearch(""); setResearchSearchInput(""); setResearchCategory(""); setResearchSentiment(""); setResearchPage(1); }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search research..." value={researchSearchInput}
                  onChange={(e) => setResearchSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setResearchSearch(researchSearchInput); setResearchPage(1); } }}
                  className="pl-8 h-9 text-sm" />
              </div>
              <Button size="sm" onClick={() => { setResearchSearch(researchSearchInput); setResearchPage(1); }} className="h-9 px-4">Search</Button>
            </div>
          </div>
          <Select value={researchCategory} onValueChange={(v) => { setResearchCategory(v === "all" ? "" : v); setResearchPage(1); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={researchSentiment} onValueChange={(v) => { setResearchSentiment(v === "all" ? "" : v); setResearchPage(1); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sentiment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="bullish"><span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-500" />Bullish</span></SelectItem>
              <SelectItem value="bearish"><span className="flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-red-500" />Bearish</span></SelectItem>
              <SelectItem value="neutral"><span className="flex items-center gap-1.5"><Minus className="h-3 w-3 text-slate-500" />Neutral</span></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Research List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-5 w-full bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No research reports found. Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => (
              <a key={item.id} href={(item as any).originalSourceUrl || item.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-accent/30 transition-colors group">
                <div className="flex items-start gap-4">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors mb-1">
                      {item.title}
                      <ExternalLink className="inline-block h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <SentimentBadge sentiment={item.sentiment as SentimentType} />
                      {item.firm && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded">
                          <Building2 className="h-2.5 w-2.5" />{item.firm}
                        </span>
                      )}
                      {item.author && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="h-2.5 w-2.5" />{item.author}
                        </span>
                      )}
                      {item.contentType && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20">
                          <FileStack className="h-2.5 w-2.5" />{item.contentType}
                        </span>
                      )}
                      {item.pages && (
                        <span className="text-[11px] text-muted-foreground">{item.pages}</span>
                      )}
                      {item.category && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.category}</span>
                      )}
                      {item.tickers && (
                        <div className="flex gap-1">
                          {item.tickers.split(",").slice(0, 5).map((t) => (
                            <span key={t} onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/stocks/${t.trim()}`; }}
                              className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20 cursor-pointer">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">Page {researchPage} of {totalPages} ({total} reports)</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setResearchPage((p) => Math.max(1, p - 1))} disabled={researchPage <= 1} className="h-8 px-3 text-xs">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setResearchPage((p) => Math.min(totalPages, p + 1))} disabled={researchPage >= totalPages} className="h-8 px-3 text-xs">
                Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Podcasts Tab ──────────────────────────────────────────────────────

function PodcastsTab() {
  const [podSearch, setPodSearch] = useState("");
  const [podSearchInput, setPodSearchInput] = useState("");
  const [podCategory, setPodCategory] = useState("");
  const [podPage, setPodPage] = useState(1);

  const queryInput = useMemo(() => ({
    category: podCategory || undefined,
    search: podSearch || undefined,
    limit: PAGE_SIZE,
    offset: (podPage - 1) * PAGE_SIZE,
    randomize: true,
  }), [podCategory, podSearch, podPage]);

  const { data, isLoading } = trpc.externalPodcasts.list.useQuery(queryInput);
  const { data: categories } = trpc.externalPodcasts.categories.useQuery();

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {/* Info banner */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-purple-500/5 border border-purple-500/15 rounded-lg">
        <Headphones className="h-4 w-4 text-purple-500 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Curated finance and investing podcasts from top voices in markets and economics.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {(podSearch || podCategory) && (
            <button onClick={() => { setPodSearch(""); setPodSearchInput(""); setPodCategory(""); setPodPage(1); }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search podcasts..." value={podSearchInput}
                  onChange={(e) => setPodSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setPodSearch(podSearchInput); setPodPage(1); } }}
                  className="pl-8 h-9 text-sm" />
              </div>
              <Button size="sm" onClick={() => { setPodSearch(podSearchInput); setPodPage(1); }} className="h-9 px-4">Search</Button>
            </div>
          </div>
          <Select value={podCategory} onValueChange={(v) => { setPodCategory(v === "all" ? "" : v); setPodPage(1); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Podcasts List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-5 w-full bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Headphones className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No podcasts found. Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => {
              const pod = item as any;
              return (
              <div key={item.id} className="px-5 py-4 hover:bg-accent/30 transition-colors group">
                <div className="flex items-start gap-4">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground leading-snug mb-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2.5 flex-wrap mb-2">
                      <SentimentBadge sentiment={item.sentiment as SentimentType} />
                      {item.duration && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />{item.duration}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.category}</span>
                      )}
                      {item.tickers && (
                        <div className="flex gap-1">
                          {item.tickers.split(",").slice(0, 5).map((t) => (
                            <span key={t} onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/stocks/${t.trim()}`; }}
                              className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20 cursor-pointer">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Platform buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {pod.applePodcastsUrl && (
                        <a href={pod.applePodcastsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15zm0 2a5.5 5.5 0 00-1.5 10.78V15.5a1.5 1.5 0 013 0v1.78A5.5 5.5 0 0012 6.5zm0 2a3.5 3.5 0 00-1 6.86V15.5a1 1 0 012 0v-.14A3.5 3.5 0 0012 8.5zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>
                          Apple Podcasts
                        </a>
                      )}
                      {pod.spotifyUrl && (
                        <a href={pod.spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.622.622 0 01.207.857zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.452-1.493c3.632-1.102 8.147-.568 11.234 1.33a.78.78 0 01.255 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.533-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.954 1.611z"/></svg>
                          Spotify
                        </a>
                      )}
                      {pod.youtubeUrl && (
                        <a href={pod.youtubeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          YouTube
                        </a>
                      )}
                      {!pod.applePodcastsUrl && !pod.spotifyUrl && !pod.youtubeUrl && (
                        <a href={pod.originalSourceUrl || item.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors">
                          <ExternalLink className="h-3 w-3" />
                          Listen
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">Page {podPage} of {totalPages} ({total} episodes)</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPodPage((p) => Math.max(1, p - 1))} disabled={podPage <= 1} className="h-8 px-3 text-xs">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPodPage((p) => Math.min(totalPages, p + 1))} disabled={podPage >= totalPages} className="h-8 px-3 text-xs">
                Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
