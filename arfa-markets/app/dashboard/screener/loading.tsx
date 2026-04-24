import { Skeleton } from "@/components/ui/skeleton";

export default function ScreenerLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px,1fr] xl:grid-cols-[320px,1fr]">
        <Skeleton className="h-[460px] rounded-lg" />
        <div className="rounded-lg border border-border bg-card shadow-xs">
          <Skeleton className="h-12 rounded-none rounded-t-lg" />
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
