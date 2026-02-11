import { KeyPlayerCard, KeyPlayerCardProps } from './key-player-card';
import type { TeamRoster } from '@/lib/cache';
import { TeamRosterTable } from './team-roster-table';

interface RosterTabProps {
  keyPlayers: KeyPlayerCardProps[];
  roster: TeamRoster | null;
}

export const RosterTab: React.FC<RosterTabProps> = ({ keyPlayers, roster }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {keyPlayers.map((kp) => (
          <KeyPlayerCard key={kp.name} {...kp} />
        ))}
      </div>
      {roster && <TeamRosterTable roster={roster} />}
    </div>
  );
};
