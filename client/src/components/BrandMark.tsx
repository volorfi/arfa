import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

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
  icon: "arfa-icon.jpg",
  "wordmark-horizontal": "arfa-wordmark-horizontal.jpg",
  "horizontal-tagline": "arfa-horizontal-tagline.jpg",
  "full-vertical": "arfa-full-vertical.jpg",
  "square-full": "arfa-square-full.jpg",
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

export function BrandMark({
  variant,
  size = 28,
  finish,
  className,
  alt = "ARFA — Architecture of Research for Financial Allocation",
}: Props) {
  const { theme } = useTheme();
  const resolvedFinish: Finish = finish ?? (theme === "dark" ? "silver" : "navy");
  const aspect = ASPECT_BY_VARIANT[variant];
  const width = Math.round(size * aspect);

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
    />
  );
}
