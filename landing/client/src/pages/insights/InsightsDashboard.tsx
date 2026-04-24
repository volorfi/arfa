/**
 * pages/insights/InsightsDashboard.tsx
 * Primary Insights landing — live signal feed + macro regime color.
 */

import { trpc } from "@/lib/trpc";
import SubscriberGate from "@/components/SubscriberGate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, Globe2,
  Zap, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Stance = "bullish" | "bearish" | "neutral" | string;

const stanceStyle: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  bullish:  { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  bearish:  { color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30",         icon: <TrendingDown className="w-3.5 h-3.5" /> },
  neutral:  { color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",     icon: <Minus className="w-3.5 h-3.5" /> },
};

const bandColor: Record<string, string> = {
  very_high: "bg-emerald-500", high: "bg-green-400",
  moderate:  "bg-amber-400",   low:  "bg-orange-400", abstain: "bg-slate-400",
};

const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: "Equities", bond: "Fixed Income", fx: "FX",
  commodity: "Commodities", index: "Indices", macro: "Macro",
};

function stanceOf(s: Stance) {
  return stanceStyle[s] ?? stanceStyle.neutral;
}

function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000);
  return h < 1 ? `${Math.floor(d / 60000)}m ago` : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SignalRow({ s }: { s: any }) {
  const style = stanceOf(s.stance);
  return (
    <Link href={`/insights/signals/${s.signalId}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b last:border-0">
        {/* Asset info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{s.identifier}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.assetClass}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{s.displayName}</p>
        </div>

        {/* Stance badge */}
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", style.bg, style.color)}>
          {style.icon}
          <span className="capitalize">{s.stance}</span>
        </div>

        {/* Confidence bar */}
        <div className="w-16 hidden sm:block">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", bandColor[s.confidenceBand] ?? "bg-slate-400")}
              style={{ width: `${Math.round(s.confidenceScore * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right mt-0.5">
            {Math.round(s.confidenceScore * 100)}%
          </p>
        </div>

        {/* Horizon + age */}
        <div className="text-right shrink-0">
          <p className="text-xs font-medium">{s.horizon}</p>
          <p className="text-[10px] text-muted-foreground">{relTime(s.updatedAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function RegimeCard({ cls }: { cls: any }) {
  const net = cls.netSentiment;
  const color = net > 20 ? "text-emerald-600" : net < -20 ? "text-red-600" : "text-amber-600";
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold">{ASSET_CLASS_LABELS[cls.assetClass] ?? cls.assetClass}</p>
        <span className={cn("text-sm font-bold", color)}>
          {net > 0 ? "+" : ""}{net}
        </span>
      </div>
      <div className="flex gap-1 text-xs text-muted-foreground">
        <span className="text-emerald-600 font-medium">{cls.bullish}↑</span>
        <span className="mx-1">·</span>
        <span className="text-red-600 font-medium">{cls.bearish}↓</span>
        <span className="mx-1">·</span>
        <span>{cls.neutral} neutral</span>
      </div>
      {/* Mini conviction bar */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {cls.total > 0 && <>
          <div className="bg-emerald-500" style={{ width: `${(cls.bullish / cls.total) * 100}%` }} />
          <div className="bg-amber-400"   style={{ width: `${(cls.neutral / cls.total) * 100}%` }} />
          <div className="bg-red-500"     style={{ width: `${(cls.bearish / cls.total) * 100}%` }} />
        </>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const ASSET_CLASSES = ["all","equity","bond","fx","commodity","index","macro"] as const;
const STANCES       = ["all","bullish","neutral","bearish"] as const;

function InsightsDashboardInner() {
  const [assetClass, setAssetClass] = useState<typeof ASSET_CLASSES[number]>("all");
  const [stance,     setStance]     = useState<typeof STANCES[number]>("all");

  const { data: feed,   isLoading: feedLoading }   = trpc.insights.signalFeed.useQuery({ assetClass, stance });
  const { data: regime, isLoading: regimeLoading } = trpc.insights.macroRegimeOverview.useQuery();

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-generated signals across equities, fixed income, FX, and macro · Multi-agent analysis
        </p>
      </div>

      {/* Regime overview */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Market Regime</h2>
        </div>
        {regimeLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4 h-24 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(regime ?? []).map(cls => <RegimeCard key={cls.assetClass} cls={cls} />)}
          </div>
        )}
      </section>

      {/* Signal feed */}
      <section>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {ASSET_CLASSES.map(c => (
              <button
                key={c}
                onClick={() => setAssetClass(c)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-colors",
                  assetClass === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 hover:bg-muted/60"
                )}
              >
                {c === "all" ? "All classes" : ASSET_CLASS_LABELS[c] ?? c}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {STANCES.map(s => (
              <button
                key={s}
                onClick={() => setStance(s)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full border transition-colors",
                  stance === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 hover:bg-muted/60"
                )}
              >
                {s === "all" ? "All stances" : <span className="capitalize">{s}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="rounded-xl border overflow-hidden">
          {feedLoading ? (
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-40" />
                  </div>
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              ))}
            </div>
          ) : (feed ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Zap className="w-8 h-8 opacity-30" />
              <p className="text-sm">No published signals yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {(feed ?? []).map(s => <SignalRow key={s.signalId} s={s} />)}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          AI-generated analysis for informational purposes only. Not investment advice.
          Confidence scores reflect internal model agreement, not return probability.
        </p>
      </section>
    </div>
  );
}

export default function InsightsDashboard() {
  return (
    <SubscriberGate>
      <InsightsDashboardInner />
    </SubscriberGate>
  );
}
