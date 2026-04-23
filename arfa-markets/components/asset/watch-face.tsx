"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { FactorScore, Score } from "@/types/asset";

/**
 * WatchFace — the 12-factor dial used on the asset detail page.
 *
 * Layout
 *   · 12 arc segments around a donut, one per factor.
 *   · Slot N sits at N-o'clock (slot 12 = top, 3 = right, 6 = bottom, 9 = left).
 *   · Slots 1–6 are RETURN factors (green); slots 7–12 are RISK factors (red).
 *   · Each segment's fill intensity scales with its 1–7 score: the higher the
 *     score, the more saturated the colour.
 *       - return + high score = strong green (good)
 *       - risk   + high score = strong red   (bad: lots of risk)
 *   · The score number sits inside its segment; the factor label sits outside.
 *   · The composite ARFA Ratio fills the centre.
 *
 * Interaction
 *   · onSlotClick fires with the (1-based) slot number and its FactorScore so
 *     the parent can open the FactorDrawer.
 *
 * Sizing
 *   · The SVG uses a 0 0 400 400 viewBox and `width="100%"`, so it scales
 *     fluidly. Labels are sized in viewBox units; everything stays legible
 *     at 300–600 px wide.
 */

interface WatchFaceProps {
  /** Exactly 12 entries. factorScores[i] occupies slot i+1. */
  factorScores: FactorScore[];
  ratio: Score;
  className?: string;
  /** Called when a slot is clicked. Wires the drawer open in the parent. */
  onSlotClick?: (slot: number, factor: FactorScore) => void;
  /** Optional id of the slot to highlight (e.g. selected in drawer). */
  activeSlot?: number | null;
}

// ── Geometry constants ──────────────────────────────────────────────────────
const VIEW = 400;
const CX = 200;
const CY = 200;
const OUTER_R = 168;
const INNER_R = 108;
const LABEL_R = 188; // factor name (outside the donut)
const SCORE_R = (OUTER_R + INNER_R) / 2; // inside the segment
const CENTER_R = 92; // central white disc with ARFA ratio
const SEGMENT_GAP_DEG = 1.6; // gap between adjacent segments

// ── Color helper ────────────────────────────────────────────────────────────
/** Map a 1–7 score to a fill opacity for the segment. We keep the base hue
 *  fixed (success or destructive) and let opacity carry intensity, so the
 *  colour reads consistently regardless of theme. */
function scoreToOpacity(score: Score): number {
  // 1 → 0.20, 7 → 1.00. Linear; small enough delta between adjacent
  // scores to read as a gradient, large enough between extremes to read
  // as "light vs dark".
  return 0.2 + ((score - 1) / 6) * 0.8;
}

