import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { ProfilePageClient } from './profile-page-client';

export default async function ProfileSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/auth');

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <ProfilePageClient />
    </main>
  );
}
