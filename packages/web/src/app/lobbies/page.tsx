import Link from 'next/link';
import { getPublicLobbies } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
            return (
              <Link key={lobby.id} href={`/drafts/${lobby.id}/live`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle>{lobby.config.year} Mock Draft</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{playerCount} player{playerCount !== 1 ? 's' : ''}</span>
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
                    <div className="mt-3">
                      <Badge variant="secondary">Open</Badge>
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
