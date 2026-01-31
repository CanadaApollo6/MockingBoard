import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight">MockingBoard</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Mock draft with your friends — right inside Discord. View draft history,
        track picks, and watch live.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/drafts">
          <Button size="lg">View Drafts</Button>
        </Link>
        <a href="/api/auth/discord">
          <Button variant="outline" size="lg">
            Sign in with Discord
          </Button>
        </a>
      </div>
    </main>
  );
}
