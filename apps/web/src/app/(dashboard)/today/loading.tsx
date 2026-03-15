export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 animate-pulse rounded bg-muted/50" />
        <div className="h-7 w-28 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="px-5 pb-3 pt-1">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
