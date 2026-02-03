export default function BoardLoading() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </main>
  );
}
