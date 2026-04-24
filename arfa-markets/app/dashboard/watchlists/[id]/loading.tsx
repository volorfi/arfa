import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div className="rounded-lg border border-border bg-card shadow-xs">
        <Skeleton className="h-12 rounded-none rounded-t-lg" />
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
