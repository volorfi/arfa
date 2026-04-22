/**
 * Signals service — ARFA Research Engine, Phase 0.
 *
 * A signal is a structured, explainable view on an asset at a horizon. The
 * shape is intentionally small in Phase 0 (stance + confidence band + drivers
 * + risk flags + publication_status) so the frontend contract stays stable
 * while the engine behind it evolves (baseline factors → LLM-assisted
 * factors → multi-agent debate).
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { InsertSignal, Signal, signals } from "../drizzle/schema";
import { getDb } from "./db";
import { getStockChart } from "./stockService";
import { getSignalUniverse } from "./signalUniverse";

export type SignalHorizon = "20D";
export const HORIZONS_SUPPORTED: SignalHorizon[] = ["20D"];

export async function getLatestSignalBySymbol(
  symbol: string,
  horizon: SignalHorizon = "20D",
): Promise<Signal | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(signals)
    .where(and(eq(signals.symbol, symbol.toUpperCase()), eq(signals.horizon, horizon)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function listSignals(
  horizon: SignalHorizon = "20D",
  opts: {
    stance?: "bullish" | "bearish" | "neutral";
    limit?: number;
    onlyPublishable?: boolean;
  } = {},
): Promise<Signal[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const filters = [eq(signals.horizon, horizon)];
  if (opts.stance) filters.push(eq(signals.stance, opts.stance));
  if (opts.onlyPublishable) {
    filters.push(
      inArray(signals.publicationStatus, ["publication_eligible", "published"]),
    );
  }
  return db
    .select()
    .from(signals)
    .where(and(...filters))
    .orderBy(desc(signals.score))
    .limit(limit);
}

export async function upsertSignal(payload: InsertSignal): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values: InsertSignal = {
    ...payload,
    symbol: payload.symbol.toUpperCase(),
  };
  const updateSet: Record<string, unknown> = {
    stance: values.stance,
    score: values.score,
    confidenceBand: values.confidenceBand,
    topDrivers: values.topDrivers,
    riskFlags: values.riskFlags,
  };
  if (values.publicationStatus !== undefined) {
    updateSet.publicationStatus = values.publicationStatus;
  }
  await db.insert(signals).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

// ─── Baseline signal computation (no LLM yet) ──────────────────────
// Baseline factors in Phase 0:
//   momentum_6m       — % return over ~6 months (126 trading days)
//   short_reversal_5d — negative of 5-day return (mean-reversion bias)
//   valuation_pe      — trailing PE, inverted into a 0..1 z-like score
//                       (lower PE is more "bullish" in this crude baseline)
// Combined into a single z-score, mapped to stance + confidence band, then
// decorated with human-readable drivers and risk flags.

type FactorRow = {
  symbol: string;
  momentum6m: number | null;
  reversal5d: number | null;
  inversePE: number | null;
};

function zScore(values: number[]): (v: number) => number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return () => 0;
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const variance =
    finite.reduce((a, b) => a + (b - mean) * (b - mean), 0) / finite.length;
  const std = Math.sqrt(variance);
  if (std === 0) return () => 0;
  return (v: number) =>
    Number.isFinite(v) ? Math.max(-3, Math.min(3, (v - mean) / std)) : 0;
}

function mapStance(score: number): "bullish" | "bearish" | "neutral" {
  if (score > 0.35) return "bullish";
  if (score < -0.35) return "bearish";
  return "neutral";
}

function mapConfidenceBand(
  absScore: number,
): "very_high" | "high" | "medium" | "low" | "abstain" {
  if (absScore >= 1.5) return "high";
  if (absScore >= 0.8) return "medium";
  if (absScore >= 0.35) return "low";
  return "abstain";
}

function buildDrivers(row: FactorRow): string[] {
  const out: string[] = [];
  if (row.momentum6m !== null) {
    if (row.momentum6m > 0.1)
      out.push(`6M momentum strong (+${(row.momentum6m * 100).toFixed(1)}%)`);
    else if (row.momentum6m < -0.1)
      out.push(`6M momentum weak (${(row.momentum6m * 100).toFixed(1)}%)`);
  }
  if (row.reversal5d !== null) {
    if (row.reversal5d < -0.05)
      out.push(`Short-term pullback (${(row.reversal5d * 100).toFixed(1)}% / 5D)`);
    else if (row.reversal5d > 0.05)
      out.push(`Short-term rally (+${(row.reversal5d * 100).toFixed(1)}% / 5D)`);
  }
  if (row.inversePE !== null && row.inversePE > 0) {
    const pe = 1 / row.inversePE;
    if (pe < 15) out.push(`Valuation compelling (PE ${pe.toFixed(1)})`);
    else if (pe > 40) out.push(`Valuation stretched (PE ${pe.toFixed(1)})`);
  }
  return out.slice(0, 5);
}

function buildRiskFlags(row: FactorRow): string[] {
  const flags: string[] = [];
  if (row.momentum6m === null) flags.push("Incomplete price history");
  if (row.inversePE === null) flags.push("Earnings data unavailable");
  return flags.slice(0, 3);
}

async function factorsForSymbol(symbol: string): Promise<FactorRow> {
  const history = await getStockChart(symbol, "1d", "1y");
  let momentum6m: number | null = null;
  let reversal5d: number | null = null;
  if (history.length >= 10) {
    const last = history[history.length - 1].close;
    if (history.length >= 126) {
      const past = history[history.length - 126].close;
      if (past > 0) momentum6m = last / past - 1;
    } else if (history.length >= 60) {
      // Fall back to whatever we have if <6M available
      const past = history[0].close;
      if (past > 0) momentum6m = last / past - 1;
    }
    const fiveBack = history[Math.max(0, history.length - 6)].close;
    if (fiveBack > 0) reversal5d = last / fiveBack - 1;
  }

  // Valuation via trailing PE from the quote endpoint.
  // Avoid an extra network round trip by lazy-importing to sidestep circular
  // dep risk in the service layer.
  const { getStockQuote } = await import("./stockService");
  const quote = await getStockQuote(symbol);
  let inversePE: number | null = null;
  if (quote && typeof quote.trailingPE === "number" && quote.trailingPE > 0) {
    inversePE = 1 / quote.trailingPE;
  }

  return { symbol, momentum6m, reversal5d, inversePE };
}

export async function computeAndUpsertSignalsForUniverse(): Promise<{
  processed: number;
  persisted: number;
}> {
  const universe = getSignalUniverse();
  const rows: FactorRow[] = [];
  for (const symbol of universe) {
    try {
      rows.push(await factorsForSymbol(symbol));
    } catch (err) {
      console.warn(`[SignalService] factor fetch failed for ${symbol}:`, err);
      rows.push({ symbol, momentum6m: null, reversal5d: null, inversePE: null });
    }
  }

  // Cross-sectional z-scores for each factor
  const zMom = zScore(rows.map((r) => r.momentum6m ?? NaN));
  // Short-reversal: a negative 5D return becomes a bullish contribution.
  const zRev = (() => {
    const inverted = rows.map((r) =>
      r.reversal5d === null ? NaN : -r.reversal5d,
    );
    return zScore(inverted);
  })();
  const zVal = zScore(rows.map((r) => r.inversePE ?? NaN));

  let persisted = 0;
  for (const r of rows) {
    const mom = zMom(r.momentum6m ?? NaN);
    const rev = zRev(r.reversal5d === null ? NaN : -r.reversal5d);
    const val = zVal(r.inversePE ?? NaN);
    // Weighted sum — momentum carries more weight than reversal and value
    // at this horizon, matching typical cross-sectional equity priors.
    const composite = 0.55 * mom + 0.2 * rev + 0.25 * val;

    const stance = mapStance(composite);
    const confidenceBand = mapConfidenceBand(Math.abs(composite));
    const drivers = buildDrivers(r);
    const risks = buildRiskFlags(r);

    try {
      await upsertSignal({
        symbol: r.symbol,
        horizon: "20D",
        stance,
        score: Number(composite.toFixed(4)),
        confidenceBand,
        topDrivers: drivers,
        riskFlags: risks,
        publicationStatus: "internal_only",
      });
      persisted++;
    } catch (err) {
      console.error(`[SignalService] upsert failed for ${r.symbol}:`, err);
    }
  }

  console.log(
    `[SignalService] Computed signals for ${rows.length} symbols, persisted ${persisted}`,
  );
  return { processed: rows.length, persisted };
}

// ─── Scheduler ─────────────────────────────────────────────────────
// Piggybacks on node-cron like newsService / ideafarmService.
export function startSignalScheduler(): void {
  // Guard so module-load time doesn't block server start if cron isn't wanted.
  if (process.env.DISABLE_SIGNAL_SCHEDULER === "1") {
    console.log("[SignalService] Scheduler disabled via env");
    return;
  }
  // Use sql`` noop to keep drizzle import alive if the scheduler runs in a
  // worker context later. Currently the scheduler is in-process.
  void sql;

  // Dynamic import so a failed cron install doesn't break app boot.
  void (async () => {
    try {
      const cron = (await import("node-cron")).default;
      // Daily 22:10 UTC (~post US close + buffer)
      cron.schedule("10 22 * * 1-5", () => {
        console.log("[SignalService] Scheduled run starting");
        computeAndUpsertSignalsForUniverse().catch((err) =>
          console.error("[SignalService] Scheduled run failed:", err),
        );
      });
      console.log(
        "[SignalService] Scheduler started (compute: 22:10 UTC weekdays)",
      );
    } catch (err) {
      console.warn("[SignalService] Could not install cron:", err);
    }
  })();
}
