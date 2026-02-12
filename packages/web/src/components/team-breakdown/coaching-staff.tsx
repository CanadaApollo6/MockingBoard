import type { Coach } from '@mockingboard/shared';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface CoachingStaffProps {
  coaches: Coach[];
  teamColors: { primary: string; secondary: string };
}

type StaffGroup = 'offense' | 'defense' | 'special' | 'strength';

const OFFENSE_KEYWORDS = [
  'offensive',
  'quarterbacks',
  'quarterback',
  'running back',
  'wide receiver',
  'tight end',
  'offensive line',
  'pass game',
  'run game',
];
const DEFENSE_KEYWORDS = [
  'defensive',
  'linebacker',
  'secondary',
  'cornerback',
  'safety',
  'safeties',
  'defensive line',
  'pass rush',
  'edge',
];
const SPECIAL_KEYWORDS = ['special teams', 'kicking', 'punting'];
const STRENGTH_KEYWORDS = [
  'strength',
  'conditioning',
  'player performance',
  'sports science',
  'performance',
];

function classifyCoach(role: string): StaffGroup {
  const lower = role.toLowerCase();
  if (STRENGTH_KEYWORDS.some((k) => lower.includes(k))) return 'strength';
  if (SPECIAL_KEYWORDS.some((k) => lower.includes(k))) return 'special';
  if (DEFENSE_KEYWORDS.some((k) => lower.includes(k))) return 'defense';
  if (OFFENSE_KEYWORDS.some((k) => lower.includes(k))) return 'offense';
  return 'offense';
}

const GROUP_LABELS: Record<StaffGroup, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special Teams',
  strength: 'Strength & Conditioning',
};

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
  const staff = coaches.filter((c) => c !== headCoach);

  const groups: Record<StaffGroup, Coach[]> = {
    offense: [],
    defense: [],
    special: [],
    strength: [],
  };
  for (const coach of staff) {
    groups[classifyCoach(coach.role)].push(coach);
  }

  const groupOrder: StaffGroup[] = [
    'offense',
    'defense',
    'special',
    'strength',
  ];

  return (
    <div className="space-y-6">
      {/* Head Coach — gradient card */}
      {headCoach && (
        <div
          className="relative overflow-hidden rounded-lg p-5"
          style={{
            background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`,
          }}
        >
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-white">
            {headCoach.name}
          </p>
          <p className="mt-1.5 text-sm text-white/80">{headCoach.role}</p>
        </div>
      )}

      {/* Grouped staff */}
      {groupOrder.map((group) => {
        const members = groups[group];
        if (members.length === 0) return null;
        return (
          <Collapsible key={group} defaultOpen>
            <CollapsibleTrigger className="group flex w-full items-center gap-1.5 py-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {GROUP_LABELS[group]}
              </h3>
              <span className="text-xs text-muted-foreground/60">
                ({members.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1 [animation-duration:400ms] data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              {members.map((coach, i) => (
                <div
                  key={`${coach.name}-${coach.role}-${i}`}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{coach.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {coach.role}
                    </p>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
