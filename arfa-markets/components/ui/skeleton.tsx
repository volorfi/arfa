import { cn } from "@/lib/utils";

/** Basic shimmer block. Pulses via Tailwind animate-pulse on the
 *  surface-2 token. Use multiple to mock the rough shape of the
 *  real layout. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-pulse rounded-md bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
