"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/**
 * Slider — Radix wrapper that supports both single-value and range
 * (two-thumb) sliders. Matches the ARFA design tokens.
 *
 *   <Slider value={[3]} onValueChange={(v) => …} min={1} max={7} step={1} />
 *   <Slider value={[2, 6]} onValueChange={(v) => …} min={1} max={7} step={1} />
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    {/* Render one Thumb per value entry — Radix maps value[] → thumb count. */}
    {Array.isArray(props.value) &&
      props.value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={i === 0 ? "Minimum" : "Maximum"}
          className="block h-4 w-4 rounded-full border-2 border-primary bg-surface-1 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
