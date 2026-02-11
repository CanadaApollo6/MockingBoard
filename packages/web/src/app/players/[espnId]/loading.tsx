export default function NflPlayerLoading() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Back link skeleton */}
      <div className="mb-4 h-5 w-24 rounded bg-muted" />

      {/* Hero skeleton */}
      <div className="animate-pulse overflow-hidden rounded-xl border bg-card">
        <div className="h-1.5 bg-muted" />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-start gap-6">
            <div className="h-20 w-20 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-10 w-72 rounded bg-muted" />
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="mt-8 space-y-6">
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
            <div className="mb-4 h-5 w-32 rounded bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-8 w-full rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
