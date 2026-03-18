'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ScanEye,
  Bot,
  ListOrdered,
  GalleryHorizontalEnd,
  ArrowLeftRight,
  Shield,
  Settings,
  LogOut,
  LogIn,
  Shirt,
  Contact,
  BarChart3,
  Trophy,
  Crosshair,
  Timer,
  GitCompareArrows,
  Calculator,
  BookOpen,
  Compass,
  Scale,
  TrendingUp,
  ChevronDown,
  NotebookPen,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationBell } from '@/components/notification/notification-bell';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Routes } from '@/routes';

const NAV_GROUPS = [
  {
    label: '',
    items: [{ href: Routes.HOME, label: 'Home', icon: Home }],
  },
  {
    label: 'Drafts',
    items: [
      { href: Routes.DRAFTS, label: 'My Drafts', icon: FileText },
      { href: Routes.DRAFT_DAY, label: 'Draft Day', icon: Timer },
      { href: Routes.COMPANION, label: 'Companion', icon: Crosshair },
      { href: Routes.LOBBIES, label: 'Join Lobby', icon: Users },
    ],
  },
  {
    label: 'Scouting',
    items: [
      { href: Routes.PROSPECTS, label: 'Prospects', icon: Shirt },
      { href: Routes.WATCHLIST, label: 'Watchlist', icon: Eye },
      { href: Routes.TAPE_LOG, label: 'Tape Log', icon: NotebookPen },
      { href: Routes.BOARD, label: 'My Board', icon: LayoutList },
      { href: Routes.RANKINGS, label: 'Rankings', icon: BarChart3 },
      { href: Routes.BOARDS, label: 'Boards', icon: Library },
      { href: Routes.CONSENSUS, label: 'Consensus', icon: Scale },
      { href: Routes.TRENDING, label: 'Trending', icon: TrendingUp },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: Routes.DISCOVER, label: 'Discover', icon: Compass },
      { href: Routes.COMMUNITY, label: 'Community', icon: Globe },
      { href: Routes.LISTS, label: 'Lists', icon: ListOrdered },
      { href: Routes.SCOUTS, label: 'Scouts', icon: ScanEye },
      { href: Routes.LEADERBOARD, label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: Routes.DRAFT_ORDER, label: 'Draft Order', icon: ListOrdered },
      { href: Routes.TEAMS, label: 'Teams', icon: GalleryHorizontalEnd },
      { href: Routes.PLAYERS, label: 'NFL Players', icon: Contact },
      {
        href: Routes.COMPARE_PLAYERS,
        label: 'Player Compare',
        icon: GitCompareArrows,
      },
      {
        href: Routes.TRADE_CALCULATOR,
        label: 'Trade Calculator',
        icon: ArrowLeftRight,
      },
      {
        href: Routes.CONTRACT_BUILDER,
        label: 'Contract Builder',
        icon: Calculator,
      },
      { href: Routes.INVITE, label: 'Add Bot', icon: Bot },
      { href: Routes.LEARN_NFL_DRAFT, label: 'NFL Draft', icon: BookOpen },
      { href: Routes.LEARN_SALARY_CAP, label: 'Salary Cap', icon: BookOpen },
    ],
  },
] as const;

const ADMIN_GROUP = {
  label: 'Admin',
  items: [{ href: Routes.ADMIN, label: 'Dashboard', icon: Shield }],
};

function isNavActive(href: string, pathname: string): boolean {
  if (href === Routes.HOME || href === Routes.DRAFTS || href === Routes.BOARD)
    return pathname === href;
  return pathname.startsWith(href);
}

type NavGroup = (typeof NAV_GROUPS)[number] | typeof ADMIN_GROUP;

function getActiveGroupLabel(
  pathname: string,
  groups: readonly NavGroup[],
): string {
  for (const group of groups) {
    if (!group.label) continue;
    for (const item of group.items) {
      if (isNavActive(item.href, pathname)) return group.label;
    }
  }
  return '';
}

const STORAGE_KEY = 'sidebar-groups';

function useCollapsibleGroups(
  allGroups: readonly NavGroup[],
  pathname: string,
): [Record<string, boolean>, (label: string) => void] {
  const collapsibleLabels = useMemo(
    () => allGroups.filter((g) => g.label).map((g) => g.label),
    [allGroups],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const activeLabel = getActiveGroupLabel(pathname, allGroups);
    let stored: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // localStorage unavailable (SSR/private browsing)
    }
    const initial: Record<string, boolean> = {};
    for (const label of collapsibleLabels) {
      initial[label] = label === activeLabel ? true : (stored[label] ?? false);
    }
    return initial;
  });

  useEffect(() => {
    const activeLabel = getActiveGroupLabel(pathname, allGroups);
    setOpenGroups(() => {
      const next: Record<string, boolean> = {};
      for (const label of collapsibleLabels) {
        next[label] = label === activeLabel;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (SSR/private browsing)
      }
      return next;
    });
  }, [pathname, collapsibleLabels, allGroups]);

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (SSR/private browsing)
      }
      return next;
    });
  }, []);

  return [openGroups, toggleGroup];
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
  const showAdmin = !!profile?.isAdmin;

  const allGroups = useMemo(
    () =>
      showAdmin
        ? ([...NAV_GROUPS, ADMIN_GROUP] as const)
        : ([...NAV_GROUPS] as const),
    [showAdmin],
  );

  const [openGroups, toggleGroup] = useCollapsibleGroups(allGroups, pathname);

  // Close mobile sidebar on navigation
  useEffect(() => {
    onMobileClose();
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Link
          href={Routes.HOME}
          className="flex items-center gap-2 text-lg font-bold"
        >
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
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-4">
        {allGroups.map((group, gi) => {
          if (!group.label) {
            return (
              <div key={gi} className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    Icon={Icon}
                    pathname={pathname}
                  />
                ))}
              </div>
            );
          }

          const isOpen = openGroups[group.label] ?? false;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground/80"
              >
                {group.label}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <ChevronDown className="h-3 w-3" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5">
                      {group.items.map(({ href, label, icon: Icon }) => (
                        <NavLink
                          key={href}
                          href={href}
                          label={label}
                          Icon={Icon}
                          pathname={pathname}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-sidebar-border px-2 py-3">
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!loading && user && <NotificationBell />}
          </div>
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
          <>
            <Link
              href={Routes.SETTINGS_PROFILE}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {(profile?.displayName ?? 'U').charAt(0).toUpperCase()}
                </span>
              )}
              {profile?.displayName ?? 'User'}
            </Link>
            <Link
              href={Routes.SETTINGS}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
          </>
        ) : (
          <Link
            href={Routes.AUTH}
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

function NavLink({
  href,
  label,
  Icon,
  pathname,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  pathname: string;
}) {
  const active = isNavActive(href, pathname);
  return (
    <Link
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
}
