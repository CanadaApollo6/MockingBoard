export default function PlayersLoading() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-14 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      </div>

      {/* Card skeletons */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-xl border bg-card"
          >
            <div className="h-1 bg-muted" />
            <div className="space-y-4 p-5 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="h-10 w-16 rounded bg-muted" />
                <div className="h-6 w-12 rounded-full bg-muted" />
              </div>
              <div className="h-8 w-72 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-20 w-full rounded bg-muted" />
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-12 rounded bg-muted" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
