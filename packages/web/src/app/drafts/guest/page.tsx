import { redirect } from 'next/navigation';
import { buildPickOrder, buildFuturePicks } from '@/lib/draft-actions';
import { getPlayerMap } from '@/lib/data';
import { GuestDraftRoom } from '@/components/guest-draft-room';
import { teams, generateDraftName } from '@mockingboard/shared';
import { getDraftDisplayName } from '@/lib/format';
import type {
  TeamAbbreviation,
  DraftFormat,
  CpuSpeed,
  Draft,
} from '@mockingboard/shared';

const GUEST_ID = '__guest__';

const VALID_CPU_SPEEDS: CpuSpeed[] = ['instant', 'fast', 'normal'];

export default async function GuestDraftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const year = Number(params.year) || 2026;
  const rounds = Math.min(Math.max(Number(params.rounds) || 3, 1), 7);
  const format: DraftFormat = params.format === 'full' ? 'full' : 'single-team';
  const selectedTeam = (params.team as TeamAbbreviation) ?? null;
  const cpuSpeed: CpuSpeed = VALID_CPU_SPEEDS.includes(
    params.cpuSpeed as CpuSpeed,
  )
    ? (params.cpuSpeed as CpuSpeed)
    : 'normal';
  const secondsPerPick = Math.max(Number(params.secondsPerPick) || 0, 0);
  const tradesEnabled = params.trades === 'true';
  const draftName = params.name || generateDraftName();

  if (format === 'single-team' && !selectedTeam) {
    redirect('/drafts/new');
  }

  const [pickOrder, playerMap, futurePicks] = await Promise.all([
    buildPickOrder(rounds, year),
    getPlayerMap(year),
    tradesEnabled ? buildFuturePicks(year, rounds) : Promise.resolve([]),
  ]);

  const players = Object.fromEntries(playerMap);

  const teamAssignments = {} as Record<TeamAbbreviation, string | null>;
  for (const t of teams) {
    if (format === 'full') {
      teamAssignments[t.id] = GUEST_ID;
    } else {
      teamAssignments[t.id] = t.id === selectedTeam ? GUEST_ID : null;
    }
  }

  const initialDraft: Draft = {
    id: 'guest',
    name: draftName,
    createdBy: GUEST_ID,
    config: {
      rounds,
      format,
      year,
      cpuSpeed,
      tradesEnabled,
      secondsPerPick,
      teamAssignmentMode: 'choice',
    },
    platform: 'web',
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    teamAssignments,
    participants: { [GUEST_ID]: GUEST_ID },
    pickOrder,
    futurePicks,
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {getDraftDisplayName(initialDraft)}
      </h1>
      <GuestDraftRoom initialDraft={initialDraft} players={players} />
    </main>
  );
}
