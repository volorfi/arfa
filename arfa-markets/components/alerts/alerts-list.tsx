"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { BellRing } from "lucide-react";
import {
  DELIVERY_LABELS,
  describeCondition,
  parseCondition,
  type AlertDeliveryMethod,
} from "@/lib/alerts";
import {
  deleteAlert,
  pauseAlert,
  resumeAlert,
} from "@/app/actions/alerts";

export interface AlertRow {
  id: string;
  assetId: string | null;
  assetName: string | null;
  ticker: string | null;
  conditionJson: unknown;
  deliveryMethod: AlertDeliveryMethod;
  status: "ACTIVE" | "TRIGGERED" | "PAUSED" | "ARCHIVED";
  triggeredAt: string | null;
  createdAt: string;
}

export function AlertsList({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="No alerts yet"
        description="Use the form above to create one. Alerts fire when an ARFA score crosses the threshold you set — useful for keeping tabs on names you don't want to check daily."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2/50 text-left">
            <tr>
              <th className="px-3 py-2.5 font-medium text-text-muted">Asset</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Trigger</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Delivery</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Last fired</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Status</th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AlertRowItem key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlertRowItem({ row }: { row: AlertRow }) {
  const [pendingAction, setPendingAction] = React.useState<
    "pause" | "resume" | "delete" | null
  >(null);

  const condition = parseCondition(row.conditionJson);
  const conditionText = condition
    ? describeCondition(condition)
    : "Custom trigger";

  async function handle(action: "pause" | "resume" | "delete") {
    if (action === "delete" && !window.confirm("Delete this alert?")) return;
    setPendingAction(action);
    try {
      if (action === "pause") await pauseAlert({ alertId: row.id });
      if (action === "resume") await resumeAlert({ alertId: row.id });
      if (action === "delete") await deleteAlert({ alertId: row.id });
      toast.success(
        action === "pause"
          ? "Paused"
          : action === "resume"
            ? "Resumed"
            : "Deleted",
      );
    } catch (err) {
      toast.error("Could not update", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  const busy = pendingAction !== null;
  const statusTone =
    row.status === "ACTIVE"
      ? "border-success/40 bg-success/10 text-success"
      : row.status === "PAUSED"
        ? "border-border bg-surface-2 text-text-muted"
        : row.status === "TRIGGERED"
          ? "border-warning/40 bg-warning/15 text-[hsl(36_85%_38%)] dark:text-[hsl(36_80%_62%)]"
          : "border-border bg-surface-2 text-text-faint";

  return (
    <tr className={cn("border-t border-border", busy && "opacity-50")}>
      <td className="px-3 py-2.5">
        {row.assetId ? (
          <Link
            href={`/dashboard/asset/${row.assetId}`}
            className="font-medium text-text-primary underline-offset-2 hover:text-primary hover:underline"
          >
            {row.assetName ?? row.ticker}
          </Link>
        ) : (
          <span className="text-text-muted">—</span>
        )}
        {row.ticker && (
          <p className="font-mono text-xs text-text-muted">{row.ticker}</p>
        )}
      </td>
      <td className="px-3 py-2.5 text-text-primary">{conditionText}</td>
      <td className="px-3 py-2.5">
        <Badge variant="outline">{DELIVERY_LABELS[row.deliveryMethod]}</Badge>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-muted">
        {row.triggeredAt
          ? new Date(row.triggeredAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "—"}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
            statusTone,
          )}
        >
          {row.status.toLowerCase()}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {row.status === "ACTIVE" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handle("pause")}
              disabled={busy}
              aria-label="Pause"
              className="h-8 w-8 text-text-muted hover:text-text-primary"
            >
              {pendingAction === "pause" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          )}
          {row.status === "PAUSED" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handle("resume")}
              disabled={busy}
              aria-label="Resume"
              className="h-8 w-8 text-text-muted hover:text-text-primary"
            >
              {pendingAction === "resume" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handle("delete")}
            disabled={busy}
            aria-label="Delete"
            className="h-8 w-8 text-text-muted hover:text-destructive"
          >
            {pendingAction === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

