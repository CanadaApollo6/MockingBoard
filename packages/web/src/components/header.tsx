import Link from 'next/link';
import { SignInButton } from '@/components/sign-in-button';

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            MockingBoard
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/drafts"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Drafts
            </Link>
          </nav>
        </div>
        <SignInButton />
      </div>
    </header>
  );
}
