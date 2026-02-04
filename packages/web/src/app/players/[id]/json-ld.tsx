import type { Player } from '@mockingboard/shared';

export function PlayerJsonLd({ player }: { player: Player }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    description: player.scouting?.summary ?? undefined,
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: player.school,
    },
    jobTitle: `${player.position} prospect`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
