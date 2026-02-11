import type { Coach } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';

interface CoachingStaffProps {
  coaches: Coach[];
  teamColors: { primary: string; secondary: string };
}

export function CoachingStaff({ coaches, teamColors }: CoachingStaffProps) {
  if (coaches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Coaching staff data not available.
      </p>
    );
  }

  const headCoach = coaches.find((c) =>
    c.role.toLowerCase().includes('head coach'),
  );
  const coordinators = coaches.filter((c) => c !== headCoach);

  return (
    <div className="space-y-4">
      {/* Head Coach */}
      {headCoach && (
        <div className="rounded-lg border p-4">
          <div
            className="mb-3 h-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${teamColors.primary}, ${teamColors.secondary})`,
            }}
          />
          <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight">
            {headCoach.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {headCoach.role}
            </span>
            <Badge variant="outline" className="text-xs">
              Since {headCoach.since}
            </Badge>
          </div>
        </div>
      )}

      {/* Coordinators */}
      {coordinators.length > 0 && (
        <div className="space-y-1">
          {coordinators.map((coach) => (
            <div
              key={coach.name}
              className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{coach.name}</p>
                <p className="text-xs text-muted-foreground">{coach.role}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Since {coach.since}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
