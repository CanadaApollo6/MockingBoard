'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { SearchDialog } from '@/components/search-dialog';
import { NotificationBell } from '@/components/notification-bell';
import { useAuth } from '@/components/auth-provider';
import { useTeamTheme } from '@/hooks/use-team-theme';
import { isBare } from '@/lib/overlay-theme';
import type { Announcement } from '@/lib/cache';

const VARIANT_STYLES: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  warning:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  success:
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
};

interface AppShellProps {
  children: React.ReactNode;
  announcement?: Announcement | null;
}

export function AppShell({ children, announcement }: AppShellProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useTeamTheme();

  const openSearch = useCallback(() => setSearchOpen(true), []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isBare(pathname, !loading && !!user)) return <>{children}</>;

  const showBanner =
    announcement?.active && announcement.text && !bannerDismissed;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onSearchOpen={openSearch}
      />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

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
          <Link
            href="/"
            className="flex flex-1 items-center gap-2 text-sm font-bold"
          >
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
          {!loading && user && <NotificationBell />}
          <button
            onClick={openSearch}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </button>
        </div>

        {/* Announcement banner */}
        {showBanner && (
          <div
            className={`flex items-center justify-between border-b px-4 py-2 text-sm ${VARIANT_STYLES[announcement.variant] ?? VARIANT_STYLES.info}`}
          >
            <span>{announcement.text}</span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-4 shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
