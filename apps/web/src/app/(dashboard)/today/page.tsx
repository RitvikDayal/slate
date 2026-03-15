import { Suspense } from "react";
import { ViewErrorBoundary } from "@/components/providers/view-error-boundary";
import { TodayView } from "@/components/today/today-view";

export default function TodayPage() {
  return (
    <ViewErrorBoundary>
      <div className="relative h-full">
        <Suspense fallback={<TodayViewSkeleton />}>
          <TodayView />
        </Suspense>
      </div>
    </ViewErrorBoundary>
  );
}

function TodayViewSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
