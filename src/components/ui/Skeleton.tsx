import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function HomeSkeleton() {
  return (
    <div className="px-5 pt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-16 rounded-full" />
      </div>

      {/* Main card */}
      <Skeleton className="h-36 w-full rounded-2xl" />

      {/* Section header */}
      <Skeleton className="h-5 w-20" />

      {/* List items */}
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}

export function TransactionListSkeleton() {
  return (
    <div className="space-y-4 animate-in">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-18 w-full rounded-2xl" />
      <Skeleton className="h-18 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-4 w-36" />
      <Skeleton className="h-18 w-full rounded-2xl" />
      <Skeleton className="h-18 w-full rounded-2xl" />
      <Skeleton className="h-18 w-full rounded-2xl" />
    </div>
  );
}
