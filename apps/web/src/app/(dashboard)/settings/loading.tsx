export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-8">
        <div className="h-6 w-6 shimmer rounded bg-muted/50" />
        <div className="h-7 w-28 shimmer rounded bg-muted/50" />
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-5 w-32 shimmer rounded bg-muted/50" />
            <div className="h-10 shimmer rounded-lg bg-muted/50" />
          </div>
        ))}
        <div className="mt-2 h-10 w-24 shimmer rounded-lg bg-muted/50" />
      </div>
    </div>
  );
}
