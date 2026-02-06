import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { TeamAbbreviation, Position } from '@mockingboard/shared';
import { teams, generateDraftRecap } from '@mockingboard/shared';
import {
  getDraft,
  getDraftPicks,
  getPlayerMap,
  getDraftTrades,
  getBigBoard,
} from '@/lib/data';
import { getCachedTeamDocs } from '@/lib/cache';
import { getSessionUser } from '@/lib/auth-session';
import { resolveUser, isUserInDraft } from '@/lib/user-resolve';
import { formatDraftDate, getDraftDisplayName } from '@/lib/format';
import { TradeSummary } from '@/components/trade-summary';
import { DraftRecapSummary } from '@/components/recap/draft-recap-summary';
import { TeamGradeCard } from '@/components/recap/team-grade-card';
import { PickBreakdown } from '@/components/recap/pick-breakdown';
import { TradeAnalysisCard } from '@/components/recap/trade-analysis-card';
import { ShareButton } from '@/components/share/share-button';
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

  const participants = draft.participants ?? {};
  const participantCount = Object.keys(participants).length;
  const user = session ? await resolveUser(session.uid) : null;
  const isParticipant =
    session && isUserInDraft(draft, session.uid, user?.discordId);

  // Determine which teams the user controls (for "My Team" share option)
  const userIds = [session?.uid, user?.discordId].filter(Boolean) as string[];
  const teamAssignments = draft.teamAssignments ?? {};
  const userTeams = Object.entries(teamAssignments)
    .filter(([, userId]) => userId !== null && userIds.includes(userId))
    .map(([team]) => team as TeamAbbreviation);

  const cpuTeams = new Set(
    Object.entries(teamAssignments)
      .filter(([, userId]) => userId === null)
      .map(([team]) => team),
  );

  const playersObj = Object.fromEntries(playerMap);

  // Generate recap for completed drafts
  const recap =
    draft.status === 'complete' && picks.length > 0
      ? await (async () => {
          try {
            const teamDocs = await getCachedTeamDocs();
            const docsMap = new Map(teamDocs.map((d) => [d.id, d]));
            const teamNeeds = new Map<TeamAbbreviation, Position[]>(
              teams.map((t) => [t.id, docsMap.get(t.id)?.needs ?? t.needs]),
            );
            const boardRankings = draft.config.boardId
              ? (await getBigBoard(draft.config.boardId))?.rankings
              : undefined;
            return generateDraftRecap(
              draft,
              picks,
              playersObj,
              teamNeeds,
              trades,
              boardRankings,
            );
          } catch (err) {
            console.error('Failed to generate draft recap:', err);
            return null;
          }
        })()
      : null;

  const hasBoardDelta =
    recap?.teamGrades.some((tg) =>
      tg.picks.some((p) => p.boardDelta != null),
    ) ?? false;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{getDraftDisplayName(draft)}</h1>
          <Badge
            variant={
              draft.status === 'cancelled'
                ? 'destructive'
                : draft.status === 'complete'
                  ? 'secondary'
                  : 'default'
            }
          >
            {draft.status === 'active'
              ? 'Live'
              : draft.status === 'cancelled'
                ? 'Cancelled'
                : draft.status}
          </Badge>
          {draft.status === 'complete' && (
            <ShareButton
              draft={draft}
              picks={picks}
              players={playersObj}
              userTeams={userTeams}
              recap={recap}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground sm:gap-4">
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

      {/* Draft Recap */}
      {recap && (
        <>
          <DraftRecapSummary recap={recap} />

          <h2 className="mb-4 mt-6 text-lg font-semibold">Team Grades</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recap.teamGrades.map((grade) => (
              <TeamGradeCard
                key={grade.team}
                grade={grade}
                players={playersObj}
              />
            ))}
          </div>

          <Separator className="my-6" />

          <h2 className="mb-4 text-lg font-semibold">Pick Breakdown</h2>
          <PickBreakdown
            recap={recap}
            players={playersObj}
            hasBoardDelta={hasBoardDelta}
            cpuTeams={cpuTeams}
          />

          {recap.tradeAnalysis.length > 0 && (
            <>
              <h2 className="mb-4 mt-6 text-lg font-semibold">
                Trade Analysis
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {recap.tradeAnalysis.map((trade) => (
                  <TradeAnalysisCard key={trade.tradeId} trade={trade} />
                ))}
              </div>
            </>
          )}
        </>
      )}

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
