import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

function generateFallbackChart(base: number, volatility: number, positive: boolean): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = [];
  let val = base - (positive ? volatility * 0.5 : -volatility * 0.3);
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    val += (Math.random() - (positive ? 0.35 : 0.65)) * volatility * 0.15;
    points.push({ time: now - (20 - i) * 300000, value: val });
  }
  points[points.length - 1].value = base;
  return points;
}

const FALLBACK_INDICES = [
  { symbol: "^GSPC", name: "S&P 500", price: 5282, change: 42.3, changePercent: 0.81, chartData: generateFallbackChart(5282, 30, true), assetType: "index", displayValue: "5,282" },
  { symbol: "^NDX", name: "Nasdaq 100", price: 18345, change: 256.1, changePercent: 1.42, chartData: generateFallbackChart(18345, 150, true), assetType: "index", displayValue: "18,345" },
  { symbol: "^DJI", name: "Dow Jones", price: 39872, change: -58.4, changePercent: -0.15, chartData: generateFallbackChart(39872, 200, false), assetType: "index", displayValue: "39,872" },
  { symbol: "^RUT", name: "Russell 2000", price: 2024, change: 6.1, changePercent: 0.30, chartData: generateFallbackChart(2024, 15, true), assetType: "index", displayValue: "2,024" },
  { symbol: "EURUSD=X", name: "EUR/USD", price: 1.1382, change: 0.0024, changePercent: 0.21, chartData: generateFallbackChart(1.1382, 0.005, true), assetType: "fx", displayValue: "1.1382" },
  { symbol: "GC=F", name: "Gold", price: 3228, change: 14.5, changePercent: 0.45, chartData: generateFallbackChart(3228, 20, true), assetType: "commodity", displayValue: "$3,228" },
  { symbol: "CL=F", name: "WTI", price: 61.53, change: -0.82, changePercent: -1.31, chartData: generateFallbackChart(61.53, 0.8, false), assetType: "commodity", displayValue: "$61.53" },
  { symbol: "BZ=F", name: "Brent", price: 64.88, change: -0.65, changePercent: -0.99, chartData: generateFallbackChart(64.88, 0.7, false), assetType: "commodity", displayValue: "$64.88" },
  { symbol: "^TNX", name: "UST10 YTM", price: 4.33, change: 0.02, changePercent: 0.46, chartData: generateFallbackChart(4.33, 0.03, true), assetType: "yield", displayValue: "4.33%" },
];

interface IndexItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chartData?: { time: number; value: number }[];
  assetType?: string;
  displayValue?: string;
}

function TickerItem({ idx }: { idx: IndexItem }) {
  const isPositive = idx.changePercent > 0;
  const isNegative = idx.changePercent < 0;
  return (
    <div className="flex items-center gap-1.5 px-3 shrink-0">
      <span className="font-medium text-foreground text-[11.5px] whitespace-nowrap">{idx.name}</span>
      <span className="text-foreground/80 text-[11px] font-semibold tabular-nums whitespace-nowrap">
        {idx.displayValue || idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      {idx.chartData && idx.chartData.length > 2 && (
        <MiniChart data={idx.chartData} isPositive={isPositive} />
      )}
      {isPositive ? (
        <TrendingUp className="h-3 w-3 text-gain" />
      ) : isNegative ? (
        <TrendingDown className="h-3 w-3 text-loss" />
      ) : (
        <Minus className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={`font-semibold text-[11px] tabular-nums whitespace-nowrap ${isPositive ? "text-gain" : isNegative ? "text-loss" : "text-muted-foreground"}`}>
        {isPositive ? "+" : ""}{idx.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketTickerBar() {
  const { data: indices, isLoading } = trpc.market.indices.useQuery(undefined, {
    refetchInterval: 60000,
    retry: 2,
  });

  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [animDuration, setAnimDuration] = useState(60);

  const hasLiveData = indices && indices.length > 0 && indices.some((idx) => idx.price > 0);
  const displayIndices = hasLiveData ? indices! : FALLBACK_INDICES;

  // Calculate animation duration based on content width
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Measure after render
      requestAnimationFrame(() => {
        const singleSetWidth = node.scrollWidth / 2;
        // ~60px per second for smooth readable speed
        const duration = Math.max(30, singleSetWidth / 60);
        setAnimDuration(duration);
      });
    }
  }, [displayIndices]);

  if (isLoading) {
    return (
      <div className="h-9 border-b border-border bg-card/50 flex items-center px-4 gap-6 overflow-hidden">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="h-9 border-b border-border bg-card/50 overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/50 to-transparent z-10 pointer-events-none" />

      {/* Scrolling track: duplicate items for seamless loop */}
      <div
        ref={(node) => {
          (trackRef as any).current = node;
          measureRef(node);
        }}
        className="flex items-center h-full whitespace-nowrap"
        style={{
          animationName: "ticker-scroll",
          animationDuration: `${animDuration}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {/* First copy */}
        <div className="flex items-center shrink-0">
          <span className="text-muted-foreground mx-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider">Markets</span>
          {displayIndices.map((idx) => (
            <TickerItem key={idx.symbol} idx={idx} />
          ))}
          <span className="w-6 shrink-0" /> {/* spacer between copies */}
        </div>
        {/* Second copy for seamless loop */}
        <div className="flex items-center shrink-0">
          <span className="text-muted-foreground mx-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider">Markets</span>
          {displayIndices.map((idx) => (
            <TickerItem key={`dup-${idx.symbol}`} idx={idx} />
          ))}
          <span className="w-6 shrink-0" />
        </div>
      </div>
    </div>
  );
}

function MiniChart({ data, isPositive }: { data: { time: number; value: number }[]; isPositive: boolean }) {
  const width = 36;
  const height = 14;
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
    <svg width={width} height={height} className="ml-0.5 shrink-0">
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
