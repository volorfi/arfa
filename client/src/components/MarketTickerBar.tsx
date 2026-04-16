import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Fallback static data when API is unavailable
const FALLBACK_INDICES = [
  { symbol: "^GSPC", name: "S&P 500", price: 0, change: 0, changePercent: 0, chartData: [] },
  { symbol: "^NDX", name: "Nasdaq 100", price: 0, change: 0, changePercent: 0, chartData: [] },
  { symbol: "^DJI", name: "Dow Jones", price: 0, change: 0, changePercent: 0, chartData: [] },
  { symbol: "^RUT", name: "Russell 2000", price: 0, change: 0, changePercent: 0, chartData: [] },
];

export default function MarketTickerBar() {
  const { data: indices, isLoading } = trpc.market.indices.useQuery(undefined, {
    refetchInterval: 60000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="h-10 border-b border-border bg-card/50 flex items-center px-4 gap-6 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const displayIndices = indices && indices.length > 0 ? indices : FALLBACK_INDICES;
  const isLive = indices && indices.length > 0 && indices[0].price > 0;

  return (
    <div className="h-10 border-b border-border bg-card/50 flex items-center px-4 gap-1 overflow-x-auto text-xs">
      <span className="text-muted-foreground mr-2 shrink-0 text-[11px]">Stock Indexes</span>
      {displayIndices.map((idx) => {
        const isPositive = idx.changePercent > 0;
        const isNegative = idx.changePercent < 0;
        return (
          <div
            key={idx.symbol}
            className="flex items-center gap-1.5 px-3 py-1 shrink-0"
          >
            <span className="font-medium text-foreground text-[12px]">{idx.name}</span>
            {isLive ? (
              <>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-gain" />
                ) : isNegative ? (
                  <TrendingDown className="h-3 w-3 text-loss" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={`font-medium text-[12px] ${isPositive ? "text-gain" : isNegative ? "text-loss" : "text-muted-foreground"}`}>
                  {isPositive ? "+" : ""}{idx.changePercent.toFixed(2)}%
                </span>
                {idx.chartData.length > 2 && (
                  <MiniChart data={idx.chartData} isPositive={isPositive} />
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-[11px]">--</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniChart({ data, isPositive }: { data: { time: number; value: number }[]; isPositive: boolean }) {
  const width = 48;
  const height = 18;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="ml-1">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "oklch(0.72 0.19 142)" : "oklch(0.7 0.2 25)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
