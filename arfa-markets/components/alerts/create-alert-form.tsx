"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { canAccess } from "@/lib/plans";
import {
  ALERT_FACTOR_KEYS,
  DELIVERY_LABELS,
  type AlertCondition,
  type AlertDeliveryMethod,
  factorLabel,
} from "@/lib/alerts";
import { createAlert } from "@/app/actions/alerts";
import { trackEvent } from "@/lib/analytics";
import { SCREENER_ROWS } from "@/lib/mock/screener";

/**
 * Create-alert form — asset picker → trigger config → delivery method.
 *
 * Three-step state:
 *   1. Search-pick the asset
 *   2. Choose condition kind (radio) + per-kind inputs
 *   3. Pick delivery channel (radio)
 *      → button enabled
 */

type ConditionKind = AlertCondition["kind"];

type AssetHit = (typeof SCREENER_ROWS)[number];

export function CreateAlertForm() {
  const { user } = useUser();
  const userPlan = user?.plan ?? "FREE";
  const realtimeAllowed = canAccess(userPlan, "realtime-alerts");

  // Asset
  const [query, setQuery] = React.useState("");
  const [asset, setAsset] = React.useState<AssetHit | null>(null);

  // Condition
  const [kind, setKind] = React.useState<ConditionKind>("ratio_change");
  const [delta, setDelta] = React.useState("1");
  const [factorKey, setFactorKey] = React.useState(ALERT_FACTOR_KEYS[0]);
  const [factorThreshold, setFactorThreshold] = React.useState("4");
  const [riskThreshold, setRiskThreshold] = React.useState("5");
  const [riskDirection, setRiskDirection] = React.useState<"above" | "below">("above");

  // Delivery
  const [delivery, setDelivery] = React.useState<AlertDeliveryMethod>("IN_APP");

  const [pending, setPending] = React.useState(false);

  const matches = React.useMemo(() => {
    if (asset) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SCREENER_ROWS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ticker.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query, asset]);

  function buildCondition(): AlertCondition | null {
    switch (kind) {
      case "ratio_change": {
        const n = Number(delta);
        if (!Number.isFinite(n) || n <= 0) return null;
        return { kind, delta: n };
      }
      case "factor_drop":
      case "factor_rise": {
        const n = Number(factorThreshold);
        if (!Number.isFinite(n) || n < 1 || n > 7) return null;
        return { kind, factorKey: factorKey!, threshold: n };
      }
      case "risk_threshold": {
        const n = Number(riskThreshold);
        if (!Number.isFinite(n) || n < 1 || n > 7) return null;
        return { kind, threshold: n, direction: riskDirection };
      }
    }
  }

  function reset() {
    setQuery("");
    setAsset(null);
    setKind("ratio_change");
    setDelta("1");
    setFactorThreshold("4");
    setRiskThreshold("5");
    setRiskDirection("above");
    setDelivery("IN_APP");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) {
      toast.error("Pick an asset first.");
      return;
    }
    const condition = buildCondition();
    if (!condition) {
      toast.error("Check your trigger inputs.");
      return;
    }
    setPending(true);
    try {
      await createAlert({
        assetId: asset.assetId,
        assetName: asset.name,
        ticker: asset.ticker,
        condition,
        deliveryMethod: delivery,
      });
      trackEvent("alert_created", {
        assetId: asset.assetId,
        ticker: asset.ticker,
        kind: condition.kind,
        deliveryMethod: delivery,
      });
      toast.success(`Alert created for ${asset.ticker}`);
      reset();
    } catch (err) {
      toast.error("Could not create alert", {
        description: err instanceof Error ? err.message : "Unknown error.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 md:p-6">
        <header>
          <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
            New alert
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Get notified when an asset&apos;s ARFA score crosses a threshold
            you care about.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Asset picker */}
          <div className="relative">
            <label className="mb-1 block text-[11px] font-medium text-text-muted">
              Asset
            </label>
            {asset ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                <span className="truncate">
                  <span className="font-medium text-text-primary">{asset.name}</span>{" "}
                  <span className="text-text-muted">({asset.ticker})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAsset(null)}
                  className="text-xs text-text-muted underline-offset-2 hover:underline"
                >
                  change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  placeholder="Search by name or ticker…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={pending}
                  className="block h-9 w-full rounded-md border border-border bg-surface-1 px-3 text-sm text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {matches.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface-1 shadow-lg">
                    {matches.map((r) => (
                      <li key={r.assetId}>
                        <button
                          type="button"
                          onClick={() => {
                            setAsset(r);
                            setQuery("");
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text-primary"
                        >
                          <span className="font-medium text-text-primary">{r.name}</span>
                          <span className="font-mono text-xs">{r.ticker}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Trigger */}
          <fieldset>
            <legend className="mb-2 text-[11px] font-medium text-text-muted">
              Trigger
            </legend>
            <div className="grid gap-2">
              <RadioRow
                value="ratio_change"
                checked={kind === "ratio_change"}
                onChange={() => setKind("ratio_change")}
                label="ARFA Ratio changes by"
                disabled={pending}
              >
                <NumInput
                  value={delta}
                  onChange={setDelta}
                  step="0.5"
                  min="0.5"
                  max="6"
                  suffix=" pts"
                  disabled={pending || kind !== "ratio_change"}
                />
              </RadioRow>

              <RadioRow
                value="factor_drop"
                checked={kind === "factor_drop"}
                onChange={() => setKind("factor_drop")}
                label="Factor drops below"
                disabled={pending}
              >
                <FactorPicker
                  value={factorKey!}
                  onChange={(k) => setFactorKey(k as typeof factorKey)}
                  disabled={pending || kind !== "factor_drop"}
                />
                <NumInput
                  value={factorThreshold}
                  onChange={setFactorThreshold}
                  step="1"
                  min="1"
                  max="7"
                  disabled={pending || kind !== "factor_drop"}
                />
              </RadioRow>

              <RadioRow
                value="factor_rise"
                checked={kind === "factor_rise"}
                onChange={() => setKind("factor_rise")}
                label="Factor rises above"
                disabled={pending}
              >
                <FactorPicker
                  value={factorKey!}
                  onChange={(k) => setFactorKey(k as typeof factorKey)}
                  disabled={pending || kind !== "factor_rise"}
                />
                <NumInput
                  value={factorThreshold}
                  onChange={setFactorThreshold}
                  step="1"
                  min="1"
                  max="7"
                  disabled={pending || kind !== "factor_rise"}
                />
              </RadioRow>

              <RadioRow
                value="risk_threshold"
                checked={kind === "risk_threshold"}
                onChange={() => setKind("risk_threshold")}
                label="Risk Score crosses"
                disabled={pending}
              >
                <select
                  value={riskDirection}
                  onChange={(e) =>
                    setRiskDirection(e.target.value as "above" | "below")
                  }
                  disabled={pending || kind !== "risk_threshold"}
                  className="h-8 rounded-md border border-border bg-surface-1 px-2 text-sm"
                >
                  <option value="above">above</option>
                  <option value="below">below</option>
                </select>
                <NumInput
                  value={riskThreshold}
                  onChange={setRiskThreshold}
                  step="1"
                  min="1"
                  max="7"
                  disabled={pending || kind !== "risk_threshold"}
                />
              </RadioRow>
            </div>
          </fieldset>

          {/* Delivery */}
          <fieldset>
            <legend className="mb-2 text-[11px] font-medium text-text-muted">
              Delivery
            </legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DELIVERY_LABELS) as AlertDeliveryMethod[]).map((d) => {
                const active = delivery === d;
                const isPush = d === "PUSH";
                const lockedForPlan = isPush && !realtimeAllowed;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    aria-disabled={lockedForPlan}
                    disabled={pending || lockedForPlan}
                    onClick={() => !lockedForPlan && setDelivery(d)}
                    title={
                      lockedForPlan
                        ? "Real-time push alerts require Pro."
                        : DELIVERY_LABELS[d]
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active && !lockedForPlan
                        ? "border-primary bg-primary/10 text-primary"
                        : lockedForPlan
                          ? "cursor-not-allowed border-border bg-surface-2 text-text-faint"
                          : "border-border bg-surface-1 text-text-muted hover:bg-surface-2 hover:text-text-primary",
                    )}
                  >
                    {DELIVERY_LABELS[d]}
                    {isPush && !realtimeAllowed && (
                      <span className="ml-1 text-[9px] uppercase tracking-widest">
                        Pro
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Button
            type="submit"
            disabled={pending || !asset}
            className="w-full md:w-auto md:self-start"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create alert
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RadioRow({
  value,
  checked,
  onChange,
  label,
  children,
  disabled,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 transition-colors",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-surface-1 hover:border-text-faint",
      )}
    >
      <input
        type="radio"
        name="alert-trigger"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 accent-primary"
      />
      <span className="text-sm text-text-primary">{label}</span>
      <span className="ml-auto flex items-center gap-2">{children}</span>
    </label>
  );
}

function NumInput({
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  max?: string;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="h-8 w-16 rounded-md border border-border bg-surface-1 px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      {suffix && (
        <span className="text-xs text-text-muted">{suffix}</span>
      )}
    </span>
  );
}

function FactorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-8 rounded-md border border-border bg-surface-1 px-2 text-sm disabled:opacity-50"
    >
      {ALERT_FACTOR_KEYS.map((k) => (
        <option key={k} value={k}>
          {factorLabel(k)}
        </option>
      ))}
    </select>
  );
}
