import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import {
  getCachedPlayers,
  getCachedScoutProfiles,
  getCachedSeasonConfig,
} from '@/lib/cache';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  const { draftYear } = await getCachedSeasonConfig();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/players`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/boards`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/community`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/scouts`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/draft-order`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Dynamic pages — fetch in parallel
  const [players, publicBoards, publicUsers, scoutProfiles] = await Promise.all(
    [
      getCachedPlayers(draftYear),
      adminDb
        .collection('bigBoards')
        .where('visibility', '==', 'public')
        .select('slug', 'updatedAt')
        .get(),
      adminDb
        .collection('users')
        .where('isPublic', '==', true)
        .select('slug', 'updatedAt')
        .get(),
      getCachedScoutProfiles(),
    ],
  );

  const playerPages: MetadataRoute.Sitemap = players.map((p) => ({
    url: `${baseUrl}/players/${p.id}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const boardPages: MetadataRoute.Sitemap = publicBoards.docs.map((doc) => ({
    url: `${baseUrl}/boards/${doc.data().slug}`,
    lastModified: doc.data().updatedAt?.toDate(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const profilePages: MetadataRoute.Sitemap = publicUsers.docs.map((doc) => ({
    url: `${baseUrl}/profile/${doc.data().slug}`,
    lastModified: doc.data().updatedAt?.toDate(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const scoutPages: MetadataRoute.Sitemap = scoutProfiles.map((s) => ({
    url: `${baseUrl}/scouts/${s.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...playerPages,
    ...boardPages,
    ...profilePages,
    ...scoutPages,
  ];
}
