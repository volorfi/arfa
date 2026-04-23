/**
 * pages/insights/InsightsSignalDetail.tsx
 * Full signal card: Driver Panel · Debate View · Risk Box · History
 */

import { trpc } from "@/lib/trpc";
import SubscriberGate from "@/components/SubscriberGate";
import { useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Info, ShieldAlert, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const stanceConfig = {
  bullish: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: TrendingUp, label: "Bullish" },
  bearish: { color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",                 icon: TrendingDown, label: "Bearish" },
  neutral: { color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",          icon: Minus, label: "Neutral" },
} as const;

const bandLabel: Record<string, string> = {
  very_high: "Very High", high: "High", moderate: "Moderate", low: "Low", abstain: "No Signal",
};

function ConfidenceBar({ score, band }: { score: number; band: string }) {
  const colors: Record<string, string> = {
    very_high: "bg-emerald-500", high: "bg-green-400",
    moderate: "bg-amber-400", low: "bg-orange-400", abstain: "bg-slate-400",
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Confidence</span>
        <span className="font-semibold">{bandLabel[band] ?? band} · {Math.round(score * 100)}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", colors[band] ?? "bg-slate-400")}
          style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
    </div>
  );
}

function SignalDetailInner({ signalId }: { signalId: string }) {
  const [showFalsifiers, setShowFalsifiers] = useState(false);
  const { data, isLoading } = trpc.insights.signalDetail.useQuery({ signalId });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
    </div>
  );

  if (!data) return (
    <div className="max-w-2xl mx-auto p-8 text-center text-muted-foreground">Signal not found.</div>
  );

  const stance = (data.stance in stanceConfig ? data.stance : "neutral") as keyof typeof stanceConfig;
  const cfg    = stanceConfig[stance];
  const Icon   = cfg.icon;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">

      {/* Back */}
      <Link href="/insights">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to feed
        </span>
      </Link>

      {/* Asset header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{data.identifier}</h1>
            <Badge variant="outline" className="capitalize">{data.assetClass}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{data.displayName}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{data.horizon} horizon</p>
          <p>{new Date(data.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Stance card */}
      <div className={cn("rounded-xl border p-4 flex items-center gap-4", cfg.bg)}>
        <div className={cn("p-3 rounded-xl bg-white/50 dark:bg-black/20", cfg.color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className={cn("text-2xl font-bold tracking-tight", cfg.color)}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground">Signal type: {data.signalType} · Regime: {data.regimeState}</p>
        </div>
      </div>

      {/* Confidence */}
      <div className="rounded-xl border p-4">
        <ConfidenceBar score={data.confidenceScore} band={data.confidenceBand} />
        {data.disagreementScore != null && (
          <p className="text-xs text-muted-foreground mt-2">
            Agent disagreement: <span className={cn("font-medium", data.disagreementScore > 0.5 ? "text-amber-600" : "")}>
              {Math.round(data.disagreementScore * 100)}%
            </span>
            {data.disagreementScore > 0.5 && " — elevated, interpret with caution"}
          </p>
        )}
      </div>

      {/* Debate view (Bull vs Bear theses) */}
      {(data.bullThesis || data.bearThesis) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Debate View</p>
          <div className="grid grid-cols-2 gap-3">
            {data.bullThesis && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Bull case
                </p>
                <p className="text-xs leading-relaxed text-foreground/70">{data.bullThesis}</p>
              </div>
            )}
            {data.bearThesis && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Bear case
                </p>
                <p className="text-xs leading-relaxed text-foreground/70">{data.bearThesis}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver panel */}
      {data.topDrivers?.length > 0 && (
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Key Drivers
          </p>
          <ul className="space-y-1.5">
            {data.topDrivers.map((d: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk box */}
      {data.riskFlags?.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Risk flags
          </p>
          <ul className="space-y-1">
            {data.riskFlags.map((f: string, i: number) => (
              <li key={i} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Falsifiers (collapsible) */}
      {data.falsifiers?.length > 0 && (
        <div className="rounded-xl border p-4">
          <button
            onClick={() => setShowFalsifiers(v => !v)}
            className="flex items-center gap-2 text-sm font-medium w-full text-left"
          >
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            What would invalidate this view
            {showFalsifiers ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>
          {showFalsifiers && (
            <ul className="mt-3 space-y-1.5 pl-6">
              {data.falsifiers.map((f: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground list-disc">{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed pb-4">
        AI-generated analysis for informational purposes only. Not investment advice.
        Data quality score: {Math.round((data.dataQualityScore ?? 0) * 100)}%.
        Sources: {(data.evidenceRefs ?? []).join(", ")}.
      </p>
    </div>
  );
}

export default function InsightsSignalDetail() {
  const [, params] = useRoute("/insights/signals/:signalId");
  return (
    <SubscriberGate>
      <SignalDetailInner signalId={params?.signalId ?? ""} />
    </SubscriberGate>
  );
}
