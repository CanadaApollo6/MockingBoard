import { KeyPlayerCard, KeyPlayerCardProps } from './key-player-card';
import type { TeamRoster } from '@/lib/cache';
import { TeamRosterTable } from './team-roster-table';

interface RosterTabProps {
  keyPlayers: KeyPlayerCardProps[];
  roster: TeamRoster | null;
}

export const RosterTab: React.FC<RosterTabProps> = ({ keyPlayers, roster }) => {
  return (
    <div className="">
      <p className="text-xl font-semibold pl-2">Key Players</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 pb-6 pt-3">
        {keyPlayers.map((kp) => (
          <KeyPlayerCard key={kp.name} {...kp} />
        ))}
      </div>
      {roster && <TeamRosterTable roster={roster} />}
    </div>
  );
};
