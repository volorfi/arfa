import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";

export type BrandVariant =
  | "icon" // Just the triangle mark
  | "wordmark-horizontal" // Mark + ARFA wordmark side-by-side (compact)
  | "horizontal-tagline" // Mark + ARFA + tagline row
  | "full-vertical" // Mark on top, ARFA, then tagline stacked
  | "square-full"; // Square composition: mark + ARFA + tagline stacked tighter

type Finish = "navy" | "silver";

type Props = {
  variant: BrandVariant;
  /** Height in px. Width auto-scales by the image's aspect ratio. */
  size?: number;
  /** Override theme-derived finish. Defaults to navy on light theme,
   *  silver on dark theme. */
  finish?: Finish;
  className?: string;
  alt?: string;
};

const FILENAME_BY_VARIANT: Record<BrandVariant, string> = {
  icon: "arfa-icon.png",
  "wordmark-horizontal": "arfa-wordmark-horizontal.png",
  "horizontal-tagline": "arfa-horizontal-tagline.png",
  "full-vertical": "arfa-full-vertical.png",
  "square-full": "arfa-square-full.png",
};

// Approximate aspect ratios (w:h) of each variant so layout reserves space
// correctly before the image loads.
const ASPECT_BY_VARIANT: Record<BrandVariant, number> = {
  icon: 1,
  "wordmark-horizontal": 3.2,
  "horizontal-tagline": 3.8,
  "full-vertical": 0.86,
  "square-full": 1,
};

function resolveSrc(variant: BrandVariant, finish: Finish): string {
  return `/brand/${finish}/${FILENAME_BY_VARIANT[variant]}`;
}

/**
 * Navy SVG fallback rendered when the PNG asset isn't yet on disk. Keeps the
 * site visually consistent during the asset-rollout window without looking
 * like a broken image placeholder.
 */
function Fallback({ variant, size }: { variant: BrandVariant; size: number }) {
  const aspect = ASPECT_BY_VARIANT[variant];
  const width = size * aspect;
  const showWordmark = variant !== "icon";
  const showTagline =
    variant === "horizontal-tagline" ||
    variant === "full-vertical" ||
    variant === "square-full";
  const stacked = variant === "full-vertical" || variant === "square-full";

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width,
        height: size,
        flexDirection: stacked ? "column" : "row",
        gap: stacked ? size * 0.05 : size * 0.18,
      }}
      aria-hidden="true"
    >
      {/* Navy triangle mark — single-path SVG */}
      <svg
        viewBox="0 0 64 64"
        style={{ height: stacked ? size * 0.55 : size, width: "auto" }}
        fill="none"
      >
        <defs>
          <linearGradient id="arfa-bevel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b4670" />
            <stop offset="50%" stopColor="#1a2d52" />
            <stop offset="100%" stopColor="#0e1a36" />
          </linearGradient>
        </defs>
        <path
          d="M32 4 L60 60 L4 60 Z M32 16 L20 54 L44 54 L46 50 L26 50 L32 30 L38 48 L44 48 L32 16 Z"
          fillRule="evenodd"
          fill="url(#arfa-bevel)"
        />
      </svg>

      {showWordmark && (
        <div
          className="flex flex-col items-center leading-none"
          style={{ textAlign: stacked ? "center" : "left" }}
        >
          <span
            className="font-bold tracking-[0.12em] text-[#1a2d52]"
            style={{
              fontFamily: "var(--font-display, 'Space Grotesk', system-ui)",
              fontSize: stacked ? size * 0.28 : size * 0.62,
              letterSpacing: "0.12em",
            }}
          >
            ARFA
          </span>
          {showTagline && (
            <span
              className="text-[#1a2d52]/70 whitespace-nowrap"
              style={{
                fontSize: stacked ? size * 0.07 : size * 0.16,
                marginTop: stacked ? size * 0.04 : size * 0.02,
              }}
            >
              Architecture of Research for Financial Allocation
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function BrandMark({
  variant,
  size = 28,
  finish,
  className,
  alt = "ARFA — Architecture of Research for Financial Allocation",
}: Props) {
  const { theme } = useTheme();
  const resolvedFinish: Finish = finish ?? (theme === "dark" ? "silver" : "navy");
  const [failed, setFailed] = useState(false);
  const aspect = ASPECT_BY_VARIANT[variant];
  const width = Math.round(size * aspect);

  if (failed) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <Fallback variant={variant} size={size} />
      </div>
    );
  }

  return (
    <img
      src={resolveSrc(variant, resolvedFinish)}
      alt={alt}
      height={size}
      width={width}
      loading="eager"
      decoding="async"
      className={cn("select-none", className)}
      style={{ height: size, width: "auto", maxWidth: "100%" }}
      onError={() => setFailed(true)}
    />
  );
}
