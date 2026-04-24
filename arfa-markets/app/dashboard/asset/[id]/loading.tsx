import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton roughly matching the asset detail layout: header, two-up
 *  ratio + watch-face, factor grid, history chart. */
export default function AssetDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* Ratio + watch-face row */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr,1fr]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="aspect-square w-full max-w-[460px] rounded-lg" />
      </div>

      {/* 12-card factor grid */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="flex flex-col gap-3">
            <Skeleton className="mb-1 h-3 w-32" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((__, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* History chart */}
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}
