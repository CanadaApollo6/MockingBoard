export default function Loading() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Player 1 skeleton */}
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="hidden items-center md:flex">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        </div>
        {/* Player 2 skeleton */}
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
      {/* Stat bars skeleton */}
      <div className="mt-12 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </main>
  );
}
