import { Suspense } from 'react';
import { AuthCallbackClient } from './auth-callback-client';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Signing in...</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
