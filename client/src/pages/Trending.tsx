import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { TrendingUp } from "lucide-react";

export default function Trending() {
  const { data, isLoading } = trpc.market.movers.useQuery(undefined, { refetchInterval: 60000 });

  // Combine gainers and losers, sort by absolute change percent
  const trending = [...(data?.gainers || []), ...(data?.losers || [])]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 30);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Trending Stocks</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Stocks with the largest price movements today, ranked by absolute percentage change.
        </p>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium w-8">#</th>
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-right px-4 py-2.5 font-medium">Price</th>
                  <th className="text-right px-4 py-2.5 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  trending.map((stock, i) => (
                    <tr key={stock.symbol} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/stocks/${stock.symbol}`} className="font-semibold text-primary hover:underline">
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{stock.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">${stock.price.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${stock.changePercent >= 0 ? "text-gain" : "text-loss"}`}>
                        {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
