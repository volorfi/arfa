/**
 * pages/os/OSSignals.tsx — Signal queue: review → publish / suppress
 */

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Zap, Filter } from "lucide-react";
import { OSLayout } from "./OSLayout";

const STATUS_TABS = [
  { key: "publication_eligible", label: "Ready to Publish" },
  { key: "review_required",       label: "Needs Review"   },
  { key: "published",             label: "Published"      },
  { key: "suppressed",            label: "Suppressed"     },
  { key: "all",                   label: "All"            },
] as const;

const bandBadge: Record<string, string> = {
  very_high: "bg-emerald-100 text-emerald-700", high: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",      low: "bg-orange-100 text-orange-700",
  abstain: "bg-slate-100 text-slate-700",
};

export default function OSSignals() {
  const [status, setStatus] = useState<typeof STATUS_TABS[number]["key"]>("publication_eligible");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppressReason, setSuppressReason] = useState("");
  const [showSuppress, setShowSuppress] = useState(false);

  const utils = trpc.useUtils();
  const { data: queue, isLoading } = trpc.os.signalQueue.useQuery({ status });
  const { data: detail } = trpc.os.signalFull.useQuery(
    { signalId: selectedId! }, { enabled: !!selectedId }
  );

  const publish  = trpc.os.publishSignal.useMutation({ onSuccess: () => { utils.os.signalQueue.invalidate(); utils.os.dashboard.invalidate(); } });
  const suppress = trpc.os.suppressSignal.useMutation({ onSuccess: () => { utils.os.signalQueue.invalidate(); setShowSuppress(false); setSuppressReason(""); } });

  return (
    <OSLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Signal Queue</h1>
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <a href="#trigger"><Zap className="w-3.5 h-3.5" />Trigger Pipeline</a>
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap border-b pb-2">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={cn("px-3 py-1.5 text-xs rounded-md transition-colors",
                status === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 min-h-[500px]">
          {/* Signal list */}
          <div className="flex-1 rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="divide-y">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 animate-pulse bg-muted/30 mx-4 my-2 rounded"/>)}</div>
            ) : (queue ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No signals in this queue.</div>
            ) : (
              <div className="divide-y overflow-y-auto max-h-[600px]">
                {(queue ?? []).map(s => (
                  <div key={s.signalId}
                    onClick={() => setSelectedId(s.signalId)}
                    className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                      selectedId === s.signalId && "bg-primary/5 border-l-2 border-l-primary"
                    )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.identifier}</span>
                        <span className="text-xs text-muted-foreground capitalize">{s.assetClass}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.displayName}</p>
                    </div>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium capitalize", bandBadge[s.confidenceBand])}>
                      {s.confidenceBand.replace(/_/g," ")}
                    </span>
                    <span className={cn("text-xs font-semibold capitalize",
                      s.stance === "bullish" ? "text-emerald-600" : s.stance === "bearish" ? "text-red-600" : "text-amber-600"
                    )}>{s.stance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedId && detail && (
            <div className="w-80 rounded-xl border p-4 space-y-4 overflow-y-auto max-h-[600px] shrink-0">
              <div>
                <h3 className="font-bold">{detail.asset?.identifier}</h3>
                <p className="text-xs text-muted-foreground">{detail.asset?.displayName}</p>
              </div>

              <div className="text-sm space-y-1.5">
                <Row label="Stance"      value={<span className="capitalize font-medium">{detail.stance}</span>} />
                <Row label="Confidence"  value={`${Math.round(detail.confidenceScore * 100)}% (${detail.confidenceBand?.replace(/_/g," ")})`} />
                <Row label="Horizon"     value={detail.horizon} />
                <Row label="Disagreement" value={detail.disagreementScore != null ? `${Math.round(detail.disagreementScore * 100)}%` : "—"} />
                <Row label="Status"      value={<span className="capitalize">{detail.publicationStatus?.replace(/_/g," ")}</span>} />
              </div>

              {detail.bullThesis && <div className="text-xs bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2.5"><strong className="text-emerald-700 dark:text-emerald-400">Bull:</strong> {detail.bullThesis}</div>}
              {detail.bearThesis  && <div className="text-xs bg-red-50 dark:bg-red-950/30 rounded-lg p-2.5"><strong className="text-red-700 dark:text-red-400">Bear:</strong> {detail.bearThesis}</div>}

              {(detail.riskFlags as string[] ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Risk Flags</p>
                  {(detail.riskFlags as string[]).map((f,i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-400">· {f}</p>)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" className="flex-1 gap-1.5"
                  disabled={publish.isPending || detail.publicationStatus === "published"}
                  onClick={() => publish.mutate({ signalId: selectedId })}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  {detail.publicationStatus === "published" ? "Published" : "Publish"}
                </Button>
                <Button size="sm" variant="destructive" className="gap-1.5"
                  disabled={suppress.isPending}
                  onClick={() => setShowSuppress(true)}>
                  <XCircle className="w-3.5 h-3.5" /> Suppress
                </Button>
              </div>

              {showSuppress && (
                <div className="space-y-2 border-t pt-3">
                  <textarea
                    className="w-full text-xs border rounded-lg p-2 min-h-[60px] resize-none bg-background"
                    placeholder="Reason for suppression…"
                    value={suppressReason}
                    onChange={e => setSuppressReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="flex-1 text-xs"
                      disabled={!suppressReason.trim() || suppress.isPending}
                      onClick={() => suppress.mutate({ signalId: selectedId, reason: suppressReason })}>
                      Confirm Suppress
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSuppress(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </OSLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
