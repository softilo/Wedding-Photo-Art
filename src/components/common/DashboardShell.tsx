'use client';

import React, { useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthUserSession, NotificationsFeed } from '@/types/event-management';
import { logout } from '@/service/auth';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { NotificationBell } from './NotificationBell';
import {
  ApertureIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  LayersIcon,
  LogOutIcon,
  PaletteIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SlidersIcon,
  UsersIcon,
} from '@/components/shared/Icons';

interface DashboardShellProps {
  session: AuthUserSession;
  initialNotifications?: NotificationsFeed;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

type AdminThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'rongilo_admin_theme';
const THEME_CHANGE_EVENT = 'rongilo-admin-theme-change';

function subscribeAdminTheme(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(THEME_CHANGE_EVENT, handler);
  };
}

function getAdminThemeSnapshot(): AdminThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function ThemeModeIcon({ mode }: { mode: AdminThemeMode }) {
  if (mode === 'dark') {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function DashboardShell({
  session,
  initialNotifications,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const theme = useSyncExternalStore<AdminThemeMode>(
    subscribeAdminTheme,
    getAdminThemeSnapshot,
    () => 'light',
  );

  const toggleTheme = () => {
    const next: AdminThemeMode = theme === 'light' ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    } catch {
      // Ignore storage failures
    }
  };

  const isStaffOnly = session.role === 'STAFF';
  const canViewFinance = session.role === 'OWNER' || session.role === 'ACCOUNTANT';

  const primaryNav: NavItem[] = isStaffOnly
    ? [{ href: '/staff', label: 'My Shoots & Tasks', icon: CheckCircleIcon }]
    : [
        { href: '/admin', label: 'Studio Pulse', icon: ApertureIcon, exact: true },
        { href: '/admin/inquiries', label: 'Inquiries', icon: CameraIcon },
        { href: '/admin/quotes', label: 'Quotes', icon: ReceiptIcon },
        { href: '/admin/bookings', label: 'Bookings', icon: ShieldCheckIcon },
        { href: '/admin/calendar', label: 'Schedule', icon: CalendarIcon },
        ...(canViewFinance
          ? [{ href: '/admin/finance', label: 'Finance Report', icon: ReceiptIcon }]
          : []),
        { href: '/staff', label: 'Crew Dispatch', icon: LayersIcon },
      ];

  const studioNav: NavItem[] = isStaffOnly
    ? []
    : [
        { href: '/admin/gallery', label: 'Gallery', icon: CameraIcon },
        { href: '/admin/portfolio', label: 'Client Portfolios', icon: LayersIcon },
        { href: '/admin/catalog', label: 'Packages', icon: PaletteIcon },
        { href: '/admin/crew', label: 'Crew & Gear', icon: UsersIcon },
        { href: '/admin/team', label: 'Team & Rules', icon: ShieldCheckIcon },
        { href: '/admin/settings', label: 'Settings', icon: SlidersIcon },
      ];

  const allItems = [...primaryNav, ...studioNav];

  const isItemActive = (item: NavItem) => {
    if (item.exact || item.href === '/admin') {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const activeNav = allItems.find(isItemActive) || allItems[0];

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push('/login');
      router.refresh();
    });
  };

  const initials = (session.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all',
          active
            ? 'font-semibold bg-[var(--admin-surface-subtle)] text-[var(--admin-text)] border border-[var(--admin-accent)]/35'
            : 'font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] border border-transparent',
        )}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--admin-accent)]"
          />
        )}
        <Icon
          className={cn(
            'w-4 h-4 shrink-0',
            active ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-muted)]',
          )}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      data-theme={theme}
      className="admin-shell min-h-screen flex bg-[var(--admin-canvas)] text-[var(--admin-text)] transition-colors duration-200"
    >
      {/* Wedding PhotoArt Branded Studio Sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 w-56 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-sidebar)]">
        <div className="h-[2px] w-full gold-hairline shrink-0" />
        {/* Studio Brand */}
        <div className="h-14 px-3.5 flex items-center border-b border-[var(--admin-border)] shrink-0">
          <Link
            href={isStaffOnly ? '/staff' : '/admin'}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <BrandMark
              size={34}
              variant={theme === 'dark' ? 'dark' : 'light'}
              alt={session.studioName || 'Wedding PhotoArt'}
              className="rounded-lg transition-transform duration-200 group-hover:scale-105"
            />
            <div className="min-w-0 leading-tight">
              <span className="text-[13px] font-semibold tracking-tight text-[var(--admin-text)] block truncate">
                {session.studioName || 'Wedding PhotoArt'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-accent)] block">
                Studio Cockpit
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-3">
          <div className="space-y-0.5">{primaryNav.map(renderNavLink)}</div>

          {studioNav.length > 0 && (
            <div className="pt-3 border-t border-[var(--admin-border)] space-y-0.5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-muted)]">
                Studio Craft
              </p>
              {studioNav.map(renderNavLink)}
            </div>
          )}
        </nav>

        {/* Footer + Theme Switcher */}
        <div className="p-2.5 border-t border-[var(--admin-border)] space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="flex-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] transition-colors"
            >
              <span>Public Site</span>
              <ExternalLinkIcon className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Obsidian Cinema' : 'Switch to Atelier Light'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
            >
              <ThemeModeIcon mode={theme} />
              <span>{theme === 'light' ? 'Cinema' : 'Ivory'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] border border-[var(--admin-accent)]/30 text-[11px] font-semibold text-[var(--admin-accent)] tabular-nums">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--admin-text)] truncate">
                  {session.name}
                </p>
                <p className="text-[10px] font-mono-code uppercase text-[var(--admin-muted)]">
                  {session.role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              title="Sign out"
              className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-56">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-header)] backdrop-blur-md px-6">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
            <span className="text-[14px] font-semibold text-[var(--admin-text)]">
              {pathname.startsWith('/admin/bookings/')
                ? 'Booking Details'
                : activeNav?.label || 'Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell initialFeed={initialNotifications} align="right" />

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Obsidian Cinema' : 'Switch to Atelier Light'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors cursor-pointer"
            >
              <ThemeModeIcon mode={theme} />
              <span>{theme === 'light' ? 'Obsidian Cinema' : 'Atelier Ivory'}</span>
            </button>

            {!isStaffOnly && (
              <>
                <Link
                  href="/admin/inquiries?new=1"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                  <span>Inquiry</span>
                </Link>
                <Link
                  href="/admin/quotes?new=1"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                  <span>Quote</span>
                </Link>
                <Link
                  href="/admin/calendar"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-accent-fg)] hover:opacity-95 transition-opacity"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-[var(--admin-border)] bg-[var(--admin-header)] backdrop-blur-md px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Link href={isStaffOnly ? '/staff' : '/admin'} className="flex items-center gap-2 min-w-0">
              <BrandMark
                size={28}
                variant={theme === 'dark' ? 'dark' : 'light'}
                alt={session.studioName || 'Wedding PhotoArt'}
                className="rounded-lg"
              />
              <span className="text-[13.5px] font-semibold tracking-tight text-[var(--admin-text)] truncate">
                {session.studioName || 'Wedding PhotoArt'}
              </span>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <NotificationBell initialFeed={initialNotifications} align="right" />

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--admin-text)] cursor-pointer"
              >
                <ThemeModeIcon mode={theme} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {allItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)] font-semibold'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
