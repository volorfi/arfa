import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The 12-factor "watch face" used in the hero.
 *
 * Twelve slots arranged around a central disc. Slots 1–6 sit on the right
 * half (return factors, green); slots 7–12 sit on the left half (risk
 * factors, red). Each slot is offset 15° from the 6/12 axis so the split is
 * cleanly right/left rather than ambiguous at 12 o'clock.
 *
 *   slot 1  →  top-right    (15°  clockwise from top)
 *   slot 6  →  bottom-right (165°)
 *   slot 7  →  bottom-left  (195°)
 *   slot 12 →  top-left     (345°)
 *
 * Centre disc displays the composite ARFA Ratio (defaults to "6 / 7").
 */

interface WatchFaceProps {
  score?: number;
  scale?: number;
  className?: string;
}

const CX = 200;
const CY = 200;
const DOT_RADIUS = 148;
const LABEL_RADIUS = 182;
const CENTER_RADIUS = 68;

function slotPosition(slot: number, radius: number) {
  const angleDeg = 15 + (slot - 1) * 30; // 15°, 45°, ..., 345°
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.sin(angleRad),
    y: CY - radius * Math.cos(angleRad),
  };
}

export function WatchFace({
  score = 6,
  scale = 7,
  className,
}: WatchFaceProps) {
  const slots = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={`ARFA composite score ${score} out of ${scale}, twelve factors`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        {/* Subtle soft-shadow for the central disc so it feels raised. */}
        <filter id="arfa-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="12"
            floodColor="hsl(var(--shadow-color))"
            floodOpacity="0.15"
          />
        </filter>
      </defs>

      {/* Outer guide ring — very faint */}
      <circle
        cx={CX}
        cy={CY}
        r={DOT_RADIUS + 18}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity="0.6"
      />

      {/* Vertical split line showing the right / left divide */}
      <line
        x1={CX}
        y1={CY - DOT_RADIUS - 28}
        x2={CX}
        y2={CY + DOT_RADIUS + 28}
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity="0.5"
      />

      {/* Slot dots + labels */}
      {slots.map((slot) => {
        const isReturn = slot <= 6;
        const dot = slotPosition(slot, DOT_RADIUS);
        const label = slotPosition(slot, LABEL_RADIUS);

        return (
          <g key={slot}>
            {/* Dot */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r={14}
              fill={
                isReturn
                  ? "hsl(var(--success) / 0.12)"
                  : "hsl(var(--destructive) / 0.12)"
              }
              stroke={
                isReturn
                  ? "hsl(var(--success))"
                  : "hsl(var(--destructive))"
              }
              strokeWidth="1.5"
            />
            {/* Slot number inside the dot */}
            <text
              x={dot.x}
              y={dot.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "font-display text-xs font-semibold",
                isReturn ? "fill-success" : "fill-destructive",
              )}
              style={{ fontSize: "13px" }}
            >
              {slot}
            </text>
            {/* Outer label number (pairs with the dot for emphasis) */}
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-text-faint font-display text-xs font-medium"
              style={{ fontSize: "11px" }}
            >
              {String(slot).padStart(2, "0")}
            </text>
          </g>
        );
      })}

      {/* Central score badge */}
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_RADIUS}
        fill="hsl(var(--surface-1))"
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
        filter="url(#arfa-shadow)"
      />
      {/* Ring behind the score number, in brand teal */}
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_RADIUS - 8}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        opacity="0.25"
      />
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-primary font-display font-bold"
        style={{ fontSize: "44px", letterSpacing: "-0.02em" }}
      >
        {score}
      </text>
      <text
        x={CX}
        y={CY + 28}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text-muted font-display"
        style={{ fontSize: "12px", letterSpacing: "0.08em" }}
      >
        / {scale} · ARFA
      </text>

      {/* Side labels */}
      <text
        x={CX + DOT_RADIUS + 34}
        y={CY - DOT_RADIUS - 14}
        textAnchor="start"
        className="fill-success font-display font-semibold uppercase tracking-widest"
        style={{ fontSize: "10px", letterSpacing: "0.14em" }}
      >
        Return
      </text>
      <text
        x={CX - DOT_RADIUS - 34}
        y={CY - DOT_RADIUS - 14}
        textAnchor="end"
        className="fill-destructive font-display font-semibold uppercase tracking-widest"
        style={{ fontSize: "10px", letterSpacing: "0.14em" }}
      >
        Risk
      </text>
    </svg>
  );
}
