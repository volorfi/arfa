import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function MarketMovers() {
  const { data, isLoading } = trpc.market.movers.useQuery(undefined, { refetchInterval: 60000 });
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");

  const movers = tab === "gainers" ? data?.gainers : data?.losers;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Market Movers</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab("gainers")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "gainers" ? "bg-gain/10 text-gain" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <ArrowUp className="h-4 w-4" />
            Top Gainers
          </button>
          <button
            onClick={() => setTab("losers")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "losers" ? "bg-loss/10 text-loss" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <ArrowDown className="h-4 w-4" />
            Top Losers
          </button>
        </div>

        {/* Table */}
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
                  <th className="text-right px-4 py-2.5 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  movers?.map((stock, i) => (
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
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {stock.volume ? (stock.volume >= 1e6 ? `${(stock.volume / 1e6).toFixed(1)}M` : stock.volume.toLocaleString()) : "N/A"}
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
