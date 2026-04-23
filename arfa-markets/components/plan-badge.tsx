import * as React from "react";
import { cn } from "@/lib/utils";

/** SubscriptionPlan as stored in Prisma. Duplicated here (instead of
 *  importing `$Enums.SubscriptionPlan`) so this component is usable from
 *  client bundles without pulling in Prisma. */
export type SubscriptionPlanValue = "FREE" | "PREMIUM" | "PRO";

interface PlanBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  plan: SubscriptionPlanValue;
  /** Dim styling when rendered in a list of other plans (e.g. pricing table). */
  muted?: boolean;
}

const STYLES: Record<
  SubscriptionPlanValue,
  { label: string; className: string }
> = {
  FREE: {
    label: "Free",
    className: "border-border bg-surface-2 text-text-muted",
  },
  PREMIUM: {
    label: "Premium",
    // Brand teal — only used here and on CTAs (per design spec).
    className: "border-transparent bg-primary/10 text-primary",
  },
  PRO: {
    label: "Pro",
    // Warm amber — distinct from teal, still within the warm palette.
    className:
      "border-transparent bg-[hsl(36_90%_44%_/_0.14)] text-[hsl(36_85%_38%)] dark:text-[hsl(36_80%_62%)]",
  },
};

export function PlanBadge({
  plan,
  muted = false,
  className,
  ...props
}: PlanBadgeProps) {
  const style = STYLES[plan];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-display text-xs font-semibold uppercase tracking-wider",
        style.className,
        muted && "opacity-60",
        className,
      )}
      {...props}
    >
      {style.label}
    </span>
  );
}
