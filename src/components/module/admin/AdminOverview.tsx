'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AutomationAlerts,
  Booking,
  EventSession,
  FinancialReportData,
  Inquiry,
  Quote,
  StudioSettings,
} from '@/types/event-management';
import { cn, formatDateTimeInTz, formatLocalDate, formatPoisha } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  ApertureIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  ReceiptIcon,
  UsersIcon,
} from '@/components/shared/Icons';
import {
  formatCompactPoisha,
  formatMonthShort,
  GroupedBarChart,
} from './AdminCharts';
import { BookingQuickDrawer } from './BookingQuickDrawer';

interface AdminOverviewProps {
  settings: StudioSettings | null;
  inquiries: Inquiry[];
  quotes: Quote[];
  bookings: Booking[];
  upcomingSessions: EventSession[];
  alerts?: AutomationAlerts | null;
  financialReport?: FinancialReportData | null;
  windowStartDate?: string;
}

type AlertTab = 'payments' | 'confirm' | 'unscheduled' | 'deliverables';
type TrendChartMode = 'cashflow' | 'activity' | 'shoots';

function toLocalMonthKey(dateInput: string, timezone: string): string | null {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    return y && m ? `${y}-${m}` : null;
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

function toLocalDateKey(dateInput: string | Date, timezone: string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function AdminOverview({
  settings,
  inquiries,
  quotes,
  bookings,
  upcomingSessions,
  alerts,
  financialReport,
  windowStartDate,
}: AdminOverviewProps) {
  const router = useRouter();
  const currency = settings?.currency || 'BDT';
  const timezone = settings?.timezone || 'Asia/Dhaka';
  const [fallbackDate] = useState(() => new Date().toISOString().slice(0, 10));
  const anchorDate = windowStartDate || fallbackDate;

  const newInquiriesCount = inquiries.filter((i) => i.status === 'NEW').length;
  const openQuotesCount = quotes.filter(
    (q) => q.status === 'DRAFT' || q.status === 'SENT',
  ).length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const pendingConfirmCount = bookings.filter(
    (b) => b.status === 'PENDING_CONFIRMATION',
  ).length;
  const totalAgreedPoisha = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((acc, b) => acc + b.agreedTotalPoisha, 0);

  const hasCashflowData = Boolean(
    financialReport && financialReport.byMonth.length > 0,
  );

  const [trendMode, setTrendMode] = useState<TrendChartMode>(
    hasCashflowData ? 'cashflow' : 'activity',
  );

  const cashflowChartData = useMemo(() => {
    if (!financialReport) return [];
    return [...financialReport.byMonth]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((m) => {
        const expenses = m.expensesPoisha ?? 0;
        const profit = m.netCashProfitPoisha ?? m.netCollectedPoisha - expenses;
        return {
          label: formatMonthShort(m.month),
          sublabel: m.month,
          values: [m.netCollectedPoisha, expenses, profit],
        };
      });
  }, [financialReport]);

  const activityChartData = useMemo(() => {
    const keys: string[] = [];
    const anchor = new Date(`${anchorDate}T12:00:00.000Z`);
    const base = Number.isNaN(anchor.getTime()) ? new Date(0) : anchor;
    for (let offset = 5; offset >= 0; offset--) {
      const ref = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 15));
      keys.push(ref.toISOString().slice(0, 7));
    }
    const map = new Map<string, { inquiries: number; bookings: number }>();
    for (const k of keys) map.set(k, { inquiries: 0, bookings: 0 });

    for (const inq of inquiries) {
      const mk = toLocalMonthKey(inq.createdAt, timezone);
      if (mk && map.has(mk)) {
        map.get(mk)!.inquiries += 1;
      }
    }
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue;
      const mk = toLocalMonthKey(b.createdAt, timezone);
      if (mk && map.has(mk)) {
        map.get(mk)!.bookings += 1;
      }
    }

    return keys.map((k) => {
      const entry = map.get(k)!;
      return {
        label: formatMonthShort(k),
        sublabel: k,
        values: [entry.inquiries, entry.bookings],
      };
    });
  }, [inquiries, bookings, timezone, anchorDate]);

  const shootLoadChartData = useMemo(() => {
    const countByDay = new Map<string, number>();
    for (const s of upcomingSessions) {
      if (s.status === 'CANCELLED') continue;
      const dk = s.agencyLocalDate || toLocalDateKey(s.startAt, timezone);
      if (dk) {
        countByDay.set(dk, (countByDay.get(dk) ?? 0) + 1);
      }
    }

    const days: Array<{ label: string; sublabel: string; values: number[] }> = [];
    const parsed = Date.parse(`${anchorDate}T12:00:00.000Z`);
    const baseMs = Number.isNaN(parsed) ? 0 : parsed;
    for (let i = 0; i < 14; i++) {
      const d = new Date(baseMs + i * 24 * 60 * 60 * 1000);
      const dk = toLocalDateKey(d, timezone);
      const short = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        day: '2-digit',
        month: 'short',
      }).format(d);
      days.push({
        label: short.split(' ')[0] || short,
        sublabel: short,
        values: [countByDay.get(dk) ?? 0],
      });
    }
    return days;
  }, [upcomingSessions, timezone, anchorDate]);

  const defaultAlertTab: AlertTab =
    (alerts?.counts.pendingPayments ?? 0) > 0
      ? 'payments'
      : (alerts?.counts.readyToConfirm ?? 0) > 0
        ? 'confirm'
        : (alerts?.counts.unscheduledConfirmed ?? 0) > 0
          ? 'unscheduled'
          : 'deliverables';

  const [alertTab, setAlertTab] = useState<AlertTab>(defaultAlertTab);
  const [drawerState, setDrawerState] = useState<{
    bookingId: string;
    focus: 'payments' | 'confirm' | 'schedule' | 'deliverables' | 'overview';
  } | null>(null);

  const totalAlerts =
    (alerts?.counts.pendingPayments ?? 0) +
    (alerts?.counts.readyToConfirm ?? 0) +
    (alerts?.counts.unscheduledConfirmed ?? 0) +
    (alerts?.counts.urgentDeliverables ?? 0);

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Compact Minimal Studio KPI Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/inquiries"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-2 sm:px-3.5 sm:py-3 hover:border-[var(--admin-accent)]/60 transition-colors group flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[var(--admin-muted)] truncate">
              Inquiries
            </p>
            <p className="text-base sm:text-xl font-semibold tracking-tight text-[var(--admin-text)] mt-0.5 tabular-nums truncate">
              {newInquiriesCount}
              <span className="text-[10px] sm:text-[11px] font-normal text-[var(--admin-muted)] ml-1">
                new • {inquiries.length} total
              </span>
            </p>
          </div>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <ApertureIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </Link>

        <Link
          href="/admin/quotes"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-2 sm:px-3.5 sm:py-3 hover:border-[var(--admin-accent)]/60 transition-colors group flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[var(--admin-muted)] truncate">
              Price Quotes
            </p>
            <p className="text-base sm:text-xl font-semibold tracking-tight text-[var(--admin-text)] mt-0.5 tabular-nums truncate">
              {openQuotesCount}
              <span className="text-[10px] sm:text-[11px] font-normal text-[var(--admin-muted)] ml-1">
                active • {quotes.length} total
              </span>
            </p>
          </div>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[#CAA650]/15 text-[#8B6A21]">
            <ReceiptIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </Link>

        <Link
          href="/admin/bookings"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-2 sm:px-3.5 sm:py-3 hover:border-[var(--admin-accent)]/60 transition-colors group flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[var(--admin-muted)] truncate">
              Bookings
            </p>
            <p className="text-base sm:text-xl font-semibold tracking-tight text-[var(--admin-text)] mt-0.5 tabular-nums truncate">
              {confirmedCount}
              <span className="text-[10px] sm:text-[11px] font-normal text-[var(--admin-muted)] ml-1">
                {pendingConfirmCount > 0
                  ? `conf • ${pendingConfirmCount} pend`
                  : `• ${formatPoisha(totalAgreedPoisha, currency)}`}
              </span>
            </p>
          </div>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600">
            <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </Link>

        <Link
          href="/admin/calendar"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-2 sm:px-3.5 sm:py-3 hover:border-[var(--admin-accent)]/60 transition-colors group flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[var(--admin-muted)] truncate">
              Upcoming Shoots
            </p>
            <p className="text-base sm:text-xl font-semibold tracking-tight text-[var(--admin-text)] mt-0.5 tabular-nums truncate">
              {upcomingSessions.length}
              <span className="text-[10px] sm:text-[11px] font-normal text-[var(--admin-muted)] ml-1">
                next 14d
              </span>
            </p>
          </div>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </Link>
      </div>

      {/* Studio Analytics Charts Row */}
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
            <div className="flex items-center gap-2.5">
              <BarChartIcon className="w-4 h-4 text-[var(--admin-accent)] shrink-0" />
              <div>
                <h2 className="admin-section-title">Studio Performance Trend</h2>
                <p className="admin-meta">
                  {trendMode === 'cashflow'
                    ? 'Monthly verified collections, expenses, and cash profit'
                    : trendMode === 'activity'
                      ? 'Last 6 months of incoming leads vs. bookings created'
                      : 'Scheduled shoot density across the next 14 days'}
                </p>
              </div>
            </div>

            <div className="inline-flex flex-wrap rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1 shrink-0">
              {[
                ...(hasCashflowData
                  ? [{ id: 'cashflow' as const, label: 'Cashflow' }]
                  : []),
                { id: 'activity' as const, label: 'Bookings' },
                { id: 'shoots' as const, label: '14d Shoots' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrendMode(t.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    trendMode === t.id
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {trendMode === 'cashflow' && financialReport && (
            <>
              <GroupedBarChart
                data={cashflowChartData}
                series={[
                  { key: 'collected', label: 'Collected', color: '#10B981' },
                  { key: 'expenses', label: 'Expenses', color: '#9E6359' },
                  { key: 'profit', label: 'Net Profit', color: '#CAA650' },
                ]}
                formatValue={(v) => formatPoisha(v, currency)}
                formatAxis={(v) => formatCompactPoisha(v, currency)}
                emptyMessage="No monthly financial transactions recorded yet."
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px] text-[var(--admin-muted)] tabular-nums">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    Collection rate:{' '}
                    <strong className="font-semibold text-[var(--admin-text)]">
                      {financialReport.summary.collectionRatePercent.toFixed(1)}%
                    </strong>
                  </span>
                  <span>
                    Margin:{' '}
                    <strong className="font-semibold text-[var(--admin-text)]">
                      {(financialReport.summary.profitMarginPercent ?? 0).toFixed(1)}%
                    </strong>
                  </span>
                  <span>
                    Client due:{' '}
                    <strong className="font-semibold text-[var(--admin-text)]">
                      {formatPoisha(
                        financialReport.summary.totalOutstandingDuePoisha,
                        currency,
                      )}
                    </strong>
                  </span>
                </div>
                <Link
                  href="/admin/finance"
                  className="font-medium text-[var(--admin-accent)] hover:underline"
                >
                  Finance report →
                </Link>
              </div>
            </>
          )}

          {trendMode === 'activity' && (
            <GroupedBarChart
              data={activityChartData}
              series={[
                { key: 'inquiries', label: 'Inquiries', color: '#CAA650' },
                { key: 'bookings', label: 'Active Bookings', color: '#6F6130' },
              ]}
              formatValue={(v) => `${Math.round(v)}`}
              formatAxis={(v) => `${Math.round(v)}`}
              emptyMessage="No inquiry or booking records yet."
            />
          )}

          {trendMode === 'shoots' && (
            <GroupedBarChart
              data={shootLoadChartData}
              series={[{ key: 'shoots', label: 'Scheduled Shoots', color: '#CAA650' }]}
              formatValue={(v) => `${Math.round(v)} ${v === 1 ? 'shoot' : 'shoots'}`}
              formatAxis={(v) => `${Math.round(v)}`}
              maxVisibleXLabels={7}
              emptyMessage="No shoots scheduled in the next 14 days."
            />
          )}
        </section>

        <section className="lg:col-span-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2.5 sm:pb-3 mb-2.5 sm:mb-3">
            <div>
              <h2 className="admin-section-title">Upcoming Shoots</h2>
              <p className="admin-meta">Next 14 days in {timezone}</p>
            </div>
            <Link
              href="/admin/calendar"
              className="text-xs font-medium text-[var(--admin-accent)] hover:underline shrink-0"
            >
              Open calendar →
            </Link>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-center">
              <p className="admin-meta">No sessions scheduled in the next 14 days.</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-2.5">
              {upcomingSessions.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.bookingId) {
                      setDrawerState({ bookingId: s.bookingId, focus: 'schedule' });
                    } else {
                      router.push('/admin/calendar');
                    }
                  }}
                  className="w-full text-left block rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] p-2.5 sm:p-3 space-y-0.5 sm:space-y-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono-code font-medium text-[var(--admin-accent)] tabular-nums">
                      {s.agencyLocalDate || formatLocalDate(s.startAt)}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="admin-row-title line-clamp-1">{s.title}</p>
                  <p className="admin-meta tabular-nums line-clamp-1">
                    {formatDateTimeInTz(s.startAt, timezone)} →{' '}
                    {formatDateTimeInTz(s.endAt, timezone)}
                  </p>
                  {s.booking && (
                    <p className="admin-meta line-clamp-1 tabular-nums">
                      {s.booking.reference} — {s.booking.eventTitle}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Needs Your Attention — Interactive Quick-Drawer Queue */}
      {alerts && (
        <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 border-b border-[var(--admin-border)] pb-2.5 sm:pb-3.5">
            <div className="flex items-center gap-2.5">
              <CheckCircleIcon className="w-4 h-4 text-[var(--admin-accent)] shrink-0" />
              <div>
                <h2 className="admin-section-title tabular-nums">
                  Needs Attention ({totalAlerts})
                </h2>
                <p className="admin-meta">
                  Click any item to verify receipts, confirm booking, or inspect in a slide-over drawer.
                </p>
              </div>
            </div>

            <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1">
              {[
                {
                  id: 'payments' as const,
                  label: 'Verify Payments',
                  count: alerts.counts.pendingPayments,
                  dot: 'bg-amber-500',
                },
                {
                  id: 'confirm' as const,
                  label: 'Ready to Confirm',
                  count: alerts.counts.readyToConfirm,
                  dot: 'bg-emerald-500',
                },
                {
                  id: 'unscheduled' as const,
                  label: 'Needs Shoot Slot',
                  count: alerts.counts.unscheduledConfirmed,
                  dot: 'bg-[#CAA650]',
                },
                {
                  id: 'deliverables' as const,
                  label: 'Urgent Files',
                  count: alerts.counts.urgentDeliverables,
                  dot: 'bg-rose-400',
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAlertTab(t.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 sm:py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums',
                    alertTab === t.id
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  <span className={cn('h-[6px] w-[6px] rounded-full', t.dot)} />
                  <span>{t.label}</span>
                  <span className="font-mono-code text-[11px] opacity-75">({t.count})</span>
                </button>
              ))}
            </div>
          </div>

          {totalAlerts === 0 ? (
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-4 py-3 text-[12.5px] text-[var(--admin-muted)] flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-full bg-emerald-500 shrink-0" />
              <span>
                All caught up — no pending payment approvals, unconfirmed bookings, or overdue files.
              </span>
            </div>
          ) : (
            <div>
              {alertTab === 'payments' && (
                <div>
                  {alerts.pendingPayments.length === 0 ? (
                    <p className="admin-meta py-4 text-center">
                      No payments waiting for verification.
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {alerts.pendingPayments.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setDrawerState({ bookingId: p.bookingId, focus: 'payments' })
                          }
                          className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3.5 py-3 hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="admin-row-title line-clamp-1">
                              <span className="font-mono-code text-xs text-[var(--admin-muted)] mr-1.5 tabular-nums">
                                {p.booking.reference}
                              </span>
                              {p.booking.clientName}
                            </p>
                            <p className="admin-meta flex items-center gap-1.5 line-clamp-1 tabular-nums">
                              <span className="h-[6px] w-[6px] rounded-full bg-amber-500 shrink-0" />
                              <span>
                                {p.method}
                                {p.transactionRef ? ` (${p.transactionRef})` : ''} • Pending verify
                              </span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono-code text-[13.5px] font-semibold text-[var(--admin-text)] tabular-nums">
                              {formatPoisha(p.amountPoisha, p.currency)}
                            </p>
                            <span className="text-[12px] font-medium text-[var(--admin-accent)]">
                              Review →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {alertTab === 'confirm' && (
                <div>
                  {alerts.readyToConfirmBookings.length === 0 ? (
                    <p className="admin-meta py-4 text-center">
                      No bookings ready for confirmation.
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {alerts.readyToConfirmBookings.slice(0, 6).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setDrawerState({ bookingId: b.id, focus: 'confirm' })}
                          className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3.5 py-3 hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="admin-row-title line-clamp-1">
                              <span className="font-mono-code text-xs text-[var(--admin-muted)] mr-1.5 tabular-nums">
                                {b.reference}
                              </span>
                              {b.eventTitle}
                            </p>
                            <p className="admin-meta flex items-center gap-1.5 line-clamp-1 tabular-nums">
                              <span className="h-[6px] w-[6px] rounded-full bg-emerald-500 shrink-0" />
                              <span>
                                {b.clientName} • {formatLocalDate(b.eventDate)}
                              </span>
                            </p>
                          </div>
                          <span className="text-[12px] font-semibold text-[var(--admin-accent)] shrink-0">
                            Confirm →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {alertTab === 'unscheduled' && (
                <div>
                  {alerts.unscheduledConfirmedBookings.length === 0 ? (
                    <p className="admin-meta py-4 text-center">
                      Every confirmed booking has at least one scheduled shoot slot.
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {alerts.unscheduledConfirmedBookings.slice(0, 6).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setDrawerState({ bookingId: b.id, focus: 'schedule' })}
                          className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3.5 py-3 hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="admin-row-title line-clamp-1">
                              <span className="font-mono-code text-xs text-[var(--admin-muted)] mr-1.5 tabular-nums">
                                {b.reference}
                              </span>
                              {b.eventTitle}
                            </p>
                            <p className="admin-meta flex items-center gap-1.5 line-clamp-1 tabular-nums">
                              <span className="h-[6px] w-[6px] rounded-full bg-[#CAA650] shrink-0" />
                              <span>
                                {b.clientName} • {formatLocalDate(b.eventDate)}
                              </span>
                            </p>
                          </div>
                          <span className="text-[12px] font-medium text-[var(--admin-accent)] shrink-0">
                            Open →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {alertTab === 'deliverables' && (
                <div>
                  {alerts.urgentDeliverables.length === 0 ? (
                    <p className="admin-meta py-4 text-center">
                      No urgent or overdue deliverables right now.
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {alerts.urgentDeliverables.slice(0, 6).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            setDrawerState({ bookingId: d.bookingId, focus: 'deliverables' })
                          }
                          className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3.5 py-3 hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="admin-row-title line-clamp-1">{d.label}</p>
                            <p className="admin-meta line-clamp-1 tabular-nums">
                              {d.booking.reference} • {d.booking.eventTitle}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-mono-code text-[var(--admin-muted)] shrink-0 tabular-nums">
                            <span
                              className={cn(
                                'h-[6px] w-[6px] rounded-full',
                                d.isOverdue ? 'bg-rose-400' : 'bg-amber-500',
                              )}
                            />
                            {d.isOverdue ? 'Overdue' : formatLocalDate(d.dueAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Full-Width Recent Bookings Section */}
      <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2.5 sm:pb-3">
          <div>
            <h2 className="admin-section-title">Recent Bookings</h2>
            <p className="admin-meta">
              Click any booking to open its quick-action drawer
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-[var(--admin-accent)] hover:underline tabular-nums shrink-0"
          >
            View all ({bookings.length}) →
          </Link>
        </div>

        {bookings.length === 0 ? (
          <p className="admin-meta py-8 text-center">
            No bookings yet. Accept a quote in Price Quotes to create one.
          </p>
        ) : (
          <div className="grid gap-2 sm:gap-2.5 md:grid-cols-2">
            {bookings.slice(0, 6).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setDrawerState({ bookingId: b.id, focus: 'overview' })}
                className="w-full text-left rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-2 sm:px-3.5 sm:py-3 hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-code text-xs text-[var(--admin-muted)] tabular-nums">
                      {b.reference}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="admin-row-title group-hover:text-[var(--admin-accent)] transition-colors line-clamp-1">
                    {b.eventTitle}
                  </p>
                  <p className="admin-meta line-clamp-1 tabular-nums">
                    {b.clientName} • {formatLocalDate(b.eventDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-code text-[14px] font-medium text-[var(--admin-text)] tabular-nums">
                    {formatPoisha(b.agreedTotalPoisha, b.currency)}
                  </p>
                  <span className="text-[12px] font-medium text-[var(--admin-accent)] opacity-85 group-hover:opacity-100">
                    Inspect →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Reusable Right-Hand Slide-Over Quick Detail & Action Drawer */}
      <BookingQuickDrawer
        bookingId={drawerState?.bookingId ?? null}
        focusSection={drawerState?.focus ?? 'overview'}
        timezone={timezone}
        onClose={() => setDrawerState(null)}
        onMutated={() => router.refresh()}
      />
    </div>
  );
}
