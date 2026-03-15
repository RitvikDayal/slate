export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 shimmer rounded bg-muted/50" />
        <div className="h-7 w-32 shimmer rounded bg-muted/50" />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-5 py-4">
        <div className="grid grid-cols-7 gap-1 pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 shimmer rounded bg-muted/50" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
