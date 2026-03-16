import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Routes } from '@/routes';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href={Routes.HOME}>
        <Button className="mt-6">Go Home</Button>
      </Link>
    </main>
  );
}
