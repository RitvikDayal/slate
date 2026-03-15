export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 shimmer rounded bg-muted/50" />
        <div className="h-7 w-36 shimmer rounded bg-muted/50" />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-5 w-24 shimmer rounded bg-muted/50" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-12 shimmer rounded-lg bg-muted/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
