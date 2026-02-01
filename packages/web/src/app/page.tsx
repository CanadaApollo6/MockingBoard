import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 -top-14 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative">
        <Image
          src="/logo.png"
          alt="MockingBoard"
          width={96}
          height={96}
          className="mx-auto mb-6 h-24 w-24"
          unoptimized
        />
        <h1 className="text-5xl font-bold tracking-tight">MockingBoard</h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Mock draft with your friends — right inside Discord. View draft
          history, track picks, and watch live.
        </p>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/drafts">
            <Button size="lg">View Drafts</Button>
          </Link>
          <Link href="/auth">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
