import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Newspaper } from "lucide-react";
import MarketTickerBar from "@/components/MarketTickerBar";

export default function News() {
  const { data: news, isLoading } = trpc.market.news.useQuery();

  return (
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Market News</h1>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border/50">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-5 w-full bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))
          ) : (
            news?.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                <h3 className="text-sm font-medium text-foreground leading-snug mb-1.5">
                  {item.title}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">{item.source}</span>
                  <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                  {item.relatedSymbols && item.relatedSymbols.length > 0 && (
                    <div className="flex gap-1">
                      {item.relatedSymbols.map((s) => (
                        <Link
                          key={s}
                          href={`/stocks/${s}`}
                          className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium hover:bg-primary/20"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
