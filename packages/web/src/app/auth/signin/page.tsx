import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import { AuthForm } from '@/components/auth-form';

export default async function SignInPage() {
  const session = await getSessionUser();
  if (session) redirect('/drafts');

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4 py-8">
      <AuthForm initialMode="signin" />
    </main>
  );
}
