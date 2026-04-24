import { Skeleton } from "@/components/ui/skeleton";

export default function AssetHistoryLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-7 w-32" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-44" />
        </div>
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
