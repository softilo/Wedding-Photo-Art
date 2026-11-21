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
import { BrandMark } from '@/components/common/BrandMark';
import {
  ArrowRightIcon,
  BarChartIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilmIcon,
  PlusIcon,
  ReceiptIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
} from '@/components/shared/Icons';
import {
  BreakdownDonutChart,
  formatCompactPoisha,
  formatMonthShort,
  GroupedBarChart,
  HorizontalRankBars,
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
type MixChartMode = 'status' | 'categories' | 'funnel';

const CHART_PALETTE = ['#CAA650', '#8B6A21', '#E7D1AA', '#A88332', '#6F6130'];

function parseUtcDayMs(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey.trim());
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

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
  const [mixMode, setMixMode] = useState<MixChartMode>('status');

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

  const bookingStatusSegments = useMemo(() => {
    const buckets: Array<{
      id: Booking['status'];
      label: string;
      color: string;
    }> = [
      { id: 'CONFIRMED', label: 'Confirmed', color: '#10B981' },
      { id: 'PENDING_CONFIRMATION', label: 'Pending Confirm', color: '#CAA650' },
      { id: 'COMPLETED', label: 'Completed', color: '#8B6A21' },
      { id: 'CANCELLED', label: 'Cancelled', color: '#9E6359' },
    ];

    return buckets.map((bucket) => {
      const matched = bookings.filter((b) => b.status === bucket.id);
      const sumPoisha = matched.reduce((acc, b) => acc + b.agreedTotalPoisha, 0);
      return {
        id: bucket.id,
        label: bucket.label,
        value: matched.length,
        displayValue: String(matched.length),
        hint: matched.length > 0 ? formatPoisha(sumPoisha, currency) : undefined,
        color: bucket.color,
      };
    });
  }, [bookings, currency]);

  const categorySegments = useMemo(() => {
    if (financialReport && financialReport.byEventType.length > 0) {
      return financialReport.byEventType.slice(0, 5).map((et, idx) => ({
        id: et.eventTypeId,
        label: et.eventTypeName,
        value: et.agreedTotalPoisha,
        displayValue: formatCompactPoisha(et.agreedTotalPoisha, currency),
        hint: `${et.bookingsCount} ${et.bookingsCount === 1 ? 'booking' : 'bookings'}`,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }));
    }

    const agg = new Map<string, { name: string; totalPoisha: number; count: number }>();
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue;
      const key = b.eventType?.id || 'custom';
      const name = b.eventType?.name || 'Custom Event';
      const prev = agg.get(key) || { name, totalPoisha: 0, count: 0 };
      prev.totalPoisha += b.agreedTotalPoisha;
      prev.count += 1;
      agg.set(key, prev);
    }

    return Array.from(agg.entries())
      .sort((a, b) => b[1].totalPoisha - a[1].totalPoisha)
      .slice(0, 5)
      .map(([id, entry], idx) => ({
        id,
        label: entry.name,
        value: entry.totalPoisha,
        displayValue: formatCompactPoisha(entry.totalPoisha, currency),
        hint: `${entry.count} ${entry.count === 1 ? 'booking' : 'bookings'}`,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }));
  }, [financialReport, bookings, currency]);

  const funnelItems = useMemo(() => {
    const activeQuotesCount = quotes.filter(
      (q) => q.status === 'SENT' || q.status === 'ACCEPTED',
    ).length;
    const acceptedQuotesCount = quotes.filter((q) => q.status === 'ACCEPTED').length;
    const activeBookingsCount = bookings.filter((b) => b.status !== 'CANCELLED').length;
    const confirmedOrDone = bookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED',
    ).length;

    const base = Math.max(inquiries.length, activeQuotesCount, activeBookingsCount, 1);

    return [
      {
        id: 'inq',
        label: 'Inquiries Logged',
        value: inquiries.length,
        displayValue: `${inquiries.length}`,
        percent: (inquiries.length / base) * 100,
        subtext: `${newInquiriesCount} awaiting triage`,
        color: '#E7D1AA',
      },
      {
        id: 'quotes',
        label: 'Proposals Sent / Accepted',
        value: activeQuotesCount,
        displayValue: `${activeQuotesCount}`,
        percent: (activeQuotesCount / base) * 100,
        subtext: `${acceptedQuotesCount} accepted by client`,
        color: '#CAA650',
      },
      {
        id: 'bookings',
        label: 'Active Bookings',
        value: activeBookingsCount,
        displayValue: `${activeBookingsCount}`,
        percent: (activeBookingsCount / base) * 100,
        subtext: `${pendingConfirmCount} awaiting confirmation`,
        color: '#8B6A21',
      },
      {
        id: 'confirmed',
        label: 'Confirmed & Completed',
        value: confirmedOrDone,
        displayValue: `${confirmedOrDone}`,
        percent: (confirmedOrDone / base) * 100,
        subtext: formatPoisha(totalAgreedPoisha, currency),
        color: '#10B981',
      },
    ];
  }, [
    inquiries.length,
    newInquiriesCount,
    quotes,
    bookings,
    pendingConfirmCount,
    totalAgreedPoisha,
    currency,
  ]);

  const nextShootSpotlight = useMemo(() => {
    const active = upcomingSessions
      .filter((s) => s.status !== 'CANCELLED')
      .sort((a, b) => (Date.parse(a.startAt) || 0) - (Date.parse(b.startAt) || 0));
    if (active.length === 0) return null;

    const anchorMs = parseUtcDayMs(anchorDate);
    const chosen =
      active.find((s) => {
        const dk = s.agencyLocalDate || toLocalDateKey(s.startAt, timezone);
        const ms = parseUtcDayMs(dk);
        return Number.isNaN(anchorMs) || Number.isNaN(ms) || ms >= anchorMs;
      }) || active[0];

    const chosenDateKey =
      chosen.agencyLocalDate || toLocalDateKey(chosen.startAt, timezone);
    const chosenMs = parseUtcDayMs(chosenDateKey);
    const diffDays =
      !Number.isNaN(anchorMs) && !Number.isNaN(chosenMs)
        ? Math.round((chosenMs - anchorMs) / 86400000)
        : 0;

    const countdownLabel =
      diffDays <= 0
        ? 'Shoot Today'
        : diffDays === 1
          ? 'Tomorrow'
          : `In ${diffDays} Days`;

    return {
      session: chosen,
      dateKey: chosenDateKey,
      countdownLabel,
    };
  }, [upcomingSessions, anchorDate, timezone]);

  const formattedAnchorDate = useMemo(() => {
    const parsed = new Date(`${anchorDate}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return anchorDate;
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(parsed);
    } catch {
      return anchorDate;
    }
  }, [anchorDate]);

  const activeBookingsTotal = bookings.filter((b) => b.status !== 'CANCELLED').length;
  const meterPercent = financialReport
    ? Math.max(0, Math.min(100, financialReport.summary.collectionRatePercent))
    : activeBookingsTotal > 0
      ? Math.round((confirmedCount / activeBookingsTotal) * 100)
      : 0;

  const inquiriesRatio =
    inquiries.length > 0
      ? Math.min(100, Math.max(10, Math.round((newInquiriesCount / inquiries.length) * 100)))
      : 0;
  const quotesRatio =
    quotes.length > 0
      ? Math.min(100, Math.max(10, Math.round((openQuotesCount / quotes.length) * 100)))
      : 0;
  const confirmedRatio =
    activeBookingsTotal > 0
      ? Math.min(100, Math.max(10, Math.round((confirmedCount / activeBookingsTotal) * 100)))
      : 0;
  const shootsRatio =
    upcomingSessions.length > 0
      ? Math.min(100, Math.max(14, upcomingSessions.length * 10))
      : 0;

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
    <div className="space-y-6">
      {/* Wedding PhotoArt Obsidian & Gold Studio Command Spotlight */}
      <section className="relative overflow-hidden rounded-2xl border border-[#CAA650]/35 bg-[#14120E] text-[#F9F8F5] shadow-sm">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#8B6A21] via-[#E7D1AA] to-[#8B6A21]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #CAA650 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -bottom-24 h-60 w-60 rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #8B6A21 0%, transparent 70%)',
          }}
        />

        <div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-12 items-stretch">
          <div className="xl:col-span-6 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandMark
                  logoUrl={settings?.logoUrl}
                  alt={settings?.displayName || 'Wedding PhotoArt'}
                  variant="dark"
                  size={52}
                  className="rounded-xl shadow-sm"
                />
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#CAA650]/35 bg-[#CAA650]/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[#E7D1AA]">
                    <StarIcon className="w-3 h-3 text-[#CAA650]" />
                    <span>Studio Command Cockpit</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F9F8F5] mt-1.5 truncate">
                    {settings?.displayName || 'Wedding PhotoArt'}
                  </h1>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-[#E7D1AA]/85 tabular-nums">
                <span className="text-[#CAA650] font-medium">{formattedAnchorDate}</span> •{' '}
                {confirmedCount} confirmed bookings • {newInquiriesCount} new inquiries •{' '}
                {upcomingSessions.length} shoots in the next 14 days
                {totalAlerts > 0 ? ` • ${totalAlerts} items awaiting action` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href="/admin/calendar"
                className="inline-flex items-center gap-2 rounded-lg border border-[#CAA650]/40 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-[#F9F8F5] hover:bg-white/10 transition-colors"
              >
                <CalendarIcon className="w-4 h-4 text-[#CAA650]" />
                <span>Shoot Calendar</span>
              </Link>
              <Link
                href="/admin/bookings"
                className="inline-flex items-center gap-2 rounded-lg bg-[#CAA650] px-3.5 py-2 text-[13px] font-semibold text-[#181611] hover:bg-[#E7D1AA] transition-colors"
              >
                <span>All Bookings</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              {financialReport && (
                <Link
                  href="/admin/finance"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#CAA650]/25 px-3.5 py-2 text-[13px] font-medium text-[#E7D1AA] hover:border-[#CAA650]/55 hover:bg-white/5 transition-colors"
                >
                  <ReceiptIcon className="w-4 h-4 text-[#CAA650]" />
                  <span>Finance Ledger</span>
                </Link>
              )}
            </div>
          </div>

          <div className="xl:col-span-6 grid gap-3.5 sm:grid-cols-2">
            {/* Next Shoot Countdown Card */}
            {nextShootSpotlight ? (
              nextShootSpotlight.session.bookingId ? (
                <button
                  type="button"
                  onClick={() =>
                    setDrawerState({
                      bookingId: nextShootSpotlight.session.bookingId!,
                      focus: 'schedule',
                    })
                  }
                  className="group w-full text-left rounded-xl border border-[#CAA650]/30 bg-[#1C1913] p-4 flex flex-col justify-between gap-3 hover:border-[#CAA650] hover:bg-[#231F17] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#E7D1AA]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Next Shoot Countdown
                    </span>
                    <ClockIcon className="w-4 h-4 text-[#CAA650]" />
                  </div>

                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-[#CAA650] tabular-nums">
                      {nextShootSpotlight.countdownLabel}
                    </p>
                    <p className="text-[13.5px] font-medium text-[#F9F8F5] line-clamp-1 mt-0.5">
                      {nextShootSpotlight.session.title}
                    </p>
                    <p className="text-[12px] text-[#E7D1AA]/75 mt-1 tabular-nums line-clamp-1">
                      {nextShootSpotlight.dateKey} •{' '}
                      {formatDateTimeInTz(nextShootSpotlight.session.startAt, timezone)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#CAA650]/20 pt-2.5 text-[12px]">
                    <span className="text-[#E7D1AA]/80 truncate">
                      {nextShootSpotlight.session.booking?.reference || 'Scheduled session'}
                    </span>
                    <span className="font-medium text-[#CAA650] group-hover:translate-x-0.5 transition-transform">
                      Open slot →
                    </span>
                  </div>
                </button>
              ) : (
                <Link
                  href="/admin/calendar"
                  className="group w-full text-left rounded-xl border border-[#CAA650]/30 bg-[#1C1913] p-4 flex flex-col justify-between gap-3 hover:border-[#CAA650] hover:bg-[#231F17] transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#E7D1AA]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Next Shoot Countdown
                    </span>
                    <ClockIcon className="w-4 h-4 text-[#CAA650]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-[#CAA650] tabular-nums">
                      {nextShootSpotlight.countdownLabel}
                    </p>
                    <p className="text-[13.5px] font-medium text-[#F9F8F5] line-clamp-1 mt-0.5">
                      {nextShootSpotlight.session.title}
                    </p>
                    <p className="text-[12px] text-[#E7D1AA]/75 mt-1 tabular-nums line-clamp-1">
                      {nextShootSpotlight.dateKey} •{' '}
                      {formatDateTimeInTz(nextShootSpotlight.session.startAt, timezone)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#CAA650]/20 pt-2.5 text-[12px]">
                    <span className="text-[#E7D1AA]/80">Calendar slot</span>
                    <span className="font-medium text-[#CAA650]">Open calendar →</span>
                  </div>
                </Link>
              )
            ) : (
              <Link
                href="/admin/calendar"
                className="group w-full text-left rounded-xl border border-dashed border-[#CAA650]/35 bg-[#1C1913] p-4 flex flex-col justify-between gap-3 hover:border-[#CAA650] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#E7D1AA]">
                    Next Shoot Countdown
                  </span>
                  <CalendarIcon className="w-4 h-4 text-[#CAA650]" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#F9F8F5]">No Shoots in 14d Window</p>
                  <p className="text-[12px] text-[#E7D1AA]/75 mt-1">
                    Assign shoot dates for confirmed weddings and pre-wedding sessions.
                  </p>
                </div>
                <span className="text-[12px] font-medium text-[#CAA650]">
                  Schedule next shoot →
                </span>
              </Link>
            )}

            {/* Studio Pipeline & Collection Meter Card */}
            <div className="rounded-xl border border-[#CAA650]/30 bg-[#1C1913] p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#E7D1AA]">
                  {financialReport ? 'Collection Health' : 'Pipeline Readiness'}
                </span>
                <span className="rounded-full bg-[#CAA650]/15 px-2 py-0.5 text-[11px] font-semibold text-[#CAA650] tabular-nums">
                  {meterPercent.toFixed(0)}%
                </span>
              </div>

              <div>
                <p className="text-2xl font-semibold tracking-tight text-[#F9F8F5] tabular-nums">
                  {formatPoisha(totalAgreedPoisha, currency)}
                </p>
                <p className="text-[12px] text-[#E7D1AA]/75 mt-0.5 tabular-nums">
                  {financialReport
                    ? `${formatPoisha(financialReport.summary.totalOutstandingDuePoisha, currency)} outstanding balance`
                    : `${confirmedCount} confirmed of ${activeBookingsTotal} active bookings`}
                </p>
              </div>

              <div className="space-y-2 border-t border-[#CAA650]/20 pt-2.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, meterPercent)}%`,
                      background:
                        'linear-gradient(90deg, #8B6A21 0%, #CAA650 55%, #E7D1AA 100%)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#E7D1AA]/80 tabular-nums">
                  <span>
                    {financialReport
                      ? `${meterPercent.toFixed(1)}% collected`
                      : `${openQuotesCount} active proposals`}
                  </span>
                  <span>{timezone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1-Click Studio Launchpad Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Link
          href="/admin/inquiries"
          className="group flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <PlusIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
              Log Inquiry
            </p>
            <p className="text-[11.5px] text-[var(--admin-muted)] truncate">
              Capture new client lead
            </p>
          </div>
        </Link>

        <Link
          href="/admin/quotes"
          className="group flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <ReceiptIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
              Craft Quote
            </p>
            <p className="text-[11.5px] text-[var(--admin-muted)] truncate">
              Send custom proposal
            </p>
          </div>
        </Link>

        <Link
          href="/admin/gallery"
          className="group flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <CameraIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
              Upload Gallery
            </p>
            <p className="text-[11.5px] text-[var(--admin-muted)] truncate">
              Deliver client albums
            </p>
          </div>
        </Link>

        <Link
          href="/admin/portfolio"
          className="group flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <FilmIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
              Publish Highlight
            </p>
            <p className="text-[11.5px] text-[var(--admin-muted)] truncate">
              Showcase films &amp; reels
            </p>
          </div>
        </Link>

        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="group col-span-2 sm:col-span-1 flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
            <ExternalLinkIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
              Live Storefront
            </p>
            <p className="text-[11.5px] text-[var(--admin-muted)] truncate">
              Preview public site
            </p>
          </div>
        </Link>
      </div>

      {/* 4 Branded KPI Cards with Momentum Meters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/inquiries"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 hover:border-[var(--admin-accent)]/60 transition-all group flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--admin-muted)]">
                Inquiries
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                <SparklesIcon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--admin-text)] mt-2.5 tabular-nums">
              {newInquiriesCount}
              <span className="text-[12.5px] font-normal text-[var(--admin-muted)] ml-1.5">
                new
              </span>
            </p>
            <p className="text-[12.5px] text-[var(--admin-muted)] mt-1 flex items-center gap-1 group-hover:text-[var(--admin-accent)] transition-colors tabular-nums">
              <span>{inquiries.length} total • Open queue</span>
              <ArrowRightIcon className="w-3 h-3" />
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--admin-surface-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--admin-accent)] transition-all duration-500"
              style={{ width: `${inquiriesRatio}%` }}
            />
          </div>
        </Link>

        <Link
          href="/admin/quotes"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 hover:border-[var(--admin-accent)]/60 transition-all group flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--admin-muted)]">
                Price Quotes
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#CAA650]/15 text-[#8B6A21]">
                <ReceiptIcon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--admin-text)] mt-2.5 tabular-nums">
              {openQuotesCount}
              <span className="text-[12.5px] font-normal text-[var(--admin-muted)] ml-1.5">
                active
              </span>
            </p>
            <p className="text-[12.5px] text-[var(--admin-muted)] mt-1 flex items-center gap-1 group-hover:text-[var(--admin-accent)] transition-colors tabular-nums">
              <span>{quotes.length} total • Manage quotes</span>
              <ArrowRightIcon className="w-3 h-3" />
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--admin-surface-subtle)]">
            <div
              className="h-full rounded-full bg-[#CAA650] transition-all duration-500"
              style={{ width: `${quotesRatio}%` }}
            />
          </div>
        </Link>

        <Link
          href="/admin/bookings"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 hover:border-[var(--admin-accent)]/60 transition-all group flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--admin-muted)]">
                Bookings
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600">
                <UsersIcon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--admin-text)] mt-2.5 tabular-nums">
              {confirmedCount}
              <span className="text-[12.5px] font-normal text-[var(--admin-muted)] ml-1.5">
                confirmed{pendingConfirmCount > 0 ? ` • ${pendingConfirmCount} pending` : ''}
              </span>
            </p>
            <p className="text-[12.5px] text-[var(--admin-muted)] mt-1 tabular-nums truncate group-hover:text-[var(--admin-accent)] transition-colors">
              {formatPoisha(totalAgreedPoisha, currency)} active pipeline
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--admin-surface-subtle)]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${confirmedRatio}%` }}
            />
          </div>
        </Link>

        <Link
          href="/admin/calendar"
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 hover:border-[var(--admin-accent)]/60 transition-all group flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--admin-muted)]">
                Upcoming Shoots
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                <CalendarIcon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-[24px] font-semibold tracking-tight text-[var(--admin-text)] mt-2.5 tabular-nums">
              {upcomingSessions.length}
              <span className="text-[12.5px] font-normal text-[var(--admin-muted)] ml-1.5">
                next 14d
              </span>
            </p>
            <p className="text-[12.5px] text-[var(--admin-muted)] mt-1 flex items-center gap-1 group-hover:text-[var(--admin-accent)] transition-colors">
              <span>View schedule</span>
              <ArrowRightIcon className="w-3 h-3" />
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--admin-surface-subtle)]">
            <div
              className="h-full rounded-full bg-[#8B6A21] transition-all duration-500"
              style={{ width: `${shootsRatio}%` }}
            />
          </div>
        </Link>
      </div>

      {/* Studio Analytics Charts Row */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 space-y-4">
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

        <section className="lg:col-span-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
            <div>
              <h2 className="admin-section-title">Pipeline &amp; Mix</h2>
              <p className="admin-meta">
                {mixMode === 'status'
                  ? 'Distribution across booking states'
                  : mixMode === 'categories'
                    ? 'Top event categories by contract value'
                    : 'Lead-to-confirmed booking conversion'}
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1 shrink-0">
              {[
                { id: 'status' as const, label: 'Status' },
                { id: 'categories' as const, label: 'Events' },
                { id: 'funnel' as const, label: 'Funnel' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMixMode(t.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    mixMode === t.id
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {mixMode === 'status' && (
            <BreakdownDonutChart
              segments={bookingStatusSegments}
              centerLabel="Bookings"
              centerValue={String(bookings.length)}
              emptyMessage="Create a quote or booking to see status breakdown."
            />
          )}

          {mixMode === 'categories' && (
            <BreakdownDonutChart
              segments={categorySegments}
              centerLabel="Pipeline"
              centerValue={formatCompactPoisha(totalAgreedPoisha, currency)}
              emptyMessage="No active categorized bookings yet."
            />
          )}

          {mixMode === 'funnel' && (
            <HorizontalRankBars
              items={funnelItems}
              emptyMessage="No pipeline activity recorded yet."
            />
          )}
        </section>
      </div>

      {/* Needs Your Attention — Interactive Quick-Drawer Queue */}
      {alerts && (
        <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3.5">
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

            <div className="inline-flex flex-wrap rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1">
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
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums',
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

      {/* Two-Column Core Activity Grid: Recent Bookings + Upcoming Shoots */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3 mb-2">
            <div>
              <h2 className="admin-section-title">Recent Bookings</h2>
              <p className="admin-meta">
                Click any booking to open its quick-action drawer
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-medium text-[var(--admin-accent)] hover:underline tabular-nums"
            >
              View all ({bookings.length}) →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="admin-meta py-8 text-center">
              No bookings yet. Accept a quote in Price Quotes to create one.
            </p>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {bookings.slice(0, 6).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setDrawerState({ bookingId: b.id, focus: 'overview' })}
                  className="w-full text-left py-3 px-2.5 -mx-2.5 rounded-lg hover:bg-[var(--admin-surface-subtle)] transition-colors flex items-center justify-between gap-4 group cursor-pointer"
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

        <section className="lg:col-span-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3 mb-3">
            <div>
              <h2 className="admin-section-title">Upcoming Shoots</h2>
              <p className="admin-meta">Next 14 days in {timezone}</p>
            </div>
            <Link
              href="/admin/calendar"
              className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
            >
              Open calendar →
            </Link>
          </div>

          {upcomingSessions.length === 0 ? (
            <p className="admin-meta py-8 text-center">
              No sessions scheduled in the next 14 days.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcomingSessions.slice(0, 5).map((s) => (
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
                  className="w-full text-left block rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] hover:border-[var(--admin-accent)]/50 hover:bg-[var(--admin-surface-hover)] p-3 space-y-1 transition-colors cursor-pointer"
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
