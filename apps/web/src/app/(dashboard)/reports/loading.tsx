export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 animate-pulse rounded bg-muted/50" />
        <div className="h-7 w-28 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
