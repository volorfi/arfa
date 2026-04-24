/**
 * Alert types — the canonical condition shapes stored as JSON on the
 * `Alert.conditionJson` column, plus humanising helpers used by the
 * alerts list to render natural-language descriptions.
 */

import type { FactorKey } from "@/types/asset";

// ── Discriminated union: alert conditions ───────────────────────────────────

export type AlertCondition =
  /** ARFA Ratio moves by ±delta in a single refresh. */
  | { kind: "ratio_change"; delta: number }
  /** Specific factor score drops below `threshold` (e.g. Valuation < 4). */
  | { kind: "factor_drop"; factorKey: FactorKey; threshold: number }
  /** Specific factor score rises above `threshold` (e.g. Volatility > 5). */
  | { kind: "factor_rise"; factorKey: FactorKey; threshold: number }
  /** Overall risk score crosses `threshold` in `direction`. */
  | { kind: "risk_threshold"; threshold: number; direction: "above" | "below" };

export type AlertConditionKind = AlertCondition["kind"];

// Maps the discriminator → Prisma AlertType enum value, so storing/
// querying alerts by type stays consistent with the JSON payload.
export const KIND_TO_PRISMA_TYPE: Record<
  AlertConditionKind,
  "ARFA_RATIO_CHANGE" | "FACTOR_DROP" | "FACTOR_RISE" | "RISK_THRESHOLD"
> = {
  ratio_change: "ARFA_RATIO_CHANGE",
  factor_drop: "FACTOR_DROP",
  factor_rise: "FACTOR_RISE",
  risk_threshold: "RISK_THRESHOLD",
};

// Reverse lookup for rendering rows fetched from Prisma.
export const PRISMA_TYPE_TO_KIND: Record<string, AlertConditionKind | undefined> = {
  ARFA_RATIO_CHANGE: "ratio_change",
  FACTOR_DROP: "factor_drop",
  FACTOR_RISE: "factor_rise",
  RISK_THRESHOLD: "risk_threshold",
};

// ── Delivery method ─────────────────────────────────────────────────────────

export type AlertDeliveryMethod = "IN_APP" | "EMAIL" | "PUSH";

export const DELIVERY_LABELS: Record<AlertDeliveryMethod, string> = {
  IN_APP: "In-app",
  EMAIL: "Email",
  PUSH: "Real-time push",
};

/** Plan tier required for each delivery channel. PUSH is Pro-only. */
export const DELIVERY_REQUIRED_PLAN: Record<
  AlertDeliveryMethod,
  "PREMIUM" | "PRO"
> = {
  IN_APP: "PREMIUM",
  EMAIL: "PREMIUM",
  PUSH: "PRO",
};

// ── Factor labels (subset shown in the alert form) ──────────────────────────

const FACTOR_LABELS: Partial<Record<FactorKey, string>> = {
  valuation: "Valuation",
  performance: "Performance",
  analyst_view: "Analyst View",
  market_view: "Market View",
  profitability: "Profitability",
  growth: "Growth",
  dividends: "Dividends",
  coupons: "Coupons",
  default_risk: "Default Risk",
  volatility: "Volatility",
  stress_test: "Stress Test",
  selling_difficulty: "Liquidity",
  country_risks: "Country Risks",
  other_risks: "Other Risks",
};

export function factorLabel(key: FactorKey): string {
  return FACTOR_LABELS[key] ?? key;
}

/** Factor keys exposed in the alert builder (return + risk universe). */
export const ALERT_FACTOR_KEYS: FactorKey[] = [
  "valuation",
  "performance",
  "analyst_view",
  "profitability",
  "growth",
  "dividends",
  "default_risk",
  "volatility",
  "stress_test",
  "selling_difficulty",
  "country_risks",
  "other_risks",
];

// ── Humanising the condition for the list ───────────────────────────────────

/** Render a single-line description of an alert condition for the table. */
export function describeCondition(cond: AlertCondition): string {
  switch (cond.kind) {
    case "ratio_change":
      return `ARFA Ratio changes by ±${cond.delta}`;
    case "factor_drop":
      return `${factorLabel(cond.factorKey)} drops below ${cond.threshold}`;
    case "factor_rise":
      return `${factorLabel(cond.factorKey)} rises above ${cond.threshold}`;
    case "risk_threshold":
      return `Risk Score crosses ${cond.direction} ${cond.threshold}`;
  }
}

/** Defensive parse of the JSON column. Returns null if the row is from
 *  an older format or got corrupted. */
export function parseCondition(json: unknown): AlertCondition | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  switch (o.kind) {
    case "ratio_change":
      return typeof o.delta === "number"
        ? { kind: "ratio_change", delta: o.delta }
        : null;
    case "factor_drop":
      return typeof o.threshold === "number" && typeof o.factorKey === "string"
        ? {
            kind: "factor_drop",
            factorKey: o.factorKey as FactorKey,
            threshold: o.threshold,
          }
        : null;
    case "factor_rise":
      return typeof o.threshold === "number" && typeof o.factorKey === "string"
        ? {
            kind: "factor_rise",
            factorKey: o.factorKey as FactorKey,
            threshold: o.threshold,
          }
        : null;
    case "risk_threshold":
      return typeof o.threshold === "number" &&
        (o.direction === "above" || o.direction === "below")
        ? {
            kind: "risk_threshold",
            threshold: o.threshold,
            direction: o.direction,
          }
        : null;
    default:
      return null;
  }
}
