import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import { AuthForm } from '@/components/auth/auth-form';

export default async function SignUpPage() {
  const session = await getSessionUser();
  if (session) redirect('/drafts');

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 -top-14 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <AuthForm initialMode="signup" />
      </div>
    </main>
  );
}
