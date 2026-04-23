import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ARFA logo — inline SVG geometric mark + optional wordmark.
 *
 * The mark is a stylised "A" composed of a solid outer triangle with an
 * inset cut creating a second, nested triangle. Uses `currentColor` so it
 * inherits teal from a parent `.text-primary` className.
 *
 * Variants:
 *   mark      Just the geometric mark
 *   wordmark  Mark + "ARFA" wordmark side-by-side (default)
 */
export function ArfaLogo({
  variant = "wordmark",
  className,
  ariaLabel = "ARFA",
}: {
  variant?: "mark" | "wordmark";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-primary", className)}
      aria-label={ariaLabel}
      role="img"
    >
      <Mark className="h-6 w-6" />
      {variant === "wordmark" && (
        <span className="font-display text-base font-bold tracking-tight text-text-primary">
          ARFA
        </span>
      )}
    </span>
  );
}

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer triangle — filled teal */}
      <path
        d="M16 3 L29 27 L3 27 Z"
        fill="currentColor"
      />
      {/* Inner cutout — creates the second inset triangle */}
      <path
        d="M16 10 L23.5 24.5 L10.5 24.5 Z"
        fill="hsl(var(--background))"
      />
      {/* Small central mark — a reinforced inner triangle */}
      <path
        d="M16 16 L20 23 L12 23 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export { Mark as ArfaMark };
