/**
 * ArfaLogo.tsx — Official ARFA brand mark
 *
 * Variants:
 *   "mark"      — delta icon only (sidebar collapsed, favicon contexts)
 *   "horizontal" — mark + "ARFA" wordmark side by side (sidebar expanded, mobile header)
 *   "stacked"   — mark above wordmark + tagline (footer, about page)
 *   "full"      — large stacked with full tagline (landing page hero)
 *
 * Theme:
 *   "dark"   — silver/white on dark (sidebar, dark backgrounds)
 *   "light"  — dark navy on light (footer light mode, print)
 *   "auto"   — respects CSS currentColor (default)
 */

import { cn } from "@/lib/utils";

interface ArfaLogoProps {
  variant?: "mark" | "horizontal" | "stacked" | "full";
  theme?:   "dark" | "light" | "auto";
  size?:    "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

// ── The delta mark as a pure SVG path ─────────────────────────────────────────
// Constructed from the uploaded ARFA logo:
// - Outer upward triangle
// - Inner left face (darker — shadow plane)
// - Inner right face (lighter — lit plane)
// Creates the 3D architectural delta/chevron look

function ArfaMark({ size = 32, theme = "auto" }: { size: number; theme: string }) {
  const isDark  = theme === "dark";
  const isLight = theme === "light";

  // Colour system
  const silver    = isDark ? "#D4D8E0" : isLight ? "#1a2236" : "currentColor";
  const highlight = isDark ? "#F0F2F6" : isLight ? "#2d3d5c" : "currentColor";
  const shadow    = isDark ? "#8A9BB5" : isLight ? "#4a5a7a" : "currentColor";
  const deep      = isDark ? "#5A6A85" : isLight ? "#6a7a9a" : "currentColor";
  const stroke    = isDark ? "rgba(255,255,255,0.08)" : isLight ? "rgba(0,0,0,0.06)" : "transparent";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ARFA delta mark"
    >
      {/* Outer triangle — main body */}
      <path
        d="M50 4 L96 88 L4 88 Z"
        fill={silver}
        stroke={stroke}
        strokeWidth="0.5"
      />

      {/* Left inner face — shadow plane (creates 3D depth) */}
      <path
        d="M50 4 L50 62 L4 88 Z"
        fill={deep}
        opacity="0.85"
      />

      {/* Right inner face — lit plane */}
      <path
        d="M50 4 L96 88 L50 62 Z"
        fill={shadow}
        opacity="0.7"
      />

      {/* Inner cutout — the negative space chevron that gives it the 'open delta' feel */}
      <path
        d="M50 28 L76 78 L24 78 Z"
        fill={isDark ? "#0f1623" : isLight ? "#f8f9fb" : "var(--background, #0f1623)"}
      />

      {/* Inner cutout left face highlight */}
      <path
        d="M50 28 L50 56 L24 78 Z"
        fill={highlight}
        opacity="0.12"
      />

      {/* Top apex gleam */}
      <path
        d="M50 4 L56 18 L50 16 L44 18 Z"
        fill={highlight}
        opacity="0.6"
      />
    </svg>
  );
}

// ── Size scales ───────────────────────────────────────────────────────────────
const markSizes = { xs: 18, sm: 24, md: 32, lg: 48, xl: 72 };
const textScales = {
  xs: { wordmark: "text-[11px]", sub: "text-[7px]",  tagline: "text-[8px]"  },
  sm: { wordmark: "text-[13px]", sub: "text-[8px]",  tagline: "text-[9px]"  },
  md: { wordmark: "text-[16px]", sub: "text-[9px]",  tagline: "text-[10px]" },
  lg: { wordmark: "text-[22px]", sub: "text-[11px]", tagline: "text-[12px]" },
  xl: { wordmark: "text-[30px]", sub: "text-[13px]", tagline: "text-[14px]" },
};

// ── Colour classes ────────────────────────────────────────────────────────────
function colorClasses(theme: string) {
  if (theme === "dark")  return { primary: "text-white",        muted: "text-white/50"  };
  if (theme === "light") return { primary: "text-[#1a2236]",    muted: "text-[#1a2236]/50" };
  return                        { primary: "text-foreground",   muted: "text-muted-foreground" };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArfaLogo({
  variant   = "horizontal",
  theme     = "auto",
  size      = "sm",
  className,
  onClick,
}: ArfaLogoProps) {
  const markPx = markSizes[size];
  const text   = textScales[size];
  const colors = colorClasses(theme);

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex shrink-0", className)} onClick={onClick}>
        <ArfaMark size={markPx} theme={theme} />
      </span>
    );
  }

  if (variant === "horizontal") {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)} onClick={onClick}>
        <ArfaMark size={markPx} theme={theme} />
        <span className="flex flex-col leading-none">
          <span
            className={cn("font-bold tracking-[0.12em] uppercase", text.wordmark, colors.primary)}
            style={{ fontFamily: "var(--font-display, 'Geist', sans-serif)", letterSpacing: "0.14em" }}
          >
            ARFA
          </span>
          <span className={cn("tracking-[0.18em] uppercase mt-0.5", text.sub, colors.muted)}>
            Global Markets
          </span>
        </span>
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-2", className)} onClick={onClick}>
        <ArfaMark size={markPx} theme={theme} />
        <span className="flex flex-col items-center leading-none gap-1">
          <span
            className={cn("font-bold tracking-[0.18em] uppercase", text.wordmark, colors.primary)}
            style={{ fontFamily: "var(--font-display, 'Geist', sans-serif)" }}
          >
            ARFA
          </span>
          <span className={cn("tracking-[0.12em] uppercase", text.sub, colors.muted)}>
            Global Markets
          </span>
        </span>
      </span>
    );
  }

  // "full" — large with complete tagline
  return (
    <span className={cn("inline-flex flex-col items-center gap-3", className)} onClick={onClick}>
      <ArfaMark size={markPx} theme={theme} />
      <span className="flex flex-col items-center leading-none gap-1.5">
        <span
          className={cn("font-bold tracking-[0.22em] uppercase", text.wordmark, colors.primary)}
          style={{ fontFamily: "var(--font-display, 'Geist', sans-serif)" }}
        >
          ARFA
        </span>
        <span className={cn("tracking-[0.08em]", text.tagline, colors.muted)}>
          Architecture of Research for Financial Allocation
        </span>
      </span>
    </span>
  );
}
