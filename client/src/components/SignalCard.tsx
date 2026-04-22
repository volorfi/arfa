import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lock } from "lucide-react";

type Stance = "bullish" | "bearish" | "neutral";
type ConfidenceBand = "very_high" | "high" | "medium" | "low" | "abstain";

function formatTimeAgo(updatedAt: string | Date): string {
  const ts = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const diffMs = Date.now() - ts.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return ts.toLocaleDateString();
}

function stanceBadge(stance: Stance) {
  if (stance === "bullish") {
    return {
      label: "Bullish",
      className: "bg-gain/10 text-gain border-gain/30",
      Icon: TrendingUp,
    };
  }
  if (stance === "bearish") {
    return {
      label: "Bearish",
      className: "bg-loss/10 text-loss border-loss/30",
      Icon: TrendingDown,
    };
  }
  return {
    label: "Neutral",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Minus,
  };
}

function confidenceLabel(band: ConfidenceBand): string {
  switch (band) {
    case "very_high": return "Very High";
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
    case "abstain": return "Abstain";
  }
}

export function SignalCard({ symbol }: { symbol: string }) {
  const { user } = useAuth();

  // Only fetch if logged in; tRPC procedure is protected anyway.
  const { data: signal, isLoading } = trpc.signal.get.useQuery(
    { symbol, horizon: "20D" },
    { enabled: Boolean(user), retry: false },
  );

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="text-xs text-muted-foreground">
          Log in to see ARFA's 20-day research signal for {symbol}.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            ARFA Signal · 20D
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          No signal computed yet for {symbol}. Signals are generated nightly
          for the current coverage universe.
        </div>
      </div>
    );
  }

  const badge = stanceBadge(signal.stance as Stance);
  const Icon = badge.Icon;
  const drivers = (signal.topDrivers ?? []) as string[];
  const risks = (signal.riskFlags ?? []) as string[];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          ARFA Signal · 20D
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatTimeAgo(signal.updatedAt)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${badge.className}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {badge.label}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Confidence · <span className="text-foreground font-medium">{confidenceLabel(signal.confidenceBand as ConfidenceBand)}</span>
        </div>
      </div>

      {drivers.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1.5">
            Key drivers
          </div>
          <ul className="space-y-1">
            {drivers.map((d) => (
              <li key={d} className="flex items-start gap-2 text-xs text-foreground/80 leading-snug">
                <span className="h-1 w-1 rounded-full bg-foreground/30 mt-[7px] shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risks.length > 0 && (
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1.5">
            <AlertTriangle className="h-3 w-3" />
            Risk flags
          </div>
          <ul className="space-y-1">
            {risks.map((r) => (
              <li key={r} className="text-xs text-muted-foreground leading-snug">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground leading-relaxed">
        Research-only. Not investment advice. Signal is generated from ARFA's
        internal cross-sectional model and may be stale relative to markets.
      </div>
    </div>
  );
}
