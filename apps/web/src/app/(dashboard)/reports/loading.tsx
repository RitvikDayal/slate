export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 shimmer rounded bg-muted/50" />
        <div className="h-7 w-28 shimmer rounded bg-muted/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 shimmer rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="h-64 shimmer rounded-xl bg-muted/50" />
        <div className="h-48 shimmer rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
