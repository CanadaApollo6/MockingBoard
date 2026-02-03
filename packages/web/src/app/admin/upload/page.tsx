import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { getScoutProfiles } from '@/lib/data';
import { CsvUploadPage } from './csv-upload-page';

export default async function AdminUploadPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!isAdmin(session.uid)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </main>
    );
  }

  const scoutProfiles = await getScoutProfiles();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Upload Scouting Data</h1>
      <CsvUploadPage
        scoutProfiles={scoutProfiles.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
      />
    </main>
  );
}
