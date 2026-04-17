import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Globe, Landmark, Building2, Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  large?: boolean;
}

export default function GlobalSearch({ className = "", placeholder = "Search stocks, bonds, countries, ISIN, news...", large = false }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query to avoid excessive API calls
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = trpc.universalSearch.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1 }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = (path: string) => {
    setQuery("");
    setIsOpen(false);
    setLocation(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Default: navigate to stock page
      handleNavigate(`/stocks/${query.trim().toUpperCase()}`);
    }
  };

  const hasResults = results && (
    results.stocks.length > 0 ||
    results.sovereignBonds.length > 0 ||
    results.corporateBonds.length > 0 ||
    results.countries.length > 0 ||
    results.news.length > 0
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center ${large ? "h-12" : "h-9"}`}>
          <Search className={`absolute left-3 text-muted-foreground ${large ? "h-5 w-5" : "h-4 w-4"}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${large ? "pl-11 pr-10 h-12 text-base" : "pl-9 pr-8 h-9 text-sm"}`}
          />
          {!large && (
            <kbd className="absolute right-2.5 pointer-events-none text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              /
            </kbd>
          )}
        </div>
      </form>

      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {/* Stocks */}
          {results!.stocks.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> Stocks
              </div>
              {results!.stocks.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => handleNavigate(`/stocks/${item.symbol}`)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-primary min-w-[60px]">{item.symbol}</span>
                  <span className="text-sm text-foreground truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{item.exchange}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sovereign Bonds */}
          {results!.sovereignBonds.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Sovereign Bonds
              </div>
              {results!.sovereignBonds.map((bond) => (
                <button
                  key={bond.slug}
                  onClick={() => handleNavigate(`/fixed-income/sovereign/${bond.slug}`)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-primary min-w-[60px] truncate max-w-[180px]">{bond.ticker}</span>
                  <span className="text-xs text-muted-foreground">{bond.country}</span>
                  {bond.isin && <span className="text-[10px] text-muted-foreground/70 font-mono">{bond.isin}</span>}
                  {bond.rating && <span className="text-xs text-muted-foreground ml-auto shrink-0">{bond.rating}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Corporate Bonds */}
          {results!.corporateBonds.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Corporate Bonds
              </div>
              {results!.corporateBonds.map((bond) => (
                <button
                  key={bond.ticker + bond.isin}
                  onClick={() => handleNavigate(`/fixed-income/corporate/${bond.issuerSlug}`)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-primary min-w-[60px] truncate max-w-[180px]">{bond.ticker}</span>
                  <span className="text-sm text-foreground truncate">{bond.issuerName}</span>
                  {bond.rating && <span className="text-xs text-muted-foreground ml-auto shrink-0">{bond.rating}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Countries */}
          {results!.countries.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                <Landmark className="h-3 w-3" /> Countries & Macro
              </div>
              {results!.countries.map((c) => (
                <button
                  key={c.country}
                  onClick={() => handleNavigate(`/macro/country/${encodeURIComponent(c.country)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-primary">{c.country}</span>
                  <span className="text-xs text-muted-foreground">{c.region}</span>
                  {c.rating && <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.rating}</span>}
                  <span className="text-[10px] text-muted-foreground">{c.bondCount} bonds</span>
                </button>
              ))}
            </div>
          )}

          {/* News */}
          {results!.news.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                <Newspaper className="h-3 w-3" /> News
              </div>
              {results!.news.map((article) => (
                <button
                  key={article.id}
                  onClick={() => {
                    // If article has tickers, navigate to first ticker's stock page
                    if (article.tickers) {
                      const firstTicker = article.tickers.split(",")[0].trim();
                      if (firstTicker && !firstTicker.startsWith("^")) {
                        handleNavigate(`/stocks/${firstTicker}`);
                        return;
                      }
                    }
                    // Otherwise go to news page with search
                    handleNavigate(`/news`);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-2 hover:bg-accent transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-clamp-1">{article.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{article.source}</span>
                      {article.sentiment === "bullish" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-2.5 w-2.5" />Bullish
                        </span>
                      )}
                      {article.sentiment === "bearish" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400">
                          <TrendingDown className="h-2.5 w-2.5" />Bearish
                        </span>
                      )}
                      {article.tickers && (
                        <div className="flex gap-1">
                          {article.tickers.split(",").filter(t => !t.trim().startsWith("^")).slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary rounded font-medium">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
