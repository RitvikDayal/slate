export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 animate-pulse rounded bg-muted/50" />
        <div className="h-7 w-28 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/50" />
          <div className="h-20 w-3/4 animate-pulse rounded-lg bg-muted/50" />
        </div>
        <div className="flex gap-3 self-end">
          <div className="h-12 w-1/2 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/50" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/50" />
          <div className="h-16 w-2/3 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
