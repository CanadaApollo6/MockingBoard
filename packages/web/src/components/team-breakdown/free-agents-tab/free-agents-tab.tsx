import type { FreeAgentEntry } from '@mockingboard/shared';
import {
  GradientCard,
  GradientCardContent,
} from '@/components/ui/gradient-card';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { normalizePlayerName, fmtDollar } from '@/lib/format';

const FA_TYPES: FreeAgentEntry['faType'][] = ['UFA', 'RFA', 'ERFA'];

const FA_TYPE_LABELS: Record<FreeAgentEntry['faType'], string> = {
  UFA: 'Unrestricted Free Agents',
  RFA: 'Restricted Free Agents',
  ERFA: 'Exclusive-Rights Free Agents',
};

interface FreeAgentsTabProps {
  freeAgents: FreeAgentEntry[];
  colors: { primary: string; secondary: string };
  nameToPosition: Map<string, string>;
}

export function FreeAgentsTab({
  freeAgents,
  colors,
  nameToPosition,
}: FreeAgentsTabProps) {
  if (freeAgents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No free agent data available.
      </p>
    );
  }

  const grouped = FA_TYPES.map((type) => ({
    type,
    label: FA_TYPE_LABELS[type],
    players: freeAgents.filter((fa) => fa.faType === type),
  }));

  const ufaCount = grouped[0].players.length;
  const rfaCount = grouped[1].players.length;
  const erfaCount = grouped[2].players.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <GradientCard from={colors.primary} to={colors.secondary}>
        <GradientCardContent>
          <h3 className="mb-3 text-lg font-medium">Free Agency Overview</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Stat label="Total" value={String(freeAgents.length)} />
            <Stat label="UFA" value={String(ufaCount)} />
            <Stat label="RFA" value={String(rfaCount)} />
            <Stat label="ERFA" value={String(erfaCount)} />
          </div>
        </GradientCardContent>
      </GradientCard>

      {/* Grouped sections */}
      {grouped.map(
        (group) =>
          group.players.length > 0 && (
            <div key={group.type}>
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="text-lg font-medium">{group.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {group.players.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.players.map((fa, i) => {
                  const pos =
                    fa.position ??
                    nameToPosition.get(normalizePlayerName(fa.player));
                  return (
                    <FreeAgentCard
                      key={`${fa.player}-${i}`}
                      fa={fa}
                      position={pos}
                    />
                  );
                })}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

function FreeAgentCard({
  fa,
  position,
}: {
  fa: FreeAgentEntry;
  position?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="truncate font-medium text-sm">{fa.player}</span>
        {position && (
          <Badge
            className="shrink-0 px-1.5 py-0 text-xs"
            style={{
              backgroundColor: getPositionColor(position),
              color: '#0A0A0B',
            }}
          >
            {position}
          </Badge>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Detail label="Age" value={String(fa.age)} />
        <Detail
          label="Experience"
          value={`${fa.years} yr${fa.years !== 1 ? 's' : ''}`}
        />
        {fa.apy != null && fa.apy > 0 && (
          <Detail label="APY" value={fmtDollar(fa.apy)} />
        )}
        {fa.guarantees != null && fa.guarantees > 0 && (
          <Detail label="Guaranteed" value={fmtDollar(fa.guarantees)} />
        )}
        {fa.snaps != null && fa.snaps > 0 && (
          <Detail label="Snaps" value={String(fa.snaps)} />
        )}
        {fa.franchiseTender > 0 && (
          <Detail label="Franchise" value={fmtDollar(fa.franchiseTender)} />
        )}
        {fa.transitionTender > 0 && (
          <Detail label="Transition" value={fmtDollar(fa.transitionTender)} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/60">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
