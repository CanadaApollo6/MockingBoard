'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';

function isBare(pathname: string, isAuthenticated: boolean): boolean {
  if (pathname === '/') return !isAuthenticated;
  return pathname.startsWith('/auth');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isBare(pathname, !loading && !!user)) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex h-12 items-center gap-3 border-b bg-card px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </button>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold">
            <Image
              src="/logo.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
              unoptimized
            />
            MockingBoard
          </Link>
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
