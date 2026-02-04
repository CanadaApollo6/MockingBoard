export default function PlayerLoading() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Hero skeleton */}
      <div className="animate-pulse overflow-hidden rounded-xl border bg-card">
        <div className="h-1.5 bg-muted" />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="h-14 w-20 rounded bg-muted" />
          <div className="mt-3 h-12 w-80 rounded bg-muted" />
          <div className="mt-2 h-5 w-48 rounded bg-muted" />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: scouting skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="space-y-4">
            <div className="h-16 w-full rounded-lg bg-muted" />
            <div className="h-20 w-full rounded bg-muted" />
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>

        {/* Right: reports skeleton */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 rounded-lg border bg-card p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="h-6 w-40 rounded bg-muted" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border bg-card"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
