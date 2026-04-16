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
} from "lucide-react";
import MarketTickerBar from "@/components/MarketTickerBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 30;

type SentimentType = "bullish" | "bearish" | "neutral" | null;

const SENTIMENT_CONFIG = {
  bullish: {
    label: "Bullish",
    icon: TrendingUp,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  bearish: {
    label: "Bearish",
    icon: TrendingDown,
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
} as const;

function SentimentBadge({ sentiment }: { sentiment: SentimentType }) {
  if (!sentiment || !SENTIMENT_CONFIG[sentiment]) return null;
  const config = SENTIMENT_CONFIG[sentiment];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

export default function News() {
  const [source, setSource] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [sentiment, setSentiment] = useState<string>("");
  const [ticker, setTicker] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);

  const queryInput = useMemo(
    () => ({
      source: source || undefined,
      category: category || undefined,
      sentiment: (sentiment || undefined) as "bullish" | "bearish" | "neutral" | undefined,
      ticker: ticker || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [source, category, sentiment, ticker, search, dateFrom, dateTo, page]
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
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <Newspaper className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Market News</h1>
          <span className="text-xs text-muted-foreground ml-2">
            {total > 0 && `${total.toLocaleString()} articles`}
          </span>
        </div>

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
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(sentimentStats.bullish / sentimentStats.total) * 100}%` }}
                  />
                )}
                {sentimentStats.neutral > 0 && (
                  <div
                    className="bg-slate-400 transition-all"
                    style={{ width: `${(sentimentStats.neutral / sentimentStats.total) * 100}%` }}
                  />
                )}
                {sentimentStats.bearish > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(sentimentStats.bearish / sentimentStats.total) * 100}%` }}
                  />
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
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Button size="sm" onClick={handleSearch} className="h-9 px-4">
                  Search
                </Button>
              </div>
            </div>

            {/* Source filter */}
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

            {/* Category filter */}
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sentiment filter */}
            <Select
              value={sentiment}
              onValueChange={(v) => {
                setSentiment(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="bullish">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    Bullish
                  </span>
                </SelectItem>
                <SelectItem value="bearish">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    Bearish
                  </span>
                </SelectItem>
                <SelectItem value="neutral">
                  <span className="flex items-center gap-1.5">
                    <Minus className="h-3 w-3 text-slate-500" />
                    Neutral
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Ticker filter */}
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Ticker (e.g. AAPL)"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase());
                  setPage(1);
                }}
                className="pl-8 h-9 text-sm"
              />
            </div>

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
                placeholder="From date"
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
                placeholder="To date"
              />
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
                  : "No news articles yet. Articles will appear after the next scheduled scrape."}
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
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <SentimentBadge sentiment={article.sentiment as SentimentType} />
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
                        {article.tickers && (
                          <div className="flex gap-1">
                            {article.tickers.split(",").slice(0, 5).map((t) => (
                              <span
                                key={t}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = `/stocks/${t}`;
                                }}
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
    </div>
  );
}
