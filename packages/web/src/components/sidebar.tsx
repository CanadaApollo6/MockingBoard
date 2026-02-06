'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Users,
  Search,
  LayoutList,
  Library,
  Globe,
  Eye,
  Bot,
  ListOrdered,
  GalleryHorizontalEnd,
  ArrowLeftRight,
  Shield,
  Settings,
  LogOut,
  LogIn,
  Shirt,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { isAdmin } from '@/lib/admin';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const NAV_GROUPS = [
  {
    label: '',
    items: [{ href: '/', label: 'Home', icon: Home }],
  },
  {
    label: 'Drafts',
    items: [
      { href: '/drafts', label: 'My Drafts', icon: FileText },
      { href: '/lobbies', label: 'Join Lobby', icon: Users },
    ],
  },
  {
    label: 'Scouting',
    items: [
      { href: '/players', label: 'Players', icon: Shirt },
      { href: '/board', label: 'My Board', icon: LayoutList },
      { href: '/boards', label: 'Boards', icon: Library },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/community', label: 'Community', icon: Globe },
      { href: '/scouts', label: 'Scouts', icon: Eye },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/draft-order', label: 'Draft Order', icon: ListOrdered },
      { href: '/teams', label: 'Teams', icon: GalleryHorizontalEnd },
      {
        href: '/trade-calculator',
        label: 'Trade Calculator',
        icon: ArrowLeftRight,
      },
      { href: '/invite', label: 'Add Bot', icon: Bot },
    ],
  },
] as const;

const ADMIN_GROUP = {
  label: 'Admin',
  items: [{ href: '/admin', label: 'Dashboard', icon: Shield }],
};

function isNavActive(href: string, pathname: string): boolean {
  if (href === '/' || href === '/drafts' || href === '/board')
    return pathname === href;
  return pathname.startsWith(href);
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSearchOpen: () => void;
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
  onSearchOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const showAdmin = !!user && isAdmin(user.uid);

  // Close mobile sidebar on navigation
  useEffect(() => {
    onMobileClose();
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
            unoptimized
          />
          <span className="font-[family-name:var(--font-display)] uppercase tracking-tight">
            MockingBoard
          </span>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-2 pt-2">
        <button
          onClick={onSearchOpen}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="hidden rounded border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/50 md:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {[...NAV_GROUPS, ...(showAdmin ? [ADMIN_GROUP] : [])].map(
          (group, gi) => (
            <div key={group.label || gi}>
              {group.label && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isNavActive(href, pathname);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'border-l-2 border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-sidebar-border px-2 py-3">
        <div className="flex items-center justify-between px-3 py-1">
          <ThemeToggle />
          {!loading && user && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
        <Separator className="my-2" />
        {loading ? null : user ? (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {profile?.displayName ?? 'User'}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transition-transform duration-200 ease-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