// ── Path helpers ────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  // 0° at the top, going clockwise. Convert to standard math angles
  // (which start at +x, going counter-clockwise) by subtracting 90°
  // and then negating because SVG's y-axis goes downward.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polar(cx, cy, outerR, startAngle);
  const endOuter = polar(cx, cy, outerR, endAngle);
  const startInner = polar(cx, cy, innerR, startAngle);
  const endInner = polar(cx, cy, innerR, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  // Outer arc clockwise from start → end, then inner arc counter-
  // clockwise back to start. Z to close.
  return [
    `M ${startOuter.x.toFixed(3)} ${startOuter.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(3)} ${endOuter.y.toFixed(3)}`,
    `L ${endInner.x.toFixed(3)} ${endInner.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x.toFixed(3)} ${startInner.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

// ── Component ───────────────────────────────────────────────────────────────
export function WatchFace({
  factorScores,
  ratio,
  className,
  onSlotClick,
  activeSlot = null,
}: WatchFaceProps) {
  if (factorScores.length !== 12) {
    // Fail loud in dev; render an empty SVG in prod so the page doesn't
    // throw. The asset analysis contract is "exactly 12 factors".
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        `WatchFace expected 12 factors, got ${factorScores.length}.`,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-label={`ARFA Ratio ${ratio} of 7, with 12 factor scores around the dial`}
      className={cn("h-full w-full select-none", className)}
    >
      <defs>
        {/* Subtle ground shadow on the central disc so it reads as raised. */}
        <filter id="wf-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="10"
            floodColor="hsl(var(--shadow-color))"
            floodOpacity="0.18"
          />
        </filter>
      </defs>

      {/* Faint outer guide ring */}
      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R + 14}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity="0.6"
      />

      {/* Vertical split — divides return (right) from risk (left) */}
      <line
        x1={CX}
        y1={CY - OUTER_R - 22}
        x2={CX}
        y2={CY + OUTER_R + 22}
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity="0.5"
      />

      {/* Side labels */}
      <text
        x={CX + OUTER_R + 8}
        y={CY - OUTER_R - 26}
        textAnchor="start"
        className="fill-success font-display"
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Return
      </text>
      <text
        x={CX - OUTER_R - 8}
        y={CY - OUTER_R - 26}
        textAnchor="end"
        className="fill-destructive font-display"
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Risk
      </text>

      {/* Slot segments */}
      {Array.from({ length: 12 }, (_, i) => {
        const slot = i + 1;
        const factor = factorScores[i];
        if (!factor) return null;

        const center = slot * 30; // slot 12 = 360° = top, slot 1 = 30°, etc.
        const start = center - 15 + SEGMENT_GAP_DEG / 2;
        const end = center + 15 - SEGMENT_GAP_DEG / 2;

        const labelPos = polar(CX, CY, LABEL_R, center);
        const scorePos = polar(CX, CY, SCORE_R, center);
        const isReturn = factor.factorType === "return";
        const fillVar = isReturn ? "--success" : "--destructive";
        const opacity = scoreToOpacity(factor.score);
        const isActive = activeSlot === slot;

        return (
          <g
            key={slot}
            className={cn(onSlotClick && "cursor-pointer outline-none")}
            tabIndex={onSlotClick ? 0 : undefined}
            role={onSlotClick ? "button" : undefined}
            aria-label={
              onSlotClick
                ? `${factor.label}: ${factor.score} of 7. Open details.`
                : undefined
            }
            onClick={() => onSlotClick?.(slot, factor)}
            onKeyDown={(e) => {
              if (!onSlotClick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSlotClick(slot, factor);
              }
            }}
          >
            {/* Hover/active outline ring (drawn first so the segment fill
                covers it where they overlap) */}
            {isActive && (
              <path
                d={arcSegmentPath(CX, CY, INNER_R - 4, OUTER_R + 4, start, end)}
                fill={`hsl(var(${fillVar}))`}
                opacity={0.18}
              />
            )}

            {/* Filled arc segment */}
            <path
              d={arcSegmentPath(CX, CY, INNER_R, OUTER_R, start, end)}
              fill={`hsl(var(${fillVar}))`}
              fillOpacity={opacity}
              stroke={`hsl(var(${fillVar}))`}
              strokeWidth="0.75"
              strokeOpacity={Math.min(1, opacity + 0.15)}
            />

            {/* Slot number inside the arc — picks black or white text
                automatically depending on opacity, so it stays readable
                across the gradient. */}
            <text
              x={scorePos.x}
              y={scorePos.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "font-display font-bold",
                opacity > 0.55 ? "fill-white" : isReturn ? "fill-success" : "fill-destructive",
              )}
              style={{ fontSize: "16px" }}
            >
              {factor.score}
            </text>

            {/* Factor label outside the arc */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={
                center > 350 || center < 10
                  ? "middle"
                  : center < 180
                    ? "start"
                    : "end"
              }
              dominantBaseline="central"
              className="fill-text-muted font-display"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {abbreviateLabel(factor.label)}
            </text>
          </g>
        );
      })}

      {/* Centre disc */}
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_R}
        fill="hsl(var(--surface-1))"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        filter="url(#wf-shadow)"
      />
      {/* Inner brand-coloured ring for emphasis */}
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_R - 8}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        opacity="0.35"
      />

      <text
        x={CX}
        y={CY - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-primary font-display font-bold"
        style={{ fontSize: "56px", letterSpacing: "-0.02em" }}
      >
        {ratio}
      </text>
      <text
        x={CX}
        y={CY + 32}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text-muted font-display"
        style={{
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        / 7 · ARFA
      </text>
    </svg>
  );
}

/** Abbreviate long factor labels so the watch face stays legible. The
 *  full name is always shown in the FactorCard below the dial, so the
 *  abbreviation here is just the visual cue. */
function abbreviateLabel(label: string): string {
  // Shortest unique prefix per known label. Falls through to the first
  // word for anything unrecognised.
  const map: Record<string, string> = {
    Valuation: "Valuation",
    Performance: "Performance",
    "Analyst View": "Analyst",
    "Market View": "Market",
    Profitability: "Profit",
    Carry: "Carry",
    Growth: "Growth",
    "Growth Backdrop": "Growth",
    Dividends: "Dividends",
    Coupons: "Coupons",
    Distributions: "Income",
    "Default Risk": "Default",
    "Issuer Risk": "Issuer",
    Volatility: "Volatility",
    "Stress Test": "Stress",
    "Selling Difficulty": "Liquidity",
    "Country Risks": "Country",
    "Other Risks": "Other",
  };
  return map[label] ?? label.split(/\s+/)[0] ?? label;
}
