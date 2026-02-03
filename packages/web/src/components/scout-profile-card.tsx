import Link from 'next/link';
import type { ScoutProfile } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TIER_LABELS: Record<string, string> = {
  contributor: 'Contributor',
  scout: 'Scout',
  elite: 'Elite Scout',
};

interface ScoutProfileCardProps {
  profile: ScoutProfile;
}

export function ScoutProfileCard({ profile }: ScoutProfileCardProps) {
  return (
    <Link href={`/scouts/${profile.slug}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile.avatar && (
              <img
                src={profile.avatar}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            {profile.name}
            {profile.tier && (
              <Badge variant="outline" className="text-xs">
                {TIER_LABELS[profile.tier] ?? profile.tier}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.bio && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {profile.bio}
            </p>
          )}
          {profile.stats && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                {profile.stats.playersContributed} player
                {profile.stats.playersContributed !== 1 ? 's' : ''}
              </span>
              {profile.stats.positionsCovered.length > 0 && (
                <span>
                  {profile.stats.positionsCovered.length} position
                  {profile.stats.positionsCovered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
