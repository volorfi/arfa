import { trpc } from "@/lib/trpc";
import GlobalSearch from "@/components/GlobalSearch";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import {
  Star,
  Filter,
  ArrowUpDown,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Newspaper,
  Calendar,
  Minus,
  Globe,
  Landmark,
  Building2,
  BarChart3,
  ChevronRight,
  Zap,
  Activity,
  PieChart,
  Search,
  Flame,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  User,
  FileStack,
} from "lucide-react";

export default function Home() {
  useEffect(() => {
    document.title = "ARFA Global Markets — Stocks, Bonds & Macro Analytics";
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <MarketPulse />
      <div className="max-w-[1400px] mx-auto px-4 pb-16 space-y-8">
        {/* Row 1: Movers + News | Trending + Sentiment + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="lg:col-span-2 space-y-6">
            <TopMoversCompact />
            <NewsSentimentBlock />
          </div>
          <div className="space-y-6">
            <TrendingTickers />
            <SentimentPulse />
            <CalendarPreview />
          </div>
        </div>
        {/* Row 2: Sovereign Bonds | Macro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up-delay-1">
          <SovereignBondsSpotlight />
          <MacroSnapshot />
        </div>
        {/* Row 3: Options Hub */}
        <OptionsHubBlock />
        {/* Row 3.5: Research & Podcasts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up-delay-1">
          <ExternalResearchBlock />
          <PodcastsBlock />
        </div>
        {/* Row 4: IPO | Corporate | Quick Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up-delay-2">
          <IPOCorner />
          <CorporateBondsHighlight />
          <QuickToolsGrid />
        </div>
      </div>
    </div>
  );
}

/* ─── HERO ─── */
function HeroSection() {
  const { data: trendingTickers } = trpc.trendingTickers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const fallback = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"];
  const trending = trendingTickers && trendingTickers.length > 0 ? trendingTickers : fallback;

  return (
    <div className="relative overflow-hidden">
      {/* Gradient mesh background with unique identity */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-background to-chart-2/4 pointer-events-none" />
      <div className="absolute top-[-80px] right-[-40px] w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-30px] w-[350px] h-[350px] bg-chart-2/4 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-chart-5/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Preamble + Search */}
          <div className="lg:col-span-7 space-y-5 animate-fade-in-up relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20">
              <Activity className="h-3 w-3 animate-pulse" />
              Independent Analytical Platform
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.15]" style={{ fontFamily: 'var(--font-display)' }}>
              Your Global Markets
              <br />
              <span className="bg-gradient-to-r from-primary via-chart-5 to-chart-2 bg-clip-text text-transparent">Intelligence Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl">
              Track <strong className="text-foreground">equities</strong>, <strong className="text-foreground">sovereign & corporate bonds</strong>, <strong className="text-foreground">macroeconomic indicators</strong>, and <strong className="text-foreground">market sentiment</strong> across 120+ countries. Real-time data, AI-powered news analysis, and professional-grade research tools — all in one platform.
            </p>
            <div className="pt-1">
              <GlobalSearch large className="max-w-lg" />
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="font-medium">Trending now:</span>
                {trending.map((s) => (
                  <Link key={s} href={`/stocks/${s}`} className="text-primary hover:text-primary/80 font-semibold transition-colors">
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Quick Stats Cards */}
          <div className="lg:col-span-5">
            <QuickStatsCards />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStatsCards() {
  const { data: sentiment } = trpc.news.sentimentDashboard.useQuery({ period: "today" }, { staleTime: 60000 });
  const { data: sovSummary } = trpc.sovereign.summary.useQuery(undefined, { staleTime: 300000 });
  const { data: bondsSummary } = trpc.bonds.summary.useQuery(undefined, { staleTime: 300000 });

  const overall = sentiment?.bySentiment;
  const totalArticles = overall ? (overall.bullish + overall.bearish + overall.neutral) : 0;
  const bullPct = overall ? Math.round((overall.bullish / Math.max(totalArticles, 1)) * 100) : 0;
  const bearPct = overall ? Math.round((overall.bearish / Math.max(totalArticles, 1)) * 100) : 0;

  const stats = [
    { label: "Sovereign Bonds", value: sovSummary?.totalBonds?.toString() || "—", sub: `${sovSummary?.uniqueCountries || "—"} countries`, icon: Globe, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Corporate Issuers", value: bondsSummary?.totalIssuers?.toString() || "—", sub: `${bondsSummary?.totalBonds || "—"} bonds`, icon: Building2, color: "text-violet-500", bgColor: "bg-violet-500/10" },
    { label: "Market Sentiment", value: `${bullPct}% Bull`, sub: `${bearPct}% Bear · Today`, icon: BarChart3, color: bullPct > bearPct ? "text-emerald-500" : "text-red-500", bgColor: bullPct > bearPct ? "bg-emerald-500/10" : "bg-red-500/10" },
    { label: "News & Blogs", value: totalArticles?.toString() || "—", sub: "articles analyzed", icon: Newspaper, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="group relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-0.5">
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${s.bgColor} mb-2.5 group-hover:scale-110 transition-transform duration-300`}>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{s.value}</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
          <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── MARKET PULSE ─── */
function MarketPulse() {
  const { data: movers } = trpc.market.movers.useQuery(undefined, { refetchInterval: 120000 });

  // Show a horizontal strip of key market stats
  const topGainer = movers?.gainers?.[0];
  const topLoser = movers?.losers?.[0];

  return (
    <div className="border-y border-border/50 bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <div className="flex items-center gap-6 overflow-x-auto text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-500" /> Market Pulse
          </span>
          {topGainer && (
            <Link href={`/stocks/${topGainer.symbol}`} className="flex items-center gap-1.5 shrink-0 hover:text-primary transition-colors">
              <ArrowUp className="h-3 w-3 text-gain" />
              <span className="font-semibold text-foreground">{topGainer.symbol}</span>
              <span className="text-gain font-medium">+{topGainer.changePercent.toFixed(1)}%</span>
            </Link>
          )}
          {topLoser && (
            <Link href={`/stocks/${topLoser.symbol}`} className="flex items-center gap-1.5 shrink-0 hover:text-primary transition-colors">
              <ArrowDown className="h-3 w-3 text-loss" />
              <span className="font-semibold text-foreground">{topLoser.symbol}</span>
              <span className="text-loss font-medium">{topLoser.changePercent.toFixed(1)}%</span>
            </Link>
          )}
          <div className="h-3 w-px bg-border shrink-0" />
          <Link href="/movers" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <ArrowUpDown className="h-3 w-3" /> All Movers
          </Link>
          <Link href="/screener" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Filter className="h-3 w-3" /> Screener
          </Link>
          <Link href="/watchlist" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Star className="h-3 w-3" /> Watchlist
          </Link>
          <Link href="/news" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Newspaper className="h-3 w-3" /> News & Blogs
          </Link>
          <Link href="/options/flow" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Activity className="h-3 w-3" /> Options Flow
          </Link>
          <Link href="/macro" className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Globe className="h-3 w-3" /> Macroeconomics
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── TOP MOVERS COMPACT ─── */
function TopMoversCompact() {
  const { data, isLoading } = trpc.market.movers.useQuery(undefined, { refetchInterval: 120000 });
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");

  const items = tab === "gainers" ? data?.gainers.slice(0, 8) : data?.losers.slice(0, 8);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setTab("gainers")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${tab === "gainers" ? "bg-gain/15 text-gain shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowUp className="h-3 w-3 inline mr-1" />Gainers
            </button>
            <button
              onClick={() => setTab("losers")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${tab === "losers" ? "bg-loss/15 text-loss shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowDown className="h-3 w-3 inline mr-1" />Losers
            </button>
          </div>
          <h2 className="font-semibold text-sm text-foreground">Market Movers</h2>
        </div>
        <Link href="/movers" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card p-3">
                <div className="h-4 w-12 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))
          : items?.map((stock) => (
              <Link
                key={stock.symbol}
                href={`/stocks/${stock.symbol}`}
                className="bg-card p-3 hover:bg-accent/40 transition-colors group"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-sm text-primary group-hover:underline">{stock.symbol}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mb-1">{stock.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">${stock.price.toFixed(2)}</span>
                  <span className={`text-xs font-bold ${tab === "gainers" ? "text-gain" : "text-loss"}`}>
                    {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}

/* ─── NEWS & SENTIMENT ─── */
function formatTimeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NewsSentimentBlock() {
  const { data: dbNews, isLoading } = trpc.news.list.useQuery({ pageSize: 12 });

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Latest News & Blogs</h2>
        </div>
        <Link href="/news" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Full feed <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border/40">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-2.5">
                <div className="h-4 w-full bg-muted rounded animate-pulse mb-1.5" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))
          : dbNews?.articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-5 py-2.5 hover:bg-accent/30 transition-colors group"
              >
                <span className="text-[10px] text-muted-foreground/70 shrink-0 w-8 pt-0.5 font-medium">{formatTimeAgo(article.publishedAt)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">{article.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {article.articleType === "blog" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold">BLOG</span>
                    )}
                    {article.sentiment === "bullish" && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {article.sentiment === "bearish" && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400">
                        <TrendingDown className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60">{article.source}</span>
                    {article.tickers && (
                      <div className="flex gap-0.5">
                        {article.tickers.split(",").filter(t => !t.trim().startsWith("^")).slice(0, 2).map((s) => (
                          <span
                            key={s}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/stocks/${s.trim()}`; }}
                            className="text-[9px] px-1 py-0.5 bg-primary/8 text-primary rounded font-medium hover:bg-primary/15 cursor-pointer"
                          >
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
      </div>
    </div>
  );
}

/* ─── TRENDING TICKERS ─── */
function TrendingTickers() {
  const { data: sentiment } = trpc.news.sentimentDashboard.useQuery({ period: "today" }, { staleTime: 60000 });

  const topTickers = useMemo(() => {
    if (!sentiment?.byTicker) return [];
    return [...sentiment.byTicker]
      .filter(t => !t.ticker.startsWith("^"))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [sentiment]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h2 className="font-semibold text-sm text-foreground">Trending Today</h2>
        </div>
        <Link href="/trending" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          More <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-3 space-y-1">
        {topTickers.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
            ))
          : topTickers.map((t, i) => {
              const sentimentPct = Math.round((t.bullish / Math.max(t.total, 1)) * 100);
              return (
                <Link
                  key={t.ticker}
                  href={`/stocks/${t.ticker}`}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-accent/40 transition-colors group"
                >
                  <span className="text-[10px] text-muted-foreground/50 font-bold w-4">{i + 1}</span>
                  <span className="font-bold text-sm text-primary group-hover:underline min-w-[48px]">{t.ticker}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${sentimentPct}%`,
                        backgroundColor: sentimentPct > 60 ? "oklch(0.72 0.19 142)" : sentimentPct < 40 ? "oklch(0.7 0.2 25)" : "oklch(0.6 0.01 260)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{t.total} mentions</span>
                </Link>
              );
            })}
      </div>
    </div>
  );
}

/* ─── SENTIMENT PULSE ─── */
function SentimentPulse() {
  const { data: sentiment } = trpc.news.sentimentDashboard.useQuery({ period: "week" }, { staleTime: 60000 });

  if (!sentiment) return null;

  const { bullish, bearish, neutral } = sentiment.bySentiment;
  const total = bullish + bearish + neutral;
  const bullPct = Math.round((bullish / Math.max(total, 1)) * 100);
  const bearPct = Math.round((bearish / Math.max(total, 1)) * 100);
  const neutPct = 100 - bullPct - bearPct;

  // Top bullish and bearish tickers
  const topBull = [...(sentiment.byTicker || [])].filter(t => !t.ticker.startsWith("^")).sort((a, b) => b.bullish - a.bullish).slice(0, 3);
  const topBear = [...(sentiment.byTicker || [])].filter(t => !t.ticker.startsWith("^")).sort((a, b) => b.bearish - a.bearish).slice(0, 3);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Sentiment Pulse</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">7 days · {total} articles</span>
      </div>
      <div className="p-4 space-y-3">
        {/* Mini donut chart + labels */}
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 36 36" className="w-16 h-16 shrink-0">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-secondary" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
              strokeDasharray={`${bullPct} ${100 - bullPct}`} strokeDashoffset="25" strokeLinecap="round" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.5"
              strokeDasharray={`${bearPct} ${100 - bearPct}`} strokeDashoffset={`${25 - bullPct}`} strokeLinecap="round" />
            <text x="18" y="17" textAnchor="middle" className="fill-foreground" style={{ fontSize: '6px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{bullPct}%</text>
            <text x="18" y="23" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '3.5px' }}>bullish</text>
          </svg>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-foreground font-medium">{bullPct}% Bullish</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{bullish}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-[11px] text-foreground font-medium">{neutPct}% Neutral</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{neutral}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-foreground font-medium">{bearPct}% Bearish</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{bearish}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Most Bullish</p>
            {topBull.map(t => (
              <Link key={t.ticker} href={`/stocks/${t.ticker}`} className="flex items-center gap-1 text-[11px] py-0.5 hover:text-primary">
                <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                <span className="font-semibold">{t.ticker}</span>
              </Link>
            ))}
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Most Bearish</p>
            {topBear.map(t => (
              <Link key={t.ticker} href={`/stocks/${t.ticker}`} className="flex items-center gap-1 text-[11px] py-0.5 hover:text-primary">
                <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                <span className="font-semibold">{t.ticker}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CALENDAR PREVIEW ─── */
function CalendarPreview() {
  const today = new Date().toISOString().split("T")[0];
  const { data: earnings } = trpc.calendar.earnings.useQuery({ date: today }, { staleTime: 300000 });
  const { data: econ } = trpc.calendar.economicEvents.useQuery({ date: today }, { staleTime: 300000 });

  const earningsList = (earnings || []).slice(0, 4);
  const econList = (econ || []).slice(0, 3);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-sm text-foreground">Today's Calendar</h2>
        </div>
        <Link href="/calendar/earnings" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Full <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-3 space-y-2">
        {earningsList.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 px-1">Earnings</p>
            {earningsList.map((e: any, i: number) => (
              <Link
                key={i}
                href={`/stocks/${e.symbol}`}
                className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{e.symbol}</span>
                  <span className="text-muted-foreground truncate max-w-[100px]">{e.companyName}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{e.time === "time-pre-market" ? "Pre-mkt" : e.time === "time-after-hours" ? "After-hrs" : e.time}</span>
              </Link>
            ))}
          </div>
        )}
        {econList.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 px-1">Economic Events</p>
            {econList.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 text-xs">
                <span className="text-muted-foreground/60 shrink-0">{e.country}</span>
                <span className="text-foreground truncate">{e.eventName}</span>
              </div>
            ))}
          </div>
        )}
        {earningsList.length === 0 && econList.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No events scheduled today</p>
        )}
      </div>
    </div>
  );
}

/* ─── SOVEREIGN BONDS SPOTLIGHT ─── */
function SovereignBondsSpotlight() {
  const { data: summary } = trpc.sovereign.summary.useQuery(undefined, { staleTime: 300000 });
  const { data: bonds } = trpc.sovereign.list.useQuery({}, { staleTime: 300000 });

  const featured = useMemo(() => {
    if (!bonds) return [];
    // Show bonds with highest yields from different countries
    const seen = new Set<string>();
    return bonds
      .filter(b => b.yieldToMaturity && b.country)
      .sort((a, b) => (b.yieldToMaturity || 0) - (a.yieldToMaturity || 0))
      .filter(b => {
        if (seen.has(b.country!)) return false;
        seen.add(b.country!);
        return true;
      })
      .slice(0, 6);
  }, [bonds]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <h2 className="font-semibold text-sm text-foreground">Sovereign Bonds Spotlight</h2>
          {summary && (
            <span className="text-[10px] text-muted-foreground ml-1">{summary.totalBonds} bonds · {summary.uniqueCountries} countries</span>
          )}
        </div>
        <Link href="/fixed-income/sovereign" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Explorer <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/30">
        {featured.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card p-3">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                <div className="h-6 w-14 bg-muted rounded animate-pulse" />
              </div>
            ))
          : featured.map((bond) => (
              <Link
                key={bond.slug}
                href={`/fixed-income/sovereign/${bond.slug}`}
                className="bg-card p-3 hover:bg-accent/30 transition-colors group"
              >
                <p className="text-[10px] text-muted-foreground font-medium truncate">{bond.country}</p>
                <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{bond.yieldToMaturity?.toFixed(2)}%</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-muted-foreground/70">YTM</span>
                  {bond.compositeRating && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-semibold">{bond.compositeRating}</span>
                  )}
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}

/* ─── MACRO SNAPSHOT ─── */
function MacroSnapshot() {
  const { data: countries } = trpc.sovereign.countries.useQuery(undefined, { staleTime: 300000 });

  const topCountries = useMemo(() => {
    if (!countries) return [];
    return countries
      .filter(c => c.realGDPGrowth !== null && c.realGDPGrowth !== undefined)
      .sort((a, b) => (b.bondCount || 0) - (a.bondCount || 0))
      .slice(0, 8);
  }, [countries]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-500" />
          <h2 className="font-semibold text-sm text-foreground">Macroeconomics Snapshot</h2>
        </div>
        <Link href="/macro" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          All countries <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-muted-foreground border-b border-border/60 uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-semibold">Country</th>
              <th className="text-right px-3 py-2 font-semibold">GDP %</th>
              <th className="text-right px-3 py-2 font-semibold">Inflation</th>
              <th className="text-right px-3 py-2 font-semibold">Debt/GDP</th>
              <th className="text-right px-3 py-2 font-semibold">Rating</th>
            </tr>
          </thead>
          <tbody>
            {topCountries.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-4 py-2"><div className="h-3 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              : topCountries.map((c) => (
                  <tr key={c.country} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2">
                      <Link href={`/macro/country/${encodeURIComponent(c.country)}`} className="font-semibold text-primary hover:underline">
                        {c.country}
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${(c.realGDPGrowth || 0) >= 0 ? "text-gain" : "text-loss"}`}>
                      {c.realGDPGrowth != null ? `${c.realGDPGrowth.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {c.inflation != null ? `${c.inflation.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {c.publicDebtGDP2025 != null ? `${c.publicDebtGDP2025.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {c.compositeRating ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{c.compositeRating}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── IPO CORNER ─── */
function IPOCorner() {
  const { data, isLoading } = trpc.market.ipos.useQuery();

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <h2 className="font-semibold text-sm text-foreground">IPO Corner</h2>
        </div>
        <Link href="/ipos" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-1">Recent</p>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 bg-muted/50 rounded animate-pulse" />)
          : data?.recent.slice(0, 4).map((ipo, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 transition-colors text-xs">
                <span className="font-bold text-primary min-w-[40px]">{ipo.symbol}</span>
                <span className="text-foreground truncate flex-1">{ipo.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{ipo.date}</span>
              </div>
            ))}
        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-1 pt-1">Upcoming</p>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={`u${i}`} className="h-6 bg-muted/50 rounded animate-pulse" />)
          : data?.upcoming.slice(0, 4).map((ipo, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 transition-colors text-xs">
                <span className="font-bold text-primary min-w-[40px]">{ipo.symbol}</span>
                <span className="text-foreground truncate flex-1">{ipo.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{ipo.date}</span>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ─── CORPORATE BONDS HIGHLIGHT ─── */
function CorporateBondsHighlight() {
  const { data: summary } = trpc.bonds.summary.useQuery(undefined, { staleTime: 300000 });
  const { data: bonds } = trpc.bonds.list.useQuery({}, { staleTime: 300000 });

  const topIssuers = useMemo(() => {
    if (!bonds) return [];
    // Group by issuer, pick top by bond count
    const issuerMap = new Map<string, { name: string; slug: string; count: number; rating: string }>();
    bonds.forEach(b => {
      const existing = issuerMap.get(b.issuerSlug);
      if (existing) {
        existing.count++;
      } else {
        issuerMap.set(b.issuerSlug, { name: b.issuerName, slug: b.issuerSlug, count: 1, rating: b.rating || "" });
      }
    });
    return Array.from(issuerMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [bonds]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-violet-500" />
          <h2 className="font-semibold text-sm text-foreground">Corporate Bonds</h2>
        </div>
        <Link href="/fixed-income/corporate" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-3 space-y-1">
        {summary && (
          <div className="flex items-center gap-3 px-2 py-1 mb-1">
            <span className="text-[10px] text-muted-foreground">{summary.totalIssuers} issuers · {summary.totalBonds} bonds</span>
          </div>
        )}
        {topIssuers.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 bg-muted/50 rounded animate-pulse" />)
          : topIssuers.map((issuer) => (
              <Link
                key={issuer.slug}
                href={`/fixed-income/corporate/${issuer.slug}`}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/30 transition-colors text-xs group"
              >
                <span className="font-semibold text-foreground group-hover:text-primary truncate">{issuer.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {issuer.rating && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-semibold">{issuer.rating}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{issuer.count} bonds</span>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}

/* ─── QUICK TOOLS ─── */
function QuickToolsGrid() {
  const tools = [
    { icon: Filter, label: "Stock Screener", desc: "Filter by metrics", path: "/screener", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Star, label: "Watchlist", desc: "Track favorites", path: "/watchlist", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: ArrowUpDown, label: "Market Movers", desc: "Gainers & losers", path: "/movers", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Layers, label: "ETFs", desc: "Fund explorer", path: "/etfs", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: TrendingUp, label: "Trending", desc: "Hot tickers", path: "/trending", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Globe, label: "Macro Map", desc: "World indicators", path: "/macro", color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { icon: Activity, label: "Options Flow", desc: "Unusual activity", path: "/options/flow", color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: PieChart, label: "Options Chain", desc: "Calls & puts", path: "/options/chain", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Quick Tools</h2>
        </div>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <Link
            key={tool.path}
            href={tool.path}
            className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/40 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className={`w-8 h-8 rounded-lg ${tool.bg} flex items-center justify-center shrink-0`}>
              <tool.icon className={`h-4 w-4 ${tool.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
              <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── OPTIONS HUB ─── */
function OptionsHubBlock() {
  const { data: mostActive } = trpc.options.mostActive.useQuery(undefined, { staleTime: 120000 });

  const stats = useMemo(() => {
    if (!mostActive || mostActive.length === 0) return null;
    let totalVol = 0, bullishCount = 0, bearishCount = 0, highIVCount = 0;
    let topByVol = mostActive[0];
    let topByIV = mostActive[0];

    mostActive.forEach((d: any) => {
      const vol = parseInt(d.optionsTotalVolume?.replace(/,/g, "") || "0");
      totalVol += vol;
      const callPct = parseFloat(d.optionsCallVolumePercent) || 0;
      const putPct = parseFloat(d.optionsPutVolumePercent) || 0;
      if (callPct > putPct) bullishCount++; else bearishCount++;
      const ivRank = parseFloat(d.optionsImpliedVolatilityRank1y) || 0;
      if (ivRank > 50) highIVCount++;
      if (vol > parseInt(topByVol.optionsTotalVolume?.replace(/,/g, "") || "0")) topByVol = d;
      if (ivRank > (parseFloat(topByIV.optionsImpliedVolatilityRank1y) || 0)) topByIV = d;
    });

    return { totalVol, bullishCount, bearishCount, highIVCount, total: mostActive.length, topByVol, topByIV };
  }, [mostActive]);

  const topItems = useMemo(() => {
    if (!mostActive) return [];
    return mostActive.slice(0, 6);
  }, [mostActive]);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 section-glow animate-fade-in-up-delay-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-rose-500" />
          <h2 className="font-semibold text-sm text-foreground">Options Activity</h2>
        </div>
        <Link href="/options/flow" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-4">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Active Symbols</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{(stats.totalVol / 1000000).toFixed(1)}M</p>
              <p className="text-[10px] text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-gain" style={{ fontFamily: 'var(--font-display)' }}>{stats.bullishCount}</p>
              <p className="text-[10px] text-muted-foreground">Bullish Bias</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums text-amber-500" style={{ fontFamily: 'var(--font-display)' }}>{stats.highIVCount}</p>
              <p className="text-[10px] text-muted-foreground">High IV Rank</p>
            </div>
          </div>
        )}

        {/* Top Active Table */}
        {topItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-1.5 font-medium">Symbol</th>
                  <th className="text-right py-1.5 font-medium">Volume</th>
                  <th className="text-right py-1.5 font-medium">P/C Ratio</th>
                  <th className="text-right py-1.5 font-medium">IV Rank</th>
                  <th className="text-center py-1.5 font-medium">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item: any) => {
                  const callPct = parseFloat(item.optionsCallVolumePercent) || 0;
                  const putPct = parseFloat(item.optionsPutVolumePercent) || 0;
                  const isBullish = callPct > putPct;
                  const ivRank = parseFloat(item.optionsImpliedVolatilityRank1y) || 0;

                  return (
                    <tr key={item.symbol} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-1.5">
                        <Link href={`/options/chain?symbol=${item.symbol}`}>
                          <span className="font-bold text-primary hover:underline cursor-pointer">{item.symbol}</span>
                        </Link>
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-medium">{item.optionsTotalVolume}</td>
                      <td className="py-1.5 text-right tabular-nums">{parseFloat(item.optionsPutCallVolumeRatio || "0").toFixed(2)}</td>
                      <td className="py-1.5 text-right">
                        <span className={`tabular-nums ${ivRank > 70 ? "text-loss font-semibold" : ivRank > 40 ? "text-amber-500" : "text-gain"}`}>
                          {ivRank.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                          isBullish ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                        }`}>
                          {isBullish ? "Bull" : "Bear"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <Link href="/options/chain" className="text-[10px] text-primary hover:underline">Options Chain</Link>
          <span className="text-muted-foreground/30">·</span>
          <Link href="/options/strategy" className="text-[10px] text-primary hover:underline">Strategy Builder</Link>
          <span className="text-muted-foreground/30">·</span>
          <Link href="/options/tools" className="text-[10px] text-primary hover:underline">Greeks Calculator</Link>
        </div>
      </div>
    </div>
  );
}

/* ─── EXTERNAL RESEARCH BLOCK ─── */
function ExternalResearchBlock() {
  const { data, isLoading } = trpc.externalResearch.list.useQuery(
    { limit: 6, randomize: true },
    { staleTime: 5 * 60 * 1000 }
  );
  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">External Research</h3>
            <p className="text-[10px] text-muted-foreground">From top investment banks & asset managers</p>
          </div>
        </div>
        <Link href="/news" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          View all {total > 0 && `(${total})`} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No research reports yet. Check back after the daily update.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="block p-2.5 rounded-lg hover:bg-accent/30 transition-colors group">
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-9 h-9 rounded object-cover shrink-0 bg-muted mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.sentiment && (
                      <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${
                        item.sentiment === "bullish" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                        item.sentiment === "bearish" ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                        "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                      }`}>
                        {item.sentiment === "bullish" ? "▲" : item.sentiment === "bearish" ? "▼" : "—"} {item.sentiment}
                      </span>
                    )}
                    {item.firm && (
                      <span className="text-[10px] text-muted-foreground">{item.firm}</span>
                    )}
                    {item.tickers && (
                      <div className="flex gap-0.5">
                        {item.tickers.split(",").slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary rounded font-medium">
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
    </div>
  );
}

/* ─── PODCASTS BLOCK ─── */
function PodcastsBlock() {
  const { data, isLoading } = trpc.externalPodcasts.list.useQuery(
    { limit: 6, randomize: true },
    { staleTime: 5 * 60 * 1000 }
  );
  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Headphones className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Curated Podcasts</h3>
            <p className="text-[10px] text-muted-foreground">Finance & investing voices you should hear</p>
          </div>
        </div>
        <Link href="/news" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          View all {total > 0 && `(${total})`} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <Headphones className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No podcasts yet. Check back after the daily update.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="block p-2.5 rounded-lg hover:bg-accent/30 transition-colors group">
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.duration && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />{item.duration}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{item.category}</span>
                    )}
                    {item.tickers && (
                      <div className="flex gap-0.5">
                        {item.tickers.split(",").slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary rounded font-medium">
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
    </div>
  );
}
