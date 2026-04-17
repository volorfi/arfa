import { trpc } from "@/lib/trpc";
import GlobalSearch from "@/components/GlobalSearch";
import { Link } from "wouter";
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
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <QuickLinks />
      <div className="max-w-[1300px] mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GainersTable />
          <LosersTable />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NewsSection />
          </div>
          <div className="space-y-6">
            <RecentIPOs />
            <UpcomingIPOs />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const { data: trendingTickers } = trpc.trendingTickers.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });
  const fallbackTrending = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"];
  const trending = trendingTickers && trendingTickers.length > 0 ? trendingTickers : fallbackTrending;

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto text-center space-y-5">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Search for a stock to start your analysis
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          Your professional platform for global markets analysis. Track stocks, bonds, commodities, and currencies with real-time data, financial reports, and expert insights.
        </p>
        <GlobalSearch large className="max-w-lg mx-auto" />
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Trending:</span>
          {trending.map((s) => (
            <Link key={s} href={`/stocks/${s}`} className="text-primary hover:underline font-medium">
              {s}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
    { icon: Star, label: "Watchlist", path: "/watchlist" },
    { icon: Filter, label: "Stock Screener", path: "/screener" },
    { icon: ArrowUpDown, label: "Market Movers", path: "/movers" },
    { icon: Layers, label: "ETFs", path: "/etfs" },
    { icon: TrendingUp, label: "Trending", path: "/trending" },
  ];

  return (
    <div className="max-w-[1300px] mx-auto px-4 mb-8">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {links.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors shrink-0 text-sm"
          >
            <link.icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GainersTable() {
  const { data, isLoading } = trpc.market.movers.useQuery(undefined, { refetchInterval: 120000 });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ArrowUp className="h-4 w-4 text-gain" />
          <h2 className="font-semibold text-sm text-foreground">Top Gainers</h2>
        </div>
        <Link href="/movers?tab=gainers" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2 font-medium">Symbol</th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-right px-4 py-2 font-medium">Price</th>
              <th className="text-right px-4 py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : (
              data?.gainers.slice(0, 10).map((stock) => (
                <tr key={stock.symbol} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2">
                    <Link href={`/stocks/${stock.symbol}`} className="font-semibold text-primary hover:underline">
                      {stock.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-foreground truncate max-w-[150px]">{stock.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-foreground">${stock.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gain">
                    +{stock.changePercent.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LosersTable() {
  const { data, isLoading } = trpc.market.movers.useQuery(undefined, { refetchInterval: 120000 });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ArrowDown className="h-4 w-4 text-loss" />
          <h2 className="font-semibold text-sm text-foreground">Top Losers</h2>
        </div>
        <Link href="/movers?tab=losers" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2 font-medium">Symbol</th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-right px-4 py-2 font-medium">Price</th>
              <th className="text-right px-4 py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : (
              data?.losers.slice(0, 10).map((stock) => (
                <tr key={stock.symbol} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2">
                    <Link href={`/stocks/${stock.symbol}`} className="font-semibold text-primary hover:underline">
                      {stock.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-foreground truncate max-w-[150px]">{stock.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-foreground">${stock.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium text-loss">
                    {stock.changePercent.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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

function NewsSection() {
  const { data: dbNews, isLoading: dbLoading } = trpc.news.list.useQuery({ pageSize: 15 });
  const { data: fallbackNews, isLoading: fallbackLoading } = trpc.market.news.useQuery();

  // Use DB news if available, otherwise fall back to static news
  const hasDbNews = dbNews && dbNews.articles.length > 0;
  const isLoading = dbLoading && fallbackLoading;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground">Market News</h2>
        </div>
        <Link href="/news" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <div className="divide-y divide-border/50">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : hasDbNews ? (
          dbNews.articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2.5 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="text-[11px] text-muted-foreground shrink-0 w-12 pt-0.5">{formatTimeAgo(article.publishedAt)}</span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{article.title}</p>
                   <div className="flex items-center gap-2 mt-1">
                     {article.sentiment === "bullish" && (
                       <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                         <TrendingUp className="h-2.5 w-2.5" />Bullish
                       </span>
                     )}
                     {article.sentiment === "bearish" && (
                       <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded border bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20">
                         <TrendingDown className="h-2.5 w-2.5" />Bearish
                       </span>
                     )}
                     {article.sentiment === "neutral" && (
                       <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded border bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20">
                         <Minus className="h-2.5 w-2.5" />Neutral
                       </span>
                     )}
                     <span className="text-[11px] text-muted-foreground">{article.source}</span>
                     {article.tickers && (
                      <div className="flex gap-1">
                        {article.tickers.split(",").slice(0, 3).map((s) => (
                          <span
                            key={s}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/stocks/${s}`;
                            }}
                            className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20 cursor-pointer"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))
        ) : (
          fallbackNews?.slice(0, 15).map((item, i) => (
            <div key={i} className="px-4 py-2.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-[11px] text-muted-foreground shrink-0 w-10 pt-0.5">{item.timestamp}</span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{item.source}</span>
                    {item.relatedSymbols && item.relatedSymbols.length > 0 && (
                      <div className="flex gap-1">
                        {item.relatedSymbols.slice(0, 3).map((s) => (
                          <Link key={s} href={`/stocks/${s}`} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20">
                            {s}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecentIPOs() {
  const { data, isLoading } = trpc.market.ipos.useQuery();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground">Recent IPOs</h2>
        </div>
        <Link href="/ipos?tab=recent" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left px-4 py-2 font-medium">Date</th>
            <th className="text-left px-4 py-2 font-medium">Symbol</th>
            <th className="text-left px-4 py-2 font-medium">Name</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2"><div className="h-3 w-14 bg-muted rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-28 bg-muted rounded animate-pulse" /></td>
              </tr>
            ))
          ) : (
            data?.recent.slice(0, 8).map((ipo, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2 text-xs text-muted-foreground">{ipo.date}</td>
                <td className="px-4 py-2 font-semibold text-primary text-xs">{ipo.symbol}</td>
                <td className="px-4 py-2 text-xs text-foreground truncate max-w-[160px]">{ipo.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function UpcomingIPOs() {
  const { data, isLoading } = trpc.market.ipos.useQuery();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground">Upcoming IPOs</h2>
        </div>
        <Link href="/ipos?tab=upcoming" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left px-4 py-2 font-medium">Date</th>
            <th className="text-left px-4 py-2 font-medium">Symbol</th>
            <th className="text-left px-4 py-2 font-medium">Name</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-2"><div className="h-3 w-14 bg-muted rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-10 bg-muted rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-28 bg-muted rounded animate-pulse" /></td>
              </tr>
            ))
          ) : (
            data?.upcoming.slice(0, 8).map((ipo, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2 text-xs text-muted-foreground">{ipo.date}</td>
                <td className="px-4 py-2 font-semibold text-primary text-xs">{ipo.symbol}</td>
                <td className="px-4 py-2 text-xs text-foreground truncate max-w-[160px]">{ipo.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
