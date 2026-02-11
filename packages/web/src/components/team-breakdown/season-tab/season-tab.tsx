import { SeasonOverviewCard } from './season-overview-card';
import type { TeamSchedule } from '@/lib/cache';
import type { SeasonOverview, TeamSeed } from '@mockingboard/shared';
import { SeasonSchedule } from './season-schedule';

interface SeasonTabProps {
  schedule: TeamSchedule | null;
  seasonOverview?: SeasonOverview;
  team: TeamSeed | null;
  colors?: { primary: string; secondary: string };
}

export const SeasonTab: React.FC<SeasonTabProps> = ({
  schedule,
  seasonOverview,
  team,
  colors,
}) => {
  const showSchedule = schedule && schedule.games.length > 0;
  const lastGame = schedule?.games[schedule.games.length - 1];
  const record = lastGame?.record;
  const hasOverview =
    record ||
    seasonOverview?.finalResult ||
    seasonOverview?.divisionResult ||
    (seasonOverview?.accolades && seasonOverview.accolades.length > 0);
  const showOverview = hasOverview && team && colors;
  return (
    <div className="space-y-4">
      {showOverview && (
        <SeasonOverviewCard
          team={team}
          colors={colors}
          seasonOverview={seasonOverview}
          record={record}
        />
      )}
      {showSchedule && <SeasonSchedule schedule={schedule} />}
    </div>
  );
};
