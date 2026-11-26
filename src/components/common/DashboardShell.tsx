'use client';

import React, { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
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
  CloseIcon,
  ExternalLinkIcon,
  GalleryHorizontalIcon,
  LayersIcon,
  LayoutGridIcon,
  LogOutIcon,
  PaletteIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SlidersIcon,
  StarIcon,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    if (quickCreateOpen) setQuickCreateOpen(false);
  }

  useEffect(() => {
    if (!mobileMenuOpen && !quickCreateOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setQuickCreateOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, quickCreateOpen]);

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
        { href: '/admin/hero', label: 'Public Page Setup', icon: GalleryHorizontalIcon },
        { href: '/admin/reviews', label: 'Client Reviews', icon: StarIcon },
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
  const isBookingDetail = pathname.startsWith('/admin/bookings/');
  const mobileScreenTitle = isBookingDetail
    ? 'Booking Details'
    : activeNav?.label || 'Workspace';

  const mobilePrimaryTabs: NavItem[] = isStaffOnly
    ? [{ href: '/staff', label: 'My Shoots', icon: CheckCircleIcon }]
    : [
        { href: '/admin', label: 'Pulse', icon: ApertureIcon, exact: true },
        { href: '/admin/bookings', label: 'Bookings', icon: ShieldCheckIcon },
        { href: '/admin/calendar', label: 'Schedule', icon: CalendarIcon },
        { href: '/admin/inquiries', label: 'Inquiries', icon: CameraIcon },
      ];

  const isStudioMenuActive =
    mobileMenuOpen || (!isStaffOnly && !mobilePrimaryTabs.some(isItemActive));

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
            <a
              href="/?external=1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] transition-colors"
            >
              <span>Public Site</span>
              <ExternalLinkIcon className="w-3 h-3" />
            </a>
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

        {/* Native-Style Mobile Top App Bar */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-[var(--admin-border)] bg-[var(--admin-header)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="h-12 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isBookingDetail ? (
                <Link
                  href="/admin/bookings"
                  aria-label="Back to Bookings"
                  className="h-8 w-8 shrink-0 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] inline-flex items-center justify-center text-[var(--admin-text)] active:scale-95 transition-transform"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(false);
                    setMobileMenuOpen(true);
                  }}
                  aria-label="Open Studio App Menu"
                  className="shrink-0 rounded-xl active:scale-95 transition-transform cursor-pointer"
                >
                  <BrandMark
                    size={28}
                    variant={theme === 'dark' ? 'dark' : 'light'}
                    alt={session.studioName || 'Wedding PhotoArt'}
                    className="rounded-lg"
                  />
                </button>
              )}

              <div className="min-w-0 leading-tight">
                <p className="text-[14.5px] font-semibold tracking-tight text-[var(--admin-text)] truncate">
                  {mobileScreenTitle}
                </p>
                <p className="text-[10px] font-medium text-[var(--admin-muted)] truncate">
                  {session.studioName || 'Wedding PhotoArt'} • {session.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isStaffOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setQuickCreateOpen(true);
                  }}
                  aria-label="Quick create"
                  className="h-8 w-8 rounded-full bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] inline-flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}

              <NotificationBell initialFeed={initialNotifications} align="right" />

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-8 w-8 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] inline-flex items-center justify-center text-[var(--admin-text)] active:scale-95 transition-transform cursor-pointer"
              >
                <ThemeModeIcon mode={theme} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-3 sm:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6 max-w-7xl w-full mx-auto overflow-x-clip">
          {children}
        </main>

        {/* Native Fixed Bottom Tab Bar on Mobile */}
        <nav
          aria-label="Mobile workspace navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--admin-border)] bg-[var(--admin-header)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_-16px_rgba(0,0,0,0.18)]"
        >
          {isStaffOnly ? (
            <div className="grid grid-cols-3 h-14 px-2 items-center gap-1">
              <Link
                href="/staff"
                className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl active:scale-95 transition-transform"
              >
                <span
                  className={cn(
                    'px-4 py-1 rounded-full transition-colors',
                    pathname.startsWith('/staff')
                      ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                      : 'text-[var(--admin-muted)]',
                  )}
                >
                  <CheckCircleIcon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className={cn(
                    'text-[10.5px] leading-none',
                    pathname.startsWith('/staff')
                      ? 'font-semibold text-[var(--admin-accent)]'
                      : 'font-medium text-[var(--admin-muted)]',
                  )}
                >
                  My Shoots
                </span>
              </Link>

              <a
                href="/?external=1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl active:scale-95 transition-transform"
              >
                <span className="px-4 py-1 rounded-full text-[var(--admin-muted)]">
                  <ExternalLinkIcon className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[10.5px] font-medium leading-none text-[var(--admin-muted)]">
                  Public Site
                </span>
              </a>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <span
                  className={cn(
                    'px-4 py-1 rounded-full transition-colors',
                    mobileMenuOpen
                      ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                      : 'text-[var(--admin-muted)]',
                  )}
                >
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-[9px] font-bold">
                    {initials}
                  </span>
                </span>
                <span
                  className={cn(
                    'text-[10.5px] leading-none',
                    mobileMenuOpen
                      ? 'font-semibold text-[var(--admin-accent)]'
                      : 'font-medium text-[var(--admin-muted)]',
                  )}
                >
                  Account
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 h-14 px-1 items-center">
              {mobilePrimaryTabs.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item) && !mobileMenuOpen;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl active:scale-95 transition-transform"
                  >
                    <span
                      className={cn(
                        'px-3 py-0.5 rounded-full transition-colors',
                        active
                          ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                          : 'text-[var(--admin-muted)]',
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span
                      className={cn(
                        'text-[10px] leading-none truncate max-w-full px-0.5',
                        active
                          ? 'font-semibold text-[var(--admin-accent)]'
                          : 'font-medium text-[var(--admin-muted)]',
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setQuickCreateOpen(false);
                  setMobileMenuOpen(true);
                }}
                aria-expanded={mobileMenuOpen}
                className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                <span
                  className={cn(
                    'px-3 py-0.5 rounded-full transition-colors',
                    isStudioMenuActive
                      ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                      : 'text-[var(--admin-muted)]',
                  )}
                >
                  <LayoutGridIcon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-none',
                    isStudioMenuActive
                      ? 'font-semibold text-[var(--admin-accent)]'
                      : 'font-medium text-[var(--admin-muted)]',
                  )}
                >
                  Studio
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Slide-Up Quick Create Sheet on Mobile */}
        {!isStaffOnly && quickCreateOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick create action sheet"
            onClick={(e) => {
              if (e.target === e.currentTarget) setQuickCreateOpen(false);
            }}
            className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-[2px] admin-sheet-fade"
          >
            <div className="w-full rounded-t-3xl border-t border-[var(--admin-border)] bg-[var(--admin-surface)] pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-hidden admin-sheet-up">
              <div className="pt-2.5 pb-1 flex justify-center">
                <span className="h-1 w-10 rounded-full bg-[var(--admin-border)]" />
              </div>
              <div className="px-4 py-2.5 border-b border-[var(--admin-border)] flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-[var(--admin-text)]">
                    Quick Action
                  </p>
                  <p className="text-[11.5px] text-[var(--admin-muted)]">
                    Jump straight to creating a lead, quote, or shoot
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickCreateOpen(false)}
                  aria-label="Close quick actions"
                  className="h-8 w-8 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] inline-flex items-center justify-center text-[var(--admin-muted)]"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-2.5">
                <Link
                  href="/admin/inquiries?new=1"
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 active:scale-[0.99] transition-transform"
                >
                  <span className="h-10 w-10 rounded-xl bg-[var(--admin-accent-soft)] text-[var(--admin-accent)] inline-flex items-center justify-center shrink-0">
                    <CameraIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--admin-text)]">
                      Log Client Inquiry
                    </p>
                    <p className="text-[12px] text-[var(--admin-muted)]">
                      Capture phone, WhatsApp, or walk-in event request
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/quotes?new=1"
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 active:scale-[0.99] transition-transform"
                >
                  <span className="h-10 w-10 rounded-xl bg-[#CAA650]/18 text-[var(--admin-accent)] inline-flex items-center justify-center shrink-0">
                    <ReceiptIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--admin-text)]">
                      Create Price Quote
                    </p>
                    <p className="text-[12px] text-[var(--admin-muted)]">
                      Build itemized pricing from studio packages
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/calendar"
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 active:scale-[0.99] transition-transform"
                >
                  <span className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 inline-flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--admin-text)]">
                      Open Shoot Calendar
                    </p>
                    <p className="text-[12px] text-[var(--admin-muted)]">
                      Reserve shoot time slots, crew members &amp; gear
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Slide-Up Studio App Launcher Sheet on Mobile */}
        {mobileMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studio navigation menu"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
            className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-[2px] admin-sheet-fade"
          >
            <div className="w-full rounded-t-3xl border-t border-[var(--admin-border)] bg-[var(--admin-surface)] max-h-[86dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] admin-sheet-up">
              <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                <span className="h-1 w-10 rounded-full bg-[var(--admin-border)]" />
              </div>

              {/* Sheet Header */}
              <div className="px-4 py-2.5 border-b border-[var(--admin-border)] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrandMark
                    size={32}
                    variant={theme === 'dark' ? 'dark' : 'light'}
                    alt={session.studioName || 'Wedding PhotoArt'}
                    className="rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-[var(--admin-text)] truncate">
                      {session.studioName || 'Wedding PhotoArt'}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-accent)]">
                      Studio Cockpit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close studio menu"
                  className="h-8 w-8 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] inline-flex items-center justify-center text-[var(--admin-muted)] cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Sheet Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
                {/* Account & Preferences Card */}
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] border border-[var(--admin-accent)]/30 text-xs font-bold text-[var(--admin-accent)] tabular-nums">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-[var(--admin-text)] truncate">
                          {session.name}
                        </p>
                        <p className="text-[10.5px] font-mono-code uppercase text-[var(--admin-muted)]">
                          {session.role}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 active:scale-95 transition-transform cursor-pointer"
                    >
                      <LogOutIcon className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/?external=1"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-2 text-xs font-medium text-[var(--admin-text)] active:scale-95 transition-transform"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                      <span>Public Storefront</span>
                    </a>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-2 text-xs font-medium text-[var(--admin-text)] active:scale-95 transition-transform cursor-pointer"
                    >
                      <ThemeModeIcon mode={theme} />
                      <span>{theme === 'light' ? 'Obsidian Cinema' : 'Atelier Ivory'}</span>
                    </button>
                  </div>
                </div>

                {/* Operations App Launcher */}
                <div className="space-y-2">
                  <p className="px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">
                    Operations
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {primaryNav.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'rounded-2xl border p-2.5 flex flex-col items-center justify-center gap-1.5 text-center min-h-[76px] active:scale-95 transition-all',
                            active
                              ? 'border-[var(--admin-accent)]/60 bg-[var(--admin-accent-soft)] text-[var(--admin-text)]'
                              : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70 text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                          )}
                        >
                          <span
                            className={cn(
                              'h-8 w-8 rounded-xl flex items-center justify-center',
                              active
                                ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                                : 'bg-[var(--admin-surface)] text-[var(--admin-accent)] border border-[var(--admin-border)]',
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <span
                            className={cn(
                              'text-[11px] leading-tight line-clamp-1',
                              active ? 'font-semibold text-[var(--admin-text)]' : 'font-medium',
                            )}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Studio Craft App Launcher */}
                {studioNav.length > 0 && (
                  <div className="space-y-2">
                    <p className="px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">
                      Studio Craft
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {studioNav.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'rounded-2xl border p-2.5 flex flex-col items-center justify-center gap-1.5 text-center min-h-[76px] active:scale-95 transition-all',
                              active
                                ? 'border-[var(--admin-accent)]/60 bg-[var(--admin-accent-soft)] text-[var(--admin-text)]'
                                : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]/70 text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                            )}
                          >
                            <span
                              className={cn(
                                'h-8 w-8 rounded-xl flex items-center justify-center',
                                active
                                  ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                                  : 'bg-[var(--admin-surface)] text-[var(--admin-accent)] border border-[var(--admin-border)]',
                              )}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span
                              className={cn(
                                'text-[11px] leading-tight line-clamp-1',
                                active ? 'font-semibold text-[var(--admin-text)]' : 'font-medium',
                              )}
                            >
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
