import { LandingHero } from '@/components/landing-hero';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <LandingHero error={!!error} />
    </main>
  );
}
