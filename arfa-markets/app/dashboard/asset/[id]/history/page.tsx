import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreHistoryChart } from "@/components/asset/score-history-chart";
import { getMockAsset } from "@/lib/mock/assets";
import { assetClassLabel, type FactorScore, type Score } from "@/types/asset";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const asset = getMockAsset(params.id);
  if (!asset) return { title: "Asset history not found" };
  return {
    title: `${asset.name} — Score history`,
    description: `Composite ARFA Ratio history and factor changelog for ${asset.name}.`,
  };
}

export default function AssetHistoryPage({ params }: PageProps) {
  const asset = getMockAsset(params.id);
  if (!asset) notFound();

  // Build per-factor history table from the mock catalogue. Real data
  // would come from a per-factor history table.
  const factorRows = buildFactorHistory(asset.factorScores);

  // Mock changelog — three plain-English notes describing recent score
  // movements. Real implementation reads from an audit table the scoring
  // engine writes to.
  const changelog = buildChangelog(asset.name, asset.factorScores);

  return (
    <article className="flex flex-col gap-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link href={`/dashboard/asset/${asset.assetId}`}>
            <ChevronLeft className="h-4 w-4" />
            Back to {asset.ticker}
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-text-faint">
          <Badge variant="outline">{assetClassLabel(asset.assetClass)}</Badge>
          <span>{asset.peerGroup}</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          {asset.name} — Score history
        </h1>
        <p className="text-sm text-text-muted">
          Composite ARFA Ratio plus its return / risk decomposition over
          time, alongside the factor moves that drove changes.
        </p>
      </header>

      <ScoreHistoryChart history={asset.history} />

      <FactorHistoryTable rows={factorRows} />

      <Changelog entries={changelog} />
    </article>
  );
}

// ── Factor history table ───────────────────────────────────────────────────
// Synthesises a "today vs. last week vs. last month" view per factor. Real
// implementation would join against per-factor history rows.

interface FactorHistoryRow {
  date: string; // YYYY-MM-DD
  factorLabel: string;
  factorType: "return" | "risk";
  score: Score;
  change: number; // absolute delta vs prior
}

function buildFactorHistory(scores: FactorScore[]): FactorHistoryRow[] {
  const today = new Date("2026-04-23");
  const offsets = [0, 7, 28]; // today, 1w ago, 4w ago

  // Deterministic walk per factor — same id always produces the same
  // history so SSR + client agree.
  function walk(seed: number, base: number, t: number): Score {
    const noise = ((seed * (t + 3)) % 11) / 22 - 0.25;
    const v = Math.max(1, Math.min(7, base + noise + (t === 0 ? 0 : -0.2)));
    return Math.round(v) as Score;
  }

  const rows: FactorHistoryRow[] = [];
  scores.forEach((f, idx) => {
    const seed = (idx + 1) * 13;
    let prev: Score = f.score;
    offsets.forEach((days, j) => {
      const date = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const score: Score = j === 0 ? f.score : walk(seed, f.score, days);
      const change = j === 0 ? 0 : score - prev;
      rows.push({
        date,
        factorLabel: f.label,
        factorType: f.factorType,
        score,
        change,
      });
      prev = score;
    });
  });

  // Sort: most recent first, then by factor label so the table groups
  // visually by date.
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.factorLabel.localeCompare(b.factorLabel);
  });
}

function FactorHistoryTable({ rows }: { rows: FactorHistoryRow[] }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-xs">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="font-display text-base font-semibold uppercase tracking-widest text-text-faint">
          Factor history
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Each factor&apos;s score today, last week, and four weeks ago.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2/50 text-left">
            <tr>
              <th className="px-3 py-2.5 font-medium text-text-muted">Date</th>
              <th className="px-3 py-2.5 font-medium text-text-muted">Factor</th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Score
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-text-muted">
                Δ vs prior
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.date}-${r.factorLabel}-${i}`}
                className="border-t border-border odd:bg-surface-1 even:bg-surface-2/30"
              >
                <td className="px-3 py-2 text-xs text-text-muted">
                  {new Date(r.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        r.factorType === "return" ? "bg-success" : "bg-destructive",
                      )}
                    />
                    <span className="text-text-primary">{r.factorLabel}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                  {r.score}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={r.change} factorType={r.factorType} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DeltaCell({
  delta,
  factorType,
}: {
  delta: number;
  factorType: "return" | "risk";
}) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-text-faint">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }
  // For RETURN factors: positive delta is good. For RISK factors:
  // positive delta means MORE risk → bad.
  const isGood = factorType === "return" ? delta > 0 : delta < 0;
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        isGood ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

// ── Changelog ──────────────────────────────────────────────────────────────

interface ChangelogEntry {
  date: string;
  headline: string;
  body: string;
}

function buildChangelog(
  assetName: string,
  scores: FactorScore[],
): ChangelogEntry[] {
  // Pick three notable factors (max-score-return + max-score-risk + a
  // movement narrative on profitability) and write plain-English notes.
  const topReturn = [...scores].filter((s) => s.factorType === "return")
    .sort((a, b) => b.score - a.score)[0];
  const topRisk = [...scores].filter((s) => s.factorType === "risk")
    .sort((a, b) => b.score - a.score)[0];

  const today = new Date("2026-04-23");
  function dateOffset(days: number): string {
    return new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  return [
    {
      date: dateOffset(2),
      headline: `${topReturn?.label ?? "Top return factor"} held at ${topReturn?.score ?? "—"}/7`,
      body: `${topReturn?.driverSummary ?? ""} The composite has stayed within ±0.4 of its 30-day average for ${assetName}.`,
    },
    {
      date: dateOffset(9),
      headline: `${topRisk?.label ?? "Top risk factor"} ticked up`,
      body: `${topRisk?.driverSummary ?? ""} Watch this slot — a sustained read above 5 historically precedes meaningful drawdown.`,
    },
    {
      date: dateOffset(28),
      headline: "Composite ARFA Ratio refresh",
      body: `Quarterly model recalibration absorbed the last reporting cycle. Net effect on ${assetName}'s composite was small (±0.5).`,
    },
  ];
}

function Changelog({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <section>
      <h2 className="font-display text-base font-semibold uppercase tracking-widest text-text-faint">
        What changed
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Plain-English notes describing the score movements that mattered.
      </p>
      <ol className="mt-4 space-y-3">
        {entries.map((e) => (
          <li key={e.date}>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-text-faint">
                  {new Date(e.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <h3 className="mt-1 font-display text-base font-semibold tracking-tight text-text-primary">
                  {e.headline}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {e.body}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
