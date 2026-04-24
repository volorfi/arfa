import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-36 rounded-lg" />
      <div className="rounded-lg border border-border bg-card shadow-xs">
        <Skeleton className="h-12 rounded-none rounded-t-lg" />
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
