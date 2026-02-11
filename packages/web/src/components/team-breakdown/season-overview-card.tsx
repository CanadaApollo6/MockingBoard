import { Badge } from '@/components/ui/badge';
import {
  GradientCard,
  GradientCardContent,
} from '@/components/ui/gradient-card';
import { Separator } from '@/components/ui/separator';
import { SeasonOverview } from '@mockingboard/shared';

interface SeasonOverviewCardProps {
  team: {
    name: string;
    colors: { primary: string; secondary: string };
    record?: string;
    seasonOverview?: SeasonOverview;
  };
  showTeamName?: boolean;
}

export const SeasonOverviewCard = ({
  team,
  showTeamName = false,
}: SeasonOverviewCardProps) => {
  const { record, seasonOverview } = team;
  return (
    <GradientCard from={team.colors.primary} to={team.colors.secondary}>
      <GradientCardContent>
        {showTeamName && (
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/70">
            {team.name}
          </p>
        )}

        <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-16">
          {record && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Season Record
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-5xl font-bold uppercase tracking-tight sm:text-6xl">
                {record}
              </p>
            </div>
          )}

          <div className="grid flex-1 gap-5 sm:grid-cols-2 sm:justify-items-end sm:text-right">
            {seasonOverview?.finalResult && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  Final Result
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {seasonOverview.finalResult}
                </p>
              </div>
            )}
            {seasonOverview?.divisionResult && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  Division Standing
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {seasonOverview.divisionResult}
                </p>
              </div>
            )}
          </div>
        </div>

        {seasonOverview?.accolades && seasonOverview.accolades.length > 0 && (
          <>
            <Separator className="my-6 bg-white/20" />
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/70">
                Accolades
              </p>
              <div
                className="gap-x-8 gap-y-2.5 sm:columns-2"
                style={{ columnFill: 'balance' }}
              >
                {seasonOverview.accolades.map((a, i) => (
                  <div
                    key={`${a.player}-${a.award}-${i}`}
                    className="mb-2.5 flex break-inside-avoid items-center gap-3"
                  >
                    <span className="text-sm font-medium">{a.player}</span>
                    <span className="text-white/50">&mdash;</span>
                    <Badge
                      variant="outline"
                      className="border-white/30 text-xs text-white"
                    >
                      {a.award}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </GradientCardContent>
    </GradientCard>
  );
};
