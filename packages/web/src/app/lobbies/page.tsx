import Link from 'next/link';
import { getPublicLobbies } from '@/lib/firebase/data';
import { getDraftDisplayName } from '@/lib/firebase/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 30;

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

export default async function LobbiesPage() {
  const lobbies = await getPublicLobbies();

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Open Lobbies</h1>

      {lobbies.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No open lobbies right now. Create one from the{' '}
          <Link href="/drafts/new" className="underline hover:text-foreground">
            draft creator
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lobbies.map((lobby) => {
            const playerCount = lobby.participantNames
              ? Object.keys(lobby.participantNames).length
              : 0;
            const isStale =
              lobby.createdAt &&
              Date.now() - lobby.createdAt.seconds * 1000 > STALE_MS;
            return (
              <Link key={lobby.id} href={`/drafts/${lobby.id}/live`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle>{getDraftDisplayName(lobby)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {playerCount} player{playerCount !== 1 ? 's' : ''}
                      </span>
                      <span>{lobby.config.rounds} rounds</span>
                      <span>
                        Teams:{' '}
                        {lobby.config.teamAssignmentMode === 'choice'
                          ? 'Player choice'
                          : 'Random'}
                      </span>
                      {lobby.config.secondsPerPick > 0 && (
                        <span>Timer: {lobby.config.secondsPerPick}s</span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="secondary">Open</Badge>
                      {isStale && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Possibly inactive
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
