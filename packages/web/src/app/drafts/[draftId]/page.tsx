import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getDraft,
  getDraftPicks,
  getPlayerMap,
  getDraftTrades,
} from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { formatDraftDate } from '@/lib/format';
import { DraftBoard } from '@/components/draft-board';
import { TradeSummary } from '@/components/trade-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);
  if (!draft) notFound();

  const [picks, playerMap, trades, session] = await Promise.all([
    getDraftPicks(draftId),
    getPlayerMap(draft.config.year),
    getDraftTrades(draftId),
    getSessionUser(),
  ]);

  const participantCount = Object.keys(draft.participants).length;
  const isParticipant = session && draft.participants[session.uid];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{draft.config.year} Mock Draft</h1>
          <Badge
            variant={draft.status === 'complete' ? 'secondary' : 'default'}
          >
            {draft.status === 'active' ? 'Live' : draft.status}
          </Badge>
        </div>
        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
          <span>{formatDraftDate(draft.createdAt)}</span>
          <span>
            {participantCount} drafter{participantCount !== 1 ? 's' : ''}
          </span>
          <span>
            {draft.config.rounds} round{draft.config.rounds !== 1 ? 's' : ''}
          </span>
          <span>{picks.length} picks</span>
        </div>

        {draft.status === 'active' && (
          <Link href={`/drafts/${draftId}/live`}>
            <Button className="mt-3" size="sm">
              {isParticipant ? 'Continue Draft' : 'Watch Live'}
            </Button>
          </Link>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Draft Board */}
      <DraftBoard picks={picks} playerMap={playerMap} />

      {/* Trades */}
      {trades.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="mb-4 text-lg font-semibold">Trades</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {trades.map((trade) => (
              <TradeSummary key={trade.id} trade={trade} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
