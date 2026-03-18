import { getScoutProfiles } from '@/lib/firebase/data';
import { ScoutProfileCard } from '@/components/profile/scout-profile-card';

export default async function ScoutsPage() {
  const profiles = await getScoutProfiles();

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        Scouts
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Community scouts who contribute prospect data to MockingBoard.
      </p>

      {profiles.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No scout profiles yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ScoutProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </main>
  );
}
