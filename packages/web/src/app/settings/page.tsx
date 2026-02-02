import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect('/auth');

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsClient />
    </main>
  );
}
