import { cn } from "@/lib/utils";
import type { FragilityCell } from "./compute";

/**
 * 3×4 fragility heatmap. Cells coloured by concentration level:
 *   high      → destructive (red)
 *   moderate  → warning (amber)
 *   low       → success (green)
 *
 * Score number rendered inside each cell; factor name and tone dot at top.
 *
 * Pure server component — no interactivity.
 */
export function FragilityHeatmap({ cells }: { cells: FragilityCell[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-xs md:p-6">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold uppercase tracking-widest text-text-faint">
            Fragility heatmap
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Weighted factor concentration across your holdings. Red cells are
            where a shock would hurt most.
          </p>
        </div>
        <Legend />
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <Cell key={c.factorKey} cell={c} />
        ))}
      </div>
    </section>
  );
}

function Cell({ cell }: { cell: FragilityCell }) {
  const tones: Record<FragilityCell["level"], { bg: string; text: string; border: string }> = {
    high: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/40",
    },
    moderate: {
      bg: "bg-warning/15",
      text: "text-[hsl(36_85%_38%)] dark:text-[hsl(36_80%_62%)]",
      border: "border-warning/40",
    },
    low: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/40",
    },
  };
  const t = tones[cell.level];
  const isReturn = cell.factorType === "return";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 transition-colors",
        t.bg,
        t.border,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isReturn ? "bg-success" : "bg-destructive",
          )}
        />
        <span className="truncate text-[11px] font-medium text-text-muted">
          {cell.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-2xl font-bold tracking-tight tabular-nums",
            t.text,
          )}
        >
          {cell.weightedScore.toFixed(1)}
        </span>
        <span className="text-[10px] text-text-faint">/ 7</span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-text-faint">
        {cell.level}
      </span>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
      <Swatch className="bg-success" label="Low" />
      <Swatch className="bg-warning" label="Moderate" />
      <Swatch className="bg-destructive" label="High" />
    </ul>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </li>
  );
}
