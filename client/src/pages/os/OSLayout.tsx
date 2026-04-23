/**
 * pages/os/OSLayout.tsx — Research OS shell + dashboard
 * Fix: useRoute was called inside .map() (hook in loop = React violation → 404)
 * Solution: extracted OSNavItem as its own component
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import ArfaLogo from "@/components/ArfaLogo";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import {
  LayoutDashboard, ListChecks, FileText,
  Users, Lock, Clock, Zap, Loader2,
} from "lucide-react";

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/os",         label: "Dashboard",    icon: LayoutDashboard },
  { href: "/os/signals", label: "Signal Queue", icon: ListChecks      },
  { href: "/os/notes",   label: "Notes",        icon: FileText        },
  { href: "/os/users",   label: "Users",        icon: Users           },
] as const;

// ── Each nav item is its own component — hooks must not be called in a loop ───
function OSNavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const matchPath = href === "/os" ? "/os" : `${href}*`;
  const [active] = useRoute(matchPath);
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
    </Link>
  );
}

function OSNav() {
  return (
    <nav className="w-52 shrink-0 border-r min-h-screen p-3 space-y-1 hidden md:block">
      <div className="flex items-center gap-2 px-3 py-2 mb-4">
        <ArfaLogo variant="mark" theme="auto" size="xs" />
        <span className="font-semibold text-sm">Research OS</span>
      </div>
      {NAV.map(item => <OSNavItem key={item.href} {...item} />)}
    </nav>
  );
}

export function OSLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <ArfaLogo variant="mark" theme="auto" size="md" className="mx-auto" />
          <Lock className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="font-semibold">Research OS — Admin Access Only</p>
          <p className="text-sm text-muted-foreground">This area requires admin privileges.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <OSNav />
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}

// ── Status colours ─────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  internal_only:        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  review_required:      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  publication_eligible: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  published:            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  suppressed:           "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const priorityColor: Record<string, string> = {
  critical: "text-red-600", high: "text-amber-600",
  medium:   "text-blue-600", low: "text-slate-500",
};

// ── Trigger pipeline card ─────────────────────────────────────────────────────

type AssetClass = "equity" | "bond" | "fx" | "commodity" | "index" | "etf" | "macro";
type Horizon = "1D" | "5D" | "20D" | "3M" | "6M";

const PRESETS: Array<{ label: string; identifier: string; displayName: string; assetClass: AssetClass; horizon: Horizon }> = [
  { label: "AAPL · 20D",    identifier: "AAPL",   displayName: "Apple Inc.",        assetClass: "equity",    horizon: "20D" },
  { label: "EUR/USD · 5D",  identifier: "EURUSD", displayName: "Euro / US Dollar",  assetClass: "fx",        horizon: "5D"  },
  { label: "Gold · 20D",    identifier: "GC",     displayName: "Gold Futures",      assetClass: "commodity", horizon: "20D" },
];

function TriggerPipelineCard() {
  const [identifier,  setIdentifier]  = useState("");
  const [displayName, setDisplayName] = useState("");
  const [assetClass,  setAssetClass]  = useState<AssetClass>("equity");
  const [horizon,     setHorizon]     = useState<Horizon>("20D");

  const utils = trpc.useUtils();
  const trigger = trpc.os.triggerPipeline.useMutation({
    onSuccess: (result, vars) => {
      toast.success(`Pipeline queued for ${vars.identifier.toUpperCase()}`, {
        description: "Takes ~30–60s. Signal will appear in Recent Signals below when ready.",
      });
      setIdentifier(""); setDisplayName("");
      utils.os.dashboard.invalidate();
    },
    onError: (err) => toast.error("Trigger failed", { description: err.message }),
  });

  const run = (p?: typeof PRESETS[number]) => {
    const payload = p
      ? { identifier: p.identifier, displayName: p.displayName, assetClass: p.assetClass, horizon: p.horizon }
      : {
          identifier:  identifier.trim(),
          displayName: displayName.trim() || identifier.trim().toUpperCase(),
          assetClass,
          horizon,
        };
    if (!payload.identifier) {
      toast.error("Enter a ticker or identifier");
      return;
    }
    trigger.mutate(payload);
  };

  return (
    <div id="trigger" className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Trigger Signal Pipeline
        </h2>
        {trigger.isPending && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Queuing…
          </span>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1">Quick test:</span>
        {PRESETS.map(p => (
          <Button
            key={p.label}
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => run(p)}
            disabled={trigger.isPending}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom form */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
        <Input
          placeholder="Ticker (e.g. MSFT)"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Display name (optional)"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="h-9 text-sm"
        />
        <select
          value={assetClass}
          onChange={e => setAssetClass(e.target.value as AssetClass)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="equity">Equity</option>
          <option value="bond">Bond</option>
          <option value="fx">FX</option>
          <option value="commodity">Commodity</option>
          <option value="index">Index</option>
          <option value="etf">ETF</option>
          <option value="macro">Macro</option>
        </select>
        <select
          value={horizon}
          onChange={e => setHorizon(e.target.value as Horizon)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="1D">1D</option>
          <option value="5D">5D</option>
          <option value="20D">20D</option>
          <option value="3M">3M</option>
          <option value="6M">6M</option>
        </select>
        <Button
          onClick={() => run()}
          disabled={trigger.isPending || !identifier.trim()}
          className="h-9 gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" /> Run
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Runs 4 specialist agents → reconciler → risk review. ~30–60s total. Errors log to Railway (Service → Deployments → Logs).
      </p>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function OSDashboard() {
  // Auto-refresh every 10s so newly-generated signals appear
  const { data, isLoading } = trpc.os.dashboard.useQuery(undefined, {
    refetchInterval: 10000,
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-xl" />
      ))}
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <TriggerPipelineCard />

      {/* Signal counts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Internal",   count: data.signalCounts.internal,   cls: "text-slate-600"   },
          { label: "For Review", count: data.signalCounts.review,     cls: "text-amber-600"   },
          { label: "Eligible",   count: data.signalCounts.eligible,   cls: "text-blue-600"    },
          { label: "Published",  count: data.signalCounts.published,  cls: "text-emerald-600" },
          { label: "Suppressed", count: data.signalCounts.suppressed, cls: "text-red-600"     },
        ].map(({ label, count, cls }) => (
          <div key={label} className="rounded-xl border p-3 text-center">
            <p className={cn("text-2xl font-bold", cls)}>{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending reviews */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Reviews ({data.openReviews})
          </h2>
          {data.pendingReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reviews.</p>
          ) : (
            <div className="rounded-xl border divide-y">
              {data.pendingReviews.map(r => (
                <div key={r.reviewId} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate capitalize">{r.reviewType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{r.objectId.slice(0, 12)}…</p>
                  </div>
                  <span className={cn("text-xs font-semibold", priorityColor[r.priority])}>{r.priority}</span>
                  <Link href={`/os/signals?review=${r.objectId}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signals */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Recent Signals</h2>
          <div className="rounded-xl border divide-y">
            {data.recentSignals.map(s => (
              <div key={s.signalId} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.identifier}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.assetClass}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", statusColor[s.publicationStatus])}>
                  {s.publicationStatus.replace(/_/g, " ")}
                </span>
                <span className={cn("text-xs font-semibold capitalize",
                  s.stance === "bullish" ? "text-emerald-600" : s.stance === "bearish" ? "text-red-600" : "text-amber-600"
                )}>{s.stance}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
