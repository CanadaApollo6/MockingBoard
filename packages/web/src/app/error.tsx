'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        An unexpected error occurred.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try Again
      </Button>
    </main>
  );
}
