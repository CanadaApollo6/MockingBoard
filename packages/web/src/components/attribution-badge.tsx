import Link from 'next/link';
import type { Player } from '@mockingboard/shared';

interface AttributionBadgeProps {
  dataProviders: NonNullable<Player['dataProviders']>;
}

export function AttributionBadge({ dataProviders }: AttributionBadgeProps) {
  const providers = Object.values(dataProviders);
  if (providers.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Scouting data by{' '}
      {providers.map((provider, i) => (
        <span key={provider.slug}>
          {i > 0 && ', '}
          <Link
            href={`/scouts/${provider.slug}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {provider.name}
          </Link>
        </span>
      ))}
    </p>
  );
}
