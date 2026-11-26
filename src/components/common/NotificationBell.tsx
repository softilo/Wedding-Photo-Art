'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  NotificationsFeed,
  NotificationSeverity,
  StudioNotification,
} from '@/types/event-management';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/service/notifications/notifications.service';
import { cn } from '@/lib/utils';
import { BellIcon, CloseIcon, RefreshCwIcon } from '@/components/shared/Icons';

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  URGENT: 'bg-rose-500',
  ACTION: 'bg-amber-500',
  SUCCESS: 'bg-emerald-500',
  INFO: 'bg-[#CAA650]',
};

const CATEGORY_LABELS: Record<StudioNotification['category'], string> = {
  INQUIRY: 'Inquiry',
  PAYMENT: 'Payment',
  BOOKING: 'Booking',
  SCHEDULE: 'Schedule',
  TASK: 'Crew Task',
  DELIVERABLE: 'Deliverable',
};

function formatRelativeTime(iso: string): string {
  const createdMs = new Date(iso).getTime();
  if (Number.isNaN(createdMs)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(createdMs),
  );
}

interface NotificationBellProps {
  initialFeed?: NotificationsFeed;
  align?: 'right' | 'left';
}

const MIN_REVALIDATE_MS = 15_000;
let sharedInflightFetch: Promise<NotificationsFeed | null> | null = null;
let sharedLastFetchedAt = 0;
const feedSubscribers = new Set<(feed: NotificationsFeed) => void>();

function publishFeed(next: NotificationsFeed) {
  for (const notify of feedSubscribers) {
    notify(next);
  }
}

async function fetchNotificationsShared(force = false): Promise<NotificationsFeed | null> {
  const now = Date.now();
  if (!force && now - sharedLastFetchedAt < MIN_REVALIDATE_MS) {
    return null;
  }
  if (sharedInflightFetch) {
    return sharedInflightFetch;
  }
  sharedInflightFetch = (async () => {
    try {
      const res = await getNotifications(30, false, true);
      if (res.ok && res.data) {
        sharedLastFetchedAt = Date.now();
        publishFeed(res.data);
        return res.data;
      }
      return null;
    } finally {
      sharedInflightFetch = null;
    }
  })();
  return sharedInflightFetch;
}

export function NotificationBell({
  initialFeed = { unreadCount: 0, urgentUnreadCount: 0, items: [] },
  align = 'right',
}: NotificationBellProps) {
  const router = useRouter();
  const [feed, setFeed] = useState<NotificationsFeed>(initialFeed);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'unread' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onUpdate = (next: NotificationsFeed) => setFeed(next);
    feedSubscribers.add(onUpdate);
    return () => {
      feedSubscribers.delete(onUpdate);
    };
  }, []);

  const loadFeed = useCallback(async (force = false) => {
    setRefreshing(true);
    await fetchNotificationsShared(force);
    setRefreshing(false);
  }, []);

  // Periodic background sync + refresh on focus or mutation events (deduplicated across desktop/mobile bells)
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadFeed(false);
    }, 60_000);

    const onFocus = () => {
      void loadFeed(false);
    };
    const onMutationRefresh = () => {
      void loadFeed(true);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('rongilo-notifications-refresh', onMutationRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('rongilo-notifications-refresh', onMutationRefresh);
    };
  }, [loadFeed]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void loadFeed();
    }
  };

  const handleItemClick = (item: StudioNotification) => {
    if (!item.isRead) {
      setFeed((prev) => ({
        unreadCount: Math.max(0, prev.unreadCount - 1),
        urgentUnreadCount:
          item.severity === 'URGENT'
            ? Math.max(0, prev.urgentUnreadCount - 1)
            : prev.urgentUnreadCount,
        items: prev.items.map((n) =>
          n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      }));
      startTransition(async () => {
        await markNotificationRead(item.id);
      });
    }
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  };

  const handleMarkAllRead = () => {
    if (feed.unreadCount === 0) return;
    setFeed((prev) => ({
      unreadCount: 0,
      urgentUnreadCount: 0,
      items: prev.items.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    }));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  };

  const visibleItems =
    tab === 'unread' ? feed.items.filter((i) => !i.isRead) : feed.items;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications (${feed.unreadCount} unread)`}
        aria-expanded={open}
        className="relative inline-flex items-center justify-center rounded-full sm:rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] h-9 w-9 sm:h-8 sm:w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] active:scale-95 transition-all cursor-pointer"
      >
        <BellIcon className="w-4 h-4" />
        {feed.unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center tabular-nums leading-none',
              feed.urgentUnreadCount > 0
                ? 'bg-rose-500 text-white'
                : 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]',
            )}
          >
            {feed.unreadCount > 99 ? '99+' : feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] admin-sheet-fade"
          />
          <div
            className={cn(
              'fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] sm:inset-auto sm:top-full sm:mt-2 sm:w-[390px] rounded-2xl sm:rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] z-50 overflow-hidden shadow-2xl max-h-[75dvh] sm:max-h-none flex flex-col admin-sheet-fade',
              align === 'right' ? 'sm:right-0' : 'sm:left-0',
            )}
          >
            {/* Popover Header */}
            <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between gap-2 shrink-0">
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--admin-text)]">
                  Action Alerts
                </p>
                <p className="text-[11.5px] text-[var(--admin-muted)] tabular-nums">
                  {feed.unreadCount} unread
                  {feed.urgentUnreadCount > 0
                    ? ` • ${feed.urgentUnreadCount} urgent`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void loadFeed(true)}
                  disabled={refreshing}
                  title="Refresh alerts"
                  className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-surface-subtle)] hover:text-[var(--admin-text)] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCwIcon className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                </button>
                {feed.unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleMarkAllRead}
                    className="rounded-lg px-2 py-1 text-[11.5px] font-medium text-[var(--admin-accent)] hover:bg-[var(--admin-accent-soft)] cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close alerts"
                  className="sm:hidden rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-surface-subtle)] hover:text-[var(--admin-text)] cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11.5px] font-medium cursor-pointer tabular-nums',
                  tab === 'all'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                    : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                )}
              >
                All ({feed.items.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('unread')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11.5px] font-medium cursor-pointer tabular-nums',
                  tab === 'unread'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                    : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                )}
              >
                Unread ({feed.unreadCount})
              </button>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 sm:max-h-[380px] overflow-y-auto no-scrollbar divide-y divide-[var(--admin-border)]">
              {visibleItems.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-1">
                  <p className="text-[13px] font-medium text-[var(--admin-text)]">
                    {tab === 'unread' ? 'All caught up' : 'No alerts yet'}
                  </p>
                  <p className="text-[12px] text-[var(--admin-muted)]">
                    High-priority alerts for inquiries, payment verification, schedule changes, and overdue deliverables appear here.
                  </p>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-[var(--admin-surface-subtle)] transition-colors flex items-start gap-2.5 cursor-pointer',
                      !item.isRead && 'bg-[var(--admin-accent-soft)]/35',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 h-2 w-2 rounded-full shrink-0',
                        SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.INFO,
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        <span className="text-[11px] text-[var(--admin-muted)] tabular-nums shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-[13px] leading-snug line-clamp-1',
                          item.isRead
                            ? 'font-normal text-[var(--admin-text)]'
                            : 'font-semibold text-[var(--admin-text)]',
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-[12px] text-[var(--admin-muted)] leading-relaxed line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span
                        aria-label="Unread"
                        className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)] shrink-0"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
