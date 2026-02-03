'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/drafts', label: 'Drafts' },
  { href: '/invite', label: 'Add Bot' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive =
          href === '/drafts'
            ? pathname === '/drafts'
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'transition-colors',
              isActive
                ? 'text-foreground border-b-2 border-mb-accent pb-0.5'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
