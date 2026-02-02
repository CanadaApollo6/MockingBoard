import Image from 'next/image';
import Link from 'next/link';
import { SignInButton } from '@/components/sign-in-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavLinks } from '@/components/nav-links';

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
              unoptimized
            />
            MockingBoard
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignInButton />
        </div>
      </div>
    </header>
  );
}
